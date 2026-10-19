import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "../models/users.js";
import Plan from "../models/membershipPlans.js";
import AuditLog from "../models/AuditLog.js";
import { ReferralAffiliate, ReferralRedemption, ReferralReward } from "../models/referrals.js";
import paymentRouter from "../routes/paymentRoutes.js";
import billingRouter from "../routes/membershipBillingRoutes.js";
import referralRouter from "../routes/referralRoutes.js";

const query = (value) => ({ select: () => query(value), lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });
const field = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
function set(object, path, value) {
  const keys = path.split(".");
  const key = keys.pop();
  let target = object;
  for (const part of keys) target = target[part] ||= {};
  target[key] = value;
}
function mutate(object, update) {
  for (const [path, value] of Object.entries(update.$set || {})) set(object, path, value);
  for (const [path, value] of Object.entries(update.$push || {})) {
    if (!field(object, path)) set(object, path, []);
    field(object, path).push(value);
  }
}
function matches(object, filter) {
  return object && Object.entries(filter).every(([path, value]) => {
    const actual = field(object, path);
    if (value == null) return actual == null;
    if (value.$nin) return !value.$nin.includes(actual);
    if (value.$in) return value.$in.includes(actual);
    if (value.$ne !== undefined) return actual !== value.$ne;
    if (value instanceof Date) return new Date(actual).getTime() === value.getTime();
    return actual === value;
  });
}

