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
    body("function recommendedMaintenanceForDate(", "function annualPprYearRecord("),
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
    const result = generatePprSheet({ catalog: {}, previous, date, now });
    assert.deepEqual(result.sheet.rows, previous.rows);
    if (previous.approvedAt) assert.deepEqual(result, { sheet: previous, changed: false });
    else assert.deepEqual(result, { sheet: { ...previous, approvalRequestedAt: now }, changed: true });
  }
  const reset = generatePprSheet({ catalog: {}, previous: { approvalRequestedAt: now, rows: [{ id: "manual", work: "Manual", mark: "done", resolutionComment: "Done" }] }, date, now, force: true });
  assert.equal(reset.changed, false);
  assert.equal(reset.sheet.rows[0].mark, "done");
  assert.equal(reset.sheet.rows[0].resolutionComment, "Done");
  assert.equal(reset.sheet.approvalRequestedAt, now);
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

test("browser calendar and server generation use the same balanced weekday schedule", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
  const code = source.slice(source.indexOf("function rawPprItemsForDate("), source.indexOf("const PPR_SHEET_DEFAULT_ROWS"));
  const context = vm.createContext({
    recommendedMaintenanceForDate,
    operationalControlEnabled: () => true,
    addDaysISO: (date, days) => new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 86400000).toISOString().slice(0, 10)
  });
  vm.runInContext(`${code}\nglobalThis.balanced = balancedPprItemsForDate;`, context);
  const plain = value => JSON.parse(JSON.stringify(value));
  for (let day = 1; day <= 30; day += 1) {
    const date = `2026-09-${String(day).padStart(2, "0")}`;
    assert.deepEqual(plain(context.balanced(EQUIPMENT.filter(item => item.area !== "Резерв"), date)), scheduledItemsForDate({}, date), date);
  }
});

test("press 2400 uses the confirmed twelve production nodes", () => {
  assert.deepEqual(EQUIPMENT.find(item => item.id === 1).nodes, [
    "Пресс гидравлический станция и цилиндры", "Печь загатовка и Робот", "Пульт управление кнопки (пила,пресс,печь заг)",
    "Печь матрица ,Толкатель матрицы, Кран-балка матрицы", "Стол охлаждение вентиляторы(бикса,стол ролик,стол пуллер)",
    "Лента стол 1-2-3-4 (цилиндр,вал,цеп,клапн воздух)", "Горячий пила и Пуллер A.B", "Термичка 1", "Термичка 2",
    "Финишный пила (экран управление,лапа,размер проф)", "печь матрицы электрическая таль №10", "кран балка №7 2 тонны термичка загрузка"
  ]);
});

