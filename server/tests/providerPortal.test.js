import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import User from "../models/users.js";
import Provider from "../models/appointmentProviders.js";
import AuditLog from "../models/AuditLog.js";
import authRoutes from "../routes/authRoutes.js";
import patientRoutes from "../routes/patientRoutes.js";
import { createAppointmentRouter } from "../routes/appointmentRoutes.js";
import { addAvailability, changeSlot, changeSchedule } from "../services/appointments.js";
import { authorizedStatesInput, providerSelfInput } from "../../shared/appointments.js";

const now = new Date("2026-11-11T12:00:00Z");
const windowInput = { start: "2026-12-01T09:00", end: "2026-12-01T10:00", duration: 30, mode: "telehealth", meetingUrl: "https://example.com/room" };

test("state validation rejects unknown/duplicate states and provider self-service rejects identity overrides", () => {
  for (const states of [["XX"], ["FL", "FL"], ["Florida"], ["PR"]]) assert.equal(authorizedStatesInput.safeParse(states).success, false);
  assert.equal(authorizedStatesInput.safeParse(["FL", "NY", "DC"]).success, true);
  for (const override of [{ userId: "forged" }, { active: true }, { email: "forged@example.com" }, { role: "admin" }]) {
    assert.equal(providerSelfInput.safeParse({ authorizedStates: ["FL"], revision: 0, ...override }).success, false);
  }
});

