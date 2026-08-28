"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminEquipmentMaintenanceRoute } = require("../server/admin-equipment-maintenance-route");

function createHarness(database = {}, options = {}) {
  const responses = [];
  const audits = [];
  const broadcasts = [];
  const handler = createAdminEquipmentMaintenanceRoute({
    broadcastState: (...args) => { broadcasts.push(args); return "state-v4"; },
    builtInEquipmentIds: options.builtInEquipmentIds || new Set(),
    catalogNodeTombstone: (item, node, meta) => { (item.deletedNodes ||= []).push({ node, ...meta }); },
    enqueueStateWrite: async task => task(),
    normalizedAdminConfig: () => ({ trashRetentionDays: 30 }),
    normalizedCatalogNodeName: value => String(value).trim().toLocaleLowerCase("ru-RU"),
    passwordMatches: () => true,
    publicState: db => ({ catalog: db.catalog, checks: db.checks }),
    randomBytes: size => Buffer.alloc(size, size),
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => audits.push(audit)
  });
  return { handler, responses, audits, broadcasts, database };
}

test("equipment maintenance route ignores unrelated requests and protects access", async () => {
  const { handler, responses, audits } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/admin/equipment/node-add"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
  assert.deepEqual(audits, []);
});

test("equipment deletion requires a reason before changing state", async () => {
  const { handler, responses, audits, broadcasts } = createHarness({});
  await handler({ method: "POST", authUser: { role: "editor" }, body: { equipmentId: 1 } }, {}, "/api/admin/equipment/delete");
  assert.deepEqual(responses[0], { status: 400, payload: { ok: false, error: "equipment_delete_invalid" } });
  assert.deepEqual(audits, []);
  assert.deepEqual(broadcasts, []);
});

test("equipment deletion archives the catalog item", async () => {
  const database = { catalog: { equipment: { 5: { id: 5, name: "Станок", nodes: ["Привод"] } } } };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  await handler({ method: "POST", authUser: { id: "a", name: "Админ", role: "editor" }, body: { equipmentId: 5, reason: "Замена" } }, {}, "/api/admin/equipment/delete");
  assert.equal(database.catalog.equipment[5].deleted, true);
  assert.equal(database.adminTrash[0].snapshot.catalogItem.id, 5);
  assert.equal(audits[0].action, "equipment_moved_to_trash");
  assert.deepEqual(broadcasts[0].slice(0, 2), ["equipment-deleted", ""]);
  assert.equal(responses[0].payload.stateVersion, "state-v4");
});

test("equipment deletion rejects an unknown id instead of creating a false trash record", async () => {
  const database = { catalog: { equipment: {} } };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  await handler({ method: "POST", authUser: { role: "editor" }, body: { equipmentId: 9999, reason: "Удаление", password: "secret" } }, {}, "/api/admin/equipment/delete");
  assert.deepEqual(responses[0], { status: 404, payload: { ok: false, error: "equipment_not_found" } });
  assert.equal(database.catalog.equipment[9999], undefined);
  assert.equal(database.adminTrash, undefined);
  assert.deepEqual(audits, []);
  assert.deepEqual(broadcasts, []);
});

test("admin can delete a built-in equipment missing from the server catalog", async () => {
  const database = { catalog: { equipment: {} } };
  const { handler, responses } = createHarness(database, { builtInEquipmentIds: new Set(["20"]) });
  await handler({ method: "POST", authUser: { id: "admin", name: "Админ", role: "editor" }, body: { equipmentId: 20, equipment: "оборудование 20", area: "Резерв", nodes: ["Основное оборудование"], reason: "Не используется", password: "secret" } }, {}, "/api/admin/equipment/delete");
  assert.equal(responses[0].status, 200);
  assert.equal(database.catalog.equipment[20].deleted, true);
  assert.equal(database.catalog.equipment[20].builtIn, true);
  assert.equal(database.adminTrash[0].targetId, "20");
});

test("node addition rejects duplicates and then assigns a QR identity", async () => {
  const database = { catalog: { equipment: { 6: { nodes: ["Редуктор"] } } } };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  const authUser = { role: "editor" };
  await handler({ method: "POST", authUser, body: { equipmentId: 6, node: " редуктор ", nodes: ["Редуктор"] } }, {}, "/api/admin/equipment/node-add");
  await handler({ method: "POST", authUser, body: { equipmentId: 6, node: "Двигатель", nodes: ["Редуктор"] } }, {}, "/api/admin/equipment/node-add");
  assert.equal(responses[0].payload.error, "node_already_exists");
  assert.equal(responses[1].payload.nodeIndex, 1);
  assert.equal(database.catalog.equipment[6].qrTokens[1], "0c0c0c0c0c0c0c0c0c0c0c0c");
  assert.equal(audits[0].action, "equipment_node_added");
  assert.deepEqual(broadcasts[0].slice(0, 2), ["equipment-node-added", ""]);
});

test("node deletion archives its checks and shifts every current linked index", async () => {
  const database = {
    checks: { "9:0:2026-08-01": { ok: true }, "9:1:2026-08-01": { ok: false }, "9:2:2026-08-01": { ok: true } },
    downtimes: [{ equipmentId: 9, nodeIndex: 2 }],
    qrWalkJournal: [{ equipmentId: 9, nodeIndex: 1 }],
    catalog: { equipment: { 9: { nodes: ["A", "B", "C"], qrTokens: { 0: "a", 1: "b", 2: "c" }, reminders: { 2: true } } } }
  };
  const { handler, responses, audits } = createHarness(database);
  await handler({ method: "POST", authUser: { role: "editor", name: "Админ" }, body: { equipmentId: 9, nodeIndex: 1, nodes: ["A", "B", "C"], equipment: "Пресс" } }, {}, "/api/admin/equipment/node-delete");
  assert.deepEqual(database.catalog.equipment[9].nodes, ["A", "C"]);
  assert.equal(database.catalog.equipment[9].qrTokens[1], "c");
  assert.equal(database.checks["9:1:2026-08-01"].ok, true);
  assert.equal(database.archivedNodeChecks.length, 1);
  assert.equal(database.downtimes[0].nodeIndex, 1);
  assert.equal(database.qrWalkJournal[0].archivedNode, true);
  assert.equal(audits[0].action, "equipment_node_deleted");
  assert.equal(responses[0].status, 200);
});
