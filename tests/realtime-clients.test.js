"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { broadcastWebSockets, attachWebSocketServer } = require("../server/realtime-clients");
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
