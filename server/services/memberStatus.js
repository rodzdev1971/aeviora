import { zellePaidThrough } from "./membershipPeriods.js";

export function memberStatus(user, now = new Date()) {
  const paidThrough = zellePaidThrough(user.zelle);
  if (user.zelle?.status === "canceled" && paidThrough > now) return { subscribed: true, pending: false, current: { planId: user.zelle.planId, name: user.zelle.name, status: "active — renewal canceled", paymentMethod: "zelle", paidThrough, cancelAtPeriodEnd: true, dueAt: paidThrough, price: user.zelle.price } };
  if (["pending", "active"].includes(user.zelle?.status)) {
    const active = paidThrough > now;
    return { subscribed: active, pending: !active, current: { planId: user.zelle.planId, name: user.zelle.name, status: active ? "active" : "Awaiting Zelle payment confirmation", paymentMethod: "zelle", paidThrough, dueAt: user.zelle.dueAt, price: user.zelle.price } };
  }
  const subscribed = new Date(user.stripePaidThrough || 0) > now;
  const awaitingPayment = Boolean(user.stripeSubscriptionId) && !["canceled", "incomplete_expired", "inactive"].includes(user.subscriptionStatus);
  return { subscribed, pending: !subscribed && awaitingPayment, current: subscribed || awaitingPayment
    ? { planId: user.membershipPlanId, name: user.membershipName || "Existing membership", status: subscribed ? "active" : "Awaiting payment", paidThrough: user.stripePaidThrough, price: user.stripePaidPrice, periodEnd: user.stripePeriodEnd, cancelAtPeriodEnd: user.stripeCancelAtPeriodEnd || !user.stripeSubscriptionId, paymentMethod: "stripe" }
    : { planId: null, name: "Free membership", status: "free" } };
}
