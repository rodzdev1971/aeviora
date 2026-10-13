import test from "node:test";
import assert from "node:assert/strict";
import { memberStatus } from "../services/memberStatus.js";

test("accounts without a subscription and canceled accounts display Free membership", () => {
  for (const user of [{}, { membershipName: "Gold" }, { stripeSubscriptionId: "sub_test", subscriptionStatus: "canceled" }]) {
    assert.deepEqual(memberStatus(user), { subscribed: false, pending: false, current: { planId: null, name: "Free membership", status: "free" } });
  }
});
test("subscription status alone cannot grant paid access; the selected plan stays visible while awaiting payment", () => {
  for (const status of ["active", "trialing", "past_due", "incomplete"]) {
    const result = memberStatus({ stripeSubscriptionId: "sub_test", subscriptionStatus: status, membershipName: "Silver", membershipPlanId: "plan_test" });
    assert.equal(result.subscribed, false);
    assert.equal(result.pending, true);
    assert.equal(result.current.planId, "plan_test");
    assert.equal(result.current.name, "Silver");
    assert.equal(result.current.status, "Awaiting payment");
  }
  assert.equal(memberStatus({ stripeSubscriptionId: "sub_test", subscriptionStatus: "active" }).current.name, "Existing membership");
});
