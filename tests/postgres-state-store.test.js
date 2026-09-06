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
