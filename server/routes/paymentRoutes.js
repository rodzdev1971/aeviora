import express from "express";
import Stripe from "stripe";
import User from "../models/users.js";
import MembershipPlan from "../models/membershipPlans.js";
import { memberStatus } from "../services/memberStatus.js";
import { syncMembership } from "../services/syncMembership.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { changeStripeRenewal, stripePeriod, zellePaidThrough, membershipPortalConfig } from "../services/membershipPeriods.js";
import { nextPlanChangeAt, planChangeBlocked, planChangeMessage } from "../services/planChangePolicy.js";
import { paymentReturnOrigin } from "../services/paymentReturnOrigin.js";
import { referralOffer, ReferralError, handleStripeReferralEvent, assertNoPriorStripeMembership } from "../services/referrals.js";
import { referralCodeSchema } from "../../shared/referrals.js";

const router = express.Router();

router.get("/memberships", requireAuth, async (req, res) => {
  let user = await User.findById(req.user.id).select("membershipPlanId membershipName subscriptionStatus stripeSubscriptionId stripeCustomerId stripePeriodEnd stripeCancelAtPeriodEnd stripePaidThrough stripePaidStart stripePaidInvoiceId stripePaidPrice upgradeQuote lastMembershipChangeAt lastMembershipChangePlanId zelle");
  if (!user) return res.status(404).json({ message: "Account not found." });
  if (user.stripeCustomerId && !["pending", "active"].includes(user.zelle?.status)) {
    try { user = await syncMembership(user, stripeClient(), User); }
    catch { return res.status(503).json({ message: "Unable to verify your latest membership with Stripe. Please refresh shortly; do not purchase another plan." }); }
  }
  const plans = await MembershipPlan.find().select("name price currency billingInterval benefits").sort({ price: 1 });
  res.json({ plans, nextPlanChangeAt: nextPlanChangeAt(user), upgradeQuote: user.upgradeQuote, ...memberStatus(user) });
});

router.post("/renewal", requireAuth, async (req, res) => {
  if (typeof req.body?.cancel !== "boolean") return res.status(400).json({ message: "Choose whether to cancel renewal." });
  try {
    const stripe = stripeClient(), user = await User.findById(req.user.id);
    const subscription = await changeStripeRenewal(user, stripe, req.body.cancel);
    await User.updateOne({ _id: user._id, stripeSubscriptionId: subscription.id }, { $set: { ...stripePeriod(subscription), subscriptionStatus: subscription.status } });
    await logAudit({ req, actorId: req.user.id, actorRole: req.user.role, action: req.body.cancel ? "STRIPE_RENEWAL_CANCELED" : "STRIPE_RENEWAL_REACTIVATED", targetType: "StripeSubscription", targetId: subscription.id });
    res.json({ message: req.body.cancel ? "Renewal canceled. Your paid membership continues until the period ends." : "Renewal reactivated for the next billing date. The current period is not charged again." });
  } catch { res.status(409).json({ message: "Unable to update renewal. Refresh your membership and review its status or contact our team." }); }
});

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getOrCreateCustomer(stripe, user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    metadata: { aevioraUserId: user._id.toString() },
  });
  await User.updateOne({ _id: user._id }, { $set: { stripeCustomerId: customer.id } });
  return customer.id;
}

