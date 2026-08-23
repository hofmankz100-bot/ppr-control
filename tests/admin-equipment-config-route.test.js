"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminEquipmentConfigRoute } = require("../server/admin-equipment-config-route");

function createHarness(database = {}) {
  const responses = [];
  const audits = [];
  const broadcasts = [];
  const handler = createAdminEquipmentConfigRoute({
    broadcastState: (...args) => { broadcasts.push(args); return "state-v3"; },
    enqueueStateWrite: async task => task(),
    now: () => new Date("2026-08-24T08:00:00.000Z"),
    publicState: db => ({ catalog: db.catalog, gpmJournal: db.gpmJournal }),
    randomBytes: size => Buffer.alloc(size, size),
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => audits.push(audit)
  });
  return { handler, responses, audits, broadcasts, database };
}

test("equipment config route ignores unrelated requests and protects access", async () => {
  const { handler, responses, audits } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/admin/equipment/create"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
  assert.deepEqual(audits, []);
});

test("equipment creation validates required fields and duplicates", async () => {
  const database = { catalog: { equipment: { 1000: { name: "Пресс", area: "Цех" } } } };
  const { handler, responses, broadcasts } = createHarness(database);
  const authUser = { role: "editor" };
  await handler({ method: "POST", authUser, body: { name: "", area: "Цех" } }, {}, "/api/admin/equipment/create");
  await handler({ method: "POST", authUser, body: { name: " пресс ", area: "ЦЕХ" } }, {}, "/api/admin/equipment/create");
  assert.deepEqual(responses.map(item => item.payload.error), ["equipment_create_invalid", "equipment_already_exists"]);
  assert.deepEqual(broadcasts, []);
});

test("equipment creation stores an ordinary item and broadcasts public state", async () => {
  const database = { catalog: { equipment: { 1002: { name: "Старое", area: "Цех" } } } };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  const authUser = { id: "admin", name: "Рамазан", role: "editor" };
  await handler({ method: "POST", authUser, body: { name: "Новый пресс", area: "ЛПЦ", firstNode: "Редуктор" } }, {}, "/api/admin/equipment/create");
  const item = database.catalog.equipment[1003];
  assert.deepEqual(item.nodes, ["Редуктор"]);
  assert.equal(item.qrTokens[0], "0c0c0c0c0c0c0c0c0c0c0c0c");
  assert.equal(item.createdAt, "2026-08-24T08:00:00.000Z");
  assert.equal(audits[0].action, "equipment_created");
  assert.deepEqual(broadcasts[0].slice(0, 2), ["equipment-created", ""]);
  assert.equal(responses[0].payload.stateVersion, "state-v3");
});

test("forklift creation links a GPM item with a weekday due date", async () => {
  const database = {};
  const { handler, responses } = createHarness(database);
  await handler({ method: "POST", authUser: { role: "editor" }, body: { type: "forklift", name: "Погрузчик", area: "Склад", capacity: "5 т" } }, {}, "/api/admin/equipment/create");
  const gpm = database.gpmJournal.equipment[responses[0].payload.gpmId];
  assert.equal(gpm.sourceEquipmentId, 1000);
  assert.equal(gpm.nextMonthlyInspectionDate, "2026-09-23");
  assert.equal(gpm.nextMaintenanceDate, "2026-09-23");
});

test("journal schema is normalized, versioned and audited", async () => {
  const database = { catalog: { equipment: { 7: { created: true, equipmentKind: "ordinary", nodes: ["A", "B"], journalSchema: { version: 2 } } } } };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  await handler({
    method: "POST",
    authUser: { role: "editor", name: "Админ" },
    body: {
      equipmentId: 7,
      title: " Обход ",
      scope: "node",
      journalNodeIndex: 1,
      resultMode: "none",
      fieldsTiming: "afterChoice",
      columns: [{ id: "bad id!", label: " Результат ", type: "select", options: "Да; Нет" }]
    }
  }, {}, "/api/admin/equipment/journal-schema");
  const schema = database.catalog.equipment[7].journalSchema;
  assert.equal(schema.version, 3);
  assert.equal(schema.nodeIndex, 1);
  assert.equal(schema.fieldsTiming, "immediate");
  assert.deepEqual(schema.columns[0].options, ["Да", "Нет"]);
  assert.equal(audits[0].action, "equipment_journal_schema_updated");
  assert.deepEqual(broadcasts[0].slice(0, 2), ["equipment-journal-schema-updated", ""]);
  assert.equal(responses[0].payload.stateVersion, "state-v3");
});

test("journal schema rejects missing and protected equipment", async () => {
  const database = { catalog: { equipment: { 8: { created: false, equipmentKind: "ordinary", nodes: ["A"] } } } };
  const { handler, responses, audits } = createHarness(database);
  const base = { title: "Обход", columns: [{ label: "Поле", type: "text" }] };
  await handler({ method: "POST", authUser: { role: "editor" }, body: { ...base, equipmentId: 9 } }, {}, "/api/admin/equipment/journal-schema");
  await handler({ method: "POST", authUser: { role: "editor" }, body: { ...base, equipmentId: 8 } }, {}, "/api/admin/equipment/journal-schema");
  assert.deepEqual(responses.map(item => [item.status, item.payload.error]), [[404, "equipment_not_found"], [409, "journal_schema_protected"]]);
  assert.deepEqual(audits, []);
});
