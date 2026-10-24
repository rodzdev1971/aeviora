import express from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { BusinessAffiliate, ReferralReward, ReferralRedemption } from "../models/referrals.js";
import { requestBusinessLogin, consumeBusinessLogin, businessCookieOptions, businessSessionCookie, businessSessionAudience, portalBusinessDetails, portalRewardDetails } from "../services/businessPortal.js";
import { logAudit } from "../utils/auditLogger.js";

export function createBusinessPortalRouter({ businesses = BusinessAffiliate, rewards = ReferralReward, redemptions = ReferralRedemption, requestLogin = requestBusinessLogin, consumeLogin = consumeBusinessLogin } = {}) {
  const router = express.Router();
  const safe = (handler) => async (req, res, next) => {
    try { await handler(req, res); }
    catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ message: "Review the email, sign-in code or page selection." }); next(error); }
  };
  const loginLimit = rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { message: "Too many sign-in attempts. Try again in 15 minutes." } });
  router.post("/request-login", loginLimit, safe(async (req, res) => {
    const input = z.strictObject({ email: z.string().trim().toLowerCase().email().max(254) }).parse(req.body);
    await requestLogin(input.email);
    res.json({ message: "If a registered business uses this email, a sign-in link will be sent. Check your inbox and spam folder. Wait one minute before requesting another link." });
  }));
  router.post("/login", loginLimit, safe(async (req, res) => {
    const input = z.strictObject({ token: z.string().trim().regex(/^[a-f0-9]{64}$/i) }).parse(req.body);
    // Validate signing configuration before consuming a single-use link.
    if (!process.env.JWT_ACCESS_SECRET) return res.status(503).json({ message: "Business sign-in is temporarily unavailable." });
    const business = await consumeLogin(input.token);
    if (!business) return res.status(401).json({ message: "This sign-in link is invalid, expired or already used. Request a new link." });
    const token = jwt.sign({ email: business.email, sessionVersion: business.portalSessionVersion || 0 }, process.env.JWT_ACCESS_SECRET, { algorithm: "HS256", subject: String(business._id), audience: businessSessionAudience, expiresIn: "1h" });
    res.cookie(businessSessionCookie, token, { ...businessCookieOptions(), maxAge: 3600000 });
    await logAudit({ req, action: "BUSINESS_PORTAL_LOGIN", targetType: "BusinessAffiliate", targetId: String(business._id) });
    res.json({ message: "Business sign-in successful." });
  }));
  router.use(async (req, res, next) => {
    try {
      const decoded = jwt.verify(req.cookies?.[businessSessionCookie] || "", process.env.JWT_ACCESS_SECRET, { algorithms: ["HS256"], audience: businessSessionAudience });
      if (typeof decoded.sub !== "string" || typeof decoded.email !== "string") throw new Error("Invalid session");
      const anchor = await businesses.findOne({ _id: decoded.sub, email: decoded.email }).select("+portalSessionVersion");
      if (!anchor || (anchor.portalSessionVersion || 0) !== decoded.sessionVersion) throw new Error("Invalid session");
      req.businessSession = { anchorId: anchor._id, email: anchor.email }; next();
    } catch {
      res.clearCookie(businessSessionCookie, businessCookieOptions());
      res.status(401).json({ message: "Sign in to your business affiliate portal." });
    }
  });
  router.post("/logout", safe(async (req, res) => {
    await businesses.updateOne({ _id: req.businessSession.anchorId, email: req.businessSession.email }, { $inc: { portalSessionVersion: 1 }, $unset: { portalLoginTokenHash: "", portalLoginEmail: "", portalLoginExpiresAt: "" } });
    res.clearCookie(businessSessionCookie, businessCookieOptions());
    res.json({ message: "Signed out." });
  }));
  router.get("/me", safe(async (req, res) => {
    const input = z.object({ businessId: z.string().uuid().optional(), page: z.coerce.number().int().min(1).max(100000).default(1) }).parse(req.query);
    const business = await businesses.findOne({ email: req.businessSession.email, ...(input.businessId ? { _id: input.businessId } : { _id: req.businessSession.anchorId }) });
    if (!business) return res.status(404).json({ message: "Business record not found." });
    const filter = { affiliateId: String(business._id) };
    const [choices, activity, total, totals, referredCheckouts] = await Promise.all([
      businesses.find({ email: req.businessSession.email }).select("_id businessName").sort({ businessName: 1 }).lean(),
      rewards.find(filter).select("code method planName baseCents rewardCents reversedCents paidCents paymentAt paidAt payoutReference -_id").sort({ paymentAt: -1, _id: -1 }).skip((input.page - 1) * 25).limit(25).lean(),
      rewards.countDocuments(filter),
      rewards.aggregate([{ $match: filter }, { $group: { _id: null, earnedCents: { $sum: "$rewardCents" }, reversedCents: { $sum: "$reversedCents" }, paidCents: { $sum: "$paidCents" } } }]),
      redemptions.countDocuments(filter),
    ]);
    const summary = { earnedCents: totals[0]?.earnedCents || 0, reversedCents: totals[0]?.reversedCents || 0, paidCents: totals[0]?.paidCents || 0 };
    summary.balanceCents = summary.earnedCents - summary.reversedCents - summary.paidCents;
    res.json({ business: portalBusinessDetails(business), businesses: choices.map((item) => ({ _id: item._id, businessName: item.businessName })), summary, referredCheckouts, rewards: activity.map(portalRewardDetails), total, page: input.page, totalPages: Math.ceil(total / 25) });
  }));
  return router;
}
export default createBusinessPortalRouter();
