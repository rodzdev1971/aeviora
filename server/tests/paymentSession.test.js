import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import AuditLog from "../models/AuditLog.js";
import authRoutes from "../routes/authRoutes.js";
import { paymentReturnOrigin } from "../services/paymentReturnOrigin.js";

test("payment returns preserve trusted hostnames and reject untrusted origins", (t) => {
  const previous = process.env.FRONTEND_ORIGIN;
  t.after(() => { if (previous === undefined) delete process.env.FRONTEND_ORIGIN; else process.env.FRONTEND_ORIGIN = previous; });
  process.env.FRONTEND_ORIGIN = "https://www.aeviorawellness.com/";
  const resolve = (origin) => paymentReturnOrigin({ get: () => origin });
  for (const origin of ["https://aeviorawellness.com", "https://www.aeviorawellness.com"]) assert.equal(resolve(origin), origin);
  for (const origin of [undefined, "null", "https://aeviorawellness.com.evil.example", "http://aeviorawellness.com", "https://evil.example"]) assert.equal(resolve(origin), "https://www.aeviorawellness.com");
  process.env.FRONTEND_ORIGIN = "https://preview.example";
  assert.equal(resolve("https://aeviorawellness.com"), "https://preview.example");
});

test("production login issues a secure host-only Lax cookie with matching token expiry", async (t) => {
  const previous = { NODE_ENV: process.env.NODE_ENV, JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET };
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  process.env.NODE_ENV = "production";
  process.env.JWT_ACCESS_SECRET = "synthetic-test-secret";
  t.mock.method(User, "findOne", () => ({ select: async () => ({ _id: "synthetic", accountStatus: "active", role: "patient", passwordHash: "synthetic" }) }));
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(AuditLog, "create", async () => ({}));
  const app = express();
  app.use(express.json(), authRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "synthetic@example.com", password: "synthetic" }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=900/);
  assert.doesNotMatch(cookie, /Domain=/);
  const token = jwt.verify(cookie.split(";")[0].slice("accessToken=".length), process.env.JWT_ACCESS_SECRET);
  assert.equal(token.exp - token.iat, 900);
});
