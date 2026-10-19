import test from "node:test";
import assert from "node:assert/strict";
import { affiliateEligible, ensureAffiliate, resolveReferral, referralOffer, recordReferralPayment, recordZelleReferrals, recordStripeReferral, reconcileStripeReferralRefunds, rewardSummary, ReferralError, assertNoPriorStripeMembership } from "../services/referrals.js";
import { referralAmounts, referralCodeSchema, defaultReferralTerms } from "../../shared/referrals.js";
import { ReferralAffiliate, ReferralSettings } from "../models/referrals.js";
import { zelleBalance } from "../services/billingSummary.js";
import { registerAccount } from "../services/registration.js";

const now = new Date("2026-10-19T15:00:00Z");
function fixture(overrides = {}) {
  const owner = { _id: "owner", role: "patient", accountStatus: "active", email: "owner@example.com", stripePaidThrough: new Date("2026-11-19"), stripePaidPrice: 100, ...overrides };
  const affiliate = { _id: "affiliate", userId: owner._id, code: "AEV-TEST123", enabled: true, discountPercent: 10, commissionPercent: 20, commissionMode: "first_payment" };
  const buyer = { _id: "buyer", email: "buyer@example.com", stripeCustomerId: "cus_buyer", referralCode: affiliate.code };
  const redemptions = new Map(), rewards = new Map();
  let creates = 0;
  const repository = {
    user: async (id) => id === owner._id ? owner : id === buyer._id ? buyer : null,
    affiliate: async (filter) => Object.entries(filter).every(([key, value]) => affiliate[key] === value) ? affiliate : null,
    settings: async () => ({ enabled: true, discountPercent: 10, commissionPercent: 20, commissionMode: "first_payment" }),
    createAffiliate: async (data) => { creates++; return data; },
    redemption: async (id) => redemptions.get(id),
    reserve: async (id, data) => { if (!redemptions.has(id)) redemptions.set(id, { _id: id, ...data }); return redemptions.get(id); },
    firstPayment: async (id, paymentId, paidAt) => { const item = redemptions.get(id); if (!item.firstPaymentId) Object.assign(item, { firstPaymentId: paymentId, firstPaidAt: paidAt }); },
    reward: async (data) => { if (!rewards.has(data._id)) rewards.set(data._id, { ...data, reversedCents: 0, paidCents: 0 }); },
  };
  const plan = { _id: "plan", name: "Synthetic membership", price: 100 };
  const reserve = () => referralOffer(buyer, affiliate.code, plan, { repository, now, reserve: true });
  const payment = { userId: buyer._id, paymentId: "stripe:in_first", method: "stripe", first: true, baseCents: 9000, planName: plan.name, paidAt: now };
  return { owner, affiliate, buyer, repository, redemptions, rewards, plan, reserve, payment, creates: () => creates };
}

test("eligibility uses paid access, not a selected/unpaid or expired subscription", () => {
  const f = fixture();
  assert.equal(affiliateEligible(f.owner, now), true);
  for (const patch of [{ stripePaidThrough: now }, { accountStatus: "suspended" }, { stripePaidPrice: 0 }, { role: "provider" }, { stripePaidThrough: null, subscriptionStatus: "active" }]) assert.equal(affiliateEligible({ ...f.owner, ...patch }, now), false);
  assert.equal(affiliateEligible({ ...f.owner, stripePaidThrough: null, zelle: { status: "active", price: 100, payments: [{ periodEnd: new Date("2026-11-19") }] } }, now), true);
});

test("codes are normalized and generated only once per eligible member", async () => {
  const f = fixture();
  assert.equal(referralCodeSchema.parse(" aev-test123 "), "AEV-TEST123");
  assert.equal(referralCodeSchema.safeParse("<script>").success, false);
  assert.equal(await ensureAffiliate(f.owner, { repository: f.repository, now }), f.affiliate);
  assert.equal(f.creates(), 0);
  f.repository.affiliate = async () => null;
  const generated = await ensureAffiliate(f.owner, { repository: f.repository, now });
  assert.match(generated.code, /^AEV-[A-F0-9]{12}$/);
  f.owner.stripePaidThrough = now;
  await assert.rejects(ensureAffiliate(f.owner, { repository: f.repository, now }), ReferralError);
});

test("self referrals, disabled coupons and former members cannot offer discounts", async () => {
  const f = fixture(), options = { repository: f.repository, now };
  await assert.rejects(resolveReferral(f.affiliate.code, { ...options, userId: f.owner._id }), /own referral/);
  await assert.rejects(resolveReferral(f.affiliate.code, { ...options, email: f.owner.email }), /own referral/);
  f.affiliate.enabled = false;
  await assert.rejects(resolveReferral(f.affiliate.code, options), /unavailable/);
  f.affiliate.enabled = true; f.owner.stripePaidThrough = now;
  await assert.rejects(resolveReferral(f.affiliate.code, options), /unavailable/);
});

