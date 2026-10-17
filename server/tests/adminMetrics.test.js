import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { subscriberMetrics, subscriberDetails, membershipBucket, subscriberScope } from "../services/adminMetrics.js";
import { createAdminMetricsRouter } from "../routes/adminMetricsRoutes.js";

const now = new Date("2026-10-16T12:00:00Z"), future = new Date("2026-11-16T12:00:00Z"), past = new Date("2026-10-01T12:00:00Z");
const gold = "a".repeat(24), silver = "b".repeat(24), archived = "c".repeat(24), unused = "d".repeat(24);
const account = (id, patch = {}) => ({ _id: id, firstName: "Synthetic", lastName: id, email: `${id}@example.com`, role: "patient", accountStatus: "active", createdAt: new Date("2026-10-15T12:00:00Z"), emailVerificationRequired: true, emailVerifiedAt: now, passwordHash: "never-return", emailVerificationTokenHash: "never-return-token", ...patch });
function fixture() {
  const rows = [account("free"), account("pending", { accountStatus: "pending", emailVerifiedAt: null, emailVerificationExpiresAt: future }),
    account("awaiting", { stripeSubscriptionId: "sub_synthetic", subscriptionStatus: "active", membershipPlanId: gold }),
    account("expired", { accountStatus: "pending", emailVerifiedAt: null, emailVerificationExpiresAt: past }),
    account("legacy", { emailVerificationRequired: false, emailVerifiedAt: null, createdAt: past }),
    account("gold", { stripePaidThrough: future, membershipPlanId: gold, membershipName: "Old Gold name", stripeCancelAtPeriodEnd: true }),
    account("silver", { zelle: { status: "canceled", planId: silver, name: "Silver", payments: [{ periodEnd: future }] } }),
    account("zelle-pending", { stripePaidThrough: future, membershipPlanId: gold, zelle: { status: "pending", planId: silver, payments: [{ periodEnd: past }] } }),
    account("archived", { stripePaidThrough: future, membershipPlanId: archived, membershipName: "Archived plan", createdAt: new Date("2026-10-09T12:00:00Z") }),
    account("staff", { role: "admin" }), account("provider", { role: "provider" }), account("deleted", { accountStatus: "deleted" }), account("suspended", { accountStatus: "suspended" }),
  ];
  return { rows, repository: {
    plans: async () => [{ _id: gold, name: "Gold", price: 100 }, { _id: silver, name: "Silver", price: 50 }, { _id: unused, name: "Bronze", price: 25 }, { _id: "e".repeat(24), name: "Free", price: 0 }],
    accounts: async function* (filter = {}) {
      for (const row of [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b._id.localeCompare(a._id))) {
        if (!subscriberScope.role.$in.includes(row.role) || !subscriberScope.accountStatus.$in.includes(row.accountStatus)) continue;
        if (filter.createdAt && (row.createdAt < filter.createdAt.$gte || row.createdAt > filter.createdAt.$lte)) continue;
        yield row;
      }
    },
  } };
}

test("subscriber totals include Free, current Stripe/Zelle paid access, zero-member plans and archived plans without double counting", async () => {
  const { repository } = fixture();
  const result = await subscriberMetrics({ repository, now });
  assert.equal(result.total, 9); assert.equal(result.free, 6); assert.equal(result.paid, 3); assert.equal(result.awaitingPayment, 2);
  assert.equal(result.plans.reduce((sum, plan) => sum + plan.count, 0), result.total);
  assert.equal(result.plans.find((plan) => plan.id === gold).name, "Gold");
  assert.equal(result.plans.find((plan) => plan.id === archived).name, "Archived plan");
  assert.equal(result.plans.find((plan) => plan.id === unused).count, 0);
  assert.deepEqual(result.signups, { total: 8, verified: 6, unverified: 2, pending: 1, not_verified: 1, legacy: 0 });
  assert.equal((await subscriberMetrics({ repository, now, days: 30 })).signups.legacy, 1);
  assert.equal(membershipBucket(account("expires-now", { stripePaidThrough: now, membershipPlanId: gold }), now).id, "free");
});

test("detail filters paginate consistently, distinguish legacy accounts, and return no credential or billing fields", async () => {
  const { repository } = fixture();
  const allFree = await subscriberDetails({ view: "subscribers", plan: "free", now, repository, page: 1, limit: 2 });
  const next = await subscriberDetails({ view: "subscribers", plan: "free", now, repository, page: 2, limit: 2 });
  assert.equal(allFree.total, 6); assert.equal(allFree.totalPages, 3); assert.equal(allFree.accounts.length, 2);
  assert.ok(next.accounts.every((row) => !allFree.accounts.some((other) => row._id === other._id)));
  const unverified = await subscriberDetails({ view: "signups", verification: "unverified", now, repository });
  assert.equal(unverified.total, 2); assert.ok(unverified.accounts.every((row) => ["pending", "not_verified"].includes(row.verificationStatus)));
  assert.equal((await subscriberDetails({ view: "signups", verification: "legacy", now, repository })).total, 0);
  assert.equal((await subscriberDetails({ view: "subscribers", verification: "legacy", now, repository })).total, 1);
  const paid = await subscriberDetails({ view: "subscribers", plan: gold, now, repository });
  assert.equal(paid.accounts[0].planName, "Gold");
  for (const row of [...allFree.accounts, ...unverified.accounts, ...paid.accounts]) {
    assert.deepEqual(Object.keys(row).sort(), ["_id", "firstName", "lastName", "email", "accountStatus", "createdAt", "verificationStatus", "planId", "planName"].sort());
  }
});

test("metrics endpoints require admin access, accept Vercel routing metadata and validate filters", async (t) => {
  const { repository } = fixture(), audits = [];
  const app = express();
  app.use(createAdminMetricsRouter({ repository, now: () => now, audit: async (entry) => audits.push(entry),
    authenticate: (req, res, next) => { if (!req.headers["x-role"]) return res.sendStatus(401); req.user = { id: "synthetic-admin", role: req.headers["x-role"] }; next(); },
    authorize: (req, res, next) => req.user.role === "admin" ? next() : res.sendStatus(403),
  }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const get = (path, role = "admin") => fetch(`http://127.0.0.1:${server.address().port}${path}`, { headers: role ? { "x-role": role } : {} });
  assert.equal((await get("/", "")).status, 401); assert.equal((await get("/", "patient")).status, 403);
  assert.equal((await get("/accounts?view=signups", "provider")).status, 403);
  const response = await get("/?days=7&path=admin%2Fmetrics"); assert.equal(response.status, 200); assert.equal((await response.json()).total, 9);
  const details = await get("/accounts?view=signups&verification=unverified&days=7"); assert.equal((await details.json()).total, 2);
  for (const path of ["/?days=365", "/?role=admin", "/accounts?view=all", "/accounts?view=signups&limit=101", "/accounts?view=subscribers&plan=forged", "/accounts?view=signups&page=0"]) assert.equal((await get(path)).status, 400, path);
  assert.ok(audits.length >= 2); assert.ok(audits.every((entry) => entry.action === "ADMIN_METRICS_VIEWED" && !entry.metadata?.email));
});
