"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");
const { createRealtimeAuth } = require("../server/realtime-auth");
const { attachWebSocketServer, broadcastWebSockets, authorizeWebSocket, sendServerEvent, MAX_BUFFERED_BYTES } = require("../server/realtime-clients");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8").replace(/\r\n/g, "\n");
const authCode = source.slice(source.indexOf("function parseCookies("), source.indexOf("function attendanceUserKey("));
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const flush = () => new Promise(resolve => setImmediate(resolve));
const tokenHash = token => crypto.createHash("sha256").update(token).digest("hex");

function fixture({ readAuthSnapshot } = {}) {
  let state = {
    users: ["a", "b"].map(id => ({ id, role: "engineer", approved: true, pendingApproval: false })),
    authSessions: ["a", "b"].map(id => ({ userId: id, tokenHash: tokenHash(`token-${id}`), expiresAt: "2099-01-01T00:00:00Z" }))
  };
  Object.defineProperty(state, "checks", { get() { throw new Error("Realtime authorization must not read/clone working history"); } });
  const errors = [], observed = { stateReads: 0, authReads: 0, jsonReads: 0, intervalCalls: 0 };
  const context = vm.createContext({ crypto, process: { env: { NODE_ENV: "production" } }, Buffer, JSON,
    createRealtimeAuth, storageStatus: { mode: "postgres-cluster" },
    postgresStateStore: { async authSnapshot() { observed.authReads++; return readAuthSnapshot ? readAuthSnapshot(state) : { users: state.users, authSessions: state.authSessions }; } },
    readDbFile() { observed.jsonReads++; return state; },
    readDb() { throw new Error("Full-state read/clone is forbidden during realtime auth"); },
    sseClients: new Set(), wsServers: [], broadcastWebSockets, authorizeWebSocket, sendServerEvent,
    warnServerDiagnostic: (_, error) => errors.push(error),
    stateTransactions: { current: () => null, defer: () => false },
    realtimeInstanceId: "test", realtimeStateCounter: 0,
    realtimeHistory: { add() {} }, structuredClone,
    realtimeStateVersion: () => "test:1",
    setInterval(callback, delay) {
      observed.intervalCalls++;
      assert.equal(delay, 15000);
      context.heartbeat = callback;
      return 1;
    }
  });
  Object.defineProperty(context, "postgresState", { get() { observed.stateReads++; return context.postgresStateStore ? state : null; } });
  vm.runInContext(authCode, context);
  // Run the actual server configuration as well as its auth and transport paths.
  // In particular, do not reproduce the storage-mode condition in this fixture.
  vm.runInContext(extract("const realtimeAuth = createRealtimeAuth(", "const realtimeInstanceId ="), context);
  const realtimeAuth = vm.runInContext("realtimeAuth", context);
  vm.runInContext(extract("function sendSse(", "function broadcastState("), context);
  vm.runInContext(extract("function broadcastState(", "function changedRecordPatch("), context);
  vm.runInContext(`function openEvents(req, res, pathname = "/api/events") {\n${extract('  if (pathname === "/api/events"', '  if (pathname === "/api/health"')}\n}`, context);
  vm.runInContext(extract("const heartbeatTimer =", "const systemMonitorTimer ="), context);
  class FakeServer extends EventEmitter { clients = new Set(); }
  const server = attachWebSocketServer(FakeServer, {}, { authenticate: realtimeAuth.authenticate,
    validator: realtimeAuth.validator, stateVersion: () => "test:1", onError: error => errors.push(error) });
  context.wsServers.push(server);
  function request(id) {
    return Object.assign(new EventEmitter(), { method: "GET", headers: { cookie: `ppr_session=token-${id}` }, authUser: state.users.find(user => user.id === id) });
  }
  return {
    context, realtimeAuth, errors, observed, get state() { return state; }, set state(value) { state = value; },
    async ws(id = "a") {
      const socket = Object.assign(new EventEmitter(), { readyState: 1, bufferedAmount: 0, sent: [], closed: [], pings: 0,
        send(message) { this.sent.push(JSON.parse(message)); },
        close(...args) { this.closed.push(args); this.readyState = 3; },
        ping() { this.pings++; }, terminate() { this.readyState = 3; this.terminated = true; } });
      server.clients.add(socket);
      server.emit("connection", socket, request(id));
      await flush();
      return socket;
    },
    sse(id = "a") {
      const res = { writableLength: 0, sent: [], ended: false, writeHead() {},
        write(message) { this.sent.push(message); }, end() { this.ended = true; }, destroy() { this.destroyed = true; } };
      context.openEvents(request(id), res);
      return res;
    },
    broadcast() { context.broadcastState("test", "action", { checks: { business: "protected" } }, true); }
  };
}

