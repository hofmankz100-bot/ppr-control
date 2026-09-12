"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../modules/repeat-failures.js"), "utf8"), context);
const { activeGroups, buildAnalysis, editorHtml, employeeRepeatPenaltyCounts, journalHtml, kpdPercent } = context.window.PPRModules.repeatFailures;
test("journal stylesheet is publicly served without exposing other server files", () => {
  const { isPublicStaticPath } = require("../server/static-files");
  assert.equal(isPublicStaticPath("modules/repeat-failures.css"), true);
  assert.equal(isPublicStaticPath("server/repeat-failure-group-route.js"), false);
  assert.equal(isPublicStaticPath("modules/../server/env.js"), false);
});
const event = (overrides = {}) => ({ type: "remark", equipmentId: 1, equipment: "Пресс", area: "Цех", node: "Насос", createdAt: "2026-08-01T08:00:00Z", text: "Не работает", ...overrides });
const analyze = events => buildAnalysis(events, { workers: [] }).repeatedBreakdowns;
const helpers = { escapeHtml: value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"), dateTimeHuman: value => value || "", durationText: value => String(value), requestRoleLabel: value => value || "" };

test("saving a number inherits the equipment name across sources without changing other journal records", async () => {
  const { handleRepeatFailureGroupRoute } = require("../server/repeat-failure-group-route");
  const db = {
    downtimes: [{ id: "target", equipmentId: 1 }, { id: "other", equipmentId: 2, repeatFailureCode: "5", repeatFailureName: "Other machine", repeatFailureMarkedAt: "2026-09-08" }],
    checks: { "1:0:2025-01-01": { to: { commentLog: [{ id: "old", repeatFailureCode: "5", repeatFailureName: "Cylinder leak", repeatFailureMarkedAt: "2026-09-01" }] } } }
  };
  const originalChecks = JSON.stringify(db.checks);
  const originalOther = JSON.stringify(db.downtimes[1]);
  let response;
  const deps = {
    readBody: async () => ({ sourceType: "downtime", downtimeId: "target", code: "5" }),
    sendJson: (_, status, body) => { response = { status, body }; },
    enqueueStateWrite: fn => fn(), readDb: () => db,
    activeUserPermission: () => false, nodeMutationAccessServer: () => false,
    ensureRemarkEntriesServer: () => { throw new Error("Must not normalize unrelated records"); },
    resolutionUserKeyServer: () => "admin", writeDb: () => {},
    broadcastState: () => 1, realtimeStateVersion: () => 1
  };
  await handleRepeatFailureGroupRoute({ method: "POST", authUser: { role: "editor" } }, {}, "/api/repeat-failure-group", deps);
  assert.equal(response.status, 200);
  assert.equal(db.downtimes[0].repeatFailureName, "Cylinder leak");
  assert.equal(JSON.stringify(db.checks), originalChecks);
  assert.equal(JSON.stringify(db.downtimes[1]), originalOther);
  assert.equal(response.body.state.downtimes.length, 1);
});

test("unmarked identical records never become repeat groups", () => {
  assert.equal(analyze(Array.from({ length: 34 }, () => event())).length, 0);
  assert.equal(analyze([event({ repeatFailureCode: " " }), event({ repeatFailureCode: " " })]).length, 0);
});
test("only matching manual codes on the same equipment are counted", () => {
  const result = analyze([event({ repeatFailureCode: "5" }), event({ type: "breakdown", repeatFailureCode: "5", durationMs: 60000 }), event(), event({ repeatFailureCode: "6" }), event({ repeatFailureCode: "5", equipmentId: 2 }), event({ repeatFailureCode: "5", createdAt: "2025-08-01T08:00:00Z" })]);
  assert.equal(result.length, 1);
  assert.equal(result[0].count, 3);
  assert.equal(result[0].downtimeMs, 60000);
  assert.equal(analyze([event({ repeatFailureCode: "5" }), event({ repeatFailureCode: "" })]).length, 0);
});
test("all manually marked repeat groups remain available beyond the first ten", () => {
  const events = Array.from({ length: 11 }, (_, i) => [event({ repeatFailureCode: String(i + 1) }), event({ repeatFailureCode: String(i + 1) })]).flat();
  assert.equal(analyze(events).length, 11);
});

test("the group selector reuses active groups for the same equipment only", () => {
  const groups = activeGroups([
    event({ repeatFailureCode: "5", repeatFailureName: "Старое", repeatFailureMarkedAt: "2026-08-01" }),
    event({ repeatFailureCode: "5", repeatFailureName: "Течь", repeatFailureMarkedAt: "2026-09-01" }),
    event({ repeatFailureCode: "6", equipmentId: 2 }),
    event({ repeatFailureCode: "7", repeatFailureClosedAt: "2026-09-02" })
  ], 1);
  assert.deepEqual(JSON.parse(JSON.stringify(groups)), [{ code: "5", name: "Течь", namedAt: "2026-09-01", count: 2 }]);
  const html = editorHtml(event({ id: "target", repeatFailureCode: "5", repeatFailureName: "Течь" }), groups.flatMap(group => [event({ repeatFailureCode: group.code, repeatFailureName: group.name })]), helpers.escapeHtml);
  assert.match(html, /data-repeat-failure-choice/);
  assert.match(html, /data-group-name="Течь"/);
  assert.match(html, /＋ Новая группа/);
});

test("repeat penalties belong to the previous repair and exclude the first occurrence", () => {
  const marked = [
    event({ repeatFailureCode: "5", createdAt: "2026-09-01", resolvedAt: "2026-09-01", resolvedByRole: "mechanic", resolvedByName: "Иван" }),
    event({ repeatFailureCode: "5", createdAt: "2026-09-03", resolvedAt: "2026-09-03", resolvedByRole: "electrician", resolvedByName: "Пётр" }),
    event({ repeatFailureCode: "5", createdAt: "2026-09-05" }),
    event({ repeatFailureCode: "6", createdAt: "2026-09-01", resolvedAt: "2026-09-01", ratingParticipants: [{ role: "mechanic", name: "Иван" }, { role: "mechanic", name: "Иван" }] }),
    event({ repeatFailureCode: "6", createdAt: "2026-09-02" }),
    event({ repeatFailureCode: "7", createdAt: "2026-09-01", resolvedAt: "2026-09-01", resolvedByRole: "operator", resolvedByName: "Оператор" }),
    event({ repeatFailureCode: "7", createdAt: "2026-09-02" })
  ];
  const counts = employeeRepeatPenaltyCounts(marked, (role, name) => `${role}:${name}`, role => ["mechanic", "electrician"].includes(role), date => date.startsWith("2026-09"));
  assert.equal(counts.get("mechanic:Иван"), 2);
  assert.equal(counts.get("electrician:Пётр"), 1);
  assert.equal(counts.has("operator:Оператор"), false);
});

test("KPI subtracts repeat penalties from completed repairs and never falls below zero", () => {
  assert.equal(kpdPercent(10, 0, 1), 90);
  assert.equal(kpdPercent(8, 2, 1), 70);
  assert.equal(kpdPercent(1, 0, 3), 0);
  assert.equal(kpdPercent(0, 0, 2), null);
});

test("all-history analysis joins months and years but isolates equipment and uses the latest group name", () => {
  const events = [
    event({ repeatFailureCode: "5", repeatFailureName: "Старое название", repeatFailureMarkedAt: "2026-09-01", createdAt: "2025-08-01T08:00:00Z" }),
    event({ repeatFailureCode: "5", repeatFailureName: "Течь цилиндра", repeatFailureMarkedAt: "2026-09-02", createdAt: "2026-09-01T08:00:00Z" }),
    event({ repeatFailureCode: "5", equipmentId: 2, repeatFailureName: "Насос" }),
    event({ repeatFailureCode: "5", equipmentId: 2 }),
    event()
  ];
  const groups = buildAnalysis(events, { workers: [] }).repeatedBreakdowns;
  assert.equal(groups.length, 2);
  const group = groups.find(item => item.equipmentId === 1);
  assert.equal(group.count, 2);
  assert.equal(group.name, "Течь цилиндра");
  assert.notEqual(group.groupKey, groups.find(item => item.equipmentId === 2).groupKey);
  const html = journalHtml({ ...group, events: [...group.events, event({ equipmentId: 2, repeatFailureCode: "5", text: "WRONG EQUIPMENT" })] }, null, helpers);
  assert.ok(html.includes("За весь период") && html.includes("Течь цилиндра"));
  assert.ok(html.includes("2025-08-01") && html.includes("2026-09-01"));
  assert.ok(!html.includes("WRONG EQUIPMENT") && !html.includes("null год"));
});
test("detail journal paginates marked records and retains aggregate repair details", () => {
  const marked = Array.from({ length: 11 }, () => event({ repeatFailureCode: "5", text: "<script>bad</script>", resolvedAt: "2026-08-02T09:00:00Z", resolvedComment: "Заменили насос", ratingParticipants: [{ name: "Иван", role: "mechanic" }, { name: "Нурлан", role: "mechanic" }], confirmedByName: "Инженер", confirmedAt: "2026-08-02T10:00:00Z" }));
  const html = journalHtml({ manualCode: "5", equipment: "Пресс", events: [...marked, event({ text: "UNMARKED" }), event({ repeatFailureCode: "6", text: "OTHER" })] }, 2026, helpers);
  assert.equal((html.match(/class="repeat-journal-sheet"/g) || []).length, 2);
  assert.equal((html.match(/Заменили насос/g) || []).length, 11);
  assert.ok(html.includes("Дата ремонта") && html.includes("Кто устранил / кто подтвердил"));
  assert.ok(html.includes("Иван") && html.includes("Нурлан") && html.includes("Подтвердил: Инженер"));
  assert.ok(html.includes("2026-08-02T09:00:00Z") && html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>") && !html.includes("UNMARKED") && !html.includes("OTHER"));
  assert.ok(!html.includes("repeat-failure-editor") && !html.includes("data-save-repeat-failure"));
});
