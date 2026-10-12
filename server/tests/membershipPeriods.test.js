import test from "node:test";
import assert from "node:assert/strict";
import { changeStripeRenewal, stripePeriod, membershipPortalConfig } from "../services/membershipPeriods.js";
import { memberStatus } from "../services/memberStatus.js";

test("canceled Zelle membership keeps confirmed access only until the exact paid boundary", () => {
  const user = { zelle: { status: "canceled", planId: "plan", name: "Gold", payments: [{ periodEnd: "2026-11-01T12:00:00Z" }] } };
  const before = memberStatus(user, new Date("2026-11-01T11:59:59Z"));
  assert.equal(before.subscribed, true);
  assert.equal(before.current.cancelAtPeriodEnd, true);
  assert.equal(memberStatus(user, new Date("2026-11-01T12:00:00Z")).subscribed, false);
  assert.equal(memberStatus({ zelle: { status: "canceled", dueAt: "2099-01-01" } }).subscribed, false);
});

test("Stripe cancel/reactivate preserves billing anchor and does not create charges or prorations", async () => {
  const user = { stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test" };
  const subscription = { id: "sub_test", customer: "cus_test", status: "active", cancel_at_period_end: false };
  const writes = [];
  const stripe = { subscriptions: { retrieve: async () => subscription, update: async (id, update) => { assert.equal(id, "sub_test"); writes.push(update); Object.assign(subscription, update); return subscription; } } };
  await changeStripeRenewal(user, stripe, true);
  await changeStripeRenewal(user, stripe, false);
  assert.deepEqual(writes, [{ cancel_at_period_end: true, proration_behavior: "none" }, { cancel_at_period_end: false, proration_behavior: "none" }]);
  subscription.status = "canceled";
  await assert.rejects(changeStripeRenewal(user, stripe, false));
  subscription.status = "active"; subscription.customer = "cus_other";
  await assert.rejects(changeStripeRenewal(user, stripe, true), /ownership/);
});

test("Stripe dates support item-level periods and the portal enforces end-of-period cancellation", async () => {
  assert.equal(stripePeriod({ items: { data: [{ current_period_end: 1800000000 }] }, cancel_at_period_end: true }).stripePeriodEnd.getTime(), 1800000000000);
  const stripe = { billingPortal: { configurations: { list: async function* () { yield { id: "unsafe", features: { subscription_cancel: { mode: "immediately" } } }; }, create: async (input) => {
    assert.equal(input.features.subscription_cancel.mode, "at_period_end");
    assert.equal(input.features.subscription_cancel.proration_behavior, "none");
    return { id: "safe" };
  } } } };
  assert.equal(await membershipPortalConfig(stripe), "safe");
});
