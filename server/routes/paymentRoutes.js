import express from "express";
import Stripe from "stripe";
import User from "../models/users.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();

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
    if (!process.env.STRIPE_PRICE_ID) return res.status(503).json({ message: "Stripe pricing is not configured." });
    const stripe = stripeClient();
    const user = await User.findById(req.user.id).select("firstName lastName email role stripeCustomerId");
    if (!user) return res.status(404).json({ message: "Account not found." });
    const customerId = await getOrCreateCustomer(stripe, user);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${frontendUrl()}/dashboard?payment=success`,
      cancel_url: `${frontendUrl()}/dashboard?payment=cancelled`,
      client_reference_id: user._id.toString(),
      metadata: { aevioraUserId: user._id.toString() },
      subscription_data: { metadata: { aevioraUserId: user._id.toString() } },
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
    update.subscriptionStatus = "active";
  }
  if (event.type === "customer.subscription.updated") {
    update.stripeSubscriptionId = object.id;
    update.subscriptionStatus = object.status;
  }
  if (event.type === "customer.subscription.deleted") {
    update.stripeSubscriptionId = null;
    update.subscriptionStatus = "canceled";
  }

  if (Object.keys(update).length > 0) {
    const filter = userId ? { _id: userId } : { stripeCustomerId: customerId };
    await User.updateOne(filter, { $set: update });
  }
  return res.json({ received: true });
});

export default router;