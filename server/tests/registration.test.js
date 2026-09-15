import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import User from "../models/users.js";
import AuditLog from "../models/AuditLog.js";
import { registerAccount } from "../services/registration.js";
import { registrationConfig } from "../config/registration.js";
import { createRegistrationSchema } from "../../shared/registration.js";
import { createApp } from "../app.js";

const config = {
  termsVersion: "test-terms-v1", privacyVersion: "test-privacy-v1",
  termsUrl: "/terms", privacyUrl: "/privacy", isDraft: true, requiredAddressFields: [],
};
const input = () => ({
  firstName: "Test", lastName: "Account", email: " EXAMPLE@EXAMPLE.COM ", phone: "(202) 555-0123",
  zipCode: "33101", password: "test-password-1234", is18OrOlder: true,
  termsAccepted: true, privacyAccepted: true, termsVersion: config.termsVersion, privacyVersion: config.privacyVersion,
});

test("registration stores a UUID, normalized contact data, password hash and server consent records", async () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const user = await registerAccount(input(), {
    config, now: () => now, status: "pending",
    users: { findOne: async () => null, create: async (data) => { const doc = new User(data); await doc.validate(); return doc; } },
  });
  assert.match(user._id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(user.email, "example@example.com");
  assert.equal(user.phone, "+12025550123");
  assert.equal(user.country, "US");
  assert.equal(user.accountStatus, "pending");
  assert.equal(user.role, "patient");
  assert.equal(await bcrypt.compare(input().password, user.passwordHash), true);
  assert.equal(user.termsAcceptance.acceptedAt.toISOString(), now.toISOString());
  assert.equal(user.privacyAcceptance.version, config.privacyVersion);
  assert.equal(user.smsConsent.granted, false);
  assert.equal(user.smsConsent.grantedAt, null);
  assert.equal(user.marketingConsent.granted, false);
  for (const field of ["dateOfBirth", "medicalHistory", "medications", "allergies", "hipaaAcknowledged", "selectedProtocol", "password"]) {
    assert.equal(field in user.toObject(), false);
  }
});

test("medical fields and client-assigned identifiers, status, roles and timestamps are rejected", () => {
  const schema = createRegistrationSchema();
  for (const field of ["dateOfBirth", "medicalHistory", "medications", "allergies", "hipaaAcknowledged", "selectedProtocol", "_id", "role", "accountStatus", "termsAcceptance", "createdAt"]) {
    assert.equal(schema.safeParse({ ...input(), [field]: "injected" }).success, false, field);
  }
});

test("age, required acceptance, ZIP, phone, email and password rules are enforced", () => {
  const schema = createRegistrationSchema();
  for (const patch of [
    { is18OrOlder: false }, { termsAccepted: false }, { privacyAccepted: false },
    { zipCode: "bad" }, { phone: "123" }, { email: "bad" }, { firstName: " " },
    { password: "short" }, { password: "😀".repeat(30) }, { timeZone: "Invalid/Zone" },
  ]) assert.equal(schema.safeParse({ ...input(), ...patch }).success, false);
});

test("address requirements are configurable and SMS consent stays separate from marketing", async () => {
  const schema = createRegistrationSchema(["addressLine1", "city", "state"]);
  assert.equal(schema.safeParse(input()).success, false);
  assert.equal(schema.safeParse({ ...input(), addressLine1: "123 Test St", city: "Test City", state: "FL" }).success, true);
  assert.equal(createRegistrationSchema().safeParse({ ...input(), communicationPreference: "sms" }).success, false);
  let stored;
  await registerAccount({ ...input(), communicationPreference: "both", smsConsent: true }, {
    config, hashPassword: async () => "hash", users: { findOne: async () => null, create: async (data) => { stored = data; return data; } },
  });
  assert.equal(stored.smsConsent.granted, true);
  assert.ok(stored.smsConsent.grantedAt instanceof Date);
  assert.equal(stored.marketingConsent.granted, false);
});

test("stale policy versions, duplicate emails and duplicate races fail without creating extra accounts", async () => {
  const dependencies = { config, hashPassword: async () => "hash", users: { findOne: async () => null, create: async () => { throw Object.assign(new Error("duplicate"), { code: 11000 }); } } };
  await assert.rejects(registerAccount({ ...input(), termsVersion: "old" }, dependencies), { status: 409 });
  await assert.rejects(registerAccount(input(), dependencies), { status: 409 });
  dependencies.users.findOne = async () => ({ _id: "existing" });
  await assert.rejects(registerAccount(input(), dependencies), { status: 409 });
});

test("HTTP registration, pending/active login, cookie auth, account isolation and logout", async (t) => {
  // Isolated synthetic storage: these tests never connect to MongoDB or read .env.
  t.mock.method(User, "findOne", ({ email }) => {
    const user = accounts.find((item) => item.email === email) || null;
    return { then: (resolve) => Promise.resolve(user).then(resolve), select: async () => user };
  });
  t.mock.method(User, "create", async (data) => { const user = new User(data); await user.validate(); accounts.push(user); return user; });
  t.mock.method(User, "findById", (id) => ({ select: async () => {
    const user = accounts.find((item) => item._id === id);
    if (!user) return null;
    const object = user.toObject();
    delete object.passwordHash;
    return object;
  } }));
  t.mock.method(AuditLog, "create", async (data) => { const log = new AuditLog(data); await log.validate(); return log; });
  const accounts = [];
  const savedEnv = { ...process.env };
  process.env.NODE_ENV = "test";
  process.env.JWT_ACCESS_SECRET = "synthetic-test-secret-only";
  delete process.env.DEV_ACTIVATE_ACCOUNTS;
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    process.env = savedEnv;
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, cookie) => fetch(base + path, {
    method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body),
  });
  const metadata = await (await fetch(base + "/api/auth/registration-config")).json();
  const payload = { ...input(), termsVersion: metadata.termsVersion, privacyVersion: metadata.privacyVersion };
  let response = await post("/api/auth/register", { ...payload, dateOfBirth: "2000-01-01" });
  assert.equal(response.status, 400);
  response = await post("/api/auth/register", payload);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.accountStatus, "pending");
  assert.equal(accounts.length, 1);
  assert.equal(result.passwordHash, undefined);
  assert.equal((await post("/api/auth/register", payload)).status, 409);
  assert.equal((await post("/api/auth/login", { email: "example@example.com", password: input().password })).status, 403);
  assert.equal((await fetch(base + "/api/users/me")).status, 401);
  accounts[0].accountStatus = "active";
  response = await post("/api/auth/login", { email: "EXAMPLE@EXAMPLE.COM", password: input().password });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  response = await fetch(base + "/api/users/me", { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.equal(profile.user._id, result.userId);
  assert.equal(profile.user.passwordHash, undefined);
  response = await fetch(base + "/api/users/me", { method: "PATCH", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ medicalHistory: "not allowed" }) });
  assert.equal(response.status, 400);
  accounts[0].accountStatus = "suspended";
  assert.equal((await fetch(base + "/api/users/me", { headers: { Cookie: cookie } })).status, 401);
  accounts[0].accountStatus = "active";
  response = await post("/api/auth/logout", {}, cookie);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/);
});

test("production cannot silently use development policy placeholders", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try { assert.throws(() => registrationConfig(), /Configure approved/); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