test("real committed broadcast revalidates WS and SSE after revoke, expiry, token rotation, user deletion or approval/role change", async () => {
  const changes = {
    revoke: state => { state.authSessions = state.authSessions.filter(session => session.userId !== "a"); },
    expiry: state => { state.authSessions[0].expiresAt = "2000-01-01T00:00:00Z"; },
    malformedExpiry: state => { state.authSessions[0].expiresAt = "not-a-date"; },
    rotation: state => { state.authSessions[0].tokenHash = tokenHash("replacement-token"); },
    actorSwitch: state => { state.authSessions[0].userId = "b"; },
    delete: state => { state.users = state.users.filter(user => user.id !== "a"); },
    unapproved: state => { state.users[0].approved = false; },
    pending: state => { state.users[0].pendingApproval = true; },
    noRole: state => { state.users[0].role = ""; },
    roleChange: state => { state.users[0].role = "mechanic"; },
    roleRevision: state => { state.users[0].roleUpdatedAt = "2026-09-08T16:00:00Z"; }
  };
  for (const [name, change] of Object.entries(changes)) {
    const h = fixture(), deniedWs = await h.ws(), healthyWs = await h.ws("b"), deniedSse = h.sse(), healthySse = h.sse("b");
    change(h.state);
    const beforeReads = h.observed.stateReads;
    h.broadcast();
    assert.equal(h.observed.stateReads - beforeReads, 1, `${name}: one auth projection for both transports`);
    assert.deepEqual(deniedWs.sent.map(message => message.type), ["ready"], name);
    assert.deepEqual(deniedWs.closed, [[1008, "authentication_required"]], name);
    assert.equal(deniedSse.sent.length, 2, `${name}: only connected comment and ready`);
    assert.equal(deniedSse.ended, true, name);
    assert.equal(h.context.sseClients.has(deniedSse), false, name);
    assert.equal(healthyWs.sent.at(-1).type, "state", name);
    assert.match(healthySse.sent.at(-1), /protected/, name);
    h.broadcast();
    assert.equal(deniedWs.closed.length, 1, "denied socket is not repeatedly closed");
    assert.equal(h.errors.length, 0);
  }
});

test("revocation during an in-flight handshake prevents even the ready frame", async () => {
  let resolveSnapshot;
  const pendingSnapshot = new Promise(resolve => { resolveSnapshot = resolve; });
  const h = fixture({ readAuthSnapshot: () => pendingSnapshot });
  const before = { users: structuredClone(h.state.users), authSessions: structuredClone(h.state.authSessions) };
  const connection = h.ws();
  await flush();
  h.state.authSessions = [];
  resolveSnapshot(before);
  const ws = await connection;
  await flush();
  assert.deepEqual(ws.sent, []);
  assert.deepEqual(ws.closed, [[1008, "authentication_required"]]);
  h.broadcast();
  assert.deepEqual(ws.sent, []);
});

test("a handshake newer than the committed cache fails closed until the existing cache refresh", async () => {
  const freshAuth = { users: [{ id: "a", role: "mechanic", approved: true }],
    authSessions: [{ userId: "a", tokenHash: tokenHash("token-a"), expiresAt: "2099-01-01T00:00:00Z" }] };
  const h = fixture({ readAuthSnapshot: async () => freshAuth });
  const early = await h.ws();
  assert.deepEqual(early.sent, []);
  assert.equal(early.closed[0][0], 1008);
  h.state = freshAuth;
  const retry = await h.ws();
  assert.equal(retry.sent[0].type, "ready");
  h.broadcast();
  assert.equal(retry.sent.at(-1).type, "state");
});