test("a reserved offer freezes terms and cannot be switched or redeemed after a paid membership", async () => {
  const f = fixture();
  const offer = await f.reserve();
  assert.equal(offer.totalCents, 9000); assert.equal(offer.commissionCents, 1800);
  f.affiliate.discountPercent = 25; f.affiliate.commissionPercent = 30;
  assert.equal((await f.reserve()).totalCents, 9000);
  assert.equal((await f.reserve()).commissionCents, 1800);
  await assert.rejects(referralOffer(f.buyer, "OTHER-CODE", f.plan, { repository: f.repository, now }), /already reserved/);
  f.buyer.stripePaidInvoiceId = "in_paid";
  await assert.rejects(f.reserve(), /first paid membership/);
  const clean = fixture(); clean.buyer.zelle = { payments: [{ amount: 1 }] };
  await assert.rejects(clean.reserve(), /new paid members/);
});

test("integer-cent calculation prorates the 20% reward and applies Zelle discount only once", () => {
  assert.deepEqual(referralAmounts(1000, 0, 20), { priceCents: 1000, discountCents: 0, totalCents: 1000, commissionCents: 200 });
  assert.equal(referralAmounts(999, 15, 20).totalCents, 849);
  const zelle = { status: "pending", price: 100, referralDiscountCents: 1000, dueAt: now, payments: [] };
  assert.equal(zelleBalance(zelle, now).amount, 90);
  zelle.payments.push({ amount: 90 });
  assert.equal(zelleBalance(zelle, now).amount, 100);
});

test("approved defaults give 10% off once and a 20% commission on eligible paid renewals", async () => {
  assert.deepEqual(defaultReferralTerms, { enabled: true, discountPercent: 10, commissionPercent: 20, commissionMode: "recurring" });
  for (const Model of [ReferralAffiliate, ReferralSettings]) {
    const document = new Model();
    for (const [key, value] of Object.entries(defaultReferralTerms)) assert.equal(document[key], value);
  }
  const f = fixture();
  Object.assign(f.affiliate, defaultReferralTerms);
  await f.reserve();
  await recordReferralPayment(f.payment, { repository: f.repository });
  await recordReferralPayment({ ...f.payment, paymentId: "stripe:renewal", first: false, baseCents: 10000 }, { repository: f.repository });
  assert.equal(f.rewards.get(f.payment.paymentId).rewardCents, 1800);
  assert.equal(f.rewards.get("stripe:renewal").rewardCents, 2000);
  f.owner.stripePaidThrough = now;
  await recordReferralPayment({ ...f.payment, paymentId: "stripe:ineligible-renewal", first: false, baseCents: 10000 }, { repository: f.repository });
  assert.equal(f.rewards.size, 2, "renewals earn no commission when the affiliate is ineligible");
});

test("a missed webhook cannot turn a previously paid Stripe customer into a first-time member", async () => {
  const stripe = { invoices: { list: async function* () { yield { amount_paid: 0, subscription: "sub_free" }; yield { amount_paid: 10000, parent: { subscription_details: { subscription: "sub_ended" } } }; } } };
  await assert.rejects(assertNoPriorStripeMembership({ stripeCustomerId: "cus_existing" }, stripe), /new paid members/);
});

test("replayed and concurrent first-payment events never duplicate rewards; renewals respect terms", async () => {
  const f = fixture(); await f.reserve();
  await Promise.all([recordReferralPayment(f.payment, { repository: f.repository }), recordReferralPayment(f.payment, { repository: f.repository })]);
  assert.equal(f.rewards.size, 1); assert.equal(f.rewards.get(f.payment.paymentId).rewardCents, 1800);
  await recordReferralPayment({ ...f.payment, paymentId: "stripe:another_first" }, { repository: f.repository });
  await recordReferralPayment({ ...f.payment, paymentId: "stripe:renewal", first: false }, { repository: f.repository });
  assert.equal(f.rewards.size, 1);
  f.redemptions.get(f.buyer._id).commissionMode = "recurring";
  await recordReferralPayment({ ...f.payment, paymentId: "stripe:renewal", first: false }, { repository: f.repository });
  assert.equal(f.rewards.size, 2);
});

