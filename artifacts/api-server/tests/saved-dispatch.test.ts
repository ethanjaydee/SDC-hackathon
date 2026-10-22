import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';
import { demoSites } from '../src/demoSites.js';

test('additive migration preserves legacy history and atomically saves canonical sites and assignments', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'saved-dispatch-'));
  mkdirSync(resolve(dir, 'data'));
  const db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
  db.exec(`CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL,
    action_details TEXT NOT NULL, approved_by TEXT NOT NULL
  ); INSERT INTO activity_log VALUES (42, '2026-01-01T00:00:00Z', 'Original legacy dispatch', 'Original approver');`);
  let server;
  try {
    const moduleUrl = new URL('../src/hub.js', import.meta.url).href;
    process.chdir(dir);
    const { default: router } = await import(moduleUrl);
    process.chdir(cwd);
    // Migration/atomicity fixtures need verified experts for the electrical parts.
    db.prepare('UPDATE technician_profiles SET level = 3 WHERE technician_id IN (1, 2)').run();
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api`;
    const read = async () => (await fetch(`${base}/hub-data`)).json();
    const approve = async (data: unknown) => fetch(`${base}/approve-dispatch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const initial = await read();
    assert.deepEqual(initial.activity_log, [{
      id: 42, timestamp: '2026-01-01T00:00:00Z', action_details: 'Original legacy dispatch',
      approved_by: 'Original approver', dispatch: null, completion_dispatch_id: null,
    }]);
    const input = { tech_id: 1, van_id: 1, parts: ['100uF Capacitor', 'NPN Transistor'], approved_by: 'Demo Dispatcher' };
    for (const customer_site_id of [undefined, null, '', 'unknown', { lat: 1, lng: 2 }]) {
      assert.equal((await approve({ ...input, customer_site_id })).status, 400);
    }
    assert.deepEqual(await read(), initial);
    const result = await approve({ ...input, customer_site_id: 'central', customer_site: { lat: 0, lng: 0 } });
    assert.equal(result.status, 200);
    const saved = await result.json();
    const entry = saved.activity_log[0];
    assert.deepEqual(entry.dispatch, {
      tech_id: 1, technician_name: 'Amir Hakim', van_id: 1,
      parts: input.parts, customer_site: demoSites.central,
      status: 'Active', completed_at: null, conversation_id: null,
    });
    assert.equal(saved.technicians[0].status, 'Busy');
    assert.equal(saved.inventory.find((i) => i.van_id === 1 && i.part_name === '100uF Capacitor').quantity, 7);
    assert.deepEqual(await read(), saved);
    assert.equal((await approve({ ...input, customer_site_id: 'south' })).status, 409);
    assert.equal((await approve({ ...input, tech_id: 2, van_id: 2, parts: ['100uF Capacitor', 'missing'], customer_site_id: 'south' })).status, 409);
    assert.deepEqual(await read(), saved);
    const second = await approve({ ...input, tech_id: 2, van_id: 2, customer_site_id: 'south' });
    assert.equal(second.status, 200);
    assert.deepEqual((await second.json()).activity_log[0].dispatch.customer_site, demoSites.south);
    // Reopen from disk: neither persisted snapshots nor legacy rows depend on intake state.
    const reopened = new Database(resolve(dir, 'data/dispatch-hub.sqlite'), { readonly: true });
    assert.equal(reopened.prepare('SELECT count(*) AS n FROM dispatches').get().n, 2);
    assert.deepEqual(JSON.parse(reopened.prepare('SELECT customer_site_json FROM dispatches WHERE activity_id = ?').get(entry.id).customer_site_json), demoSites.central);
    assert.equal(reopened.prepare('SELECT action_details FROM activity_log WHERE id = 42').get().action_details, 'Original legacy dispatch');
    assert.throws(() => db.prepare("UPDATE activity_log SET action_details = 'changed' WHERE id = 42").run(), /immutable/);
    reopened.close();
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
