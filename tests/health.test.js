"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildHealthPayload } = require("../server/health");

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
    productionRequestDuplicatesRemoved: 30
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
    productionRequestDuplicatesRemoved: 30
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