test("unpaid, zero-value and ineligible affiliate payments cannot generate rewards", async () => {
  const f = fixture(); await f.reserve();
  await recordReferralPayment({ ...f.payment, baseCents: 0 }, { repository: f.repository });
  f.affiliate.enabled = false;
  await recordReferralPayment(f.payment, { repository: f.repository });
  assert.equal(f.rewards.size, 0);
  await recordZelleReferrals({ ...f.buyer, zelle: { name: f.plan.name, payments: [{ amount: 90, periodStart: now, reference: "synthetic" }] } }, { repository: f.repository });
  assert.equal(f.rewards.size, 0, "a bank reference without admin confirmation is insufficient");
});

test("admin-confirmed Zelle receipts and retries generate one reward per paid period", async () => {
  const f = fixture(); await f.reserve();
  f.buyer.zelle = { name: f.plan.name, payments: [{ amount: 90, periodStart: now, reference: "synthetic", confirmedAt: now }] };
  await recordZelleReferrals(f.buyer, { repository: f.repository });
  await recordZelleReferrals(f.buyer, { repository: f.repository });
  assert.equal(f.rewards.size, 1); assert.equal([...f.rewards.values()][0].rewardCents, 1800);
});

test("Stripe invoices must be paid USD membership invoices with server-owned attribution", async () => {
  const f = fixture(); await f.reserve();
  const invoice = { id: "in_first", customer: "cus_buyer", subscription: "sub_test", status: "paid", currency: "usd", billing_reason: "subscription_create", amount_paid: 9900, total_excluding_tax: 9000, created: now.getTime() / 1000 };
  const sub = { metadata: { aevioraUserId: f.buyer._id, referralRedemptionId: f.buyer._id, membershipName: f.plan.name } };
  const stripe = { subscriptions: { retrieve: async () => sub } };
  const options = { repository: f.repository, skipReversals: true };
  for (const patch of [{ status: "open" }, { currency: "eur" }, { billing_reason: "subscription_update" }, { customer: "cus_other" }]) await recordStripeReferral({ ...invoice, ...patch }, stripe, options);
  assert.equal(f.rewards.size, 0);
  await recordStripeReferral(invoice, stripe, options);
  assert.equal(f.rewards.get("stripe:in_first").baseCents, 9000, "tax is excluded");
  assert.equal(f.rewards.get("stripe:in_first").rewardCents, 1800);
});

test("partial/full refunds are replay-safe and preserve payouts as negative balances", async () => {
  const reward = { _id: "stripe:in_refund", rewardCents: 1800, reversedCents: 0, paidCents: 1800 };
  const charge = { id: "ch_refund", amount_refunded: 4500 };
  const stripe = { invoicePayments: { list: async function* () { yield { payment: { payment_intent: "pi_refund" } }; } }, paymentIntents: { retrieve: async () => ({ latest_charge: charge }) } };
  const rewards = { findById: async () => reward, updateOne: async (_, changes) => { reward.reversedCents = Math.max(reward.reversedCents, changes.$max.reversedCents); } };
  const invoice = { id: "in_refund", amount_paid: 9000 };
  await reconcileStripeReferralRefunds(invoice, stripe, { rewards });
  await reconcileStripeReferralRefunds(invoice, stripe, { rewards });
  assert.equal(reward.reversedCents, 900);
  assert.equal(rewardSummary([reward]).balanceCents, -900);
  charge.amount_refunded = 9000;
  await reconcileStripeReferralRefunds(invoice, stripe, { rewards });
  assert.equal(rewardSummary([reward]).balanceCents, -1800);
  assert.equal(reward.paidCents, 1800);
});

test("registration validates a referral before creating an account and never accepts client reward fields", async () => {
  const config = { termsVersion: "test", privacyVersion: "test", termsUrl: "/terms", privacyUrl: "/privacy", isDraft: true, requiredAddressFields: [] };
  const input = { firstName: "Synthetic", lastName: "Member", email: "new@example.com", phone: "+12025550123", zipCode: "33101", password: "synthetic-password", is18OrOlder: true, termsAccepted: true, privacyAccepted: true, termsVersion: "test", privacyVersion: "test", referralCode: "aev-test123" };
  let creates = 0, observed;
  const dependencies = { config, hashPassword: async () => "hash", users: { findOne: async () => null, create: async (data) => { creates++; return data; } }, referral: async (code) => { observed = code; } };
  const user = await registerAccount(input, dependencies);
  assert.equal(observed, "AEV-TEST123"); assert.equal(user.referralCode, observed);
  dependencies.referral = async () => { throw new ReferralError("Unavailable coupon"); };
  await assert.rejects(registerAccount(input, dependencies), (error) => error.fields.referralCode === "Unavailable coupon");
  assert.equal(creates, 1);
  await assert.rejects(registerAccount({ ...input, commissionPercent: 100 }, dependencies), { status: 400 });
});
