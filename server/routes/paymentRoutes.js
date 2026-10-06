import express from "express";
import Stripe from "stripe";
import User from "../models/users.js";
import MembershipPlan from "../models/membershipPlans.js";
import { memberStatus } from "../services/memberStatus.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();

router.get("/memberships", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("membershipPlanId membershipName subscriptionStatus stripeSubscriptionId");
  if (!user) return res.status(404).json({ message: "Account not found." });
  const plans = await MembershipPlan.find().select("name price currency billingInterval benefits").sort({ price: 1 });
  res.json({ plans, ...memberStatus(user) });
});

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function frontendUrl() {
  return (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
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
    const user = await User.findById(req.user.id).select("firstName lastName email role stripeCustomerId stripeSubscriptionId");
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (user.stripeSubscriptionId) return res.status(409).json({ message: "Manage your existing subscription through billing before choosing another plan." });
    const customerId = await getOrCreateCustomer(stripe, user);
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (subscriptions.data.some((subscription) => !["canceled", "incomplete_expired"].includes(subscription.status))) {
      return res.status(409).json({ message: "You already have a subscription. Refresh your membership status or manage billing." });
    }
    const openSessions = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
    const pendingCheckout = openSessions.data.find((session) => session.mode === "subscription");
    if (pendingCheckout) {
      if (pendingCheckout.metadata?.membershipPlanId === String(plan._id)) return res.json({ url: pendingCheckout.url });
      return res.status(409).json({ message: "A checkout for another plan is already open. Complete it or wait for it to expire before choosing another plan." });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      expires_at: Math.floor(Date.now() / 1000) + 1800,
      customer: customerId,
      line_items: [{ price_data: { currency: "usd", unit_amount: Math.round(plan.price * 100), recurring: { interval: "month" }, product_data: { name: plan.name } }, quantity: 1 }],
      success_url: `${frontendUrl()}/dashboard?payment=success`,
      cancel_url: `${frontendUrl()}/dashboard?payment=cancelled`,
      client_reference_id: user._id.toString(),
      metadata: { aevioraUserId: user._id.toString(), membershipPlanId: String(plan._id), membershipName: plan.name },
      subscription_data: { metadata: { aevioraUserId: user._id.toString(), membershipPlanId: String(plan._id), membershipName: plan.name } },
    });
    await logAudit({ req, actorId: user._id, actorRole: user.role, action: "PAYMENT_CHECKOUT_STARTED", targetType: "StripeCheckoutSession", targetId: session.id });
    return res.json({ url: session.url });
  } catch (error) {
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
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${frontendUrl()}/dashboard` });
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
  const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
  const userId = object.metadata?.aevioraUserId || object.client_reference_id;
  const update = {};
  if (customerId) update.stripeCustomerId = customerId;

  if (event.type === "checkout.session.completed") {
    update.stripeSubscriptionId = typeof object.subscription === "string" ? object.subscription : object.subscription?.id;
    update.subscriptionStatus = object.payment_status === "paid" || object.payment_status === "no_payment_required" ? "active" : "incomplete";
  }
  if (event.type === "customer.subscription.updated") {
    update.stripeSubscriptionId = object.id;
    update.subscriptionStatus = object.status;
  }
  if (event.type === "customer.subscription.deleted") {
    update.stripeSubscriptionId = null;
    update.subscriptionStatus = "canceled";
    update.membershipPlanId = null;
    update.membershipName = "";
  }

  if (["checkout.session.completed", "customer.subscription.updated"].includes(event.type) && /^[a-f\d]{24}$/i.test(object.metadata?.membershipPlanId || "")) {
    update.membershipPlanId = object.metadata.membershipPlanId;
    update.membershipName = object.metadata.membershipName || "Membership";
  }

  if (Object.keys(update).length > 0) {
    const filter = userId ? { _id: userId } : { stripeCustomerId: customerId };
    await User.updateOne(filter, { $set: update });
  }
  return res.json({ received: true });
});

export default router;
