"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildHealthPayload } = require("../server/health");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("health reads committed counters without cloning a working snapshot", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const route = source.slice(source.indexOf('  if (pathname === "/api/health" && req.method === "GET") {'), source.indexOf('  if (pathname === "/api/client-error" && req.method === "POST") {'));
  const state = {
    targetedCleanupVersions: { productionRequestDedup20260820: { removed: 4 }, removeTestInstalledParts20260819v3: { removed: 2 } },
    catalog: { equipment: { gas: { nodes: ["one", "two"] } } }
  };
  for (const postgres of [true, false]) {
    let fileReads = 0;
    let response;
    const context = {
      pathname: "/api/health", req: { method: "GET" }, res: {},
      postgresState: postgres ? state : null,
      readDbFile() { fileReads += 1; return state; },
      readDb() { throw new Error("Health must not clone the full working state"); },
      storageStatus: { mode: "postgres-degraded" },
      compatibleClient: false, clientVersion: "", SERVER_VERSION: "test", CLIENT_PROTOCOL_VERSION: "1",
      wss: null, wsServers: [], sseClients: new Set(), realtimeStateVersion: () => "state:1", GAS_QR_EQUIPMENT_ID: "gas",
      buildHealthPayload,
      sendJson(_res, status, payload) { response = { status, payload }; }
    };
    vm.runInNewContext(`(function () { ${route} })()`, context);
    assert.equal(fileReads, postgres ? 0 : 1);
    assert.equal(response.status, 503);
    assert.equal(response.payload.ok, false);
    assert.equal(response.payload.productionRequestDuplicatesRemoved, 4);
    assert.equal(response.payload.testInstalledPartRecordsRemoved, 2);
    assert.equal(response.payload.gasQrNodeCount, 2);
  }
});

test("health cannot report success when authoritative writes are not confirmed", () => {
  assert.equal(buildHealthPayload({ storage: { mode: "postgres-degraded" } }).ok, false);
  assert.equal(buildHealthPayload({ storage: { mode: "json-fallback" } }).ok, false);
});

test("health payload preserves the public API contract", () => {
  const payload = buildHealthPayload({
    compatibleClient: true,
    clientVersion: "v-compatible",
    serverVersion: "v-current",
    clientProtocol: "1",
    time: "2026-08-23T00:00:00.000Z",
    uptimeSeconds: 12.4,
    memoryMb: 100.6,
    storage: { mode: "postgres-cluster" },
    websocket: true,
    websocketClients: 2,
    eventClients: 1,
    stateVersion: "state:1",
    productionRequestDuplicatesRemoved: 30,
    testInstalledPartRecordsRemoved: 2,
    gasQrNodeCount: 19
  });

  assert.deepEqual(payload, {
    ok: true,
    version: "v-compatible",
    latestVersion: "v-current",
    clientProtocol: "1",
    time: "2026-08-23T00:00:00.000Z",
    uptimeSeconds: 12,
    memoryMb: 101,
    storage: { mode: "postgres-cluster" },
    realtime: true,
    stateVersion: "state:1",
    websocket: true,
    websocketClients: 2,
    eventClients: 1,
    productionRequestDuplicatesRemoved: 30,
    testInstalledPartRecordsRemoved: 2,
    gasQrNodeCount: 19
  });
});

test("health payload reports the server version to unknown clients", () => {
  const payload = buildHealthPayload({
    compatibleClient: false,
    clientVersion: "v-old",
    serverVersion: "v-current",
    time: "2026-08-23T00:00:00.000Z",
    uptimeSeconds: 1,
    memoryMb: 1
  });

  assert.equal(payload.version, "v-current");
  assert.equal(payload.realtime, false);
  assert.equal(payload.websocketClients, 0);
  assert.equal(payload.eventClients, 0);
});
