import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import Provider from "../models/appointmentProviders.js";
import { providerInput, availabilityInput, availabilitySlots, zonedDateTime, availabilityRemovalSelection } from "../../shared/appointments.js";
import { addAvailability, removeAvailability, changeSchedule, changeSlot, visibleSlot, scheduleCapacity } from "../services/appointments.js";
import { createAppointmentRouter } from "../routes/appointmentRoutes.js";
import { dateInputValue, scheduleRange, appointmentDate, appointmentClock, scheduleDays } from "../../src/util/appointmentDisplay.js";

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

test("single-day queries honor local midnight and 23/25-hour daylight saving days", () => {
  const spring = new URLSearchParams(scheduleRange("2027-03-14", "America/New_York", 1));
  assert.equal(spring.get("from"), "2027-03-14T05:00:00.000Z");
  assert.equal(spring.get("to"), "2027-03-15T04:00:00.000Z");
  const fall = new URLSearchParams(scheduleRange("2026-11-01", "America/New_York", 1));
  assert.equal(fall.get("from"), "2026-11-01T04:00:00.000Z");
  assert.equal(fall.get("to"), "2026-11-02T05:00:00.000Z");
  assert.match(appointmentDate("2026-11-10"), /Tuesday.*November 10, 2026/);
  assert.match(appointmentDate("2026-11-10", "es"), /martes.*noviembre/);
  assert.match(appointmentClock({ startsAt: "2026-11-10T14:00Z", endsAt: "2026-11-10T14:30Z" }, "America/New_York"), /9:00 AM.*9:30 AM/);
});

test("admin schedule dates include every status, sort chronologically and use the provider's calendar", () => {
  const slots = [
    { _id: "cancelled", startsAt: "2026-11-12T15:00Z", status: "cancelled" },
    { _id: "booked", startsAt: "2026-11-11T01:00Z", status: "booked" },
    { _id: "available", startsAt: "2026-11-10T23:30Z", status: "available" },
    { _id: "blocked", startsAt: "2026-11-11T15:00Z", status: "blocked" },
  ];
  const days = scheduleDays(slots, "America/New_York");
  assert.deepEqual(days.map((day) => ({ date: day.date, ids: day.slots.map((slot) => slot._id) })), [
    { date: "2026-11-10", ids: ["available", "booked"] },
    { date: "2026-11-11", ids: ["blocked"] },
    { date: "2026-11-12", ids: ["cancelled"] },
  ]);
  assert.equal(days[0].slots.filter((slot) => slot.status === "booked").length, 1);
  assert.equal(scheduleDays(slots, "Pacific/Kiritimati")[0].date, "2026-11-11");
  assert.deepEqual(scheduleDays([], "America/New_York"), []);
  assert.equal(slots[0]._id, "cancelled", "grouping does not reorder the source schedule");
});