test("checkout uses server coupon amounts; Zelle retry repairs rewards; only admins can settle once", async (t) => {
  const saved = { JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN };
  Object.assign(process.env, { JWT_ACCESS_SECRET: "synthetic-referral-secret", STRIPE_SECRET_KEY: "sk_test_synthetic", FRONTEND_ORIGIN: "https://example.com" });
  t.after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  const accounts = new Map([
    ["owner", { _id: "owner", role: "patient", accountStatus: "active", email: "owner@example.com", stripePaidThrough: new Date(Date.now() + 30 * 86400000), stripePaidPrice: 100 }],
    ["buyer", { _id: "buyer", role: "patient", accountStatus: "active", email: "buyer@example.com", stripeCustomerId: "cus_buyer", referralCode: "AEV-TEST123", zelle: {} }],
    ["zelle", { _id: "zelle", role: "patient", accountStatus: "active", email: "zelle@example.com", zelle: { payments: [] } }],
    ["admin", { _id: "admin", role: "admin", accountStatus: "active" }],
  ]);
  const affiliate = { _id: "11111111-1111-4111-8111-111111111111", userId: "owner", code: "AEV-TEST123", enabled: true, discountPercent: 10, commissionPercent: 20, commissionMode: "first_payment" };
  const plan = { _id: "111111111111111111111111", name: "Synthetic Gold", price: 100 };
  const redemptions = new Map(), rewards = new Map();
  t.mock.method(User, "findById", (id) => query(accounts.get(id)));
  t.mock.method(User, "updateOne", async (filter, update) => {
    const account = accounts.get(filter._id);
    // Mongo's array $ne guard prevents a repeated bank reference.
    if (filter["zelle.payments.reference"] && account.zelle.payments.some((payment) => payment.reference === filter["zelle.payments.reference"].$ne)) return { modifiedCount: 0 };
    const withoutArray = { ...filter }; delete withoutArray["zelle.payments.reference"];
    if (!matches(account, withoutArray)) return { modifiedCount: 0 };
    mutate(account, update); return { modifiedCount: 1 };
  });
  t.mock.method(User, "findOneAndUpdate", async (filter, update) => { const account = accounts.get(filter._id); if (!matches(account, filter)) return null; mutate(account, update); return account; });
  t.mock.method(Plan, "findById", async (id) => id === plan._id ? plan : null);
  t.mock.method(AuditLog, "create", async () => ({}));
  t.mock.method(ReferralAffiliate, "findOne", (filter) => query(matches(affiliate, filter) ? affiliate : null));
  t.mock.method(ReferralRedemption, "findById", (id) => query(redemptions.get(id)));
  t.mock.method(ReferralRedemption, "findOneAndUpdate", async (filter, update) => { if (!redemptions.has(filter._id)) redemptions.set(filter._id, { _id: filter._id, ...update.$setOnInsert }); return redemptions.get(filter._id); });
  t.mock.method(ReferralRedemption, "updateOne", async (filter, update) => { const item = redemptions.get(filter._id); if (!item.firstPaymentId) mutate(item, update); });
  let failReward = true;
  t.mock.method(ReferralReward, "updateOne", async (filter, update) => {
    if (failReward) { failReward = false; throw new Error("Synthetic reward-store outage after payment confirmation"); }
    if (!rewards.has(filter._id)) rewards.set(filter._id, { _id: filter._id, reversedCents: 0, paidCents: 0, ...update.$setOnInsert });
  });
  t.mock.method(ReferralReward, "findOneAndUpdate", async (filter, update) => {
    const reward = rewards.get(filter._id);
    if (!reward || reward.paidCents !== 0 || reward.voidReason || reward.rewardCents - reward.reversedCents !== filter.$expr.$eq[1]) return null;
    mutate(reward, update); return reward;
  });
  const stripe = new Stripe("sk_test_synthetic");
  const sessions = [], coupons = [];
  t.mock.method(Object.getPrototypeOf(stripe.subscriptions), "list", async () => ({ data: [] }));
  t.mock.method(Object.getPrototypeOf(stripe.invoices), "list", async function* () {});
  t.mock.method(Object.getPrototypeOf(stripe.checkout.sessions), "list", async () => ({ data: sessions }));
  t.mock.method(Object.getPrototypeOf(stripe.coupons), "create", async (params, options) => { coupons.push({ params, options }); return { id: "coupon_synthetic" }; });
  t.mock.method(Object.getPrototypeOf(stripe.checkout.sessions), "create", async (params) => { const session = { id: "cs_synthetic", url: "https://checkout.stripe.com/synthetic", ...params }; sessions.push(session); return session; });
  const app = express();
  app.use(express.json(), cookieParser());
  app.use("/payments", paymentRouter); app.use("/billing", billingRouter); app.use("/referrals", referralRouter);
  app.use((error, req, res, next) => { if (res.headersSent) return next(error); res.status(500).json({ message: "Synthetic error" }); });
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, user, body = {}) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", ...(user ? { cookie: `accessToken=${jwt.sign({ userId: user, role: accounts.get(user).role }, process.env.JWT_ACCESS_SECRET)}` } : {}) }, body: JSON.stringify(body) });

  assert.equal((await post("/payments/checkout-session", null, { planId: plan._id })).status, 401);
  let response = await post("/payments/checkout-session", "buyer", { planId: plan._id, expectedReferralTotalCents: 1, discountPercent: 99 });
  assert.equal(response.status, 409); assert.equal(sessions.length, 0);
  response = await post("/payments/checkout-session", "buyer", { planId: plan._id, expectedReferralTotalCents: 9000 });
  assert.equal(response.status, 200);
  assert.deepEqual(coupons[0].params, { amount_off: 1000, currency: "usd", duration: "once", name: "Aeviora referral AEV-TEST123" });
  assert.equal(sessions[0].line_items[0].price_data.unit_amount, 10000, "recurring price remains full price");
  assert.equal(sessions[0].subscription_data.metadata.referralRedemptionId, "buyer");
  assert.deepEqual(sessions[0].discounts, [{ coupon: "coupon_synthetic" }]);
  assert.match(coupons[0].options.idempotencyKey, /1000$/);
  assert.equal((await post("/payments/checkout-session", "buyer", { planId: plan._id, expectedReferralTotalCents: 9000 })).status, 200);
  assert.equal(sessions.length, 1, "a retry reuses the existing checkout");
  assert.equal(rewards.size, 0, "checkout alone does not earn a reward");

  response = await post("/billing/zelle", "zelle", { planId: plan._id, referralCode: affiliate.code, expectedReferralTotalCents: 9000 });
  assert.equal(response.status, 200); assert.equal((await response.json()).amountDueCents, 9000);
  const dueAt = accounts.get("zelle").zelle.dueAt.toISOString();
  const confirmation = { dueAt, reference: "synthetic-bank-receipt" };
  assert.equal((await post("/billing/zelle/confirm", "buyer", confirmation)).status, 403);
  assert.equal((await post("/billing/zelle/confirm", "admin", confirmation)).status, 500, "payment was saved before reward storage failed");
  assert.equal(accounts.get("zelle").zelle.payments.length, 1);
  assert.equal(accounts.get("zelle").zelle.payments[0].amount, 90);
  assert.equal((await post("/billing/zelle/confirm", "admin", confirmation)).status, 200, "retry repairs reward accounting");
  assert.equal(accounts.get("zelle").zelle.payments.length, 1); assert.equal(rewards.size, 1);
  const reward = [...rewards.values()][0]; assert.equal(reward.rewardCents, 1800);
  const payout = `/referrals/admin/rewards/${encodeURIComponent(reward._id)}/pay`;
  assert.equal((await post(payout, "buyer", { amountCents: 1800, reference: "synthetic-payout" })).status, 403);
  assert.equal((await post(payout, "admin", { amountCents: 9999, reference: "synthetic-payout" })).status, 409);
  assert.equal((await post(payout, "admin", { amountCents: 1800, reference: "synthetic-payout" })).status, 200);
  assert.equal((await post(payout, "admin", { amountCents: 1800, reference: "synthetic-payout" })).status, 409);
});
