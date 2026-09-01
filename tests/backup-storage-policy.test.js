"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("technical state snapshots keep one week while full admin backups retain long history", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(source, /ppr_state_backups WHERE backup_date < current_date - interval '7 days'/);
  assert.match(source, /if \(ageDays <= 14\) continue/);
  assert.match(source, /if \(ageDays > 366\)/);
});
