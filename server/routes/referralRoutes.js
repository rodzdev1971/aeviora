import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import User from "../models/users.js";
import Plan from "../models/membershipPlans.js";
import { ReferralAffiliate, BusinessAffiliate, ReferralSettings, ReferralRedemption, ReferralReward } from "../models/referrals.js";
import { affiliateEligible, ensureAffiliate, registerBusinessAffiliate, resolveReferral, referralOffer, rewardSummary, hasPaidMembership, ReferralError } from "../services/referrals.js";
import { defaultReferralTerms, referralCodeSchema, referralTermsSchema, businessAffiliateInput } from "../../shared/referrals.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();
const idSchema = z.string().uuid();
const offerSchema = z.strictObject({ code: referralCodeSchema, planId: z.string().regex(/^[a-f\d]{24}$/i) });
const adminTerms = referralTermsSchema.extend({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,32}$/).refine((code) => !code.startsWith("B2B-")) });
const pagination = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), search: z.string().trim().max(100).default("") });
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const audit = (req, action, targetId) => logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action, targetType: "Referral", targetId });
const safe = (handler) => async (req, res, next) => {
  try { await handler(req, res); }
  catch (error) {
    if (error instanceof ReferralError) return res.status(error.status).json({ message: error.message });
    if (error.code === 11000) return res.status(409).json({ message: "This referral code or payout reference is already used. Refresh and try again." });
    next(error);
  }
};
const termsOf = (affiliate) => ({ code: affiliate.code, discountPercent: affiliate.discountPercent, commissionPercent: affiliate.commissionPercent, commissionMode: affiliate.commissionMode });

router.get("/offer/:code", rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: true, legacyHeaders: false }), safe(async (req, res) => {
  const input = referralCodeSchema.safeParse(req.params.code);
  if (!input.success || !input.data) return res.status(400).json({ message: "Enter a valid referral code." });
  res.json({ offer: termsOf(await resolveReferral(input.data)) });
}));
router.use(requireAuth);
router.get("/me", safe(async (req, res) => {
  const user = await User.findById(req.user.id);
  const affiliate = await ReferralAffiliate.findOne({ userId: req.user.id }).lean();
  const rewards = affiliate ? await ReferralReward.find({ affiliateId: affiliate._id }).select("_id code method planName rewardCents reversedCents paidCents paymentAt paidAt").sort({ paymentAt: -1 }).lean() : [];
  const settings = await ReferralSettings.findById("default").lean() || defaultReferralTerms;
  res.json({ eligible: affiliateEligible(user), affiliate, defaults: settings, summary: rewardSummary(rewards), rewards: rewards.slice(0, 100) });
}));
router.post("/me", safe(async (req, res) => {
  const affiliate = await ensureAffiliate(await User.findById(req.user.id));
  await audit(req, "REFERRAL_AFFILIATE_CREATED", affiliate._id);
  res.json({ affiliate });
}));
router.get("/checkout", safe(async (req, res) => {
  const user = await User.findById(req.user.id).select("referralCode stripePaidInvoiceId stripePaidThrough zelle.payments");
  const redemption = await ReferralRedemption.findById(req.user.id).select("code firstPaymentId").lean();
  res.json({ code: redemption?.code || user?.referralCode || "", reserved: Boolean(redemption), used: Boolean(redemption?.firstPaymentId || (user && hasPaidMembership(user))) });
}));
router.post("/quote", safe(async (req, res) => {
  const input = offerSchema.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Choose a plan and a valid referral code." });
  const [user, plan] = await Promise.all([User.findById(req.user.id), Plan.findById(input.data.planId)]);
  if (!user || !plan) return res.status(404).json({ message: "Account or membership plan not found." });
  const offer = await referralOffer(user, input.data.code, plan);
  res.json({ offer: offer ? { ...termsOf(offer.redemption), priceCents: offer.priceCents, discountCents: offer.discountCents, totalCents: offer.totalCents } : null });
}));

