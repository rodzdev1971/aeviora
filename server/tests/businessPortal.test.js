import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { BusinessAffiliate } from "../models/referrals.js";
import AuditLog from "../models/AuditLog.js";
import User from "../models/users.js";
import { requireAuth } from "../middleware/auth.js";
import { createBusinessPortalRouter } from "../routes/businessPortalRoutes.js";
import { requestBusinessLogin, consumeBusinessLogin, businessLoginDigest, businessSessionAudience } from "../services/businessPortal.js";

const now = new Date("2026-10-24T12:00:00Z");
const primaryId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const foreignId = "00000000-0000-4000-8000-000000000003";
function fixture() {
  const base = { businessName: "Synthetic business", contactName: "Synthetic contact", email: "business@example.com", code: "B2B-SYNTHETIC", phone: "", website: "", kind: "business", enabled: true, discountPercent: 10, commissionPercent: 20, commissionMode: "recurring", portalSessionVersion: 0 };
  const rows = [{ ...base, _id: primaryId }, { ...base, _id: secondId, businessName: "Second business", code: "B2B-SECOND" }, { ...base, _id: foreignId, email: "other@example.com", code: "B2B-FOREIGN" }];
  const messages = [];
  const activity = [{ _id: "stripe:private-invoice", referredUserId: "private-customer", affiliateId: primaryId, code: base.code, method: "stripe", planName: "Synthetic membership", baseCents: 900, rewardCents: 180, reversedCents: 0, paidCents: 100, paymentAt: now, paidAt: now, payoutReference: "synthetic-payout", paidBy: "private-admin", voidReason: "private-internal-note" },
    { _id: "zelle:private-user:private-bank", affiliateId: primaryId, code: base.code, rewardCents: 200, reversedCents: 200, paidCents: 0 },
    { _id: "private-other-payment", affiliateId: foreignId, rewardCents: 9900 }];
  const match = (row, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((item) => match(row, item));
    if (key === "$expr") return row.email === row.portalLoginEmail;
    if (value && typeof value === "object" && "$exists" in value) return (row[key] !== undefined) === value.$exists;
    if (value?.$gt) return new Date(row[key]) > value.$gt;
    if (value?.$lte) return new Date(row[key]) <= value.$lte;
    return row[key] === value;
  });
  const query = (value) => {
    const promise = Promise.resolve(structuredClone(value));
    for (const key of ["sort", "select", "lean"]) promise[key] = () => promise;
    promise.skip = (count) => query(value.slice(count));
    promise.limit = (count) => query(value.slice(0, count));
    return promise;
  };
  const update = (filter, change) => {
    const row = rows.find((item) => match(item, filter));
    if (!row) return null;
    Object.assign(row, change.$set);
    for (const key of Object.keys(change.$unset || {})) delete row[key];
    for (const [key, value] of Object.entries(change.$inc || {})) row[key] = (row[key] || 0) + value;
    return row;
  };
  const businesses = {
    findOne: (filter) => query(rows.find((row) => match(row, filter))),
    find: (filter) => query(rows.filter((row) => match(row, filter))),
    findOneAndUpdate: (filter, change) => query(update(filter, change)),
    updateOne: async (filter, change) => update(filter, change),
  };
  const rewards = {
    find: (filter) => query(activity.filter((row) => match(row, filter))),
    countDocuments: async (filter) => activity.filter((row) => match(row, filter)).length,
    aggregate: async (pipeline) => {
      const totals = activity.filter((row) => match(row, pipeline[0].$match)).reduce((sum, row) => ({ earnedCents: sum.earnedCents + row.rewardCents, reversedCents: sum.reversedCents + (row.reversedCents || 0), paidCents: sum.paidCents + (row.paidCents || 0) }), { earnedCents: 0, reversedCents: 0, paidCents: 0 });
      return [totals];
    },
  };
  const redemptions = { countDocuments: async (filter) => { assert.ok(rows.some((row) => row._id === filter.affiliateId)); return filter.affiliateId === primaryId ? 3 : 0; } };
  return { businesses, rows, rewards, redemptions, messages, send: async (message) => messages.push(message), now, origin: "https://example.com", report: () => {} };
}
const tokenFrom = (message) => message.text.match(/#([a-f0-9]{64})/)[1];

test("business sign-in sends a hashed single-use email token and applies a per-business cooldown", async () => {
  const f = fixture();
  assert.equal(await requestBusinessLogin("business@example.com", f), "accepted");
  const token = tokenFrom(f.messages[0]);
  assert.equal(f.rows[0].portalLoginTokenHash, businessLoginDigest(token));
  assert.equal(new Date(f.rows[0].portalLoginExpiresAt) - now, 15 * 60000);
  assert.ok(f.messages[0].text.includes("https://example.com/business-affiliate/login#"));
  assert.equal(await requestBusinessLogin("business@example.com", f), "skipped");
  assert.equal(f.messages.length, 1);
  assert.equal(await requestBusinessLogin("unknown@example.com", f), "skipped");
  assert.equal((await consumeBusinessLogin(token.toUpperCase(), f))._id, primaryId);
  assert.equal(await consumeBusinessLogin(token, f), null);
  for (const field of ["portalLoginTokenHash", "portalLoginEmail", "portalLoginExpiresAt", "portalLoginRequestedAt", "portalSessionVersion"]) assert.equal(BusinessAffiliate.schema.path(field).options.select, false);
});

test("expired, superseded and email-changed sign-in links are rejected", async () => {
  const f = fixture(); await requestBusinessLogin("business@example.com", f);
  const original = tokenFrom(f.messages[0]);
  assert.equal(await consumeBusinessLogin(original, { ...f, now: new Date(now.getTime() + 15 * 60000) }), null);
  assert.equal(await consumeBusinessLogin("123456", f), null);
  await requestBusinessLogin("business@example.com", { ...f, now: new Date(now.getTime() + 61000) });
  const latest = tokenFrom(f.messages[1]);
  assert.equal(await consumeBusinessLogin(original, f), null);
  f.rows[0].email = "changed@example.com";
  assert.equal(await consumeBusinessLogin(latest, f), null);
});

test("mail failure invalidates the unsent link and allows an immediate retry", async () => {
  const f = fixture();
  assert.equal(await requestBusinessLogin("business@example.com", { ...f, send: async () => { throw new Error("synthetic SMTP failure"); } }), "failed");
  assert.equal(f.rows[0].portalLoginTokenHash, undefined);
  assert.equal(f.rows[0].portalLoginRequestedAt, undefined);
  assert.equal(await requestBusinessLogin("business@example.com", f), "accepted");
  assert.equal(await requestBusinessLogin("business@example.com", { ...f, origin: "http://example.com" }), "failed");
});

test("business portal sessions enforce ownership, privacy, audience and sign-out revocation", async (t) => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  const previousMode = process.env.NODE_ENV;
  process.env.JWT_ACCESS_SECRET = "synthetic-business-portal-secret";
  process.env.NODE_ENV = "production";
  t.after(() => { if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previousSecret; if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode; });
  t.mock.method(AuditLog, "create", async () => ({}));
  t.mock.method(User, "findById", () => ({ select: async () => null }));
  const f = fixture();
  const app = express(); app.use(express.json(), cookieParser());
  app.use("/portal", createBusinessPortalRouter({ ...f, requestLogin: (email) => requestBusinessLogin(email, f), consumeLogin: (token) => consumeBusinessLogin(token, f) }));
  app.get("/patient", requireAuth, (req, res) => res.json({ private: true }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, { body, cookie, method = body ? "POST" : "GET" } = {}) => fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await request("/portal/me")).status, 401);
    const unknown = await (await request("/portal/request-login", { body: { email: "unknown@example.com" } })).json();
    const known = await (await request("/portal/request-login", { body: { email: " BUSINESS@EXAMPLE.COM " } })).json();
    assert.deepEqual(unknown, known, "request response does not disclose registered businesses");
    const token = tokenFrom(f.messages[0]);
    const signedIn = await request("/portal/login", { body: { token } });
    assert.equal(signedIn.status, 200);
    const header = signedIn.headers.get("set-cookie");
    assert.match(header, /HttpOnly/); assert.match(header, /Secure/); assert.match(header, /SameSite=Lax/); assert.match(header, /Path=\/api\/business-portal/);
    const cookie = header.split(";")[0];
    const claims = jwt.verify(cookie.split("=")[1], process.env.JWT_ACCESS_SECRET, { audience: businessSessionAudience });
    assert.equal(claims.userId, undefined); assert.equal(claims.exp - claims.iat, 3600);
    assert.equal((await request("/portal/login", { body: { token } })).status, 401);
    const response = await request("/portal/me?page=1&path=business-portal", { cookie });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.business._id, primaryId); assert.equal(data.businesses.length, 2);
    assert.equal(data.referredCheckouts, 3); assert.equal(data.total, 2); assert.equal(data.page, 1);
    assert.deepEqual(data.summary, { earnedCents: 380, reversedCents: 200, paidCents: 100, balanceCents: 80 });
    assert.equal(data.rewards[0].payoutReference, "synthetic-payout");
    const nextPage = await (await request("/portal/me?page=2", { cookie })).json();
    assert.deepEqual(nextPage.summary, data.summary); assert.equal(nextPage.total, 2); assert.equal(nextPage.rewards.length, 0);
    const serialized = JSON.stringify(data);
    for (const secret of ["private-customer", "private-invoice", "private-bank", "private-admin", "private-internal-note", "other@example.com", "portalLoginTokenHash", "portalSessionVersion"]) assert.ok(!serialized.includes(secret), secret);
    assert.equal((await request(`/portal/me?businessId=${foreignId}`, { cookie })).status, 404);
    assert.equal((await request(`/portal/me?businessId=${secondId}`, { cookie })).status, 200);
    assert.equal((await request("/portal/me?page=0", { cookie })).status, 400);
    assert.equal((await request("/patient", { cookie })).status, 401);
    assert.equal((await request("/patient", { cookie: `accessToken=${cookie.split("=")[1]}` })).status, 401);
    const userToken = jwt.sign({ userId: "admin", role: "admin" }, process.env.JWT_ACCESS_SECRET);
    assert.equal((await request("/portal/me", { cookie: `businessPortalSession=${userToken}` })).status, 401);
    const expired = jwt.sign({ email: f.rows[0].email, sessionVersion: 0 }, process.env.JWT_ACCESS_SECRET, { subject: primaryId, audience: businessSessionAudience, expiresIn: -1 });
    assert.equal((await request("/portal/me", { cookie: `businessPortalSession=${expired}` })).status, 401);
    f.rows[0].email = "changed@example.com";
    assert.equal((await request("/portal/me", { cookie })).status, 401);
    f.rows[0].email = "business@example.com";
    assert.equal((await request("/portal/logout", { cookie, method: "POST" })).status, 200);
    assert.equal((await request("/portal/me", { cookie })).status, 401);
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
