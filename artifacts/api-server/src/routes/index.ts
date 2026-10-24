import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hubRouter from "../hub.js";
import { ensureTelegramWebhookReady, getTelegramStatus, receiveTelegramWebhook } from "../telegramReceiver.js";

const router: IRouter = Router();

router.use(healthRouter);
router.get("/messaging/telegram", async (_req, res) => {
  try { await ensureTelegramWebhookReady(); } catch { /* Sanitized setup error is in the status. */ }
  res.set("Cache-Control", "no-store");
  res.json(getTelegramStatus());
});
router.post("/messaging/telegram/webhook", async (req, res) => {
  const result = await receiveTelegramWebhook(req.body, req.get("X-Telegram-Bot-Api-Secret-Token"));
  res.set("Cache-Control", "no-store");
  res.status(result.status).json(result.body);
});
router.post("/conversations/:id/reply", async (_req, res, next) => {
  try {
    await ensureTelegramWebhookReady();
    next();
  } catch {
    res.status(503).json({ error: "Telegram is reconnecting. Wait for it to show as connected, then send again." });
  }
});
router.use(hubRouter);

export default router;
