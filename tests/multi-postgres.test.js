"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { MultiPostgres, configuredDatabases } = require("../multi-postgres");

function fakeNode(name, handler) {
  return { name, healthy: true, pool: { query: handler, end: async () => {} } };
}

test("writes are mirrored to every configured database", async () => {
  const calls = [];
  const cluster = new MultiPostgres([
    fakeNode("render", async sql => { calls.push(["render", sql]); return { rows: [{ ok: 1 }] }; }),
    fakeNode("supabase", async sql => { calls.push(["supabase", sql]); return { rows: [{ ok: 1 }] }; })
  ]);
  await cluster.query("INSERT INTO ppr_settings(setting_key,payload) VALUES($1,$2)", ["full_state", "{}"]);
  assert.deepEqual(calls.map(item => item[0]).sort(), ["render", "supabase"]);
});

test("read automatically fails over without user involvement", async () => {
  const cluster = new MultiPostgres([
    fakeNode("neon", async () => { throw new Error("quota exceeded"); }),
    fakeNode("render", async () => ({ rows: [{ value: 42 }] }))
  ]);
  const result = await cluster.query("SELECT value FROM settings");
  assert.equal(result.rows[0].value, 42);
  assert.equal(cluster.status().active, "render");
  assert.equal(cluster.status().nodes[0].healthy, false);
});

test("a write succeeds when at least one database is available", async () => {
  const cluster = new MultiPostgres([
    fakeNode("render", async () => { throw new Error("offline"); }),
    fakeNode("supabase", async () => ({ rows: [] }))
  ]);
  await cluster.query("UPDATE ppr_settings SET payload=$1", ["{}"]);
  assert.equal(cluster.status().active, "supabase");
});

test("readAll returns records from every healthy database without changing the active node", async () => {
  const calls = [];
  const cluster = new MultiPostgres([
    fakeNode("primary", async sql => { calls.push(["primary", sql]); return { rows: [{ id: "backup-primary" }] }; }),
    fakeNode("replica", async sql => { calls.push(["replica", sql]); return { rows: [{ id: "backup-replica" }] }; })
  ]);

  const results = await cluster.readAll("SELECT id FROM backups");

  assert.deepEqual(results.map(item => item.result.rows[0].id), ["backup-primary", "backup-replica"]);
  assert.equal(cluster.activeIndex, 0);
  assert.deepEqual(calls.map(item => item[0]), ["primary", "replica"]);
});

test("readAll skips a known unhealthy database", async () => {
  let offlineCalls = 0;
  const offline = fakeNode("offline", async () => { offlineCalls += 1; throw new Error("quota exceeded"); });
  offline.healthy = false;
  const cluster = new MultiPostgres([
    fakeNode("primary", async () => ({ rows: [{ id: "backup-primary" }] })),
    offline
  ]);

  const results = await cluster.readAll("SELECT id FROM backups");

  assert.equal(results.length, 1);
  assert.equal(offlineCalls, 0);
});

test("known unhealthy replicas are left to the recovery monitor", async () => {
  let unhealthyCalls = 0;
  const unhealthy = fakeNode("neon", async () => {
    unhealthyCalls += 1;
    throw new Error("quota exceeded");
  });
  unhealthy.healthy = false;
  const cluster = new MultiPostgres([
    fakeNode("primary", async () => ({ rows: [] })),
    unhealthy
  ]);

  await cluster.query("UPDATE ppr_settings SET payload=$1", ["{}"]);
  await cluster.flushMirrors();
  assert.equal(unhealthyCalls, 0);
  assert.equal(cluster.status().nodes[1].healthy, false);
});

test("flushMirrors waits until delayed database mirrors finish", async () => {
  let releaseMirror;
  let mirrored = false;
  const mirrorGate = new Promise(resolve => { releaseMirror = resolve; });
  const cluster = new MultiPostgres([
    fakeNode("primary", async () => ({ rows: [] })),
    fakeNode("mirror", async () => {
      await mirrorGate;
      mirrored = true;
      return { rows: [] };
    })
  ]);

  await cluster.query("INSERT INTO ppr_photos(file_name) VALUES($1)", ["photo.png"]);
  assert.equal(mirrored, false);
  const flushed = cluster.flushMirrors();
  releaseMirror();
  await flushed;
  assert.equal(mirrored, true);
});

test("duplicate database URLs are ignored", () => {
  assert.deepEqual(configuredDatabases({
    DATABASE_URL: "postgres://same",
    NEON_DATABASE_URL: "postgres://same",
    SUPABASE_DATABASE_URL: "postgres://third"
  }).map(item => item.name), ["primary", "supabase"]);
});

test("an idle pool error marks only that database unavailable without becoming unhandled", () => {
  const pool = new EventEmitter();
  pool.query = async () => ({ rows: [] });
  pool.end = async () => {};
  const errors = [];
  const cluster = new MultiPostgres([
    { name: "primary", healthy: true, pool },
    fakeNode("backup", async () => ({ rows: [] }))
  ], {
    onPoolError: (error, nodeName) => errors.push([nodeName, error.message])
  });

  pool.emit("error", new Error("Connection terminated unexpectedly"));

  assert.equal(cluster.status().nodes[0].healthy, false);
  assert.equal(cluster.status().nodes[1].healthy, true);
  assert.deepEqual(errors, [["primary", "Connection terminated unexpectedly"]]);
});
