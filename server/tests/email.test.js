import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { emailConfigured, sendEmail, sendRegistrationEmail } from "../services/email.js";
import { createEmailRouter } from "../routes/emailRoutes.js";

const env = { SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "test", SMTP_PASS: "synthetic", SMTP_FROM: "support@example.com" };
test("SMTP requires valid configuration, TLS and disables content access", async () => {
  assert.equal(emailConfigured({}), false);
  await assert.rejects(sendEmail({ to: "test@example.com" }, { env: {} }), { code: "SMTP_CONFIG" });
  let closed = false;
  await sendEmail({ to: "test@example.com", subject: "Account", text: "Test" }, {
    env, createTransport: (options) => {
      assert.equal(options.requireTLS, true);
      assert.equal(options.secure, false);
      assert.equal(options.disableFileAccess, true);
      return { sendMail: async (mail) => { assert.equal(mail.to.address, "test@example.com"); return { accepted: ["test@example.com"] }; }, close: () => { closed = true; } };
    },
  });
  assert.equal(closed, true);
});
test("welcome distinguishes pending and active accounts and safely handles failure", async () => {
  for (const accountStatus of ["pending", "active"]) {
    const result = await sendRegistrationEmail({ email: "test@example.com", accountStatus }, {
      send: async (mail) => assert.match(mail.text, accountStatus === "pending" ? /pending activation/ : /account is active/),
    });
    assert.equal(result, "accepted");
  }
  const reports = [];
  assert.equal(await sendRegistrationEmail({ email: "test@example.com" }, {
    send: async () => { throw Object.assign(new Error("secret SMTP response"), { code: "EAUTH" }); },
    report: (value) => reports.push(value),
  }), "failed");
  assert.deepEqual(reports, ["authentication_failed"]);
});
test("admin email rejects unauthenticated, unauthorized, invalid and deleted recipients", async (t) => {
  const sent = [];
  const userId = "71ad5df1-ad2e-467d-97bd-67ffbde20fc0";
  const app = express(); app.use(express.json());
  app.use(createEmailRouter({
    authenticate: (req, res, next) => { if (!req.headers.authorization) return res.sendStatus(401); req.user = { id: userId, role: req.headers.authorization }; next(); },
    authorize: (req, res, next) => req.user.role === "admin" ? next() : res.sendStatus(403),
    findUser: async (id) => id === userId ? { email: "recipient@example.com", accountStatus: "pending" } : { email: "deleted@example.com", accountStatus: "deleted" },
    send: async (mail) => sent.push(mail), audit: async () => {}, configured: () => true,
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const post = (body, authorization) => fetch(`http://127.0.0.1:${server.address().port}/`, { method: "POST", headers: { "Content-Type": "application/json", ...(authorization ? { authorization } : {}) }, body: JSON.stringify(body) });
  const body = { userId, subject: "Support", text: "Hello" };
  assert.equal((await post(body)).status, 401);
  assert.equal((await post(body, "patient")).status, 403);
  assert.equal((await post({ ...body, subject: "Hello\r\nBcc: other@example.com" }, "admin")).status, 400);
  assert.equal((await post({ ...body, to: "other@example.com" }, "admin")).status, 400);
  assert.equal((await post({ ...body, userId: "81ad5df1-ad2e-467d-97bd-67ffbde20fc0" }, "admin")).status, 404);
  assert.equal((await post(body, "admin")).status, 200);
  assert.deepEqual(sent, [{ to: "recipient@example.com", subject: "Support", text: "Hello" }]);
});