test("provider login, ownership, state enforcement, account linking and assigned-patient privacy", async (t) => {
  const oldSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = "synthetic-provider-portal-secret";
  t.after(() => { if (oldSecret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = oldSecret; });
  const passwordHash = await bcrypt.hash("Synthetic-Password-123!", 4);
  const accounts = [
    { _id: "owner", role: "provider" }, { _id: "other-provider", role: "provider" },
    { _id: "admin", role: "admin" }, { _id: "patient", role: "patient", state: "FL" },
    { _id: "unassigned", role: "patient" }, { _id: "new-provider", role: "patient" },
    { _id: "suspended", role: "provider", accountStatus: "suspended" },
  ].map((user) => ({ firstName: "Synthetic", lastName: user._id, email: `${user._id}@example.com`, phone: "+12025550123", passwordHash,
    accountStatus: "active", emailVerificationRequired: true, emailVerifiedAt: now, sessionVersion: 0,
    termsAcceptance: { version: "private" }, resetTokenHash: "private-reset", ...user }));
  const records = new Map();
  for (const userId of ["owner", "other-provider", undefined]) {
    const _id = randomUUID();
    records.set(_id, { _id, ...(userId ? { userId } : {}), name: "Synthetic Provider", specialty: "Consultation", email: "office@example.com", active: true,
      timeZone: "America/New_York", authorizedStates: ["FL"], slots: [], revision: 0 });
  }
  const [own, other, unlinked] = [...records.values()];
  const project = (value, fields) => value && Object.fromEntries(fields.split(" ").map((field) => field.replace(/^\+/, "")).filter((field) => Object.hasOwn(value, field)).map((field) => [field, value[field]]));
  const repository = {
    load: async (id) => structuredClone(records.get(id) || null),
    compareAndSwap: async (id, revision, changes) => {
      const record = records.get(id);
      if (!record || record.revision !== revision) return null;
      Object.assign(record, structuredClone(changes), { revision: revision + 1 });
      return structuredClone(record);
    },
  };
  const matches = (provider, filter) => (!filter.userId || provider.userId === filter.userId)
    && (!filter.active || provider.active) && (!filter["slots.userId"] || provider.slots.some((slot) => slot.userId === filter["slots.userId"]));
  const providers = {
    find: (filter) => {
      let fields;
      const query = { select: (value) => { fields = value; return query; }, sort: () => query,
        lean: async () => [...records.values()].filter((value) => matches(value, filter)).map((value) => structuredClone(fields === "+slots" ? value : project(value, fields))) };
      return query;
    },
    findOne: (filter) => ({ select: () => ({ lean: async () => [...records.values()].find((value) => matches(value, filter)) || null }) }),
  };
  const audits = [];
  t.mock.method(AuditLog, "create", async (entry) => { audits.push(entry); });
  t.mock.method(User, "findById", (id) => ({ select: async (fields) => project(accounts.find((user) => user._id === id), fields) }));
  t.mock.method(User, "findOne", ({ email }) => ({ select: async () => accounts.find((user) => user.email === email) || null }));
  t.mock.method(User, "updateOne", async (filter, update) => {
    const account = accounts.find((user) => user._id === filter._id && filter.role.$in.includes(user.role) && user.accountStatus === filter.accountStatus);
    if (!account) return { matchedCount: 0 };
    Object.assign(account, update.$set); account.sessionVersion += update.$inc.sessionVersion;
    return { matchedCount: 1 };
  });
  t.mock.method(User, "find", (filter) => {
    let fields;
    const query = { where: () => query, in: () => query, select: (value) => { fields = value; return query; }, sort: () => query,
      limit: async () => accounts.filter((account) => filter._id?.$in.includes(account._id)).map((account) => project(account, fields)) };
    return query;
  });
  t.mock.method(Provider, "find", providers.find);
  await changeSchedule(own._id, (provider) => addAvailability(provider, windowInput, now), repository);
  await changeSchedule(other._id, (provider) => addAvailability(provider, windowInput, now), repository);
  const slotId = records.get(own._id).slots[0]._id;
  const patient = { ...accounts.find((user) => user._id === "patient"), id: "patient" };
  await changeSchedule(own._id, (provider) => changeSlot(provider, slotId, "book", patient, now), repository);
  const app = express(); app.use(express.json(), cookieParser());
  app.use("/api/auth", authRoutes);
  app.use("/api/users", patientRoutes);
  app.use("/api/appointments", createAppointmentRouter({ providers, repository, now: () => now }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, { user = "owner", method = "GET", body } = {}) => fetch(base + path, { method,
    headers: { "Content-Type": "application/json", ...(user ? { Cookie: `accessToken=${jwt.sign({ userId: user, sessionVersion: accounts.find((account) => account._id === user)?.sessionVersion || 0 }, process.env.JWT_ACCESS_SECRET)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const login = (email, password = "Synthetic-Password-123!") => request("/api/auth/provider-login", { user: null, method: "POST", body: { email, password } });
  assert.equal((await login("owner@example.com", "wrong")).status, 401);
  const patientLogin = await login("patient@example.com");
  assert.equal(patientLogin.status, 403); assert.equal(patientLogin.headers.get("set-cookie"), null);
  assert.equal((await login("suspended@example.com")).status, 403);
  const signedIn = await login("owner@example.com");
  assert.equal(signedIn.status, 200); assert.match(signedIn.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal((await signedIn.json()).user.role, "provider");
  assert.equal((await request("/api/appointments/workspace", { user: null })).status, 401);
  assert.equal((await request("/api/appointments/workspace", { user: "patient" })).status, 403);
  const workspace = await (await request("/api/appointments/workspace")).json();
  assert.deepEqual(workspace.providers.map((provider) => provider._id), [own._id]);
  assert.equal(workspace.providers[0].slots, undefined);
  const ownPath = `/api/appointments/providers/${own._id}`, otherPath = `/api/appointments/providers/${other._id}`;
  const ownSlots = await (await request(ownPath + "/slots")).json();
  assert.equal(ownSlots.slots[0].patientEmail, "patient@example.com");
  assert.equal(ownSlots.slots[0].patientState, "FL");
  assert.equal(ownSlots.slots[0].meetingUrl, windowInput.meetingUrl);
  assert.equal((await request(otherPath + "/slots")).status, 400);
  const publicSlots = await (await request(otherPath + "/slots?from=2026-12-01T00:00:00Z&to=2026-12-02T00:00:00Z")).json();
  assert.equal(publicSlots.slots[0].meetingUrl, undefined); assert.equal(publicSlots.slots[0].patientEmail, undefined);
  for (const path of ["/availability", "/availability/removal-preview", "/availability/remove"]) {
    assert.equal((await request(otherPath + path, { method: "POST", body: windowInput })).status, 403);
  }
  const otherSlotId = records.get(other._id).slots[0]._id;
  for (const action of ["block", "open", "remove", "cancel"]) {
    assert.ok([403, 404].includes((await request(`${otherPath}/slots/${otherSlotId}/${action}`, { method: "POST" })).status));
  }
  const details = await (await request("/api/users/patient")).json();
  assert.equal(details.user.email, "patient@example.com");
  for (const key of ["passwordHash", "resetTokenHash", "termsAcceptance", "sessionVersion"]) assert.equal(details.user[key], undefined);
  assert.equal((await request("/api/users/unassigned")).status, 404);
  assert.equal((await request("/api/users/patient", { user: "other-provider" })).status, 404);
  const directory = await (await request("/api/users")).json();
  assert.deepEqual(directory.users.map((user) => user._id), ["patient"]);
  assert.deepEqual((await (await request("/api/users", { user: "other-provider" })).json()).users, []);
  let revision = records.get(own._id).revision;
  assert.equal((await request(ownPath, { method: "PUT", body: { authorizedStates: ["NY"], revision, userId: "forged" } })).status, 400);
  assert.equal((await request(otherPath, { method: "PUT", body: { authorizedStates: ["NY"], revision: 0 } })).status, 403);
  assert.equal((await request(ownPath, { method: "PUT", body: { authorizedStates: ["NY"], revision } })).status, 200);
  assert.equal(records.get(own._id).slots[0].status, "booked", "state changes preserve existing visits");
  assert.equal((await request(ownPath, { method: "PUT", body: { authorizedStates: ["FL"], revision } })).status, 409);
  const availableId = records.get(own._id).slots[1]._id;
  const bookPath = `${ownPath}/slots/${availableId}/book`;
  assert.equal((await request(bookPath, { user: "patient", method: "POST" })).status, 400);
  assert.equal((await request(bookPath, { user: "patient", method: "POST", body: { patientState: "FL" } })).status, 400);
  assert.equal((await request(bookPath, { user: "patient", method: "POST", body: { patientState: "XX" } })).status, 400);
  assert.equal((await request(bookPath, { user: "patient", method: "POST", body: { patientState: "NY", userId: "forged" } })).status, 400);
  assert.equal((await request(bookPath, { method: "POST", body: { patientState: "NY" } })).status, 403);
  assert.equal((await request(bookPath, { user: "patient", method: "POST", body: { patientState: "NY" } })).status, 200);
  assert.equal(records.get(own._id).slots[1].patientState, "NY");
  assert.equal((await request(`${ownPath}/slots/${slotId}/cancel`, { method: "POST" })).status, 200);
  assert.equal(records.get(own._id).slots[0].cancelledBy, "provider");
  const extraWindow = { ...windowInput, start: "2026-12-02T09:00", end: "2026-12-02T10:00" };
  assert.equal((await request(ownPath + "/availability", { method: "POST", body: extraWindow })).status, 201);
  const selection = { scope: "day", date: "2026-12-02" };
  const preview = await (await request(ownPath + "/availability/removal-preview", { method: "POST", body: selection })).json();
  assert.equal(preview.removableCount, 2);
  assert.equal((await request(ownPath + "/availability/remove", { method: "POST", body: { selection, revision: preview.revision } })).status, 200);
  assert.equal(records.get(own._id).slots.filter((slot) => slot.status === "booked").length, 1);
  const accessPath = `/api/appointments/providers/${unlinked._id}/access`;
  assert.equal((await request(accessPath, { method: "POST", body: { email: "new-provider@example.com" } })).status, 403);
  assert.equal((await request(accessPath, { user: "admin", method: "POST", body: { email: "admin@example.com" } })).status, 400);
  assert.equal((await request(accessPath, { user: "admin", method: "POST", body: { email: "owner@example.com" } })).status, 409);
  assert.equal((await request(accessPath, { user: "admin", method: "POST", body: { email: "new-provider@example.com" } })).status, 200);
  assert.equal(records.get(unlinked._id).userId, "new-provider");
  assert.equal(accounts.find((user) => user._id === "new-provider").role, "provider");
  assert.equal(accounts.find((user) => user._id === "new-provider").sessionVersion, 1);
  const staleToken = jwt.sign({ userId: "new-provider", sessionVersion: 0 }, process.env.JWT_ACCESS_SECRET);
  const staleSession = await fetch(base + "/api/appointments/workspace", { headers: { Cookie: `accessToken=${staleToken}` } });
  assert.equal(staleSession.status, 401, "granting provider access invalidates old sessions");
  assert.equal((await login("new-provider@example.com")).status, 200);
  assert.ok(audits.some((entry) => entry.action === "PROVIDER_ACCESS_GRANTED" && entry.targetId === "new-provider"));
  assert.ok(audits.some((entry) => entry.action === "USER_VIEWED" && entry.targetId === "patient"));
});
