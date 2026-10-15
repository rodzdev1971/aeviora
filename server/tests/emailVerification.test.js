import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createEmailVerificationRouter } from "../routes/emailVerificationRoutes.js";
import { VERIFICATION_LIFETIME, verificationDigest, verificationStatus, requestEmailVerification, verifyEmailToken, manuallyVerifyAccount } from "../services/emailVerification.js";

const start = new Date("2026-10-14T12:00:00Z");
function fixture(patch = {}) {
  const account = { _id: "synthetic-user", email: "synthetic@example.com", firstName: "Test", role: "patient", accountStatus: "pending", emailVerificationRequired: true, emailVerifiedAt: null, ...patch };
  const matches = (filter) => Object.entries(filter).every(([field, value]) => {
    if (field === "$or") return value.some(matches);
    if (value === null) return account[field] == null;
    if (typeof value !== "object") return account[field] === value;
    return Object.entries(value).every(([operator, operand]) => {
      if (operator === "$exists") return (account[field] !== undefined) === operand;
      if (operator === "$in") return operand.includes(account[field]);
      if (operator === "$gt") return account[field] > operand;
      if (operator === "$lte") return account[field] <= operand;
      throw new Error(`Unsupported test operator: ${operator}`);
    });
  });
  const update = async (filter, changes) => {
    if (!matches(filter)) return null;
    Object.assign(account, changes.$set);
    Object.keys(changes.$unset || {}).forEach((field) => delete account[field]);
    return { ...account };
  };
  const sent = [];
  const dependencies = { users: { findOneAndUpdate: update, updateOne: update }, now: start,
    origin: "https://example.com", send: async (mail) => sent.push(mail), report: () => {} };
  return { account, dependencies, sent, token: () => sent.at(-1).text.match(/#([a-f0-9]{64})/)[1] };
}

test("links are random, hashed, expire at 24 hours and can only activate once", async () => {
  const f = fixture();
  assert.equal(await requestEmailVerification(f.account.email, f.dependencies), "accepted");
  const token = f.token();
  assert.equal(f.account.emailVerificationTokenHash, verificationDigest(token));
  assert.notEqual(f.account.emailVerificationTokenHash, token);
  assert.equal(f.account.emailVerificationExpiresAt - start, VERIFICATION_LIFETIME);
  assert.match(f.sent[0].text, /https:\/\/example.com\/verify-email#/);
  assert.equal(verificationStatus(f.account, start), "pending");
  const deadline = new Date(start.getTime() + VERIFICATION_LIFETIME);
  assert.equal(verificationStatus(f.account, deadline), "not_verified");
  assert.equal(await verifyEmailToken(token, { ...f.dependencies, now: deadline }), null);
  assert.equal(await verifyEmailToken("b".repeat(64), f.dependencies), null);
  const results = await Promise.all([verifyEmailToken(token, f.dependencies), verifyEmailToken(token, f.dependencies)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(f.account.accountStatus, "active");
  assert.equal(f.account.emailVerificationMethod, "email");
  assert.equal(verificationStatus(f.account, deadline), "verified");
  assert.equal(f.account.emailVerificationTokenHash, undefined);
});

test("resend cooldown is atomic, a fresh link replaces the old link, and expired accounts recover", async () => {
  const f = fixture();
  await requestEmailVerification(f.account.email, f.dependencies);
  const oldToken = f.token();
  assert.equal(await requestEmailVerification(f.account.email, f.dependencies), "skipped");
  assert.equal(f.sent.length, 1);
  const later = { ...f.dependencies, now: new Date(start.getTime() + VERIFICATION_LIFETIME) };
  const results = await Promise.all([requestEmailVerification(f.account.email, later), requestEmailVerification(f.account.email, later)]);
  assert.deepEqual(results.sort(), ["accepted", "skipped"]);
  assert.equal(await verifyEmailToken(oldToken, later), null);
  assert.notEqual(f.token(), oldToken);
  assert.equal(verificationStatus(f.account, later.now), "pending");
  assert.ok(await verifyEmailToken(f.token(), later));
  assert.equal(await requestEmailVerification(f.account.email, later), "skipped");
});

test("SMTP failures preserve the registration and allow retry without exposing errors", async () => {
  const f = fixture();
  const reports = [];
  assert.equal(await requestEmailVerification(f.account.email, { ...f.dependencies,
    send: async () => { throw Object.assign(new Error("private provider detail"), { code: "EAUTH" }); }, report: (value) => reports.push(value) }), "failed");
  assert.deepEqual(reports, ["authentication_failed"]);
  assert.equal(f.account.accountStatus, "pending");
  assert.equal(f.account.emailVerificationRequestedAt, undefined);
  assert.equal(await requestEmailVerification(f.account.email, f.dependencies), "accepted");
});

test("manual verification records the admin and invalidates the email link", async () => {
  const f = fixture();
  await requestEmailVerification(f.account.email, f.dependencies);
  const token = f.token();
  assert.ok(await manuallyVerifyAccount(f.account._id, "synthetic-admin", f.dependencies));
  assert.equal(f.account.emailVerifiedBy, "synthetic-admin");
  assert.equal(f.account.emailVerificationMethod, "admin");
  assert.equal(f.account.accountStatus, "active");
  assert.equal(await verifyEmailToken(token, f.dependencies), null);
  assert.equal(await manuallyVerifyAccount(f.account._id, "synthetic-admin", f.dependencies), null);
});

test("suspended/deleted accounts cannot be verified or sent links; legacy access is distinguished", async () => {
  for (const accountStatus of ["suspended", "deleted"]) {
    const f = fixture();
    await requestEmailVerification(f.account.email, f.dependencies);
    const token = f.token();
    f.account.accountStatus = accountStatus;
    assert.equal(await verifyEmailToken(token, f.dependencies), null);
    assert.equal(await manuallyVerifyAccount(f.account._id, "synthetic-admin", f.dependencies), null);
    assert.equal(await requestEmailVerification(f.account.email, f.dependencies), "skipped");
  }
  assert.equal(verificationStatus({ accountStatus: "active" }), "legacy");
});

test("untrusted origins cannot issue links", async () => {
  for (const origin of [undefined, "http://example.com", "javascript:alert(1)"]) {
    const f = fixture();
    assert.equal(await requestEmailVerification(f.account.email, { ...f.dependencies, origin }), "failed");
    assert.equal(f.sent.length, 0);
  }
});

test("HTTP verification requires POST, hides resend eligibility, validates payloads and audits success", async (t) => {
  const f = fixture();
  const audits = [];
  const app = express(); app.use(express.json());
  app.use(createEmailVerificationRouter({ request: (email) => requestEmailVerification(email, f.dependencies),
    verify: (token) => verifyEmailToken(token, f.dependencies), audit: async (entry) => audits.push(entry) }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const unknown = await (await post("/resend-verification", { email: "unknown@example.com" })).json();
  const known = await (await post("/resend-verification", { email: f.account.email })).json();
  assert.deepEqual(unknown, known);
  assert.equal((await post("/resend-verification", { email: "invalid" })).status, 400);
  assert.equal((await fetch(base + "/verify-email")).status, 404);
  assert.equal(f.account.accountStatus, "pending");
  assert.equal((await post("/verify-email", { token: { $ne: null } })).status, 400);
  const response = await post("/verify-email", { token: f.token() });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(audits[0].action, "EMAIL_VERIFIED");
  assert.equal(JSON.stringify(audits.map(({ action, targetId, actorId, metadata }) => ({ action, targetId, actorId, metadata }))).includes(f.token()), false);
  assert.equal((await post("/verify-email", { token: f.token() })).status, 400);
});
