"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createCraneBeamsRoute, ensureCraneBeams } = require("../server/crane-beams-route");

function harness(database) {
  const responses = [];
  const handler = createCraneBeamsRoute({
    enqueueStateWrite: fn => fn(), readBody: req => Promise.resolve(req.body || {}), readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }), writeDb: () => {}
  });
  return { handler, responses };
}

test("archived crane beams return as workshop equipment with both permanent QR identities", () => {
  const db = { catalog: { equipment: { 1: { name: "Пресс", area: "ЛПЦ" } } }, retiredCraneBeamArchive: { assets: [{ id: "kb-1", name: "Кран-балка ЛПЦ №1", lowerQr: "PPRGPM|SHIFT|kb-1", upperQr: "PPRGPM|MONTHLY|kb-1" }] } };
  assert.equal(ensureCraneBeams(db), true);
  assert.equal(db.craneBeams.assets["kb-1"].workshop, "ЛПЦ");
  assert.equal(db.craneBeams.assets["kb-1"].entityType, "workshopNode");
  assert.equal(db.craneBeams.assets["kb-1"].parentWorkshop, "ЛПЦ");
  assert.equal(db.craneBeams.assets["kb-1"].lowerQr, "PPRGPM|SHIFT|kb-1");
  assert.equal(db.craneBeams.assets["kb-1"].upperQr, "PPRGPM|MONTHLY|kb-1");
  assert.equal(Object.values(db.craneBeams.installationJournal).length, 1);
});

test("outside employee writes journal but does not close the workshop shift counter", async () => {
  const db = { craneBeams: { assets: { one: { id: "one", name: "Кран №1", workshop: "ЛПЦ", installed: true, checklistVersion: 1, checklist: [{ id: "a", label: "Тормоз" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
  const { handler, responses } = harness(db);
  await handler({ method: "POST", authUser: { id: "u", approved: true, role: "operator", name: "Оператор", area: "Другой цех" }, body: { craneId: "one", type: "shift", date: "2026-08-27", shift: "day", answers: { a: { ok: true } } } }, {}, "/api/crane-beams/inspect", new URL("http://test/api/crane-beams/inspect"));
  assert.equal(responses[0].status, 200);
  assert.equal(responses[0].payload.inspection.counterEligible, false);
  assert.equal(responses[0].payload.inspection.counterApplied, false);
});

test("shop operator closes shift once and monthly QR is restricted", async () => {
  const db = { craneBeams: { assets: { one: { id: "one", name: "Кран №1", workshop: "ЛПЦ", installed: true, checklistVersion: 1, checklist: [{ id: "a", label: "Тормоз" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
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
  const db = { craneBeams: { assets: { one: { id: "one", name: "Кран №1", workshop: "ЛПЦ", installed: true, checklistVersion: 1, checklist: [{ id: "a", label: "Тормоз" }, { id: "b", label: "Крюк" }] } }, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "retired-archive-v1" } };
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
  assert.match(app, /Кран-балка · собственный вахтенный журнал/);
  assert.match(app, /remote\.craneBeams/);
  assert.match(app, /eq\.craneBeamNodes/);
  assert.doesNotMatch(app, /КРАН-БАЛКИ · УЗЛЫ ЦЕХА/);
  assert.doesNotMatch(app, /function renderCraneNodesInsideWorkshops/);
  assert.doesNotMatch(app, /function renderCraneBeamNodeCards/);
  assert.doesNotMatch(app, /async function openCraneBeams/);
});

test("legacy GPM parent is replaced from the crane beam name", () => {
  const db = { catalog: { equipment: { 4: { name: "Покрасочный цех", area: "Покрасочный цех", nodes: ["Щит"] }, 8: { name: "инструментальный цех", area: "Инструментальный цех", nodes: ["Станок"] } } }, craneBeams: { migrationVersion: "retired-archive-v1", assets: { a: { id: "a", name: "Кран балка N6 покраска ванна", workshop: "ГПМ" }, b: { id: "b", name: "Кран-балка N 11 цианизация инструментальный", workshop: "ГПМ" } }, inspections: {}, defects: {}, installationJournal: {} } };
  ensureCraneBeams(db);
  assert.equal(db.craneBeams.assets.a.parentWorkshop, "Покрасочный цех");
  assert.equal(db.craneBeams.assets.b.parentWorkshop, "инструментальный цех");
  assert.deepEqual(db.catalog.equipment[4].nodes, ["Щит", "Кран балка N6 покраска ванна"]);
  assert.equal(db.catalog.equipment[4].craneBeamNodes[1], "a");
});
