"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createLatestMirrorQueue } = require("../server/latest-mirror-queue");
const { createPostgresStateStore } = require("../server/postgres-state-store");
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const snapshot = revision => ({ revision: BigInt(revision), serializedState: JSON.stringify({ cumulative: Array.from({ length: revision }, (_, index) => index) }) });

function fixture({ storeFactory = createPostgresStateStore, ...options } = {}) {
  let primaryRow = { payload: { cumulative: [] }, state_revision: "0" };
  let mirrorRow = structuredClone(primaryRow);
  const clients = [], writes = [], errors = [];
  let beforeQuery = async () => {};
  const primary = {
    connect(callback) {
      let staged;
      callback(null, Object.assign(new EventEmitter(), {
        async query(sql, params) {
          if (sql.includes("FOR UPDATE") || sql.startsWith("SELECT payload")) return { rows: [structuredClone(primaryRow)] };
          if (sql.startsWith("UPDATE ppr_settings")) {
            staged = { payload: JSON.parse(params[0]), state_revision: String(BigInt(primaryRow.state_revision) + 1n), updated_at: "2026-09-08T17:00:00Z" };
            return { rows: [staged], rowCount: 1 };
          }
          if (sql === "COMMIT" && staged) primaryRow = staged;
          return { rows: [] };
        }, release() {}
      }));
    }
  };
  const node = { name: "mirror", healthy: true, pool: {
    async query(sql, params) {
      const client = await new Promise((resolve, reject) => this.connect((error, value) => error ? reject(error) : resolve(value)));
      try { return await client.query(sql, params); } finally { client.release(); }
    },
    connect(callback) {
      let staged;
      const client = Object.assign(new EventEmitter(), {
        queries: [], releases: [],
        async query(sql, params) {
          this.queries.push(sql);
          await beforeQuery(sql, params, client);
          if (this.releases.length) throw new Error("discarded client");
          if (sql.startsWith("INSERT INTO")) {
            writes.push(String(params[1]));
            if (BigInt(mirrorRow.state_revision) < BigInt(params[1])) staged = { payload: JSON.parse(params[0]), state_revision: String(params[1]) };
          }
          if (sql === "COMMIT" && staged) mirrorRow = staged;
          if (sql === "ROLLBACK") staged = null;
          return { rows: [], rowCount: staged ? 1 : 0 };
        },
        release(error) { this.releases.push(error); }
      });
      clients.push(client);
      callback(null, client);
    }
  } };
  const store = storeFactory({ nodes: [{ name: "primary", healthy: true, pool: primary }, node] }, {
    ...options, onMirrorError: error => errors.push(error)
  });
  return {
    store, node, clients, writes, errors,
    set beforeQuery(callback) { beforeQuery = callback; },
    get primaryRow() { return primaryRow; }, get mirrorRow() { return mirrorRow; },
    async commit(state) {
      const session = await store.begin();
      try { await session.commit(state); } finally { session.release(); }
    }
  };
}

