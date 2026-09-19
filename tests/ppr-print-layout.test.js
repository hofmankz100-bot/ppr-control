"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("PPR print isolates one sheet and restores it after printing", () => {
  const start = app.indexOf("function printPprMaintenanceSheet(date)");
  const end = app.indexOf("\nfunction ", start + 1);
  const source = app.slice(start, end);
  assert.match(source, /originalParent\.insertBefore\(placeholder, sheet\)/);
  assert.match(source, /document\.body\.append\(sheet\)/);
  assert.match(source, /placeholder\.parentNode\.insertBefore\(sheet, placeholder\)/);
  assert.match(source, /if \(cleaned\) return/);
});

test("PPR sheet prints as one landscape four-column document", () => {
  assert.match(styles, /@page\s*\{\s*size:\s*A4 landscape;\s*margin:\s*8mm/);
  assert.match(styles, /body\.printing-ppr-sheet > :not\(\.ppr-print-target\)\s*\{\s*display:\s*none !important/);
  assert.match(styles, /\.ppr-sheet-number\s*\{\s*width:\s*6% !important/);
  assert.match(styles, /\.ppr-sheet-resolution\s*\{\s*width:\s*43% !important/);
  assert.match(styles, /\.ppr-sheet-mark\s*\{\s*width:\s*12% !important/);
  assert.match(styles, /\.ppr-sheet-table tr\s*\{[^}]*break-inside:\s*avoid[^}]*page-break-inside:\s*avoid/);
});
