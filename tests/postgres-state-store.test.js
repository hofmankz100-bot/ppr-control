"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createPostgresStateStore } = require("../server/postgres-state-store");
const { createStateTransactions } = require("../server/state-transactions");

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function snapshotFixture(revision = "1") {
  const fixture = {
    row: { state_revision: revision, payload: { users: [{ id: "worker", role: "engineer" }], authSessions: [{ tokenHash: "active-token", userId: "worker" }], checks: { retained: true } } },
    revisionReads: 0, payloadReads: 0, publications: [], failRevision: false, failPayload: false, beforePayload: null
  };
  fixture.store = createPostgresStateStore({ nodes: [
    { pool: { async query(sql) {
      if (sql.startsWith("SELECT state_revision")) {
        fixture.revisionReads += 1;
        if (fixture.failRevision) throw new Error("primary unavailable");
        return { rows: fixture.row ? [{ state_revision: fixture.row.state_revision }] : [] };
      }
      assert.equal(sql, "SELECT payload,state_revision FROM ppr_settings WHERE setting_key='full_state'");
      fixture.payloadReads += 1;
      if (fixture.failPayload) throw new Error("payload read failed");
      fixture.beforePayload?.();
      return { rows: fixture.row ? [structuredClone(fixture.row)] : [] };
    } } },
    { pool: { query() { throw new Error("A stale mirror must never supply authentication state"); } } }
  ] }, { onExternalState: state => fixture.publications.push(state) });
  return fixture;
}

test("unchanged authoritative revisions reuse isolated snapshots without reading the full JSONB again", async () => {
  const fixture = snapshotFixture("0");
  const first = await fixture.store.snapshot();
  first.authSessions.length = 0;
  first.checks.retained = false;
  const second = await fixture.store.snapshot();
  const third = await fixture.store.snapshot();
  assert.deepEqual(second, fixture.row.payload);
  assert.deepEqual(third, fixture.row.payload);
  assert.notEqual(second, third);
  assert.notEqual(second.authSessions, third.authSessions);
  assert.equal(fixture.revisionReads, 3, "every request verifies freshness against primary");
  assert.equal(fixture.payloadReads, 1);
  assert.equal(fixture.publications.length, 1);
});

test("shared snapshots reuse the canonical state while request views stay isolated", async () => {
  const fixture = snapshotFixture("0");
  const first = await fixture.store.sharedSnapshot();
  const second = await fixture.store.sharedSnapshot();
  assert.equal(first, second);
  const transactions = createStateTransactions({
    snapshot: () => fixture.store.sharedSnapshot(),
    committed: () => first,
    begin: () => { throw new Error("unexpected write"); }
  });
  await transactions.view(() => {
    transactions.read().checks.retained = false;
    transactions.read().authSessions.length = 0;
  });
  assert.equal(first.checks.retained, true);
  assert.equal(first.authSessions.length, 1);
});

test("a committed session revocation and role change invalidate the snapshot before the next authorization", async () => {
  const fixture = snapshotFixture();
  await fixture.store.snapshot();
  fixture.row = { state_revision: "2", payload: { users: [{ id: "worker", role: "operator" }], authSessions: [], checks: { retained: true } } };
  const fresh = await fixture.store.snapshot();
  assert.equal(fresh.users[0].role, "operator");
  assert.deepEqual(fresh.authSessions, []);
  assert.equal(fixture.payloadReads, 2);
  assert.deepEqual(await fixture.store.snapshot(), fresh);
  assert.equal(fixture.payloadReads, 2);
});

test("a write between the revision check and payload read uses the revision of the returned payload", async () => {
  const fixture = snapshotFixture();
  await fixture.store.snapshot();
  fixture.row.state_revision = "2";
  fixture.beforePayload = () => {
    fixture.beforePayload = null;
    fixture.row = { state_revision: "3", payload: { users: [], authSessions: [], checks: { laterCommit: true } } };
  };
  assert.deepEqual(await fixture.store.snapshot(), fixture.row.payload);
  assert.deepEqual(await fixture.store.snapshot(), fixture.row.payload);
  assert.equal(fixture.payloadReads, 2, "the newer payload revision is cached together with its data");
});

