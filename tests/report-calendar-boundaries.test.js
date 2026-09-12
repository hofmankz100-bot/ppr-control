"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const calendarSource = fs.readFileSync(path.join(root, "modules/director.js"), "utf8");

function sourceFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  return app.slice(start, app.indexOf("\nfunction ", start + 1));
}

function harness(names = [], overrides = {}) {
  const window = {};
  const context = vm.createContext({ window, Date, Intl, isElectromechanicRole: () => false, ...overrides });
  vm.runInContext(calendarSource, context);
  context.PPRModules = window.PPRModules;
  context.PPRModules.comments = { dedupeAggregateJournalItems: items => items };
  context.PPRModules.repeatFailures = { metadata: () => ({}), employeeRepeatCounts: () => new Map() };
  vm.runInContext(names.map(sourceFunction).join("\n"), context);
  return context;
}

test("factory month keys preserve the first and last five local hours at month/year boundaries", () => {
  const h = harness(["weldingMonthKey", "journalMonthMatches"]);
  for (const [previous, first, last, month] of [
    ["2026-08-31", "2026-09-01", "2026-09-30", "2026-09"],
    ["2026-12-31", "2027-01-01", "2027-01-31", "2027-01"]
  ]) {
    for (let hour = 0; hour < 5; hour++) {
      const utc = `${previous}T${19 + hour}:00:00.000Z`;
      assert.equal(h.weldingMonthKey(utc), month);
      assert.equal(h.journalMonthMatches(utc, month), true);
      assert.equal(h.PPRModules.director.calendarDate(utc), first);
      assert.equal(h.weldingMonthKey(`${last}T${19 + hour}:59:59+05:00`), month);
    }
    assert.equal(h.journalMonthMatches(`${previous}T18:59:59.999Z`, month), false);
  }
  assert.equal(h.weldingMonthKey("2026-09-01T01:00:00+05:00"), "2026-09");
  for (const legacy of ["2026-09-01 01:00:00+0500", "2026-09-01 01:00:00.123456+05", "2026-08-31 20:00:00+00", "2026-09-01 01:00:00"]) {
    assert.equal(h.weldingMonthKey(legacy), "2026-09", legacy);
  }
  assert.equal(h.weldingMonthKey(new Date("2026-08-31T20:00:00Z")), "2026-09");
});

test("calendar keys never shift; empty and malformed dates never become current-month records", () => {
  const h = harness(["weldingMonthKey", "journalMonthMatches"]);
  for (const value of ["2026-09-01", "2026-09-01T00:00:00", "2026-09-30T23:59:59"]) {
    assert.equal(h.weldingMonthKey(value), "2026-09");
  }
  assert.equal(h.weldingMonthKey("2024-02-29"), "2024-02");
  for (const value of ["", " ", null, "2026-02-29", "2026-09-31", "2026-13-01", "2026-00-01",
    "2026-09", "2026-09-00", "2026-09-01T24:00:00Z", "2026-09-01T12:60:00Z", "bad", new Date(NaN)]) {
    assert.equal(h.weldingMonthKey(value), "", String(value));
    assert.equal(h.journalMonthMatches(value, "2026-09"), false);
    assert.equal(h.journalMonthMatches(value, ""), false);
  }
});

test("calendar results are independent of the device timezone", () => {
  const script = `const fs=require('node:fs'),vm=require('node:vm');global.window={};vm.runInThisContext(fs.readFileSync('modules/director.js','utf8'));const d=window.PPRModules.director;console.log(JSON.stringify({months:['2026-08-31T20:00:00Z','2026-09-01','2026-12-31T23:59:59Z'].map(x=>d.calendarMonth(x)),start:d.calendarMonthRange(2026,8).start.toISOString(),wall:new Date(d.calendarTimeMs('2026-09-01T01:00:00')).toISOString()}));`;
  for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
    const result = execFileSync(process.execPath, ["-e", script], { cwd: root, env: { ...process.env, TZ: timezone }, encoding: "utf8" });
    assert.deepEqual(JSON.parse(result), { months: ["2026-09", "2026-09", "2027-01"], start: "2026-08-31T19:00:00.000Z", wall: "2026-08-31T20:00:00.000Z" }, timezone);
  }
});

