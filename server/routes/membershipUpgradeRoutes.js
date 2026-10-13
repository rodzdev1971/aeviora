import express from "express";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import User from "../models/users.js";
import Plan from "../models/membershipPlans.js";
import { requireAuth } from "../middleware/auth.js";
import { memberStatus } from "../services/memberStatus.js";
import { syncMembership } from "../services/syncMembership.js";
import { nextBillingDate } from "../../shared/zelle.js";
import { logAudit } from "../utils/auditLogger.js";
import { upgradePricing } from "../services/upgradePricing.js";
import { planChangeBlocked, planChangeFilter, planChangeMessage } from "../services/planChangePolicy.js";
import { upgradeFailure, upgradeDiagnostics } from "../services/upgradeErrors.js";

const router = express.Router();
router.use(requireAuth);
router.use((req, res, next) => { res.locals.upgradeStage = "validate_request"; next(); });
function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) throw Object.assign(new Error("Stripe configuration missing"), { code: "STRIPE_CONFIG" });
  return new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 1 });
}
router.post("/preview", async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.body?.planId || "")) return res.status(400).json({ message: "Choose an upgrade plan." });
  let user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "Account not found." });
  const plan = await Plan.findById(req.body.planId);
  if (!plan) return res.status(404).json({ message: "Plan not found." });
  res.locals.upgradeStage = "sync_membership";
  const stripe = user.stripeCustomerId && !["pending", "active"].includes(user.zelle?.status) ? stripeClient() : null;
  if (stripe) user = await syncMembership(user, stripe, User);
  if (planChangeBlocked(user)) return res.status(409).json({ message: planChangeMessage(user) });
  const state = memberStatus(user);
  if (!state.subscribed || !(plan.price > state.current.price)) return res.status(409).json({ message: "Upgrades require a paid, unexpired membership and a higher-priced plan." });
  if (user.upgradeQuote?.state === "executing") return res.status(409).json({ message: "An upgrade payment is being processed. Refresh or contact support before creating another." });
  const now = new Date();
  const quote = { id: randomUUID(), planId: plan._id, name: plan.name, price: plan.price, method: state.current.paymentMethod, quotedAt: now, expiresAt: new Date(now.getTime() + 15 * 60000), sourceEnd: state.current.paidThrough, sourcePlanId: String(state.current.planId), state: "quoted" };
  quote.sourcePrice = state.current.price;
  quote.remainingDays = (new Date(quote.sourceEnd) - now) / 86400000;
  quote.periodDays = 30;
  if (quote.method === "stripe") {
    res.locals.upgradeStage = "retrieve_subscription";
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, { expand: ["latest_invoice"] });
    if (subscription.status !== "active" || subscription.latest_invoice?.status !== "paid" || subscription.pending_update || subscription.cancel_at_period_end || subscription.items?.data?.length !== 1) return res.status(409).json({ message: "Reactivate renewal and resolve outstanding invoices before upgrading." });
    if (subscription.schedule) return res.status(409).json({ message: "This membership has a scheduled billing change. Contact support to finish that change before upgrading." });
    const item = subscription.items.data[0];
    const start = item.current_period_start ?? subscription.current_period_start;
    const end = item.current_period_end ?? subscription.current_period_end;
    const prorationDate = Math.floor(now.getTime() / 1000);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || prorationDate < start || prorationDate >= end) return res.status(409).json({ message: "Stripe's current billing dates could not be verified. Refresh membership status before upgrading." });
    quote.periodDays = (end - start) / 86400;
    res.locals.upgradeStage = "create_upgrade_price";
    const price = await stripe.prices.create({ currency: "usd", unit_amount: Math.round(plan.price * 100), recurring: { interval: "day", interval_count: 30 }, product_data: { name: plan.name }, metadata: { membershipPlanId: String(plan._id), membershipName: plan.name } }, { idempotencyKey: quote.id });
    Object.assign(quote, { subscriptionId: subscription.id, itemId: item.id, priceId: price.id });
    res.locals.upgradeStage = "preview_invoice";
    const preview = await stripe.invoices.createPreview({ customer: user.stripeCustomerId, subscription: subscription.id, subscription_details: { items: [{ id: item.id, price: price.id }], billing_cycle_anchor: "now", proration_behavior: "always_invoice" } });
    quote.amountCents = preview.amount_due;
    quote.creditCents = Math.max(0, -preview.lines.data.filter((line) => line.amount < 0).reduce((sum, line) => sum + line.amount, 0));
  } else {
    try { Object.assign(quote, upgradePricing(state.current.price, plan.price, quote.sourceEnd, now)); }
    catch (error) { return res.status(409).json({ message: error.message }); }
  }
  if (![quote.sourcePrice, quote.periodDays, quote.remainingDays, quote.amountCents, quote.creditCents].every(Number.isFinite)) return res.status(409).json({ message: "The upgrade calculation is incomplete. Refresh membership status or contact support." });
  res.locals.upgradeStage = "save_quote";
  const saved = await User.updateOne({ _id: user._id, ...planChangeFilter(), "upgradeQuote.state": { $ne: "executing" } }, { $set: { upgradeQuote: quote } });
  if (!saved.modifiedCount) return res.status(409).json({ message: "Membership changed. Refresh." });
  res.json({ quote: { ...quote, estimatedExpiration: nextBillingDate(now) } });
});

