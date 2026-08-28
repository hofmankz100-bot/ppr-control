const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

test("warnings overlay stays viewport-fixed and scrolls its list on mobile", () => {
  assert.match(css, /\.request-archive-overlay\.open-remarks-overlay\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*z-index:\s*1600;/s);
  assert.match(css, /\.request-archive-overlay\.open-remarks-overlay\s*\{[^}]*safe-area-inset-top[^}]*safe-area-inset-bottom/s);
  assert.match(css, /\.open-remarks-dialog\s*\{[^}]*max-height:[^;}]*100dvh[^;}]*;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.open-remarks-list\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /body\.open-remarks-open\s*\{[^}]*overflow:\s*hidden;/s);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.open-remarks-dialog\s*\{[^}]*100dvh[^}]*safe-area-inset-top[^}]*safe-area-inset-bottom/s);
});

test("warnings dialog has an accessible, keyboard-operable close path", () => {
  assert.match(app, /aria-labelledby="openRemarksTitle"/);
  assert.match(app, /aria-label="Закрыть окно предупреждений"/);
  assert.match(app, /if \(event\.key === "Escape"\) close\(\)/);
  assert.match(app, /document\.body\.classList\.add\("open-remarks-open"\)/);
  assert.match(app, /document\.body\.classList\.remove\("open-remarks-open"\)/);
  assert.match(app, /closeButton\?\.focus\(\)/);
});
