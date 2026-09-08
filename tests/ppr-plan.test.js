"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { savePlan, planSnapshot, keyFor, legacyMarkTarget } = require("../server/ppr-plan");
const { buildAutofillRows, generatePprSheet } = require("../server/ppr-autofill");
const { sanitizeStateMutation } = require("../server/state-mutation-policy");
const date = "2026-09-08";
const actor = { name: "Инженер Тест", role: "engineer" };
const target = { equipmentId: 90, equipment: "Пресс", node: "Узел", area: "Цех" };
test("PPR editor stylesheet is served, but server implementation remains private", () => {
  const { isPublicStaticPath } = require("../server/static-files");
  assert.equal(isPublicStaticPath("modules/ppr-plan-editor.css"), true);
  assert.equal(isPublicStaticPath("server/ppr-plan.js"), false);
});
function seed() {
  return { catalog: { equipment: { 90: { id: 90, created: true, name: target.equipment, nodes: [target.node], area: target.area } } },
    pprSheets: { [date]: { date, rows: [{ id: "a", work: "Первая работа", mark: "", ...target }, { id: "b", work: "Вторая работа", mark: "", ...target }, { id: "empty", work: "", mark: "" }] },
      "2026-08-01": { rows: [{ work: "История", mark: "done", markedByName: "Мастер" }], approvedAt: "2026-08-02" } },
    checks: { retained: { text: "История журнала" } } };
}
function request(db) {
  const snapshot = planSnapshot(db, date);
  return { date, revision: snapshot.revision, templateVersions: snapshot.templateVersions, rows: structuredClone(snapshot.sheet.rows) };
}
test("explicit save updates only this plan and equipment/node template; empty rows never become template works", () => {
  const db = seed(); const before = structuredClone(db); const body = request(db);
  body.rows[0].work = "Қазақша мәтін — проверить крепления";
  body.rows.splice(1, 1);
  assert.ok(savePlan(db, body, actor).sheet);
  assert.deepEqual(db.checks, before.checks);
  assert.deepEqual(db.pprSheets["2026-08-01"], before.pprSheets["2026-08-01"]);
  assert.deepEqual(db.pprRemovedRows[date].b.row, before.pprSheets[date].rows[1]);
  const template = db.pprWorkTemplates[keyFor(target)];
  assert.deepEqual(template.works, [body.rows[0].work]); assert.equal(template.updatedByName, actor.name);
  const nextTarget = planSnapshot(db, date).targets.find(item => item.node === target.node);
  assert.ok(nextTarget.nodeId, "a confirmed save assigns canonical server identity");
  const next = buildAutofillRows("2026-10-01", [nextTarget], db.pprWorkTemplates);
  assert.deepEqual(next.filter(row => row.work).map(row => row.work), template.works);
  assert.ok(next.every(row => !row.mark && !row.resolutionComment && !row.markedByName));
  assert.notDeepEqual(buildAutofillRows("2026-10-01", [{ ...target, equipmentId: 91 }], db.pprWorkTemplates).map(row => row.work), next.map(row => row.work));
  const editAgain = request(db); editAgain.rows[0].work = "Снова изменено";
  assert.ok(savePlan(db, editAgain, actor).sheet); assert.equal(db.pprWorkTemplates[keyFor(target)].version, 2);
});
test("concurrent results survive; rows with results cannot be removed or edited", () => {
  for (const change of ["edit", "remove", "unchanged"]) {
    const db = seed(); const body = request(db);
    Object.assign(db.pprSheets[date].rows[0], { mark: "done", resolutionComment: "Работа сделана", markedByName: "Механик" });
    if (change === "edit") body.rows[0].work = "Подмена";
    if (change === "remove") body.rows.shift();
    const before = structuredClone(db); const result = savePlan(db, body, actor);
    if (change === "unchanged") assert.deepEqual(result.sheet.rows[0], before.pprSheets[date].rows[0]);
    else { assert.equal(result.error, "ppr_row_started"); assert.deepEqual(db, before); }
  }
});
test("conflicting plans/templates, approved sheets and invalid targets do not mutate any data", () => {
  for (const scenario of ["plan", "template", "approved", "target", "empty"]) {
    const db = seed(); const body = request(db);
    if (scenario === "plan") db.pprSheets[date].rows[0].work = "Другой инженер";
    if (scenario === "template") db.pprWorkTemplates = { [keyFor(target)]: { version: 2, works: ["Другой шаблон"] } };
    if (scenario === "approved") db.pprSheets[date].approvedAt = "2026-09-08";
    if (scenario === "target") body.rows[0].equipmentId = 91;
    if (scenario === "empty") body.rows = [];
    const before = structuredClone(db); assert.ok(savePlan(db, body, actor).error, scenario); assert.deepEqual(db, before);
  }
});
test("stale full-state sync cannot resurrect removed rows or overwrite saved plan", () => {
  const db = seed(); const stale = structuredClone(db); const body = request(db);
  body.rows.splice(1, 1); assert.ok(savePlan(db, body, actor).sheet);
  stale.pprSheets[date].rows[0].work = "Stale overwrite";
  const sanitized = sanitizeStateMutation({ previous: db, incoming: stale, user: actor, canAccessEquipment: () => true, hasArea: () => true });
  const incoming = sanitized.body || sanitized;
  assert.deepEqual(incoming.pprSheets[date].rows, db.pprSheets[date].rows);
  assert.equal(generatePprSheet({ catalog: db.catalog, previous: db.pprSheets[date], date, force: true }).changed, false);
});
test("autofill keeps identical work separately on different equipment and nodes", () => {
  const rows = buildAutofillRows(date, [target, { ...target, equipmentId: 91 }]);
  assert.equal(rows.filter(row => row.work && row.equipmentId === 90).length, rows.filter(row => row.work && row.equipmentId === 91).length);
});

