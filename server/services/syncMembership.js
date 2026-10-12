export async function syncMembership(user, stripe, users) {
  if (!user.stripeCustomerId || ["pending", "active"].includes(user.zelle?.status)) return user;
  let subscription;
  if (user.stripeSubscriptionId) subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  else {
    const subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 100 });
    subscription = subscriptions.data.find((item) => item.metadata?.aevioraUserId === String(user._id) && !["canceled", "incomplete_expired"].includes(item.status));
  }
  if (!subscription) return user;
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (customer !== user.stripeCustomerId) throw new Error("Subscription customer mismatch");
  const ended = ["canceled", "incomplete_expired"].includes(subscription.status);
  const planId = subscription.metadata?.membershipPlanId;
  const update = {
    stripeSubscriptionId: ended ? null : subscription.id,
    subscriptionStatus: subscription.status,
    membershipPlanId: ended ? null : /^[a-f\d]{24}$/i.test(planId || "") ? planId : user.membershipPlanId || null,
    membershipName: ended ? "" : subscription.metadata?.membershipName || user.membershipName || "Existing membership",
  };
  return await users.findOneAndUpdate({ _id: user._id, stripeCustomerId: user.stripeCustomerId, "zelle.status": { $nin: ["pending", "active"] } }, { $set: update }, { new: true }) || user;
}
