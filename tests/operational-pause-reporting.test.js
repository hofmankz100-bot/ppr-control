const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("operational pause is the shared switch for PPR, reports and factory counters", () => {
  assert.match(source, /function operationalControlEnabled[\s\S]*?!activeOperationalPause/);
  assert.match(source, /function operationalItemEnabled/);
  assert.match(source, /function annualPprRows[\s\S]*?operationalControlEnabled/);
  assert.match(source, /function pprCalendarMonthData[\s\S]*?operationalControlEnabled/);
  assert.match(source, /function directorTodayWalk[\s\S]*?operationalControlEnabled/);
  assert.match(source, /function annualRepairEvents[\s\S]*?operationalControlEnabled/);
  assert.match(source, /function engineerMonthlyStats[\s\S]*?operationalItemEnabled/);
});

test("QR plans count only nodes and linked GPM equipment active on the calculation date", () => {
  assert.match(source, /activeNodeIndexes[\s\S]*?operationalControlEnabled\(eq, nodeIndex, date\)[\s\S]*?qrPlan \+= activeNodeIndexes\.length/);
  assert.match(source, /function gpmOperationalControlEnabled/);
  assert.match(source, /craneEquipment\.filter\(item => gpmOperationalControlEnabled\(item, date\)\)/);
  assert.match(source, /forkliftEquipment\.filter\(item => gpmOperationalControlEnabled\(item, date\)\)/);
});

test("resume is automatic because all exclusions use dated pause history", () => {
  assert.match(source, /return targetDate >= startDate && \(!endDate \|\| targetDate <= endDate\)/);
  assert.match(source, /active\.endedAt = now/);
  assert.match(source, /return !activeOperationalPause/);
});

test("the removed request workflow leaves only the remark confirmation screen", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /<h1>Подтверждения<\/h1>/);
  assert.doesNotMatch(source, /Заявки — только документы/);
  assert.doesNotMatch(source, /Заявки не требуют подтверждения/);
  assert.match(source, /ui\.subtitle\.textContent = "Подтверждения"/);
});

test("background synchronization preserves the open journal scroll position", () => {
  assert.match(source, /function restoreBackgroundScroll\(view, scrollX, scrollY\)/);
  assert.match(source, /const scrollYBeforeRender = window\.scrollY;[\s\S]*?render\(\);[\s\S]*?restoreBackgroundScroll/);
  assert.match(source, /requestAnimationFrame\([\s\S]*?requestAnimationFrame\(restore\)/);
});
