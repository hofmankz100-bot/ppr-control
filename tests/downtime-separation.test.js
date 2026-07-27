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
