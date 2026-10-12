import { zellePaidThrough } from "./membershipPeriods.js";

export function memberStatus(user, now = new Date()) {
  const paidThrough = zellePaidThrough(user.zelle);
  if (user.zelle?.status === "canceled" && paidThrough > now) return { subscribed: true, pending: false, current: { planId: user.zelle.planId, name: user.zelle.name, status: "active — renewal canceled", paymentMethod: "zelle", paidThrough, cancelAtPeriodEnd: true, dueAt: paidThrough, price: user.zelle.price } };
  if (["pending", "active"].includes(user.zelle?.status)) return { subscribed: user.zelle.status === "active", pending: user.zelle.status === "pending", current: { planId: user.zelle.planId, name: user.zelle.name, status: user.zelle.status === "pending" ? "Awaiting Zelle payment confirmation" : "active", paymentMethod: "zelle", dueAt: user.zelle.dueAt, price: user.zelle.price } };
  const subscribed = Boolean(user.stripeSubscriptionId) && !["canceled", "incomplete_expired", "inactive"].includes(user.subscriptionStatus);
  return { subscribed, current: subscribed
    ? { planId: user.membershipPlanId, name: user.membershipName || "Existing membership", status: user.subscriptionStatus, periodEnd: user.stripePeriodEnd, cancelAtPeriodEnd: user.stripeCancelAtPeriodEnd, paymentMethod: "stripe" }
    : { planId: null, name: "Free membership", status: "free" } };
}