test("the existing 15-second heartbeat closes idle revoked streams without new intervals", async () => {
  const h = fixture(), ws = await h.ws(), sse = h.sse(), healthy = await h.ws("b");
  h.state.authSessions.shift();
  const beforeReads = h.observed.stateReads;
  h.context.heartbeat();
  assert.equal(h.observed.stateReads - beforeReads, 1);
  assert.equal(h.observed.intervalCalls, 1);
  assert.equal(ws.pings, 0);
  assert.deepEqual(ws.closed, [[1008, "authentication_required"]]);
  assert.equal(sse.ended, true);
  assert.equal(healthy.pings, 1);
});

test("application ping cannot retain a revoked socket or enqueue another response", async () => {
  const h = fixture(), ws = await h.ws();
  ws.emit("message", '{"type":"ping"}');
  assert.equal(ws.sent.at(-1).type, "pong");
  h.state.authSessions.shift();
  ws.emit("message", '{"type":"ping"}');
  ws.emit("message", '{"type":"ping"}');
  assert.deepEqual(ws.sent.map(message => message.type), ["ready", "pong"]);
  assert.equal(ws.closed[0][0], 1008);
});

test("expiration is checked at each delivery even when the committed object has not changed", async () => {
  const h = fixture(), ws = await h.ws(), sse = h.sse();
  // Exercise wall-clock expiry without mutating the snapshot or sleeping.
  const realDate = Date;
  h.context.Date = class extends realDate { static now() { return realDate.parse("2100-01-01T00:00:00Z"); } };
  h.broadcast();
  assert.equal(ws.closed[0][0], 1008);
  assert.equal(sse.ended, true);
});

test("reauthorization follows new committed objects and retains no full snapshot/request on a connection", async () => {
  const h = fixture(), ws = await h.ws();
  assert.deepEqual(Object.keys(ws.pprAuth).sort(), ["identity", "request"]);
  assert.deepEqual(Object.keys(ws.pprAuth.request), ["headers"]);
  assert.deepEqual(Object.keys(ws.pprAuth.request.headers).sort(), ["cookie", "x-test-user-id"]);
  h.state = { users: h.state.users, authSessions: [] };
  h.broadcast();
  assert.equal(ws.closed[0][0], 1008);
  assert.equal(h.observed.authReads, 1, "no database query per delivered client");
});

test("freshly reconnected valid clients still work, with the existing slow-consumer budget", async () => {
  const h = fixture(), old = await h.ws();
  h.state.authSessions.shift();
  h.broadcast();
  h.state.authSessions.push({ userId: "a", tokenHash: tokenHash("token-a"), expiresAt: "2099-01-01T00:00:00Z" });
  const fresh = await h.ws(), sse = h.sse();
  fresh.bufferedAmount = MAX_BUFFERED_BYTES + 1;
  sse.writableLength = MAX_BUFFERED_BYTES + 1;
  h.broadcast();
  assert.equal(old.sent.length, 1);
  assert.equal(fresh.sent[0].type, "ready");
  assert.equal(fresh.terminated, true);
  assert.equal(sse.destroyed, true);
  assert.equal(h.context.sseClients.has(sse), false);
});

test("authorization read errors fail closed without sending business data", async () => {
  const errors = [];
  const auth = createRealtimeAuth({ readState() { throw new Error("unavailable"); }, readAuthSnapshot: async () => { throw new Error("unavailable"); }, authenticatedUser() { throw new Error("must not run"); }, onError: error => errors.push(error.message) });
  assert.equal(await auth.authenticate({ headers: {} }), null);
  assert.equal(auth.validator()({ pprAuth: {} }), false);
  assert.deepEqual(errors, ["unavailable", "unavailable"]);
});

