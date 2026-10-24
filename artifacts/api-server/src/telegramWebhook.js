import { createHmac, timingSafeEqual } from "node:crypto";
import { getTelegramCheckpoint } from "./hub.js";
import { registerTelegramSender } from "./telegramTransport.js";
import { createTelegramCall, processTelegramUpdate, telegramFailureMessage } from "./telegramUpdates.js";

export function createTelegramWebhook({
  token, url, sessionSecret, apiFetch = fetch, report = () => {},
}) {
  const controller = new AbortController();
  const call = createTelegramCall(token, apiFetch, controller.signal);
  const secret = sessionSecret ? createHmac("sha256", sessionSecret)
    .update("dispatch-hub/telegram-webhook/v1").digest("hex") : null;
  let verified = false;
  let botId;
  let preparing;
  let retryAfter = 0;
  let lastError = "";
  let unregisterSender = () => {};
  const updateStatus = (fields) => { if (!controller.signal.aborted) report(fields); };

  const prepare = async () => {
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
      endpoint.search || endpoint.hash || endpoint.pathname !== "/api/messaging/telegram/webhook") {
      throw new Error("Configure a valid published HTTPS Telegram webhook URL.");
    }
    if (!secret) throw new Error("SESSION_SECRET is required to authenticate Telegram webhook deliveries.");
    const bot = await call("getMe");
    if (!bot?.is_bot || !Number.isSafeInteger(bot.id) || !/^[A-Za-z0-9_]+$/.test(bot.username ?? "")) {
      throw { safeCode: 0 };
    }
    const current = await call("getWebhookInfo");
    if (current.url && current.url !== endpoint.href) throw { safeCode: "webhook" };
    // Reapplying our own endpoint is safe on cold starts. Never delete pending
    // updates or replace an unrelated webhook. One connection keeps deliveries
    // serialized for this prototype's local SQLite store.
    const registered = await call("setWebhook", {
      url: endpoint.href, secret_token: secret, allowed_updates: ["message"],
      max_connections: 1, drop_pending_updates: false,
    });
    if (registered !== true || controller.signal.aborted) throw { safeCode: 0 };
    botId = bot.id;
    verified = true;
    unregisterSender();
    unregisterSender = registerTelegramSender(bot.id, () => verified && !controller.signal.aborted,
      (chatId, text) => call("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true }));
    updateStatus({
      connected: true, bot_username: bot.username, bot_url: `https://t.me/${bot.username}`,
      last_received_at: getTelegramCheckpoint(bot.id).last_received_at, error: null,
    });
  };

  const ready = async () => {
    if (verified && !controller.signal.aborted) return;
    if (controller.signal.aborted) throw new Error("Telegram receiver is stopped.");
    if (preparing) return preparing;
    if (Date.now() < retryAfter) throw new Error(lastError);
    preparing = prepare().catch((error) => {
      // Only local configuration messages and sanitized codes leave this layer.
      lastError = error instanceof TypeError ? "Configure a valid published HTTPS Telegram webhook URL."
        : error instanceof Error ? error.message : telegramFailureMessage(error?.safeCode);
      updateStatus({ connected: false, error: lastError });
      retryAfter = Date.now() + 5000;
      throw new Error(lastError);
    }).finally(() => { preparing = null; });
    return preparing;
  };

  return {
    ready,
    async handle(update, suppliedSecret) {
      if (!secret) return { status: 503, body: { error: "Telegram webhook authentication is not configured." } };
      const candidate = typeof suppliedSecret === "string" ? Buffer.from(suppliedSecret) : Buffer.alloc(0);
      const expected = Buffer.from(secret);
      if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
        return { status: 401, body: { error: "Invalid Telegram webhook authentication." } };
      }
      if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0 ||
        (update.message != null && (typeof update.message !== "object" || Array.isArray(update.message)))) {
        return { status: 400, body: { error: "Invalid Telegram update." } };
      }
      try {
        await ready();
        updateStatus({ connected: true, error: null });
        // Finish storage, analysis and acknowledgement inside the HTTP request.
        // Autoscale may suspend execution after responding to Telegram.
        await processTelegramUpdate(botId, update, call, updateStatus);
        return { status: 200, body: { ok: true } };
      } catch {
        if (verified) updateStatus({ error: "Telegram message could not be saved. Telegram will retry delivery." });
        return { status: 503, body: { error: "Telegram delivery could not be processed. Telegram should retry." } };
      }
    },
    stop() {
      controller.abort();
      verified = false;
      unregisterSender();
      // Keep the registered webhook: Telegram queues deliveries during restarts.
    },
  };
}
