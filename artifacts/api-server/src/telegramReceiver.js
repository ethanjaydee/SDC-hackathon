import { getTelegramCheckpoint } from "./hub.js";
import { registerTelegramSender } from "./telegramTransport.js";
import { createTelegramCall, processTelegramUpdate, telegramFailureMessage } from "./telegramUpdates.js";
import { createTelegramWebhook } from "./telegramWebhook.js";

const state = {
  configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  connected: false,
  bot_username: null,
  bot_url: null,
  error: null,
  last_received_at: null,
  mode: process.env.TELEGRAM_WEBHOOK_URL ? "webhook" : "polling",
};
export const getTelegramStatus = () => ({ ...state });
let webhookReceiver = null;
export async function ensureTelegramWebhookReady() {
  if (webhookReceiver) await webhookReceiver.ready();
}
export async function receiveTelegramWebhook(update, suppliedSecret) {
  return webhookReceiver ? webhookReceiver.handle(update, suppliedSecret)
    : { status: 503, body: { error: "Telegram webhook receiving is not enabled in this environment." } };
}

/** Never log request URLs/errors: Telegram embeds credentials in its API URL. */
export function startTelegramReceiver({
  token = process.env.TELEGRAM_BOT_TOKEN, apiFetch = fetch,
  webhookUrl = process.env.TELEGRAM_WEBHOOK_URL, sessionSecret = process.env.SESSION_SECRET,
} = {}) {
  state.configured = Boolean(token);
  state.mode = webhookUrl ? "webhook" : "polling";
  if (!token) return () => {};
  if (process.env.TELEGRAM_RECEIVER_ENABLED === "false") {
    state.error = "Telegram receiving is disabled for this environment.";
    return () => {};
  }
  if (webhookUrl) {
    const receiver = createTelegramWebhook({
      token, url: webhookUrl, sessionSecret, apiFetch, report: (fields) => Object.assign(state, fields),
    });
    webhookReceiver = receiver;
    // HTTP requests also await setup, so cold starts do not depend on background
    // CPU. Errors remain visible and subsequent requests can retry safely.
    void receiver.ready().catch(() => {});
    return () => {
      receiver.stop();
      if (webhookReceiver === receiver) webhookReceiver = null;
      state.connected = false;
    };
  }
  const controller = new AbortController();
  const signal = controller.signal;
  let backoff = 2000;
  let unregisterSender = () => {};
  const wait = (ms) => new Promise((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
  const botCall = createTelegramCall(token, apiFetch, signal);
  const call = (method, body = {}, timeoutMs = 35000) => botCall(method, body, timeoutMs);
  const run = async () => {
    while (!signal.aborted) {
      try {
        const bot = await call("getMe");
        if (!bot.is_bot || !/^[A-Za-z0-9_]+$/.test(bot.username ?? "")) throw { safeCode: 0 };
        state.bot_username = bot.username;
        state.bot_url = `https://t.me/${bot.username}`;
        const webhook = await call("getWebhookInfo");
        if (webhook.url) throw { safeCode: "webhook" };
        unregisterSender();
        unregisterSender = registerTelegramSender(
          bot.id,
          () => state.connected,
          (chatId, text) => call("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true }, 10000),
        );
        state.last_received_at = getTelegramCheckpoint(bot.id).last_received_at;
        while (!signal.aborted) {
          const checkpoint = getTelegramCheckpoint(bot.id);
          const updates = await call("getUpdates", {
            offset: checkpoint.next_offset,
            timeout: 25,
            limit: 100,
            allowed_updates: ["message"],
          });
          state.connected = true;
          state.error = null;
          backoff = 2000;
          for (const update of updates) {
            if (signal.aborted) break;
            await processTelegramUpdate(bot.id, update, call, (fields) => Object.assign(state, fields));
          }
        }
      } catch (error) {
        if (signal.aborted) break;
        state.connected = false;
        state.error = telegramFailureMessage(error?.safeCode);
        await wait(backoff);
        backoff = Math.min(backoff * 2, 30000);
      }
    }
    state.connected = false;
  };
  // All failures are sanitized and retried inside run().
  void run();
  return () => {
    controller.abort();
    unregisterSender();
    state.connected = false;
  };
}
