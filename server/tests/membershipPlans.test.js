import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import AuditLog from "../models/AuditLog.js";
import Benefit from "../models/benefits.js";
import MembershipPlan from "../models/membershipPlans.js";
import { requireRole } from "../middleware/auth.js";
import { createMembershipRouter } from "../routes/membershipRoutes.js";
import { membershipInput, resolveMembership, seedMembershipPlans } from "../services/membershipPlans.js";

const first = "111111111111111111111111";
const second = "222222222222222222222222";
const catalog = [{ _id: first, name: "Example panel", price: 35 }, { _id: second, name: "Example imaging", price: 80 }];
const input = () => ({ name: "Bronze", price: 20, benefits: [{ benefitId: first, price: 10 }] });

test("only selected benefits are included and overrides are isolated from catalog and other plans", async () => {
  const bronze = resolveMembership(input(), catalog);
  const silver = resolveMembership({ name: "Silver", price: 40, benefits: [{ benefitId: first, price: null }] }, catalog);
  assert.equal(bronze.benefits.length, 1);
  assert.equal(bronze.price, 20);
  assert.equal(bronze.benefits[0].price, 10);
  assert.equal(bronze.benefits[0].standardPrice, 35);
  assert.equal(bronze.benefits[0].customPrice, true);
  assert.equal(bronze.benefits[0].benefitId, first);
  assert.equal(silver.benefits[0].price, 35);
  assert.equal(catalog[0].price, 35);
  await new MembershipPlan(bronze).validate();
  assert.equal(Benefit.collection.name, "membershipBenefits");
});

test("zero overrides and resetting to standard pricing work; empty catalogs are supported", () => {
  const data = input(); data.benefits[0].price = 0;
  assert.equal(resolveMembership(data, catalog).benefits[0].price, 0);
  data.benefits[0].price = null;
  assert.equal(resolveMembership(data, catalog).benefits[0].price, 35);
  assert.equal(resolveMembership(data, catalog).benefits[0].customPrice, false);
  assert.deepEqual(resolveMembership({ name: "Gold", price: 60, benefits: [] }, []).benefits, []);
  assert.deepEqual(resolveMembership({ name: "Gold", price: 60, benefits: [] }, catalog).benefits, []);
});

test("reject invalid prices, duplicate benefits, forged fields, and removed catalog entries", () => {
  for (const patch of [{ price: -1 }, { price: 1.001 }, { price: "20" }, { name: " " }, { currency: "EUR" },
    { benefits: [{ benefitId: first, price: -1 }] }, { benefits: [{ benefitId: first, price: 1 }, { benefitId: first, price: 2 }] },
    { benefits: [{ benefitId: first, price: 1, name: "Forged" }] }]) {
    assert.equal(membershipInput.safeParse({ ...input(), ...patch }).success, false);
  }
  assert.throws(() => resolveMembership(input(), []), { status: 409 });
  assert.throws(() => resolveMembership(input(), [{ ...catalog[0], price: -1 }]), { status: 409 });
});

test("starter seeding uses insert-only updates and preserves existing customized plans", async () => {
  const records = new Map([["bronze", { name: "Bronze", price: 25 }]]);
  const plans = { updateOne: async (filter, update, options) => {
    assert.equal(options.upsert, true);
    assert.deepEqual(Object.keys(update), ["$setOnInsert"]);
    if (!records.has(filter.nameKey)) records.set(filter.nameKey, update.$setOnInsert);
  } };
  await seedMembershipPlans(plans, catalog);
  await seedMembershipPlans(plans, catalog);
  assert.equal(records.size, 3);
  assert.equal(records.get("bronze").price, 25);
  assert.equal(records.get("silver").price, 40);
  assert.equal(records.get("gold").price, 60);
  assert.equal(records.get("gold").benefits.length, 0);
});

test("membership API enforces admin access and supports create, update, duplicate detection, and deletion", async (t) => {
  t.mock.method(AuditLog, "create", async () => ({}));
  const id = "333333333333333333333333";
  const records = new Map();
  const plans = {
    find: () => ({ sort: async () => [...records.values()] }),
    create: async (data) => {
      if ([...records.values()].some((plan) => plan.nameKey === data.nameKey)) throw Object.assign(new Error(), { code: 11000 });
      const doc = { ...data, _id: id }; records.set(id, doc); return doc;
    },
    findByIdAndUpdate: async (key, update) => {
      if (!records.has(key)) return null;
      const doc = { ...records.get(key), ...update.$set }; records.set(key, doc); return doc;
    },
    findByIdAndDelete: async (key) => { const doc = records.get(key); records.delete(key); return doc; },
  };
  const app = express(); app.use(express.json());
  app.use("/plans", createMembershipRouter({ plans, catalog: async () => catalog, audit: async () => {},
    authenticate: (req, res, next) => {
      if (!req.headers["x-test-role"]) return res.sendStatus(401);
      req.user = { id: "synthetic-admin", role: req.headers["x-test-role"] }; next();
    }, authorize: requireRole("admin"),
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (path = "", method = "GET", body, role = "admin") => fetch(`http://127.0.0.1:${server.address().port}/plans${path}`, {
    method, headers: { "Content-Type": "application/json", ...(role ? { "x-test-role": role } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal((await request("", "GET", undefined, "")).status, 401);
  for (const [path, method, body] of [["", "GET"], ["", "POST", input()], [`/${id}`, "PUT", input()], [`/${id}`, "DELETE"]]) {
    assert.equal((await request(path, method, body, "user")).status, 403);
  }
  assert.equal((await request("", "POST", input())).status, 201);
  assert.equal((await request("", "POST", { ...input(), name: " BRONZE " })).status, 409);
  const loaded = await (await request()).json();
  assert.equal(loaded.benefits.length, 2); assert.equal(loaded.memberships.length, 1);
  const update = { ...input(), price: 22, benefits: [{ benefitId: first, price: 0 }] };
  const saved = await (await request(`/${id}`, "PUT", update)).json();
  assert.equal(saved.membership.price, 22); assert.equal(saved.membership.benefits[0].price, 0);
  assert.equal(saved.membership.benefits.length, 1);
  const both = { ...input(), benefits: [{ benefitId: second, price: null }, { benefitId: first, price: 5 }] };
  const added = await (await request(`/${id}`, "PUT", both)).json();
  assert.deepEqual(added.membership.benefits.map((benefit) => benefit.benefitId), [second, first]);
  const removed = await (await request(`/${id}`, "PUT", { ...input(), benefits: [{ benefitId: second, price: null }] })).json();
  assert.deepEqual(removed.membership.benefits.map((benefit) => benefit.benefitId), [second]);
  assert.equal(removed.membership.benefits[0].price, 80);
  await request(`/${id}`, "PUT", { ...input(), benefits: [] });
  assert.deepEqual((await (await request()).json()).memberships[0].benefits, []);
  assert.equal((await request("", "POST", { ...input(), price: -1 })).status, 400);
  assert.equal((await request(`/${id}`, "PUT", { ...input(), benefits: [{ benefitId: id, price: 1 }] })).status, 409);
  assert.equal((await request("/bad", "DELETE")).status, 400);
  assert.equal((await request(`/${id}`, "DELETE")).status, 200);
  assert.equal((await request(`/${id}`, "PUT", input())).status, 404);
  assert.equal((await request(`/${id}`, "DELETE")).status, 404);
});
