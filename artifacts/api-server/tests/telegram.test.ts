import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import Database from 'better-sqlite3';
import express from 'express';
import { prepareTelegramStorage } from '../src/telegramStore.js';

test('nullable conversation-site migration preserves IDs, messages and foreign keys', () => {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE conversation_threads (
        id INTEGER PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_site_id TEXT NOT NULL CHECK(customer_site_id IN ('north', 'central', 'south'))
      );
      CREATE TABLE conversation_messages (id INTEGER PRIMARY KEY, conversation_id INTEGER REFERENCES conversation_threads(id), text TEXT);
      CREATE TABLE dispatches (id INTEGER PRIMARY KEY, conversation_id INTEGER REFERENCES conversation_threads(id));
      INSERT INTO conversation_threads VALUES (7, 'Existing sample customer', 'south');
      INSERT INTO conversation_messages VALUES (11, 7, 'Preserve this message');
      INSERT INTO dispatches VALUES (3, 7);
    `);
    prepareTelegramStorage(db);
    prepareTelegramStorage(db); // Safe across restarts.
    assert.deepEqual(db.prepare('SELECT * FROM conversation_threads WHERE id = 7').get(), {
      id: 7, customer_name: 'Existing sample customer', customer_site_id: 'south', source: 'Demo',
    });
    assert.equal(db.prepare('SELECT text FROM conversation_messages WHERE id = 11').get().text, 'Preserve this message');
    assert.equal(db.prepare('SELECT conversation_id FROM dispatches WHERE id = 3').get().conversation_id, 7);
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
    db.prepare("INSERT INTO conversation_threads VALUES (8, 'Unknown customer', NULL, 'Telegram')").run();
    assert.throws(() => db.prepare("INSERT INTO conversation_threads VALUES (9, 'Invalid site', 'invented', 'Telegram')").run());
  } finally { db.close(); }
});

test('Telegram polling imports private messages once, auto-reviews, persists cursor and requires explicit site', async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), 'dispatch-telegram-'));
  let server;
  let db;
  let stop = () => {};
  try {
    process.chdir(dir);
    const hub = await import('../src/hub.js');
    const receiver = await import('../src/telegramReceiver.js');
    process.chdir(cwd);
    db = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
    const app = express();
    app.use(express.json());
    app.use('/api', hub.default);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((done) => server!.once('listening', done));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api`;
    const update = (id: number, text: string, type = 'private') => ({
      update_id: id, message: { chat: { id: 98765, type }, from: { is_bot: false, first_name: 'Must not persist profile' }, text },
    });
    const fixture = update(100, 'Accessory power is not working and the relay clicks.');
    const methods: string[] = [];
    const sentReplies: string[] = [];
    let polls = 0;
    const apiFetch: typeof fetch = async (input, init) => {
      const method = String(input).split('/').at(-1)!;
      methods.push(method);
      if (method === 'getMe') return Response.json({ ok: true, result: { id: 123, is_bot: true, username: 'FixtureBot' } });
      if (method === 'getWebhookInfo') return Response.json({ ok: true, result: { url: '' } });
      if (method === 'sendMessage') {
        sentReplies.push(JSON.parse(init?.body?.toString() ?? '{}').text);
        return Response.json({ ok: true, result: { message_id: sentReplies.length } });
      }
      assert.equal(method, 'getUpdates');
      if (polls++ === 0) return Response.json({ ok: true, result: [
        fixture, fixture, update(101, '/start'), update(102, '/help'),
        update(103, '/new'), update(104, 'A separate repair request.'),
      ] });
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('Test stopped')), { once: true });
      });
    };
    stop = receiver.startTelegramReceiver({ token: 'test-placeholder-not-a-credential', apiFetch });
    let imported;
    for (let attempt = 0; attempt < 100; attempt++) {
      imported = db.prepare("SELECT * FROM conversation_threads WHERE source = 'Telegram'").get();
      if (imported?.analysis_json) break;
      await delay(10);
    }
    stop();
    assert.ok(imported?.analysis_json, 'Receiver automatically generated mock analysis');
    const id = imported.id;
    assert.equal(imported.customer_site_id, null);
    assert.match(imported.customer_name, /^Telegram customer #/);
    assert.ok(!JSON.stringify(imported).includes('Must not persist profile'));
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM conversation_messages WHERE conversation_id = ?').get(id).count, 1);
    assert.equal(hub.getTelegramCheckpoint(123).next_offset, 105);
    assert.equal(receiver.getTelegramStatus().bot_url, 'https://t.me/FixtureBot');
    assert.ok(methods.every((method) => ['getMe', 'getWebhookInfo', 'getUpdates', 'sendMessage'].includes(method)));
    assert.equal(sentReplies.length, 5, 'One confirmation for each unique command or request');
    assert.match(sentReplies[0], new RegExp(`conversation #${id}`));
    assert.match(sentReplies[0], /mock review is ready/i);
    assert.match(sentReplies[1], /Welcome/i);
    assert.match(sentReplies[2], /repair request/i);
    assert.match(sentReplies[3], /Ready for a separate request/i);
    const separate = db.prepare("SELECT id, customer_site_id FROM conversation_threads WHERE source = 'Telegram' ORDER BY id DESC LIMIT 1").get();
    assert.notEqual(separate.id, id);
    assert.equal(separate.customer_site_id, null);
    assert.equal(hub.getTelegramCheckpoint(123).next_offset, 105);

    const thread = await (await fetch(`${base}/conversations/${id}`)).json();
    assert.equal(thread.source, 'Telegram');
    assert.equal(thread.messages[0].sender_role, 'Customer');
    assert.equal(thread.analyzed_through_message_id, thread.latest_message_id);
    assert.deepEqual(thread.analysis.parts, ['12V Relay']);
    const dispatch = () => fetch(`${base}/approve-dispatch`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: id, customer_site_id: 'central', tech_id: 2, van_id: 2, parts: ['12V Relay'], approved_by: 'Test Dispatcher' }) });
    assert.equal((await dispatch()).status, 409, 'Unknown site cannot silently default');
    const patchSite = (site: string) => fetch(`${base}/conversations/${id}/site`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_site_id: site }) });
    assert.equal((await patchSite('invented')).status, 400);
    assert.equal((await patchSite('central')).status, 200);
    assert.equal((await (await fetch(`${base}/conversations/${id}`)).json()).customer_site_id, 'central');
    assert.equal((await dispatch()).status, 200);
    assert.equal((await patchSite('south')).status, 409, 'Saved dispatch location cannot be changed');

    hub.ingestTelegramUpdate(123, update(106, 'Ignore group message', 'group'));
    hub.ingestTelegramUpdate(123, update(107, '/new'));
    const next = hub.ingestTelegramUpdate(123, update(108, 'A new separate repair request.'));
    assert.notEqual(next.conversationId, id);
    assert.equal(hub.getTelegramCheckpoint(123).next_offset, 109);
    assert.equal(hub.ingestTelegramUpdate(123, fixture).imported, false);
    assert.equal(hub.getTelegramCheckpoint(123).next_offset, 109, 'Replay cannot rewind the saved cursor');
    const reopened = new Database(resolve(dir, 'data/dispatch-hub.sqlite'));
    assert.equal(reopened.prepare("SELECT next_offset FROM telegram_receivers WHERE bot_id = '123'").get().next_offset, 109);
    assert.deepEqual(reopened.pragma('foreign_key_check'), []);
    reopened.close();

    // Never take over a bot that already belongs to an external webhook.
    await delay(0);
    const protectedMethods: string[] = [];
    stop = receiver.startTelegramReceiver({
      token: 'test-placeholder-not-a-credential',
      apiFetch: async (input) => {
        const method = String(input).split('/').at(-1)!;
        protectedMethods.push(method);
        return Response.json({ ok: true, result: method === 'getMe'
          ? { id: 456, is_bot: true, username: 'WebhookFixtureBot' }
          : { url: 'https://example.invalid/private-webhook-value' } });
      },
    });
    for (let attempt = 0; attempt < 100 && !receiver.getTelegramStatus().error?.includes('existing webhook'); attempt++) await delay(10);
    stop();
    assert.match(receiver.getTelegramStatus().error ?? '', /existing webhook/);
    assert.equal(receiver.getTelegramStatus().connected, false);
    assert.deepEqual(protectedMethods, ['getMe', 'getWebhookInfo']);
    assert.ok(!JSON.stringify(receiver.getTelegramStatus()).includes('private-webhook-value'));
  } finally {
    stop();
    process.chdir(cwd);
    if (server) await new Promise<void>((done) => server!.close(() => done()));
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