router.use("/admin", requireRole("admin"));
router.get("/admin/businesses", safe(async (req, res) => {
  const input = pagination.safeParse(req.query);
  if (!input.success) return res.status(400).json({ message: "Use a valid page and search." });
  const { page, search } = input.data;
  const pattern = new RegExp(escape(search), "i");
  const filter = search ? { $or: ["businessName", "contactName", "email", "code"].map((field) => ({ [field]: pattern })) } : {};
  const [businesses, total] = await Promise.all([BusinessAffiliate.find(filter).sort({ businessName: 1, _id: 1 }).skip((page - 1) * 25).limit(25).lean(), BusinessAffiliate.countDocuments(filter)]);
  const rows = await Promise.all(businesses.map(async (business) => ({ ...business, summary: rewardSummary(await ReferralReward.find({ affiliateId: business._id }).select("rewardCents reversedCents paidCents").lean()) })));
  res.json({ businesses: rows, total, page, totalPages: Math.ceil(total / 25) });
}));
router.post("/admin/businesses", safe(async (req, res) => {
  const input = businessAffiliateInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Enter the business name, contact email and valid optional contact details." });
  const business = await registerBusinessAffiliate(input.data);
  await audit(req, "REFERRAL_AFFILIATE_CREATED", business._id);
  res.json({ business });
}));
router.patch("/admin/businesses/:id", safe(async (req, res) => {
  const input = businessAffiliateInput.extend({ ...referralTermsSchema.shape, code: z.string().trim().toUpperCase().regex(/^B2B-[A-Z0-9-]{4,28}$/) }).safeParse(req.body);
  if (!idSchema.safeParse(req.params.id).success || !input.success || (input.data.enabled && input.data.discountPercent <= 0)) return res.status(400).json({ message: "Review the business details, B2B code, discount and commission settings." });
  if (await ReferralAffiliate.exists({ code: input.data.code })) return res.status(409).json({ message: "This code is already assigned to a member affiliate." });
  const business = await BusinessAffiliate.findByIdAndUpdate(req.params.id, { $set: { ...input.data, nameKey: input.data.businessName.replace(/\s+/g, " ").toLowerCase() } }, { new: true, runValidators: true });
  if (!business) return res.status(404).json({ message: "Business affiliate not found." });
  await audit(req, "REFERRAL_AFFILIATE_UPDATED", business._id);
  res.json({ business });
}));
router.get("/admin/defaults", safe(async (req, res) => res.json({ defaults: await ReferralSettings.findById("default").lean() || defaultReferralTerms })));
router.put("/admin/defaults", safe(async (req, res) => {
  const input = referralTermsSchema.safeParse(req.body);
  if (!input.success || (input.data.enabled && input.data.discountPercent <= 0)) return res.status(400).json({ message: "Set a customer discount greater than zero before enabling referral coupons." });
  const defaults = await ReferralSettings.findByIdAndUpdate("default", { $set: input.data }, { upsert: true, new: true, runValidators: true });
  await audit(req, "REFERRAL_DEFAULTS_UPDATED", "default");
  res.json({ defaults });
}));
router.get("/admin/affiliates", safe(async (req, res) => {
  const input = pagination.safeParse(req.query);
  if (!input.success) return res.status(400).json({ message: "Use a valid page and search." });
  const { page, search } = input.data;
  let filter = {};
  if (search) {
    const pattern = new RegExp(escape(search), "i");
    const users = await User.find({ $or: [{ email: pattern }, { firstName: pattern }, { lastName: pattern }] }).select("_id").limit(100).lean();
    filter = { $or: [{ code: pattern }, { userId: { $in: users.map((user) => user._id) } }] };
  }
  const [affiliates, total] = await Promise.all([ReferralAffiliate.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(), ReferralAffiliate.countDocuments(filter)]);
  const users = await User.find({ _id: { $in: affiliates.map((affiliate) => affiliate.userId) } }).select("firstName lastName email accountStatus role stripePaidThrough stripePaidPrice zelle").lean();
  const rows = await Promise.all(affiliates.map(async (affiliate) => {
    const owner = users.find((user) => user._id === affiliate.userId);
    const rewards = await ReferralReward.find({ affiliateId: affiliate._id }).select("rewardCents reversedCents paidCents").lean();
    return { ...affiliate, owner: owner ? { firstName: owner.firstName, lastName: owner.lastName, email: owner.email } : null, eligible: affiliateEligible(owner), summary: rewardSummary(rewards) };
  }));
  res.json({ affiliates: rows, total, page, totalPages: Math.ceil(total / 25) });
}));
router.post("/admin/affiliates", safe(async (req, res) => {
  const input = z.strictObject({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Enter the member's account email." });
  const user = await User.findOne({ email: input.data.email });
  if (!user) return res.status(404).json({ message: "Member account not found." });
  const affiliate = await ensureAffiliate(user);
  await audit(req, "REFERRAL_AFFILIATE_CREATED", affiliate._id);
  res.json({ affiliate });
}));
router.patch("/admin/affiliates/:id", safe(async (req, res) => {
  const input = adminTerms.safeParse(req.body);
  if (!idSchema.safeParse(req.params.id).success || !input.success || (input.data.enabled && input.data.discountPercent <= 0)) return res.status(400).json({ message: "Provide a valid affiliate code, discount and commission settings." });
  const affiliate = await ReferralAffiliate.findByIdAndUpdate(req.params.id, { $set: input.data }, { new: true, runValidators: true });
  if (!affiliate) return res.status(404).json({ message: "Affiliate not found." });
  await audit(req, "REFERRAL_AFFILIATE_UPDATED", affiliate._id);
  res.json({ affiliate });
}));
router.get("/admin/rewards", safe(async (req, res) => {
  const input = pagination.extend({ affiliateId: idSchema.optional() }).safeParse(req.query);
  if (!input.success) return res.status(400).json({ message: "Use a valid affiliate and page." });
  const { affiliateId, page } = input.data;
  const filter = affiliateId ? { affiliateId } : {};
  const [rewards, total] = await Promise.all([ReferralReward.find(filter).sort({ paymentAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(), ReferralReward.countDocuments(filter)]);
  res.json({ rewards, total, page, totalPages: Math.ceil(total / 25) });
}));
router.post("/admin/rewards/:id/pay", safe(async (req, res) => {
  const input = z.strictObject({ amountCents: z.number().int().positive(), reference: z.string().trim().min(1).max(150) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Provide the displayed reward balance and payout reference." });
  const reward = await ReferralReward.findOneAndUpdate({ _id: req.params.id, paidCents: 0, voidReason: { $exists: false }, $expr: { $eq: [{ $subtract: ["$rewardCents", "$reversedCents"] }, input.data.amountCents] } }, { $set: { paidCents: input.data.amountCents, paidAt: new Date(), paidBy: req.user.id, payoutReference: input.data.reference } }, { new: true });
  if (!reward) return res.status(409).json({ message: "Reward already paid, reversed or changed. Refresh before recording a payout." });
  await audit(req, "REFERRAL_PAYOUT_RECORDED", reward._id);
  res.json({ message: "Payout recorded. No funds were transferred by this website." });
}));
router.post("/admin/rewards/:id/void", safe(async (req, res) => {
  const input = z.strictObject({ reason: z.string().trim().min(1).max(250) }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Provide a reason for reversing this reward." });
  const reward = await ReferralReward.findById(req.params.id);
  if (!reward) return res.status(404).json({ message: "Reward not found." });
  await ReferralReward.updateOne({ _id: reward._id }, { $max: { reversedCents: reward.rewardCents }, $set: { voidReason: input.data.reason } });
  await audit(req, "REFERRAL_REWARD_VOIDED", reward._id);
  res.json({ message: "Reward reversed. Any earlier payout remains in the ledger." });
}));
export default router;
