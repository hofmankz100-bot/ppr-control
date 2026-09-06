"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EQUIPMENT, nodeReminderItems, recommendedMaintenanceForDate, scheduledItemsForDate, generatePprSheet, validDate } = require("../server/ppr-autofill");

function browserPlanningFunctions() {
  const source = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
  const body = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
  // Evaluate the previous browser calculation in the plant's local timezone,
  // independent of the machine running this regression (CI runs in UTC).
  class PlantDate extends Date {
    constructor(value) { super(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value) ? `${value}+05:00` : value); }
    getDay() { return new Date(this.getTime() + 5 * 3600000).getUTCDay(); }
  }
  const context = vm.createContext({ Date: PlantDate });
  vm.runInContext([
    body("const DEFAULT_NODES =", "const STORE_KEY ="),
    body("function nodeReminderItems(", "function renderRequests()"),
    body("function isPprWorkday(", "function directorRecommendedMaintenance(eq"),
    body("function recommendedMaintenanceForDate(", "const ANNUAL_PPR_TYPES"),
    "const COMPRESSOR_JOURNAL_AREA = 'Компрессорная'; const GAS_JOURNAL_AREA = 'Газовое хозяйство';",
    "function addDaysISO(date, days) { const value = new Date(date); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0,10); }",
    "globalThis.planning = { EQUIPMENT, nodeReminderItems, recommendedMaintenanceForDate };"
  ].join("\n"), context);
  return context.planning;
}

test("server autofill preserves the equipment, instructions and plant-calendar rotation of the client", () => {
  const browser = browserPlanningFunctions();
  const plain = value => JSON.parse(JSON.stringify(value));
  assert.deepEqual(EQUIPMENT, plain(browser.EQUIPMENT));
  for (const equipment of EQUIPMENT) {
    for (const node of equipment.nodes) assert.deepEqual(nodeReminderItems(node, equipment.name), plain(browser.nodeReminderItems(node, equipment.name)));
    for (let day = 1; day <= 30; day += 1) {
      const date = `2026-09-${String(day).padStart(2, "0")}`;
      assert.deepEqual(recommendedMaintenanceForDate(equipment, date), plain(browser.recommendedMaintenanceForDate(equipment, date)), `${equipment.id}:${date}`);
    }
  }
});

test("generated plans use a system signer and retain manual work, marks and approvals", () => {
  const date = "2026-09-07";
  const now = "2026-09-06T09:00:00.000Z";
  const generated = generatePprSheet({ catalog: {}, date, now });
  assert.equal(generated.changed, true);
  assert.ok(generated.sheet.rows.some(row => row.work));
  assert.equal(generated.sheet.plannedByName, "Система");
  assert.equal(generated.sheet.plannedByRole, "system");
  assert.deepEqual(generatePprSheet({ catalog: {}, previous: generated.sheet, date, now }), { sheet: generated.sheet, changed: false });
  for (const previous of [{ rows: [{ id: "manual", work: "Keep manually planned work", mark: "done", markedByName: "Worker" }] }, { rows: [], approvedAt: now, approvedByName: "Engineer" }]) {
    assert.deepEqual(generatePprSheet({ catalog: {}, previous, date, now }), { sheet: previous, changed: false });
  }
  const reset = generatePprSheet({ catalog: {}, previous: { approvalRequestedAt: now, rows: [{ id: "manual", work: "Manual", mark: "done", resolutionComment: "Done" }] }, date, now, force: true });
  assert.equal(reset.changed, true);
  assert.ok(reset.sheet.rows.every(row => !row.mark && !row.resolutionComment));
  assert.equal(reset.sheet.approvalRequestedAt, "");
  const approved = { rows: [], approvedAt: now };
  assert.deepEqual(generatePprSheet({ catalog: {}, previous: approved, date, now, force: true }), { sheet: approved, changed: false });
  assert.equal(generatePprSheet({ catalog: {}, date: "2026-09-06", now }).changed, false);
});

test("autofill excludes deleted equipment and active equipment/node pauses", () => {
  const date = "2026-09-07";
  const selected = scheduledItemsForDate({}, date)[0];
  assert.ok(selected);
  assert.equal(scheduledItemsForDate({ equipment: { [selected.equipmentId]: { deleted: true } } }, date).some(item => item.equipmentId === selected.equipmentId), false);
  const pauses = { equipment: { [selected.equipmentId]: { operationalPauses: [{ startedAt: "2026-09-01" }] } } };
  assert.equal(scheduledItemsForDate(pauses, date).some(item => item.equipmentId === selected.equipmentId), false);
  assert.equal(validDate("2026-02-31"), false);
  assert.equal(validDate("invalid"), false);
  assert.equal(validDate(date), true);
});
