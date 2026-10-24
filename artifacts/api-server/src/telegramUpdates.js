import { analyzeConversation, getTelegramCheckpoint, ingestTelegramUpdate } from "./hub.js";

/** Telegram credentials live in URLs. Never let fetch errors or URLs escape. */
export function createTelegramCall(token, apiFetch = fetch, signal) {
  return async (method, body = {}, timeoutMs = 10000) => {
    try {
      const timeout = AbortSignal.timeout(timeoutMs);
      const response = await apiFetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      const payload = await response.json();
      if (!payload.ok) throw { safeCode: Number(payload.error_code) || 0 };
      return payload.result;
    } catch (error) {
      throw { safeCode: typeof error?.safeCode === "number" ? error.safeCode : 0 };
    }
  };
}

export function telegramFailureMessage(code) {
  if (code === 401 || code === 404) return "Telegram rejected the bot token. Update TELEGRAM_BOT_TOKEN securely and restart the API.";
  if (code === 409) return "This bot has another receiver or a webhook. Stop the other receiver before connecting here.";
  if (code === "webhook") return "An existing webhook is configured for this bot. It has not been changed or deleted.";
  if (code === 429) return "Telegram rate-limited the receiver. It will retry automatically.";
  return "Telegram could not be reached. The receiver will retry automatically.";
}

export async function processTelegramUpdate(botId, update, call, report) {
  const text = typeof update.message?.text === "string" ? update.message.text.trim() : "";
  const privateChat = update.message?.chat?.type === "private" &&
    Number.isSafeInteger(update.message.chat.id) && !update.message.from?.is_bot;
  // The SQLite transaction uniquely claims (bot_id, update_id) and saves the
  // transcript/cursor together. Duplicate webhook deliveries cannot add messages.
  const result = ingestTelegramUpdate(botId, update);
  let reply;
  if (result.imported) {
    report({ last_received_at: getTelegramCheckpoint(botId).last_received_at });
    let reviewed = true;
    try {
      await analyzeConversation(result.conversationId);
    } catch {
      reviewed = false;
      report({ error: "Message saved. AI review failed; open the conversation to retry analysis." });
    }
    if (privateChat) reply = reviewed
      ? `Received. Your request is in Dispatch Hub as conversation #${result.conversationId}; mock review is ready. Open Customer conversations and choose the newest Telegram chat. Nothing is dispatched automatically.`
      : `Received as conversation #${result.conversationId}. Open Customer conversations in Dispatch Hub to review the message and retry analysis. Nothing is dispatched automatically.`;
  } else if (!result.duplicate && privateChat && result.conversationId == null) {
    const command = text.match(/^\/([a-z0-9_]+)(?:@\w+)?(?:\s|$)/i)?.[1]?.toLowerCase();
    const replies = {
      start: "Welcome. Send a private text repair request here. It will appear in Dispatch Hub as a customer conversation for mock review; select a sample site before dispatching. Use /new before a separate request. Please use test data only.",
      help: "Send a private text repair request to add it to Dispatch Hub. Use /new before a separate request. Only private text is imported; photos and voice notes are not. Dispatch is never automatic.",
      new: "Ready for a separate request. Send its repair details in your next message. Your existing conversation and history are unchanged.",
    };
    reply = replies[command] ?? "Send a text repair request, or use /new to begin a separate request.";
  }
  if (reply) {
    try {
      await call("sendMessage", { chat_id: update.message.chat.id, text: reply, disable_web_page_preview: true });
    } catch (error) {
      report({ error: error?.safeCode === 403
        ? "Request saved, but Telegram could not send a bot reply. Open the bot and tap Start."
        : "Request saved, but Telegram could not send a confirmation." });
    }
  }
  return result;
}
