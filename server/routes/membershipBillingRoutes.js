import express from "express";
import Stripe from "stripe";
import { z } from "zod";
import User from "../models/users.js";
import Plan from "../models/membershipPlans.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendEmail, emailFailure } from "../services/email.js";
import { logAudit } from "../utils/auditLogger.js";
import { nextBillingDate, zelleRecipient } from "../../shared/zelle.js";

const router = express.Router();
router.use(requireAuth);
router.post("/zelle", async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.body?.planId || "")) return res.status(400).json({ message: "Choose a plan." });
  const plan = await Plan.findById(req.body.planId);
  if (!plan || plan.price <= 0) return res.status(400).json({ message: "Choose a paid plan for Zelle." });
  const account = await User.findById(req.user.id);
  if (account.stripeCustomerId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const [subscriptions, sessions] = await Promise.all([stripe.subscriptions.list({ customer: account.stripeCustomerId, status: "all", limit: 100 }), stripe.checkout.sessions.list({ customer: account.stripeCustomerId, status: "open", limit: 100 })]);
    if (subscriptions.data.some((item) => !["canceled", "incomplete_expired"].includes(item.status)) || sessions.data.some((item) => item.mode === "subscription")) return res.status(409).json({ message: "An existing Stripe subscription or checkout must be closed first." });
  }
  const user = await User.findOneAndUpdate({ _id: req.user.id, stripeSubscriptionId: null, "zelle.status": { $nin: ["pending", "active"] } }, { $set: { "zelle.status": "pending", "zelle.planId": plan._id, "zelle.name": plan.name, "zelle.price": plan.price, "zelle.dueAt": new Date() }, $unset: { "zelle.reminderAt": "" } }, { new: true });
  if (!user) return res.status(409).json({ message: "You already have a membership. Refresh the page." });
  res.json({ message: "Zelle membership selected. Send payment, then an administrator will confirm it." });
});
router.post("/zelle/cancel", async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $set: { "zelle.status": "canceled" } });
  res.json({ message: "Zelle membership canceled. No further reminders will be sent." });
});
router.use(requireRole("admin"));
router.get("/accounts", async (req, res) => {
  const users = await User.find({ $or: [{ "zelle.planId": { $exists: true } }, { stripeSubscriptionId: { $ne: null } }] }).select("firstName lastName email accountStatus zelle membershipName subscriptionStatus stripeSubscriptionId").sort({ firstName: 1 });
  res.json({ users });
});
router.post("/:id/confirm", async (req, res) => {
  const parsed = z.strictObject({ dueAt: z.iso.datetime(), reference: z.string().trim().min(1).max(150) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Provide the displayed billing period and bank payment reference." });
  const user = await User.findById(req.params.id);
  if (!user || user.accountStatus !== "active" || !["pending", "active"].includes(user.zelle?.status)) return res.status(409).json({ message: "Membership is not eligible for confirmation." });
  const start = new Date(parsed.data.dueAt), end = nextBillingDate(start);
  const result = await User.updateOne({ _id: user._id, accountStatus: "active", "zelle.status": { $in: ["pending", "active"] }, "zelle.dueAt": start, "zelle.payments.reference": { $ne: parsed.data.reference } }, { $set: { "zelle.status": "active", "zelle.dueAt": end }, $push: { "zelle.payments": { periodStart: start, periodEnd: end, amount: user.zelle.price, reference: parsed.data.reference, confirmedBy: req.user.id, confirmedAt: new Date() } } });
  if (!result.modifiedCount) return res.status(409).json({ message: "Period already confirmed, reference reused, or membership changed. Refresh." });
  await logAudit({ req, actorId: req.user.id, actorRole: "admin", action: "ZELLE_PAYMENT_CONFIRMED", targetType: "User", targetId: user._id });
  res.json({ message: "Monthly payment confirmed." });
});
router.post("/:id/cancel", async (req, res) => {
  await User.updateOne({ _id: req.params.id }, { $set: { "zelle.status": "canceled" } });
  res.json({ message: "Zelle membership canceled." });
});
router.post("/:id/remind", async (req, res) => {
  // Re-read membership and payment state for every recipient, never trust a browser list.
  const user = await User.findById(req.params.id);
  if (!user || user.accountStatus !== "active") return res.json({ outcome: "skipped" });
  let text, filter;
  const now = new Date(), cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (user.zelle?.status === "active") {
    if (!user.zelle.dueAt || user.zelle.dueAt > now) return res.json({ outcome: "skipped" });
    filter = { "zelle.status": "active", "zelle.dueAt": { $lte: now } };
    text = `Your ${user.zelle.name} membership payment of $${user.zelle.price.toFixed(2)} was due ${user.zelle.dueAt.toISOString().slice(0, 10)}. Send Zelle to ${zelleRecipient.phone}, ${zelleRecipient.name}. If you recently paid, contact us so we can confirm your payment.`;
  } else if (user.stripeSubscriptionId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, { expand: ["latest_invoice"] });
    await User.updateOne({ _id: user._id, stripeSubscriptionId: subscription.id }, { $set: { subscriptionStatus: subscription.status } });
    const invoice = subscription.latest_invoice;
    if (!["active", "past_due"].includes(subscription.status) || subscription.cancel_at_period_end || subscription.cancel_at || !invoice || invoice.status !== "open" || invoice.amount_remaining <= 0 || (invoice.due_date && invoice.due_date * 1000 > now.getTime())) return res.json({ outcome: "skipped" });
    filter = { stripeSubscriptionId: subscription.id, subscriptionStatus: { $in: ["active", "past_due"] } };
    text = `Your Aeviora membership has an unpaid invoice. Please sign in to Aeviora Wellness and open Manage current membership to review your balance and payment method.`;
  } else return res.json({ outcome: "skipped" });
  const claimed = await User.findOneAndUpdate({ _id: user._id, accountStatus: "active", ...filter, $or: [{ paymentReminderAt: { $exists: false } }, { paymentReminderAt: { $lt: cutoff } }] }, { $set: { paymentReminderAt: now } });
  if (!claimed) return res.json({ outcome: "skipped" });
  try { await sendEmail({ to: user.email, subject: "Aeviora membership payment reminder", text }); }
  catch (error) { console.warn("Payment reminder:", emailFailure(error)); return res.json({ outcome: "failed" }); }
  await logAudit({ req, actorId: req.user.id, actorRole: "admin", action: "PAYMENT_REMINDER_SENT", targetType: "User", targetId: user._id });
  res.json({ outcome: "sent" });
});
export default router;
