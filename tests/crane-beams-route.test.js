"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createCraneBeamsRoute, ensureCraneBeams } = require("../server/crane-beams-route");

function harness(database, builtInEquipment = {}) {
  const responses = [];
  const handler = createCraneBeamsRoute({
    builtInEquipment,
    enqueueStateWrite: fn => fn(), readBody: req => Promise.resolve(req.body || {}), readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }), writeDb: () => {}
  });
  return { handler, responses };
}

test("archived crane beams return as workshop equipment with both permanent QR identities", () => {
  const db = { catalog: { equipment: { 1: { name: "Пресс", area: "ЛПЦ" } } }, retiredCraneBeamArchive: { assets: [{ id: "kb-1", name: "Кран-балка ЛПЦ №1", lowerQr: "PPRGPM|SHIFT|kb-1", upperQr: "PPRGPM|MONTHLY|kb-1" }] } };
  assert.equal(ensureCraneBeams(db), true);
  assert.equal(db.craneBeams.assets["kb-1"].workshop, "ЛПЦ");
  assert.equal(db.craneBeams.assets["kb-1"].entityType, "nestedEquipment");
  assert.equal(db.craneBeams.assets["kb-1"].parentEquipmentId, "1");
  assert.equal(db.craneBeams.assets["kb-1"].parentWorkshop, "ЛПЦ");
  assert.equal(db.craneBeams.assets["kb-1"].lowerQr, "PPRGPM|SHIFT|kb-1");
  assert.equal(db.craneBeams.assets["kb-1"].upperQr, "PPRGPM|MONTHLY|kb-1");
  assert.equal(Object.values(db.craneBeams.installationJournal).length, 1);
});

test("outside employee writes journal but does not close the workshop shift counter", async () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран №1", workshop: "ЛПЦ", installed: true, checklistVersion: 1, checklistSchemaVersion: 2, checklist: [{ id: "a", label: "Тормоз" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  const { handler, responses } = harness(db);
  await handler({ method: "POST", authUser: { id: "u", approved: true, role: "operator", name: "Оператор", area: "Другой цех" }, body: { craneId: "one", type: "shift", date: "2026-08-27", shift: "day", answers: { a: { ok: true } } } }, {}, "/api/crane-beams/inspect", new URL("http://test/api/crane-beams/inspect"));
  assert.equal(responses[0].status, 200);
  assert.equal(responses[0].payload.inspection.counterEligible, false);
  assert.equal(responses[0].payload.inspection.counterApplied, false);
});

test("shop operator closes shift once and monthly QR is restricted", async () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран №1", workshop: "ЛПЦ", installed: true, checklistVersion: 1, checklistSchemaVersion: 2, checklist: [{ id: "a", label: "Тормоз" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  const h = harness(db);
  const body = { craneId: "one", type: "shift", date: "2026-08-27", shift: "day", answers: { a: { ok: true } } };
  await h.handler({ method: "POST", authUser: { id: "u", role: "operator", name: "Оператор", area: "ЛПЦ" }, body }, {}, "/api/crane-beams/inspect", new URL("http://test"));
  await h.handler({ method: "POST", authUser: { id: "u", role: "operator", name: "Оператор", area: "ЛПЦ" }, body }, {}, "/api/crane-beams/inspect", new URL("http://test"));
  assert.equal(h.responses[0].payload.inspection.counterApplied, true);
  assert.equal(h.responses[1].payload.inspection.counterApplied, false);
  const forbidden = harness(db);
  await forbidden.handler({ method: "POST", authUser: { id: "u", role: "operator", area: "ЛПЦ" }, body: { ...body, type: "monthly" } }, {}, "/api/crane-beams/inspect", new URL("http://test"));
  assert.equal(forbidden.responses[0].status, 403);
});

test("unchecked points require comments and create one grouped defect", async () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран №1", workshop: "ЛПЦ", installed: true, checklistVersion: 1, checklistSchemaVersion: 2, checklist: [{ id: "a", label: "Тормоз" }, { id: "b", label: "Крюк" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  const h = harness(db);
  await h.handler({ method: "POST", authUser: { id: "m", role: "mechanic", name: "Механик" }, body: { craneId: "one", type: "monthly", date: "2026-08-27", answers: { a: { ok: false, comment: "Износ" }, b: { ok: true } } } }, {}, "/api/crane-beams/inspect", new URL("http://test"));
  assert.equal(h.responses[0].status, 200);
  assert.equal(Object.values(db.craneBeams.defects).length, 1);
  assert.equal(Object.values(db.craneBeams.defects)[0].items.length, 1);
});

