import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createHash } from "node:crypto";
import { createPasswordResetRouter } from "../routes/passwordResetRoutes.js";

test("recovery sends a hashed single-use token and rejects expired/reused tokens", async (t) => {
  let stored;
  let sent;
  let changed;
  const app = express(); app.use(express.json());
  app.use(createPasswordResetRouter({ origin: () => "https://example.com", hash: async () => "synthetic-hash", send: async (mail) => { sent = mail; }, users: {
    findOneAndUpdate: async (filter, update) => {
      if (filter.email) {
        if (filter.email !== "user@example.com") return null;
        stored = update.$set; return { email: filter.email };
      }
      if (!stored || stored.resetTokenHash !== filter.resetTokenHash || stored.resetExpiresAt <= filter.resetExpiresAt.$gt) return null;
      changed = update; stored = null; return { email: "user@example.com" };
    },
  } }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const post = (path, body) => fetch(`http://127.0.0.1:${server.address().port}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const unknown = await (await post("forgot-password", { email: "missing@example.com" })).json();
  const known = await (await post("forgot-password", { email: "user@example.com" })).json();
  assert.deepEqual(known, unknown);
  const token = sent.text.match(/#([a-f0-9]{64})/)[1];
  assert.equal(stored.resetTokenHash, createHash("sha256").update(token).digest("hex"));
  const payload = { token, newPassword: "synthetic-password-123" };
  assert.equal((await post("reset-password", { ...payload, newPassword: "short" })).status, 400);
  const expiration = stored.resetExpiresAt; stored.resetExpiresAt = new Date(0);
  assert.equal((await post("reset-password", payload)).status, 400);
  stored.resetExpiresAt = expiration;
  assert.equal((await post("reset-password", payload)).status, 200);
  assert.equal(changed.$inc.sessionVersion, 1);
  assert.equal(changed.$set.passwordHash, "synthetic-hash");
  assert.equal((await post("reset-password", payload)).status, 400);
});
