import test from "node:test";
import assert from "node:assert/strict";
import { upgradePricing } from "../services/upgradePricing.js";
test("upgrade credits unused paid days against the full new 30-day price", () => {
  assert.deepEqual(upgradePricing(20, 60, "2026-10-31T00:00:00Z", new Date("2026-10-16T00:00:00Z")), { creditCents: 1000, amountCents: 5000 });
  assert.throws(() => upgradePricing(60, 20, "2026-10-31", new Date("2026-10-16")));
  assert.throws(() => upgradePricing(20, 60, "2026-10-15", new Date("2026-10-16")));
  assert.throws(() => upgradePricing(20, 60, "2026-12-31", new Date("2026-10-16")));
});
