import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hubRouter from "../hub.js";
import { getTelegramStatus } from "../telegramReceiver.js";

const router: IRouter = Router();

router.use(healthRouter);
router.get("/messaging/telegram", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(getTelegramStatus());
});
router.use(hubRouter);

export default router;
