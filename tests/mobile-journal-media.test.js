"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const repeatStyles = fs.readFileSync(path.join(root, "modules/repeat-failures.css"), "utf8");

test("repeat failure journal keeps mobile actions visible and scrolls only its table", () => {
  assert.match(repeatStyles, /\.repeat-failure-journal-modal\{[^}]*overflow:hidden[^}]*overscroll-behavior:contain/);
  assert.match(repeatStyles, /\.repeat-failure-journal-modal>section\{[^}]*box-sizing:border-box[^}]*max-width:100%[^}]*overflow-x:hidden[^}]*overflow-y:auto/);
  assert.match(repeatStyles, /@media\(max-width:680px\)[\s\S]*?\.repeat-failure-journal-modal\{[^}]*safe-area-inset-top[^}]*safe-area-inset-bottom/);
  assert.match(repeatStyles, /\.repeat-failure-journal-actions button\{[^}]*flex:1 1 130px[^}]*min-height:48px/);
  assert.match(repeatStyles, /\.repeat-journal-table-wrap\{[^}]*overflow-x:auto/);
  assert.match(repeatStyles, /@supports \(-webkit-touch-callout:none\)[\s\S]*?padding-top:max\(56px,env\(safe-area-inset-top\)\)/);
});

test("remark photos cannot widen the resolution panel on phones", () => {
  assert.match(styles, /\.remark-card\s*\{[^}]*max-width:\s*100%[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.remark-card-photo\s*\{[^}]*width:\s*min\(100%,\s*520px\)[^}]*height:\s*clamp\(170px,\s*32vw,\s*260px\)[^}]*object-fit:\s*cover[^}]*border-radius:\s*12px/s);
  assert.match(styles, /\.remark-card \.comment-resolution-detail img,[\s\S]*?\.remark-card \.photo-preview img\s*\{[^}]*max-width:\s*100%[^}]*max-height:\s*280px[^}]*object-fit:\s*contain/s);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.remark-card-photo\s*\{[^}]*width:\s*100%[^}]*height:\s*clamp\(160px,\s*48vw,\s*210px\)/s);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.remark-card \.comment-resolution-detail img,[\s\S]*?max-height:\s*220px[^}]*object-fit:\s*contain/s);
  assert.match(styles, /\.resolution-participating\s*\{[^}]*width:\s*100%[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere/s);
});