test("crane beams are rendered as workshop nodes without a separate home section", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.doesNotMatch(html, /id="craneBeamsButton"/);
  assert.match(app, /function nestedCraneEquipmentCard/);
  assert.match(app, /Вложенное оборудование/);
  assert.match(app, /Обычный узел кран-балки/);
  assert.match(app, /Вахтенный журнал/);
  assert.match(app, /Два QR-кода/);
  assert.match(app, /ordinaryNodeIndexes/);
  assert.match(app, /Внутри оборудования/);
  assert.match(app, /name="parentEquipmentId"/);
  assert.match(app, /craneInspectionDraftKey/);
  assert.match(app, /Черновик восстановлен/);
  assert.match(app, /capture="environment"/);
  assert.match(app, /shift: inspectionShift\.key/);
  assert.match(app, /function craneMonthlyCalendarItems/);
  assert.match(app, /Карточка обычного ППР не заполняется/);
  assert.match(app, /выполнить верхним QR/);
  assert.match(app, /remote\.craneBeams/);
  assert.doesNotMatch(app, /КРАН-БАЛКИ · УЗЛЫ ЦЕХА/);
  assert.doesNotMatch(app, /КРАН-БАЛКИ · УЗЛЫ ЦЕХА/);
  assert.doesNotMatch(app, /function renderCraneNodesInsideWorkshops/);
  assert.doesNotMatch(app, /function renderCraneBeamNodeCards/);
  assert.doesNotMatch(app, /function craneWorkshopEquipmentRow/);
  assert.doesNotMatch(app, /function craneMainScheduleRow/);
  assert.doesNotMatch(app, /async function openCraneBeams/);
});

test("legacy GPM placement is resolved but crane beams are not inserted into ordinary nodes", () => {
  const db = { catalog: { equipment: { 4: { name: "Покрасочный цех", area: "Покрасочный цех", nodes: ["Щит"] }, 8: { name: "инструментальный цех", area: "Инструментальный цех", nodes: ["Станок"] } } }, craneBeams: { migrationVersion: "retired-archive-v1", assets: { a: { id: "a", name: "Кран балка N6 покраска ванна", workshop: "ГПМ" }, b: { id: "b", name: "Кран-балка N 11 цианизация инструментальный", workshop: "ГПМ" } }, inspections: {}, defects: {}, installationJournal: {} } };
  ensureCraneBeams(db);
  assert.equal(db.craneBeams.assets.a.parentWorkshop, "Покрасочный цех");
  assert.equal(db.craneBeams.assets.b.parentWorkshop, "Инструментальный цех");
  assert.equal(db.craneBeams.assets.a.entityType, "nestedEquipment");
  assert.equal(db.craneBeams.assets.a.parentEquipmentId, "4");
  assert.deepEqual(db.catalog.equipment[4].nodes, ["Щит"]);
  assert.equal(db.catalog.equipment[4].craneBeamNodes, undefined);
});

test("finish saw stays an ordinary press node and is removed only from crane assets", () => {
  const saw = "Финишный пила (экран управление,лапа,размер проф)";
  const db = {
    catalog: { equipment: { 1: { name: "Пресс 2400 EGE", area: "Прессовый участок", nodes: [saw], craneBeamNodes: { 0: "saw" } } } },
    craneBeams: {
      migrationVersion: "retired-archive-v1",
      assets: { saw: { id: "saw", name: saw, workshop: "Прессовый участок" } },
      inspections: {}, defects: {}, installationJournal: {}
    }
  };
  ensureCraneBeams(db);
  assert.equal(db.craneBeams.assets.saw, undefined);
  assert.deepEqual(db.catalog.equipment[1].nodes, [saw]);
  assert.equal(db.catalog.equipment[1].craneBeamNodes, undefined);
});

