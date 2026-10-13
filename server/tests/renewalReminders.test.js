import test from "node:test";
import assert from "node:assert/strict";
import { fiveDaysBefore, renewalReminder } from "../services/renewalReminders.js";

test("renewal reminders use five UTC calendar days and skip cancellation, inactive users, and duplicate deliveries", async () => {
  const now = new Date("2026-10-12T12:00:00Z"), end = new Date("2026-10-17T06:00:00Z");
  assert.equal(fiveDaysBefore(end, now), true);
  assert.equal(fiveDaysBefore("2026-10-16T23:59:59Z", now), false);
  const subscription = { id: "sub_test", customer: "cus_test", status: "active", items: { data: [{ current_period_end: end.getTime() / 1000, price: { unit_amount: 2000, currency: "usd" } }] } };
  const user = { _id: "synthetic", accountStatus: "active", stripeCustomerId: "cus_test", stripeSubscriptionId: "sub_test", email: "test@example.com" };
  const seen = new Set(); let deliveries = 0;
  const dependencies = { now, origin: "https://example.com", stripe: { subscriptions: { retrieve: async () => subscription } }, notices: { create: async ({ key }) => { if (seen.has(key)) throw Object.assign(new Error("duplicate"), { code: 11000 }); seen.add(key); return { _id: key }; }, updateOne: async () => ({}) }, send: async ({ text }) => { deliveries++; assert.match(text, /renews|scheduled to renew/); assert.match(text, /5|2026-10-17/); } };
  subscription.cancel_at_period_end = true;
  assert.equal(await renewalReminder(user, dependencies), "skipped");
  subscription.cancel_at_period_end = false;
  assert.equal(await renewalReminder({ ...user, accountStatus: "suspended" }, dependencies), "skipped");
  assert.equal(await renewalReminder(user, dependencies), "sent");
  assert.equal(await renewalReminder(user, dependencies), "skipped");
  assert.equal(deliveries, 1);
});