test("annual and downtime graph helpers split the same factory month, including unzoned legacy timestamps", () => {
  const h = harness(["dateYearMonth", "monthRange", "downtimeOverlapMs", "downtimeOverlapMsForMonth"]);
  const item = { startedAt: "2026-08-31T18:00:00Z", endedAt: "2026-08-31T20:00:00Z" };
  assert.equal(JSON.stringify(h.dateYearMonth(item.endedAt)), '{"year":2026,"month":8}');
  assert.equal(JSON.stringify(h.dateYearMonth("2026-09-01")), '{"year":2026,"month":8}');
  assert.equal(h.dateYearMonth("invalid"), null);
  for (const month of [7, 8]) {
    assert.equal(h.downtimeOverlapMs(item, 2026, month), 3600000);
    assert.equal(h.downtimeOverlapMsForMonth(item, 2026, month), 3600000);
  }
  const year = h.monthRange(2026, 11);
  assert.equal(year.start.toISOString(), "2026-11-30T19:00:00.000Z");
  assert.equal(year.end.toISOString(), "2026-12-31T19:00:00.000Z");
  assert.equal(h.monthRange(2017, 0).start.toISOString(), "2016-12-31T18:00:00.000Z", "historical timezone rules are not replaced by a hardcoded offset");
  assert.equal(h.downtimeOverlapMs({ startedAt: "2026-08-31T23:00:00", endedAt: "2026-09-01T01:00:00" }, 2026, 8), 3600000);
  assert.equal(h.downtimeOverlapMs({ startedAt: "2026-09-01", endedAt: "2026-09-02" }, 2026, 8), 86400000);
  assert.equal(h.PPRModules.director.calendarTimeMs("2026-09-01T01:00:00.123"), Date.parse("2026-08-31T20:00:00.123Z"));
  for (const invalid of ["", "2026-02-29", "invalid"]) assert.equal(h.downtimeOverlapMs({ startedAt: invalid }, 2026, 8), 0);
});

test("default journal month and director year follow the factory calendar on a UTC device", () => {
  class FactoryNow extends Date { constructor(...args) { super(...(args.length ? args : ["2026-12-31T20:00:00Z"])); } }
  const h = harness(["selectedJournalMonth", "directorAnnualYear", "dateYearMonth"], { Date: FactoryNow, current: { journalMonth: "" } });
  assert.equal(h.selectedJournalMonth(), "2027-01");
  assert.equal(h.directorAnnualYear(), 2027);
});

test("historical Qyzylorda transitions resolve legacy wall times without a single-pass offset error", () => {
  const calendar = harness().PPRModules.director;
  for (const [wall, utc] of [
    ["2018-12-20T22:30:00", "2018-12-20T16:30:00.000Z"],
    ["2018-12-20T23:30:00", "2018-12-20T17:30:00.000Z"],
    ["2018-12-21T00:30:00", "2018-12-20T19:30:00.000Z"],
    ["2004-03-28T01:30:00", "2004-03-27T20:30:00.000Z"],
    ["2004-03-28T02:30:00", "2004-03-27T21:30:00.000Z"],
    ["2004-03-28T03:30:00", "2004-03-27T21:30:00.000Z"]
  ]) assert.equal(new Date(calendar.calendarTimeMs(wall)).toISOString(), utc, wall);
  const march = calendar.calendarMonthRange(2004, 2);
  assert.equal(march.start.toISOString(), "2004-02-29T19:00:00.000Z");
  assert.equal(march.end.toISOString(), "2004-03-31T18:00:00.000Z");
  march.start.setTime(0);
  assert.equal(calendar.calendarMonthRange(2004, 2).start.toISOString(), "2004-02-29T19:00:00.000Z", "callers cannot mutate cached boundaries");
});

