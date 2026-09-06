"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createStateTransactions } = require("../server/state-transactions");
const { createPostgresStateStore } = require("../server/postgres-state-store");
const { createApiDispatcher } = require("../server/api-dispatcher");

const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const authCode = source.slice(source.indexOf("function parseCookies("), source.indexOf("function requireAuthenticated("));
const routeCode = source.slice(source.indexOf("async function handleApiTransaction("), source.indexOf("const serveStatic ="));
const token = "photo-test-session";
const photoPath = `/api/photos/${"a".repeat(40)}.jpg`;

function authState() {
  return {
    users: [{ id: "photo-worker", role: "welder", approved: true, pendingApproval: false }],
    authSessions: [{ userId: "photo-worker", tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: "2099-01-01T00:00:00.000Z" }],
    checks: { retainedWork: true }
  };
}

// Exercise the actual API dispatcher, authorization and photo handler without
// starting a production server. Only unrelated routes and external I/O are fakes.
function fixture({ postgres = true } = {}) {
  let durable = authState();
  let unavailable = false;
  let missing = false;
  const observed = { authReads: 0, fullReads: 0, fileReads: 0, mirrorReads: 0, jsonReads: 0, heldViews: [] };
  const primary = { async query(sql) {
    observed.authReads += 1;
    assert.match(sql, /^SELECT payload->'users' AS users,payload->'authSessions' AS auth_sessions FROM ppr_settings/);
    if (unavailable) throw new Error("primary unavailable");
    return { rows: missing ? [] : [{ users: structuredClone(durable.users), auth_sessions: structuredClone(durable.authSessions) }] };
  } };
  const store = createPostgresStateStore({ nodes: [
    { pool: primary },
    { pool: { async query() { observed.mirrorReads += 1; throw new Error("stale mirror must not authorize photos"); } } }
  ] }, {
    normalize() { throw new Error("Photo authorization must not normalize full working state"); },
    onExternalState() { throw new Error("An auth projection must not replace full-state cache"); }
  });
  const transactions = createStateTransactions({
    begin() { throw new Error("Read-only photo requests must not start a write"); },
    committed() { throw new Error("Photo authorization must not use a cached session"); },
    snapshot() { observed.fullReads += 1; return structuredClone(durable); },
    publish() { throw new Error("Photo requests must not publish state"); }
  });
  const context = {
    Buffer, URL, crypto, path,
    process: { env: { NODE_ENV: "production" } },
    CLIENT_PROTOCOL_VERSION: "1", SUPPORTED_CLIENT_VERSIONS: new Set(),
    stateTransactions: transactions, postgresStateStore: postgres ? store : null,
    postgresPool: null, photosDir: "/isolated-photo-cache", contentTypes: { ".jpg": "image/jpeg" },
    readDb: () => transactions.read(),
    readDbFile() { observed.jsonReads += 1; return structuredClone(durable); },
    rejectRepeatedAdminMutation: () => false,
    attendanceRoleAllowed: () => false,
    sendJson(res, status, body) { res.status = status; res.body = body; },
    sendPublicState(res, state) { assert.equal(state.checks.retainedWork, true); res.status = 200; },
    fs: { promises: { async readFile() {
      observed.fileReads += 1;
      observed.heldViews.push(transactions.read());
      // Parallel disk reads retain their individual read context until I/O ends.
      await new Promise(resolve => setTimeout(resolve, 5));
      return Buffer.from("cached-photo");
    } } }
  };
  for (const match of routeCode.matchAll(/if \(await (handleAdmin\w+Route)\(/g)) context[match[1]] = async () => false;
  vm.createContext(context);
  vm.runInContext(`${authCode}\n${routeCode}`, context);
  const handleApi = createApiDispatcher({
    stateTransactions: transactions,
    handleApiTransaction: context.handleApiTransaction,
    getPostgresStateStore: () => context.postgresStateStore,
    readDbFile: context.readDbFile
  });
  return {
    observed,
    setState: state => { durable = state; },
    setUnavailable: value => { unavailable = value; },
    setMissing: value => { missing = value; },
    async request(pathname = photoPath, cookie = `ppr_session=${token}`) {
      const req = { method: "GET", headers: { cookie, "x-client-protocol": "1" } };
      const res = { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = body; } };
      try { await handleApi(req, res, pathname, new URL(pathname, "http://localhost")); }
      catch (error) { res.status = error.statusCode || 500; res.error = error; }
      return res;
    }
  };
}

test("parallel cached photos retain only fresh auth projections and never query/clone working state", async () => {
  const app = fixture();
  const responses = await Promise.all(Array.from({ length: 23 }, () => app.request()));
  assert.ok(responses.every(response => response.status === 200), responses.map(response => response.error?.stack).filter(Boolean).join("\n"));
  assert.ok(responses.every(response => response.body.toString() === "cached-photo"));
  assert.equal(app.observed.authReads, 23);
  assert.equal(app.observed.fileReads, 23);
  assert.equal(app.observed.fullReads, 0);
  assert.equal(app.observed.jsonReads, 0);
  assert.equal(app.observed.mirrorReads, 0);
  assert.equal(new Set(app.observed.heldViews).size, 23);
  for (const state of app.observed.heldViews) assert.deepEqual(Object.keys(state).sort(), ["authSessions", "users"]);
});

test("cached photo access rechecks revocation, expiry and disabled/deleted users on each request", async () => {
  const app = fixture();
  assert.equal((await app.request()).status, 200);
  for (const change of [
    state => { state.authSessions = []; },
    state => { state.authSessions[0].expiresAt = "2000-01-01T00:00:00.000Z"; },
    state => { state.users[0].approved = false; },
    state => { state.users[0].pendingApproval = true; },
    state => { state.users[0].role = ""; },
    state => { state.users = []; }
  ]) {
    const state = authState();
    change(state);
    app.setState(state);
    assert.equal((await app.request()).status, 401);
  }
  app.setState(authState());
  assert.equal((await app.request(photoPath, "")).status, 401);
  assert.equal(app.observed.fileReads, 1, "denied requests must not read even a cached image");
  assert.equal((await app.request()).status, 200);
  assert.equal(app.observed.authReads, 9);
  assert.equal(app.observed.fullReads, 0);
});

test("an unavailable or missing primary state fails closed for photos without stale cache or mirror fallback", async () => {
  const app = fixture();
  assert.equal((await app.request()).status, 200);
  app.setUnavailable(true);
  assert.equal((await app.request()).status, 503);
  app.setUnavailable(false);
  app.setMissing(true);
  assert.equal((await app.request()).status, 503);
  assert.equal(app.observed.fileReads, 1);
  assert.equal(app.observed.mirrorReads, 0);
  assert.equal(app.observed.fullReads, 0);
});

test("auth projection is limited to photo GET; regular state reads keep their complete snapshot", async () => {
  const app = fixture();
  assert.equal((await app.request("/api/state")).status, 200);
  assert.equal(app.observed.fullReads, 1);
  assert.equal(app.observed.authReads, 0);
});

test("JSON photo authorization also projects its freshly read users and sessions", async () => {
  const app = fixture({ postgres: false });
  assert.equal((await app.request()).status, 200);
  app.setState({ ...authState(), authSessions: [] });
  assert.equal((await app.request()).status, 401);
  assert.equal(app.observed.jsonReads, 2);
  assert.equal(app.observed.fullReads, 0);
  assert.equal(app.observed.authReads, 0);
  assert.deepEqual(Object.keys(app.observed.heldViews[0]).sort(), ["authSessions", "users"]);
});
