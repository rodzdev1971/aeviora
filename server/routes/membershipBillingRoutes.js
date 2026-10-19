import express from "express";
import Stripe from "stripe";
import { z } from "zod";
import User from "../models/users.js";
import Plan from "../models/membershipPlans.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendEmail, emailFailure } from "../services/email.js";
import { logAudit } from "../utils/auditLogger.js";
import { nextBillingDate, zelleRecipient } from "../../shared/zelle.js";
import { syncMembership } from "../services/syncMembership.js";
import { zelleBalance, zelleAmountDueCents, invoiceSubscription, validateZelleInvoice } from "../services/billingSummary.js";
import { referralOffer, recordZelleReferrals, ReferralError, assertNoPriorStripeMembership } from "../services/referrals.js";
import { referralCodeSchema } from "../../shared/referrals.js";
import ManualPayment from "../models/manualMembershipPayment.js";
import { zellePaidThrough } from "../services/membershipPeriods.js";
import { planChangeBlocked, planChangeMessage } from "../services/planChangePolicy.js";

const router = express.Router();
router.use(requireAuth);
async function selectZelle(req, res, accountId) {
  if (!/^[a-f\d]{24}$/i.test(req.body?.planId || "")) return res.status(400).json({ message: "Choose a plan." });
  const plan = await Plan.findById(req.body.planId);
  if (!plan || plan.price <= 0) return res.status(400).json({ message: "Choose a paid plan for Zelle." });
  const account = await User.findById(accountId);
  if (!account) return res.status(404).json({ message: "Account not found." });
  if (planChangeBlocked(account) && String(plan._id) !== account.lastMembershipChangePlanId) return res.status(409).json({ message: planChangeMessage(account) });
  if (account.accountStatus !== "active") return res.status(409).json({ message: "Activate this account before assigning a membership." });
  if (account.zelle?.status === "canceled" && zellePaidThrough(account.zelle) > new Date()) return res.status(409).json({ message: "This membership is still paid. Ask an administrator to reactivate renewal without replacing the paid period." });
  if (account.stripeCustomerId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const [subscriptions, sessions] = await Promise.all([stripe.subscriptions.list({ customer: account.stripeCustomerId, status: "all", limit: 100 }), stripe.checkout.sessions.list({ customer: account.stripeCustomerId, status: "open", limit: 100 })]);
    if (subscriptions.data.some((item) => !["canceled", "incomplete_expired"].includes(item.status)) || sessions.data.some((item) => item.mode === "subscription")) return res.status(409).json({ message: "An existing Stripe subscription or checkout must be closed first." });
    await syncMembership(account, stripe, User);
  }
  const input = referralCodeSchema.safeParse(req.body.referralCode ?? account.referralCode ?? "");
  if (!input.success) return res.status(400).json({ message: "Enter a valid referral code." });
  let referral;
  try {
    if (input.data && account.stripeCustomerId) await assertNoPriorStripeMembership(account, new Stripe(process.env.STRIPE_SECRET_KEY));
    referral = await referralOffer(account, input.data, plan, { reserve: true });
  }
  catch (error) { if (error instanceof ReferralError) return res.status(error.status).json({ message: error.message }); throw error; }
  if (referral && req.body.expectedReferralTotalCents !== referral.totalCents) return res.status(409).json({ message: "The referral discount changed. Apply the code again to review the current total." });
  const user = await User.findOneAndUpdate({ _id: accountId, accountStatus: "active", stripeSubscriptionId: null, "zelle.status": { $nin: ["pending", "active"] } }, { $set: { ...(referral ? { referralCode: referral.redemption.code } : {}), "zelle.status": "pending", "zelle.planId": plan._id, "zelle.name": plan.name, "zelle.price": plan.price, "zelle.referralDiscountCents": referral?.discountCents || 0, "zelle.dueAt": new Date() }, $unset: { "zelle.reminderAt": "" } }, { new: true });
  if (!user) return res.status(409).json({ message: "You already have a membership. Refresh the page." });
  res.json({ message: "Zelle membership selected. Send payment, then an administrator will confirm it.", amountDueCents: referral?.totalCents ?? Math.round(plan.price * 100) });
}
router.post("/zelle", (req, res) => selectZelle(req, res, req.user.id));
router.post("/zelle/cancel", (req, res) => {
  res.status(403).json({ message: "Zelle memberships are managed by an administrator. Contact our team for assistance." });
});
router.use(requireRole("admin"));
router.get("/plans", async (req, res) => {
  const plans = await Plan.find({ price: { $gt: 0 } }).select("name price").sort({ price: 1 });
  res.json({ plans });
});
router.post("/:id/zelle", async (req, res) => {
  await selectZelle(req, res, req.params.id);
  if (res.statusCode === 200) await logAudit({ req, actorId: req.user.id, actorRole: "admin", action: "ADMIN_ZELLE_MEMBERSHIP_SELECTED", targetType: "User", targetId: req.params.id });
});
router.get("/accounts", async (req, res) => {
  const users = await User.find({}).select("firstName lastName email phone accountStatus zelle membershipName subscriptionStatus stripeSubscriptionId stripeCustomerId upgradeQuote").sort({ firstName: 1 });
  res.json({ users: users.map((user) => ({ ...user.toObject(), zellePaidThrough: zellePaidThrough(user.zelle), zelleBalance: zelleBalance(user.zelle) })) });
});
router.get("/:id/details", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Account not found." });
  try {
    const manual = await ManualPayment.find({ userId: user._id });
    const invoices = [], balances = {};
    if (user.stripeCustomerId) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      for await (const invoice of stripe.invoices.list({ customer: user.stripeCustomerId, limit: 100 })) {
        if (!invoiceSubscription(invoice)) continue;
        const receipt = manual.find((payment) => payment.invoiceId === invoice.id);
        if (["open", "uncollectible"].includes(invoice.status)) balances[invoice.currency] = (balances[invoice.currency] || 0) + invoice.amount_remaining;
        invoices.push({ id: invoice.id, number: invoice.number, status: invoice.status, currency: invoice.currency, amountRemaining: invoice.amount_remaining, amountPaid: invoice.amount_paid, periodStart: invoice.period_start, periodEnd: invoice.period_end, method: receipt?.status === "confirmed" ? "Zelle" : invoice.status === "paid" ? "Stripe / credits or external payment" : "Unpaid", reference: receipt?.reference, pending: receipt?.status === "pending", amountCents: receipt?.amountCents });
      }
    }
    res.json({ invoices, balances, zelleBalance: zelleBalance(user.zelle) });
  } catch { res.status(502).json({ message: "Unable to verify Stripe balances. Balance is unknown; try again shortly." }); }
});
router.post("/:id/confirm-invoice", async (req, res) => {
  const parsed = z.strictObject({ invoiceId: z.string().regex(/^in_[a-zA-Z0-9]+$/), reference: z.string().trim().min(1).max(150), amountCents: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Provide the invoice, displayed balance, and bank reference." });
  const user = await User.findById(req.params.id);
  if (!user || user.accountStatus !== "active") return res.status(409).json({ message: "An active account is required." });
  const { invoiceId, reference, amountCents } = parsed.data;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let receipt = await ManualPayment.findOne({ invoiceId });
    if (receipt && (receipt.userId !== user._id || receipt.reference !== reference || receipt.amountCents !== amountCents)) return res.status(409).json({ message: "This invoice already has a different payment record." });
    if (receipt?.status === "confirmed") return res.json({ message: "This Zelle payment was already recorded." });
    if (!receipt) {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      try { validateZelleInvoice(invoice, user, amountCents); }
      catch (error) { return res.status(409).json({ message: error.message }); }
      if (await User.exists({ "zelle.payments.reference": reference })) return res.status(409).json({ message: "This bank reference has already been used." });
      receipt = await ManualPayment.create({ userId: user._id, invoiceId, reference, amountCents, confirmedBy: req.user.id });
    }
    const latest = await stripe.invoices.retrieve(invoiceId);
    if (latest.status !== "paid") {
      try { validateZelleInvoice(latest, user, amountCents); }
      catch (error) { return res.status(409).json({ message: error.message }); }
    }
    // Persist the intent first and reuse a stable Stripe key after network/database failures.
    const paid = await stripe.invoices.pay(invoiceId, { paid_out_of_band: true }, { idempotencyKey: `aeviora-zelle-${receipt._id}` });
    if (paid.status !== "paid") throw new Error("Invoice not settled");
    await ManualPayment.updateOne({ _id: receipt._id }, { $set: { status: "confirmed", confirmedAt: new Date() } });
    await syncMembership(user, stripe, User);
    await logAudit({ req, actorId: req.user.id, actorRole: "admin", action: "ZELLE_INVOICE_PAYMENT_CONFIRMED", targetType: "StripeInvoice", targetId: invoiceId });
    res.json({ message: "Zelle payment recorded and Stripe invoice marked paid. Future card billing is unchanged." });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 502).json({ message: error.code === 11000 ? "Invoice or bank reference already recorded. Refresh payments." : "Confirmation could not finish. Refresh and retry the same reference; do not enter a second payment." });
  }
});
router.post("/:id/confirm", async (req, res) => {
  const parsed = z.strictObject({ dueAt: z.iso.datetime(), reference: z.string().trim().min(1).max(150) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Provide the displayed billing period and bank payment reference." });
  const user = await User.findById(req.params.id);
  if (!user || user.accountStatus !== "active" || !["pending", "active"].includes(user.zelle?.status)) return res.status(409).json({ message: "Membership is not eligible for confirmation." });
  const due = new Date(parsed.data.dueAt);
  // A retry after the receipt was saved can safely finish referral accounting.
  if (user.zelle.payments?.some((payment) => payment.reference === parsed.data.reference)) {
    if (!user.referralCode) return res.status(409).json({ message: "Period already confirmed, reference reused, or membership changed. Refresh." });
    await recordZelleReferrals(user);
    return res.json({ message: "This Zelle payment was already recorded." });
  }
  const start = new Date(Math.max(due.getTime(), Date.now())), end = nextBillingDate(start);
  const result = await User.updateOne({ _id: user._id, accountStatus: "active", "zelle.status": { $in: ["pending", "active"] }, "zelle.dueAt": due, "zelle.payments.reference": { $ne: parsed.data.reference } }, { $set: { "zelle.status": "active", "zelle.dueAt": end }, $push: { "zelle.payments": { periodStart: start, periodEnd: end, amount: zelleAmountDueCents(user.zelle) / 100, reference: parsed.data.reference, confirmedBy: req.user.id, confirmedAt: new Date() } } });
  if (!result.modifiedCount) return res.status(409).json({ message: "Period already confirmed, reference reused, or membership changed. Refresh." });
  if (user.referralCode) await recordZelleReferrals(await User.findById(user._id));
  await logAudit({ req, actorId: req.user.id, actorRole: "admin", action: "ZELLE_PAYMENT_CONFIRMED", targetType: "User", targetId: user._id });
  res.json({ message: "Monthly payment confirmed." });
});
router.post("/:id/cancel", async (req, res) => {
  await User.updateOne({ _id: req.params.id }, { $set: { "zelle.status": "canceled" } });
  res.json({ message: "Zelle renewal canceled. Confirmed paid access continues until the paid period ends." });
});
router.post("/:id/reactivate", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.accountStatus !== "active" || user.zelle?.status !== "canceled" || !user.zelle.planId) return res.status(409).json({ message: "No canceled Zelle membership to reactivate." });
  if (user.stripeSubscriptionId) return res.status(409).json({ message: "Manage the existing Stripe membership first." });
  const now = new Date(), paidThrough = zellePaidThrough(user.zelle);
  const stillPaid = paidThrough > now;
  const result = await User.updateOne({ _id: user._id, accountStatus: "active", stripeSubscriptionId: null, "zelle.status": "canceled", "zelle.dueAt": user.zelle.dueAt }, { $set: { "zelle.status": stillPaid ? "active" : "pending", "zelle.dueAt": stillPaid ? paidThrough : now }, $unset: { paymentReminderAt: "", "zelle.reminderAt": "" } });
  if (!result.modifiedCount) return res.status(409).json({ message: "Membership changed. Refresh and try again." });
  await logAudit({ req, actorId: req.user.id, actorRole: "admin", action: "ZELLE_MEMBERSHIP_REACTIVATED", targetType: "User", targetId: user._id });
  res.json({ message: stillPaid ? "Renewal reactivated. The current period remains paid; the next payment is due at the end of that period." : "Membership reactivated pending a new verified Zelle payment." });
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
    text = `Your ${user.zelle.name} membership payment of $${(zelleAmountDueCents(user.zelle) / 100).toFixed(2)} was due ${user.zelle.dueAt.toISOString().slice(0, 10)}. Send Zelle to ${zelleRecipient.phone}, ${zelleRecipient.name}. If you recently paid, contact us so we can confirm your payment.`;
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
