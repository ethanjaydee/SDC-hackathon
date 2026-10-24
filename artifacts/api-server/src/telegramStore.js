import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

function telegramAddressKey() {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) throw new Error("SESSION_SECRET is required to protect Telegram reply addresses.");
  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(sessionSecret, "utf8"),
    Buffer.from("dispatch-hub-telegram-address-v1", "utf8"),
    Buffer.from("aes-256-gcm", "utf8"),
    32,
  ));
}

export function encryptTelegramChatId(chatId) {
  const value = String(chatId);
  if (!/^-?\d+$/.test(value)) throw new Error("Invalid Telegram chat address.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", telegramAddressKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function decryptTelegramChatId(value) {
  try {
    const [version, encodedIv, encodedTag, encodedData, extra] = String(value).split(".");
    if (version !== "v1" || !encodedIv || !encodedTag || !encodedData || extra !== undefined) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", telegramAddressKey(), Buffer.from(encodedIv, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const chatId = Buffer.concat([
      decipher.update(Buffer.from(encodedData, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    if (!/^-?\d+$/.test(chatId)) throw new Error();
    return chatId;
  } catch {
    throw new Error("The stored Telegram reply address is unavailable.");
  }
}

function prepareStaffMessageRole(db) {
  const columns = db.prepare("PRAGMA table_info(conversation_messages)").all();
  if (!columns.some((column) => column.name === "sender_role")) return;
  const original = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'conversation_messages'").get()?.sql;
  if (!original || original.includes("'Staff'")) return;
  const roleCheck = /sender_role\s+TEXT\s+NOT NULL\s+CHECK\s*\(\s*sender_role\s+IN\s*\(([^)]+)\)\s*\)/i;
  if (!roleCheck.test(original)) throw new Error("Cannot safely extend conversation sender roles.");

  const replacement = original
    .replace("conversation_messages", "conversation_messages_staff")
    .replace(roleCheck, (_match, roles) => `sender_role TEXT NOT NULL CHECK(sender_role IN (${roles}, 'Staff'))`);
  const objects = db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name = 'conversation_messages' AND type IN ('index', 'trigger') AND sql IS NOT NULL").all();
  const names = columns.map((column) => `"${column.name.replaceAll('"', '""')}"`).join(", ");
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      db.exec(replacement);
      db.exec(`INSERT INTO conversation_messages_staff (${names}) SELECT ${names} FROM conversation_messages`);
      db.exec("DROP TABLE conversation_messages; ALTER TABLE conversation_messages_staff RENAME TO conversation_messages");
      for (const object of objects) db.exec(object.sql);
      if (db.pragma("foreign_key_check").length) throw new Error("Conversation sender migration failed integrity checks.");
    }).immediate();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

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
  prepareStaffMessageRole(db);
  if (!columns.some((column) => column.name === "inbox_cleared_at")) {
    db.exec("ALTER TABLE conversation_threads ADD COLUMN inbox_cleared_at TEXT");
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
    CREATE TABLE IF NOT EXISTS telegram_conversation_addresses (
      conversation_id INTEGER PRIMARY KEY REFERENCES conversation_threads(id) ON DELETE CASCADE,
      bot_id TEXT NOT NULL,
      chat_id_ciphertext TEXT NOT NULL
    );
  `);
}

export function createTelegramStorage(db, appendMessage) {
  const checkpoint = (botId) => db.prepare("SELECT next_offset, last_received_at FROM telegram_receivers WHERE bot_id = ?").get(String(botId)) ??
    { next_offset: 0, last_received_at: null };
  const saveAddress = db.prepare(`
    INSERT INTO telegram_conversation_addresses (conversation_id, bot_id, chat_id_ciphertext)
    VALUES (?, ?, ?)
    ON CONFLICT(conversation_id) DO UPDATE SET bot_id = excluded.bot_id, chat_id_ciphertext = excluded.chat_id_ciphertext
  `);
  const ingest = db.transaction((botId, update) => {
    if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0) throw new Error("Invalid Telegram update.");
    const bot = String(botId);
    const inserted = db.prepare("INSERT OR IGNORE INTO telegram_updates (bot_id, update_id) VALUES (?, ?)").run(bot, update.update_id);
    if (!inserted.changes) return { conversationId: null, imported: false, duplicate: true };
    const message = update.message;
    let conversationId = null;
    const text = typeof message?.text === "string" ? message.text.trim() : "";
    // Private text only. Never import group members, profiles, media or bot messages.
    if (message?.chat?.type === "private" && Number.isSafeInteger(message.chat.id) && !message.from?.is_bot && text && text.length <= 4096) {
      const chatKey = createHash("sha256").update(`${bot}:${message.chat.id}`).digest("hex");
      const existing = db.prepare("SELECT conversation_id FROM telegram_threads WHERE bot_id = ? AND chat_key = ?").get(bot, chatKey);
      const encryptedChatId = encryptTelegramChatId(message.chat.id);
      if (existing) saveAddress.run(existing.conversation_id, bot, encryptedChatId);
      if (/^\/new(?:@\w+)?(?:\s|$)/i.test(text)) {
        db.prepare("DELETE FROM telegram_threads WHERE bot_id = ? AND chat_key = ?").run(bot, chatKey);
      } else if (!text.startsWith("/")) {
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
        saveAddress.run(conversationId, bot, encryptedChatId);
        appendMessage({ id: conversationId, sender_role: "Customer", text });
      }
    }
    const receivedAt = conversationId == null ? null : new Date().toISOString();
    db.prepare(`
      INSERT INTO telegram_receivers (bot_id, next_offset, last_received_at) VALUES (?, ?, ?)
      ON CONFLICT(bot_id) DO UPDATE SET next_offset = MAX(next_offset, excluded.next_offset),
      last_received_at = COALESCE(excluded.last_received_at, last_received_at)
    `).run(bot, update.update_id + 1, receivedAt);
    return { conversationId, imported: conversationId != null, duplicate: false };
  });
  const hasReplyAddress = (conversationId) => Boolean(db.prepare(
    "SELECT 1 FROM telegram_conversation_addresses WHERE conversation_id = ?",
  ).get(conversationId));
  const getReplyAddress = (conversationId) => {
    const address = db.prepare(
      "SELECT bot_id, chat_id_ciphertext FROM telegram_conversation_addresses WHERE conversation_id = ?",
    ).get(conversationId);
    return address ? { botId: address.bot_id, chatId: decryptTelegramChatId(address.chat_id_ciphertext) } : null;
  };
  return {
    checkpoint,
    ingest: (botId, update) => ingest.immediate(botId, update),
    hasReplyAddress,
    getReplyAddress,
  };
}
