// SQLite cannot extend an existing CHECK constraint in place. Preserve every
// row and index while adding an explicit cancellation state (never completion).
export function prepareDemoWorkOrderReset(db) {
  db.transaction(() => {
    const { sql } = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='dispatches'").get();
    if (!sql.includes("'Cancelled'")) {
      const upgraded = sql
        .replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?dispatches["`]?/i, "CREATE TABLE dispatches_reset_upgrade")
        .replace(/CHECK\s*\(\s*status\s+IN\s*\(\s*'Active'\s*,\s*'Completed'\s*,\s*'Unknown'\s*\)\s*\)/i,
          "CHECK(status IN ('Active', 'Completed', 'Unknown', 'Cancelled'))");
      if (!upgraded.includes("'Cancelled'")) throw new Error("Unsupported dispatch lifecycle schema; reset migration aborted.");
      const indexes = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='dispatches' AND type IN ('index','trigger') AND sql IS NOT NULL").all();
      const columns = db.prepare("PRAGMA table_info(dispatches)").all().map(({ name }) => `"${name.replaceAll('"', '""')}"`).join(", ");
      db.exec(upgraded);
      db.exec(`INSERT INTO dispatches_reset_upgrade (${columns}) SELECT ${columns} FROM dispatches`);
      db.exec("DROP TABLE dispatches; ALTER TABLE dispatches_reset_upgrade RENAME TO dispatches");
      for (const index of indexes) db.exec(index.sql);
    }
    if (!db.prepare("PRAGMA table_info(dispatches)").all().some(({ name }) => name === "reset_conversation_id")) {
      db.exec("ALTER TABLE dispatches ADD COLUMN reset_conversation_id INTEGER REFERENCES conversation_threads(id)");
    }
  }).immediate();
}

export function createDemoWorkOrderResetter(db, now = () => new Date().toISOString()) {
  return db.transaction(() => {
    const jobs = db.prepare(`
      SELECT d.* FROM dispatches d JOIN conversation_threads c ON c.id=d.conversation_id
      WHERE c.source='Demo'
    `).all();
    let cancelledCount = 0;
    const releasedTechnicians = new Set();
    for (const job of jobs) {
      if (job.status === "Active") {
        const parts = JSON.parse(job.parts_json);
        if (!Array.isArray(parts) || parts.some((part) => typeof part !== "string" || !part.trim())) {
          throw new Error("Invalid reserved parts; no work orders were reset.");
        }
        for (const part of parts) {
          const restored = db.prepare("UPDATE inventory SET quantity=quantity+1 WHERE van_id=? AND part_name=? COLLATE NOCASE")
            .run(job.van_id, part);
          if (restored.changes !== 1) throw new Error("Reserved stock could not be restored; no work orders were reset.");
        }
        db.prepare("UPDATE dispatches SET status='Cancelled' WHERE activity_id=?").run(job.activity_id);
        releasedTechnicians.add(job.tech_id);
        cancelledCount++;
      }
      // Keep the full dispatch snapshot and original link for audit/history,
      // but allow this conversation to be dispatched again as a new job.
      db.prepare("UPDATE dispatches SET reset_conversation_id=conversation_id, conversation_id=NULL WHERE activity_id=?")
        .run(job.activity_id);
    }
    for (const id of releasedTechnicians) {
      db.prepare(`UPDATE technicians SET status='Available' WHERE id=?
        AND NOT EXISTS(SELECT 1 FROM dispatches WHERE tech_id=? AND status='Active')`).run(id, id);
    }
    const reset = db.prepare(`UPDATE conversation_threads
      SET technician_id=NULL, analysis_json=NULL, analysis_message_id=NULL, updated_at=?
      WHERE source='Demo'`).run(now());
    // Clear the inbox non-destructively. Active Telegram jobs keep their
    // conversation, allocation and reply address so technicians can finish.
    const cleared = db.prepare(`UPDATE conversation_threads SET inbox_cleared_at=?
      WHERE source='Telegram' AND inbox_cleared_at IS NULL`).run(now());
    // Future messages start a fresh conversation. Keep processed update IDs and
    // polling checkpoints so Telegram retries cannot restore cleared messages.
    db.prepare(`DELETE FROM telegram_threads WHERE conversation_id IN
      (SELECT id FROM conversation_threads WHERE source='Telegram' AND inbox_cleared_at IS NOT NULL)`).run();
    db.prepare("INSERT INTO activity_log(timestamp,action_details,approved_by) VALUES(?,?,?)")
      .run(now(), `Work orders reset: ${reset.changes} demo orders restored to undispatched; ${cancelledCount} active demo assignments cancelled and reserved stock returned; ${cleared.changes} Telegram conversations cleared from the Boss inbox. Completed history, Telegram assignments and audit records preserved.`, "Boss demo reset");
    return { reset_count: reset.changes, cancelled_count: cancelledCount, telegram_cleared_count: cleared.changes };
  });
}