test("every equipment covers its full node catalog while work is balanced across the whole year", () => {
  const seenByEquipment = new Map(EQUIPMENT.filter(item => item.area !== "Резерв").map(item => [item.id, new Set()]));
  for (let day = 0; day < 140; day += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
    scheduledItemsForDate({}, date).forEach(item => seenByEquipment.get(item.equipmentId)?.add(item.node));
  }
  for (const target of EQUIPMENT.filter(item => item.area !== "Резерв")) {
    assert.deepEqual([...seenByEquipment.get(target.id)].sort(), [...target.nodes].sort(), target.name);
  }
  const yearlyWeekdayTotals = [0, 0, 0, 0, 0];
  for (let week = 0; week < 52; week += 1) {
    const monday = new Date(Date.UTC(2026, 0, 5 + week * 7)).toISOString().slice(0, 10);
    const counts = Array.from({ length: 5 }, (_, index) => scheduledItemsForDate({}, new Date(Date.UTC(2026, 0, 5 + week * 7 + index)).toISOString().slice(0, 10)).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${monday}: ${counts.join("/")}`);
    counts.forEach((count, index) => { yearlyWeekdayTotals[index] += count; });
  }
  assert.ok(Math.max(...yearlyWeekdayTotals) - Math.min(...yearlyWeekdayTotals) <= 1, yearlyWeekdayTotals.join("/"));
});

test("future catalog nodes and newly created equipment automatically enter PPR planning", () => {
  const builtIn = EQUIPMENT.find(item => item.id === 1);
  const addedNode = "Новый узел после запуска";
  const created = {
    id: 1001,
    created: true,
    name: "Новое оборудование",
    area: "Новый участок",
    nodes: ["Новый узел 1", "Новый узел 2", "Новый узел 3"]
  };
  const catalog = { equipment: {
    [builtIn.id]: { nodes: [...builtIn.nodes, addedNode] },
    [created.id]: created
  } };
  const seenBuiltIn = new Set();
  const seenCreated = new Set();
  for (let day = 0; day < 70; day += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
    scheduledItemsForDate(catalog, date).forEach(item => {
      if (item.equipmentId === builtIn.id) seenBuiltIn.add(item.node);
      if (item.equipmentId === created.id) seenCreated.add(item.node);
    });
  }
  assert.ok(seenBuiltIn.has(addedNode));
  assert.deepEqual([...seenCreated].sort(), [...created.nodes].sort());
});

test("untouched automatic sheets refresh after catalog nodes change and keep checklist rows", () => {
  const date = "2026-09-07";
  const now = "2026-09-06T09:00:00.000Z";
  const first = generatePprSheet({ catalog: {}, date, now }).sheet;
  const target = first.autofilledFor[0];
  const builtIn = EQUIPMENT.find(item => item.id === target.equipmentId);
  const addedNode = "Новый узел с типовым чек-листом";
  const catalog = { equipment: { [builtIn.id]: { nodes: [...builtIn.nodes, addedNode] } } };
  let refreshed = null;
  for (let day = 0; day < 70 && !refreshed; day += 1) {
    const candidate = new Date(Date.UTC(2026, 8, 7 + day)).toISOString().slice(0, 10);
    const scheduled = scheduledItemsForDate(catalog, candidate);
    if (!scheduled.some(item => item.node === addedNode)) continue;
    const old = generatePprSheet({ catalog: {}, date: candidate, now }).sheet;
    refreshed = generatePprSheet({ catalog, previous: old, date: candidate, now });
  }
  assert.ok(refreshed?.changed);
  assert.ok(refreshed.sheet.autofilledFor.some(item => item.node === addedNode));
  assert.ok(refreshed.sheet.rows.some(row => row.node === addedNode && row.work));
  const started = structuredClone(refreshed.sheet);
  started.rows.find(row => row.work).mark = "done";
  const startedRefresh = generatePprSheet({ catalog: {}, previous: started, date: started.date, now });
  assert.equal(startedRefresh.changed, true);
  assert.equal(startedRefresh.sheet.rows.find(row => row.mark === "done").id, started.rows.find(row => row.mark === "done").id);
});

test("started automatic sheets append missing scheduled nodes without changing saved results", () => {
  const date = "2026-09-08";
  const full = generatePprSheet({ catalog: {}, date, now: "2026-09-07T09:00:00.000Z" }).sheet;
  assert.ok(full.autofilledFor.length > 2);
  const previous = structuredClone(full);
  previous.autofilledFor = full.autofilledFor.slice(0, 2);
  const kept = new Set(previous.autofilledFor.map(item => JSON.stringify([String(item.equipmentId), item.node])));
  previous.rows = previous.rows.filter(row => !row.work || kept.has(JSON.stringify([String(row.equipmentId), row.node])));
  const completed = previous.rows.find(row => row.work);
  Object.assign(completed, { mark: "done", resolutionComment: "Проверено", markedByName: "Механик" });
  const before = structuredClone(completed);

  const refreshed = generatePprSheet({ catalog: {}, previous, date, now: "2026-09-19T10:00:00.000Z" });

  assert.equal(refreshed.changed, true);
  assert.deepEqual(refreshed.sheet.rows.find(row => row.id === before.id), before);
  full.autofilledFor.forEach(target => assert.ok(refreshed.sheet.rows.some(row => row.work && row.equipmentId === target.equipmentId && row.node === target.node), target.node));
});

test("browser requests refresh when an automatic sheet target list is stale", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
  assert.match(source, /function pprSheetAutofillStale\(date, sheet = pprSheetRecord\(date\)\)/);
  assert.match(source, /const catalogChanged = pprSheetAutofillStale\(date, sheet\)/);
  assert.match(source, /!catalogChanged && \(sheet\.autofillInitialized \|\| sheet\.rows\.some/);
  assert.match(source, /data-open-ppr-node-sheet/);
  assert.match(source, /pprSheetSelectedTargets\.set/);
  assert.match(source, /allRowGroups\.filter\(group => pprSheetTargetKey\(group\) === selectedTargetKey\)/);
  assert.doesNotMatch(source, /draft \|\| !selectedTargetKey \? allRowGroups/);
  assert.match(source, /const autofillNeeded = scheduledItems\.length > 0 && \(!completion\.active \|\| pprSheetAutofillStale\(date, sheet\)\)/);
});

test("new PPR editor rows belong to the currently selected node", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../modules/ppr-plan-editor.js"), "utf8");
  assert.match(source, /\[data-open-ppr-node-sheet\]\.active/);
  assert.match(source, /draft\.targets\.find\(target => keyFor\(target\) === selectedKey\)/);
});
