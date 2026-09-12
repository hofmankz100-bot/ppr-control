"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRealtimeHistory } = require("../server/realtime-history");
const { sendServerEvent } = require("../server/realtime-clients");

test("reconnect history is bounded by UTF-8 bytes and count", () => {
  const history = createRealtimeHistory({ maxBytes: 20, maxEntries: 2 });
  for (let n = 1; n <= 1000; n++) {
    history.add(n, { n }, "я".repeat(5));
    assert.ok(history.bytes <= 20);
    assert.ok(history.entries.length <= 2);
  }
  assert.deepEqual(history.entries.map(entry => entry.counter), [999, 1000]);
  assert.equal(history.bytes, 20);
});

test("oversized snapshots release the prefix and force reset across the gap", () => {
  const history = createRealtimeHistory({ maxBytes: 20 });
  history.add(1, { partial: true }, "small");
  history.add(2, { state: "large" }, "x".repeat(21));
  assert.equal(history.entries.length, 0);
  assert.equal(history.bytes, 0);
  history.add(3, { partial: true }, "small");
  const oldest = history.entries[0].counter;
  assert.equal(1 >= oldest - 1, false, "client before omitted event must reset");
  assert.equal(2 >= oldest - 1, true, "client with omitted event can receive later patches");
});

test("SSE disconnects slow consumers without blocking other clients or one large snapshot", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const code = source.slice(source.indexOf("function sendSse("), source.indexOf("function broadcastState("));
  const clients = new Set();
  const context = { Buffer, sseClients: clients, sendServerEvent, realtimeAuth: { validator: () => () => true } };
  vm.createContext(context);
  vm.runInContext(code, context);
  let closed = 0, writes = 0;
  const slow = { writableLength: 8*1024*1024, write() { throw new Error("must not enqueue"); }, destroy() { closed++; } };
  const fast = { writableLength: 128, write() { writes++; } };
  clients.add(slow); clients.add(fast);
  context.sendSse(slow, "new event");
  context.sendSse(fast, "x".repeat(9*1024*1024));
  assert.equal(closed, 1);
  assert.equal(clients.has(slow), false);
  assert.equal(clients.has(fast), true);
  assert.equal(writes, 1);
});
