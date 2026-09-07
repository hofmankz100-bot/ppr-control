"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createReadLimiter } = require("../server/read-limiter");
const { createStateTransactions } = require("../server/state-transactions");
const { seedEmptyPostgresReplicas } = require("../server/replica-seed");
const { syncPostgresPhotos } = require("../server/replica-photo-sync");
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

test("parallel readers load one isolated snapshot at a time and release retained contexts", async () => {
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
  assert.equal(peak, 1);
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

test("replica recovery reads payloads only for missing or stale photos", async () => {
  let payloadReads = 0;
  const copied = [];
  const rows = [
    { file_name: "a", updated_at: "2026-09-01" },
    { file_name: "b", updated_at: "2026-09-02" },
    { file_name: "c", updated_at: "2026-09-03" }
  ];
  const source = { async query(sql, params) {
    if (sql.includes("file_name >")) return { rows: params[0] ? [] : rows };
    payloadReads += 1;
    const row = rows.find(item => item.file_name === params[0]);
    return { rows: [{ ...row, payload: Buffer.alloc(1024), mime_type: "image/jpeg" }] };
  } };
  const target = { async query(sql, params) {
    if (sql.startsWith("SELECT file_name")) return { rows: [
      { file_name: "a", updated_at: "2026-09-01" },
      { file_name: "b", updated_at: "2026-08-01" }
    ] };
    assert.match(sql, /WHERE ppr_photos.updated_at < EXCLUDED.updated_at/);
    copied.push(params[0]);
    return { rowCount: 1 };
  } };
  const count = await syncPostgresPhotos(source, target, { batchSize: 100 });
  assert.equal(count, 2);
  assert.equal(payloadReads, 2);
  assert.deepEqual(copied, ["b", "c"]);
});

test("replica recovery does not read binary payloads when photos are current", async () => {
  const rows = Array.from({ length: 423 }, (_, index) => ({
    file_name: String(index + 1).padStart(4, "0"), updated_at: "2026-09-01"
  }));
  let metadataCalls = 0;
  const source = { async query(sql, params) {
    assert.match(sql, /SELECT file_name,updated_at/);
    metadataCalls += 1;
    const next = rows.filter(row => row.file_name > params[0]).slice(0, params[1]);
    return { rows: next };
  } };
  const target = { async query(sql, params) {
    assert.match(sql, /file_name = ANY/);
    return { rows: params[0].map(file_name => ({ file_name, updated_at: "2026-09-01" })) };
  } };
  const count = await syncPostgresPhotos(source, target, { batchSize: 100 });
  assert.equal(count, 0);
  assert.equal(metadataCalls, 6);
});
