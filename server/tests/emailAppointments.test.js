import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import { renderEmailTemplate, hasAppointmentPlaceholders } from "../../shared/emailTemplates.js";
import { emailAppointments, emailAppointment } from "../services/emailAppointments.js";
import { createEmailRouter } from "../routes/emailRoutes.js";

const sample = { startsAt: "2026-11-16T02:00:00Z", timeZone: "America/New_York", providerName: "Dr. Synthetic" };
test("appointment placeholders render the provider's local date/time, DST and Spanish, and remain visible without a booking", () => {
  const template = { subject: "Consultation with {{providerName}}", text: "{{firstName}}: {{appointmentDate}} at {{appointmentTime}}" };
  const rendered = renderEmailTemplate(template, { firstName: "Alex" }, sample);
  assert.equal(rendered.subject, "Consultation with Dr. Synthetic");
  assert.match(rendered.text, /Sunday, November 15, 2026 at 9:00 PM EST/);
  assert.match(renderEmailTemplate(template, {}, sample, "es-US").text, /noviembre/);
  assert.match(renderEmailTemplate(template, {}, { ...sample, startsAt: "2026-11-01T05:30:00Z" }).text, /1:30 AM EDT/);
  assert.match(renderEmailTemplate(template, {}, { ...sample, startsAt: "2026-11-01T06:30:00Z" }).text, /1:30 AM EST/);
  assert.match(renderEmailTemplate(template, {}).text, /\{\{appointmentDate\}\}/);
  assert.equal(hasAppointmentPlaceholders(template), true);
  assert.equal(hasAppointmentPlaceholders({ subject: "Hello", text: "General account help" }), false);
  assert.ok(!renderEmailTemplate({ subject: "{{providerName}}", text: "Test" }, {}, { ...sample, providerName: "Dr. Test\r\nBcc: invalid" }).subject.includes("\n"));
});

function fixture() {
  const userId = randomUUID(), otherId = randomUUID();
  const slot = { _id: randomUUID(), userId, status: "booked", startsAt: new Date(sample.startsAt), meetingUrl: "https://private.example.com", patientEmail: "private@example.com" };
  const provider = { _id: randomUUID(), name: sample.providerName, timeZone: sample.timeZone, revision: 3, slots: [slot, { ...slot, _id: randomUUID(), userId: otherId }, { ...slot, _id: randomUUID(), status: "cancelled" }] };
  const providers = { find: () => ({ select: () => ({ lean: async () => [provider] }) }), findById: (id) => ({ select: () => ({ lean: async () => id === provider._id ? provider : null }) }) };
  const selection = { providerId: provider._id, slotId: slot._id, revision: provider.revision };
  return { userId, otherId, slot, provider, providers, selection };
}
test("appointment email lookups isolate recipient bookings and omit private meeting and patient data", async () => {
  const f = fixture();
  const results = await emailAppointments(f.userId, { providers: f.providers, now: new Date("2026-11-01") });
  assert.equal(results.length, 1); assert.equal(results[0].slotId, f.slot._id);
  assert.deepEqual(Object.keys(results[0]).sort(), ["providerId", "slotId", "revision", "providerName", "timeZone", "startsAt"].sort());
  assert.equal(await emailAppointment(f.otherId, f.selection, { providers: f.providers }), null);
  assert.equal(await emailAppointment(f.userId, { ...f.selection, revision: 2 }, { providers: f.providers }), null);
  f.slot.status = "cancelled";
  assert.equal(await emailAppointment(f.userId, f.selection, { providers: f.providers }), null);
});

test("admin mail requires a current recipient booking, rejects forged details and resolves placeholders server-side", async (t) => {
  const f = fixture(), sent = [];
  const app = express(); app.use(express.json());
  app.use(createEmailRouter({
    authenticate: (req, res, next) => { if (!req.headers["x-role"]) return res.sendStatus(401); req.user = { id: "synthetic-admin", role: req.headers["x-role"] }; next(); },
    authorize: (req, res, next) => req.user.role === "admin" ? next() : res.sendStatus(403),
    findUser: async (id) => id === f.userId || id === f.otherId ? { email: "synthetic@example.com", firstName: "Alex", accountStatus: "active" } : null,
    listAppointments: (id) => emailAppointments(id, { providers: f.providers, now: new Date("2026-11-01") }),
    findAppointment: (id, selection) => emailAppointment(id, selection, { providers: f.providers }),
    send: async (mail) => sent.push(mail), audit: async () => {},
  }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, role) => fetch(base + path, { headers: role ? { "x-role": role } : {} });
  const post = (body, language) => fetch(base + "/", { method: "POST", headers: { "Content-Type": "application/json", "x-role": "admin", ...(language ? { "Accept-Language": language } : {}) }, body: JSON.stringify(body) });
  assert.equal((await get(`/appointments/${f.userId}`)).status, 401);
  assert.equal((await get(`/appointments/${f.userId}`, "patient")).status, 403);
  assert.equal((await get("/appointments/invalid", "admin")).status, 400);
  const list = await (await get(`/appointments/${f.userId}`, "admin")).json();
  assert.equal(list.appointments.length, 1);
  const message = { userId: f.userId, subject: "Consultation with {{providerName}}", text: "{{firstName}}: {{appointmentDate}} at {{appointmentTime}}" };
  assert.equal((await post(message)).status, 400, "unresolved appointment placeholders are never sent");
  assert.equal((await post({ ...message, appointment: { ...f.selection, providerName: "Forged" } })).status, 400);
  assert.equal((await post({ ...message, userId: f.otherId, appointment: f.selection })).status, 409, "another patient's appointment cannot be used");
  assert.equal((await post({ ...message, appointment: f.selection })).status, 200);
  assert.equal(sent.length, 1); assert.equal(sent[0].subject, "Consultation with Dr. Synthetic");
  assert.match(sent[0].text, /November 15, 2026 at 9:00 PM EST/);
  assert.ok(!sent[0].text.includes("{{"));
  assert.equal((await post({ ...message, appointment: f.selection }, "es")).status, 200);
  assert.match(sent[1].text, /noviembre/);
  f.provider.revision++;
  assert.equal((await post({ ...message, appointment: f.selection })).status, 409, "a stale preview must be refreshed");
  f.slot.status = "cancelled";
  assert.equal((await post({ ...message, appointment: { ...f.selection, revision: f.provider.revision } })).status, 409);
  assert.equal(sent.length, 2);
});
