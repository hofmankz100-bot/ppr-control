"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createRuntimePostgresFailover } = require("../server/runtime-postgres-failover");
const { EventEmitter } = require("node:events");
const { createPostgresStateStore } = require("../server/postgres-state-store");
const { createStateTransactions } = require("../server/state-transactions");

function node(name, healthy, revision, updatedAt = "2026-09-07 04:19:10.839+00") {
  return { name, healthy, pool: { async query() { return { rows: [{ state_revision: String(revision), updated_at: updatedAt }] }; } } };
}

test("runtime failure promotes the highest verified replica and coalesces repeated triggers", async () => {
  const primary = node("primary", false, 10);
  const supabase = node("supabase", true, 10);
  let created = 0;
  let promoted;
  const publications = [];
  const manager = createRuntimePostgresFailover({
    nodes: [primary, supabase],
    createStore(cluster, options) {
      created += 1;
      assert.equal(cluster.nodes[0], supabase);
      return { async snapshot() { const state = { safe: true }; options.onExternalState(state); return state; } };
    },
    storeOptions: { onExternalState(state) { assert.ok(promoted, "publish only after selecting the active store"); publications.push(state); } },
    onPromote(value) { promoted = value; }
  });
  const first = manager.schedule();
  const second = manager.schedule();
  assert.equal(first, second);
  await first;
  assert.equal(created, 1);
  assert.equal(promoted.node, supabase);
  assert.deepEqual(promoted.state, { safe: true });
  assert.deepEqual(publications, [{ safe: true }]);
});

test("runtime failure refuses a stale-only or conflicting fallback", async () => {
  const errors = [];
  const manager = createRuntimePostgresFailover({
    nodes: [node("primary", false, 12), node("supabase", false, 11)],
    createStore() { throw new Error("must not create store"); },
    storeOptions: {},
    onPromote() {},
    onError(error) { errors.push(error); }
  });
  await manager.schedule();
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /no current replica/i);
});

test("acknowledged revision 11 cannot promote mirror 10; retry succeeds after mirror catches up", async () => {
  let primaryRow = { payload: { checks: {} }, state_revision: "10", updated_at: "2026-09-08 00:00:00+00" };
  let mirrorRow = structuredClone(primaryRow);
  let staged, finishMirror;
  let acknowledged = false;
  let cached;
  const client = Object.assign(new EventEmitter(), {
    async query(sql, params) {
      if (sql.includes("FOR UPDATE") || sql.startsWith("SELECT payload")) return { rows: [structuredClone(primaryRow)] };
      if (sql.startsWith("UPDATE ppr_settings")) {
        staged = { payload: JSON.parse(params[0]), state_revision: "11", updated_at: "2026-09-08 00:00:01+00" };
        return { rowCount: 1, rows: [staged] };
      }
      if (sql === "COMMIT") primaryRow = staged;
      return { rows: [] };
    },
    release() {}
  });
  const primary = { name: "primary", healthy: true, pool: {
    connect(callback) { callback(null, client); },
    async query() { return { rows: [structuredClone(primaryRow)] }; }
  } };
  const mirror = { name: "mirror", healthy: true, pool: { connect(callback) {
    callback(null, Object.assign(new EventEmitter(), { query: (...args) => this.query(...args), release() {} }));
  }, async query(sql, params) {
    if (sql.startsWith("INSERT")) {
      await new Promise(resolve => { finishMirror = resolve; });
      mirrorRow = { payload: JSON.parse(params[0]), state_revision: String(params[1]), updated_at: params[2] };
      return { rowCount: 1 };
    }
    return { rows: [structuredClone(mirrorRow)] };
  } } };
  let activeStore = createPostgresStateStore({ nodes: [primary, mirror] });
  const originalStore = activeStore;
  const transactions = createStateTransactions({
    begin: () => activeStore.begin(), committed: () => cached,
    publish(state) { cached = state; }
  });
  await transactions.run(() => {
    const draft = transactions.read();
    draft.checks.saved = true;
    transactions.stage(draft);
    transactions.defer(() => { acknowledged = true; }, { critical: true });
  });
  assert.equal(acknowledged, true);
  assert.equal(activeStore.failoverRevision(), 11n);
  primary.healthy = false;
  let promotions = 0;
  const errors = [];
  const manager = createRuntimePostgresFailover({
    nodes: [primary, mirror], createStore: createPostgresStateStore, storeOptions: {},
    getMinimumRevision: () => activeStore.failoverRevision(),
    canPromote: () => !activeStore.hasActiveTransactions(),
    onPromote(value) { promotions += 1; activeStore = value.store; cached = value.state; },
    onError(error) { errors.push(error); }
  });
  await manager.schedule();
  assert.equal(errors[0].code, "PPR_STATE_REPLICA_STALE");
  assert.equal(promotions, 0);
  assert.equal(activeStore, originalStore);
  assert.equal(cached.checks.saved, true);
  finishMirror();
  await originalStore.flushMirrors();
  await manager.schedule();
  assert.equal(promotions, 1);
  assert.equal(activeStore.failoverRevision(), 11n);
  assert.equal(cached.checks.saved, true);
});

