import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import AuditLog from "../models/AuditLog.js";
import router from "../routes/adminRoutes.js";

test("admin profile lookup enforces access, projects safe account fields, and audits reads", async (t) => {
  const saved = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = "synthetic-admin-profile-test-secret";
  t.after(() => {
    if (saved === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = saved;
  });
  const profile = {
    _id: "synthetic-patient", firstName: "Synthetic", lastName: "Patient",
    email: "synthetic@example.com", phone: "+12025550123", role: "patient",
    accountStatus: "pending", addressLine1: "123 Example St", addressLine2: "Unit 2",
    city: "Example", state: "FL", zipCode: "33101", country: "US",
    preferredLanguage: "es", communicationPreference: "email", timeZone: "America/New_York",
    is18OrOlder: true, termsAcceptance: { version: "test-v1" }, privacyAcceptance: { version: "test-v1" },
    smsConsent: { granted: false }, marketingConsent: { granted: false },
    passwordHash: "private-password-hash", resetTokenHash: "private-reset-token",
    emailVerificationTokenHash: "private-verification-token", sessionVersion: 3,
    stripeCustomerId: "private-customer", zelle: { payments: [] },
    createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-02T12:00:00Z",
  };
  const audits = [];
  let profileReads = 0;
  t.mock.method(AuditLog, "create", async (entry) => { audits.push(entry); });
  t.mock.method(User, "findById", (id) => ({ select: async (fields) => {
    if (["admin", "provider", "patient", "user"].includes(id)) return { _id: id, role: id, accountStatus: "active" };
    profileReads++;
    if (id !== profile._id) return null;
    const selected = Object.fromEntries(fields.split(" ").filter((field) => Object.hasOwn(profile, field)).map((field) => [field, profile[field]]));
    return { ...selected, toObject: () => selected };
  } }));
  const app = express();
  app.use(cookieParser());
  app.use("/api/admin", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const request = (role, id = profile._id) => fetch(`http://127.0.0.1:${server.address().port}/api/admin/users/${id}`, {
    headers: role ? { Cookie: `accessToken=${jwt.sign({ userId: role }, process.env.JWT_ACCESS_SECRET)}` } : {},
  });

  assert.equal((await request(null)).status, 401);
  for (const role of ["patient", "user", "provider"]) assert.equal((await request(role)).status, 403);
  assert.equal(profileReads, 0, "unauthorized requests must not query the target profile");
  const response = await request("admin");
  assert.equal(response.status, 200);
  const { user } = await response.json();
  for (const field of ["_id", "firstName", "lastName", "email", "phone", "addressLine1", "addressLine2", "city", "state", "zipCode", "country", "preferredLanguage", "communicationPreference", "timeZone", "smsConsent", "marketingConsent", "termsAcceptance", "privacyAcceptance", "accountStatus", "createdAt", "updatedAt"]) {
    assert.deepEqual(user[field], profile[field], field);
  }
  for (const field of ["passwordHash", "resetTokenHash", "emailVerificationTokenHash", "sessionVersion", "stripeCustomerId", "zelle"]) {
    assert.equal(Object.hasOwn(user, field), false, `${field} must not be disclosed`);
  }
  const viewed = audits.filter((entry) => entry.action === "USER_VIEWED");
  assert.equal(viewed.length, 1);
  assert.equal(viewed[0].actorId, "admin");
  assert.equal(viewed[0].targetId, profile._id);
  assert.deepEqual(viewed[0].metadata, {});
  assert.equal((await request("admin", "missing-account")).status, 404);
  assert.equal(audits.filter((entry) => entry.action === "USER_VIEWED").length, 1);
});