test("installed parts preserve equipment/status filters, print rows, source timestamps and photos", () => {
  const entry = { id: "boundary", resolved: true, partInstalled: true, resolvedAt: "2026-08-31T20:00:00Z", text: "Boundary part", partPhotos: ["saved-photo"] };
  const state = { checks: { "1:0:2026-08-31": { to: { commentLog: [entry, { ...entry, id: "unresolved", resolved: false }, { ...entry, id: "not-part", partInstalled: false }] } },
    "2:0:2026-09-01": { to: { commentLog: [{ ...entry, id: "other" }] } } } };
  const before = structuredClone(state), equipment = { id: 1, name: "Press", area: "A", nodes: ["Node"] };
  const h = harness(["journalMonthMatches", "installedPartJournalRows", "installedPartJournalHtml"], {
    state, equipmentById: () => equipment, visibleCommentEntries: item => item.commentLog || [],
    resolutionParticipantsText: () => "Worker", escapeHtml: value => String(value || ""),
    dateTimeHuman: value => value, canonicalUserTextHtml: value => value, journalMonthLabel: value => value
  });
  assert.deepEqual(Array.from(h.installedPartJournalRows(1, "2026-09"), row => row.id), ["boundary"]);
  assert.equal(h.installedPartJournalRows(1, "2026-08").length, 0);
  const print = h.installedPartJournalHtml(equipment, "2026-09", true);
  assert.match(print, /Boundary part/); assert.match(print, /saved-photo/); assert.doesNotMatch(print, /data-parts-month/);
  assert.deepEqual(state, before);
});

test("aggregate downtime journal keeps month, area, equipment and production exclusion filters", () => {
  const item = { id: "boundary", startedAt: "2026-08-31T20:00:00Z", area: "A", equipmentId: 1, type: "breakdown" };
  const items = [item, { ...item, id: "wrong-area", area: "B" }, { ...item, id: "wrong-equipment", equipmentId: 2 },
    { ...item, id: "production", type: "production" }, { ...item, id: "previous", startedAt: "2026-08-31T18:59:59Z" }];
  const before = structuredClone(items);
  const h = harness(["journalMonthMatches", "aggregateJournalItems"], {
    state: { checks: {} }, selectedJournalMonth: () => "2026-09", downtimes: () => items, downtimeDurationMs: () => 0
  });
  assert.deepEqual(Array.from(h.aggregateJournalItems("A", 1), row => row.id), ["boundary"]);
  assert.deepEqual(items, before);
});

test("actual welding/turning screen totals and printed accepted rows use the same factory month", () => {
  let printed = "";
  const records = [{ id: "boundary", status: "completed", completedAt: "2026-08-31T20:00:00Z", createdAt: "2026-08-20T00:00:00Z", description: "BOUNDARY" },
    { id: "previous", status: "completed", completedAt: "2026-08-31T18:59:59Z", createdAt: "2026-08-20T00:00:00Z", description: "PREVIOUS" },
    { id: "unaccepted", status: "awaitingAcceptance", completedAt: "2026-08-31T20:00:00Z", description: "UNACCEPTED" }];
  const h = harness(["weldingMonthKey", "weldingRecords", "turningRecords", "renderWeldingJournal", "renderTurningJournal", "printWeldingJournal", "printTurningJournal"], {
    state: { weldingJournal: Object.fromEntries(records.map(row => [row.id, row])), turningJournal: Object.fromEntries(records.map(row => [row.id, row])) },
    current: { productionTab: "welding", weldingMonth: "2026-09", turningMonth: "2026-09" },
    ui: { subtitle: {}, weldingPanel: { querySelector: () => null, querySelectorAll: () => [] } },
    updateWeldingBadge() {}, isTurnerUser: () => false, isWelderUser: () => false, productionTabs: () => "",
    weldingRecordCard: () => "", turningCard: () => "", bindProductionTabs() {}, escapeHtml: value => String(value || ""),
    dateTimeHuman: value => value || "", weldingTypeLabel: () => "Type", weldingPositionLabel: () => "Position",
    productionParticipants: () => [], productionParticipantNames: () => "Worker", finalizeJournalPopup() {}
  });
  h.window.open = () => ({ document: { write: html => { printed = html; } } });
  for (const [render, print] of [["renderWeldingJournal", "printWeldingJournal"], ["renderTurningJournal", "printTurningJournal"]]) {
    h[render](); assert.match(h.ui.weldingPanel.innerHTML, /Принято за месяц: <b>1<\/b>/);
    h[print]("2026-09"); assert.match(printed, /BOUNDARY/); assert.doesNotMatch(printed, /PREVIOUS|UNACCEPTED/);
  }
});