test("disabled runtime failover never probes or promotes a replica", async () => {
  const errors = [];
  const manager = createRuntimePostgresFailover({
    nodes: [{ healthy: true, pool: { query() { assert.fail("disabled failover must not probe"); } } }],
    allowFailover: false,
    createStore() { assert.fail("disabled failover must not create a store"); },
    onPromote() { assert.fail("disabled failover must not promote"); },
    onError(error) { errors.push(error); }
  });
  await manager.schedule();
  await manager.schedule();
  assert.equal(errors.length, 2);
  assert.ok(errors.every(error => /disabled/.test(error.message)));
});

test("a primary revision advancing during replica snapshot loading blocks promotion", async () => {
  let minimum = 11n;
  let publications = 0;
  const manager = createRuntimePostgresFailover({
    nodes: [node("primary", false, 11), node("mirror", true, 11)],
    getMinimumRevision: () => minimum,
    storeOptions: { onExternalState() { publications += 1; } },
    createStore: (_cluster, options) => ({ async snapshot() { minimum = 12n; options.onExternalState({ checks: {} }); return { checks: {} }; } }),
    onPromote() { assert.fail("newly stale replica must not replace active state"); }
  });
  await assert.rejects(manager.promote(), error => error.code === "PPR_STATE_REPLICA_STALE");
  assert.equal(publications, 0, "a rejected candidate cannot replace or broadcast the committed state");
});

test("an in-flight primary write blocks promotion even before its revision is known", async () => {
  let active = false;
  const manager = createRuntimePostgresFailover({
    nodes: [node("primary", false, 11), node("mirror", true, 11)],
    getMinimumRevision: () => 11n,
    canPromote: () => !active,
    createStore: () => ({ async snapshot() { active = true; return { checks: {} }; } }),
    onPromote() { assert.fail("active primary transaction must finish before promotion"); }
  });
  await assert.rejects(manager.promote(), error => error.code === "PPR_STATE_WRITE_IN_FLIGHT");
  await assert.rejects(manager.promote(), error => error.code === "PPR_STATE_WRITE_IN_FLIGHT");
});

test("a delayed snapshot from the former primary cannot overwrite or broadcast newer active state", async () => {
  let releaseOldRead, notifyOldRead;
  const oldReadStarted = new Promise(resolve => { notifyOldRead = resolve; });
  const primary = { name: "primary", healthy: true,
    row: { payload: { revision: 10 }, state_revision: "10", updated_at: "2026-09-08 00:00:00+00" } };
  primary.pool = { async query(sql) {
    const row = structuredClone(primary.row);
    if (sql.startsWith("SELECT payload") && row.state_revision === "11") {
      notifyOldRead();
      await new Promise(resolve => { releaseOldRead = resolve; });
    }
    return { rows: [row] };
  } };
  const mirror = { name: "mirror", healthy: true,
    row: { payload: { revision: 11 }, state_revision: "11", updated_at: "2026-09-08 00:00:01+00" } };
  mirror.pool = { async query() { return { rows: [structuredClone(mirror.row)] }; } };
  let activeStore;
  let cached;
  const publications = [];
  const options = { onExternalState(state, sourceStore) {
    if (sourceStore !== activeStore) return;
    cached = state;
    publications.push(state.revision);
  } };
  activeStore = createPostgresStateStore({ nodes: [primary, mirror] }, options);
  await activeStore.sharedSnapshot();
  const oldStore = activeStore;
  primary.row = structuredClone(mirror.row);
  const delayed = oldStore.sharedSnapshot();
  await oldReadStarted;
  try {
    primary.healthy = false;
    const manager = createRuntimePostgresFailover({
      nodes: [primary, mirror], createStore: createPostgresStateStore, storeOptions: options,
      getMinimumRevision: () => activeStore.failoverRevision(),
      canPromote: () => !activeStore.hasActiveTransactions(),
      onPromote(value) { activeStore = value.store; cached = value.state; }
    });
    await manager.promote();
    mirror.row = { payload: { revision: 12 }, state_revision: "12", updated_at: "2026-09-08 00:00:02+00" };
    await activeStore.sharedSnapshot();
    assert.equal(cached.revision, 12);
  } finally { releaseOldRead(); }
  assert.equal((await delayed).revision, 11, "an existing reader can finish on its own snapshot");
  assert.equal(cached.revision, 12);
  assert.deepEqual(publications, [10, 11, 12], "retired store cannot publish after promotion");
});
