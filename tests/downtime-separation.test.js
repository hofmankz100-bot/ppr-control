const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

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

test("active downtimes are visible as actionable cards above the monthly chart", () => {
  assert.match(appSource, /id="downtimeActiveList"/);
  assert.match(appSource, /class="downtime-active-summary-card"/);
  assert.match(appSource, /Завершить простой \/ Пуск/);
  assert.match(appSource, /data-finish-active-downtime/);
  assert.match(appSource, /function closeDowntimeWithConfirmation\(liveStop, button\)/);
  assert.match(appSource, /function askDowntimeCloseDetails\(liveStop\)/);
  assert.match(appSource, /data-downtime-close-comment/);
  assert.match(appSource, /data-downtime-close-started/);
  assert.match(appSource, /Сначала отметьтесь через QR в разделе «Кто на работе»/);
  assert.match(appSource, /data-open-active-downtime/);
  assert.match(stylesSource, /\.downtime-active-summary-card/);
  assert.match(stylesSource, /\.downtime-close-dialog/);
});
