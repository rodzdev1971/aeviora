import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "../models/users.js";
import ManualPayment from "../models/manualMembershipPayment.js";
import AuditLog from "../models/AuditLog.js";
import router from "../routes/membershipBillingRoutes.js";
import Plan from "../models/membershipPlans.js";

test("admin invoice receipts survive retries without a second payment; balances use live invoice data", async (t) => {
  const prior = { jwt: process.env.JWT_ACCESS_SECRET, stripe: process.env.STRIPE_SECRET_KEY };
  process.env.JWT_ACCESS_SECRET = "synthetic-secret";
  process.env.STRIPE_SECRET_KEY = "sk_test_synthetic";
  t.after(() => {
    for (const [name, value] of [["JWT_ACCESS_SECRET", prior.jwt], ["STRIPE_SECRET_KEY", prior.stripe]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  const member = { _id: "member", accountStatus: "active", stripeCustomerId: "cus_member", zelle: { status: "canceled" } };
  t.mock.method(User, "findById", (id) => id === "admin" ? { select: async () => ({ _id: "admin", accountStatus: "active", role: "admin" }) } : Promise.resolve(member));
  t.mock.method(User, "exists", async () => false);
  t.mock.method(AuditLog, "create", async () => ({}));
  let receipt, creates = 0, failPersist = true;
  t.mock.method(ManualPayment, "findOne", async () => receipt);
  t.mock.method(ManualPayment, "find", async () => receipt ? [receipt] : []);
  t.mock.method(ManualPayment, "create", async (data) => { creates++; receipt = { _id: "receipt", status: "pending", ...data }; return receipt; });
  t.mock.method(ManualPayment, "updateOne", async (_, update) => {
    if (failPersist) { failPersist = false; throw new Error("Synthetic database failure after Stripe success"); }
    Object.assign(receipt, update.$set);
  });
  const stripe = new Stripe("sk_test_synthetic");
  const invoices = Object.getPrototypeOf(stripe.invoices);
  t.mock.method(Object.getPrototypeOf(stripe.subscriptions), "list", async () => ({ data: [] }));
  const invoice = { id: "in_synthetic", customer: "cus_member", subscription: "sub_member", status: "open", currency: "usd", amount_remaining: 2000, amount_paid: 0 };
  t.mock.method(invoices, "retrieve", async () => invoice);
  t.mock.method(invoices, "list", async function* () { yield invoice; });
  const keys = [];
  t.mock.method(invoices, "pay", async (id, params, options) => {
    assert.equal(id, invoice.id);
    assert.deepEqual(params, { paid_out_of_band: true });
    keys.push(options.idempotencyKey);
    invoice.status = "paid"; invoice.amount_remaining = 0; invoice.amount_paid = 2000;
    return invoice;
  });
  const app = express(); app.use(express.json(), cookieParser(), router);
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const headers = { Cookie: `accessToken=${jwt.sign({ userId: "admin" }, process.env.JWT_ACCESS_SECRET)}`, "Content-Type": "application/json" };
  const base = `http://127.0.0.1:${server.address().port}/member`;
  const input = { invoiceId: invoice.id, reference: "bank-synthetic", amountCents: 2000 };
  const post = (body = input) => fetch(`${base}/confirm-invoice`, { method: "POST", headers, body: JSON.stringify(body) });
  const details = await (await fetch(`${base}/details`, { headers })).json();
  assert.equal(details.balances.usd, 2000);
  assert.equal((await post({ ...input, amountCents: 1000 })).status, 409);
  assert.equal(creates, 0);
  assert.equal((await post()).status, 502);
  assert.equal(receipt.status, "pending");
  assert.equal((await post()).status, 200);
  assert.equal(receipt.status, "confirmed");
  assert.equal(receipt.confirmedBy, "admin");
  assert.equal(creates, 1);
  assert.deepEqual(keys, ["aeviora-zelle-receipt", "aeviora-zelle-receipt"]);
  assert.equal((await post()).status, 200);
  assert.equal(keys.length, 2);
  assert.equal((await post({ ...input, reference: "different" })).status, 409);
  const paid = await (await fetch(`${base}/details`, { headers })).json();
  assert.deepEqual(paid.balances, {});
  assert.equal(paid.invoices[0].method, "Zelle");
  t.mock.method(invoices, "list", () => { throw new Error("Synthetic Stripe outage"); });
  assert.equal((await fetch(`${base}/details`, { headers })).status, 502);
});

test("a former Stripe member can choose Zelle after a stale canceled subscription is reconciled", async (t) => {
  const priorJwt = process.env.JWT_ACCESS_SECRET, priorStripe = process.env.STRIPE_SECRET_KEY;
  process.env.JWT_ACCESS_SECRET = "synthetic-secret"; process.env.STRIPE_SECRET_KEY = "sk_test_synthetic";
  t.after(() => {
    if (priorJwt === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = priorJwt;
    if (priorStripe === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = priorStripe;
  });
  const account = { _id: "member", role: "patient", accountStatus: "active", stripeCustomerId: "cus_member", stripeSubscriptionId: "sub_old", zelle: { status: "canceled" } };
  t.mock.method(User, "findById", () => ({ select: async () => account, then: (resolve) => resolve(account) }));
  t.mock.method(Plan, "findById", async () => ({ _id: "111111111111111111111111", name: "Bronze", price: 20 }));
  t.mock.method(User, "findOneAndUpdate", async (filter, update) => {
    if (filter.stripeSubscriptionId === null) {
      assert.equal(account.stripeSubscriptionId, null);
      assert.equal(update.$set["zelle.status"], "pending");
      return account;
    }
    Object.assign(account, update.$set); return account;
  });
  const stripe = new Stripe("sk_test_synthetic");
  t.mock.method(Object.getPrototypeOf(stripe.subscriptions), "list", async () => ({ data: [{ status: "canceled" }] }));
  t.mock.method(Object.getPrototypeOf(stripe.subscriptions), "retrieve", async () => ({ id: "sub_old", customer: "cus_member", status: "canceled" }));
  t.mock.method(Object.getPrototypeOf(stripe.checkout.sessions), "list", async () => ({ data: [] }));
  const app = express(); app.use(express.json(), cookieParser(), router);
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/zelle`, { method: "POST", headers: { Cookie: `accessToken=${jwt.sign({ userId: "member" }, process.env.JWT_ACCESS_SECRET)}`, "Content-Type": "application/json" }, body: JSON.stringify({ planId: "111111111111111111111111" }) });
  assert.equal(response.status, 200);
  assert.equal(account.stripeSubscriptionId, null);
});