test("prohibition remains visible until repair is confirmed by an engineer", async () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран", workshop: "ЛПЦ", installed: true, checklistVersion: 2, checklistSchemaVersion: 2, checklist: [{ id: "a", label: "Тормоз" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  const h = harness(db);
  await h.handler({ method: "POST", authUser: { id: "u", role: "operator", area: "ЛПЦ", name: "Оператор" }, body: { craneId: "one", type: "shift", date: "2026-08-27", shift: "day", decision: "prohibited", answers: { a: { ok: false, comment: "Не держит тормоз" } } } }, {}, "/api/crane-beams/inspect", new URL("http://test"));
  const defect = Object.values(db.craneBeams.defects)[0];
  assert.equal(db.craneBeams.assets.one.operationStatus, "prohibited");
  await h.handler({ method: "POST", authUser: { id: "m", role: "mechanic", name: "Электромеханик" }, body: { defectId: defect.id, action: "resolve", comment: "Тормоз заменён", parts: "Колодка 1 шт." } }, {}, "/api/crane-beams/defect", new URL("http://test"));
  assert.equal(db.craneBeams.assets.one.operationStatus, "prohibited");
  assert.equal(Object.values(db.craneBeams.installationJournal)[0].parts, "Колодка 1 шт.");
  await h.handler({ method: "POST", authUser: { id: "e", role: "engineer", name: "Инженер" }, body: { defectId: defect.id, action: "confirm", comment: "Проверено" } }, {}, "/api/crane-beams/defect", new URL("http://test"));
  assert.equal(db.craneBeams.assets.one.operationStatus, "allowed");
});

test("upper QR closes the monthly counter once for engineers but never for admin", async () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран №1", workshop: "ЛПЦ", installed: true, checklistVersion: 2, checklistSchemaVersion: 2, checklist: [{ id: "a", label: "Тормоз" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  const body = { craneId: "one", type: "monthly", date: "2026-08-27", answers: { a: { ok: true } } };
  const h = harness(db);
  await h.handler({ method: "POST", authUser: { id: "e", role: "engineer", name: "Инженер" }, body }, {}, "/api/crane-beams/inspect", new URL("http://test"));
  await h.handler({ method: "POST", authUser: { id: "m", role: "mechanic", name: "Электромеханик" }, body }, {}, "/api/crane-beams/inspect", new URL("http://test"));
  assert.equal(h.responses[0].payload.inspection.counterApplied, true);
  assert.equal(h.responses[1].payload.inspection.counterApplied, false);
  const admin = harness(db);
  await admin.handler({ method: "POST", authUser: { id: "a", role: "editor", name: "Админ" }, body }, {}, "/api/crane-beams/inspect", new URL("http://test"));
  assert.equal(admin.responses[0].status, 403);
});

test("admin-selected parent equipment wins over words in the crane name", async () => {
  const db = { catalog: { equipment: {} }, craneBeams: { assets: {}, inspections: {}, defects: {}, installationJournal: {}, unresolvedArchive: {}, migrationVersion: "retired-archive-v1" } };
  const builtIn = {
    1: { id: 1, name: "Пресс 2400 EGE", area: "Прессовый участок", nodes: [] },
    3: { id: 3, name: "Литейный цех", area: "Литейный цех", nodes: [] }
  };
  const h = harness(db, builtIn);
  await h.handler({ method: "POST", authUser: { id: "admin", role: "editor", name: "Админ" }, body: { name: "Кран-балка 2400 после переноса", workshop: "Литейный цех", parentEquipmentId: "3", installationStatus: "installed" } }, {}, "/api/crane-beams/save", new URL("http://test"));
  assert.equal(h.responses[0].status, 200);
  assert.equal(h.responses[0].payload.asset.parentEquipmentId, "3");
  assert.equal(h.responses[0].payload.asset.workshop, "Литейный цех");
});

test("admin correction requires a reason and preserves before and after snapshots", async () => {
  const inspection = { id: "inspection-1", craneId: "one", type: "shift", date: "2026-08-27", shift: "day", actor: { name: "Старое имя", role: "operator" }, answers: [{ id: "a", label: "Тормоз", ok: true, comment: "" }], result: "good", decision: "allowed" };
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран", workshop: "ЛПЦ", parentEquipmentId: "1", checklistSchemaVersion: 2, checklist: [{ id: "a", label: "Тормоз" }] } }, inspections: { "inspection-1": inspection }, defects: {}, installationJournal: {}, corrections: {}, unresolvedArchive: {}, migrationVersion: "retired-archive-v1" } };
  const missing = harness(db);
  await missing.handler({ method: "POST", authUser: { id: "admin", role: "editor" }, body: { inspectionId: "inspection-1", actorName: "Новое имя" } }, {}, "/api/crane-beams/correct", new URL("http://test"));
  assert.equal(missing.responses[0].status, 400);
  const h = harness(db);
  await h.handler({ method: "POST", authUser: { id: "admin", role: "editor", name: "Админ" }, body: { inspectionId: "inspection-1", reason: "Исправление ошибки", actorName: "Новое имя", answers: { a: { ok: false, comment: "Износ" } } } }, {}, "/api/crane-beams/correct", new URL("http://test"));
  assert.equal(h.responses[0].status, 200);
  assert.equal(h.responses[0].payload.correction.before.actor.name, "Старое имя");
  assert.equal(h.responses[0].payload.correction.after.actor.name, "Новое имя");
  assert.equal(h.responses[0].payload.inspection.result, "remark");
});
test("unresolved crane stays in protected archive instead of an arbitrary workshop", () => {
  const db = { catalog: { equipment: { 1: { name: "Пресс", area: "Прессовый участок", nodes: [] } } }, retiredCraneBeamArchive: { assets: [{ id: "mystery", name: "Кран-балка без цеха" }] } };
  ensureCraneBeams(db);
  assert.equal(db.craneBeams.assets.mystery, undefined);
  assert.equal(db.craneBeams.unresolvedArchive.mystery.archiveStatus, "workshop_unresolved");
});

