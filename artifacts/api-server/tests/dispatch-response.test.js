import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { test } from "node:test";
import { createTechnicianResponseRecorder, TechnicianResponseError } from "../src/dispatchResponse.js";

function makeDb(status = "Active") {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE dispatches (
      activity_id INTEGER PRIMARY KEY,
      tech_id INTEGER NOT NULL,
      technician_name TEXT NOT NULL,
      van_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      technician_response TEXT,
      technician_response_at TEXT
    );
    CREATE TABLE activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action_details TEXT NOT NULL,
      approved_by TEXT NOT NULL
    );
    CREATE TABLE inventory (van_id INTEGER NOT NULL, part_name TEXT NOT NULL, quantity INTEGER NOT NULL);
    INSERT INTO dispatches VALUES (7, 2, 'Mina Tan', 4, '${status}', NULL, NULL);
    INSERT INTO inventory VALUES (4, 'AC Filter', 3);
  `);
  return db;
}

test("rejection is recorded without releasing the active assignment, van, or reserved stock", () => {
  const db = makeDb();
  const respond = createTechnicianResponseRecorder(db, () => "2026-10-24T12:00:00.000Z");
  try {
    const result = respond.immediate({ dispatch_id: 7, technician_id: 2, response: "Rejected" });
    assert.deepEqual(result, {
      dispatch_id: 7,
      technician_id: 2,
      response: "Rejected",
      responded_at: "2026-10-24T12:00:00.000Z",
    });
    assert.deepEqual(db.prepare("SELECT status, tech_id, van_id, technician_response FROM dispatches WHERE activity_id = 7").get(), {
      status: "Active",
      tech_id: 2,
      van_id: 4,
      technician_response: "Rejected",
    });
    assert.equal(db.prepare("SELECT quantity FROM inventory WHERE van_id = 4").get().quantity, 3);
    assert.match(db.prepare("SELECT action_details FROM activity_log").get().action_details, /job, van and reserved parts remain allocated/i);

    const retry = respond.immediate({ dispatch_id: 7, technician_id: 2, response: "Rejected" });
    assert.deepEqual(retry, result, "repeating the same response is idempotent");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM activity_log").get().n, 1, "a retry does not duplicate the audit event");
    assert.throws(
      () => respond.immediate({ dispatch_id: 7, technician_id: 2, response: "Accepted" }),
      TechnicianResponseError,
    );
  } finally {
    db.close();
  }
});

test("response is rejected for a different technician or a non-active dispatch", () => {
  const db = makeDb();
  const respond = createTechnicianResponseRecorder(db, () => "2026-10-24T12:00:00.000Z");
  try {
    assert.throws(
      () => respond.immediate({ dispatch_id: 7, technician_id: 99, response: "Accepted" }),
      /Only the technician assigned/,
    );
    db.prepare("UPDATE dispatches SET status = 'Completed' WHERE activity_id = 7").run();
    assert.throws(
      () => respond.immediate({ dispatch_id: 7, technician_id: 2, response: "Accepted" }),
      /no longer active/,
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM activity_log").get().n, 0);
  } finally {
    db.close();
  }
});
