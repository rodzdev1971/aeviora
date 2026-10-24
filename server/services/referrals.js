import { randomBytes } from "node:crypto";
import User from "../models/users.js";
import { ReferralAffiliate, BusinessAffiliate, ReferralSettings, ReferralRedemption, ReferralReward } from "../models/referrals.js";
import { defaultReferralTerms, referralAmounts } from "../../shared/referrals.js";
import { memberStatus } from "./memberStatus.js";
import { invoiceSubscription } from "./billingSummary.js";

export class ReferralError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
export function affiliateEligible(user, now = new Date()) {
  const membership = user && memberStatus(user, now);
  return Boolean(user?.accountStatus === "active" && ["patient", "user"].includes(user.role) && membership?.subscribed && membership.current.price > 0);
}
export const referralRepository = {
  user: (id) => User.findById(id),
  affiliate: async (filter) => {
    const member = await ReferralAffiliate.findOne(filter);
    if (member || filter.userId || (filter.code && !filter.code.startsWith("B2B-"))) return member;
    return BusinessAffiliate.findOne(filter);
  },
  businessByIdentity: (nameKey, email) => BusinessAffiliate.findOne({ nameKey, email }),
  createBusiness: (data) => BusinessAffiliate.create(data),
  settings: () => ReferralSettings.findById("default").lean(),
  createAffiliate: (data) => ReferralAffiliate.create(data),
  redemption: (id) => ReferralRedemption.findById(id),
  reserve: (id, data) => ReferralRedemption.findOneAndUpdate({ _id: id }, { $setOnInsert: data }, { upsert: true, new: true }),
  firstPayment: (id, paymentId, paidAt) => ReferralRedemption.updateOne({ _id: id, firstPaymentId: { $exists: false } }, { $set: { firstPaymentId: paymentId, firstPaidAt: paidAt } }),
  reward: (data) => ReferralReward.updateOne({ _id: data._id }, { $setOnInsert: data }, { upsert: true }),
};

export async function registerBusinessAffiliate(input, { repository = referralRepository, terms } = {}) {
  const nameKey = input.businessName.trim().replace(/\s+/g, " ").toLowerCase();
  const existing = await repository.businessByIdentity(nameKey, input.email);
  if (existing) return existing;
  const settings = terms || await repository.settings() || defaultReferralTerms;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = `B2B-${randomBytes(6).toString("hex").toUpperCase()}`;
    if (await repository.affiliate({ code })) continue;
    try { return await repository.createBusiness({ ...input, nameKey, code, kind: "business", enabled: settings.enabled, discountPercent: settings.discountPercent, commissionPercent: settings.commissionPercent, commissionMode: settings.commissionMode }); }
    catch (error) {
      if (error.code !== 11000) throw error;
      const concurrent = await repository.businessByIdentity(nameKey, input.email);
      if (concurrent) return concurrent;
    }
  }
  throw new ReferralError("Unable to create the business affiliate code. Please retry.", 503);
}

export async function referralOwner(affiliate, repository = referralRepository, now = new Date()) {
  if (affiliate.kind === "business") return { eligible: Boolean(affiliate.enabled), email: affiliate.email };
  const user = await repository.user(affiliate.userId);
  return { eligible: affiliateEligible(user, now), email: user?.email };
}

export async function ensureAffiliate(user, { repository = referralRepository, now = new Date() } = {}) {
  const existing = await repository.affiliate({ userId: String(user._id) });
  if (existing) return existing;
  if (!affiliateEligible(user, now)) throw new ReferralError("A current paid membership is required to create a referral code.");
  const settings = await repository.settings() || defaultReferralTerms;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await repository.createAffiliate({ userId: String(user._id), code: `AEV-${randomBytes(6).toString("hex").toUpperCase()}`, enabled: settings.enabled, discountPercent: settings.discountPercent, commissionPercent: settings.commissionPercent, commissionMode: settings.commissionMode }); }
    catch (error) {
      if (error.code !== 11000) throw error;
      const concurrent = await repository.affiliate({ userId: String(user._id) });
      if (concurrent) return concurrent;
    }
  }
  throw new ReferralError("Unable to generate a referral code. Please retry.", 503);
}