test("mark target keeps saved bindings and derives only an unambiguous legacy target from the server", () => {
  const { EQUIPMENT, scheduledItemsForDate } = require("../server/ppr-autofill");
  const equipment = Object.fromEntries(EQUIPMENT.map(eq => [eq.id, { deleted: true }]));
  equipment[90] = { id: 90, created: true, name: "Серверный пресс", area: "Цех", nodes: ["Узел"] };
  const catalog = { equipment };
  let scheduledDate, target;
  for (let day = 1; day <= 30; day++) {
    const date = `2026-09-${String(day).padStart(2, "0")}`;
    const targets = scheduledItemsForDate(catalog, date);
    if (targets.length === 1) { scheduledDate = date; target = targets[0]; break; }
  }
  assert.ok(scheduledDate);
  const { equipmentId, equipment: name, node, area } = target;
  assert.deepEqual(legacyMarkTarget({ date: scheduledDate }, {}, catalog), { equipmentId, equipment: name, node, area });
  assert.deepEqual(legacyMarkTarget({ date: scheduledDate, explicitPlan: true }, {}, catalog), {});
  for (const field of ["equipmentId", "equipment", "node", "area"]) assert.deepEqual(legacyMarkTarget({ date: scheduledDate }, { [field]: "Historical" }, catalog), {});
  assert.deepEqual(legacyMarkTarget({ date: "2026-09-06" }, {}, catalog), {}, "no schedule on Sunday; never invent a target");
  const before = JSON.stringify(catalog);
  legacyMarkTarget({ date: scheduledDate }, {}, catalog);
  assert.equal(JSON.stringify(catalog), before);
  equipment[90].operationalPauses = [{ startedAt: `${scheduledDate}T00:00:00+05:00`, endedAt: `${scheduledDate}T12:00:00+05:00` }];
  assert.deepEqual(legacyMarkTarget({ date: scheduledDate }, {}, catalog, "2026-10-01T00:00:00+05:00"), {}, "historical completed pauses must not be treated as today's reopened equipment");
});
