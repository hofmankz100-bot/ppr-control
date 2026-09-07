"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { compareReplicaVersions, selectAuthoritativePostgresNode } = require("../server/postgres-leader");

function node(name, { healthy = true, revision = null, updatedAt = "2026-09-07T00:00:00Z", error = null } = {}) {
  return {
    name,
    healthy,
    pool: {
      async query() {
        if (error) throw error;
        return { rows: revision === null ? [] : [{ state_revision: String(revision), updated_at: updatedAt }] };
      }
    }
  };
}

test("keeps the configured primary when its verified revision is newest", async () => {
  const primary = node("primary", { revision: 7 });
  const mirror = node("supabase", { revision: 7 });
  const selected = await selectAuthoritativePostgresNode([primary, mirror]);
  assert.equal(selected.selected.name, "primary");
  assert.equal(selected.failedOver, false);
});

test("promotes the reachable replica with the highest verified revision", async () => {
  const primary = node("primary", { healthy: false });
  const stale = node("neon", { revision: 8, updatedAt: "2026-09-06T23:59:00Z" });
  const current = node("supabase", { revision: 9, updatedAt: "2026-09-07T00:00:00Z" });
  const selected = await selectAuthoritativePostgresNode([primary, stale, current]);
  assert.equal(selected.selected.name, "supabase");
  assert.deepEqual(selected.nodes.map(item => item.name), ["supabase", "primary", "neon"]);
  assert.equal(selected.revision, 9n);
});

test("a newer replica remains authoritative after the configured primary returns stale", async () => {
  const primary = node("primary", { revision: 11, updatedAt: "2026-09-06T23:59:00Z" });
  const mirror = node("supabase", { revision: 12, updatedAt: "2026-09-07T00:00:00Z" });
  const selected = await selectAuthoritativePostgresNode([primary, mirror]);
  assert.equal(selected.selected.name, "supabase");
});

test("same revision with different payloads fails closed", async () => {
  await assert.rejects(
    selectAuthoritativePostgresNode([
      node("primary", { revision: 14, updatedAt: "2026-09-07T00:00:00Z" }),
      node("supabase", { revision: 14, updatedAt: "2026-09-07T00:00:01Z" })
    ]),
    error => error.code === "PPR_STATE_REPLICA_CONFLICT"
  );
});

test("an empty healthy configured primary can initialize a new cluster", async () => {
  const primary = node("primary");
  const selected = await selectAuthoritativePostgresNode([primary, node("supabase", { healthy: false })]);
  assert.equal(selected.selected, primary);
});

test("failover can be explicitly disabled", async () => {
  await assert.rejects(
    selectAuthoritativePostgresNode([node("primary", { healthy: false }), node("supabase", { revision: 3 })], { allowFailover: false }),
    error => error.code === "PPR_PRIMARY_PROBE_UNAVAILABLE"
  );
});

test("replica repair copies only older state and blocks divergent or newer state", () => {
  const source = { state_revision: "20", updated_at: "2026-09-07 04:19:10.839+00" };
  assert.equal(compareReplicaVersions(source, null), "copy");
  assert.equal(compareReplicaVersions(source, { state_revision: "19", updated_at: "older" }), "copy");
  assert.equal(compareReplicaVersions(source, { ...source }), "current");
  assert.throws(() => compareReplicaVersions(source, { state_revision: "21", updated_at: "newer" }), /newer than authoritative/);
  assert.throws(() => compareReplicaVersions(source, { state_revision: "20", updated_at: "different" }), /disagree/);
});
