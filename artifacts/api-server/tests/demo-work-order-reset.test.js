import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import express from "express";
import { prepareDemoWorkOrderReset } from "../src/demoWorkOrderReset.js";
import { demoSites } from "../src/demoSites.js";

test("cancellation migration preserves rows, foreign keys, indexes and is repeatable", () => {
  const db = new Database(":memory:");
  try {
    db.pragma("foreign_keys=ON");
    db.exec(`
      CREATE TABLE conversation_threads(id INTEGER PRIMARY KEY);
      INSERT INTO conversation_threads VALUES(1);
      CREATE TABLE dispatches(activity_id INTEGER PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversation_threads(id),
        tech_id INTEGER, status TEXT NOT NULL CHECK(status IN ('Active', 'Completed', 'Unknown')));
      CREATE UNIQUE INDEX one_active_dispatch_per_tech ON dispatches(tech_id) WHERE status='Active';
      INSERT INTO dispatches VALUES(1,1,2,'Active');
    `);
    prepareDemoWorkOrderReset(db);
    prepareDemoWorkOrderReset(db);
    assert.equal(db.prepare("SELECT status FROM dispatches WHERE activity_id=1").get().status, "Active");
    assert.throws(() => db.exec("INSERT INTO dispatches(activity_id,tech_id,status) VALUES(2,2,'Active')"), /UNIQUE/);
    db.exec("UPDATE dispatches SET status='Cancelled' WHERE activity_id=1");
    assert.deepEqual(db.pragma("foreign_key_check"), []);
    assert.throws(() => db.exec("UPDATE dispatches SET status='MadeUp'"), /CHECK/);
  } finally { db.close(); }
});

