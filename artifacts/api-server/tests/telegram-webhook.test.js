import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import express from "express";

test("webhooks authenticate, persist once, retry failed storage, support replies and survive receiver restarts", async () => {
  const cwd = process.cwd();
  const dir = mkdtempSync(resolve(tmpdir(), "telegram-webhook-"));
  const priorEnabled = process.env.TELEGRAM_RECEIVER_ENABLED;
  const priorSession = process.env.SESSION_SECRET;
  const actualFetch = global.fetch;
  let stop = () => {};
  let server;
  let db;
  try {
    process.env.TELEGRAM_RECEIVER_ENABLED = "true";
    process.env.SESSION_SECRET = "webhook-unit-test-only-session-key";
    // No real Telegram or AI calls. Local HTTP remains real.
    global.fetch = (input, init) => String(input).startsWith("http://127.0.0.1:")
      ? actualFetch(input, init) : Promise.resolve(Response.json({ ok: false }, { status: 503 }));
    process.chdir(dir);
    const receiver = await import("../src/telegramReceiver.js");
    const { createTelegramWebhook } = await import("../src/telegramWebhook.js");
    const { default: router } = await import("../src/routes/index.ts");
    process.chdir(cwd);
    db = new Database(resolve(dir, "data/dispatch-hub.sqlite"));
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    server = app.listen(0, "127.0.0.1");
    await new Promise((done) => server.once("listening", done));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const methods = [];
    const sent = [];
    const registrations = [];
    let registeredUrl = "";
    const url = "https://webhook-fixture.example/api/messaging/telegram/webhook";
    const apiFetch = async (input, init) => {
      const method = String(input).split("/").at(-1);
      const body = JSON.parse(init.body);
      methods.push(method);
      if (method === "getMe") return Response.json({ ok: true, result: { id: 789, is_bot: true, username: "FixtureWebhookBot" } });
      if (method === "getWebhookInfo") return Response.json({ ok: true, result: { url: registeredUrl } });
      if (method === "setWebhook") {
        registrations.push(body);
        registeredUrl = body.url;
        return Response.json({ ok: true, result: true });
      }
      if (method === "sendMessage") {
        sent.push(body);
        return Response.json({ ok: true, result: { message_id: sent.length } });
      }
      throw new Error("Unexpected test API method");
    };
    const options = { token: "test-placeholder-not-a-credential", webhookUrl: url,
      sessionSecret: "webhook-unit-test-only-session-key", apiFetch };
    stop = receiver.startTelegramReceiver(options);
    await receiver.ensureTelegramWebhookReady();
    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].drop_pending_updates, false);
    assert.equal(registrations[0].max_connections, 1);
    assert.deepEqual(registrations[0].allowed_updates, ["message"]);
    const header = registrations[0].secret_token;
    assert.match(header, /^[a-f0-9]{64}$/);
    const status = await (await fetch(`${base}/messaging/telegram`)).json();
    assert.equal(status.mode, "webhook");
    assert.equal(status.connected, true);
    assert.equal(status.bot_url, "https://t.me/FixtureWebhookBot");
    assert.ok(!JSON.stringify(status).includes(header));
    const update = (id, text, type = "private") => ({
      update_id: id, message: { message_id: id, text, chat: { id: 54321, type }, from: { first_name: "Do not persist profile" } },
    });
    const post = (body, auth = header) => fetch(`${base}/messaging/telegram/webhook`, {
      method: "POST", headers: { "Content-Type": "application/json",
        ...(auth ? { "X-Telegram-Bot-Api-Secret-Token": auth } : {}) }, body: JSON.stringify(body),
    });
    assert.equal((await post(update(500, "Not authorized"), "")).status, 401);
    assert.equal((await post(update(500, "Not authorized"), "wrong-secret")).status, 401);
    assert.equal((await post({ update_id: -1 })).status, 400);
    assert.equal((await post({ update_id: 1, message: "not-an-object" })).status, 400);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM conversation_threads WHERE source='Telegram'").get().n, 0);
    const first = update(501, "The light bulb needs replacement.");
    assert.equal((await post(first)).status, 200);
    assert.equal((await post(first)).status, 200);
    const thread = db.prepare("SELECT * FROM conversation_threads WHERE source='Telegram'").get();
    assert.ok(thread.analysis_json);
    assert.equal(thread.customer_site_id, null);
    assert.equal(thread.technician_id, null);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM conversation_messages WHERE conversation_id=?").get(thread.id).n, 1);
    assert.equal(sent.length, 1, "Duplicate delivery does not repeat a reply");
    assert.ok(!JSON.stringify(thread).includes("Do not persist profile"));
    assert.equal((await post(update(499, "The socket itself works normally."))).status, 200);
    assert.equal(db.prepare("SELECT next_offset FROM telegram_receivers WHERE bot_id='789'").get().next_offset, 502);
    assert.equal((await post(update(502, "Ignore group text", "group"))).status, 200);
    assert.equal((await post({ update_id: 503, message: { chat: { id: 54321, type: "private" }, photo: [{}] } })).status, 200);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM conversation_messages WHERE conversation_id=?").get(thread.id).n, 2);
    const reply = await fetch(`${base}/conversations/${thread.id}/reply`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "We can book your visit tomorrow." }),
    });
    assert.equal(reply.status, 200);
    assert.equal(sent.at(-1).text, "We can book your visit tomorrow.");
    assert.equal((await reply.json()).messages.at(-1).sender_role, "Staff");
    assert.equal((await post(update(504, "/new"))).status, 200);
    db.exec("CREATE TRIGGER test_storage_failure BEFORE INSERT ON conversation_messages BEGIN SELECT RAISE(ABORT, 'Simulated disk failure'); END");
    const retried = update(505, "Please replace the AC filter.");
    assert.equal((await post(retried)).status, 503);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM telegram_updates WHERE bot_id='789' AND update_id=505").get().n, 0);
    db.exec("DROP TRIGGER test_storage_failure");
    assert.equal((await post(retried)).status, 200);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM conversation_threads WHERE source='Telegram'").get().n, 2);
    stop();
    assert.equal(registeredUrl, url, "Stopping does not delete the webhook or queued updates");
    stop = receiver.startTelegramReceiver(options);
    await receiver.ensureTelegramWebhookReady();
    assert.equal(registrations.length, 2);
    assert.equal(registrations[1].secret_token, header, "Authentication is stable across cold starts");
    const repliesBefore = sent.length;
    assert.equal((await post(retried)).status, 200);
    assert.equal(sent.length, repliesBefore);
    assert.ok(methods.every((m) => ["getMe", "getWebhookInfo", "setWebhook", "sendMessage"].includes(m)));
    assert.deepEqual(db.pragma("foreign_key_check"), []);
    stop();

    const foreignCalls = [];
    const protectedReceiver = createTelegramWebhook({
      token: options.token, url, sessionSecret: options.sessionSecret,
      apiFetch: async (input) => {
        const method = String(input).split("/").at(-1);
        foreignCalls.push(method);
        return Response.json({ ok: true, result: method === "getMe"
          ? { id: 789, is_bot: true, username: "FixtureWebhookBot" } : { url: "https://unrelated.example/hook" } });
      },
    });
    await assert.rejects(protectedReceiver.ready(), /existing webhook/);
    assert.deepEqual(foreignCalls, ["getMe", "getWebhookInfo"]);
    protectedReceiver.stop();
    const failed = createTelegramWebhook({ token: options.token, url, sessionSecret: options.sessionSecret,
      apiFetch: async () => { throw new Error("Do not expose credential-bearing fetch error"); } });
    await assert.rejects(failed.ready(), (error) => !error.message.includes("credential-bearing"));
    failed.stop();
    const invalid = createTelegramWebhook({ token: options.token, url: "http://example.invalid/hook", sessionSecret: options.sessionSecret });
    await assert.rejects(invalid.ready(), /published HTTPS/);
    invalid.stop();
  } finally {
    stop();
    process.chdir(cwd);
    global.fetch = actualFetch;
    if (server) await new Promise((done) => server.close(done));
    db?.close();
    if (priorEnabled === undefined) delete process.env.TELEGRAM_RECEIVER_ENABLED;
    else process.env.TELEGRAM_RECEIVER_ENABLED = priorEnabled;
    if (priorSession === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSession;
    rmSync(dir, { recursive: true, force: true });
  }
});
