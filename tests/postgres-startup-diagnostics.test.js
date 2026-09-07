"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { selectAuthoritativePostgresNode } = require("../server/postgres-leader");

test("startup reports the primary connection failure without database credentials", async () => {
  const error = "connect ECONNREFUSED postgres://test-user:test-secret@db.invalid:5432/ppr password='second-secret' pwd=third-secret";
  const primary = { name: "primary", healthy: false, error, pool: {} };
  await assert.rejects(selectAuthoritativePostgresNode([primary]), failure => {
    assert.equal(failure.code, "PPR_PRIMARY_PROBE_UNAVAILABLE");
    assert.match(failure.message, /no current replica can be verified/);
    assert.doesNotMatch(failure.message, /test-user|test-secret|second-secret|third-secret/);
    return true;
  });
});
