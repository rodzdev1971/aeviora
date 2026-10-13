import { stripePeriod } from "./membershipPeriods.js";

export function fiveDaysBefore(date, now = new Date()) {
  const utcDay = (value) => Math.floor(new Date(value).getTime() / 86400000);
  return utcDay(date) - utcDay(now) === 5;
}

export async function renewalReminder(user, { stripe, notices, send, now = new Date(), origin }) {
  if (user.accountStatus !== "active" || !user.stripeSubscriptionId) return "skipped";
  const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const { stripePeriodEnd: renewalAt } = stripePeriod(subscription);
  if (customer !== user.stripeCustomerId || subscription.status !== "active" || subscription.cancel_at_period_end || subscription.cancel_at || !fiveDaysBefore(renewalAt, now)) return "skipped";
  const key = `${subscription.id}:${renewalAt.toISOString()}`;
  let notice;
  try { notice = await notices.create({ key, userId: user._id, renewalAt }); }
  catch (error) { if (error.code === 11000) return "skipped"; throw error; }
  try {
    const item = subscription.items?.data?.[0];
    const amount = item?.price?.unit_amount;
    await send({ to: user.email, subject: "Your Aeviora membership renews in 5 days", text: `Your ${subscription.metadata?.membershipName || user.membershipName || "Aeviora"} membership is scheduled to renew on ${renewalAt.toISOString().replace("T", " ").replace(".000Z", " UTC")}.${Number.isFinite(amount) ? ` The plan price is ${new Intl.NumberFormat("en-US", { style: "currency", currency: item.price.currency || "usd" }).format(amount / 100)} before any taxes or account credits.` : ""} Your saved payment method will be charged automatically. Each new 30-day membership renews every 30 days. You can cancel renewal before that date and retain access through your paid expiration date. Manage your membership: ${origin}/memberships` });
    await notices.updateOne({ _id: notice._id }, { $set: { state: "sent" } });
    return "sent";
  } catch {
    // SMTP timeouts may mean accepted delivery; don't send a duplicate automatically.
    await notices.updateOne({ _id: notice._id }, { $set: { state: "failed" } });
    return "failed";
  }
}
