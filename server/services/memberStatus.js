export function memberStatus(user) {
  const subscribed = Boolean(user.stripeSubscriptionId) && !["canceled", "incomplete_expired", "inactive"].includes(user.subscriptionStatus);
  return { subscribed, current: subscribed
    ? { planId: user.membershipPlanId, name: user.membershipName || "Existing membership", status: user.subscriptionStatus }
    : { planId: null, name: "Free membership", status: "free" } };
}
