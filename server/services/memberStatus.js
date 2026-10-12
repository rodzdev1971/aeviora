export function memberStatus(user) {
  if (["pending", "active"].includes(user.zelle?.status)) return { subscribed: true, current: { planId: user.zelle.planId, name: user.zelle.name, status: user.zelle.status === "pending" ? "Awaiting Zelle payment confirmation" : "active", paymentMethod: "zelle", dueAt: user.zelle.dueAt, price: user.zelle.price } };
  const subscribed = Boolean(user.stripeSubscriptionId) && !["canceled", "incomplete_expired", "inactive"].includes(user.subscriptionStatus);
  return { subscribed, current: subscribed
    ? { planId: user.membershipPlanId, name: user.membershipName || "Existing membership", status: user.subscriptionStatus }
    : { planId: null, name: "Free membership", status: "free" } };
}
