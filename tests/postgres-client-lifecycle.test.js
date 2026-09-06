"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createPostgresStateStore } = require("../server/postgres-state-store");
const { createStateTransactions } = require("../server/state-transactions");
const { MultiPostgres } = require("../multi-postgres");

function fixture(afterQuery = () => {}) {
  let persisted = { payload: { count: 0 }, state_revision: "1" };
  const clients = [];
  const pool = Object.assign(new EventEmitter(), {
    connect(callback) {
      let staged;
      const client = Object.assign(new EventEmitter(), {
        queries: [], releases: [],
        async query(sql, params) {
          this.queries.push(sql);
          let result = { rows: [] };
          if (sql.includes("FOR UPDATE")) result = { rows: [structuredClone(persisted)] };
          if (sql.startsWith("UPDATE ppr_settings")) {
            staged = { payload: JSON.parse(params[0]), state_revision: String(BigInt(persisted.state_revision) + 1n) };
            result = { rowCount: 1, rows: [{ state_revision: staged.state_revision, updated_at: new Date() }] };
          }
          if (sql === "COMMIT" && staged) persisted = staged;
          await afterQuery(sql, this);
          return result;
        },
        release(error) { this.releases.push(error); }
      });
      clients.push(client);
      callback(null, client);
    },
    async query() { return { rows: [structuredClone(persisted)] }; }
  });
  return { pool, clients, persisted: () => structuredClone(persisted) };
}

test("a checked-out client handles disconnection between queries, rejects the mutation and recovers on a new connection", async () => {
  const db = fixture();
  const store = createPostgresStateStore(db.pool);
  const session = await store.begin();
  const broken = db.clients[0];
  const failure = new Error("connection terminated between queries");
  assert.doesNotThrow(() => broken.emit("error", failure));
  await assert.rejects(session.commit({ count: 9 }), error => error === failure && error.statusCode === 503);
  await session.rollback();
  session.release();
  session.release();
  assert.deepEqual(broken.releases, [failure], "release(error) must discard the connection exactly once");
  assert.equal(broken.listenerCount("error"), 0, "the checkout listener must not remain on a returned client");
  assert.equal(broken.queries.some(sql => /^(UPDATE|COMMIT|ROLLBACK)/.test(sql)), false);
  assert.deepEqual(db.persisted().payload, { count: 0 });
  const recovered = await store.begin();
  await recovered.commit({ count: 1 });
  recovered.release();
  assert.notEqual(db.clients[1], broken);
  assert.deepEqual(db.persisted().payload, { count: 1 });
  assert.deepEqual(db.clients[1].releases, [undefined]);
  assert.equal(db.clients[1].listenerCount("error"), 0);
});

test("the error listener is installed synchronously when the pool hands out its client", async () => {
  const db = fixture();
  const acquire = db.pool.connect;
  const failure = new Error("connection lost immediately after checkout");
  db.pool.connect = callback => acquire((error, client) => {
    callback(error, client);
    assert.doesNotThrow(() => client.emit("error", failure));
  });
  await assert.rejects(createPostgresStateStore(db.pool).begin(), error => error === failure);
  assert.deepEqual(db.clients[0].queries, []);
  assert.deepEqual(db.clients[0].releases, [failure]);
  assert.equal(db.clients[0].listenerCount("error"), 0);
});

test("a disconnection racing the COMMIT reply cannot publish or acknowledge an uncertain write", async () => {
  const failure = new Error("COMMIT reply connection lost");
  let disconnect = true;
  const db = fixture((sql, client) => {
    if (sql === "COMMIT" && disconnect) { disconnect = false; client.emit("error", failure); }
  });
  let committed = { count: 0 };
  let acknowledgements = 0;
  const published = [];
  const store = createPostgresStateStore(db.pool);
  const transactions = createStateTransactions({
    begin: () => store.begin(), committed: () => committed,
    publish(state) { committed = state; published.push(state.count); }
  });
  await assert.rejects(transactions.run(() => {
    transactions.stage({ count: 1 });
    transactions.defer(() => { acknowledgements += 1; }, { critical: true });
  }), error => error === failure && error.statusCode === 503);
  assert.equal(acknowledgements, 0);
  assert.deepEqual(published, []);
  assert.deepEqual(committed, { count: 0 });
  // The database may have committed before losing its reply; the next request
  // must reread it, rather than retrying the old mutation or publishing its cache.
  assert.deepEqual(db.persisted().payload, { count: 1 });
  await transactions.run(() => {
    const next = transactions.read();
    assert.equal(next.count, 1);
    next.count += 1;
    transactions.stage(next);
  });
  assert.deepEqual(published, [2]);
  assert.deepEqual(db.clients[0].releases, [failure]);
});

test("mirror preparation handles a checked-out client error without leaving a fence or reusable broken client", async () => {
  const failure = new Error("mirror connection terminated during BEGIN");
  const replica = fixture((sql, client) => { if (sql === "BEGIN") client.emit("error", failure); });
  const store = createPostgresStateStore(fixture().pool);
  await assert.rejects(store.prepareMirror({ pool: replica.pool }), error => error === failure);
  assert.deepEqual(replica.clients[0].queries, ["BEGIN"]);
  assert.deepEqual(replica.clients[0].releases, [failure]);
  assert.equal(replica.clients[0].listenerCount("error"), 0);
});

test("initialization preserves the COMMIT failure when rollback also fails and discards that client", async () => {
  const commitFailure = new Error("commit failed");
  const rollbackFailure = new Error("rollback failed");
  const db = fixture(sql => {
    if (sql === "COMMIT") throw commitFailure;
    if (sql === "ROLLBACK") throw rollbackFailure;
  });
  const store = createPostgresStateStore(db.pool);
  await assert.rejects(store.initialize(() => ({ count: 0 })), error => error === commitFailure && error.statusCode === 503);
  assert.deepEqual(db.clients[0].releases, [rollbackFailure]);
  assert.equal(db.clients[0].listenerCount("error"), 0);
});

test("authoritative reads update primary health after disconnection without promoting a mirror", async () => {
  const db = fixture();
  const outage = new Error("primary unavailable");
  const query = db.pool.query;
  let offline = false;
  db.pool.query = async (...args) => { if (offline) throw outage; return query(...args); };
  const statuses = [];
  const cluster = new MultiPostgres([
    { name: "primary", healthy: false, error: "old failure", pool: db.pool },
    { name: "mirror", healthy: true, pool: { query() { throw new Error("Mirror must not be read"); } } }
  ], { onStatus: status => statuses.push(status) });
  const store = createPostgresStateStore(cluster);
  await store.refresh();
  assert.equal(statuses.at(-1).nodes[0].healthy, true);
  assert.equal(statuses.at(-1).nodes[0].error, "");
  assert.ok(statuses.at(-1).nodes[0].lastSuccessAt);
  offline = true;
  await assert.rejects(store.snapshot(), error => error === outage && error.statusCode === 503);
  assert.equal(statuses.at(-1).nodes[0].healthy, false);
  offline = false;
  await store.snapshot();
  assert.equal(statuses.at(-1).nodes[0].healthy, true);
  assert.equal(statuses.at(-1).nodes[1].healthy, true);
  assert.equal(cluster.activeIndex, 1, "the store must not alter the separate auxiliary-query routing");
});