router.post("/checkout-session", requireAuth, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.body?.planId || "")) return res.status(400).json({ message: "Choose a membership plan." });
    const plan = await MembershipPlan.findById(req.body.planId);
    if (!plan) return res.status(404).json({ message: "Membership plan is no longer available." });
    const stripe = stripeClient();
    const user = await User.findById(req.user.id).select("firstName lastName email role referralCode stripePaidInvoiceId stripePaidThrough stripeCustomerId stripeSubscriptionId lastMembershipChangeAt lastMembershipChangePlanId zelle");
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (planChangeBlocked(user) && String(plan._id) !== user.lastMembershipChangePlanId) return res.status(409).json({ message: planChangeMessage(user) });
    if (user.stripeSubscriptionId) return res.status(409).json({ message: "Manage your existing subscription through billing before choosing another plan." });
    if (["pending", "active"].includes(user.zelle?.status) || zellePaidThrough(user.zelle) > new Date()) return res.status(409).json({ message: "Your Zelle membership is pending or still covers this period. Contact our team to change payment method." });
    const codeInput = referralCodeSchema.safeParse(req.body.referralCode ?? user.referralCode ?? "");
    if (!codeInput.success) return res.status(400).json({ message: "Enter a valid referral code." });
    if (codeInput.data) await assertNoPriorStripeMembership(user, stripe);
    const referral = await referralOffer(user, codeInput.data, plan, { reserve: true });
    if (referral && req.body.expectedReferralTotalCents !== referral.totalCents) return res.status(409).json({ message: "The referral discount changed. Apply the code again to review the current total." });
    const customerId = await getOrCreateCustomer(stripe, user);
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (subscriptions.data.some((subscription) => !["canceled", "incomplete_expired"].includes(subscription.status))) {
      return res.status(409).json({ message: "You already have a subscription. Refresh your membership status or manage billing." });
    }
    const openSessions = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
    const pendingCheckout = openSessions.data.find((session) => session.mode === "subscription");
    if (pendingCheckout) {
      if (pendingCheckout.metadata?.membershipPlanId === String(plan._id) && (pendingCheckout.metadata?.referralCode || "") === (referral?.redemption.code || "")) return res.json({ url: pendingCheckout.url });
      return res.status(409).json({ message: "A checkout for another plan is already open. Complete it or wait for it to expire before choosing another plan." });
    }
    const referralMetadata = referral ? { referralRedemptionId: String(user._id), referralCode: referral.redemption.code } : {};
    let discounts;
    if (referral) {
      await User.updateOne({ _id: user._id }, { $set: { referralCode: referral.redemption.code } });
      // Fixed amount is snapshotted for this plan and applies to the first invoice only.
      const coupon = await stripe.coupons.create({ amount_off: referral.discountCents, currency: "usd", duration: "once", name: `Aeviora referral ${referral.redemption.code}` }, { idempotencyKey: `referral-${user._id}-${plan._id}-${referral.discountCents}` });
      discounts = [{ coupon: coupon.id }];
    }
    const session = await stripe.checkout.sessions.create({
      ...(discounts ? { discounts } : {}),
      locale: req.acceptsLanguages("es", "en") || "en",
      mode: "subscription",
      payment_method_types: ["card"],
      expires_at: Math.floor(Date.now() / 1000) + 1800,
      customer: customerId,
      line_items: [{ price_data: { currency: "usd", unit_amount: Math.round(plan.price * 100), recurring: { interval: "day", interval_count: 30 }, product_data: { name: plan.name } }, quantity: 1 }],
      success_url: `${paymentReturnOrigin(req)}/memberships?payment=success`,
      cancel_url: `${paymentReturnOrigin(req)}/dashboard?payment=cancelled`,
      client_reference_id: user._id.toString(),
      metadata: { aevioraUserId: user._id.toString(), membershipPlanId: String(plan._id), membershipName: plan.name, ...referralMetadata },
      subscription_data: { metadata: { aevioraUserId: user._id.toString(), membershipPlanId: String(plan._id), membershipName: plan.name, ...referralMetadata } },
    });
    await logAudit({ req, actorId: user._id, actorRole: user.role, action: "PAYMENT_CHECKOUT_STARTED", targetType: "StripeCheckoutSession", targetId: session.id });
    return res.json({ url: session.url });
  } catch (error) {
    if (error instanceof ReferralError) return res.status(error.status).json({ message: error.message });
    console.error("Stripe checkout error:", error.message);
    return res.status(502).json({ message: "Unable to start secure checkout." });
  }
});

router.post("/billing-portal", requireAuth, async (req, res) => {
  try {
    const stripe = stripeClient();
    const user = await User.findById(req.user.id).select("firstName lastName email role stripeCustomerId");
    if (!user) return res.status(404).json({ message: "Account not found." });
    const customerId = await getOrCreateCustomer(stripe, user);
    const configuration = await membershipPortalConfig(stripe);
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, configuration, locale: req.acceptsLanguages("es", "en") || "en", return_url: `${paymentReturnOrigin(req)}/memberships` });
    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe billing portal error:", error.message);
    return res.status(502).json({ message: "Unable to open secure billing." });
  }
});

router.post("/webhook", async (req, res) => {
  let event;
  try {
    const stripe = stripeClient();
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  const object = event.data.object;
  // Let transient failures return 500 so Stripe retries the signed event.
  await handleStripeReferralEvent(event, stripeClient());
  const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
  const subscriptionValue = object.parent?.subscription_details?.subscription || object.subscription;
  const subscriptionId = event.type.startsWith("customer.subscription.") ? object.id : typeof subscriptionValue === "string" ? subscriptionValue : subscriptionValue?.id;
  if (["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type) && customerId && subscriptionId) {
    const user = await User.findOne({ stripeCustomerId: customerId });
    if (user && (!user.stripeSubscriptionId || user.stripeSubscriptionId === subscriptionId)) {
      user.stripeSubscriptionId = subscriptionId;
      await syncMembership(user, stripeClient(), User);
    }
  }
  return res.json({ received: true });
});

export default router;