if (require.main === module) {
test("one active plus latest pending complete state, monotonic watermark, and captured flush", async () => {
  const gates = [], revisions = [];
  const queue = createLatestMirrorQueue({ write: item => {
    revisions.push(item.revision.toString());
    const gate = deferred(); gates.push(gate); return gate.promise;
  } });
  queue.enqueue(snapshot(1)); await tick();
  for (let revision = 2; revision <= 12; revision += 1) queue.enqueue(snapshot(revision));
  assert.deepEqual(queue.status(), { activeRevision: "1", pendingRevision: "12", completedRevision: "-1" });
  let flushed = false;
  const flush = queue.flush().then(() => { flushed = true; });
  gates[0].resolve(); await tick();
  assert.deepEqual(revisions, ["1", "12"]);
  assert.equal(flushed, false);
  queue.enqueue(snapshot(13));
  gates[1].resolve(); await flush;
  assert.equal(flushed, true, "captured watermark 12 does not wait for later revision 13");
  await tick();
  queue.enqueue(snapshot(11));
  assert.equal(queue.status().pendingRevision, null, "late older response cannot regress pending history");
  gates[2].resolve(); await queue.flush();
  assert.deepEqual(revisions, ["1", "12", "13"]);
});

test("failure retains only newest full state, reports failed flush, resumes explicitly without blind retries", async () => {
  const gate = deferred(), seen = [], failure = new Error("offline");
  let online = false;
  const queue = createLatestMirrorQueue({ write: async item => { seen.push(item.revision); if (!online) await gate.promise; } });
  queue.enqueue(snapshot(1)); await tick(); queue.enqueue(snapshot(2));
  gate.reject(failure);
  await assert.rejects(queue.flush(), error => error === failure);
  queue.enqueue(snapshot(3), false);
  await tick();
  assert.deepEqual(seen, [1n]);
  assert.equal(queue.status().pendingRevision, "3");
  online = true; queue.resume(); await queue.flush();
  assert.deepEqual(seen, [1n, 3n]);
});

test("actual store acknowledgements/floor do not wait for slow mirrors; latest version preserves edits and deletions", async () => {
  const f = fixture(), gate = deferred(), started = deferred();
  f.beforeQuery = async (sql, params) => { if (sql.startsWith("INSERT INTO") && params[1] === "1") { started.resolve(); await gate.promise; } };
  await f.commit({ cumulative: [1], obsolete: "will be deliberately removed" });
  await started.promise;
  for (let index = 2; index <= 12; index += 1) await f.commit({ cumulative: Array.from({ length: index }, (_, i) => i + 1), manualGroup: "saved" });
  assert.equal(f.store.failoverRevision(), 12n);
  assert.equal(f.primaryRow.state_revision, "12");
  assert.equal(f.clients.length, 1);
  gate.resolve();
  assert.deepEqual(await f.store.flushMirrors(), [{ status: "fulfilled", value: { revision: "12" } }]);
  assert.deepEqual(f.writes, ["1", "12"]);
  assert.deepEqual(f.mirrorRow.payload, f.primaryRow.payload);
  assert.equal(f.mirrorRow.payload.obsolete, undefined);
  assert.ok(f.clients.every(client => client.releases.length === 1));
});

test("prepareMirror waits for active work, fences before resuming pending, and recovery needs no new primary commit", async () => {
  const f = fixture(), gate = deferred(), started = deferred();
  f.beforeQuery = async (sql, params) => { if (sql.startsWith("INSERT INTO") && params[1] === "1") { started.resolve(); await gate.promise; } };
  await f.commit({ cumulative: [1] }); await started.promise;
  await f.commit({ cumulative: [1, 2] });
  const prepared = f.store.prepareMirror(f.node);
  await tick(); assert.equal(f.clients.length, 1);
  gate.resolve(); await prepared; await f.store.flushMirrors();
  assert.ok(f.clients[1].queries.some(sql => sql.startsWith("CREATE TRIGGER")));
  assert.ok(f.clients[2].queries.some(sql => sql.startsWith("INSERT INTO")));
  assert.equal(f.mirrorRow.state_revision, "2");

  f.beforeQuery = async sql => { if (sql.startsWith("INSERT INTO")) throw new Error("offline"); };
  await f.commit({ cumulative: [1, 2, 3] });
  const failed = await f.store.flushMirrors();
  assert.equal(failed[0].status, "rejected");
  assert.equal(f.node.healthy, false);
  await f.commit({ cumulative: [1, 2, 3, 4] });
  f.beforeQuery = async () => {};
  await f.store.prepareMirror(f.node);
  await f.store.flushMirrors();
  assert.equal(f.mirrorRow.state_revision, "4");
});

test("mirror query deadline discards checked-out connection once and preserves pending state for recovery", async () => {
  const f = fixture({ mirrorQueryTimeoutMs: 25 });
  f.beforeQuery = async sql => { if (sql.startsWith("INSERT INTO")) await new Promise(() => {}); };
  await f.commit({ cumulative: [1] });
  const result = await f.store.flushMirrors();
  assert.equal(result[0].status, "rejected");
  assert.equal(result[0].reason.code, "PPR_MIRROR_QUERY_TIMEOUT");
  assert.equal(f.clients[0].releases.length, 1);
  assert.equal(f.clients[0].releases[0].code, "PPR_MIRROR_QUERY_TIMEOUT");
  assert.equal(f.clients[0].listenerCount("error"), 0);
  assert.equal(f.store.failoverRevision(), 1n);
  f.beforeQuery = async () => {};
  await f.store.prepareMirror(f.node); await f.store.flushMirrors();
  assert.equal(f.mirrorRow.state_revision, "1");
});

test("failed mirror preparation keeps pending data paused until a successful fence installation", async () => {
  const f = fixture({ mirrorQueryTimeoutMs: 25 });
  f.node.healthy = false;
  await f.commit({ cumulative: [1], manualGroup: "never-clear" });
  f.beforeQuery = async sql => { if (sql === "BEGIN") await new Promise(() => {}); };
  await assert.rejects(f.store.prepareMirror(f.node), { code: "PPR_MIRROR_QUERY_TIMEOUT" });
  assert.equal(f.clients[0].releases.length, 1);
  assert.equal((await f.store.flushMirrors())[0].status, "rejected");
  assert.deepEqual(f.writes, []);
  f.beforeQuery = async () => {};
  await f.store.prepareMirror(f.node);
  assert.equal((await f.store.flushMirrors())[0].status, "fulfilled");
  assert.deepEqual(f.mirrorRow.payload, { cumulative: [1], manualGroup: "never-clear" });
});
}

module.exports = { fixture };
