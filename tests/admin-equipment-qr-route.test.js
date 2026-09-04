"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminEquipmentQrRoute } = require("../server/admin-equipment-qr-route");

function createHarness(database = {}) {
  const responses = [];
  const audits = [];
  const broadcasts = [];
  const handler = createAdminEquipmentQrRoute({
    broadcastState: (...args) => { broadcasts.push(args); return "state-v2"; },
    enqueueStateWrite: async task => task(),
    randomBytes: size => { assert.equal(size, 12); return Buffer.from("00112233445566778899aabb", "hex"); },
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => audits.push(audit),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, audits, broadcasts, database };
}

test("equipment QR route ignores unrelated requests and protects access", async () => {
  const { handler, responses, audits, broadcasts } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/admin/equipment/node-qr-rotate"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
  assert.deepEqual(audits, []);
  assert.deepEqual(broadcasts, []);
});

test("equipment QR route rejects invalid coordinates before state access", async () => {
  const { handler, responses, audits } = createHarness();
  const authUser = { role: "editor" };
  for (const body of [{ equipmentId: "bad", nodeIndex: 0 }, { equipmentId: 1, nodeIndex: -1 }, { equipmentId: 1, nodeIndex: 1.5 }]) {
    await handler({ method: "POST", authUser, body }, {}, "/api/admin/equipment/node-qr-rotate");
  }
  assert.deepEqual(responses.map(item => item.payload.error), ["node_qr_rotate_invalid", "node_qr_rotate_invalid", "node_qr_rotate_invalid"]);
  assert.deepEqual(audits, []);
});

test("equipment QR route reports a missing node without broadcasting", async () => {
  const database = { catalog: { equipment: { 1: { nodes: ["Узел 1"] } } } };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  await handler({ method: "POST", authUser: { role: "editor" }, body: { equipmentId: 1, nodeIndex: 3 } }, {}, "/api/admin/equipment/node-qr-rotate");
  assert.deepEqual(responses[0], { status: 404, payload: { ok: false, error: "node_not_found" } });
  assert.deepEqual(audits, []);
  assert.deepEqual(broadcasts, []);
});

test("equipment QR route rotates only the selected node and broadcasts its patch", async () => {
  const database = {
    catalog: { equipment: { 7: { id: 7, nodes: ["Первый", "Второй"], qrTokens: { 0: "keep", 1: "old" }, qrUpdatedAt: { 0: "old-date" } } } }
  };
  const { handler, responses, audits, broadcasts } = createHarness(database);
  const authUser = { id: "admin-1", role: "editor" };
  await handler({ method: "POST", authUser, body: { equipmentId: 7, nodeIndex: 1 } }, {}, "/api/admin/equipment/node-qr-rotate");
  const item = database.catalog.equipment[7];
  assert.equal(item.qrTokens[0], "keep");
  assert.equal(item.qrTokens[1], "00112233445566778899aabb");
  assert.deepEqual(item.qrTokenAliases[1], ["old"]);
  assert.equal(item.qrUpdatedAt[1], "2026-08-23T12:00:00.000Z");
  assert.deepEqual(audits[0], { action: "equipment_node_qr_rotated", user: authUser, targetId: "7:1", targetLabel: "Второй" });
  assert.deepEqual(broadcasts[0], ["node-qr-rotate", "", { catalog: { equipment: { 7: item } } }, true]);
  assert.equal(responses[0].payload.stateVersion, "state-v2");
});

test("equipment QR route can restore a missing built-in item before rotating it", async () => {
  const database = { catalog: { equipment: {} } };
  const responses = [];
  const handler = createAdminEquipmentQrRoute({
    broadcastState: () => "state-v3",
    enqueueStateWrite: async task => task(),
    ensureCatalogItem: (db, equipmentId) => {
      if (equipmentId !== 11) return null;
      const item = { id: 11, name: "Токарный цех", nodes: ["Токарный станок"], qrTokens: {} };
      db.catalog.equipment[11] = item;
      return item;
    },
    randomBytes: () => Buffer.from("00112233445566778899aabb", "hex"),
    readBody: async req => req.body,
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: () => {},
    now: () => Date.parse("2026-09-04T09:00:00.000Z")
  });
  await handler({ method: "POST", authUser: { role: "editor" }, body: { equipmentId: 11, nodeIndex: 0 } }, {}, "/api/admin/equipment/node-qr-rotate");
  assert.equal(responses[0].status, 200);
  assert.equal(database.catalog.equipment[11].qrTokens[0], "00112233445566778899aabb");
});
