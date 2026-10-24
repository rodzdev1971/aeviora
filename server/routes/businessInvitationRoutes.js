import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import BusinessInvitation from "../models/businessInvitation.js";
import { businessAffiliateInput } from "../../shared/referrals.js";
import { issueBusinessInvitation, checkBusinessInvitation, completeBusinessInvitation, invitationTerms } from "../services/businessInvitations.js";
import { ReferralError } from "../services/referrals.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();
const token = z.string().trim().regex(/^[a-f0-9]{64}$/i);
const safe = (handler) => async (req, res, next) => {
  try { await handler(req, res); }
  catch (error) {
    if (error instanceof ReferralError) return res.status(error.status).json({ message: error.message });
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Review the invitation code and business contact details." });
    next(error);
  }
};
const audit = (req, action, id) => logAudit({ req, actorId: req.user?.id, actorRole: req.user?.role || "system", action, targetType: "BusinessInvitation", targetId: id });
router.use(rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: true, legacyHeaders: false }));
router.post("/check", safe(async (req, res) => {
  const input = z.strictObject({ code: token }).parse(req.body);
  const item = await checkBusinessInvitation(input.code);
  res.json({ invitation: { businessName: item.businessName, email: item.email, expiresAt: item.expiresAt, ...invitationTerms(item) } });
}));
router.post("/register", safe(async (req, res) => {
  const input = z.strictObject({ code: token, details: businessAffiliateInput.omit({ email: true }).extend({ contactName: z.string().trim().min(1).max(120) }) }).parse(req.body);
  const { invitationId, business } = await completeBusinessInvitation(input.code, input.details);
  await audit(req, "BUSINESS_INVITATION_COMPLETED", invitationId);
  res.json({ business: { businessName: business.businessName, kind: "business", code: business.code, ...invitationTerms(business) } });
}));
router.use("/admin", requireAuth, requireRole("admin"));
router.get("/admin", safe(async (req, res) => {
  const page = z.coerce.number().int().min(1).max(100000).default(1).parse(req.query.page);
  const [invitations, total] = await Promise.all([BusinessInvitation.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(), BusinessInvitation.countDocuments()]);
  res.json({ invitations, totalPages: Math.ceil(total / 20) });
}));
router.post("/admin", rateLimit({ windowMs: 3600000, limit: 10, standardHeaders: true, legacyHeaders: false }), safe(async (req, res) => {
  const input = businessAffiliateInput.pick({ businessName: true, email: true }).parse(req.body);
  const result = await issueBusinessInvitation(input, { adminId: req.user.id });
  await audit(req, "BUSINESS_INVITATION_CREATED", result.id);
  res.status(201).json(result);
}));
router.post("/admin/:id/revoke", safe(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const item = await BusinessInvitation.findOneAndUpdate({ _id: id, status: "pending" }, { $set: { status: "revoked" } }, { new: true });
  if (!item) return res.status(409).json({ message: "This invitation has already been used or revoked. Reload the list." });
  await audit(req, "BUSINESS_INVITATION_REVOKED", id);
  res.json({ message: "Invitation revoked." });
}));
export default router;
