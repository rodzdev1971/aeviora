import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { subscriberMetrics, subscriberDetails, metricsRepository } from "../services/adminMetrics.js";

const daysInput = z.coerce.number().refine((value) => [1, 7, 30, 90].includes(value)).default(7);
export function createAdminMetricsRouter({ authenticate = requireAuth, authorize = requireRole("admin"), repository = metricsRepository, now = () => new Date(), audit = logAudit } = {}) {
  const router = express.Router();
  router.use(authenticate, authorize);
  function query(req) { const value = { ...req.query }; delete value.path; return value; }
  async function record(req, details) {
    await audit({ req, actorId: req.user.id, actorRole: req.user.role, action: "ADMIN_METRICS_VIEWED", targetType: details ? "SubscriberDetails" : "SubscriberMetrics" });
  }
  router.get("/", async (req, res) => {
    const input = z.strictObject({ days: daysInput }).safeParse(query(req));
    if (!input.success) return res.status(400).json({ message: "Choose a signup period of 1, 7, 30 or 90 days." });
    const result = await subscriberMetrics({ ...input.data, repository, now: now() });
    await record(req, false);
    res.json(result);
  });
  router.get("/accounts", async (req, res) => {
    const input = z.strictObject({ view: z.enum(["subscribers", "signups"]), days: daysInput,
      plan: z.string().regex(/^(free|legacy-paid|[a-f\d]{24})$/i).optional(),
      verification: z.enum(["all", "verified", "unverified", "pending", "not_verified", "legacy"]).default("all"),
      page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
    }).safeParse(query(req));
    if (!input.success) return res.status(400).json({ message: "Choose valid subscriber filters and a page size up to 100." });
    const result = await subscriberDetails({ ...input.data, repository, now: now() });
    await record(req, true);
    res.json(result);
  });
  return router;
}
export default createAdminMetricsRouter();
