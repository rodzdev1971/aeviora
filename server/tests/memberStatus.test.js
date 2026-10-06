import test from "node:test";
import assert from "node:assert/strict";
import { memberStatus } from "../services/memberStatus.js";

test("accounts without a subscription and canceled accounts display Free membership", () => {
  for (const user of [{}, { membershipName: "Gold" }, { stripeSubscriptionId: "sub_test", subscriptionStatus: "canceled" }]) {
    assert.deepEqual(memberStatus(user), { subscribed: false, current: { planId: null, name: "Free membership", status: "free" } });
  }
});
test("current membership preserves its name and payment status; legacy subscribers are not labeled free", () => {
  for (const status of ["active", "trialing", "past_due", "incomplete"]) {
    const result = memberStatus({ stripeSubscriptionId: "sub_test", subscriptionStatus: status, membershipName: "Silver", membershipPlanId: "plan_test" });
    assert.equal(result.subscribed, true);
    assert.deepEqual(result.current, { planId: "plan_test", name: "Silver", status });
  }
  assert.equal(memberStatus({ stripeSubscriptionId: "sub_test", subscriptionStatus: "active" }).current.name, "Existing membership");
});
