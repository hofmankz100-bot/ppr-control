"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
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

test("duplicate database URLs are ignored", () => {
  assert.deepEqual(configuredDatabases({
    DATABASE_URL: "postgres://same",
    NEON_DATABASE_URL: "postgres://same",
    SUPABASE_DATABASE_URL: "postgres://third"
  }).map(item => item.name), ["primary", "supabase"]);
});
