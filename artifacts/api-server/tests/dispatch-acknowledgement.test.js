import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { test } from "node:test";
import { createDispatchAcknowledger, DispatchAcknowledgementError } from "../src/dispatchAcknowledgement.js";

function makeDb(conversationId = 11) {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE dispatches (
      activity_id INTEGER PRIMARY KEY,
      tech_id INTEGER NOT NULL,
      technician_name TEXT NOT NULL,
      van_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      conversation_id INTEGER,
      boss_acknowledged_at TEXT
    );
    CREATE TABLE activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action_details TEXT NOT NULL,
      approved_by TEXT NOT NULL
    );
    CREATE TABLE inventory (van_id INTEGER NOT NULL, part_name TEXT NOT NULL, quantity INTEGER NOT NULL);
  `);
  db.prepare(`
    INSERT INTO dispatches (activity_id, tech_id, technician_name, van_id, status, conversation_id, boss_acknowledged_at)
    VALUES (7, 2, 'Mina Tan', 4, 'Active', ?, NULL)
  `).run(conversationId);
  db.exec("INSERT INTO inventory VALUES (4, 'AC Filter', 3)");
  return db;
}

test("Boss acknowledgement hides a conversation but leaves its active dispatch and resources unchanged", () => {
  const db = makeDb();
  const acknowledge = createDispatchAcknowledger(db, () => "2026-10-24T12:00:00.000Z");
  try {
    const result = acknowledge.immediate({ dispatch_id: 7 });
    assert.deepEqual(result, { dispatch_id: 7, acknowledged_at: "2026-10-24T12:00:00.000Z" });
    assert.deepEqual(db.prepare(`
      SELECT status, tech_id, van_id, boss_acknowledged_at FROM dispatches WHERE activity_id = 7
    `).get(), {
      status: "Active",
      tech_id: 2,
      van_id: 4,
      boss_acknowledged_at: "2026-10-24T12:00:00.000Z",
    });
    assert.equal(db.prepare("SELECT quantity FROM inventory WHERE van_id = 4").get().quantity, 3);
    assert.match(db.prepare("SELECT action_details FROM activity_log").get().action_details, /Dispatch remains Active/i);

    const retry = acknowledge.immediate({ dispatch_id: 7 });
    assert.deepEqual(retry, result, "acknowledgement retries are idempotent");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM activity_log").get().n, 1, "retry does not duplicate the log event");
  } finally {
    db.close();
  }
});

test("acknowledgement requires an existing conversation-linked dispatch", () => {
  const db = makeDb(null);
  const acknowledge = createDispatchAcknowledger(db, () => "2026-10-24T12:00:00.000Z");
  try {
    assert.throws(() => acknowledge.immediate({ dispatch_id: 999 }), DispatchAcknowledgementError);
    assert.throws(() => acknowledge.immediate({ dispatch_id: 7 }), /not linked to a customer conversation/);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM activity_log").get().n, 0);
  } finally {
    db.close();
  }
});
