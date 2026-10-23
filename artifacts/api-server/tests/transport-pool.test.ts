import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import express from 'express';
import Database from 'better-sqlite3';
import { SHOP_LOCATION, chooseFreeVan, seedTransportPool } from '../src/transportPool.js';

test('five pooled vans allocate atomically, cannot double-book, and return only on completion', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'transport-pool-'));
  let server;
  let db;
  try {
    process.chdir(dir);
    const { default: router } = await import(`${new URL('../src/hub.js', import.meta.url).href}?transport`);
    process.chdir(cwd);
    db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
    const app = express();
    app.use(express.json()); app.use('/api', router);
    app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((done) => server.once('listening', done));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const read = async () => (await fetch(`${base}/hub-data`)).json();
    const post = (path, data) => fetch(`${base}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const initial = await read();
    assert.equal(initial.vans.length, 5);
    assert.ok(initial.vans.every((van) => van.status === 'Available' && van.technician_id == null));
    assert.deepEqual(initial.shop, SHOP_LOCATION);
    const techIds = [1, 4, 7, 10, 8, 11];
    const responses = await Promise.all(techIds.map((tech_id) => post('approve-dispatch', {
      tech_id, customer_site_id: 'north', parts: ['LED Bulb E27'], approved_by: 'Demo technician',
      // A malicious/stale fixed-van hint must never allocate an occupied van.
      van_id: 1,
    })));
    assert.equal(responses.filter((response) => response.status === 200).length, 5);
    assert.equal(responses.filter((response) => response.status === 409).length, 1);
    const allocated = await read();
    const jobs = allocated.activity_log.filter((entry) => entry.dispatch?.status === 'Active');
    assert.equal(new Set(jobs.map((entry) => entry.dispatch.van_id)).size, 5);
    assert.ok(allocated.vans.every((van) => van.status === 'Busy' && van.dispatch_id != null));
    for (const entry of jobs) {
      assert.deepEqual(entry.dispatch.shop_location, SHOP_LOCATION);
      assert.equal(allocated.technicians.find((tech) => tech.id === entry.dispatch.tech_id).assigned_van_id, entry.dispatch.van_id);
    }
    assert.equal(chooseFreeVan(allocated, ['LED Bulb E27']), null);
    const released = jobs[0];
    assert.equal((await post('complete-dispatch', { dispatch_id: released.id, completed_by: 'Demo technician' })).status, 200);
    const completed = await read();
    assert.equal(completed.vans.filter((van) => van.status === 'Available').length, 1);
    assert.equal(completed.vans.find((van) => van.id === released.dispatch.van_id).status, 'Available');
    assert.deepEqual(completed.inventory, allocated.inventory, 'completion never restores consumed parts');
    const waitingTech = techIds.find((id) => completed.technicians.find((tech) => tech.id === id)?.status === 'Available' && id !== released.dispatch.tech_id);
    const next = await post('approve-dispatch', { tech_id: waitingTech, customer_site_id: 'south', parts: ['LED Bulb E27'], approved_by: 'Demo technician' });
    assert.equal(next.status, 200, 'van_id is not required; server assigns transport');
    const final = await next.json();
    assert.equal(final.activity_log[0].dispatch.van_id, released.dispatch.van_id);
    seedTransportPool(db);
    assert.deepEqual((await read()).inventory, final.inventory, 'restart does not refill any van');
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((done) => server.close(() => done()));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
