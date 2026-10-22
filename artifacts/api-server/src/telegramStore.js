import { createHash } from "node:crypto";

/** Preserve all conversation IDs/messages while allowing genuinely unknown sites. */
export function prepareTelegramStorage(db) {
  const columns = db.prepare("PRAGMA table_info(conversation_threads)").all();
  if (columns.find((column) => column.name === "customer_site_id")?.notnull) {
    const original = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'conversation_threads'").get().sql;
    const replacement = original.replace("conversation_threads", "conversation_threads_nullable")
      .replace(/customer_site_id\s+TEXT\s+NOT NULL/i, "customer_site_id TEXT");
    if (replacement === original || !/customer_site_id\s+TEXT\s+CHECK/i.test(replacement)) {
      throw new Error("Cannot safely migrate conversation site schema.");
    }
    const objects = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name = 'conversation_threads' AND type IN ('index', 'trigger') AND sql IS NOT NULL").all();
    const names = columns.map((column) => `"${column.name.replaceAll('"', '""')}"`).join(", ");
    db.pragma("foreign_keys = OFF");
    try {
      db.transaction(() => {
        db.exec(replacement);
        db.exec(`INSERT INTO conversation_threads_nullable (${names}) SELECT ${names} FROM conversation_threads`);
        db.exec("DROP TABLE conversation_threads; ALTER TABLE conversation_threads_nullable RENAME TO conversation_threads");
        for (const object of objects) db.exec(object.sql);
        if (db.pragma("foreign_key_check").length) throw new Error("Conversation migration failed integrity checks.");
      }).immediate();
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }
  if (!columns.some((column) => column.name === "source")) {
    db.exec("ALTER TABLE conversation_threads ADD COLUMN source TEXT NOT NULL DEFAULT 'Demo' CHECK(source IN ('Demo', 'Telegram'))");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_receivers (
      bot_id TEXT PRIMARY KEY,
      next_offset INTEGER NOT NULL DEFAULT 0,
      last_received_at TEXT
    );
    CREATE TABLE IF NOT EXISTS telegram_updates (
      bot_id TEXT NOT NULL, update_id INTEGER NOT NULL,
      PRIMARY KEY (bot_id, update_id)
    );
    CREATE TABLE IF NOT EXISTS telegram_threads (
      bot_id TEXT NOT NULL, chat_key TEXT NOT NULL,
      conversation_id INTEGER NOT NULL REFERENCES conversation_threads(id),
      PRIMARY KEY (bot_id, chat_key)
    );
  `);
}

export function createTelegramStorage(db, appendMessage) {
  const checkpoint = (botId) => db.prepare("SELECT next_offset, last_received_at FROM telegram_receivers WHERE bot_id = ?").get(String(botId)) ??
    { next_offset: 0, last_received_at: null };
  const ingest = db.transaction((botId, update) => {
    if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0) throw new Error("Invalid Telegram update.");
    const bot = String(botId);
    const inserted = db.prepare("INSERT OR IGNORE INTO telegram_updates (bot_id, update_id) VALUES (?, ?)").run(bot, update.update_id);
    if (!inserted.changes) return { conversationId: null, imported: false };
    const message = update.message;
    let conversationId = null;
    const text = typeof message?.text === "string" ? message.text.trim() : "";
    // Private text only. Never import group members, profiles, media or bot messages.
    if (message?.chat?.type === "private" && Number.isSafeInteger(message.chat.id) && !message.from?.is_bot && text && text.length <= 4096) {
      const chatKey = createHash("sha256").update(`${bot}:${message.chat.id}`).digest("hex");
      if (/^\/new(?:@\w+)?(?:\s|$)/i.test(text)) {
        db.prepare("DELETE FROM telegram_threads WHERE bot_id = ? AND chat_key = ?").run(bot, chatKey);
      } else if (!text.startsWith("/")) {
        const existing = db.prepare("SELECT conversation_id FROM telegram_threads WHERE bot_id = ? AND chat_key = ?").get(bot, chatKey);
        conversationId = existing?.conversation_id ?? null;
        if (conversationId == null) {
          const now = new Date().toISOString();
          const created = db.prepare(`
            INSERT INTO conversation_threads (customer_name, subject, customer_site_id, source, created_at, updated_at)
            VALUES ('Telegram customer', ?, NULL, 'Telegram', ?, ?)
          `).run(`Telegram: ${text.slice(0, 90)}`, now, now);
          conversationId = Number(created.lastInsertRowid);
          db.prepare("UPDATE conversation_threads SET customer_name = ? WHERE id = ?").run(`Telegram customer #${conversationId}`, conversationId);
          db.prepare("INSERT INTO telegram_threads (bot_id, chat_key, conversation_id) VALUES (?, ?, ?)").run(bot, chatKey, conversationId);
        }
        appendMessage({ id: conversationId, sender_role: "Customer", text });
      }
    }
    const receivedAt = conversationId == null ? null : new Date().toISOString();
    db.prepare(`
      INSERT INTO telegram_receivers (bot_id, next_offset, last_received_at) VALUES (?, ?, ?)
      ON CONFLICT(bot_id) DO UPDATE SET next_offset = MAX(next_offset, excluded.next_offset),
      last_received_at = COALESCE(excluded.last_received_at, last_received_at)
    `).run(bot, update.update_id + 1, receivedAt);
    return { conversationId, imported: conversationId != null };
  });
  return { checkpoint, ingest: (botId, update) => ingest.immediate(botId, update) };
}
