import test from "node:test";
import assert from "node:assert/strict";
import { memberStatus } from "../services/memberStatus.js";
import { nextBillingDate } from "../../shared/zelle.js";
import { syncMembership } from "../services/syncMembership.js";

test("30-day periods cross month ends and DST without gaining or losing hours", () => {
  for (const start of ["2026-01-31T00:00:00Z", "2026-03-01T00:00:00-05:00", "2028-02-01T12:00:00Z"]) assert.equal(nextBillingDate(start) - new Date(start), 30 * 86400000);
});
test("failed renewals and cancellation never extend or shorten verified paid access", async () => {
  const end = new Date("2026-11-01T00:00:00Z");
  const user = { _id: "test", stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test", stripePaidThrough: end, membershipPlanId: "111111111111111111111111", membershipName: "Bronze" };
  const sub = { id: "sub_test", customer: "cus_test", status: "past_due", latest_invoice: { status: "open" }, items: { data: [{ current_period_end: end.getTime() / 1000 + 30 * 86400 }] } };
  const refreshed = await syncMembership(user, { subscriptions: { retrieve: async () => sub } }, { findOneAndUpdate: async (_, update) => ({ ...user, ...update.$set }) });
  assert.equal(refreshed.stripePaidThrough, end);
  assert.equal(memberStatus(refreshed, new Date("2026-10-31T23:59:59Z")).subscribed, true);
  assert.equal(memberStatus(refreshed, end).subscribed, false);
  assert.equal(memberStatus({ ...user, stripeSubscriptionId: null, subscriptionStatus: "canceled" }, new Date("2026-10-31T23:59:59Z")).subscribed, true);
});
