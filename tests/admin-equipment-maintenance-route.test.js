"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminEquipmentMaintenanceRoute } = require("../server/admin-equipment-maintenance-route");

function createHarness(database = {}) {
  const responses = [];
  const audits = [];
  const broadcasts = [];
  const handler = createAdminEquipmentMaintenanceRoute({
    broadcastState: (...args) => { broadcasts.push(args); return "state-v4"; },
    catalogNodeTombstone: (item, node, meta) => { (item.deletedNodes ||= []).push({ node, ...meta }); },
    enqueueStateWrite: async task => task(),
    normalizedAdminConfig: () => ({ trashRetentionDays: 30 }),
    normalizedCatalogNodeName: value => String(value).trim().toLocaleLowerCase("ru-RU"),
    passwordMatches: () => true,
    publicState: db => ({ catalog: db.catalog, gpmJournal: db.gpmJournal, checks: db.checks }),
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

test("equipment deletion archives the catalog item and linked GPM records", async () => {
  const database = {
    catalog: { equipment: { 5: { id: 5, name: "Кран", nodes: ["Мост"] } } },
    gpmJournal: { equipment: { g1: { id: "g1", sourceEquipmentId: 5 } } }
  };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  await handler({ method: "POST", authUser: { id: "a", name: "Админ", role: "editor" }, body: { equipmentId: 5, reason: "Замена" } }, {}, "/api/admin/equipment/delete");
  assert.equal(database.catalog.equipment[5].deleted, true);
  assert.equal(database.gpmJournal.equipment.g1.deleted, true);
  assert.equal(database.adminTrash[0].snapshot.gpmItems[0].id, "g1");
  assert.equal(audits[0].action, "equipment_moved_to_trash");
  assert.deepEqual(broadcasts[0].slice(0, 2), ["equipment-deleted", ""]);
  assert.equal(responses[0].payload.stateVersion, "state-v4");
});

test("GPM card deletion is server-side, password protected and moved to trash", async () => {
  const database = {
    gpmJournal: {
      equipment: { crane1: { id: "crane1", name: "Тестовая кран-балка" } },
      inspections: { i1: { id: "i1", gpmId: "crane1" } },
      events: { e1: { id: "e1", gpmId: "crane1" } }
    }
  };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  await handler({ method: "POST", authUser: { id: "a", name: "Админ", role: "editor" }, body: { gpmId: "crane1", reason: "Тестовая карточка", password: "secret" } }, {}, "/api/admin/gpm/delete");
  assert.equal(database.gpmJournal.equipment.crane1.deleted, true);
  assert.equal(database.gpmJournal.inspections.i1.deleted, true);
  assert.equal(database.gpmJournal.events.e1.deleted, true);
  assert.equal(database.adminTrash[0].type, "gpm");
  assert.equal(audits[0].action, "gpm_card_moved_to_trash");
  assert.deepEqual(broadcasts[0].slice(0, 2), ["gpm-card-deleted", ""]);
  assert.equal(responses[0].payload.ok, true);
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

test("node deletion archives its checks and shifts every linked index", async () => {
  const database = {
    checks: { "9:0:2026-08-01": { ok: true }, "9:1:2026-08-01": { ok: false }, "9:2:2026-08-01": { ok: true } },
    requests: { r1: { equipmentId: 9, nodeIndex: 1, node: "B" }, r2: { equipmentId: 9, nodeIndex: 2 } },
    downtimes: [{ equipmentId: 9, nodeIndex: 2 }],
    serviceCosts: [],
    qrWalkJournal: [{ equipmentId: 9, nodeIndex: 1 }],
    catalog: { equipment: { 9: { nodes: ["A", "B", "C"], qrTokens: { 0: "a", 1: "b", 2: "c" }, reminders: { 2: true } } } }
  };
  const { handler, responses, audits } = createHarness(database);
  await handler({ method: "POST", authUser: { role: "editor", name: "Админ" }, body: { equipmentId: 9, nodeIndex: 1, nodes: ["A", "B", "C"], equipment: "Пресс" } }, {}, "/api/admin/equipment/node-delete");
  assert.deepEqual(database.catalog.equipment[9].nodes, ["A", "C"]);
  assert.equal(database.catalog.equipment[9].qrTokens[1], "c");
  assert.equal(database.checks["9:1:2026-08-01"].ok, true);
  assert.equal(database.archivedNodeChecks.length, 1);
  assert.equal(database.requests.r1.archivedNode, true);
  assert.equal(database.requests.r2.nodeIndex, 1);
  assert.equal(database.downtimes[0].nodeIndex, 1);
  assert.equal(database.qrWalkJournal[0].archivedNode, true);
  assert.equal(audits[0].action, "equipment_node_deleted");
  assert.equal(responses[0].status, 200);
});
