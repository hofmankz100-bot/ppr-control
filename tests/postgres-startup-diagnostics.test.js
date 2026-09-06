"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("startup reports the primary connection failure without database credentials", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const start = source.indexOf("    if (!nodes[0].healthy) {");
  const end = source.indexOf("    postgresClusterStatus = pool.status();", start);
  const guard = source.slice(start, end);
  let closed = 0;
  const error = "connect ECONNREFUSED postgres://test-user:test-secret@db.invalid:5432/ppr password='second-secret' pwd=third-secret";
  const result = vm.runInNewContext(`(async () => { ${guard} })()`, {
    nodes: [{ healthy: false, error, pool: { async end() { closed += 1; } } }]
  });
  await assert.rejects(result, error => {
    assert.match(error.message, /automatic state failover is disabled: connect ECONNREFUSED/);
    assert.doesNotMatch(error.message, /test-user|test-secret|second-secret|third-secret/);
    return true;
  });
  assert.equal(closed, 1);
});
