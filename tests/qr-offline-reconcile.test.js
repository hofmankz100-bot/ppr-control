"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("empty server status cannot erase an offline QR still queued on the phone", () => {
  const start = app.indexOf("function reconcileQrWalkStatusFromServer");
  const end = app.indexOf("function confirmQrScanFeedback", start);
  const source = app.slice(start, end);
  assert.match(source, /const pendingMarks = pendingQrWalkMarks\(\)/);
  assert.match(source, /serverChecks\[recordKey\] \|\| hasPendingMark\(nodeIndex\)/);
  assert.match(source, /mark\?\.equipmentId/);
  assert.match(source, /mark\?\.date/);
  assert.match(source, /mark\?\.shift/);
  assert.match(source, /mark\?\.group/);
});
