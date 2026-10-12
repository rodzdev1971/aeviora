import test from "node:test";
import assert from "node:assert/strict";
import { syncMembership } from "../services/syncMembership.js";

test("recovers a paid plan when its checkout webhook has not arrived", async () => {
  const user = { _id: "user-test", stripeCustomerId: "cus_test" };
  const subscription = { id: "sub_test", customer: "cus_test", status: "active", metadata: { aevioraUserId: "user-test", membershipPlanId: "111111111111111111111111", membershipName: "Gold" } };
  const result = await syncMembership(user, { subscriptions: { list: async () => ({ data: [subscription] }) } }, { findOneAndUpdate: async (filter, update) => {
    assert.equal(filter.stripeCustomerId, "cus_test"); return { ...user, ...update.$set };
  } });
  assert.equal(result.membershipName, "Gold"); assert.equal(result.subscriptionStatus, "active");
});
test("reconciles cancellation and rejects another customer's subscription", async () => {
  const user = { _id: "user-test", stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test" };
  const subscription = { id: "sub_test", customer: "cus_test", status: "canceled" };
  const stripe = { subscriptions: { retrieve: async () => subscription } };
  const users = { findOneAndUpdate: async (_, update) => ({ ...user, ...update.$set }) };
  assert.equal((await syncMembership(user, stripe, users)).membershipPlanId, null);
  subscription.customer = "cus_other";
  await assert.rejects(syncMembership(user, stripe, users), /mismatch/);
});
