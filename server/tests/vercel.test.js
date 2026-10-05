import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { createDatabaseConnector } from "../config/database.js";
import { createApp } from "../app.js";

test("database connections are shared by concurrent requests and reused while connected", async () => {
  let calls = 0;
  let complete;
  const client = { connection: { readyState: 0 }, connect: async (uri, options) => {
    calls++; assert.equal(uri, "mongodb://synthetic"); assert.equal(options.maxPoolSize, 5);
    await new Promise((resolve) => { complete = resolve; });
    client.connection.readyState = 1; return client;
  } };
  const connect = createDatabaseConnector(client, { MONGO_URI: "mongodb://synthetic" });
  const first = connect(); const second = connect(); complete();
  assert.equal(await first, client); assert.equal(await second, client);
  await connect(); assert.equal(calls, 1);
});

test("failed connections retry and missing configuration fails without a localhost fallback", async () => {
  let calls = 0;
  const client = { connection: { readyState: 0 }, connect: async () => { calls++; if (calls === 1) throw new Error("synthetic failure"); return client; } };
  const connect = createDatabaseConnector(client, { MONGODB_URI: "mongodb://synthetic" });
  await assert.rejects(connect()); await connect(); assert.equal(calls, 2);
  await assert.rejects(createDatabaseConnector(client, {})(), /not configured/);
});

test("API health, database failures, JSON 404s and raw signed webhooks work", async (t) => {
  const keys = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  const original = keys.map((key) => process.env[key]);
  t.after(() => keys.forEach((key, index) => {
    if (original[index] === undefined) delete process.env[key];
    else process.env[key] = original[index];
  }));
  process.env.STRIPE_SECRET_KEY = "sk_test_synthetic";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_synthetic";
  let fail = false;
  const app = createApp({ connectDatabase: async () => { if (fail) throw new Error("sensitive database details"); }, trustProxy: 1 });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(base + "/api/health");
  assert.equal(health.status, 200); assert.equal(health.headers.get("cache-control"), "no-store");
  assert.deepEqual(await health.json(), { status: "ok" });
  assert.equal((await fetch(base + "/api/unknown")).status, 404);
  const payload = JSON.stringify({ id: "evt_synthetic", type: "test.event", data: { object: {} } });
  const stripe = new Stripe("sk_test_synthetic");
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_synthetic" });
  const webhook = await fetch(base + "/api/payments/webhook", { method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": signature }, body: payload });
  assert.equal(webhook.status, 200); assert.deepEqual(await webhook.json(), { received: true });
  fail = true;
  const failure = await fetch(base + "/api/health");
  assert.equal(failure.status, 503);
  assert.deepEqual(await failure.json(), { message: "Database is temporarily unavailable." });
});