router.post("/accept", async (req, res) => {
  if (req.body?.accepted !== true || typeof req.body?.quoteId !== "string") return res.status(400).json({ message: "Review and accept the upgrade calculation and expiration before continuing." });
  const result = await User.updateOne({ _id: req.user.id, accountStatus: "active", ...planChangeFilter(), "upgradeQuote.id": req.body.quoteId, "upgradeQuote.state": "quoted", "upgradeQuote.expiresAt": { $gt: new Date() } }, { $set: { "upgradeQuote.acceptedAt": new Date() } });
  if (!result.matchedCount) return res.status(409).json({ message: "Quote expired or plan changes are temporarily restricted. Refresh and preview again." });
  res.json({ message: "Upgrade accepted. An administrator must verify your Zelle receipt before activation." });
});

router.post("/confirm", async (req, res) => {
  const id = req.user.role === "admin" && typeof req.body?.userId === "string" ? req.body.userId : req.user.id;
  const user = await User.findById(id), quote = user?.upgradeQuote;
  if (!quote?.id || quote.id !== req.body?.quoteId || user.accountStatus !== "active") return res.status(409).json({ message: "Upgrade quote not found." });
  if (quote.state === "complete") return res.json({ message: "Upgrade already confirmed." });
  if (quote.state !== "executing" && planChangeBlocked(user)) return res.status(409).json({ message: planChangeMessage(user) });
  if (quote.state !== "executing" && new Date(quote.expiresAt) <= new Date()) return res.status(409).json({ message: "Quote expired. Preview the upgrade again." });
  if (quote.method === "zelle") {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only an administrator can confirm the Zelle upgrade payment." });
    if (!quote.acceptedAt) return res.status(409).json({ message: "The user must accept the upgrade calculation and expiration first." });
    const reference = req.body?.reference?.trim();
    if (!reference || reference.length > 150) return res.status(400).json({ message: "Enter a bank payment reference." });
    const now = new Date(), end = nextBillingDate(now);
    const result = await User.updateOne({ _id: user._id, accountStatus: "active", ...planChangeFilter(now), "upgradeQuote.id": quote.id, "upgradeQuote.state": "quoted", "zelle.planId": quote.sourcePlanId, "zelle.dueAt": quote.sourceEnd, "zelle.payments.reference": { $ne: reference } }, { $set: { lastMembershipChangeAt: now, lastMembershipChangePlanId: String(quote.planId), "upgradeQuote.state": "complete", "zelle.status": "active", "zelle.planId": quote.planId, "zelle.name": quote.name, "zelle.price": quote.price, "zelle.dueAt": end }, $push: { "zelle.payments": { periodStart: now, periodEnd: end, amount: quote.amountCents / 100, reference, confirmedBy: req.user.id, confirmedAt: now } } });
    if (!result.modifiedCount) return res.status(409).json({ message: "Membership changed or receipt already recorded. Refresh." });
    await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: "ZELLE_UPGRADE_CONFIRMED", targetType: "User", targetId: user._id });
    return res.json({ message: "Upgrade payment confirmed. The new 30-day period is active.", expiration: end });
  }
  res.locals.upgradeStage = "confirm_subscription";
  const stripe = stripeClient();
  if (quote.state === "executing" && Date.now() - new Date(quote.quotedAt).getTime() > 23 * 3600000) {
    await syncMembership(user, stripe, User);
    return res.status(409).json({ message: "This payment attempt needs reconciliation. Refresh membership status or contact support; no new charge was made." });
  }
  if (quote.state !== "executing") {
    if (req.body?.accepted !== true) return res.status(400).json({ message: "Accept the upgrade calculation and expiration before confirming payment." });
    const latest = await stripe.subscriptions.retrieve(quote.subscriptionId);
    const customer = typeof latest.customer === "string" ? latest.customer : latest.customer?.id;
    const latestEnd = latest.items?.data?.[0]?.current_period_end ?? latest.current_period_end;
    if (customer !== user.stripeCustomerId || latest.pending_update || latest.status !== "active" || latest.cancel_at_period_end || latestEnd * 1000 !== new Date(quote.sourceEnd).getTime()) return res.status(409).json({ message: "Subscription changed. Preview the upgrade again." });
    const lock = await User.updateOne({ _id: id, ...planChangeFilter(), "upgradeQuote.id": quote.id, "upgradeQuote.state": "quoted" }, { $set: { "upgradeQuote.state": "executing", "upgradeQuote.acceptedAt": new Date() } });
    if (!lock.modifiedCount) return res.status(409).json({ message: "Upgrade is already processing. Refresh." });
  }
  const subscription = await stripe.subscriptions.update(quote.subscriptionId, { items: [{ id: quote.itemId, price: quote.priceId }], billing_cycle_anchor: "now", proration_behavior: "always_invoice", payment_behavior: "pending_if_incomplete", expand: ["latest_invoice"] }, { idempotencyKey: `upgrade-${quote.id}` });
  await syncMembership(user, stripe, User);
  const invoice = subscription.latest_invoice;
  res.json({ message: subscription.pending_update ? "Complete payment to activate the upgrade. Your existing paid membership is unchanged." : "Upgrade paid. Your new expiration date is available in membership status.", url: subscription.pending_update ? invoice?.hosted_invoice_url : undefined });
});
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const reference = randomUUID();
  const failure = upgradeFailure(error);
  console.warn(JSON.stringify(upgradeDiagnostics(error, res.locals.upgradeStage, reference)));
  res.status(failure.status).json({ message: `${failure.message} Reference: ${reference}`, reference });
});
export default router;
