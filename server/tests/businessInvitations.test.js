import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import BusinessInvitation from "../models/businessInvitation.js";
import AuditLog from "../models/AuditLog.js";
import router from "../routes/businessInvitationRoutes.js";
import { issueBusinessInvitation, checkBusinessInvitation, completeBusinessInvitation, invitationDigest } from "../services/businessInvitations.js";
import { defaultReferralTerms } from "../../shared/referrals.js";

const now = new Date("2026-10-23T12:00:00Z");
const details = { businessName: "Synthetic Business", contactName: "Synthetic Contact", phone: "", website: "" };
function fixture() {
  const rows = [];
  const match = (row, filter) => Object.entries(filter).every(([key, value]) => value?.$gt ? new Date(row[key]) > value.$gt : value?.$in ? value.$in.includes(row[key]) : row[key] === value);
  const query = (value) => { const promise = Promise.resolve(value); promise.select = () => promise; return promise; };
  const invitations = {
    create: async (data) => { const item = new BusinessInvitation(data); await item.validate(); const row = item.toObject(); rows.push(row); return row; },
    findOne: (filter) => query(rows.find((row) => match(row, filter))),
    findOneAndUpdate: (filter, update) => { const row = rows.find((row) => match(row, filter)); if (row) Object.assign(row, update.$set); return query(row); },
    updateOne: async (filter, update) => { const row = rows.find((row) => match(row, filter)); if (row) { Object.assign(row, update.$set); for (const key of Object.keys(update.$unset || {})) delete row[key]; } },
  };
  const messages = [];
  return { invitations, rows, now, adminId: "synthetic-admin", origin: "https://example.com", settings: { findById: () => ({ lean: async () => null }) }, send: async (message) => messages.push(message), messages };
}

test("invitations email a seven-day link/code, store only a hash, and retain approved terms", async () => {
  const f = fixture();
  const result = await issueBusinessInvitation({ businessName: details.businessName, email: "business@example.com" }, f);
  assert.equal(result.delivery, "accepted");
  assert.match(result.code, /^[a-f0-9]{64}$/);
  assert.equal(f.rows[0].tokenHash, invitationDigest(result.code));
  assert.equal(f.rows[0].code, undefined);
  assert.equal(new URL(result.link).hash, `#${result.code}`);
  assert.equal(new URL(result.link).pathname, "/business-affiliate/register");
  assert.equal(new URL(result.link).search, "");
  assert.equal(new Date(result.expiresAt) - now, 7 * 86400000);
  assert.equal(f.messages[0].to, "business@example.com");
  assert.ok(f.messages[0].text.includes(result.link));
  assert.equal(f.rows[0].commissionPercent, defaultReferralTerms.commissionPercent);
  assert.equal(BusinessInvitation.schema.path("tokenHash").options.select, false);
  assert.equal(BusinessInvitation.schema.path("submission").options.select, false);
});

test("invalid, expired and revoked codes cannot access or complete registration", async () => {
  const f = fixture();
  const result = await issueBusinessInvitation({ businessName: details.businessName, email: "business@example.com" }, f);
  for (const code of ["123456", "f".repeat(64)]) await assert.rejects(checkBusinessInvitation(code, f), { status: 410 });
  assert.equal((await checkBusinessInvitation(result.code.toUpperCase(), f)).email, "business@example.com");
  await assert.rejects(checkBusinessInvitation(result.code, { ...f, now: new Date(result.expiresAt) }), { status: 410 });
  f.rows[0].status = "revoked";
  await assert.rejects(completeBusinessInvitation(result.code, details, { ...f, register: () => assert.fail() }), { status: 410 });
});