test("a lost COMMIT response retains the attempted revision as the runtime failover floor", async () => {
  const row = { payload: { checks: {} }, state_revision: "10" };
  const client = Object.assign(new EventEmitter(), {
    async query(sql) {
      if (sql.includes("FOR UPDATE") || sql.startsWith("SELECT payload")) return { rows: [row] };
      if (sql.startsWith("UPDATE ppr_settings")) return { rowCount: 1, rows: [{ state_revision: "11", updated_at: new Date() }] };
      if (sql === "COMMIT") throw new Error("COMMIT response lost");
      return { rows: [] };
    }, release() {}
  });
  const store = createPostgresStateStore({
    connect(callback) { callback(null, client); },
    async query() { return { rows: [row] }; }
  });
  const session = await store.begin();
  try {
    assert.equal(store.hasActiveTransactions(), true);
    assert.equal(store.failoverRevision(), 10n);
    await assert.rejects(session.commit({ checks: { saved: true } }), /COMMIT response lost/);
    assert.equal(store.failoverRevision(), 11n);
    await session.rollback();
    await store.snapshot();
    assert.equal(store.failoverRevision(), 11n, "a stale read cannot lower the conservative floor");
  } finally { session.release(); }
  session.release();
  assert.equal(store.hasActiveTransactions(), false);
});

test("snapshot failures and a missing authoritative row never return previously cached authorization", async t => {
  for (const failure of ["revision", "payload", "missing"]) {
    await t.test(failure, async () => {
      const fixture = snapshotFixture();
      await fixture.store.snapshot();
      if (failure === "revision") fixture.failRevision = true;
      if (failure === "payload") { fixture.row.state_revision = "2"; fixture.failPayload = true; }
      if (failure === "missing") fixture.row = null;
      await assert.rejects(fixture.store.snapshot(), error => error.statusCode === 503);
      assert.equal(fixture.publications.length, 1);
    });
  }
});

test("a delayed COMMIT response cannot publish over a newer committed snapshot from another instance", async () => {
  const executed = deferred();
  const response = deferred();
  let persisted = { payload: { count: 0 }, state_revision: "1" };
  let staged;
  let releases = 0;
  const client = Object.assign(new EventEmitter(), {
    async query(sql, params) {
      if (sql.includes("FOR UPDATE")) return { rows: [structuredClone(persisted)] };
      if (sql.startsWith("UPDATE ppr_settings")) {
        staged = { payload: JSON.parse(params[0]), state_revision: String(BigInt(persisted.state_revision) + 1n) };
        return { rowCount: 1, rows: [{ state_revision: staged.state_revision, updated_at: new Date() }] };
      }
      if (sql === "COMMIT") {
        persisted = staged;
        executed.resolve();
        await response.promise;
      }
      return { rows: [] };
    },
    release() { releases += 1; }
  });
  const pool = {
    connect(callback) { callback(null, client); },
    async query() { return { rows: [structuredClone(persisted)] }; }
  };
  let cache = { count: 0 };
  const published = [];
  const store = createPostgresStateStore(pool, {
    onExternalState(state) { cache = state; published.push(state.count); }
  });
  const transactions = createStateTransactions({
    begin: () => store.begin(), committed: () => cache, snapshot: () => store.snapshot(),
    publish(state) { cache = state; published.push(state.count); }
  });
  let deferredSuperseded = false;
  let parentSnapshot;
  const request = transactions.view(async () => {
    await transactions.run(() => {
      const state = transactions.read();
      state.count = 1;
      transactions.stage(state);
      const transaction = transactions.current();
      transactions.defer(() => { deferredSuperseded = transaction.superseded; }, { critical: true });
    });
    parentSnapshot = transactions.read();
  });
  await executed.promise;
  try {
    // PostgreSQL committed revision 2, but its network reply is delayed. Another
    // instance has already committed revision 3 and a read observed that state.
    persisted = { payload: { count: 2 }, state_revision: "3" };
    await store.snapshot();
    assert.equal(cache.count, 2);
  } finally { response.resolve(); }
  await request;
  assert.equal(cache.count, 2);
  assert.equal(parentSnapshot.count, 2);
  assert.equal(deferredSuperseded, true);
  assert.equal(releases, 1);
  assert.deepEqual(published, [0, 2]);
  await store.refresh();
  assert.deepEqual(published, [0, 2], "known revision must not regress when the delayed COMMIT response arrives");
});
