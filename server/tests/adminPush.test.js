import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import express from "express";
import webpush from "web-push";
import { allowedPushEndpoint, pushConfiguration, sendSignupPush, notifyNewSignup } from "../services/adminPush.js";
import { createAdminPushRouter } from "../routes/adminPushRoutes.js";
import { loginDestination } from "../../src/util/loginDestination.js";

const keys = webpush.generateVAPIDKeys();
const env = { WEB_PUSH_PUBLIC_KEY: keys.publicKey, WEB_PUSH_PRIVATE_KEY: keys.privateKey, WEB_PUSH_SUBJECT: "mailto:synthetic@example.com" };
const subscription = (userId, suffix, language = "en") => ({ userId, endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`, keys: { p256dh: keys.publicKey, auth: "a".repeat(22) }, language });

test("push config and endpoint validation reject missing keys, embedded credentials and arbitrary/internal destinations", () => {
  assert.equal(pushConfiguration({}).configured, false); assert.equal(pushConfiguration(env).configured, true);
  for (const value of ["http://fcm.googleapis.com/", "https://127.0.0.1/", "https://example.com/", "https://user:secret@fcm.googleapis.com/", "https://fcm.googleapis.com:8443/", "https://fcm.googleapis.com.attacker.example/", "https://attacker-notify.windows.com/"]) assert.equal(allowedPushEndpoint(value), false, value);
  for (const value of ["https://fcm.googleapis.com/fcm/send/synthetic", "https://updates.push.services.mozilla.com/wpush/v2/synthetic", "https://web.push.apple.com/synthetic", "https://wns2.notify.windows.com/synthetic"]) assert.equal(allowedPushEndpoint(value), true);
});

test("notification destinations survive login without permitting an external redirect", () => {
  assert.equal(loginDestination("/admin/metrics/signups?days=7"), "/admin/metrics/signups?days=7");
  for (const value of [undefined, "https://attacker.example", "//attacker.example", "/\\attacker.example", "javascript:alert(1)"]) assert.equal(loginDestination(value), "/dashboard");
});

test("signup push sends generic localized notices only to eligible admins and removes expired/revoked subscriptions", async () => {
  const items = [subscription("admin-a", "good"), subscription("admin-b", "spanish", "es"), subscription("admin-a", "expired"), subscription("revoked-admin", "revoked"), subscription("admin-a", "temporary")];
  const removed = [], sent = [];
  const repository = { subscriptions: async function* () { yield* items; }, eligibleAdmins: async () => [{ _id: "admin-a" }, { _id: "admin-b" }], remove: async (user, endpoint) => removed.push([user, endpoint]) };
  const result = await sendSignupPush({ env, repository, send: async (target, payload, options) => {
    if (target.endpoint.endsWith("expired")) throw { statusCode: 410 };
    if (target.endpoint.endsWith("temporary")) throw { statusCode: 503 };
    sent.push(JSON.parse(payload)); assert.equal(options.TTL, 86400); assert.equal(options.vapidDetails.privateKey, keys.privateKey);
  } });
  assert.equal(result.sent, 2); assert.equal(result.failed, 2); assert.equal(removed.length, 2);
  assert.ok(sent.some((item) => item.title === "Nuevo registro en Aeviora"));
  assert.ok(sent.every((item) => Object.keys(item).sort().join(",") === "body,title,url" && item.url === "/admin/metrics/signups"));
  assert.ok(!removed.some(([, endpoint]) => endpoint.endsWith("temporary")));
  const own = [];
  await sendSignupPush({ env, repository, userId: "admin-b", test: true, send: async (target, payload) => own.push({ target, payload: JSON.parse(payload) }) });
  assert.equal(own.length, 1); assert.ok(own[0].target.endpoint.endsWith("spanish")); assert.match(own[0].payload.title, /prueba/);
  assert.deepEqual(await sendSignupPush({ env: {}, repository: {} }), { configured: false, sent: 0, failed: 0 });
  assert.equal((await notifyNewSignup({ env, repository: { subscriptions: () => { throw new Error("synthetic failure"); } } })).failed, 1, "notification failures do not abort account registration");
});

test("push subscription API isolates ownership, exposes only the public key, and rejects non-admin or forged subscriptions", async (t) => {
  const stored = new Map(), audits = [];
  const repository = {
    has: async (user, endpoint) => stored.get(endpoint)?.userId === user,
    save: async (user, data, publicKey) => stored.set(data.endpoint, { ...data, userId: user, publicKey }),
    remove: async (user, endpoint) => { if (stored.get(endpoint)?.userId === user) stored.delete(endpoint); },
  };
  const app = express(); app.use(express.json());
  app.use(createAdminPushRouter({ env, repository, audit: async (entry) => audits.push(entry),
    authenticate: (req, res, next) => { if (!req.headers["x-role"]) return res.sendStatus(401); req.user = { id: req.headers["x-user"] || "admin-a", role: req.headers["x-role"] }; next(); },
    authorize: (req, res, next) => req.user.role === "admin" ? next() : res.sendStatus(403),
  }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const call = (path, method = "GET", body, role = "admin", user = "admin-a") => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { "Content-Type": "application/json", ...(role ? { "x-role": role, "x-user": user } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await call("/config", "GET", undefined, "")).status, 401); assert.equal((await call("/config", "GET", undefined, "patient")).status, 403);
  const config = await (await call("/config")).json(); assert.deepEqual(config, { configured: true, publicKey: keys.publicKey }); assert.ok(!JSON.stringify(config).includes(keys.privateKey));
  const { userId: ignored, ...input } = subscription("admin-a", "saved"); assert.equal(ignored, "admin-a");
  assert.equal((await call("/subscriptions", "POST", { ...input, userId: "forged" })).status, 400);
  assert.equal((await call("/subscriptions", "POST", { ...input, endpoint: "https://127.0.0.1/internal" })).status, 400);
  assert.equal((await call("/subscriptions", "POST", input)).status, 201);
  assert.deepEqual(await (await call("/status", "POST", { endpoint: input.endpoint })).json(), { enabled: true });
  await call("/subscriptions", "DELETE", { endpoint: input.endpoint }, "admin", "admin-b"); assert.equal(stored.size, 1);
  assert.deepEqual(await (await call("/status", "POST", { endpoint: input.endpoint }, "admin", "admin-b")).json(), { enabled: false });
  await call("/subscriptions", "DELETE", { endpoint: input.endpoint }); assert.equal(stored.size, 0);
  assert.ok(audits.every((entry) => !entry.metadata?.endpoint && !entry.metadata?.keys));
});

test("the service worker displays background pushes, refreshes open pages, and clicks navigate only to the admin signup page", async () => {
  const listeners = {}, notices = [], messages = [], opened = [];
  const self = { location: { origin: "https://example.com" }, addEventListener: (type, callback) => { listeners[type] = callback; },
    registration: { showNotification: async (title, options) => notices.push({ title, options }) },
    clients: { matchAll: async () => [{ url: "https://example.com/dashboard", postMessage: (value) => messages.push(value), navigate: async (url) => opened.push(url), focus: async () => {} }], openWindow: async (url) => opened.push(url) },
  };
  vm.runInNewContext(await readFile(new URL("../../public/admin-push-sw.js", import.meta.url), "utf8"), { self, URL });
  let work;
  listeners.push({ data: { json: () => ({ title: "Synthetic notice", body: "Synthetic body", url: "https://attacker.example" }) }, waitUntil: (promise) => { work = promise; } }); await work;
  assert.equal(notices[0].title, "Synthetic notice"); assert.equal(notices[0].options.data.url, "/admin/metrics/signups"); assert.equal(messages[0].type, "ADMIN_METRICS_REFRESH");
  listeners.notificationclick({ notification: { close() {}, data: { url: "https://attacker.example" } }, waitUntil: (promise) => { work = promise; } }); await work;
  assert.deepEqual(opened, ["https://example.com/admin/metrics/signups"]);
});
