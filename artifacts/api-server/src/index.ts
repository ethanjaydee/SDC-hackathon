import app from "./app";
import { logger } from "./lib/logger";
import { startTelegramReceiver } from "./telegramReceiver.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

let stopTelegram = () => {};
const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  stopTelegram = startTelegramReceiver();
});

const shutdown = () => {
  stopTelegram();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
