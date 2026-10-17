import User from "../models/users.js";
import Plan from "../models/membershipPlans.js";
import { memberStatus } from "./memberStatus.js";
import { verificationStatus } from "./emailVerification.js";

export const subscriberScope = { role: { $in: ["user", "patient"] }, accountStatus: { $in: ["pending", "active"] } };
const metricFields = "_id createdAt emailVerificationRequired emailVerificationExpiresAt emailVerifiedAt stripeSubscriptionId subscriptionStatus stripePaidThrough stripePaidPrice membershipPlanId membershipName zelle.status zelle.planId zelle.name zelle.price zelle.dueAt zelle.payments.periodEnd";

export const metricsRepository = {
  plans: () => Plan.find().select("_id name price").sort({ price: 1, name: 1 }).lean(),
  accounts: (filter = {}, details = false) => User.find({ ...subscriberScope, ...filter })
    .select(metricFields + (details ? " firstName lastName email accountStatus" : ""))
    .sort({ createdAt: -1, _id: -1 }).lean().cursor(),
};

export function membershipBucket(user, now) {
  const status = memberStatus(user, now);
  return status.subscribed
    ? { id: status.current.planId ? String(status.current.planId) : "legacy-paid", name: status.current.name || "Existing paid membership" }
    : { id: "free", name: "Free membership" };
}

export async function subscriberMetrics({ days = 7, now = new Date(), repository = metricsRepository } = {}) {
  const plans = await repository.plans();
  const rows = new Map([["free", { id: "free", name: "Free membership", count: 0 }],
    ...plans.filter((plan) => plan.price > 0).map((plan) => [String(plan._id), { id: String(plan._id), name: plan.name, count: 0 }])]);
  const since = new Date(now.getTime() - days * 86400000);
  const signups = { total: 0, verified: 0, unverified: 0, pending: 0, not_verified: 0, legacy: 0 };
  let total = 0, awaitingPayment = 0;
  for await (const user of repository.accounts()) {
    const bucket = membershipBucket(user, now);
    if (!rows.has(bucket.id)) rows.set(bucket.id, { ...bucket, count: 0 });
    rows.get(bucket.id).count++; total++;
    if (memberStatus(user, now).pending) awaitingPayment++;
    if (new Date(user.createdAt) >= since && new Date(user.createdAt) <= now) {
      const verification = verificationStatus(user, now);
      signups.total++; signups[verification]++;
      if (["pending", "not_verified"].includes(verification)) signups.unverified++;
    }
  }
  return { total, paid: total - rows.get("free").count, free: rows.get("free").count, awaitingPayment,
    plans: [...rows.values()], signups, days, since, asOf: now };
}

export async function subscriberDetails({ view, days = 7, plan, verification = "all", page = 1, limit = 25, now = new Date(), repository = metricsRepository }) {
  const catalog = new Map((await repository.plans()).map((item) => [String(item._id), item.name]));
  const since = new Date(now.getTime() - days * 86400000);
  const filter = view === "signups" ? { createdAt: { $gte: since, $lte: now } } : {};
  const accounts = [];
  let total = 0;
  for await (const user of repository.accounts(filter, true)) {
    const bucket = membershipBucket(user, now), status = verificationStatus(user, now);
    if (plan && bucket.id !== plan) continue;
    if (verification === "unverified" ? !["pending", "not_verified"].includes(status) : verification !== "all" && verification !== status) continue;
    if (total >= (page - 1) * limit && accounts.length < limit) accounts.push({
      _id: String(user._id), firstName: user.firstName, lastName: user.lastName, email: user.email,
      accountStatus: user.accountStatus, createdAt: user.createdAt, verificationStatus: status,
      planId: bucket.id, planName: catalog.get(bucket.id) || bucket.name,
    });
    total++;
  }
  return { accounts, total, page, limit, totalPages: Math.ceil(total / limit), asOf: now };
}
