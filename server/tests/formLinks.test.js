import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import User from "../models/users.js";
import AuditLog from "../models/AuditLog.js";
import { createFormLinkRouter } from "../routes/formLinkRoutes.js";
import { createEmailRouter } from "../routes/emailRoutes.js";
import { qrAttachment, formLinkEmail } from "../services/formLinks.js";
import { formLinkInput, MAX_QR_BYTES } from "../../shared/formLinks.js";
import { sendEmail } from "../services/email.js";
import { notifyFormLibraryChanged, subscribeFormLibraryRefresh } from "../../src/util/formLibraryEvents.js";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const input = { title: "New patient form", url: "https://forms.example.com/share?form=synthetic&lang=en", description: "General reusable form", enabled: true, qrImage: png };
test("form metadata rejects unsafe URLs, forged fields and non-image/oversized QR uploads", () => {
  assert.equal(formLinkInput.safeParse(input).success, true);
  assert.equal(formLinkInput.safeParse({ ...input, url: "" }).success, true, "QR-only entries are supported");
  assert.equal(formLinkInput.safeParse({ ...input, url: "", qrImage: "" }).success, false);
  for (const url of ["javascript:alert(1)", "http://example.com", "https://user:password@example.com", "https://example.com/\npath"]) assert.equal(formLinkInput.safeParse({ ...input, url }).success, false);
  assert.equal(formLinkInput.safeParse({ ...input, patientId: "forged" }).success, false);
  assert.throws(() => qrAttachment({ qrImage: "data:image/png;base64,SGVsbG8=" }));
  assert.throws(() => qrAttachment({ qrImage: "data:image/svg+xml;base64,PHN2Zz4=" }));
  assert.throws(() => qrAttachment({ qrImage: `data:image/png;base64,${Buffer.alloc(MAX_QR_BYTES + 1).toString("base64")}` }));
  const mail = formLinkEmail("Please complete these forms.", [{ _id: "synthetic", ...input, hasQrImage: true }]);
  assert.ok(mail.text.includes(`${input.title}\n${input.url}`));
  assert.equal(mail.attachments[0].filename, "form-synthetic.png");
  assert.ok(Buffer.isBuffer(mail.attachments[0].content));
  assert.equal("path" in mail.attachments[0], false, "QR attachments never fetch a file or URL");
});