test("protected crane is restored when the built-in workshop reference becomes available", () => {
  const db = { craneBeams: { assets: {}, inspections: {}, defects: {}, installationJournal: {}, unresolvedArchive: { kb: { id: "kb", name: "Кран-балка Пресс 2400", workshop: "Прессовый участок", lowerQr: "old-lower", upperQr: "old-upper" } }, migrationVersion: "retired-archive-v1" } };
  ensureCraneBeams(db, { 1: { id: 1, name: "Пресс 2400 EGE", area: "Прессовый участок", nodes: [] } });
  assert.equal(db.craneBeams.unresolvedArchive.kb, undefined);
  assert.equal(db.craneBeams.assets.kb.parentEquipmentId, "1");
  assert.equal(db.craneBeams.assets.kb.lowerQr, "old-lower");
  assert.equal(db.craneBeams.assets.kb.upperQr, "old-upper");
});

test("new crane checklist contains the specified 16 inspection points", () => {
  const db = { catalog: { equipment: { 1: { name: "Пресс 2400 EGE", area: "Прессовый участок", nodes: [] } } }, retiredCraneBeamArchive: { assets: [{ id: "kb", name: "Кран-балка Пресс 2400" }] } };
  ensureCraneBeams(db);
  assert.equal(db.craneBeams.assets.kb.checklist.length, 16);
  assert.equal(db.craneBeams.assets.kb.checklist[0].label, "Металлоконструкция и крепления");
  assert.equal(db.craneBeams.assets.kb.checklist[15].label, "Рабочая зона и путь перемещения");
});

