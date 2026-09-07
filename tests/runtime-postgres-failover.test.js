"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createRuntimePostgresFailover } = require("../server/runtime-postgres-failover");

function node(name, healthy, revision, updatedAt = "2026-09-07 04:19:10.839+00") {
  return { name, healthy, pool: { async query() { return { rows: [{ state_revision: String(revision), updated_at: updatedAt }] }; } } };
}

test("runtime failure promotes the highest verified replica and coalesces repeated triggers", async () => {
  const primary = node("primary", false, 10);
  const supabase = node("supabase", true, 10);
  let created = 0;
  let promoted;
  const manager = createRuntimePostgresFailover({
    nodes: [primary, supabase],
    createStore(cluster) {
      created += 1;
      assert.equal(cluster.nodes[0], supabase);
      return { async snapshot() { return { safe: true }; } };
    },
    storeOptions: {},
    onPromote(value) { promoted = value; }
  });
  const first = manager.schedule();
  const second = manager.schedule();
  assert.equal(first, second);
  await first;
  assert.equal(created, 1);
  assert.equal(promoted.node, supabase);
  assert.deepEqual(promoted.state, { safe: true });
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
