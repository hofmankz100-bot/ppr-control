"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminEquipmentMaintenanceRoute } = require("../server/admin-equipment-maintenance-route");
const { planSnapshot, savePlan, keyFor } = require("../server/ppr-plan");
const { buildAutofillRows, equipmentForPlan } = require("../server/ppr-autofill");
const date = "2026-09-08";
const actor = { role: "editor", name: "Инженер" };
const target = { equipmentId: 90, equipment: "Пресс", node: "Привод", area: "Цех" };
function seed() {
  const row = { id: "work", ...target, work: "Особая работа", mark: "" };
  return { catalog: { equipment: { 90: { id: 90, created: true, name: "Пресс", area: "Цех", nodes: ["Привод", "Насос"] } } },
    pprSheets: { [date]: { date, rows: [row], autofilledFor: [{ ...target }] },
      accepted: { approvedAt: "2026-09-01", approvedByName: "Мастер", rows: [{ ...row, nodeIndex: 0, mark: "done", markedByName: "Рабочий" }] },
      started: { rows: [{ ...row, nodeIndex: 0, mark: "done", markedByName: "Рабочий" }], approvalRequestedAt: "2026-09-01" } },
    pprWorkTemplates: { [keyFor(target)]: { ...target, works: ["Особая работа"], version: 3, updatedByName: "Автор" } },
    checks: { historical: { manualRepeatCode: "777", comment: "Не менять" } } };
}
async function action(db, action, body, expectedStatus = 200) {
  let response;
  const route = createAdminEquipmentMaintenanceRoute({
    broadcastState: () => "v", catalogNodeTombstone: () => {}, enqueueStateWrite: job => job(),
    normalizedCatalogNodeName: value => String(value).trim().toLowerCase(), normalizedAdminConfig: () => ({}),
    passwordMatches: () => true, publicState: value => value, randomBytes: require("node:crypto").randomBytes,
    readBody: async req => req.body, readDb: () => db, sendJson: (_, status, data) => { response = { status, data }; }, writeDb: () => {}
  });
  await route({ method: "POST", authUser: actor, body: { equipmentId: 90, ...body } }, {}, `/api/admin/equipment/node-${action}`);
  assert.equal(response.status, expectedStatus, JSON.stringify(response));
  return response.data;
}
function request(db) {
  const snapshot = planSnapshot(db, date);
  return { date, revision: snapshot.revision, templateVersions: snapshot.templateVersions, rows: structuredClone(snapshot.sheet.rows) };
}
test("rename retains the one template, editable plan binding and exact approved/started history", async () => {
  const db = seed(); const before = structuredClone(db); const stale = request(db);
  await action(db, "rename", { nodeIndex: 0, node: "Главный привод" });
  const snapshot = planSnapshot(db, date);
  const renamed = snapshot.targets.find(item => item.node === "Главный привод");
  assert.ok(renamed?.nodeId, "server assigns stable PPR identity");
  assert.equal(snapshot.sheet.rows[0].node, "Главный привод");
  assert.equal(snapshot.sheet.rows[0].nodeId, renamed.nodeId);
  assert.equal(snapshot.sheet.rows[0].nodeIndex, undefined, "PPR identity is not a mutable position");
  assert.deepEqual(db.pprSheets.accepted, before.pprSheets.accepted);
  assert.deepEqual(db.pprSheets.started, before.pprSheets.started);
  assert.deepEqual(db.checks, before.checks);
  assert.equal(Object.keys(db.pprWorkTemplates).length, 1, "no competing template copies");
  assert.deepEqual(buildAutofillRows(date, [renamed], db.pprWorkTemplates).filter(row => row.work).map(row => row.work), ["Особая работа"]);
  assert.equal(savePlan(db, stale, actor).error, "ppr_plan_conflict");
  const edit = request(db); edit.rows[0].work = "Обновлённая работа";
  assert.ok(savePlan(db, edit, actor).sheet);
  const templates = Object.values(db.pprWorkTemplates);
  assert.equal(templates.length, 1); assert.equal(templates[0].version, 4);
  assert.deepEqual(templates[0].works, ["Обновлённая работа"]);
});
test("stable binding survives a second rename and deletion of the preceding node", async () => {
  const db = seed();
  await action(db, "rename", { nodeIndex: 0, node: "Привод 2" });
  const id = db.pprSheets[date].rows[0].nodeId;
  await action(db, "rename", { nodeIndex: 0, node: "Привод 3" });
  assert.equal(db.pprSheets[date].rows[0].nodeId, id);
  // Move identity with its node using the actual delete route.
  db.catalog.equipment[90].nodes.unshift("Предыдущий");
  db.catalog.equipment[90].pprNodeIds = { 1: db.catalog.equipment[90].pprNodeIds[0] };
  await action(db, "delete", { nodeIndex: 0, nodes: [...db.catalog.equipment[90].nodes] });
  const snapshot = planSnapshot(db, date);
  assert.equal(snapshot.targets.find(item => item.node === "Привод 3").nodeId, id);
  assert.ok(savePlan(db, request(db), actor).sheet);
});
test("forged identity and unknown positional remap cannot acquire another template", async () => {
  const db = seed(); await action(db, "rename", { nodeIndex: 0, node: "Привод 2" });
  const realId = db.pprSheets[date].rows[0].nodeId;
  const body = request(db); body.rows[0].nodeId = "forged";
  const before = structuredClone(db);
  assert.equal(savePlan(db, body, actor).error, "ppr_target_required");
  assert.deepEqual(db, before);
  db.catalog.equipment[90].nodes.reverse(); // A legacy repair did not remap metadata.
  assert.ok(!planSnapshot(db, date).targets.some(item => item.nodeId === realId));
  const targetAfterSwap = planSnapshot(db, date).targets.find(item => item.node === "Привод 2");
  if (targetAfterSwap) assert.notDeepEqual(buildAutofillRows(date, [targetAfterSwap], db.pprWorkTemplates).filter(row => row.work).map(row => row.work), ["Особая работа"]);
});
test("a deleted node and a new node reusing its name do not share the old template", async () => {
  const db = seed();
  await action(db, "delete", { nodeIndex: 0, nodes: ["Привод", "Насос"] });
  await action(db, "add", { node: "Привод", nodes: ["Насос"] });
  const equipment = equipmentForPlan(db.catalog).find(item => item.id === 90);
  const fresh = { ...target, nodeId: equipment.pprNodeIds?.[1]?.id };
  assert.ok(fresh.nodeId);
  assert.notDeepEqual(buildAutofillRows(date, [fresh], db.pprWorkTemplates).filter(row => row.work).map(row => row.work), ["Особая работа"]);
});
test("duplicate legacy labels are unresolved instead of borrowing a neighboring binding", async () => {
  const db = seed(); db.catalog.equipment[90].nodes = ["Привод", "Привод"];
  const before = structuredClone(db);
  assert.ok(!planSnapshot(db, date).targets.some(item => item.node === "Привод"));
  assert.deepEqual(db, before, "read-only snapshot never performs migration");
});
test("saving the second of two equally named nodes keeps its valid ID and the neighboring template exact", () => {
  const db = seed();
  db.catalog.equipment[90].nodes = ["Same", "Same"];
  db.catalog.equipment[90].pprNodeIds = { 0: { id: "A", name: "Same" }, 1: { id: "B", name: "Same" } };
  const first = { ...target, node: "Same", nodeId: "A" }, second = { ...target, node: "Same", nodeId: "B" };
  db.pprWorkTemplates = { [keyFor(first)]: { ...first, works: ["Работа A"], version: 7, updatedByName: "Первый автор" },
    [keyFor(second)]: { ...second, works: ["Работа B"], version: 4, updatedByName: "Второй автор" } };
  db.pprSheets[date] = { date, rows: [{ ...second, id: "B-row", work: "Работа B", mark: "" }] };
  const neighbor = structuredClone(db.pprWorkTemplates[keyFor(first)]), catalog = structuredClone(db.catalog);
  const body = request(db); body.rows[0].work = "Исправленная работа B";
  const result = savePlan(db, body, actor);
  assert.ok(result.sheet, result.error);
  assert.equal(result.sheet.rows[0].nodeId, "B");
  assert.deepEqual(db.pprWorkTemplates[keyFor(first)], neighbor);
  assert.equal(db.pprWorkTemplates[keyFor(second)].nodeId, "B");
  assert.equal(db.pprWorkTemplates[keyFor(second)].version, 5);
  assert.deepEqual(db.pprWorkTemplates[keyFor(second)].works, ["Исправленная работа B"]);
  assert.deepEqual(db.catalog, catalog);
});
test("rotation and weekend shifting retain the selected stable node and its own pause", () => {
  const { scheduledItemsForDate, recommendedMaintenanceForDate } = require("../server/ppr-autofill");
  for (const [id, day, shiftedFrom] of [[91, "2026-10-02", undefined], [93, "2026-09-14", "2026-09-12"]]) {
    const equipment = { id, created: true, name: "Пресс", area: "Цех", nodes: ["Same", "Same", "Other"],
      pprNodeIds: { 0: { id: "A", name: "Same" }, 1: { id: "B", name: "Same" }, 2: { id: "C", name: "Other" } } };
    const catalog = { equipment: { [id]: equipment } };
    const plan = recommendedMaintenanceForDate(equipment, day);
    assert.equal(plan.shiftedFrom, shiftedFrom);
    assert.equal(scheduledItemsForDate(catalog, day).find(item => item.equipmentId === id)?.nodeId, "B");
    equipment.nodeOperationalPauses = { 0: [{ startedAt: "2026-01-01" }] };
    assert.equal(scheduledItemsForDate(catalog, day).find(item => item.equipmentId === id)?.nodeId, "B", "a neighbor's pause does not suppress B");
    equipment.nodeOperationalPauses = { 1: [{ startedAt: "2026-01-01" }] };
    assert.ok(!scheduledItemsForDate(catalog, day).some(item => item.equipmentId === id), "B's own pause suppresses B");
  }
});
test("rename to a reused historical name cannot import a deleted started row into the current template", async () => {
  const db = seed();
  const historical = { ...target, id: "deleted-historical", node: "Reused", work: "Историческая работа удалённого узла", mark: "done", markedByName: "Прежний работник" };
  db.pprSheets[date].rows.push(structuredClone(historical));
  await action(db, "rename", { nodeIndex: 0, node: "Reused" });
  const body = request(db); body.rows[0].work = "Работа текущего узла";
  const result = savePlan(db, body, actor);
  assert.ok(result.sheet, result.error);
  assert.deepEqual(result.sheet.rows[1], historical);
  assert.deepEqual(Object.values(db.pprWorkTemplates).find(item => item.nodeId === result.sheet.rows[0].nodeId).works, ["Работа текущего узла"]);
});
test("rename/delete reject proven ambiguous legacy binding before mutating checks, catalog or history", async () => {
  for (const operation of ["rename", "delete"]) {
    const db = seed(); db.catalog.equipment[90].nodes = ["Привод", "Привод"];
    db.checks["90:0:2026-09-01"] = { comment: "Сохранить полностью" };
    const before = structuredClone(db);
    const result = await action(db, operation, { nodeIndex: 0, node: "Новый привод", nodes: ["Привод", "Привод"] }, 409);
    assert.equal(result.error, "ppr_node_binding_ambiguous");
    assert.deepEqual(db, before);
  }
});
test("legacy client omitting nodeId keeps canonical binding, marks and template version checks", async () => {
  const db = seed(); assert.ok(savePlan(db, request(db), actor).sheet);
  const id = db.pprSheets[date].rows[0].nodeId;
  const body = request(db); delete body.rows[0].nodeId;
  db.pprSheets[date].rows[0].mark = "done";
  db.pprSheets[date].rows[0].markedByName = "Мастер";
  const marked = structuredClone(db.pprSheets[date].rows[0]);
  assert.ok(savePlan(db, body, actor).sheet);
  assert.deepEqual(db.pprSheets[date].rows[0], marked);
  assert.equal(db.pprSheets[date].rows[0].nodeId, id);
  assert.equal(db.pprSheets[date].approvalRequestedAt.length > 0, true, "A09 readiness preserved");
  const before = structuredClone(db);
  assert.equal(savePlan(db, body, actor).error, "ppr_template_conflict");
  assert.deepEqual(db, before);
});
test("old editor may omit the identity of its existing server row on a newly created node", async () => {
  const db = seed(); await action(db, "add", { node: "Новый", nodes: ["Привод", "Насос"] });
  const nodeId = db.catalog.equipment[90].pprNodeIds[2].id;
  db.pprSheets[date].rows = [{ id: "new", ...target, node: "Новый", nodeId, work: "Новая работа", mark: "" }];
  db.pprSheets[date].autofilledFor = [];
  const body = request(db); delete body.rows[0].nodeId; body.rows[0].work = "Правка старым клиентом";
  const result = savePlan(db, body, actor);
  assert.ok(result.sheet, result.error);
  assert.equal(result.sheet.rows[0].nodeId, nodeId);
  assert.equal(result.sheet.rows[0].work, body.rows[0].work);
});
test("deleted legacy started rows stay exact and never seed a replacement node template", async () => {
  const db = seed(); const historical = structuredClone(db.pprSheets.started);
  await action(db, "delete", { nodeIndex: 0, nodes: ["Привод", "Насос"] });
  await action(db, "add", { node: "Привод", nodes: ["Насос"] });
  assert.deepEqual(db.pprSheets.started, historical);
  db.pprSheets[date] = structuredClone(historical);
  assert.ok(!planSnapshot(db, date).targets.some(item => item.node === "Привод" && !item.nodeId));
  const { resolvePprTarget } = require("../server/ppr-autofill");
  assert.equal(resolvePprTarget(equipmentForPlan(db.catalog).find(item => item.id === 90), historical.rows[0]), null);
});
test("ambiguous template IDs fail closed without changing any version or journal", async () => {
  const db = seed(); await action(db, "rename", { nodeIndex: 0, node: "Привод 2" });
  db.pprWorkTemplates.duplicate = structuredClone(Object.values(db.pprWorkTemplates)[0]);
  const body = request(db); const before = structuredClone(db);
  assert.equal(savePlan(db, body, actor).error, "ppr_template_conflict");
  assert.deepEqual(db, before);
});
test("actual generic PUT catalog whitelist retains identity despite omission, forgery and reordering", () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const source = fs.readFileSync(require.resolve("../server.js"), "utf8");
  const start = source.indexOf('      const authenticatedRole = String(req.authUser?.role || "");');
  const end = source.indexOf("      if (body.clearRecordedData", start);
  assert.ok(start > 0 && end > start);
  const merge = vm.runInNewContext(`(db,body,req)=>{${source.slice(start, end)};return mergedCatalog;}`, {
    permissionBaseRoleServer: role => role, activeUserPermission: () => false, userHasAreaServer: () => true,
    REMOVED_EQUIPMENT_IDS: new Set(), normalizedCatalogNodeName: value => String(value).toLowerCase(),
    ensureCatalogNodeQrTokens: () => {}, mergeObjectRecords: (left, right) => ({ ...left, ...right })
  });
  for (const supplied of [undefined, { 0: { id: "forged", name: "Насос" } }]) {
    const db = seed(); db.catalog.equipment[90].pprNodeIds = { 0: { id: "trusted", name: "Привод" } };
    const raw = { ...db.catalog.equipment[90], nodes: ["Насос", "Подмена"], updatedAt: "2099-01-01", pprNodeIds: supplied };
    const result = merge(db, { catalog: { equipment: { 90: raw } } }, { authUser: actor });
    assert.deepEqual(result[90].pprNodeIds, db.catalog.equipment[90].pprNodeIds);
    assert.deepEqual(result[90].nodes, ["Привод", "Насос"]);
  }
  assert.match(source.match(/const CATALOG_NODE_INDEXED_FIELDS = \[[\s\S]*?\];/)?.[0] || "", /"pprNodeIds"/, "existing repair remapper includes stable PPR metadata");
});
test("actual editor preserves stable IDs in the request and clears stale IDs on target selection", async () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const window = { confirm: () => true, crypto: require("node:crypto") };
  vm.runInNewContext(fs.readFileSync(require.resolve("../modules/ppr-plan-editor.js"), "utf8"), { window, structuredClone });
  const button = () => ({ disabled: false, handlers: {}, addEventListener(event, callback) { this.handlers[event] = callback; } });
  const edit = button(), save = button(), select = { ...button(), dataset: { pprPlanTarget: "work" }, value: "" };
  const status = {};
  const element = { dataset: { pprSheetDate: date }, querySelector: selector => ({ "[data-ppr-plan-edit]": edit, "[data-ppr-plan-save]": save, "[data-ppr-plan-message]": status })[selector] || null,
    querySelectorAll: selector => selector === "[data-ppr-plan-target]" ? [select] : selector === "button, textarea, select" ? [edit, save, select] : [] };
  const container = { querySelectorAll: selector => selector === "[data-ppr-sheet-date]" ? [element] : [] };
  const db = seed(); await action(db, "rename", { nodeIndex: 0, node: "Привод 2" });
  let payload;
  const deps = { api: async () => planSnapshot(db, date), publish: async (_, body) => { payload = body; }, canPlan: () => true, rerender() {}, toast() {} };
  window.PprPlanEditor.bind(container, deps); await edit.handlers.click();
  window.PprPlanEditor.bind(container, deps);
  assert.match(window.PprPlanEditor.rowControls(date, db.pprSheets[date].rows[0], String), /Убрать/);
  await save.handlers.click();
  assert.equal(payload.rows[0].nodeId, db.pprSheets[date].rows[0].nodeId);
  await edit.handlers.click(); window.PprPlanEditor.bind(container, deps);
  select.handlers.change();
  assert.equal(window.PprPlanEditor.get(date).rows[0].nodeId, "");
  select.value = "0"; select.handlers.change();
  assert.equal(window.PprPlanEditor.get(date).rows[0].nodeId, window.PprPlanEditor.get(date).targets[0].nodeId);
});
