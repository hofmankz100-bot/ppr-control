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

test("narrow phones keep a readable product header", () => {
  assert.match(styles, /@media screen and \(max-width: 430px\)/);
  assert.match(styles, /\.topbar-brand-logo \{[\s\S]*?display: none/);
  assert.match(styles, /\.topbar-actions \{[\s\S]*?max-width: 146px/);
  assert.match(styles, /\.app-title \{[\s\S]*?font-size: 15px/);
});

test("phone equipment cards use calm surfaces with area accents", () => {
  assert.match(styles, /Phone equipment rows: keep the area color as an accent/);
  assert.match(styles, /border-left: 6px solid var\(--downtime-area-color, var\(--ui-brand\)\)/);
  assert.match(styles, /\.equipment-journal-button > strong \{[\s\S]*?font-size: 17px/);
  assert.match(styles, /\.equipment-journal-button > small \{[\s\S]*?border-radius: 999px/);
});

test("phone equipment actions keep readable contrast", () => {
  assert.match(styles, /\.equipment-installed-parts-button \{[\s\S]*?color: #27475b !important/);
  assert.match(styles, /\.equipment-installed-parts-button span,[\s\S]*?color: #27475b !important/);
  assert.match(styles, /\.equipment-qr-print-button \{[\s\S]*?background: #0f766e !important/);
  assert.match(styles, /\.equipment-qr-print-button small \{[\s\S]*?color: rgba\(255, 255, 255, \.88\) !important/);
});
