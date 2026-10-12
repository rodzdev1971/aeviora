export function zellePaidThrough(zelle) {
  const ends = (zelle?.payments || []).map((payment) => new Date(payment.periodEnd).getTime()).filter(Number.isFinite);
  return ends.length ? new Date(Math.max(...ends)) : null;
}

export function stripePeriod(subscription) {
  const ends = (subscription.items?.data || []).map((item) => item.current_period_end).filter(Number.isFinite);
  const end = ends.length ? Math.min(...ends) : subscription.current_period_end;
  return {
    stripePeriodEnd: end ? new Date(end * 1000) : null,
    stripeCancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end || subscription.cancel_at),
  };
}

export async function changeStripeRenewal(user, stripe, cancel) {
  if (!user?.stripeSubscriptionId || !user.stripeCustomerId) throw new Error("No Stripe membership to update.");
  const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (customer !== user.stripeCustomerId) throw new Error("Membership ownership could not be verified.");
  if (!["active", "trialing", "past_due"].includes(subscription.status)) throw new Error("This subscription has ended or cannot be updated. Refresh your membership.");
  if (!cancel && (subscription.status === "past_due" || !subscription.cancel_at_period_end)) throw new Error("Only a scheduled cancellation can be reactivated here. Review unpaid invoices separately.");
  return stripe.subscriptions.update(subscription.id, { cancel_at_period_end: cancel, proration_behavior: "none" });
}

export async function membershipPortalConfig(stripe) {
  for await (const config of stripe.billingPortal.configurations.list({ active: true, limit: 100 })) {
    if (config.metadata?.aevioraPolicy === "paid-period-v1" && config.features?.subscription_cancel?.mode === "at_period_end") return config.id;
  }
  const config = await stripe.billingPortal.configurations.create({
    metadata: { aevioraPolicy: "paid-period-v1" },
    features: { invoice_history: { enabled: true }, payment_method_update: { enabled: true }, subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" } },
  }, { idempotencyKey: "aeviora-paid-period-portal-v1" });
  return config.id;
}
