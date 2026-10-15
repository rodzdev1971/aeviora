import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import Provider from "../models/appointmentProviders.js";
import { providerInput, availabilityInput, availabilitySlots, zonedDateTime } from "../../shared/appointments.js";
import { addAvailability, changeSchedule, changeSlot, visibleSlot, scheduleCapacity } from "../services/appointments.js";
import { createAppointmentRouter } from "../routes/appointmentRoutes.js";
import { dateInputValue, scheduleRange } from "../../src/util/appointmentDisplay.js";

const now = new Date("2026-10-14T12:00:00Z");
const profile = () => ({ name: "Test Professional", credentials: "MD", specialty: "General care", email: "office@example.com", phone: "+12025550123", bio: "Synthetic provider", timeZone: "America/New_York", active: true });
const windowInput = (patch = {}) => ({ start: "2026-11-10T09:00", end: "2026-11-10T10:00", mode: "telehealth", meetingUrl: "https://example.com/private-room", ...patch });
const patient = { id: "synthetic-patient", role: "patient", firstName: "Test", lastName: "Patient", email: "patient@example.com" };
const admin = { ...patient, id: "synthetic-admin", role: "admin" };
function store() {
  const id = randomUUID();
  const records = new Map([[id, { ...profile(), _id: id, revision: 0, slots: [] }]]);
  const clone = (value) => value && structuredClone(value);
  const repository = {
    load: async (key) => clone(records.get(key)),
    compareAndSwap: async (key, revision, changes) => {
      const record = records.get(key);
      if (!record || record.revision !== revision) return null;
      const next = { ...record, ...clone(changes), revision: revision + 1 }; records.set(key, next); return clone(next);
    },
  };
  const providers = {
    find: (filter) => {
      const chain = { select: () => chain, sort: () => chain, lean: async () => [...records.values()].filter((item) =>
        (!filter.active || item.active) && (!filter["slots.userId"] || item.slots.some((slot) => slot.userId === filter["slots.userId"])))
        .map((item) => clone(filter["slots.userId"] ? item : Object.fromEntries(Object.entries(item).filter(([key]) => key !== "slots")))) };
      return chain;
    },
    create: async (data) => { const doc = new Provider(data); await doc.validate(); const record = doc.toObject(); records.set(record._id, record); return record; },
  };
  return { id, records, repository, providers };
}

test("provider and availability schemas reject forged fields and unsafe meeting URLs", async () => {
  await new Provider(providerInput.parse(profile())).validate();
  for (const field of ["role", "slots", "revision", "_id"]) assert.equal(providerInput.safeParse({ ...profile(), [field]: "forged" }).success, false);
  for (const meetingUrl of ["http://example.com", "javascript:alert(1)", "https://user:secret@example.com"]) assert.equal(availabilityInput.safeParse(windowInput({ meetingUrl })).success, false);
  assert.equal(availabilityInput.safeParse(windowInput({ mode: "in_person", location: "" })).success, false);
  assert.equal(availabilityInput.safeParse(windowInput({ duration: 0 })).success, false);
});

test("30-minute defaults, time zones, DST transitions, invalid dates and interval bounds", () => {
  const slots = availabilitySlots(windowInput(), "America/New_York", now);
  assert.equal(slots.length, 2);
  assert.equal(slots[0].startsAt.toISOString(), "2026-11-10T14:00:00.000Z");
  assert.equal(slots[0].endsAt - slots[0].startsAt, 30 * 60000);
  assert.equal(zonedDateTime("2026-11-10T09:00", "Asia/Kolkata").toISOString(), "2026-11-10T03:30:00.000Z");
  assert.throws(() => zonedDateTime("2027-03-14T02:30", "America/New_York"), /daylight saving/);
  assert.throws(() => zonedDateTime("2026-11-01T01:30", "America/New_York"), /daylight saving/);
  assert.throws(() => zonedDateTime("2027-02-30T09:00", "America/New_York"), /calendar/);
  assert.throws(() => availabilitySlots(windowInput({ end: "2026-11-10T09:45" }), "UTC", now), /divides evenly/);
  assert.throws(() => availabilitySlots(windowInput({ end: "2026-11-11T10:00" }), "UTC", now), /12 hours/);
  assert.throws(() => availabilitySlots(windowInput(), "UTC", new Date("2027-01-01")), /future/);
  const spring = availabilitySlots(windowInput({ start: "2027-03-14T01:00", end: "2027-03-14T04:00" }), "America/New_York", now);
  assert.equal(spring.length, 4, "spring-forward skips the missing hour");
});

