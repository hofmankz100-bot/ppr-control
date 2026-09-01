"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

test("legacy administrator and daily backups migrate from JSONB to gzip", () => {
  assert.match(source, /async function compressLegacyBackupTables\(queryable\)/);
  assert.match(source, /for \(const table of \["ppr_admin_backups", "ppr_state_backups"\]\)/);
  assert.match(source, /SET payload_gzip=\$1, payload=NULL/);
  assert.match(source, /await compressLegacyBackupTables\(pool\)/);
  assert.match(source, /await compressLegacyBackupTables\(target\.pool\)/);
});

test("new daily recovery snapshots are stored compressed", () => {
  assert.match(source, /INSERT INTO ppr_state_backups\(backup_date, payload, payload_gzip\)/);
  assert.match(source, /\[compressBackupPayload\(latest\)\]/);
});
