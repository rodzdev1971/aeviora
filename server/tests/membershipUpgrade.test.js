import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import Plan from "../models/membershipPlans.js";
import AuditLog from "../models/AuditLog.js";
import router from "../routes/membershipUpgradeRoutes.js";

test("Zelle upgrade remains unpaid until an admin confirms; confirmation is idempotent", async (t) => {
  const prior = process.env.JWT_ACCESS_SECRET; process.env.JWT_ACCESS_SECRET = "synthetic-test-secret";
  t.after(() => { if (prior === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = prior; });
  const end = new Date(Date.now() + 15 * 86400000);
  const user = { _id: "member", accountStatus: "active", role: "patient", zelle: { status: "active", name: "Bronze", price: 20, planId: "111111111111111111111111", dueAt: end, payments: [{ periodEnd: end }] } };
  t.mock.method(User, "findById", (id) => {
    const value = id === "admin" ? { _id: "admin", role: "admin", accountStatus: "active" } : user;
    return { select: async () => value, then: (resolve) => resolve(value) };
  });
  t.mock.method(Plan, "findById", async () => ({ _id: "222222222222222222222222", name: "Gold", price: 60 }));
  t.mock.method(AuditLog, "create", async () => ({}));
  let receipts = 0;
  t.mock.method(User, "updateOne", async (filter, update) => {
    if (update.$set.upgradeQuote) user.upgradeQuote = update.$set.upgradeQuote;
    else {
      assert.equal(filter["zelle.planId"], user.zelle.planId);
      assert.equal(update.$push["zelle.payments"].amount, 50);
      assert.equal(update.$push["zelle.payments"].periodEnd - update.$push["zelle.payments"].periodStart, 30 * 86400000);
      user.upgradeQuote.state = "complete"; receipts++;
    }
    return { modifiedCount: 1 };
  });
  const app = express(); app.use(express.json(), cookieParser(), router);
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const post = (path, body, actor = "member") => fetch(`http://127.0.0.1:${server.address().port}/${path}`, { method: "POST", headers: { Cookie: `accessToken=${jwt.sign({ userId: actor }, process.env.JWT_ACCESS_SECRET)}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const preview = await post("preview", { planId: "222222222222222222222222" });
  assert.equal(preview.status, 200);
  const { quote } = await preview.json();
  assert.equal(quote.amountCents, 5000);
  assert.equal(receipts, 0);
  assert.equal((await post("confirm", { quoteId: quote.id, reference: "bank-ref" })).status, 403);
  assert.equal((await post("confirm", { userId: "member", quoteId: quote.id, reference: "bank-ref" }, "admin")).status, 200);
  assert.equal((await post("confirm", { userId: "member", quoteId: quote.id, reference: "bank-ref" }, "admin")).status, 200);
  assert.equal(receipts, 1);
});
