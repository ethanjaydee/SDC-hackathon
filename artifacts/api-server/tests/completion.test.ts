import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';
import { demoSites } from '../src/demoSites.js';

test('completion validates assignment, persists atomically, never restores parts, and cannot release a later job', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'complete-dispatch-'));
  let server;
  let db;
  try {
    process.chdir(dir);
    const { default: router } = await import(new URL('../src/hub.js', import.meta.url).href);
    process.chdir(cwd);
    db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server!.once('listening', r));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api`;
    const read = async () => (await fetch(`${base}/hub-data`)).json();
    const post = (path: string, data: unknown) => fetch(`${base}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const approve = (tech_id = 1) => post('approve-dispatch', {
      tech_id, van_id: tech_id, parts: ['100uF Capacitor', 'NPN Transistor'],
      customer_site_id: 'central', approved_by: 'Demo Dispatcher',
    });
    const reset = (technician_id = 3) => post('reset-technician', {
      technician_id, reset_by: 'Demo Dispatcher',
    });
    const initial = await read();
    assert.equal(initial.technicians[2].status, 'Busy'); // seed Busy has no invented job
    const analyzed = await post('analyze-request', { text: 'Synthetic power issue' });
    assert.equal((await analyzed.json()).issue, 'Instrument Cluster Power Failure');
    const first = await approve();
    assert.equal(first.status, 200);
    const allocated = await first.json();
    const original = allocated.activity_log[0];
    const id = original.id;
    const input = { dispatch_id: id, completed_by: 'Demo Technician' };
    for (const invalid of [
      {}, null, { ...input, dispatch_id: 0 }, { ...input, dispatch_id: 1.5 },
      { ...input, dispatch_id: String(id) }, { ...input, completed_by: '' },
      { ...input, completed_by: '  ' }, { ...input, completed_by: 'a'.repeat(81) },
    ]) assert.equal((await post('complete-dispatch', invalid)).status, 400);
    assert.equal((await post('complete-dispatch', { ...input, dispatch_id: 99999 })).status, 404);
    assert.deepEqual(await read(), allocated);
    // Busy flag and van must still agree with the active assignment.
    db.prepare("UPDATE technicians SET status = 'Available' WHERE id = 1").run();
    assert.equal((await post('complete-dispatch', input)).status, 409);
    assert.equal((await approve()).status, 409); // cannot overlap even with a stale flag
    db.prepare("UPDATE technicians SET status = 'Busy' WHERE id = 1").run();
    db.prepare("UPDATE dispatches SET van_id = 10 WHERE activity_id = ?").run(id);
    assert.equal((await post('complete-dispatch', input)).status, 409);
    db.prepare('UPDATE dispatches SET van_id = 1 WHERE activity_id = ?').run(id);
    // Simulate a failed final write: audit insertion and lifecycle update must roll back too.
    db.exec(`CREATE TRIGGER fail_release BEFORE UPDATE ON technicians
      WHEN NEW.status = 'Available' BEGIN SELECT RAISE(ABORT, 'test failure'); END;`);
    assert.equal((await post('complete-dispatch', input)).status, 500);
    assert.deepEqual(await read(), allocated);
    db.exec('DROP TRIGGER fail_release');
    // Two competing completions result in exactly one event.
    const responses = await Promise.all([post('complete-dispatch', input), post('complete-dispatch', input)]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    const completed = await read();
    assert.deepEqual(completed.inventory, allocated.inventory);
    assert.equal(completed.technicians[0].status, 'Available');
    assert.deepEqual(completed.technicians.slice(1), allocated.technicians.slice(1));
    assert.equal(completed.activity_log.length, allocated.activity_log.length + 1);
    assert.equal(completed.activity_log[0].completion_dispatch_id, id);
    assert.equal(completed.activity_log[0].approved_by, input.completed_by);
    assert.equal(completed.activity_log[0].dispatch, null);
    const saved = completed.activity_log.find((e) => e.id === id);
    assert.equal(saved.dispatch.status, 'Completed');
    assert.equal(saved.dispatch.completed_at, completed.activity_log[0].timestamp);
    const { dispatch: _oldDispatch, ...oldAudit } = original;
    const { dispatch: _newDispatch, ...newAudit } = saved;
    assert.deepEqual(newAudit, oldAudit);
    assert.throws(() => db.prepare('DELETE FROM activity_log WHERE id = ?').run(id), /immutable/);
    // New assignment consumes more parts; replaying old completion must not release it.
    assert.equal((await approve()).status, 200);
    const reassigned = await read();
    assert.equal((await post('complete-dispatch', input)).status, 409);
    assert.deepEqual(await read(), reassigned);
    // A separate SQLite connection observes persisted state, not a transient Busy toggle.
    const reopened = new Database(resolve(dir, 'data/dispatch-hub.sqlite'), { readonly: true });
    assert.equal(reopened.prepare('SELECT status FROM dispatches WHERE activity_id = ?').get(id).status, 'Completed');
    assert.equal(reopened.prepare("SELECT count(*) AS n FROM dispatches WHERE status = 'Active'").get().n, 1);
    reopened.close();

    const activeBeforeReset = await read();
    for (const invalid of [
      {}, null, { technician_id: 0, reset_by: 'Demo Dispatcher' },
      { technician_id: 1.5, reset_by: 'Demo Dispatcher' },
      { technician_id: '3', reset_by: 'Demo Dispatcher' },
      { technician_id: 3, reset_by: '  ' },
      { technician_id: 3, reset_by: 'a'.repeat(81) },
    ]) assert.equal((await post('reset-technician', invalid)).status, 400);
    assert.equal((await reset(99999)).status, 404);
    assert.equal((await reset(1)).status, 409); // a tracked active job must be completed, not reset
    assert.equal((await reset(2)).status, 409); // only Available
    assert.deepEqual(await read(), activeBeforeReset);

    // A failed audit write rolls back the status change as well.
    db.exec(`CREATE TRIGGER fail_reset BEFORE INSERT ON activity_log
      WHEN NEW.action_details LIKE 'Technician availability reset:%'
      BEGIN SELECT RAISE(ABORT, 'test failure'); END;`);
    assert.equal((await reset(3)).status, 500);
    assert.deepEqual(await read(), activeBeforeReset);
    db.exec('DROP TRIGGER fail_reset');

    const resetResponses = await Promise.all([reset(3), reset(3)]);
    assert.deepEqual(resetResponses.map((response) => response.status).sort(), [200, 409]);
    const afterReset = await read();
    assert.equal(afterReset.technicians[2].status, 'Available');
    assert.equal(afterReset.technicians[0].status, 'Busy'); // reset did not release Tech A's active job
    assert.deepEqual(afterReset.inventory, activeBeforeReset.inventory);
    assert.equal(afterReset.activity_log.length, activeBeforeReset.activity_log.length + 1);
    const resetEvent = afterReset.activity_log[0];
    assert.match(resetEvent.action_details, /^Technician availability reset: Tech C/);
    assert.equal(resetEvent.approved_by, 'Demo Dispatcher');
    assert.equal(resetEvent.dispatch, null);
    assert.equal(resetEvent.completion_dispatch_id, null);
    assert.equal((await reset(3)).status, 409); // repeated resets do not add audit events
    assert.deepEqual(await read(), afterReset);

    const persisted = new Database(resolve(dir, 'data/dispatch-hub.sqlite'), { readonly: true });
    assert.equal(persisted.prepare('SELECT status FROM technicians WHERE id = 3').get().status, 'Available');
    assert.equal(persisted.prepare('SELECT status FROM dispatches WHERE activity_id = ?').get(id).status, 'Active');
    persisted.close();
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((r, reject) => server.close((e) => e ? reject(e) : r()));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('migration activates only unambiguous Busy assignments and preserves unknown legacy history', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'completion-migration-'));
  mkdirSync(resolve(dir, 'data'));
  const db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
  let server;
  try {
    db.exec(`
      CREATE TABLE technicians (id INTEGER PRIMARY KEY, name TEXT, status TEXT, zone TEXT, van_id INTEGER UNIQUE);
      INSERT INTO technicians VALUES (1, 'Tech A', 'Busy', 'North Zone', 1), (2, 'Tech B', 'Busy', 'Central Zone', 2),
        (3, 'Tech C', 'Available', 'South Zone', 3);
      CREATE TABLE activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, action_details TEXT, approved_by TEXT);
      CREATE TABLE dispatches (activity_id INTEGER PRIMARY KEY, tech_id INTEGER, technician_name TEXT,
        van_id INTEGER, parts_json TEXT, customer_site_json TEXT);
    `);
    for (const [id, tech] of [[1, 1], [2, 2], [3, 2], [4, 3]]) {
      db.prepare('INSERT INTO activity_log VALUES (?, ?, ?, ?)').run(id, '2026-01-01T00:00:00Z', 'Original approval', 'Demo Dispatcher');
      db.prepare('INSERT INTO dispatches VALUES (?, ?, ?, ?, ?, ?)').run(id, tech, `Tech ${tech}`, tech, '[]', JSON.stringify(demoSites.central));
    }
    process.chdir(dir);
    const { default: router } = await import(`${new URL('../src/hub.js', import.meta.url).href}?migration`);
    process.chdir(cwd);
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((r) => server!.once('listening', r));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api`;
    const hub = await (await fetch(`${base}/hub-data`)).json();
    assert.deepEqual(hub.activity_log.map((e) => e.dispatch.status), ['Unknown', 'Unknown', 'Unknown', 'Active']);
    const reset = (technician_id: number) => fetch(`${base}/reset-technician`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technician_id, reset_by: 'Demo Dispatcher' }),
    });
    const complete = (id: number) => fetch(`${base}/complete-dispatch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispatch_id: id, completed_by: 'Demo Dispatcher' }),
    });
    assert.equal((await complete(2)).status, 409);
    assert.equal((await reset(1)).status, 409); // verified active job remains protected
    assert.equal((await reset(2)).status, 200); // explicit reset preserves unknown legacy assignments
    const afterReset = await (await fetch(`${base}/hub-data`)).json();
    assert.equal(afterReset.technicians.find((tech) => tech.id === 2).status, 'Available');
    assert.deepEqual(afterReset.activity_log.filter((e) => [1, 2, 3, 4].includes(e.id)).map((e) => e.dispatch.status),
      ['Unknown', 'Unknown', 'Unknown', 'Active']);
    assert.match(afterReset.activity_log[0].action_details, /^Technician availability reset: Tech B/);
    assert.equal((await complete(2)).status, 409);
    assert.equal((await complete(1)).status, 200);
    assert.equal(db.prepare('SELECT count(*) AS n FROM activity_log').get().n, 6);
    assert.equal(db.prepare('SELECT action_details FROM activity_log WHERE id = 1').get().action_details, 'Original approval');
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((r, reject) => server.close((e) => e ? reject(e) : r()));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
