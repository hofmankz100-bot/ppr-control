const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("press 1540 and press 2400 downtimes are grouped and limited separately", () => {
  assert.match(appSource, /function downtimeGroupForEquipment\(eq\)/);
  assert.match(appSource, /\[1,\s*2\]\.includes\(Number\(eq\.id\)\)/);
  assert.match(appSource, /downtimeGroupLabel\(item\) === area/);
  assert.match(appSource, /Прессы 1540 и 2400 учитываются отдельно/);
});

test("press journal cards use distinct calm colors instead of the alert red", () => {
  assert.match(appSource, /const PRESS_EQUIPMENT_COLORS = Object\.freeze\(\{\s*1: "#2563eb",\s*2: "#7c3aed"/);
  assert.match(appSource, /const fixedPressColor = PRESS_EQUIPMENT_COLORS\[Number\(eq\?\.id\)\]/);
});
