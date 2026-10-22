import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';

test('conversation inbox persists mock analysis, invalidates stale messages, and links atomic dispatches', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'dispatch-conversations-'));
  let server;
  let db;
  try {
    process.chdir(dir);
    const { default: router } = await import(`${new URL('../src/hub.js', import.meta.url).href}?conversations`);
    process.chdir(cwd);
    db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
    db.prepare('UPDATE technician_profiles SET level = 3 WHERE technician_id = 2').run();
    const app = express();
    app.use(express.json());
    app.use('/api', router);
    app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolveListening) => server!.once('listening', resolveListening));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api`;
    const post = (path: string, data?: unknown) => fetch(`${base}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });

    const listResponse = await fetch(`${base}/conversations`);
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json();
    assert.equal(listed.conversations.length, 12);
    assert.ok(listed.conversations.every((thread) => thread.mock_summary.trim().length > 0));
    assert.ok(listed.conversations.filter((thread) => thread.id <= 3).every((thread) => thread.mock_summary.includes('Customer:')));
    const originalThread = await (await fetch(`${base}/conversations/2`)).json();
    assert.deepEqual(originalThread.messages.map((message) => message.sender_role), ['Customer', 'Technician', 'Customer']);
    assert.equal(originalThread.analysis, null);

    // Analysis belongs only to the selected chat and survives a subsequent GET.
    const analyzed = await post('conversations/2/analyze');
    assert.equal(analyzed.status, 200);
    const filterThread = await analyzed.json();
    assert.equal(filterThread.analysis.issue, 'Oil Filter Housing Seep');
    assert.deepEqual(filterThread.analysis.parts, ['Wix 57356 Filter']);
    assert.equal(filterThread.analyzed_through_message_id, filterThread.latest_message_id);
    assert.equal((await (await fetch(`${base}/conversations/1`)).json()).analysis, null);

    // A new message persists and clears the old result, so the prior analysis cannot dispatch.
    const message = await post('conversations/2/messages', {
      sender_role: 'Customer',
      text: 'The seep is still visible after the latest run.',
    });
    assert.equal(message.status, 200);
    const updatedThread = await message.json();
    assert.equal(updatedThread.messages.length, 4);
    assert.equal(updatedThread.analysis, null);
    assert.equal(updatedThread.mock_summary.includes('still visible'), true);
    assert.equal((await post('approve-dispatch', {
      conversation_id: 2,
      customer_site_id: 'central',
      tech_id: 1,
      van_id: 1,
      parts: ['Wix 57356 Filter'],
      approved_by: 'Demo Dispatcher',
    })).status, 409);

    // The third seeded chat has a relay-only mock result that matches Tech B's van.
    const relayAnalysis = await post('conversations/3/analyze');
    assert.equal(relayAnalysis.status, 200);
    const relayThread = await relayAnalysis.json();
    assert.equal(relayThread.analysis.issue, 'Accessory Power Relay Fault');
    const initialHub = await (await fetch(`${base}/hub-data`)).json();
    const relayStockBefore = initialHub.inventory.find((item) => item.van_id === 2 && item.part_name === '12V Relay').quantity;
    const approved = await post('approve-dispatch', {
      conversation_id: 3,
      customer_site_id: 'south',
      tech_id: 2,
      van_id: 2,
      parts: ['12V Relay'],
      approved_by: 'Demo Dispatcher',
    });
    assert.equal(approved.status, 200);
    const dispatched = await approved.json();
    assert.equal(dispatched.technicians.find((tech) => tech.id === 2).status, 'Busy');
    assert.equal(dispatched.inventory.find((item) => item.van_id === 2 && item.part_name === '12V Relay').quantity, relayStockBefore - 1);
    assert.equal(dispatched.activity_log[0].dispatch.conversation_id, 3);
    assert.equal((await (await fetch(`${base}/conversations/3`)).json()).dispatch_activity_id, dispatched.activity_log[0].id);
    assert.equal((await post('approve-dispatch', {
      conversation_id: 3,
      customer_site_id: 'south',
      tech_id: 2,
      van_id: 2,
      parts: ['12V Relay'],
      approved_by: 'Demo Dispatcher',
    })).status, 409);
    assert.deepEqual(await (await fetch(`${base}/hub-data`)).json(), dispatched);
    assert.equal(db.prepare('SELECT count(*) AS count FROM conversation_messages WHERE conversation_id = 3').get().count, 3);
  } finally {
    process.chdir(cwd);
    if (server) await new Promise<void>((resolveClosed, reject) => server!.close((error) => error ? reject(error) : resolveClosed()));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