test("completion freezes the invited email and terms and consumes the invitation", async () => {
  const f = fixture();
  const result = await issueBusinessInvitation({ businessName: details.businessName, email: "business@example.com" }, f);
  let calls = 0;
  const register = async (input, options) => {
    calls++; assert.equal(input.email, "business@example.com"); assert.equal(input.contactName, details.contactName);
    assert.deepEqual(options.terms, defaultReferralTerms);
    return { _id: "synthetic-affiliate", code: "B2B-SYNTHETIC" };
  };
  await completeBusinessInvitation(result.code, { ...details, email: "attacker@example.com" }, { ...f, register });
  assert.equal(f.rows[0].status, "completed"); assert.equal(f.rows[0].submission, undefined);
  await assert.rejects(completeBusinessInvitation(result.code, details, { ...f, register }), { status: 410 });
  assert.equal(calls, 1);
});

test("an interrupted creation can retry only the original persisted business identity", async () => {
  const f = fixture();
  const result = await issueBusinessInvitation({ businessName: details.businessName, email: "business@example.com" }, f);
  await assert.rejects(completeBusinessInvitation(result.code, details, { ...f, register: async () => { throw new Error("synthetic interruption"); } }));
  assert.equal(f.rows[0].status, "processing");
  await completeBusinessInvitation(result.code, { ...details, businessName: "Different Business" }, { ...f, register: async (input) => { assert.equal(input.businessName, details.businessName); return { _id: "synthetic-affiliate" }; } });
  assert.equal(f.rows[0].status, "completed");
});

test("mail failure preserves a usable invitation without claiming successful delivery", async () => {
  const f = fixture();
  const result = await issueBusinessInvitation({ businessName: details.businessName, email: "business@example.com" }, { ...f, send: async () => { throw new Error("synthetic failure"); } });
  assert.equal(result.delivery, "failed");
  assert.ok(await checkBusinessInvitation(result.code, f));
  await assert.rejects(issueBusinessInvitation({ businessName: details.businessName, email: "business@example.com" }, { ...f, origin: "http://example.com" }), { status: 503 });
});

test("HTTP endpoints reject anonymous admin access and forged registration fields", async (t) => {
  t.mock.method(AuditLog, "create", async () => ({}));
  const app = express(); app.use(express.json()); app.use(router);
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [path, method, body] of [["/admin", "GET"], ["/admin", "POST", {}], ["/admin/00000000-0000-4000-8000-000000000000/revoke", "POST", {}]]) {
      assert.equal((await fetch(base + path, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) })).status, 401);
    }
    for (const extra of [{ email: "forged@example.com" }, { commissionPercent: 100 }, { enabled: true }, { code: "B2B-FORGED" }]) {
      assert.equal((await fetch(base + "/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "a".repeat(64), details: { ...details, ...extra } }) })).status, 400);
    }
    assert.equal((await fetch(base + "/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "123456" }) })).status, 400);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("only authenticated admins can revoke pending invitations", async (t) => {
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = "synthetic-invitation-test-secret";
  t.after(() => { if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = originalSecret; });
  t.mock.method(AuditLog, "create", async () => ({}));
  t.mock.method(User, "findById", (id) => ({ select: async () => ({ _id: id, role: id, accountStatus: "active" }) }));
  let revoked = false;
  t.mock.method(BusinessInvitation, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter.status, "pending");
    assert.equal(update.$set.status, "revoked");
    if (revoked) return null;
    revoked = true; return { _id: filter._id };
  });
  const app = express(); app.use(express.json(), cookieParser(), router);
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, role, body) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", cookie: `accessToken=${jwt.sign({ userId: role }, process.env.JWT_ACCESS_SECRET)}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const path = "/admin/00000000-0000-4000-8000-000000000000/revoke";
    assert.equal((await request(path, "patient")).status, 403);
    assert.equal(revoked, false);
    assert.equal((await request(path, "admin")).status, 200);
    assert.equal((await request(path, "admin")).status, 409);
    assert.equal((await request("/admin", "admin", { businessName: "Synthetic", email: "synthetic@example.com", commissionPercent: 100 })).status, 400);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
