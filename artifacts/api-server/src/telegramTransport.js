let activeSender = null;

export class TelegramDeliveryError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "TelegramDeliveryError";
    this.status = status;
  }
}

export function registerTelegramSender(botId, isConnected, send) {
  const registration = { botId: String(botId), isConnected, send };
  activeSender = registration;
  return () => {
    if (activeSender === registration) activeSender = null;
  };
}

export async function sendTelegramMessage(botId, chatId, text) {
  if (!activeSender || activeSender.botId !== String(botId) || !activeSender.isConnected()) {
    throw new TelegramDeliveryError(503, "Telegram is reconnecting. Wait for it to show as connected, then send again.");
  }
  try {
    return await activeSender.send(chatId, text);
  } catch (error) {
    const code = error?.safeCode;
    if (code === 403) {
      throw new TelegramDeliveryError(409, "Telegram cannot deliver to this chat. Ask the customer to open the bot and send /start.");
    }
    if (code === 400) {
      throw new TelegramDeliveryError(400, "Telegram rejected this reply. Edit the text and try again.");
    }
    if (code === 429) {
      throw new TelegramDeliveryError(429, "Telegram rate-limited this reply. Wait briefly before trying again.");
    }
    if (code === 401 || code === 404) {
      throw new TelegramDeliveryError(503, "Telegram rejected the bot credentials. Check the bot configuration.");
    }
    throw new TelegramDeliveryError(504, "Telegram could not confirm delivery. Check the customer chat before retrying.");
  }
}
