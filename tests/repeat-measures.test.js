"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { handleRepeatFailureGroupRoute } = require("../server/repeat-failure-group-route");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../modules/repeat-failures.js"), "utf8"), context);
const { measuresCell, completionCell, isClosed, buildAnalysis, groupMeasures } = context.window.PPRModules.repeatFailures;
test("repeat summary replaces area with measures and omits node without changing other report tables", () => {
  const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const rows = source.slice(source.indexOf("  const repeatRows = engineerReportRows("), source.indexOf("  const employeeRows = engineerReportRows("));
  assert.doesNotMatch(rows, /item\.area|item\.node/);
  assert.match(rows, /measuresCell/);
  assert.match(rows, /completionCell/);
  assert.ok(source.includes('<th>Мероприятия</th><th>Оборудование</th><th>Выполнено</th><th>Повторов</th><th>Простой</th><th>№ / Название поломки</th>'));
});
const escapeHtml = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function fixture() {
  const db = { catalog: { equipment: {
    "1": { id: 1, name: "Press 2400", area: "A", nodes: ["Cylinder"], repeatFailureMeasures: { "2": { text: "Other group" } } },
    "2": { id: 2, name: "Press 1540", area: "B", nodes: ["Pump"], repeatFailureMeasures: { "1": { text: "Other equipment" } } }
  } }, checks: { "1:0:2026-08-01": { to: { commentLog: [{ id: "r1", repeatFailureCode: "1", text: "Leak" }] } } }, downtimes: [] };
  let writes = 0, broadcasts = 0;
  return { db, writes: () => writes, broadcasts: () => broadcasts,
    async send(body = {}, actor = { role: "editor", name: "Admin" }) {
      let response;
      const deps = { readBody: async () => ({ action: "save-measures", equipmentId: 1, code: "1", text: "Replace seal", ...body }),
        sendJson: (_, status, value) => { response = { status, ...value }; }, enqueueStateWrite: fn => fn(), readDb: () => db,
        activeUserPermission: user => user.allowed === true && !user.expired,
        ensureRemarkEntriesServer: item => item.commentLog,
        nodeMutationAccessServer: (user, equipment) => user.area === equipment.area,
        resolutionUserKeyServer: () => "admin", writeDb: () => { writes++; },
        broadcastState: () => ++broadcasts, realtimeStateVersion: () => broadcasts };
      await handleRepeatFailureGroupRoute({ method: "POST", authUser: actor }, {}, "/api/repeat-failure-group", deps);
      return response;
    }
  };
}
test("measures are separate from node names and groups and repeated saves are idempotent", async () => {
  const f = fixture(), checks = JSON.stringify(f.db.checks), other = JSON.stringify(f.db.catalog.equipment["2"]);
  const response = await f.send({ text: "Inspect cylinder\nReplace seal" });
  assert.equal(response.status, 200);
  assert.equal(response.state.catalog.equipment["1"].repeatFailureMeasures["1"].text, "Inspect cylinder\nReplace seal");
  assert.equal(f.db.catalog.equipment["1"].repeatFailureMeasures["2"].text, "Other group");
  assert.deepEqual(f.db.catalog.equipment["1"].nodes, ["Cylinder"]);
  assert.equal(JSON.stringify(f.db.checks), checks);
  assert.equal(JSON.stringify(f.db.catalog.equipment["2"]), other);
  assert.equal((await f.send({ text: "Inspect cylinder\nReplace seal" })).changed, false);
  assert.equal(f.writes(), 1); assert.equal(f.broadcasts(), 1);
});

