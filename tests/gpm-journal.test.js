const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

test("GPM journal has assignments, inspections, PTO workflow and responsible approval", () => {
  assert.match(app, /function gpmEquipmentForm\(item = \{\}\)/);
  assert.match(app, /Ответственный за эксплуатацию/);
  assert.match(app, /Ответственный за исправное состояние/);
  assert.match(app, /function gpmInspectionForm\(item\)/);
  assert.match(app, /function gpmEventForm\(item\)/);
  assert.match(app, /data-gpm-approve/);
});

test("mechanical engineer can configure GPM cards without receiving automatic approval rights", () => {
  assert.match(app, /function gpmCanManage\(\) \{\s*return gpmIsAdmin\(\) \|\| profile\?\.role === "mechanicalEngineer"/);
  assert.match(app, /ui\.gpmAddButton\.hidden = !gpmCanManage\(\)/);
  assert.match(app, /function gpmIsResponsible\(item\)/);
});

test("GPM deadlines enter the common PPR reminders and open the separate journal", () => {
  assert.match(app, /gpmDueEntries\(\)\.forEach/);
  assert.match(app, /data-open-gpm-reminder/);
  assert.match(app, /show\("gpm"\)/);
});

test("GPM journal prints in landscape and supports image or PDF documents", () => {
  assert.match(styles, /body\.printing-gpm-journal/);
  assert.match(styles, /@page \{ size:A4 landscape/);
  assert.match(app, /accept="image\/\*,application\/pdf"/);
  assert.match(server, /application\\\/pdf/);
  assert.match(server, /jpg\|jpeg\|png\|webp\|pdf/);
});
