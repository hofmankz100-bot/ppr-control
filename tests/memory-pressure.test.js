"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createReadLimiter } = require("../server/read-limiter");
const { createStateTransactions } = require("../server/state-transactions");
const { seedEmptyPostgresReplicas } = require("../server/replica-seed");
const { createApiDispatcher } = require("../server/api-dispatcher");

test("slow translations cannot block QR and ordinary state reads", async () => {
  let unblock;
  let started;
  const blocked = new Promise(resolve => { unblock = resolve; });
  const ready = new Promise(resolve => { started = resolve; });
  const tx = createStateTransactions({ snapshot: () => ({ users: [] }) });
  const dispatch = createApiDispatcher({
    stateTransactions: tx,
    async handleApiTransaction(req, res, pathname) {
      if (pathname === "/api/translate") { started(); await blocked; }
      res.completed = true;
    }
  });
  const translation = dispatch({ method: "POST" }, {}, "/api/translate");
  await ready;
  const secondTranslation = dispatch({ method: "POST" }, {}, "/api/translate");
  try {
    for (const pathname of ["/api/qr", "/api/state", "/api/attendance/status"]) {
      const res = {};
      await dispatch({ method: "GET" }, res, pathname);
      assert.equal(res.completed, true);
    }
  } finally { unblock(); }
  await Promise.all([translation, secondTranslation]);
});

test("empty replica seeding fetches one photo or backup per query", async () => {
  const written = [];
  const source = { healthy: true, pool: { async query(sql, params) {
    assert.match(sql, /WHERE (file_name|backup_id|archive_id) > \$1 ORDER BY \1 LIMIT 1$/);
    const key = sql.match(/WHERE (\w+)/)[1];
    const next = params[0] === "" ? "a" : params[0] === "a" ? "b" : null;
    return { rows: next ? [{ [key]: next, payload: {}, created_at: "2026-09-01" }] : [] };
  } } };
  const target = { healthy: true, pool: { async query(sql, params) {
    if (sql.startsWith("SELECT count")) return { rows: [{ count: 0 }] };
    written.push(params[0]);
    return { rowCount: 1 };
  } } };
  await seedEmptyPostgresReplicas([source, target], 0);
  assert.equal(target.healthy, true, target.error);
  assert.deepEqual(written, ["a", "b", "a", "b", "a", "b"]);
});

test("parallel readers load at most two isolated snapshots and release retained contexts", async () => {
  let loaded = 0;
  let peak = 0;
  const contexts = [];
  const tx = createStateTransactions({
    snapshot() { loaded += 1; peak = Math.max(peak, loaded); return { data: [1, 2, 3] }; },
    committed: () => ({}),
    begin: () => { throw new Error("unexpected write"); }
  });
  await Promise.all(Array.from({ length: 40 }, (_, index) => tx.view(async () => {
    const context = tx.current();
    contexts.push(context);
    assert.deepEqual(tx.read().data, [1, 2, 3]);
    tx.read().data.push(index);
    await new Promise(resolve => setImmediate(resolve));
    loaded -= 1;
  })));
  assert.equal(peak, 2);
  assert.equal(contexts.length, 40);
  assert.ok(contexts.every(context => !context.open && context.state === null));
});

test("reader overload is bounded and a failed task releases the next slot", async () => {
  const limit = createReadLimiter(1, 1);
  let release;
  const blocked = limit(() => new Promise(resolve => { release = resolve; }));
  const failed = limit(() => { throw new Error("database disconnected"); });
  const failure = assert.rejects(failed, /database disconnected/);
  await assert.rejects(limit(() => {}), error => error.statusCode === 503);
  release();
  await blocked;
  await failure;
  assert.equal(await limit(() => 42), 42);
});

test("replica recovery copies photos one at a time and preserves newer target records", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const code = source.slice(source.indexOf("async function recoverPostgresReplicas()"), source.indexOf("function startPostgresRecoveryMonitor()"));
  let reads = 0;
  const copied = [];
  const primary = { pool: { async query(sql, params) {
    if (sql.includes("FROM ppr_settings")) return { rows: [] };
    assert.match(sql, /WHERE file_name > \$1 ORDER BY file_name LIMIT 1$/);
    reads += 1;
    const index = params[0] ? Number(params[0]) + 1 : 1;
    return { rows: index <= 100 ? [{ file_name: String(index), payload: Buffer.alloc(1024), mime_type: "image/jpeg", updated_at: "2026-09-01" }] : [] };
  } } };
  const replica = { healthy: false, pool: { async query(sql, params) {
    if (sql === "SELECT 1") return { rows: [] };
    assert.match(sql, /WHERE ppr_photos.updated_at < EXCLUDED.updated_at/);
    copied.push(params[0]);
    return { rowCount: 1 };
  } } };
  const context = {
    postgresPool: { nodes: [primary, replica], status: () => ({}) },
    postgresStateStore: { prepareMirror: async () => {} },
    compressLegacyBackupTables: async () => {}, storageStatus: {}, postgresClusterStatus: {}
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  await context.recoverPostgresReplicas();
  assert.equal(replica.error, "");
  assert.equal(reads, 101);
  assert.deepEqual(copied, Array.from({ length: 100 }, (_, index) => String(index + 1)));
});