test("reset API restores all demo orders atomically, preserves history and Telegram, and never double-restocks", async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), "dispatch-reset-"));
  let db;
  let server;
  try {
    process.chdir(dir);
    const { default: router } = await import(`${new URL("../src/hub.js", import.meta.url).href}?reset-test`);
    process.chdir(cwd);
    db = new Database(resolve(dir, "data/dispatch-hub.sqlite"));
    db.pragma("foreign_keys=ON");
    const demoIds = db.prepare("SELECT id FROM conversation_threads WHERE source='Demo' ORDER BY id").all().map(({ id }) => id);
    const at = "2026-10-25T12:00:00.000Z";
    const telegramId = Number(db.prepare(`INSERT INTO conversation_threads
      (customer_name,subject,source,created_at,updated_at) VALUES('Test customer','Test request','Telegram',?,?)`)
      .run(at, at).lastInsertRowid);
    db.prepare("INSERT INTO conversation_messages(conversation_id,sender_role,sender_name,text,created_at) VALUES(?,'Customer','Test customer','Test message',?)")
      .run(telegramId, at);
    const seedJob = (conversation, tech, van, status, parts = ["LED Bulb E27"]) => {
      const id = Number(db.prepare("INSERT INTO activity_log(timestamp,action_details,approved_by) VALUES(?,?,?)")
        .run(at, "Test dispatch snapshot", "Test Boss").lastInsertRowid);
      db.prepare(`INSERT INTO dispatches(activity_id,tech_id,technician_name,van_id,parts_json,customer_site_json,
        conversation_id,status,technician_response,boss_acknowledged_at) VALUES(?,?,?,?,?,?,?,?,'Accepted',?)`)
        .run(id, tech, `Technician ${tech}`, van, JSON.stringify(parts), JSON.stringify(demoSites.north), conversation, status, at);
      db.prepare("UPDATE conversation_threads SET technician_id=?,analysis_json='{}',analysis_message_id=1 WHERE id=?")
        .run(tech, conversation);
      db.prepare("UPDATE technicians SET status='Busy' WHERE id=?").run(tech);
      return id;
    };
    const activeId = seedJob(demoIds[0], 1, 1, "Active", ["LED Bulb E27", "LED Bulb E27"]);
    const completedId = seedJob(demoIds[1], 2, 2, "Completed");
    const unknownId = seedJob(demoIds[2], 4, 3, "Unknown");
    const telegramDispatchId = seedJob(telegramId, 5, 4, "Active");
    const stockBefore = db.prepare("SELECT quantity FROM inventory WHERE van_id=1 AND part_name='LED Bulb E27'").get().quantity;
    const messagesBefore = db.prepare("SELECT * FROM conversation_messages ORDER BY id").all();
    const telegramBefore = db.prepare("SELECT * FROM conversation_threads WHERE id=?").get(telegramId);
    const auditBefore = db.prepare("SELECT * FROM activity_log ORDER BY id").all();
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
    server = app.listen(0, "127.0.0.1");
    await new Promise((done) => server.once("listening", done));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const reset = (body) => fetch(`${base}/demo-work-orders/reset`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal((await reset({})).status, 400);
    assert.equal(db.prepare("SELECT status FROM dispatches WHERE activity_id=?").get(activeId).status, "Active");
    const response = await reset({ confirmation: "RESET_DEMO_WORK_ORDERS" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { reset_count: demoIds.length, cancelled_count: 1 });
    const active = db.prepare("SELECT * FROM dispatches WHERE activity_id=?").get(activeId);
    assert.equal(active.status, "Cancelled");
    assert.equal(active.conversation_id, null);
    assert.equal(active.reset_conversation_id, demoIds[0]);
    assert.equal(active.technician_response, "Accepted");
    assert.equal(db.prepare("SELECT status FROM dispatches WHERE activity_id=?").get(completedId).status, "Completed");
    assert.equal(db.prepare("SELECT status FROM dispatches WHERE activity_id=?").get(unknownId).status, "Unknown");
    assert.equal(db.prepare("SELECT status FROM technicians WHERE id=1").get().status, "Available");
    assert.equal(db.prepare("SELECT status FROM technicians WHERE id=4").get().status, "Busy"); // Never guess legacy completion.
    assert.equal(db.prepare("SELECT status FROM technicians WHERE id=5").get().status, "Busy");
    assert.equal(db.prepare("SELECT conversation_id FROM dispatches WHERE activity_id=?").get(telegramDispatchId).conversation_id, telegramId);
    assert.deepEqual(db.prepare("SELECT * FROM conversation_threads WHERE id=?").get(telegramId), telegramBefore);
    assert.deepEqual(db.prepare("SELECT * FROM conversation_messages ORDER BY id").all(), messagesBefore);
    assert.deepEqual(db.prepare("SELECT * FROM activity_log WHERE id<=? ORDER BY id").all(auditBefore.at(-1).id), auditBefore);
    assert.equal(db.prepare("SELECT quantity FROM inventory WHERE van_id=1 AND part_name='LED Bulb E27'").get().quantity, stockBefore + 2);
    const list = await (await fetch(`${base}/conversations`)).json();
    assert.ok(list.conversations.filter(({ source }) => source === "Demo").every((c) =>
      c.technician_id === null && c.dispatch_activity_id === null));
    const detail = await (await fetch(`${base}/conversations/${demoIds[0]}`)).json();
    assert.equal(detail.analysis, null);
    const hubResponse = await fetch(`${base}/hub-data`);
    assert.equal(hubResponse.status, 200);
    const hub = await hubResponse.json();
    assert.equal(hub.activity_log.find(({ id }) => id === activeId).dispatch.status, "Cancelled");
    assert.equal((await reset({ confirmation: "RESET_DEMO_WORK_ORDERS" })).status, 200);
    assert.equal(db.prepare("SELECT quantity FROM inventory WHERE van_id=1 AND part_name='LED Bulb E27'").get().quantity, stockBefore + 2);
    assert.deepEqual(db.pragma("foreign_key_check"), []);
  } finally {
    process.chdir(cwd);
    if (server) await new Promise((done) => server.close(done));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