test("current legacy checklist upgrades to 16 points while its old version is retained", () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { kb: { id: "kb", name: "Кран", workshop: "ЛПЦ", checklistVersion: 1, checklist: [{ id: "old", label: "Старый пункт" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  ensureCraneBeams(db);
  assert.equal(db.craneBeams.assets.kb.checklist.length, 16);
  assert.equal(db.craneBeams.assets.kb.checklistHistory[0].checklist[0].label, "Старый пункт");
  assert.equal(db.craneBeams.assets.kb.checklistSchemaVersion, 2);
});

test("archived ordinary-node QR identities remain aliases of the restored crane", () => {
  const db = { catalog: { equipment: { 7: { name: "Литейный цех", area: "Литейный цех", nodes: [] } } }, retiredCraneBeamArchive: { assets: [{ id: "catalog:7:3", name: "Кран-балка литейного цеха", workshop: "Литейный цех", sourceEquipmentId: 7, lowerQrToken: "low-token", upperQrToken: "top-token" }] } };
  ensureCraneBeams(db);
  assert.deepEqual(db.craneBeams.assets["catalog:7:3"].legacyQrAliases, [
    { type: "shift", payload: "PPRQR|NODE|7|3|low-token" },
    { type: "monthly", payload: "PPRQR|NODE|7|3|top-token|upper" }
  ]);
});

test("undo removes generated nested catalog equipment but keeps crane assets and journals", () => {
  const db = {
    catalog: { equipment: {
      18: { name: "Сгп", area: "сгп", nodes: ["ЩИТ"], childEquipmentIds: [1002] },
      1002: { id: 1002, name: "Кран N2", equipmentKind: "craneBeam", parentEquipmentId: 18, craneBeamId: "kb" }
    } },
    craneBeams: { migrationVersion: "retired-archive-v1", assets: { kb: { id: "kb", name: "Кран балка N2 СГП северная", workshop: "Сгп", catalogEquipmentId: 1002 } }, inspections: { one: { id: "one", craneId: "kb" } }, defects: {}, installationJournal: {} }
  };
  ensureCraneBeams(db);
  assert.equal(db.catalog.equipment[1002], undefined);
  assert.deepEqual(db.catalog.equipment[18].childEquipmentIds, []);
  assert.equal(db.craneBeams.assets.kb.catalogEquipmentId, undefined);
  assert.equal(db.craneBeams.inspections.one.craneId, "kb");
});

test("admin pause requires a reason and records a closed stop period on resume", async () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран", workshop: "ЛПЦ", installed: true, installationStatus: "installed", checklistSchemaVersion: 2, checklist: [{ id: "a", label: "Тормоз" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  const missing = harness(db);
  await missing.handler({ method: "POST", authUser: { id: "admin", role: "editor" }, body: { craneId: "one", action: "pause" } }, {}, "/api/crane-beams/pause", new URL("http://test"));
  assert.equal(missing.responses[0].status, 400);
  const h = harness(db);
  await h.handler({ method: "POST", authUser: { id: "admin", role: "editor", name: "Админ" }, body: { craneId: "one", action: "pause", reason: "Ремонт" } }, {}, "/api/crane-beams/pause", new URL("http://test"));
  assert.equal(db.craneBeams.assets.one.operationalPaused, true);
  assert.equal(db.craneBeams.assets.one.pausePeriods[0].reason, "Ремонт");
  await h.handler({ method: "POST", authUser: { id: "admin", role: "editor", name: "Админ" }, body: { craneId: "one", action: "resume" } }, {}, "/api/crane-beams/pause", new URL("http://test"));
  assert.equal(db.craneBeams.assets.one.operationalPaused, false);
  assert.ok(db.craneBeams.assets.one.pausePeriods[0].to);
});

test("admin archive uses a recoverable trash and preserves the installation journal", async () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран", workshop: "ЛПЦ", parentEquipmentId: "1", installed: true, installationStatus: "installed", checklistSchemaVersion: 2, checklist: [] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  const h = harness(db);
  await h.handler({ method: "POST", authUser: { id: "admin", role: "editor", name: "Админ" }, body: { craneId: "one", action: "archive", reason: "Демонтаж" } }, {}, "/api/crane-beams/archive", new URL("http://test"));
  assert.equal(h.responses[0].payload.state.assets.length, 0);
  assert.equal(h.responses[0].payload.state.archivedAssets.length, 1);
  assert.equal(Object.values(db.craneBeams.installationJournal)[0].action, "archived");
  await h.handler({ method: "POST", authUser: { id: "admin", role: "editor", name: "Админ" }, body: { craneId: "one", action: "restore" } }, {}, "/api/crane-beams/archive", new URL("http://test"));
  assert.equal(h.responses[1].payload.state.assets.length, 1);
  assert.equal(db.craneBeams.assets.one.installed, true);
});

test("lower and upper QR identities rotate independently", async () => {
  const db = { catalog: { equipment: { 1: { name: "ЛПЦ", area: "ЛПЦ", nodes: [] } } }, craneBeams: { assets: { one: { id: "one", name: "Кран", workshop: "ЛПЦ", installed: true, checklistSchemaVersion: 2, checklist: [] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  ensureCraneBeams(db);
  const oldLower = db.craneBeams.assets.one.lowerQrToken, oldUpper = db.craneBeams.assets.one.upperQrToken;
  const h = harness(db);
  await h.handler({ method: "POST", authUser: { id: "admin", role: "editor" }, body: { craneId: "one", kind: "shift" } }, {}, "/api/crane-beams/qr-rotate", new URL("http://test"));
  assert.notEqual(db.craneBeams.assets.one.lowerQrToken, oldLower);
  assert.equal(db.craneBeams.assets.one.upperQrToken, oldUpper);
  assert.equal(db.craneBeams.assets.one.lowerQrRotated, true);
});

test("client exposes lifecycle controls, recoverable trash, and tokenized dual QR", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /Остановить с причиной/);
  assert.match(app, /Корзина кран-балок/);
  assert.match(app, /Заменить только нижний QR/);
  assert.match(app, /Заменить только верхний QR/);
  assert.match(app, /lowerQrToken/);
  assert.match(app, /upperQrToken/);
  assert.doesNotMatch(app, /name="operationalPaused"/);
});