test("completion locks members but allows the same number for new cycles and other equipment", async () => {
  const f = fixture();
  f.db.downtimes.push({ id: "d1", equipmentId: 1, repeatFailureCode: "1" }, { id: "free", equipmentId: 1 }, { id: "other", equipmentId: 2 });
  const complete = extra => f.send({ action: "complete-measures", cycleNumber: 0, expectedUpdatedAt: f.db.catalog.equipment["1"].repeatFailureMeasures["1"]?.updatedAt, ...extra });
  assert.equal((await complete()).error, "repeat_failure_measures_required");
  await f.send();
  assert.equal((await f.send({ action: "complete-measures" }, { role: "mechanic" })).status, 403);
  assert.equal((await complete({ expectedUpdatedAt: "stale" })).error, "repeat_failure_measures_stale");
  assert.equal((await complete()).status, 200);
  const closedAt = f.db.catalog.equipment["1"].repeatFailureArchives["1:0"].completedAt;
  assert.ok(closedAt);
  assert.equal(f.db.checks["1:0:2026-08-01"].to.commentLog[0].repeatFailureClosedAt, closedAt);
  assert.equal(f.db.downtimes[0].repeatFailureClosedAt, closedAt);
  assert.equal((await complete()).changed, false);
  assert.equal((await f.send()).error, "repeat_failure_group_closed");
  const assign = (id, code) => f.send({ action: "assign", sourceType: "downtime", downtimeId: id, code });
  for (const code of ["", "1", "2"]) assert.equal((await assign("d1", code)).error, "repeat_failure_group_closed");
  assert.equal((await f.send({ action: "assign", sourceType: "remark", recordKey: "1:0:2026-08-01", remarkId: "r1", code: "2" })).status, 409);
  assert.equal((await assign("free", "1")).status, 200);
  assert.equal(f.db.downtimes.find(item => item.id === "free").repeatFailureCycleId, undefined);
  assert.equal(f.db.catalog.equipment["1"].repeatFailureMeasures["1"].cycleNumber, 1);
  assert.equal((await f.send({ cycleNumber: 1, text: "New measures" })).status, 200);
  assert.equal(f.db.catalog.equipment["1"].repeatFailureArchives["1:0"].text, "Replace seal");
  assert.equal((await complete()).changed, false); // delayed duplicate must not close the new list
  assert.equal(f.db.downtimes.find(item => item.id === "free").repeatFailureClosedAt, undefined);
  assert.equal((await assign("other", "1")).status, 200);
  const reloaded = JSON.parse(JSON.stringify(f.db));
  assert.equal(reloaded.catalog.equipment["1"].repeatFailureArchives["1:0"].completedAt, closedAt);
});

test("closed groups render saved text, immutable checkmark and locked aggregate metadata", () => {
  const group = { equipmentId: 1, manualCode: "1", groupKey: "manual|1|1" };
  const saved = { text: "Replace seal", completedAt: "2026-09-08T08:00:00Z", completedByName: "Admin" };
  assert.doesNotMatch(measuresCell(group, saved, false, true, escapeHtml), /textarea|button/);
  assert.match(completionCell(group, saved, false, true, escapeHtml), /☑ Выполнено/);
  assert.doesNotMatch(completionCell(group, saved, false, true, escapeHtml), /button|input/);
  assert.doesNotMatch(completionCell(group, {}, true, true, escapeHtml), /button|input/);
  assert.doesNotMatch(completionCell(group, {}, false, false, escapeHtml), /button|input/);
  assert.match(completionCell(group, {}, false, true, escapeHtml), /role="checkbox" aria-checked="false"/);
  assert.equal(isClosed({ equipmentId: 1, repeatFailureCode: "1" }), false);
  assert.equal(isClosed({ repeatFailureClosedAt: saved.completedAt }, {}), true);
});

