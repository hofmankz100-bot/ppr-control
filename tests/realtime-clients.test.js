"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { broadcastWebSockets, attachWebSocketServer, MAX_BUFFERED_BYTES } = require("../server/realtime-clients");
const { EventEmitter } = require("node:events");

test("committed state reaches HTTP, QR and HTTPS websocket servers despite a disconnected client", () => {
  const received = [];
  const errors = [];
  const client = name => ({ readyState: 1, pprAuthenticated: true, send: message => received.push([name, message]) });
  const servers = [
    { clients: new Set([client("http"), { readyState: 3, send: () => { throw new Error("Closed sockets must be skipped"); } }]) },
    { clients: new Set([{ readyState: 1, pprAuthenticated: true, send: () => { throw new Error("disconnected during send"); } }, client("qr")]) },
    { clients: new Set([client("https")]) }
  ];
  broadcastWebSockets(servers, "committed-state", error => errors.push(error.message));
  assert.deepEqual(received, [["http", "committed-state"], ["qr", "committed-state"], ["https", "committed-state"]]);
  assert.deepEqual(errors, ["disconnected during send"]);
});

test("pending or denied websocket authentication never receives state broadcasts", async () => {
  let authenticate;
  const pending = new Promise(resolve => { authenticate = resolve; });
  class FakeServer extends EventEmitter { clients = new Set(); }
  const server = attachWebSocketServer(FakeServer, {}, { authenticate: () => pending, stateVersion: () => "instance:1" });
  const socket = new EventEmitter();
  const received = [];
  let closeCode;
  Object.assign(socket, { readyState: 1, send: message => received.push(message), close: code => { closeCode = code; } });
  server.clients.add(socket);
  server.emit("connection", socket, {});
  broadcastWebSockets([server], "sensitive pending state");
  assert.deepEqual(received, []);
  authenticate(false);
  await pending;
  await Promise.resolve();
  broadcastWebSockets([server], "sensitive denied state");
  assert.equal(closeCode, 1008);
  assert.deepEqual(received, []);
});

test("authenticated websocket receives ready, heartbeat replies and committed broadcasts", async () => {
  class FakeServer extends EventEmitter { clients = new Set(); }
  const errors = [];
  const server = attachWebSocketServer(FakeServer, {}, { authenticate: async () => true, stateVersion: () => "instance:2", onError: error => errors.push(error) });
  const socket = new EventEmitter();
  const received = [];
  Object.assign(socket, { readyState: 1, send: message => received.push(JSON.parse(message)) });
  server.clients.add(socket);
  server.emit("connection", socket, {});
  await Promise.resolve();
  socket.emit("message", 'invalid JSON');
  assert.equal(errors.length, 1);
  assert.ok(errors[0] instanceof SyntaxError);
  socket.emit("message", '{"type":"ping"}');
  broadcastWebSockets([server], '{"type":"state","committed":true}');
  assert.deepEqual(received, [
    { type: "ready", origin: "server", stateVersion: "instance:2" },
    { type: "pong" }, { type: "state", committed: true }
  ]);
});

test("websocket transport disables per-message zlib contexts", () => {
  let options;
  class FakeServer extends EventEmitter { constructor(value) { super(); options = value; } }
  attachWebSocketServer(FakeServer, {}, { authenticate: async () => true, stateVersion: () => "instance:1" });
  assert.equal(options.perMessageDeflate, false);
  assert.equal(options.path, "/ws");
});

test("slow sockets are terminated without blocking other committed broadcasts", () => {
  const sent = [];
  let terminated = 0;
  const slow = { readyState: 1, pprAuthenticated: true, bufferedAmount: MAX_BUFFERED_BYTES + 1,
    send: () => { throw new Error("Over-budget socket must not receive another frame"); },
    terminate: () => { terminated++; } };
  const healthy = { readyState: 1, pprAuthenticated: true, bufferedAmount: 0, send: message => sent.push(message) };
  const servers = [{ clients: new Set([slow, healthy]) }];
  broadcastWebSockets(servers, "committed-1");
  broadcastWebSockets(servers, "committed-2");
  assert.equal(terminated, 1);
  assert.equal(slow.pprAuthenticated, false);
  assert.deepEqual(sent, ["committed-1", "committed-2"]);
});

test("backpressure accounts for UTF-8 bytes of the next message", () => {
  const closed = [];
  const socket = { readyState: 1, pprAuthenticated: true, bufferedAmount: MAX_BUFFERED_BYTES - 3,
    send: () => { throw new Error("Unicode frame exceeds byte budget"); },
    close: (...args) => closed.push(args) };
  broadcastWebSockets([{ clients: new Set([socket]) }], "яя");
  assert.deepEqual(closed, [[1013, "slow_consumer_reconnect"]]);
});

test("one large full-state snapshot is allowed and does not cause a reconnect loop", () => {
  const message = "x".repeat(MAX_BUFFERED_BYTES + 1);
  const sent = [];
  let terminated = 0;
  const socket = { readyState: 1, pprAuthenticated: true, bufferedAmount: 128,
    send: value => { sent.push(value); socket.bufferedAmount += Buffer.byteLength(value); },
    terminate: () => { terminated++; } };
  const servers = [{ clients: new Set([socket]) }];
  broadcastWebSockets(servers, message);
  assert.equal(sent.length, 1);
  assert.equal(terminated, 0);
  // Once drained, even the next large snapshot is accepted normally.
  socket.bufferedAmount = 0;
  broadcastWebSockets(servers, message);
  assert.equal(sent.length, 2);
  assert.equal(terminated, 0);
  // Without draining, do not add a third snapshot to the already-large queue.
  broadcastWebSockets(servers, message);
  assert.equal(sent.length, 2);
  assert.equal(terminated, 1);
});

test("a slow authenticated socket cannot keep queuing pong responses", async () => {
  class FakeServer extends EventEmitter { clients = new Set(); }
  const errors = [];
  const server = attachWebSocketServer(FakeServer, {}, {
    authenticate: async () => true, stateVersion: () => "instance:3", onError: error => errors.push(error.message)
  });
  const socket = new EventEmitter();
  const received = [];
  let terminated = 0;
  Object.assign(socket, { readyState: 1, bufferedAmount: 0,
    send: message => received.push(JSON.parse(message)), terminate: () => { terminated++; } });
  server.clients.add(socket);
  server.emit("connection", socket, {});
  await Promise.resolve();
  socket.emit("error", new Error("socket diagnostic"));
  socket.bufferedAmount = MAX_BUFFERED_BYTES;
  socket.emit("message", '{"type":"ping"}');
  socket.emit("message", '{"type":"ping"}');
  assert.equal(terminated, 1);
  assert.deepEqual(received, [{ type: "ready", origin: "server", stateVersion: "instance:3" }]);
  assert.deepEqual(errors, ["socket diagnostic"]);
});

test("asynchronous websocket send failure is reported while remaining clients receive state", () => {
  const errors = [], received = [];
  const failed = { readyState: 1, pprAuthenticated: true,
    send: (_, callback) => callback(new Error("asynchronous send failure")) };
  const healthy = { readyState: 1, pprAuthenticated: true, send: message => received.push(message) };
  broadcastWebSockets([{ clients: new Set([failed, healthy]) }], "committed", error => errors.push(error.message));
  assert.deepEqual(errors, ["asynchronous send failure"]);
  assert.deepEqual(received, ["committed"]);
});
