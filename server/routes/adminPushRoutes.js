import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { pushConfiguration, pushRepository, pushSubscriptionInput, notifyNewSignup } from "../services/adminPush.js";

export function createAdminPushRouter({ authenticate = requireAuth, authorize = requireRole("admin"), repository = pushRepository, env = process.env, audit = logAudit, notify = notifyNewSignup } = {}) {
  const router = express.Router();
  router.use(authenticate, authorize);
  router.get("/config", (req, res) => { const { configured, publicKey } = pushConfiguration(env); res.json({ configured, publicKey }); });
  router.post("/status", async (req, res) => {
    const input = z.strictObject({ endpoint: z.string().max(2048) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Use a valid browser subscription." });
    const config = pushConfiguration(env);
    res.json({ enabled: config.configured && Boolean(await repository.has(req.user.id, input.data.endpoint, config.publicKey)) });
  });
  router.post("/subscriptions", async (req, res) => {
    const config = pushConfiguration(env);
    if (!config.configured) return res.status(503).json({ message: "Browser push is not configured on the server yet." });
    const input = pushSubscriptionInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Use a valid subscription from a supported browser." });
    await repository.save(req.user.id, input.data, config.publicKey);
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "ADMIN_PUSH_ENABLED", targetType: "AdminPushSubscription" });
    res.status(201).json({ message: "Browser push enabled for this browser." });
  });
  router.delete("/subscriptions", async (req, res) => {
    const input = z.strictObject({ endpoint: z.string().max(2048) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Choose the browser subscription to disable." });
    await repository.remove(req.user.id, input.data.endpoint);
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "ADMIN_PUSH_DISABLED", targetType: "AdminPushSubscription" });
    res.json({ message: "Browser push disabled for this browser." });
  });
  router.post("/test", async (req, res) => {
    const result = await notify({ env, repository, userId: req.user.id, test: true });
    if (!result.sent) return res.status(409).json({ message: "No test notification was accepted. Check server setup and enable notifications for this browser again." });
    res.json({ message: "Test notification sent to your enabled browsers." });
  });
  return router;
}
export default createAdminPushRouter();