test("report and printed details separate closed cycles from new entries with the same equipment and code", () => {
  const base = { type: "breakdown", equipmentId: 1, equipment: "Press", createdAt: "2026-09-08T08:00:00Z", repeatFailureCode: "1", durationMs: 60000 };
  const events = [
    { ...base, text: "Old 1", repeatFailureCycleId: "1:0" }, { ...base, text: "Old 2", repeatFailureCycleId: "1:0" },
    { ...base, text: "New 1" }, { ...base, text: "New 2" },
    { ...base, text: "Other 1", equipmentId: 2 }, { ...base, text: "Other 2", equipmentId: 2 }
  ];
  const catalog = { equipment: { "1": { repeatFailureMeasures: { "1": { text: "New measures", cycleNumber: 1 } }, repeatFailureArchives: { "1:0": { text: "Old measures", completedAt: "2026-09-08" } } } } };
  const groups = buildAnalysis(events, { workers: [] }, catalog).repeatedBreakdowns;
  assert.equal(groups.length, 3);
  const closed = groups.find(group => group.cycleId), active = groups.find(group => group.equipmentId === 1 && !group.cycleId);
  assert.equal(closed.count, 2); assert.equal(active.count, 2);
  assert.notEqual(closed.groupKey, active.groupKey);
  assert.equal(groupMeasures(closed, catalog).text, "Old measures");
  assert.equal(groupMeasures(active, catalog).text, "New measures");
  const helpers = { escapeHtml, dateTimeHuman: String, durationText: String, requestRoleLabel: String };
  const html = context.window.PPRModules.repeatFailures.journalHtml({ ...closed, events }, null, helpers);
  assert.match(html, /Old 1/); assert.doesNotMatch(html, /New 1|Other 1/);
});
test("server checks permission, equipment access, group existence and input length", async () => {
  const f = fixture();
  assert.equal((await f.send({}, { role: "mechanic", area: "A" })).status, 403);
  assert.equal((await f.send({}, { role: "engineer", allowed: true, expired: true, area: "A" })).status, 403);
  assert.equal((await f.send({}, { role: "engineer", allowed: true, area: "B" })).status, 403);
  assert.equal((await f.send({ code: "99" })).status, 404);
  assert.equal((await f.send({ equipmentId: 999 })).status, 404);
  assert.equal((await f.send({ text: "x".repeat(2001) })).status, 400);
  assert.equal((await f.send({ text: {} })).status, 400);
  assert.equal(f.writes(), 0);
  assert.equal((await f.send({}, { role: "engineer", allowed: true, area: "A" })).status, 200);
});
test("saved measures survive serialization, can be edited and cleared without changing grouping", async () => {
  const f = fixture();
  await f.send();
  const reloaded = JSON.parse(JSON.stringify(f.db));
  assert.equal(reloaded.catalog.equipment["1"].repeatFailureMeasures["1"].text, "Replace seal");
  await f.send({ text: "Repair cylinder" });
  assert.equal(f.db.catalog.equipment["1"].repeatFailureMeasures["1"].text, "Repair cylinder");
  await f.send({ text: "" });
  assert.equal(f.db.catalog.equipment["1"].repeatFailureMeasures["1"].text, "");
  assert.equal(f.db.checks["1:0:2026-08-01"].to.commentLog[0].repeatFailureCode, "1");
});
test("report shows editable measures only with permission; print contains escaped saved text without controls", () => {
  const group = { equipmentId: 1, manualCode: "1", groupKey: "manual|1|1" };
  const saved = { text: "Inspect <cylinder>\nReplace seal" };
  assert.match(measuresCell(group, saved, false, true, escapeHtml), /textarea/);
  for (const [printable, allowed] of [[true, true], [false, false]]) {
    const html = measuresCell(group, saved, printable, allowed, escapeHtml);
    assert.ok(html.includes("Inspect &lt;cylinder&gt;<br>Replace seal"));
    assert.doesNotMatch(html, /textarea|button|data-save/);
  }
});

test("completion requires a saved draft and explicit confirmation; cancelled or failed requests do not mark complete", async () => {
  const scope = { window: { confirm: () => false } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../modules/repeat-failures.js"), "utf8"), scope);
  let click, calls = 0, renders = 0, fail = false, notice = "";
  const button = { dataset: { completeRepeatMeasures: "manual|1|1", equipmentId: "1", repeatCode: "1", cycleNumber: "0", savedMeasures: "", measuresUpdatedAt: "saved" }, addEventListener: (_, fn) => { click = fn; } };
  const container = { querySelectorAll: selector => selector === "[data-complete-repeat-measures]" ? [button] : [] };
  const helpers = { runButtonOperation: (_, fn) => fn(), apiJson: async (_, options) => {
    calls++; const body = JSON.parse(options.body); assert.equal(body.cycleNumber, 0); assert.equal(body.expectedUpdatedAt, "saved");
    if (fail) throw new Error("offline"); return {};
  }, nextActionId: () => "test", persist() {}, showAppToast: text => { notice = text; }, isCurrent: () => true, render: () => { renders++; } };
  scope.window.scrollTo = () => {};
  scope.window.PPRModules.repeatFailures.bindMeasures(container, helpers);
  await click(); assert.match(notice, /Сначала сохраните/); assert.equal(calls, 0);
  button.dataset.savedMeasures = "Replace seal";
  await click(); assert.equal(calls, 0); // Cancel on confirmation
  scope.window.confirm = () => true; fail = true;
  await assert.rejects(click(), /offline/); assert.equal(renders, 0);
  fail = false; await click(); assert.equal(renders, 1);
});