export async function resolveReferral(code, { repository = referralRepository, userId, email, now = new Date() } = {}) {
  const affiliate = await repository.affiliate({ code });
  if (!affiliate?.enabled || affiliate.discountPercent <= 0) throw new ReferralError("This referral coupon is unavailable. Remove it or use another code.");
  const owner = await referralOwner(affiliate, repository, now);
  if (!owner.eligible) throw new ReferralError("This referral coupon is unavailable. Remove it or use another code.");
  if (affiliate.userId === String(userId) || (email && owner.email === email)) throw new ReferralError("You cannot use your own referral code.");
  return affiliate;
}

export function hasPaidMembership(user) {
  return Boolean(user.stripePaidInvoiceId || user.stripePaidThrough || user.zelle?.payments?.length);
}

export async function assertNoPriorStripeMembership(user, stripe) {
  if (!user.stripeCustomerId) return;
  // Provider history protects first-payment offers even if an earlier webhook was missed.
  for await (const invoice of stripe.invoices.list({ customer: user.stripeCustomerId, status: "paid", limit: 100 })) {
    if (invoice.amount_paid > 0 && invoiceSubscription(invoice)) throw new ReferralError("Referral discounts are for new paid members only.");
  }
}

function pricedOffer(redemption, plan) {
  const amounts = referralAmounts(Math.round(plan.price * 100), redemption.discountPercent, redemption.commissionPercent);
  if (amounts.discountCents < 1 || amounts.totalCents < 1) throw new ReferralError("This referral discount does not apply to the selected membership price.");
  return { redemption, ...amounts };
}

export async function referralOffer(user, code, plan, { repository = referralRepository, now = new Date(), reserve = false } = {}) {
  if (!code) return null;
  if (plan.price <= 0) {
    if (code) throw new ReferralError("Referral coupons apply to paid memberships only.");
    return null;
  }
  const existing = await repository.redemption(String(user._id));
  if (existing) {
    if (code && code !== existing.code) throw new ReferralError("A referral coupon is already reserved for this account.");
    if (existing.firstPaymentId || hasPaidMembership(user)) throw new ReferralError("Referral discounts are for the first paid membership payment only.");
    await resolveReferral(existing.code, { repository, userId: user._id, email: user.email, now });
    return pricedOffer(existing, plan);
  }
  if (!code) return null;
  if (hasPaidMembership(user)) throw new ReferralError("Referral discounts are for new paid members only.");
  const affiliate = await resolveReferral(code, { repository, userId: user._id, email: user.email, now });
  const terms = { affiliateId: affiliate._id, code: affiliate.code, discountPercent: affiliate.discountPercent, commissionPercent: affiliate.commissionPercent, commissionMode: affiliate.commissionMode };
  let redemption = { _id: String(user._id), ...terms };
  if (reserve) {
    try { redemption = await repository.reserve(String(user._id), terms); }
    catch (error) { if (error.code !== 11000) throw error; redemption = await repository.redemption(String(user._id)); }
    if (!redemption || redemption.code !== code || redemption.firstPaymentId) throw new ReferralError("The referral selection changed. Refresh before paying.");
  }
  return pricedOffer(redemption, plan);
}

export async function recordReferralPayment({ userId, paymentId, method, first, baseCents, planName, paidAt }, { repository = referralRepository } = {}) {
  const redemption = await repository.redemption(String(userId));
  if (!redemption || !Number.isSafeInteger(baseCents) || baseCents <= 0) return;
  if (!first && redemption.commissionMode !== "recurring") return;
  const affiliate = await repository.affiliate({ _id: redemption.affiliateId });
  if (!affiliate?.enabled || !(await referralOwner(affiliate, repository, paidAt)).eligible) return;
  if (affiliate.userId === String(userId)) return;
  if (first) {
    await repository.firstPayment(String(userId), paymentId, paidAt);
    const claimed = await repository.redemption(String(userId));
    if (claimed.firstPaymentId !== paymentId) return;
  }
  await repository.reward({ _id: paymentId, affiliateId: redemption.affiliateId, referredUserId: String(userId), code: redemption.code, method, planName, baseCents, rewardCents: Math.round(baseCents * redemption.commissionPercent / 100), paymentAt: paidAt });
}