test("historical annual downtime does not disappear when equipment or its node is paused today", () => {
  const equipment = { id: 1, name: "Press", area: "A", nodes: ["Node"] };
  const item = { equipmentId: 1, nodeIndex: 0, type: "breakdown", startedAt: "2026-08-05T10:00:00Z", endedAt: "2026-08-05T11:00:00Z" };
  const h = harness(["operationalPauseApplies", "activeOperationalPause", "operationalControlEnabled", "operationalItemEnabled",
    "directorAnnualEmptyMonths", "dateYearMonth", "monthRange", "downtimeOverlapMs", "downtimeOverlapMsForMonth", "directorAnnualStats"], {
    todayISO: () => "2026-09-08", equipmentById: () => equipment, allEquipment: () => [equipment], downtimes: () => [item],
    directorMonthName: index => String(index), annualRepairEvents: () => [], walkShiftKeysDueForDate: () => [], loadUsers: () => []
  });
  const baseline = h.directorAnnualStats(2026).months[7];
  assert.equal(baseline.stops, 1); assert.equal(baseline.downtimeMs, 3600000);
  equipment.operationalPauses = [{ startedAt: "2026-09-08T00:00:00Z" }];
  assert.equal(h.operationalItemEnabled(item, "2026-09-08"), false);
  assert.deepEqual(h.directorAnnualStats(2026).months[7], baseline);
  equipment.operationalPauses = [];
  equipment.nodeOperationalPauses = { 0: [{ startedAt: "2026-09-08T00:00:00Z" }] };
  assert.deepEqual(h.directorAnnualStats(2026).months[7], baseline);
  equipment.nodeOperationalPauses = { 0: [{ startedAt: "2026-08-01T00:00:00Z", endedAt: "2026-08-10T00:00:00Z" }] };
  assert.equal(h.directorAnnualStats(2026).months[7].stops, 0, "the existing event-date pause exclusion remains intact");
});

test("installed-parts modal opens/reopens on factory month and switches/clears its period without changing records", () => {
  class FactoryNow extends Date { constructor(...args) { super(...(args.length ? args : ["2026-08-31T20:00:00Z"])); } }
  const overlays = [];
  const control = () => ({ addEventListener(type, fn) { this[type] = fn; } });
  const document = { body: { append: element => overlays.push(element) }, createElement() {
    const controls = { "[data-close-parts]": control(), "[data-parts-month]": control(), "[data-print-parts]": control() };
    return { controls, querySelector: selector => controls[selector], remove() { this.removed = true; } };
  } };
  const equipment = { id: 1, name: "Press", area: "A", nodes: ["Node"] };
  const state = { checks: { "1:0:2026-08-31": { to: { commentLog: [
    { id: "aug", resolved: true, partInstalled: true, text: "AUGUST-PART", resolvedAt: "2026-08-31T18:00:00Z" },
    { id: "sep", resolved: true, partInstalled: true, text: "SEPTEMBER-PART", resolvedAt: "2026-08-31T20:00:00Z" }
  ] } } } };
  const before = structuredClone(state);
  const h = harness(["journalMonthMatches", "installedPartJournalRows", "installedPartJournalHtml", "openInstalledPartJournal"], {
    Date: FactoryNow, document, state, equipmentById: () => equipment, visibleCommentEntries: item => item.commentLog || [],
    resolutionParticipantsText: () => "Worker", escapeHtml: value => String(value || ""),
    dateTimeHuman: value => value, canonicalUserTextHtml: value => value, journalMonthLabel: value => value
  });
  assert.equal(h.installedPartJournalRows(1)[0].id, "sep");
  h.openInstalledPartJournal(equipment);
  const first = overlays[0];
  assert.match(first.innerHTML, /value="2026-09"/); assert.match(first.innerHTML, /SEPTEMBER-PART/); assert.doesNotMatch(first.innerHTML, /AUGUST-PART/);
  first.controls["[data-parts-month]"].change({ currentTarget: { value: "2026-08" } });
  assert.match(first.innerHTML, /AUGUST-PART/); assert.doesNotMatch(first.innerHTML, /SEPTEMBER-PART/);
  first.controls["[data-close-parts]"].click(); assert.equal(first.removed, true);
  h.openInstalledPartJournal(equipment);
  const reopened = overlays[1]; assert.match(reopened.innerHTML, /value="2026-09"/);
  reopened.controls["[data-parts-month]"].change({ currentTarget: { value: "" } });
  assert.match(reopened.innerHTML, /value="2026-09"/); assert.match(reopened.innerHTML, /SEPTEMBER-PART/);
  assert.deepEqual(state, before);
});

