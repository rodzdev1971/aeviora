import { nextBillingDate } from "../../shared/zelle.js";

export function zelleBalance(zelle, now = new Date()) {
  // Legacy cancellations do not store the cancellation date needed to calculate arrears.
  if (zelle?.status === "canceled" && zelle.dueAt) return { amount: null, periods: null };
  if (!["pending", "active"].includes(zelle?.status) || !zelle.dueAt) return { amount: 0, periods: 0 };
  let date = new Date(zelle.dueAt), periods = 0;
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(zelle.price)) throw new Error("Invalid billing record");
  while (date <= now) { periods++; date = nextBillingDate(date); }
  return { amount: Math.round(zelle.price * 100) * periods / 100, periods };
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
