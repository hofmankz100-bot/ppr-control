"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");
const multiPostgres = require("../multi-postgres");
const { createPostgresCluster } = require("../server/postgres-cluster");
const { isTransientPostgresConnectionError } = require("../server/postgres-errors");

test("startup handles an idle pool error while another database probe is still pending", async () => {
  const pools = [];
  const warnings = [];
  let finishReplicaProbe;
  const replicaProbe = new Promise(resolve => { finishReplicaProbe = resolve; });
  class FakePool extends EventEmitter {
    constructor() { super(); this.index = pools.length; this.ends = 0; pools.push(this); }
    async query(sql) {
      assert.equal(sql, "SELECT now()", "a failed primary probe must prevent initialization writes");
      if (this.index === 1) await replicaProbe;
      return { rows: [{ now: new Date() }] };
    }
    async end() { this.ends += 1; }
  }
  // Execute the actual startup function without starting HTTP servers or reading
  // application data. Every possible PostgreSQL connection is this fake Pool.
  const source = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  const initializer = source.match(/async function initializeStorage\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(initializer, "the server's storage initializer must be present");
  const context = {
    process: { env: { DATABASE_URL: "postgres://primary.invalid/test", NEON_DATABASE_URL: "postgres://replica.invalid/test" } },
    storageStatus: { mode: "json" },
    postgresClusterStatus: null,
    createPostgresCluster,
    isTransientPostgresConnectionError,
    console: { warn: message => warnings.push(message), error() {} },
    require(name) {
      if (name === "pg") return { Pool: FakePool };
      if (name === "./multi-postgres") return multiPostgres;
      throw new Error(`Unexpected startup dependency: ${name}`);
    }
  };
  const initialize = vm.runInNewContext(`(${initializer})`, context);
  const outcome = initialize().then(() => ({ succeeded: true }), error => ({ error }));
  try {
    // Let the primary probe return its client to the idle pool; the other
    // database deliberately remains pending during the connection failure.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(pools.length, 2);
    assert.doesNotThrow(() => pools[0].emit("error", new Error("idle connection terminated during startup")));
    assert.equal(pools[0].listenerCount("error"), 1, "one permanent handler avoids duplicate diagnostics");
  } finally {
    finishReplicaProbe();
    await outcome;
  }
  const result = await outcome;
  assert.match(result.error?.message || "", /Authoritative PostgreSQL database is unavailable/);
  assert.deepEqual(pools.map(pool => pool.ends), [1, 1]);
  assert.equal(warnings.length, 1);
  assert.equal(context.postgresClusterStatus.nodes[0].healthy, false);
  assert.match(context.postgresClusterStatus.nodes[0].error, /idle connection terminated/);
});
