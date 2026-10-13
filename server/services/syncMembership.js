import { stripePeriod } from "./membershipPeriods.js";

export async function syncMembership(user, stripe, users) {
  if (!user.stripeCustomerId || ["pending", "active"].includes(user.zelle?.status)) return user;
  let subscription;
  if (user.stripeSubscriptionId) subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, { expand: ["latest_invoice"] });
  else {
    const subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 100 });
    subscription = subscriptions.data.find((item) => item.metadata?.aevioraUserId === String(user._id) && !["canceled", "incomplete_expired"].includes(item.status));
  }
  if (!subscription) return user;
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (customer !== user.stripeCustomerId) throw new Error("Subscription customer mismatch");
  const ended = ["canceled", "incomplete_expired"].includes(subscription.status);
  let invoice = subscription.latest_invoice;
  if (typeof invoice === "string") invoice = await stripe.invoices.retrieve(invoice);
  const item = subscription.items?.data?.[0];
  const paid = invoice?.status === "paid" && !subscription.pending_update;
  const planId = paid ? item?.price?.metadata?.membershipPlanId || subscription.metadata?.membershipPlanId : user.membershipPlanId;
  const planName = paid ? item?.price?.metadata?.membershipName || subscription.metadata?.membershipName : user.membershipName;
  const periodEnd = item?.current_period_end || subscription.current_period_end;
  const periodStart = item?.current_period_start || subscription.current_period_start;
  const keepPaid = (user.stripePaidThrough && new Date(user.stripePaidThrough) > new Date()) || (paid && periodEnd * 1000 > Date.now());
  const update = {
    ...stripePeriod(subscription),
    stripeSubscriptionId: ended ? null : subscription.id,
    subscriptionStatus: subscription.status,
    membershipPlanId: ended && !keepPaid ? null : /^[a-f\d]{24}$/i.test(planId || "") ? planId : user.membershipPlanId || null,
    membershipName: ended && !keepPaid ? "" : planName || user.membershipName || "Existing membership",
  };
  if (paid && periodEnd && periodStart && (!user.stripePaidThrough || periodEnd * 1000 >= new Date(user.stripePaidThrough).getTime())) {
    Object.assign(update, { stripePaidThrough: new Date(periodEnd * 1000), stripePaidStart: new Date(periodStart * 1000), stripePaidInvoiceId: invoice.id });
    if (Number.isFinite(item?.price?.unit_amount)) update.stripePaidPrice = item.price.unit_amount / 100;
  }
  const completedUpgrade = paid && Boolean(user.upgradeQuote?.priceId) && user.upgradeQuote.priceId === item?.price?.id && user.upgradeQuote.state !== "complete";
  if (completedUpgrade) {
    update["upgradeQuote.state"] = "complete";
    update.lastMembershipChangePlanId = String(planId);
  }
  if (user.upgradeQuote?.state === "executing" && !subscription.pending_update && new Date(user.upgradeQuote.expiresAt).getTime() + 86400000 < Date.now() && user.upgradeQuote.priceId !== item?.price?.id) update["upgradeQuote.state"] = "expired";
  const mutation = { $set: update };
  if (completedUpgrade) mutation.$max = { lastMembershipChangeAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date() };
  return await users.findOneAndUpdate({ _id: user._id, stripeCustomerId: user.stripeCustomerId, "zelle.status": { $nin: ["pending", "active"] } }, mutation, { new: true }) || user;
}
