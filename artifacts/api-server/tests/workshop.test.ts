import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';
import { classifyRepair, seedWorkshopDemo } from '../src/workshopDemo.js';
import { googleDrivingRoute, ruleAnalysis } from '../src/dispatchIntelligence.js';

test('repair difficulty is conservative and sample job examples are distinct', () => {
  assert.equal(classifyRepair('Change light bulb'), 'Easy');
  assert.equal(classifyRepair('New remote batteries'), 'Easy');
  assert.equal(classifyRepair('Clean AC filter, no electrical fault'), 'Normal');
  assert.equal(classifyRepair('Drain hose replacement'), 'Normal');
  assert.equal(classifyRepair('Replace aircond capasitor'), 'Hard');
  assert.equal(classifyRepair('Smoke near a broken bulb'), 'Hard');
  assert.equal(classifyRepair('Unknown fault'), 'Hard');
  assert.deepEqual(ruleAnalysis('Please repair my aircond').parts, []);
});

test('Google route adapter consumes road distance, duration and polyline without a straight-line fallback', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), 'https://routes.googleapis.com/directions/v2:computeRoutes');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.travelMode, 'DRIVE');
      return new Response(JSON.stringify({ routes: [{ distanceMeters: 7850, duration: '1110s', polyline: { encodedPolyline: 'encoded-road-route' } }] }));
    };
    assert.deepEqual(await googleDrivingRoute({ lat: 3.1, lng: 101.6 }, { lat: 3.02, lng: 101.7 }),
      { distance_meters: 7850, duration_seconds: 1110, polyline: 'encoded-road-route' });
    globalThis.fetch = async () => new Response('{}', { status: 403 });
    await assert.rejects(() => googleDrivingRoute({ lat: 3.1, lng: 101.6 }, { lat: 3.02, lng: 101.7 }));
  } finally { globalThis.fetch = original; }
});

test('KL workshop examples, junior/expert matching, shared van guard and completion persist safely', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'workshop-flow-'));
  const nativeFetch = globalThis.fetch;
  let server;
  let db;
  try {
    // Do not spend credits or call third-party routes during deterministic tests.
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith('http://127.0.0.1:')) return nativeFetch(url, init);
      throw new Error('Third party disabled in unit test');
    };
    process.chdir(dir);
    const { default: router } = await import(`${new URL('../src/hub.js', import.meta.url).href}?workshop`);
    process.chdir(cwd);
    db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
    const app = express();
    app.use(express.json()); app.use('/api', router);
    app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((done) => server.once('listening', done));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const get = async (path: string) => (await fetch(`${base}/${path}`)).json();
    const post = (path: string, data?: unknown) => fetch(`${base}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
    const hub = await get('hub-data');
    assert.equal(hub.technicians.length, 12);
    assert.deepEqual([...new Set(hub.technicians.map((t) => t.van_id))].sort(), [1, 2, 3]);
    assert.deepEqual(hub.activity_log, []);
    assert.ok(hub.technicians.every((t) => t.lat > 2.9 && t.lat < 3.3 && t.lng > 101.5 && t.lng < 101.8));
    const list = (await get('conversations')).conversations;
    assert.equal(list.length, 12);
    for (const level of ['Easy', 'Normal', 'Hard']) assert.ok(list.filter((t) => t.complexity === level).length >= 3);
    const easy = list.find((t) => t.subject === 'Bedroom light bulb replacement');
    const hard = list.find((t) => t.subject === 'AC capacitor replacement');
    const easyThread = await (await post(`conversations/${easy.id}/analyze`)).json();
    const hardThread = await (await post(`conversations/${hard.id}/analyze`)).json();
    assert.equal(easyThread.analysis.complexity, 'Easy');
    assert.equal(hardThread.analysis.complexity, 'Hard');
    const advice = await (await post(`conversations/${easy.id}/recommendations`)).json();
    assert.equal(advice.source, 'Rules');
    assert.equal(hub.technicians.find((t) => t.id === advice.recommended_technician_id).level, 1);
    assert.ok(advice.candidates.every((c) => c.distance_meters === null && c.duration_seconds === null && c.polyline === null));
    const hardAdvice = await (await post(`conversations/${hard.id}/recommendations`)).json();
    assert.equal(hub.technicians.find((t) => t.id === hardAdvice.recommended_technician_id).level, 3);
    const dispatchInput = { conversation_id: hard.id, customer_site_id: hard.customer_site_id, parts: hardThread.analysis.parts, tech_id: 1, van_id: 1, approved_by: 'Test Dispatcher' };
    assert.equal((await post('approve-dispatch', dispatchInput)).status, 409);
    assert.deepEqual((await get('hub-data')).inventory, hub.inventory);
    const approved = await post('approve-dispatch', { ...dispatchInput, tech_id: 9 });
    assert.equal(approved.status, 200);
    const active = await approved.json();
    assert.equal(active.activity_log[0].dispatch.tech_id, 9);
    const juniorDispatch = await post('approve-dispatch', { conversation_id: easy.id, customer_site_id: easy.customer_site_id, tech_id: 4, van_id: 1, parts: easyThread.analysis.parts, approved_by: 'Test Dispatcher' });
    assert.equal(juniorDispatch.status, 200);
    const bothActive = await juniorDispatch.json();
    assert.notEqual(bothActive.activity_log[0].dispatch.van_id, active.activity_log[0].dispatch.van_id);
    const auditId = active.activity_log[0].id;
    assert.equal((await post('complete-dispatch', { dispatch_id: auditId, completed_by: 'Test Dispatcher' })).status, 200);
    const completed = await get('hub-data');
    assert.equal(completed.technicians.find((t) => t.id === 9).status, 'Available');
    assert.deepEqual(completed.inventory, bothActive.inventory);
    const count = db.prepare('SELECT count(*) AS n FROM conversation_threads').get().n;
    seedWorkshopDemo(db);
    assert.equal(db.prepare('SELECT count(*) AS n FROM conversation_threads').get().n, count);
    assert.deepEqual((await get('hub-data')).inventory, completed.inventory);
    assert.throws(() => db.prepare('DELETE FROM activity_log').run(), /immutable/);
  } finally {
    globalThis.fetch = nativeFetch; process.chdir(cwd);
    if (server) await new Promise<void>((done) => server.close(() => done()));
    db?.close(); rmSync(dir, { recursive: true, force: true });
  }
});
