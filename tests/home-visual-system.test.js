"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

test("home actions share design tokens and calm alert states", () => {
  assert.match(styles, /--ui-brand: #123b53/);
  assert.match(styles, /--ui-radius: 14px/);
  assert.match(styles, /\.quick-nav button\.request-alert,[\s\S]*?animation: none !important/);
  assert.match(styles, /background: linear-gradient\(180deg, #fff, var\(--ui-danger-soft\)\)/);
});

test("home actions expose consistent keyboard focus and reduced motion", () => {
  assert.match(styles, /\.quick-nav button:focus-visible/);
  assert.match(styles, /outline: 3px solid rgba\(8, 121, 135, \.22\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("wide maintenance monitors use the available workspace", () => {
  assert.match(styles, /@media screen and \(min-width: 1280px\)/);
  assert.match(styles, /width: min\(1480px, 100%\)/);
  assert.match(styles, /#equipmentScreen > \.quick-nav \{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
});
