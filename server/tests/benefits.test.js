import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import Benefit from "../models/benefits.js";
import { benefitInput, feeOptions, resolveBenefit } from "../services/benefits.js";
import { createBenefitRouter } from "../routes/benefitRoutes.js";
import { requireRole } from "../middleware/auth.js";
import AuditLog from "../models/AuditLog.js";

const labId = "111111111111111111111111";
const diagnosticId = "222222222222222222222222";
const options = [
  ...feeOptions([{ _id: labId, description: "Synthetic blood panel", labPrices: [{ lab: "Example lab", amount: 10.1 }] }], "laboratoryFees"),
  ...feeOptions([{ _id: diagnosticId, description: "Synthetic imaging", diagnosticPrices: [{ diagnostic_center: "Example center", amount: 20.2 }] }], "diagnosticFees"),
];
const input = () => ({ name: "Example benefit", description: "Synthetic benefit for testing", price: 50,
  services: options.map(({ source, feeId, provider, amount }) => ({ source, feeId, provider, amount })) });

test("benefits calculate exact cents and retain each catalog name and provider", async () => {
  const data = resolveBenefit(input(), options);
  assert.equal(data.cost, 30.3);
  assert.equal(data.services[0].lab, "Example lab");
  assert.equal(data.services[1].diagnostic_center, "Example center");
  assert.equal(data.services[1].name, "Synthetic imaging");
  assert.equal(data.services[1].cost, data.services[1].amount);
  await new Benefit(data).validate();
});

test("invalid amounts, empty services and client-assigned costs are rejected", () => {
  for (const patch of [{ cost: 0 }, { services: [] }, { price: -1 }, { price: 1.001 }, { name: " " }, { price: "50" }]) {
    assert.equal(benefitInput.safeParse({ ...input(), ...patch }).success, false);
  }
  const data = input();
  data.services[0].amount = -1;
  assert.equal(benefitInput.safeParse(data).success, false);
});

test("stale prices, missing fees and forged providers cannot be saved", () => {
  for (const patch of [{ amount: 0 }, { provider: "Another lab" }, { feeId: diagnosticId }]) {
    const data = input();
    Object.assign(data.services[0], patch);
    assert.throws(() => resolveBenefit(data, options), { status: 409 });
  }
  assert.throws(() => resolveBenefit(input(), []), { status: 409 });
});

test("fee options exclude missing providers and invalid costs, including null and negative values", () => {
  const result = feeOptions([{ _id: labId, description: "Panel", labPrices: [
    { lab: "Example", amount: 0 }, { lab: "", amount: 1 }, { lab: "Example", amount: -1 },
    { lab: "Example", amount: null }, { lab: "Example", amount: "10" }, null,
  ] }], "laboratoryFees");
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 0);
});

test("admin API supports create, list, append services, delete and access restrictions", async (t) => {
  t.mock.method(AuditLog, "create", async () => ({}));
  const records = new Map();
  const id = "333333333333333333333333";
  const benefits = {
    find: () => ({ sort: async () => [...records.values()] }),
    create: async (data) => { const record = { ...data, _id: id }; records.set(id, record); return record; },
    findByIdAndUpdate: async (key, update) => {
      if (!records.has(key)) return null;
      const record = { ...records.get(key), ...update.$set }; records.set(key, record); return record;
    },
    findByIdAndDelete: async (key) => { const record = records.get(key); records.delete(key); return record; },
  };
  const app = express();
  app.use(express.json());
  app.use("/api/admin/benefits", createBenefitRouter({ benefits, catalog: async () => options, audit: async () => {},
    authenticate: (req, res, next) => {
      if (!req.headers["x-test-role"]) return res.sendStatus(401);
      req.user = { id: "synthetic-user", role: req.headers["x-test-role"] }; next();
    }, authorize: requireRole("admin"),
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/admin/benefits`;
  const request = (path = "", method = "GET", body, role = "admin") => fetch(base + path, {
    method, headers: { "Content-Type": "application/json", ...(role ? { "x-test-role": role } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal((await request("", "GET", undefined, "")).status, 401);
  for (const [path, method, body] of [["", "GET"], ["/fee-options", "GET"], ["", "POST", input()], [`/${id}`, "PUT", input()], [`/${id}`, "DELETE"]]) {
    assert.equal((await request(path, method, body, "user")).status, 403);
  }
  assert.equal((await (await request("/fee-options")).json()).options.length, 2);
  const initial = input(); initial.services = initial.services.slice(0, 1);
  const created = await request("", "POST", initial);
  assert.equal(created.status, 201);
  assert.equal((await created.json()).benefit.cost, 10.1);
  assert.equal((await (await request()).json()).benefits.length, 1);
  const updated = await request(`/${id}`, "PUT", input());
  assert.equal((await updated.json()).benefit.cost, 30.3);
  assert.equal((await request("", "POST", { ...input(), cost: 0 })).status, 400);
  const stale = input(); stale.services[0].amount = 1;
  assert.equal((await request(`/${id}`, "PUT", stale)).status, 409);
  assert.equal(records.get(id).cost, 30.3);
  assert.equal((await request("/invalid", "DELETE")).status, 400);
  assert.equal((await request(`/${id}`, "DELETE")).status, 200);
  assert.equal((await request(`/${id}`, "PUT", input())).status, 404);
  assert.equal((await request(`/${id}`, "DELETE")).status, 404);
});
