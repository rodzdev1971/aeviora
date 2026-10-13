import test from "node:test";
import assert from "node:assert/strict";
import { planChangeBlocked, planChangeFilter, nextPlanChangeAt } from "../services/planChangePolicy.js";
import { syncMembership } from "../services/syncMembership.js";

test("plan changes are restricted for exactly 24 hours, not until the next calendar day", () => {
  const user = { lastMembershipChangeAt: "2026-10-12T23:30:00Z" };
  assert.equal(planChangeBlocked(user, new Date("2026-10-13T23:29:59Z")), true);
  assert.equal(planChangeBlocked(user, new Date("2026-10-13T23:30:00Z")), false);
  assert.equal(nextPlanChangeAt(user).toISOString(), "2026-10-13T23:30:00.000Z");
  assert.equal(planChangeBlocked({}), false);
  assert.equal(planChangeFilter(new Date("2026-10-13T23:30:00Z")).$or[1].lastMembershipChangeAt.$lte.toISOString(), user.lastMembershipChangeAt.replace("Z", ".000Z"));
});

test("Stripe starts the limit on paid upgrade completion, not on failed payment or later renewal", async () => {
  const paidAt = Math.floor(Date.now() / 1000);
  const user = { _id: "test", stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test", upgradeQuote: { priceId: "price_upgrade", state: "executing" } };
  const subscription = { id: "sub_test", customer: "cus_test", status: "active", latest_invoice: { id: "in_test", status: "open", status_transitions: { paid_at: paidAt } }, items: { data: [{ price: { id: "price_upgrade", unit_amount: 6000, metadata: { membershipPlanId: "111111111111111111111111" } }, current_period_start: paidAt, current_period_end: paidAt + 30 * 86400 }] } };
  let mutation;
  const deps = [{ subscriptions: { retrieve: async () => subscription } }, { findOneAndUpdate: async (_, update) => { mutation = update; return user; } }];
  await syncMembership(user, ...deps);
  assert.equal(mutation.$max, undefined);
  subscription.latest_invoice.status = "paid";
  await syncMembership(user, ...deps);
  assert.equal(mutation.$max.lastMembershipChangeAt.getTime(), paidAt * 1000);
  assert.equal(mutation.$set["upgradeQuote.state"], "complete");
  user.upgradeQuote.state = "complete";
  await syncMembership(user, ...deps);
  assert.equal(mutation.$max, undefined);
});