test("rating default/reopen/month-switch and empty worker/engineer selectors use the same period as actual award entries", () => {
  class FactoryNow extends Date { constructor(...args) { super(...(args.length ? args : ["2026-08-31T20:00:00Z"])); } }
  const worker = { id: "w", role: "mechanic", name: "Worker" };
  const events = ["2026-08-31T18:00:00Z", "2026-08-31T20:00:00Z"].map((at, index) => ({ type: "breakdown", resolvedAt: at,
    createdAt: at, resolvedByRole: "mechanic", resolvedByName: "Worker", durationMs: 3600000, text: `event-${index}` }));
  const state = { checks: { "1:0:2026-09-01": { to: { walkShifts: { day: { done: true, at: "2026-08-31T20:00:00Z", byRole: "mechanic", byName: "Worker" } } } } } };
  const monthControl = () => ({ value: "", addEventListener(type, fn) { this[type] = fn; } });
  const h = harness(["dateYearMonth", "parseMonthKey", "emptyWorkerRating", "isPressRatingEquipment", "workerRatingPointMap", "workerRatingStats", "renderWorkerRating"], {
    Date: FactoryNow, current: {}, state, annualRepairEvents: () => events, loadUsers: () => [worker],
    canonicalWorkerRole: role => role, requestRoleLabel: role => role, workerRatingKey: (role, name) => `${role}:${name}`,
    workerRatingExcluded: () => false, isWorkerRatingRole: role => role === "mechanic", isElectromechanicRole: role => role === "mechanic",
    resolutionUserKey: item => item.id, workerRatingHtml: stats => JSON.stringify(stats),
    ui: { workerRatingMonth: monthControl(), engineerReportMonth: monthControl(), workerRatingPanel: { querySelectorAll: () => [] } }
  });
  const initial = app.match(/  ratingMonth: (.*),/)[1];
  vm.runInContext(`current.ratingMonth = ${initial};`, h);
  const handlerStart = app.indexOf('ui.workerRatingMonth?.addEventListener("change"');
  const handlerEnd = app.indexOf('ui.engineerReportPrint?.addEventListener', handlerStart);
  h.renderEngineerReport = () => { const period = h.parseMonthKey(h.current.engineerReportMonth); h.ui.engineerReportMonth.value = period.key; };
  vm.runInContext(app.slice(handlerStart, handlerEnd), h);
  const verify = (month, points, qrDone) => {
    h.renderWorkerRating();
    const stats = JSON.parse(h.ui.workerRatingPanel.innerHTML);
    assert.equal(stats.monthIndex, month - 1); assert.equal(stats.year, 2026);
    assert.equal(stats.totals.closed, 1); assert.equal(stats.totals.points, points); assert.equal(stats.totals.qrDone, qrDone);
    const ledger = [];
    h.workerRatingPointMap(2026, month - 1, ledger);
    assert.equal(ledger.reduce((sum, entry) => sum + entry.points, 0), points);
    assert.ok(ledger.every(entry => h.dateYearMonth(entry.date).month === month - 1));
  };
  assert.equal(h.current.ratingMonth, "2026-09"); verify(9, 23, 1);
  h.ui.workerRatingMonth.value = "2026-08"; h.ui.workerRatingMonth.change(); verify(8, 20, 0);
  h.renderWorkerRating(); assert.equal(h.ui.workerRatingMonth.value, "2026-08", "reopening the rating retains its selected period");
  h.ui.workerRatingMonth.value = ""; h.ui.workerRatingMonth.change(); verify(9, 23, 1);
  assert.equal(h.current.ratingMonth, "2026-09");
  for (const value of ["", "invalid", "2026-13"]) {
    const stats = h.workerRatingStats(value); assert.equal(stats.year, 2026); assert.equal(stats.monthIndex, 8);
  }
  h.ui.engineerReportMonth.value = "2026-08"; h.ui.engineerReportMonth.change(); assert.equal(h.current.engineerReportMonth, "2026-08");
  h.ui.engineerReportMonth.value = ""; h.ui.engineerReportMonth.change(); assert.equal(h.current.engineerReportMonth, "2026-09");
  assert.equal(h.ui.engineerReportMonth.value, "2026-09");
});