test("admin library persists titles, links and QR images; sending uses stored active forms and attaches QR bytes", async (t) => {
  const previous = process.env.JWT_ACCESS_SECRET; process.env.JWT_ACCESS_SECRET = "synthetic-form-link-secret";
  t.after(() => { if (previous === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previous; });
  t.mock.method(User, "findById", (id) => ({ select: async () => ({ _id: id, role: id === "admin" ? "admin" : "patient", accountStatus: "active" }) }));
  t.mock.method(AuditLog, "create", async () => ({}));
  const items = new Map(), sent = [], audited = [];
  const matching = (filter) => [...items.values()].filter((item) => {
    if (filter.enabled !== undefined && item.enabled !== filter.enabled) return false;
    if (!filter.$or) return true;
    return filter.$or.some((condition) => Object.entries(condition).some(([key, value]) => new RegExp(value.$regex, value.$options).test(item[key] || "")));
  });
  const links = {
    create: async (data) => { const item = { _id: randomUUID(), ...data }; items.set(item._id, item); return item; },
    findByIdAndUpdate: async (id, update) => { const item = items.get(id); if (!item) return null; Object.assign(item, update.$set); return item; },
    findById: (id) => ({ select: () => ({ lean: async () => items.get(id) }) }),
    find: (filter) => {
      const chain = { select: (selection) => { assert.ok(!selection.includes("qrImage"), "list excludes QR payloads"); return chain; }, sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => matching(filter).map((item) => { const metadata = { ...item }; delete metadata.qrImage; return metadata; }) };
      return chain;
    },
    countDocuments: async (filter) => matching(filter).length,
  };
  const audit = async (event) => { const record = { ...event }; delete record.req; audited.push(record); };
  const app = express(); app.use(express.json({ limit: "1mb" }), cookieParser());
  app.use("/forms", createFormLinkRouter({ links, audit }));
  app.use("/email", createEmailRouter({ audit, findUser: async () => ({ email: "synthetic@example.com", accountStatus: "active" }), findForms: async (ids) => [...items.values()].filter((item) => ids.includes(item._id) && item.enabled).reverse(), send: async (mail) => sent.push(mail) }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, { method = "GET", body, as = "admin" } = {}) => fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(as ? { cookie: `accessToken=${jwt.sign({ userId: as, role: as === "admin" ? "admin" : "patient" }, process.env.JWT_ACCESS_SECRET)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await request("/forms", { as: null })).status, 401);
  assert.equal((await request("/forms", { as: "patient" })).status, 403);
  assert.equal((await request("/forms", { method: "POST", body: { ...input, url: "javascript:alert(1)" } })).status, 400);
  let response = await request("/forms", { method: "POST", body: input });
  assert.equal(response.status, 200);
  const first = (await response.json()).link;
  assert.equal(first.hasQrImage, true); assert.equal(items.get(first._id).qrImage, png);
  const composer = await (await request("/forms?enabled=true&search=&page=1&path=admin%2Fform-links")).json();
  assert.equal(composer.total, 1, "the exact composer query finds a newly saved available form");
  assert.equal(composer.links[0]._id, first._id);
  const second = (await (await request("/forms", { method: "POST", body: { ...input, title: "Follow-up form", qrImage: "" } })).json()).link;
  const list = await (await request("/forms")).json(); assert.equal(list.total, 2);
  assert.ok(!JSON.stringify(list).includes(png));
  assert.equal((await request("/forms?page=-1")).status, 400);
  const detail = await (await request(`/forms/${first._id}`)).json(); assert.equal(detail.link.qrImage, png);
  const email = { userId: randomUUID(), subject: "Forms to complete", text: "Hello, please complete these forms.", formLinkIds: [first._id, second._id] };
  response = await request("/email", { method: "POST", body: email }); assert.equal(response.status, 200);
  assert.equal(sent.length, 1); assert.equal(sent[0].attachments.length, 1);
  assert.equal(sent[0].text.indexOf(input.title) < sent[0].text.indexOf(second.title), true, "selected order survives database order");
  assert.ok(sent[0].text.includes(input.url), "query parameters in provider links are preserved");
  assert.equal((await request("/email", { method: "POST", body: { ...email, attachments: [{ path: "https://example.com" }] } })).status, 400);
  assert.equal((await request("/email", { method: "POST", body: { ...email, formLinkIds: [first._id, first._id] } })).status, 400);
  assert.equal((await request("/email", { method: "POST", body: { ...email, formLinkIds: Array.from({ length: 6 }, randomUUID) } })).status, 400);
  assert.equal((await request(`/forms/${first._id}`, { method: "PUT", body: { ...input, enabled: false } })).status, 200);
  const available = await (await request("/forms?enabled=true&search=&page=1")).json();
  assert.deepEqual(available.links.map((item) => item._id), [second._id], "only archived entries are excluded");
  assert.equal((await request("/email", { method: "POST", body: email })).status, 409, "archived forms cannot be sent from a stale selection");
  assert.equal(sent.length, 1);
  assert.ok(audited.some((event) => event.action === "FORM_LINK_SAVED"));
  assert.ok(!JSON.stringify(audited).includes(input.url), "audits omit form URLs and message content");
});

test("an open composer refreshes after form saves, cross-tab changes and returning to a visible tab", () => {
  const browser = new EventTarget(), page = new EventTarget();
  const stored = new Map();
  browser.localStorage = { setItem: (key, value) => stored.set(key, value) };
  page.visibilityState = "visible";
  let refreshes = 0;
  const stop = subscribeFormLibraryRefresh(() => refreshes++, browser, page);
  notifyFormLibraryChanged(browser);
  assert.equal(refreshes, 1, "saving a form invalidates an already-open composer");
  const storage = new Event("storage"); storage.key = [...stored.keys()][0];
  browser.dispatchEvent(storage);
  assert.equal(refreshes, 2, "another tab's form save refreshes the library");
  page.visibilityState = "hidden"; browser.dispatchEvent(new Event("focus"));
  assert.equal(refreshes, 2, "hidden tabs defer work");
  page.visibilityState = "visible"; page.dispatchEvent(new Event("visibilitychange"));
  browser.dispatchEvent(new Event("focus"));
  assert.equal(refreshes, 4, "returning to the composer reloads the saved library");
  stop(); notifyFormLibraryChanged(browser); browser.dispatchEvent(new Event("focus"));
  assert.equal(refreshes, 4, "closing the composer removes refresh listeners");
});

test("SMTP transports saved QR bytes as attachments while keeping file and URL access disabled", async () => {
  const mail = formLinkEmail("Test", [{ _id: "test", ...input, hasQrImage: true }]);
  await sendEmail({ to: "synthetic@example.com", subject: "Synthetic form test", ...mail }, {
    env: { SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "synthetic", SMTP_PASS: "synthetic", SMTP_FROM: "sender@example.com" },
    createTransport: (options) => {
      assert.equal(options.disableFileAccess, true); assert.equal(options.disableUrlAccess, true);
      return { close() {}, sendMail: async (message) => { assert.ok(Buffer.isBuffer(message.attachments[0].content)); assert.equal(message.attachments[0].contentType, "image/png"); return { accepted: ["synthetic@example.com"] }; } };
    },
  });
});
