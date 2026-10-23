export class DispatchAcknowledgementError extends Error {
  constructor(message, statusCode = 409) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createDispatchAcknowledger(db, now = () => new Date().toISOString()) {
  return db.transaction(({ dispatch_id }) => {
    const job = db.prepare("SELECT * FROM dispatches WHERE activity_id = ?").get(dispatch_id);
    if (!job) throw new DispatchAcknowledgementError("No tracked dispatch was found.", 404);
    if (job.conversation_id == null) {
      throw new DispatchAcknowledgementError("This dispatch is not linked to a customer conversation.");
    }
    if (job.boss_acknowledged_at) {
      return { dispatch_id, acknowledged_at: job.boss_acknowledged_at };
    }

    const acknowledged_at = now();
    const update = db.prepare(`
      UPDATE dispatches
      SET boss_acknowledged_at = ?
      WHERE activity_id = ? AND boss_acknowledged_at IS NULL
    `).run(acknowledged_at, dispatch_id);
    if (update.changes !== 1) {
      throw new DispatchAcknowledgementError("The dispatch changed before it could be acknowledged. Refresh and try again.");
    }

    db.prepare(
      "INSERT INTO activity_log (timestamp, action_details, approved_by) VALUES (?, ?, ?)",
    ).run(
      acknowledged_at,
      `Dispatched conversation acknowledged: Dispatch #${dispatch_id} · Conversation #${job.conversation_id}. Dispatch remains ${job.status}; technician, van and reserved parts are unchanged.`,
      "Dispatch CEO",
    );
    return { dispatch_id, acknowledged_at };
  });
}