test("date dropdown counts only future available slots, follows the user's calendar and visit type, and matches daily results", async (t) => {
  const s = store();
  const p = s.records.get(s.id);
  p.slots = [
    { startsAt: "2026-10-14T11:00Z", status: "available" },
    { startsAt: "2026-11-10T23:30Z", status: "available" },
    { startsAt: "2026-11-11T00:00Z", status: "available", mode: "in_person" },
    { startsAt: "2026-11-11T00:30Z", status: "blocked" },
    { startsAt: "2026-11-11T01:00Z", status: "booked" },
    { startsAt: "2026-11-11T01:30Z", status: "cancelled" },
  ].map((slot) => ({ _id: randomUUID(), mode: "telehealth", ...slot, endsAt: new Date(new Date(slot.startsAt).getTime() + 30 * 60000), meetingUrl: "https://example.com/private-room", patientEmail: "private@example.com" }));
  const app = express();
  app.use(createAppointmentRouter({ ...s, now: () => now, audit: async () => {}, authenticate: (req, res, next) => { req.user = patient; next(); } }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/providers/${s.id}`;
  const requestDates = (timeZone, extra = {}) => fetch(`${base}/available-dates?${new URLSearchParams({ timeZone, ...extra })}`);
  assert.deepEqual(await (await requestDates("America/New_York", { path: `appointments/providers/${s.id}/available-dates` })).json(), { dates: [{ date: "2026-11-10", count: 2 }] });
  assert.deepEqual(await (await requestDates("UTC")).json(), { dates: [{ date: "2026-11-10", count: 1 }, { date: "2026-11-11", count: 1 }] });
  assert.deepEqual(await (await requestDates("Pacific/Kiritimati")).json(), { dates: [{ date: "2026-11-11", count: 2 }] });
  assert.deepEqual(await (await requestDates("America/New_York", { mode: "in_person" })).json(), { dates: [{ date: "2026-11-10", count: 1 }] });
  const daily = await (await fetch(`${base}/slots?${scheduleRange("2026-11-10", "America/New_York", 1)}`)).json();
  assert.equal(daily.slots.length, 2);
  assert.ok(daily.slots.every((slot) => slot.meetingUrl === undefined && slot.patientEmail === undefined));
  assert.equal((await requestDates("invalid/zone")).status, 400);
  assert.equal((await requestDates("UTC", { mode: "invalid" })).status, 400);
  assert.equal((await requestDates("UTC", { status: "booked" })).status, 400);
  p.slots.filter((slot) => slot.status === "available").forEach((slot) => { slot.status = "booked"; });
  assert.deepEqual(await (await requestDates("UTC")).json(), { dates: [] });
  p.active = false;
  assert.equal((await requestDates("UTC")).status, 404);
});

test("weekly patterns select inclusive weekdays and preserve office hours across DST", () => {
  const slots = availabilitySlots(windowInput({ start: "2026-10-30T09:00", end: "2026-10-30T10:00", recurrence: { until: "2026-11-06", weekdays: [1, 3, 5] } }), "America/New_York", now);
  assert.equal(slots.length, 8);
  assert.deepEqual(slots.filter((_, index) => index % 2 === 0).map((slot) => slot.startsAt.toISOString()), [
    "2026-10-30T13:00:00.000Z", "2026-11-02T14:00:00.000Z", "2026-11-04T14:00:00.000Z", "2026-11-06T14:00:00.000Z",
  ]);
  assert.equal(availabilitySlots(windowInput({ recurrence: { until: "2026-11-10", weekdays: [2] } }), "Asia/Kolkata", now).length, 2);
});

test("weekly patterns reject invalid dates, missing weekdays, DST gaps and excessive batches", () => {
  for (const recurrence of [
    { until: "2026-11-20", weekdays: [] }, { until: "2026-11-20", weekdays: [1, 1] },
    { until: "2026-11-20", weekdays: [7] }, { until: "2027-02-30", weekdays: [1] },
    { until: "2026-11-20", weekdays: [1], role: "admin" },
  ]) assert.equal(availabilityInput.safeParse(windowInput({ recurrence })).success, false);
  assert.throws(() => availabilitySlots(windowInput({ recurrence: { until: "2026-11-09", weekdays: [2] } }), "UTC", now), /end date/);
  assert.throws(() => availabilitySlots(windowInput({ recurrence: { until: "2026-11-10", weekdays: [1] } }), "UTC", now), /No selected weekdays/);
  assert.throws(() => availabilitySlots(windowInput({ end: "2026-11-11T10:00", recurrence: { until: "2026-11-20", weekdays: [2] } }), "UTC", now), /same date/);
  assert.throws(() => availabilitySlots(windowInput({ start: "2027-02-30T09:00", end: "2027-02-30T10:00", recurrence: { until: "2027-03-05", weekdays: [1] } }), "UTC", now), /calendar date/);
  assert.throws(() => availabilitySlots(windowInput({ start: "2027-03-07T02:00", end: "2027-03-07T03:00", recurrence: { until: "2027-03-14", weekdays: [0] } }), "America/New_York", now), /2027-03-14.*daylight saving/);
  assert.throws(() => availabilitySlots(windowInput({ start: "2026-11-01T00:00", end: "2026-11-01T12:00", duration: 15, recurrence: { until: "2027-01-01", weekdays: [0, 1, 2, 3, 4, 5, 6] } }), "UTC", now), /2,000 slots/);
});

test("a later conflict or capacity failure leaves the entire recurring batch unsaved", async () => {
  const s = store();
  await changeSchedule(s.id, (p) => addAvailability(p, windowInput({ start: "2026-11-12T09:00", end: "2026-11-12T10:00" }), now), s.repository);
  const before = structuredClone(s.records.get(s.id));
  const pattern = windowInput({ recurrence: { until: "2026-11-12", weekdays: [2, 4] } });
  await assert.rejects(changeSchedule(s.id, (p) => addAvailability(p, pattern, now), s.repository), { status: 409 });
  assert.deepEqual(s.records.get(s.id), before);
  const full = s.records.get(s.id);
  full.slots = Array.from({ length: scheduleCapacity - 1 }, (_, index) => ({ ...before.slots[0], _id: String(index), status: "cancelled" }));
  const atCapacity = structuredClone(full);
  await assert.rejects(changeSchedule(s.id, (p) => addAvailability(p, pattern, now), s.repository), /capacity/);
  assert.deepEqual(s.records.get(s.id), atCapacity);
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

test("bulk removal handles whole days, partial-hour overlaps, and preserves bookings and other days", async () => {
  const s = store();
  await changeSchedule(s.id, (p) => addAvailability(p, windowInput({ end: "2026-11-10T12:00" }), now), s.repository);
  await changeSchedule(s.id, (p) => addAvailability(p, windowInput({ start: "2026-11-11T09:00", end: "2026-11-11T10:00" }), now), s.repository);
  let p = s.records.get(s.id);
  p.slots[0].status = "booked"; p.slots[0].userId = patient.id;
  p.slots[1].status = "cancelled"; p.slots[2].status = "blocked";
  const keptIds = [p.slots[0]._id, p.slots[1]._id, ...p.slots.slice(6).map((slot) => slot._id)];
  const hours = { scope: "hours", date: "2026-11-10", startTime: "10:15", endTime: "10:45" };
  assert.equal(availabilityRemovalSelection(p.slots, hours, p.timeZone).removable.length, 2, "partial overlaps remove the complete slots");
  const partial = await changeSchedule(s.id, (provider) => removeAvailability(provider, hours, p.revision, admin), s.repository);
  assert.equal(partial.removedCount, 2);
  p = s.records.get(s.id);
  const day = { scope: "day", date: "2026-11-10" };
  assert.equal(availabilityRemovalSelection(p.slots, day, p.timeZone).bookedCount, 1);
  const result = await changeSchedule(s.id, (provider) => removeAvailability(provider, day, p.revision, admin), s.repository);
  assert.equal(result.removedCount, 2);
  assert.deepEqual(result.provider.slots.map((slot) => slot._id), keptIds);
  const noMatches = await changeSchedule(s.id, (provider) => removeAvailability(provider, day, result.provider.revision, admin), s.repository);
  assert.equal(noMatches.removedCount, 0);
  assert.equal(noMatches.provider.slots[0].status, "booked");
});

test("whole-day removal follows provider calendar boundaries through DST and midnight", () => {
  const make = (start, end) => ({ startsAt: new Date(start), endsAt: new Date(end), status: "available" });
  const slots = [make("2026-11-01T03:30Z", "2026-11-01T04:00Z"), make("2026-11-01T04:00Z", "2026-11-01T05:00Z"),
    make("2026-11-01T05:00Z", "2026-11-01T06:00Z"), make("2026-11-02T04:30Z", "2026-11-02T05:30Z"), make("2026-11-02T05:30Z", "2026-11-02T06:00Z")];
  assert.deepEqual(availabilityRemovalSelection(slots, { scope: "day", date: "2026-11-01" }, "America/New_York").removable, slots.slice(1, 4));
  assert.throws(() => availabilityRemovalSelection(slots, { scope: "hours", date: "2026-11-01", startTime: "01:00", endTime: "03:00" }, "America/New_York"), /daylight saving/);
  assert.throws(() => availabilityRemovalSelection(slots, { scope: "hours", date: "2026-11-10", startTime: "10:00", endTime: "09:00" }, "UTC"), /end time/);
  assert.throws(() => availabilityRemovalSelection(slots, { scope: "day", date: "2026-02-30" }, "UTC"));
});

test("bulk removal refuses stale previews and races atomically with booking", async () => {
  const s = store();
  await changeSchedule(s.id, (p) => addAvailability(p, windowInput(), now), s.repository);
  const before = structuredClone(s.records.get(s.id));
  const selection = { scope: "day", date: "2026-11-10" };
  await assert.rejects(changeSchedule(s.id, (p) => removeAvailability(p, selection, before.revision, patient), s.repository), { status: 403 });
  const outcomes = await Promise.allSettled([
    changeSchedule(s.id, (p) => changeSlot(p, before.slots[0]._id, "book", patient, now), s.repository),
    changeSchedule(s.id, (p) => removeAvailability(p, selection, before.revision, admin), s.repository),
  ]);
  assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
  const saved = s.records.get(s.id);
  assert.equal(saved.slots[0].status, "booked");
  await assert.rejects(changeSchedule(s.id, (p) => removeAvailability(p, selection, before.revision, admin), s.repository), { status: 409 });
  assert.deepEqual(s.records.get(s.id), saved);
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
  const allSlotsUrl = `/providers/${s.id}/slots`;
  assert.equal((await request(allSlotsUrl)).status, 400, "patients still require a bounded date range");
  const savedSlots = await (await request(allSlotsUrl, "GET", undefined, "admin")).json();
  assert.equal(savedSlots.slots.length, 2, "admins see saved slots beyond the current week");
  const rewriteQuery = `path=${encodeURIComponent(`appointments/providers/${s.id}/slots`)}`;
  const rewrittenAll = await request(`${allSlotsUrl}?${rewriteQuery}`, "GET", undefined, "admin");
  assert.equal(rewrittenAll.status, 200, "Vercel's captured rewrite path must not be treated as a date filter");
  assert.equal((await rewrittenAll.json()).slots.length, 2);
  assert.equal((await request(`${allSlotsUrl}?${rewriteQuery}`)).status, 400, "routing metadata does not allow patients to read all dates");
  const rewrittenWeek = `${allSlotsUrl}?${rewriteQuery}&from=2026-11-10T00:00:00Z&to=2026-11-11T00:00:00Z`;
  for (const role of ["admin", "patient"]) {
    const response = await request(rewrittenWeek, "GET", undefined, role);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.slots.length, 2);
    if (role === "patient") assert.equal(body.slots[0].meetingUrl, undefined);
  }
  assert.equal((await request(`${allSlotsUrl}?${rewriteQuery}&from=invalid`, "GET", undefined, "admin")).status, 400);
  assert.equal((await request(`${allSlotsUrl}?${rewriteQuery}&status=available`, "GET", undefined, "admin")).status, 400);
  const secondWindow = windowInput({ start: "2026-12-15T09:00", end: "2026-12-15T10:00" });
  assert.equal((await request(`/providers/${s.id}/availability`, "POST", secondWindow, "admin")).status, 201);
  const duplicate = await request(`/providers/${s.id}/availability`, "POST", secondWindow, "admin");
  assert.equal(duplicate.status, 409);
  assert.match((await duplicate.json()).message, /overlaps/);
  const reloadedSlots = await (await request(allSlotsUrl, "GET", undefined, "admin")).json();
  assert.equal(reloadedSlots.slots.length, 4, "all dates retain both windows after an overlap error");
  assert.equal(reloadedSlots.slots.at(-1).startsAt, "2026-12-15T14:30:00.000Z");
  const repeating = windowInput({ start: "2026-12-21T09:00", end: "2026-12-21T10:00", recurrence: { until: "2026-12-30", weekdays: [1, 3] } });
  assert.equal((await request(`/providers/${s.id}/availability`, "POST", repeating)).status, 403);
  assert.equal((await request(`/providers/${s.id}/availability`, "POST", { ...repeating, recurrence: { until: "2026-12-30", weekdays: [] } }, "admin")).status, 400);
  assert.equal((await request(`/providers/${s.id}/availability`, "POST", repeating, "admin")).status, 201);
  assert.equal((await (await request(allSlotsUrl, "GET", undefined, "admin")).json()).slots.length, 12);
  for (const query of ["?from=invalid", "?status=available", "?from=2026-11-10T00:00:00Z&to=2027-01-01T00:00:00Z"]) {
    assert.equal((await request(allSlotsUrl + query, "GET", undefined, "admin")).status, 400);
  }
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
  const previewUrl = `/providers/${s.id}/availability/removal-preview`, removeUrl = `/providers/${s.id}/availability/remove`;
  const daySelection = { scope: "day", date: "2026-11-10" };
  assert.equal((await request(previewUrl, "POST", daySelection)).status, 403);
  assert.equal((await request(removeUrl, "POST", { selection: daySelection, revision: 0 })).status, 403);
  assert.equal((await request(previewUrl, "POST", { ...daySelection, status: "booked" }, "admin")).status, 400);
  assert.equal((await request(previewUrl, "POST", { scope: "hours", date: "2026-11-10", startTime: "10:00", endTime: "09:00" }, "admin")).status, 400);
  const previewResponse = await request(previewUrl, "POST", daySelection, "admin");
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.equal(preview.removableCount, 1);
  assert.equal((await request(removeUrl, "POST", { selection: daySelection }, "admin")).status, 400);
  const removal = await request(removeUrl, "POST", { selection: daySelection, revision: preview.revision }, "admin");
  assert.equal(removal.status, 200);
  assert.equal((await removal.json()).removedCount, 1);
  assert.equal((await request(removeUrl, "POST", { selection: daySelection, revision: preview.revision }, "admin")).status, 409);
  const retained = s.records.get(s.id).slots;
  assert.equal(retained.length, 11);
  assert.ok(retained.some((slot) => slot._id === available.slots[0]._id && slot.status === "cancelled"));
  assert.ok(audits.some((entry) => entry.action === "APPOINTMENT_AVAILABILITY_REMOVED" && entry.metadata.removedCount === 1));
  assert.ok(audits.some((entry) => entry.action === "APPOINTMENT_UPDATED"));
  assert.ok(audits.every((entry) => !entry.metadata?.patientEmail));
});