export async function recordStripeReferral(invoice, stripe, options = {}) {
  const subscriptionId = invoiceSubscription(invoice);
  if (!subscriptionId || invoice.status !== "paid" || invoice.currency !== "usd" || !["subscription_create", "subscription_cycle"].includes(invoice.billing_reason)) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.referralRedemptionId;
  if (!userId || subscription.metadata?.aevioraUserId !== userId) return;
  const repository = options.repository || referralRepository;
  const user = await repository.user(userId);
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!user || user.stripeCustomerId !== customerId) return;
  const membershipPrice = subscription.items?.data?.[0]?.price?.unit_amount;
  const baseCents = Math.max(0, Math.min(invoice.amount_paid, invoice.total_excluding_tax ?? invoice.total, Number.isSafeInteger(membershipPrice) ? membershipPrice : Infinity));
  await recordReferralPayment({ userId, paymentId: `stripe:${invoice.id}`, method: "stripe", first: invoice.billing_reason === "subscription_create", baseCents, planName: subscription.metadata.membershipName || "Membership", paidAt: new Date((invoice.status_transitions?.paid_at || invoice.created) * 1000) }, { repository });
  // Read current provider state, so refund-before-payment delivery and webhook replays are safe.
  if (!options.skipReversals) await reconcileStripeReferralRefunds(invoice, stripe);
}

export async function reconcileStripeReferralRefunds(invoice, stripe, { rewards = ReferralReward } = {}) {
  const reward = await rewards.findById(`stripe:${invoice.id}`);
  if (!reward || invoice.amount_paid <= 0) return;
  let refundedCents = 0, disputed = false;
  const seen = new Set();
  for await (const payment of stripe.invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 100 })) {
    let charge;
    if (payment.payment?.payment_intent) {
      const id = typeof payment.payment.payment_intent === "string" ? payment.payment.payment_intent : payment.payment.payment_intent.id;
      const intent = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
      charge = intent.latest_charge;
    } else charge = payment.payment?.charge;
    if (typeof charge === "string") charge = await stripe.charges.retrieve(charge);
    if (!charge || seen.has(charge.id)) continue;
    seen.add(charge.id);
    refundedCents += charge.amount_refunded || 0;
    disputed ||= Boolean(charge.disputed);
  }
  const reversedCents = disputed ? reward.rewardCents : Math.min(reward.rewardCents, Math.round(reward.rewardCents * refundedCents / invoice.amount_paid));
  if (reversedCents > 0) await rewards.updateOne({ _id: reward._id }, { $max: { reversedCents } });
}

export async function handleStripeReferralEvent(event, stripe) {
  const object = event.data.object;
  if (event.type === "invoice.paid") return recordStripeReferral(await stripe.invoices.retrieve(object.id), stripe);
  if (!["charge.refunded", "charge.dispute.created"].includes(event.type)) return;
  const charge = await stripe.charges.retrieve(event.type === "charge.refunded" ? object.id : typeof object.charge === "string" ? object.charge : object.charge.id);
  if (charge.invoice) return recordStripeReferral(await stripe.invoices.retrieve(typeof charge.invoice === "string" ? charge.invoice : charge.invoice.id), stripe);
  const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!intent) return;
  for await (const payment of stripe.invoicePayments.list({ payment: { type: "payment_intent", payment_intent: intent }, status: "paid", limit: 100 })) {
    await recordStripeReferral(await stripe.invoices.retrieve(typeof payment.invoice === "string" ? payment.invoice : payment.invoice.id), stripe);
  }
}

export async function recordZelleReferrals(user, options = {}) {
  if (!user?.referralCode) return;
  for (const [index, payment] of (user.zelle?.payments || []).entries()) {
    if (!payment.reference || !payment.confirmedAt) continue;
    await recordReferralPayment({ userId: user._id, paymentId: `zelle:${user._id}:${new Date(payment.periodStart).toISOString()}`, method: "zelle", first: index === 0 && !user.stripePaidInvoiceId, baseCents: Math.round(payment.amount * 100), planName: user.zelle.name || "Membership", paidAt: new Date(payment.confirmedAt) }, options);
  }
}

export function rewardSummary(rewards) {
  return rewards.reduce((total, reward) => {
    total.earnedCents += reward.rewardCents;
    total.reversedCents += reward.reversedCents || 0;
    total.paidCents += reward.paidCents || 0;
    total.balanceCents = total.earnedCents - total.reversedCents - total.paidCents;
    return total;
  }, { earnedCents: 0, reversedCents: 0, paidCents: 0, balanceCents: 0 });
}
