"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("the home counter counts only the current day or night shift", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const start = app.indexOf("function equipmentDaySummary");
  const end = app.indexOf("\n}\n", start) + 3;
  const source = app.slice(start, end);
  assert.match(source, /const activeShift = currentWalkShift\(\)/);
  assert.match(source, /date === activeShift\.date \? \[activeShift\.key\] : walkShiftKeysDueForDate\(date\)/);
  assert.match(app, /summary\.complete \? "✓" : `\$\{summary\.done\}\/\$\{summary\.total\}`/);
});
