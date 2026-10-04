import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { feeCatalogs } from "../../shared/feeCatalog.js";
import { feeInput } from "../services/feeCatalog.js";
import { feeOptions, resolveBenefit } from "../services/benefits.js";
import Benefit from "../models/benefits.js";
import { createFeeRouter } from "../routes/feeRoutes.js";
import { requireRole } from "../middleware/auth.js";
import AuditLog from "../models/AuditLog.js";

const id = "111111111111111111111111";
function input(source) {
  const config = feeCatalogs[source];
  return { name: "Synthetic fee", [config.billcode]: "TEST-1", description: "Synthetic catalog entry", retailPrice: 50,
    [config.prices]: [{ [config.provider]: "Example A", amount: 10.1 }, { [config.provider]: "Example B", amount: 20.2 }] };
}

test("every catalog validates multiple provider rows and rejects invalid or duplicate prices", () => {
  for (const [source, config] of Object.entries(feeCatalogs)) {
    assert.equal(feeInput(source).parse(input(source))[config.prices].length, 2);
    for (const rows of [[], [{ [config.provider]: "", amount: 10 }], [{ [config.provider]: "Example", amount: -1 }],
      [{ [config.provider]: "Example", amount: 1.001 }], [{ [config.provider]: "Example", amount: "10" }],
      [{ [config.provider]: "Example", amount: 10 }, { [config.provider]: " example ", amount: 20 }]]) {
      assert.equal(feeInput(source).safeParse({ ...input(source), [config.prices]: rows }).success, false);
    }
    assert.equal(feeInput(source).safeParse({ ...input(source), retailPrice: -1 }).success, false);
    assert.equal(feeInput(source).safeParse({ ...input(source), unknown: true }).success, false);
  }
});

test("all service providers reach benefit options and the selected amount is persisted", async () => {
  const options = feeOptions([{ _id: id, ...input("serviceFees") }], "serviceFees");
  assert.equal(options.length, 2);
  assert.equal(options[0].billCode, "TEST-1");
  const { source, feeId, provider, amount } = options[1];
  const data = resolveBenefit({ name: "Example benefit", description: "Synthetic", price: 40,
    services: [{ source, feeId, provider, amount }] }, options);
  assert.equal(data.cost, 20.2);
  assert.equal(data.services[0].provider, "Example B");
  await new Benefit(data).validate();
});

test("admin API creates and edits arrays in all catalogs, preserves legacy fields, and restricts access", async (t) => {
  t.mock.method(AuditLog, "create", async () => ({}));
  const stores = new Map(Object.keys(feeCatalogs).map((source) => [source, new Map()]));
  const app = express(); app.use(express.json());
  app.use("/fees", createFeeRouter({
    collection: (source) => {
      const records = stores.get(source);
      return {
        find: () => ({ sort: () => ({ toArray: async () => [...records.values()] }) }),
        insertOne: async (data) => { records.set(id, { ...data, _id: id }); return { insertedId: id }; },
        findOneAndUpdate: async (filter, update) => {
          const key = String(filter._id); if (!records.has(key)) return null;
          const doc = { ...records.get(key), ...update.$set }; records.set(key, doc); return doc;
        },
      };
    },
    authenticate: (req, res, next) => {
      if (!req.headers["x-test-role"]) return res.sendStatus(401);
      req.user = { id: "synthetic", role: req.headers["x-test-role"] }; next();
    }, authorize: requireRole("admin"), audit: async () => {},
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (path, method = "GET", body, role = "admin") => fetch(`http://127.0.0.1:${server.address().port}/fees/${path}`, {
    method, headers: { "Content-Type": "application/json", ...(role ? { "x-test-role": role } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal((await request("serviceFees", "GET", undefined, "")).status, 401);
  assert.equal((await request("users")).status, 404);
  assert.equal((await request("constructor")).status, 404);
  for (const [source, config] of Object.entries(feeCatalogs)) {
    for (const [path, method, body] of [[source, "GET"], [source, "POST", input(source)], [`${source}/${id}`, "PUT", input(source)]]) {
      assert.equal((await request(path, method, body, "user")).status, 403);
    }
    assert.equal((await request(source, "POST", input(source))).status, 201);
    assert.equal((await (await request(source)).json()).fees[0][config.prices].length, 2);
    stores.get(source).get(id).order = "legacy-order";
    const updated = input(source);
    updated[config.prices].push({ [config.provider]: "Example C", amount: 0 });
    const result = await (await request(`${source}/${id}`, "PUT", updated)).json();
    assert.equal(result.fee[config.prices].length, 3);
    assert.equal(result.fee.order, "legacy-order");
    updated[config.prices].splice(1, 1);
    assert.equal((await (await request(`${source}/${id}`, "PUT", updated)).json()).fee[config.prices].length, 2);
    assert.equal((await request(source, "POST", { ...input(source), [config.prices]: [] })).status, 400);
    assert.equal((await request(`${source}/bad`, "PUT", input(source))).status, 400);
    assert.equal((await request(`${source}/222222222222222222222222`, "PUT", input(source))).status, 404);
  }
});
