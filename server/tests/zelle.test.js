import test from "node:test";
import assert from "node:assert/strict";
import { nextBillingDate, zelleRecipient } from "../../shared/zelle.js";
import { memberStatus } from "../services/memberStatus.js";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import AuditLog from "../models/AuditLog.js";
import Plan from "../models/membershipPlans.js";
import billingRouter from "../routes/membershipBillingRoutes.js";

test("Zelle periods handle month ends and cancellation returns to Free", () => {
  assert.equal(nextBillingDate("2026-01-31T12:00:00Z").toISOString(), "2026-02-28T12:00:00.000Z");
  assert.equal(nextBillingDate("2028-01-31T12:00:00Z").toISOString(), "2028-02-29T12:00:00.000Z");
  assert.equal(zelleRecipient.phone, "786-280-7650");
  assert.equal(memberStatus({ zelle: { status: "pending", name: "Gold" } }).current.status, "Awaiting Zelle payment confirmation");
  assert.equal(memberStatus({ zelle: { status: "canceled" } }).current.name, "Free membership");
});

test("admin confirmation advances one period atomically; canceled and paid accounts skip reminders", async (t) => {
  const priorSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = "synthetic-test-secret";
  t.after(() => { if (priorSecret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = priorSecret; });
  const user = { _id: "patient-test", accountStatus: "active", zelle: { status: "pending", price: 20, dueAt: new Date("2026-01-01T00:00:00Z") } };
  t.mock.method(User, "findById", (id) => ["admin-test", "ordinary-user"].includes(id) ? { select: async () => ({ _id: id, accountStatus: "active", role: id === "admin-test" ? "admin" : "patient" }) } : Promise.resolve(user));
  t.mock.method(AuditLog, "create", async () => ({}));
  let writes = 0;
  t.mock.method(User, "updateOne", async (filter, update) => {
    if (filter["zelle.dueAt"]?.getTime() !== user.zelle.dueAt.getTime()) return { modifiedCount: 0 };
    assert.equal(update.$push["zelle.payments"].confirmedBy, "admin-test");
    user.zelle.dueAt = update.$set["zelle.dueAt"]; user.zelle.status = "active"; writes++;
    return { modifiedCount: 1 };
  });
  const app = express(); app.use(express.json()); app.use(cookieParser()); app.use(billingRouter);
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const token = jwt.sign({ userId: "admin-test", role: "admin" }, process.env.JWT_ACCESS_SECRET);
  const post = (path, body) => fetch(`http://127.0.0.1:${server.address().port}/${path}`, { method: "POST", headers: { Cookie: `accessToken=${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const input = { dueAt: user.zelle.dueAt.toISOString(), reference: "synthetic-bank-reference" };
  const denied = await fetch(`http://127.0.0.1:${server.address().port}/patient-test/confirm`, { method: "POST", headers: { Cookie: `accessToken=${jwt.sign({ userId: "ordinary-user", role: "patient" }, process.env.JWT_ACCESS_SECRET)}`, "Content-Type": "application/json" }, body: JSON.stringify(input) });
  assert.equal(denied.status, 403);
  for (const path of ["patient-test/details", "patient-test/confirm-invoice", "patient-test/zelle"]) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${path}`, { method: path.endsWith("details") ? "GET" : "POST", headers: { Cookie: `accessToken=${jwt.sign({ userId: "ordinary-user", role: "patient" }, process.env.JWT_ACCESS_SECRET)}` } });
    assert.equal(response.status, 403);
  }
  assert.equal(writes, 0);
  assert.equal((await post("patient-test/confirm", input)).status, 200);
  assert.equal((await post("patient-test/confirm", input)).status, 409);
  assert.equal(writes, 1);
  user.zelle.status = "canceled";
  assert.equal((await (await post("patient-test/remind")).json()).outcome, "skipped");
  user.zelle.status = "active"; user.zelle.dueAt = new Date(Date.now() + 86400000);
  assert.equal((await (await post("patient-test/remind")).json()).outcome, "skipped");
  t.mock.method(Plan, "findById", async () => ({ _id: "111111111111111111111111", name: "Bronze", price: 20 }));
  t.mock.method(User, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter._id, "patient-test");
    assert.equal(filter.accountStatus, "active");
    assert.equal(filter.stripeSubscriptionId, null);
    assert.equal(update.$set["zelle.status"], "pending");
    return user;
  });
  assert.equal((await post("patient-test/zelle", { planId: "111111111111111111111111" })).status, 200);
  user.accountStatus = "suspended";
  assert.equal((await post("patient-test/zelle", { planId: "111111111111111111111111" })).status, 409);
});