test("calendar weeks follow local dates across DST and reject missing midnight boundaries", () => {
  assert.equal(dateInputValue(new Date("2026-11-10T02:00:00Z"), "America/New_York"), "2026-11-09");
  const range = new URLSearchParams(scheduleRange("2026-10-30", "America/New_York"));
  assert.equal(range.get("from"), "2026-10-30T04:00:00.000Z");
  assert.equal(range.get("to"), "2026-11-06T05:00:00.000Z");
  assert.throws(() => scheduleRange("2026-02-30", "UTC"), /calendar/);
  assert.throws(() => scheduleRange("2018-11-04", "America/Sao_Paulo"), /daylight saving/);
});

test("overlapping availability and competing bookings commit once across concurrent requests", async () => {
  const s = store();
  const additions = await Promise.allSettled([1, 2].map(() => changeSchedule(s.id, (p) => addAvailability(p, windowInput(), now), s.repository)));
  assert.equal(additions.filter((result) => result.status === "fulfilled").length, 1);
  const slotId = s.records.get(s.id).slots[0]._id;
  const bookings = await Promise.allSettled([patient, { ...patient, id: "another-patient" }].map((user) => changeSchedule(s.id, (p) => changeSlot(p, slotId, "book", user, now), s.repository)));
  assert.equal(bookings.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(s.records.get(s.id).slots[0].status, "booked");
  await assert.rejects(changeSchedule(s.id, (p) => addAvailability(p, windowInput({ mode: "in_person", location: "123 Synthetic St" }), now), s.repository), { status: 409 });
  await changeSchedule(s.id, (p) => addAvailability(p, windowInput({ start: "2026-11-10T10:00", end: "2026-11-10T11:00" }), now), s.repository);
  assert.equal(s.records.get(s.id).slots.length, 4);
});

test("cancellation preserves history, frees a fresh slot, prevents unauthorized cancellation and protects replacements", async () => {
  const s = store();
  await changeSchedule(s.id, (p) => addAvailability(p, windowInput(), now), s.repository);
  const id = s.records.get(s.id).slots[0]._id;
  await changeSchedule(s.id, (p) => changeSlot(p, id, "book", patient, now), s.repository);
  await assert.rejects(changeSchedule(s.id, (p) => changeSlot(p, id, "cancel", { ...patient, id: "intruder" }, now), s.repository), { status: 404 });
  await changeSchedule(s.id, (p) => changeSlot(p, id, "cancel", patient, now), s.repository);
  const cancelled = s.records.get(s.id).slots[0];
  assert.equal(cancelled.status, "cancelled");
  const replacement = s.records.get(s.id).slots.at(-1);
  assert.notEqual(replacement._id, id);
  assert.equal(replacement.userId, undefined);
  await changeSchedule(s.id, (p) => changeSlot(p, replacement._id, "book", { ...patient, id: "new-patient" }, now), s.repository);
  await changeSchedule(s.id, (p) => changeSlot(p, id, "cancel", patient, now), s.repository);
  assert.equal(s.records.get(s.id).slots.at(-1).status, "booked");
  assert.equal(s.records.get(s.id).slots.length, 3);
  await assert.rejects(changeSchedule(s.id, (p) => changeSlot(p, id, "open", admin, now), s.repository), { status: 409 });
});

test("admin block/reopen/remove/cancel and provider deactivation preserve booked appointments", async () => {
  const s = store();
  await changeSchedule(s.id, (p) => addAvailability(p, windowInput(), now), s.repository);
  const id = s.records.get(s.id).slots[0]._id;
  await changeSchedule(s.id, (p) => changeSlot(p, id, "block", admin, now), s.repository);
  await assert.rejects(changeSchedule(s.id, (p) => changeSlot(p, id, "book", patient, now), s.repository), { status: 409 });
  await changeSchedule(s.id, (p) => changeSlot(p, id, "open", admin, now), s.repository);
  await changeSchedule(s.id, (p) => changeSlot(p, id, "book", patient, now), s.repository);
  await assert.rejects(changeSchedule(s.id, (p) => changeSlot(p, id, "remove", admin, now), s.repository), { status: 409 });
  await changeSchedule(s.id, () => ({ changes: { active: false } }), s.repository);
  const second = s.records.get(s.id).slots[1]._id;
  await assert.rejects(changeSchedule(s.id, (p) => changeSlot(p, second, "book", patient, now), s.repository), { status: 409 });
  await changeSchedule(s.id, (p) => changeSlot(p, id, "cancel", admin, now), s.repository);
  assert.equal(s.records.get(s.id).slots.length, 2);
  assert.equal(s.records.get(s.id).slots[0].cancelledBy, "admin");
  await changeSchedule(s.id, (p) => changeSlot(p, second, "remove", admin, now), s.repository);
  assert.equal(s.records.get(s.id).slots.length, 1);
});

test("patient cancellation remains possible at capacity; public slot DTO omits identities and private room links", () => {
  const p = { ...profile(), _id: randomUUID(), slots: [] };
  const slot = { ...availabilitySlots(windowInput(), p.timeZone, now)[0], _id: randomUUID(), status: "booked", userId: patient.id, patientName: "Private Name", patientEmail: "private@example.com" };
  p.slots = Array.from({ length: scheduleCapacity }, (_, i) => ({ ...slot, _id: i ? randomUUID() : slot._id }));
  const other = visibleSlot(p, slot, { id: "other" });
  assert.equal(other.userId, undefined); assert.equal(other.patientEmail, undefined); assert.equal(other.meetingUrl, undefined);
  assert.equal(visibleSlot(p, slot, patient).meetingUrl, slot.meetingUrl);
  changeSlot(p, slot._id, "cancel", patient, now);
  assert.equal(p.slots.length, scheduleCapacity);
  assert.equal(p.slots[0].status, "cancelled");
  assert.equal(visibleSlot(p, p.slots[0], patient).meetingUrl, undefined);
});

test("HTTP endpoints enforce roles, booking ownership, strict payloads, private links and revision conflicts", async (t) => {
  const s = store(); const audits = [];
  const app = express(); app.use(express.json());
  app.use(createAppointmentRouter({ ...s, now: () => now, audit: async (entry) => audits.push(entry),
    authenticate: (req, res, next) => { if (!req.headers["x-test-role"]) return res.sendStatus(401); req.user = { ...patient, id: req.headers["x-test-user"] || patient.id, role: req.headers["x-test-role"] }; next(); },
    authorize: (req, res, next) => req.user.role === "admin" ? next() : res.sendStatus(403),
  }));
  app.use((error, req, res, next) => { if (res.headersSent) return next(error); res.status(500).json({ message: error.message }); });
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (path, method = "GET", body, role = "patient", user = patient.id) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
    headers: { ...(role ? { "x-test-role": role, "x-test-user": user } : {}), "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal((await request("/providers", "GET", undefined, "")).status, 401);
  assert.equal((await request("/providers", "POST", profile())).status, 403);
  assert.equal((await request("/providers", "POST", profile(), "admin")).status, 201);
  const publicProviders = await (await request("/providers")).json();
  assert.equal(publicProviders.providers[0].email, undefined);
  assert.equal(publicProviders.providers[0].slots, undefined);
  assert.equal((await request(`/providers/${s.id}/availability`, "POST", windowInput(), "admin")).status, 201);
  const listUrl = `/providers/${s.id}/slots?from=2026-11-10T00:00:00Z&to=2026-11-11T00:00:00Z`;
  const available = await (await request(listUrl)).json();
  assert.equal(available.slots.length, 2); assert.equal(available.slots[0].meetingUrl, undefined);
  const path = `/providers/${s.id}/slots/${available.slots[0]._id}`;
  assert.equal((await request(path + "/block", "POST")).status, 403);
  assert.equal((await request(path + "/book", "POST", { userId: "forged" })).status, 400);
  assert.equal((await request(path + "/book", "POST")).status, 200);
  assert.equal((await request(path + "/book", "POST", undefined, "patient", "other")).status, 409);
  const mine = await (await request("/mine")).json();
  assert.equal(mine.appointments.length, 1); assert.match(mine.appointments[0].meetingUrl, /^https:/);
  assert.equal((await (await request("/mine", "GET", undefined, "patient", "other")).json()).appointments.length, 0);
  assert.equal((await request(path + "/cancel", "POST", undefined, "patient", "other")).status, 404);
  assert.equal((await request(`/providers/${s.id}`, "PUT", { ...profile(), revision: 0 }, "admin")).status, 409);
  const version = s.records.get(s.id).revision;
  assert.equal((await request(`/providers/${s.id}`, "PUT", { ...profile(), active: false, revision: version }, "admin")).status, 200);
  assert.equal((await request(listUrl)).status, 404);
  assert.equal((await request(path + "/cancel", "POST", undefined, "admin")).status, 200);
  const cancelled = await (await request("/mine")).json();
  assert.equal(cancelled.appointments[0].status, "cancelled");
  assert.equal(cancelled.appointments[0].meetingUrl, undefined);
  assert.ok(audits.some((entry) => entry.action === "APPOINTMENT_UPDATED"));
  assert.ok(audits.every((entry) => !entry.metadata?.patientEmail));
});
