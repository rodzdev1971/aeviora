import test from "node:test";
import assert from "node:assert/strict";
import { zelleBalance, validateZelleInvoice } from "../services/billingSummary.js";

test("Zelle balances count unpaid periods, not prepaid future periods or canceled memberships", () => {
  const zelle = { status: "active", price: 20, dueAt: "2026-01-01T00:00:00Z" };
  assert.deepEqual(zelleBalance(zelle, new Date("2026-03-01T00:00:00Z")), { amount: 20, periods: 1 });
  assert.deepEqual(zelleBalance(zelle, new Date("2025-12-31T00:00:00Z")), { amount: 0, periods: 0 });
  assert.deepEqual(zelleBalance({ ...zelle, status: "canceled" }), { amount: null, periods: null });
  assert.deepEqual(zelleBalance({ ...zelle, status: "pending" }, new Date(zelle.dueAt)), { amount: 20, periods: 1 });
});

test("manual invoice payments require ownership, subscription, open USD balance and exact amount", () => {
  const user = { stripeCustomerId: "cus_member" };
  const invoice = { customer: "cus_member", parent: { subscription_details: { subscription: "sub_member" } }, status: "open", currency: "usd", amount_remaining: 2000 };
  assert.doesNotThrow(() => validateZelleInvoice(invoice, user, 2000));
  for (const changed of [{ customer: "cus_other" }, { parent: null }, { status: "paid" }, { currency: "eur" }, { amount_remaining: 0 }]) {
    assert.throws(() => validateZelleInvoice({ ...invoice, ...changed }, user, 2000));
  }
  assert.throws(() => validateZelleInvoice(invoice, user, 1900), /balance changed/);
});
