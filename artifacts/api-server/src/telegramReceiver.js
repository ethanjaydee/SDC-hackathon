import { analyzeConversation, getTelegramCheckpoint, ingestTelegramUpdate } from "./hub.js";

const state = {
  configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  connected: false,
  bot_username: null,
  bot_url: null,
  error: null,
  last_received_at: null,
};
export const getTelegramStatus = () => ({ ...state });

const failureMessage = (code) => code === 401 || code === 404
  ? "Telegram rejected the bot token. Update TELEGRAM_BOT_TOKEN securely and restart the API."
  : code === 409
    ? "This bot has another receiver or a webhook. Stop the other receiver before connecting here."
    : code === "webhook"
      ? "An existing webhook is configured for this bot. It has not been changed or deleted."
      : code === 429
        ? "Telegram rate-limited the receiver. It will retry automatically."
        : "Telegram could not be reached. The receiver will retry automatically.";

/** Never log request URLs/errors: Telegram embeds credentials in its API URL. */
export function startTelegramReceiver({ token = process.env.TELEGRAM_BOT_TOKEN, apiFetch = fetch } = {}) {
  if (!token) return () => {};
  if (process.env.TELEGRAM_RECEIVER_ENABLED === "false") {
    state.error = "Telegram receiving is disabled for this environment.";
    return () => {};
  }
  const controller = new AbortController();
  const signal = controller.signal;
  let backoff = 2000;
  const wait = (ms) => new Promise((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
  const call = async (method, body = {}) => {
    try {
      const response = await apiFetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.any([signal, AbortSignal.timeout(35000)]),
      });
      const payload = await response.json();
      if (!payload.ok) throw { safeCode: Number(payload.error_code) || 0 };
      return payload.result;
    } catch (error) {
      // Only a numeric, locally assigned code escapes this boundary.
      throw { safeCode: typeof error?.safeCode === "number" ? error.safeCode : 0 };
    }
  };
  const run = async () => {
    while (!signal.aborted) {
      try {
        const bot = await call("getMe");
        if (!bot.is_bot || !/^[A-Za-z0-9_]+$/.test(bot.username ?? "")) throw { safeCode: 0 };
        state.bot_username = bot.username;
        state.bot_url = `https://t.me/${bot.username}`;
        const webhook = await call("getWebhookInfo");
        if (webhook.url) throw { safeCode: "webhook" };
        state.last_received_at = getTelegramCheckpoint(bot.id).last_received_at;
        state.error = null;
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
            const result = ingestTelegramUpdate(bot.id, update);
            if (result.imported) {
              state.last_received_at = getTelegramCheckpoint(bot.id).last_received_at;
              try {
                await analyzeConversation(result.conversationId);
              } catch {
                state.error = "Message saved. Mock review failed; open the conversation to retry analysis.";
              }
            }
          }
        }
      } catch (error) {
        if (signal.aborted) break;
        state.connected = false;
        state.error = failureMessage(error?.safeCode);
        await wait(backoff);
        backoff = Math.min(backoff * 2, 30000);
      }
    }
    state.connected = false;
  };
  // All failures are sanitized and retried inside run().
  void run();
  return () => controller.abort();
}
