import test from "node:test";
import assert from "node:assert/strict";
import { createDatabaseConnector } from "../config/database.js";
import { databaseFailureCategory, logDatabaseFailure } from "../utils/databaseDiagnostics.js";

test("diagnostics distinguish authentication, DNS, timeout and malformed URI errors including nested driver errors", () => {
  const wrap = (error) => ({ name: "MongooseServerSelectionError", reason: { servers: new Map([["private-host", { error }]]) } });
  for (const [error, expected] of [
    [{ code: 18 }, "AUTHENTICATION_FAILED"],
    [{ code: 8000, message: "bad auth : authentication failed" }, "AUTHENTICATION_FAILED"],
    [{ code: "ENOTFOUND" }, "DNS_FAILURE"],
    [{ name: "MongoParseError" }, "INVALID_CONFIGURATION"],
    [{ code: "ETIMEDOUT" }, "NETWORK_TIMEOUT"],
    [{ code: "ECONNREFUSED" }, "NETWORK_FAILURE"],
  ]) assert.equal(databaseFailureCategory(wrap(error)), expected);
  const cycle = { name: "MongooseServerSelectionError" }; cycle.cause = cycle;
  assert.equal(databaseFailureCategory(cycle), "SERVER_SELECTION_FAILED");
});

test("logs contain only safe classifications and presence flags, never driver or environment values", () => {
  const logs = [];
  logDatabaseFailure({ error: { code: 18, message: "synthetic-password synthetic-user", stack: "synthetic-stack", hostname: "synthetic-host" },
    env: { MONGO_URI: "mongodb://synthetic-user:synthetic-password@synthetic-host/private", MONGO_DB_NAME: "synthetic-private-db" },
    logger: (line) => logs.push(line) });
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /synthetic-|mongodb:\/\//);
  assert.equal(JSON.parse(logs[0]).category, "AUTHENTICATION_FAILED");
  assert.equal(JSON.parse(logs[0]).uriVariable, "MONGO_URI");
});

test("missing configuration logs without attempting a connection", async () => {
  const logs = [];
  const client = { connection: { readyState: 0 }, connect: () => assert.fail("Must not connect") };
  await assert.rejects(createDatabaseConnector(client, {}, (line) => logs.push(JSON.parse(line)))());
  assert.equal(logs[0].category, "MISSING_CONFIGURATION");
  assert.equal(logs[0].uriVariable, "missing");
});

test("one diagnostic is logged per shared connection attempt and failed attempts can retry", async () => {
  const logs = [];
  let reject;
  let calls = 0;
  const client = { connection: { readyState: 0 }, connect: () => {
    calls++;
    return new Promise((resolve, fail) => { reject = fail; });
  } };
  const connect = createDatabaseConnector(client, { MONGODB_URI: "mongodb://synthetic" }, (line) => logs.push(JSON.parse(line)));
  const first = connect(); const second = connect();
  reject(Object.assign(new Error("synthetic-sensitive"), { code: "ETIMEDOUT" }));
  await Promise.all([assert.rejects(first), assert.rejects(second)]);
  assert.equal(calls, 1); assert.equal(logs.length, 1);
  assert.equal(logs[0].category, "NETWORK_TIMEOUT");
  const retry = connect(); reject({ code: 18 }); await assert.rejects(retry);
  assert.equal(calls, 2); assert.equal(logs.length, 2);
});
