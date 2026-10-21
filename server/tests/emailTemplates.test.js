import test from "node:test";
import assert from "node:assert/strict";
import { registrationTemplate, renderEmailTemplate } from "../../shared/emailTemplates.js";
import { templateInput } from "../routes/emailTemplateRoutes.js";
import EmailTemplate from "../models/emailTemplates.js";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import User from "../models/users.js";
import FormLink from "../models/formLinks.js";
import AuditLog from "../models/AuditLog.js";
import templateRoutes from "../routes/emailTemplateRoutes.js";
import { createEmailRouter } from "../routes/emailRoutes.js";
import { requestEmailVerification } from "../services/emailVerification.js";

test("saved template validates and renders supported placeholders without interpreting content", async () => {
  const template = { name: "Support", subject: "Hello {{firstName}}", text: "{{lastName}}: {{accountStatus}}" };
  assert.equal(templateInput.safeParse(template).success, true);
  await new EmailTemplate(template).validate();
  const rendered = renderEmailTemplate(template, { firstName: "Alex", lastName: "Example", accountStatus: "active" });
  assert.equal(rendered.subject, "Hello Alex");
  assert.match(rendered.text, /account is active/);
  assert.match(renderEmailTemplate(registrationTemplate, { accountStatus: "pending" }).text, /pending activation/);
  assert.equal(templateInput.safeParse({ ...template, subject: "Injected\r\nHeader" }).success, false);
  assert.equal(templateInput.safeParse({ ...template, text: "" }).success, false);
});

test("saved forms persist in templates and reload into messages with QR attachments", async (t) => {
  const previous = process.env.JWT_ACCESS_SECRET; process.env.JWT_ACCESS_SECRET = "synthetic-template-secret";
  t.after(() => { if (previous === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previous; });
  t.mock.method(User, "findById", (id) => ({ select: async () => ({ _id: id, role: "admin", accountStatus: "active" }) }));
  t.mock.method(AuditLog, "create", async () => ({}));
  const forms = [{ _id: randomUUID(), title: "Synthetic intake", url: "https://forms.example.com/intake", enabled: true, hasQrImage: true, qrImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=" }];
  const templates = [], sent = [];
  t.mock.method(FormLink, "countDocuments", async (filter) => forms.filter((form) => form.enabled && filter._id.$in.includes(form._id)).length);
  t.mock.method(FormLink, "find", (filter) => ({ select: (selection) => {
    assert.ok(!selection.includes("qrImage"), "template list does not load QR image payloads");
    return { lean: async () => forms.filter((form) => filter._id.$in.includes(form._id)).map((form) => { const metadata = { ...form }; delete metadata.qrImage; return metadata; }) };
  } }));
  t.mock.method(EmailTemplate, "create", async (data) => { const template = new EmailTemplate(data); await template.validate(); const result = template.toObject(); templates.push(result); return result; });
  t.mock.method(EmailTemplate, "find", () => ({ sort: () => ({ lean: async () => [...templates] }) }));
  const app = express(); app.use(express.json(), cookieParser()); app.use("/templates", templateRoutes);
  app.use("/email", createEmailRouter({ audit: async () => {}, findUser: async () => ({ email: "synthetic@example.com", accountStatus: "active" }), findForms: async (ids) => forms.filter((form) => form.enabled && ids.includes(form._id)), send: async (mail) => sent.push(mail) }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { "Content-Type": "application/json", cookie: `accessToken=${jwt.sign({ userId: "admin", role: "admin" }, process.env.JWT_ACCESS_SECRET)}` };
  const input = { name: "Intake request", subject: "Forms for {{firstName}}", text: "Hello {{firstName}}, please complete the form.", formLinkIds: [forms[0]._id] };
  let response = await fetch(base + "/templates", { method: "POST", headers, body: JSON.stringify(input) });
  assert.equal(response.status, 200);
  const saved = (await response.json()).template;
  assert.deepEqual(saved.formLinkIds, input.formLinkIds); assert.equal(saved.formLinks[0].title, forms[0].title);
  const listed = await (await fetch(base + "/templates", { headers })).json();
  const restored = listed.templates.find((template) => template._id === saved._id);
  assert.equal(restored.formLinks[0].hasQrImage, true);
  assert.ok(!JSON.stringify(restored).includes("base64"));
  response = await fetch(base + "/email", { method: "POST", headers, body: JSON.stringify({ userId: randomUUID(), ...renderEmailTemplate(restored, { firstName: "Alex" }), formLinkIds: restored.formLinks.map((form) => form._id) }) });
  assert.equal(response.status, 200); assert.equal(sent[0].attachments.length, 1); assert.ok(sent[0].text.includes(forms[0].url));
  forms[0].enabled = false;
  response = await fetch(base + "/templates", { method: "POST", headers, body: JSON.stringify(input) });
  assert.equal(response.status, 409, "templates cannot save stale archived selections");
});

test("registration verification keeps its activation link when a saved template includes forms", async () => {
  const template = { ...registrationTemplate, formLinkIds: [randomUUID()] };
  const sent = [];
  const result = await requestEmailVerification("synthetic@example.com", {
    template, origin: "https://example.com", users: { findOneAndUpdate: async () => ({ _id: "synthetic", email: "synthetic@example.com", firstName: "Alex" }) },
    resolveForms: async (selected) => { assert.deepEqual(selected.formLinkIds, template.formLinkIds); return [{ title: "Shared form", url: "https://forms.example.com/shared" }]; }, send: async (mail) => sent.push(mail),
  });
  assert.equal(result, "accepted");
  assert.match(sent[0].text, /https:\/\/example.com\/verify-email#[a-f0-9]{64}/);
  assert.ok(sent[0].text.includes("https://forms.example.com/shared"));
});
