export function zelleAmountDueCents(zelle) {
  const price = Math.round(zelle.price * 100);
  return Math.max(0, price - (zelle.payments?.length ? 0 : zelle.referralDiscountCents || 0));
}

export function zelleBalance(zelle, now = new Date()) {
  // Legacy cancellations do not store the cancellation date needed to calculate arrears.
  if (zelle?.status === "canceled" && zelle.dueAt) return { amount: null, periods: null };
  if (!["pending", "active"].includes(zelle?.status) || !zelle.dueAt) return { amount: 0, periods: 0 };
  const date = new Date(zelle.dueAt);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(zelle.price)) throw new Error("Invalid billing record");
  // Manual renewal does not accrue charges for periods with no paid access.
  const periods = date <= now ? 1 : 0;
  return { amount: zelleAmountDueCents(zelle) * periods / 100, periods };
}

export function invoiceSubscription(invoice) {
  const value = invoice.parent?.subscription_details?.subscription || invoice.subscription;
  return typeof value === "string" ? value : value?.id;
}

export function validateZelleInvoice(invoice, user, amount) {
  const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!user.stripeCustomerId || customer !== user.stripeCustomerId || !invoiceSubscription(invoice)) throw new Error("Invoice does not belong to this member's subscription.");
  if (invoice.status !== "open" || invoice.currency !== "usd" || invoice.amount_remaining <= 0) throw new Error("Only open, unpaid USD membership invoices can be covered by Zelle.");
  if (invoice.amount_remaining !== amount) throw new Error("The balance changed. Refresh before recording payment.");
}