test("idle heartbeat and broadcasts with no clients do not load even an auth snapshot", () => {
  const h = fixture();
  h.context.heartbeat();
  h.broadcast();
  assert.equal(h.observed.stateReads, 0);
  assert.equal(h.observed.authReads, 0);
});

test("actual degraded-mode wiring closes WS/SSE on broadcast or heartbeat, denies new streams and restores only new connections", async () => {
  for (const delivery of [h => h.broadcast(), h => h.context.heartbeat()]) {
    const h = fixture(), ws = await h.ws(), sse = h.sse();
    const sessionsBefore = structuredClone(h.state.authSessions);
    const readsBefore = h.observed.stateReads;
    h.context.storageStatus.mode = "postgres-degraded";
    delivery(h);
    assert.deepEqual(ws.sent.map(message => message.type), ["ready"]);
    assert.deepEqual(ws.closed, [[1008, "authentication_required"]]);
    assert.equal(ws.pings, 0);
    assert.equal(sse.ended, true);
    assert.equal(sse.sent.length, 2, "only the pre-outage connected comment and ready frame");
    assert.equal(h.context.sseClients.has(sse), false);
    assert.equal(h.observed.stateReads, readsBefore, "degraded mode cannot consult stale committed credentials");
    assert.equal(h.observed.jsonReads, 0, "degraded PostgreSQL cannot fall back to JSON credentials");
    const deniedWs = await h.ws(), deniedSse = h.sse();
    assert.deepEqual(deniedWs.sent, []);
    assert.deepEqual(deniedWs.closed, [[1008, "authentication_required"]]);
    assert.equal(deniedSse.ended, true);
    assert.deepEqual(deniedSse.sent, [": connected\n\n"], "even an already-authorized SSE handler cannot send ready while degraded");
    h.context.storageStatus.mode = "postgres-cluster";
    const recoveredWs = await h.ws(), recoveredSse = h.sse();
    h.broadcast();
    assert.equal(recoveredWs.sent.at(-1).type, "state");
    assert.match(recoveredSse.sent.at(-1), /protected/);
    assert.equal(recoveredWs.closed.length, 0);
    assert.equal(recoveredSse.ended, false);
    assert.equal(ws.sent.length, 1, "the old connection is not silently reactivated");
    assert.equal(sse.sent.length, 2);
    assert.deepEqual(h.state.authSessions, sessionsBefore, "connectivity never changes saved sessions");
    assert.equal(h.observed.intervalCalls, 1);
    assert.equal(h.errors.length, 0);
  }
});

test("actual JSON-mode wiring still authenticates and delivers WS/SSE using the local-file state", async () => {
  const h = fixture();
  h.context.postgresStateStore = null;
  h.context.storageStatus.mode = "json";
  const ws = await h.ws(), sse = h.sse();
  const beforeReads = h.observed.jsonReads;
  h.broadcast();
  assert.equal(h.observed.jsonReads - beforeReads, 1, "one file snapshot for both transports");
  assert.equal(ws.sent.at(-1).type, "state");
  assert.match(sse.sent.at(-1), /protected/);
  h.context.heartbeat();
  assert.equal(ws.pings, 1);
  assert.match(sse.sent.at(-1), /"type":"ping"/);
  assert.equal(ws.closed.length, 0);
  assert.equal(sse.ended, false);
  assert.equal(h.observed.authReads, 0, "JSON mode never requires a PostgreSQL auth snapshot");
  assert.equal(h.errors.length, 0);
});

test("server wiring uses auth projections and guards every real transport path", () => {
  assert.match(source, /readAuthSnapshot: \(\) => postgresStateStore \? postgresStateStore\.authSnapshot\(\)/);
  assert.doesNotMatch(source, /async function websocketAuthenticated\(/);
  assert.match(source, /authenticate: realtimeAuth\.authenticate, validator: realtimeAuth\.validator/);
  assert.match(source, /res\.pprAuth = realtimeAuth\.capture\(req, req\.authUser\)/);
  assert.equal((source.match(/const heartbeatTimer = setInterval/g) || []).length, 1);
});
