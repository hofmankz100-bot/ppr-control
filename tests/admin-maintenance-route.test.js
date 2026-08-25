"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminMaintenanceRoute } = require("../server/admin-maintenance-route");

function createHarness(database = { users: [], adminTrash: [] }, live = false) {
  const responses = [];
  const events = [];
  const broadcasts = [];
  const handler = createAdminMaintenanceRoute({
    ...(live ? {
      broadcastState: (...args) => { broadcasts.push(args); return "state-live"; },
      publicState: db => ({ catalog: db.catalog, gpmJournal: db.gpmJournal })
    } : {}),
    createManualBackup: label => events.push({ type: "backup", label }),
    enqueueStateWrite: async task => task(),
    passwordMatches: (supplied, stored) => supplied === stored,
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => events.push({ type: "audit", audit }),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, events, broadcasts, database };
}

function adminRequest(body) {
  return { method: "POST", authUser: { id: "admin-1", name: "Admin", role: "editor", passwordHash: "secret" }, body: { password: "secret", ...body } };
}

test("admin maintenance route ignores unrelated requests and protects access", async () => {
  const { handler, responses } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/admin/maintenance"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
});

test("admin maintenance refuses a conflicting user restore", async () => {
  const snapshot = { id: "user-1", employeeId: "100", phone: "+7001" };
  const database = { users: [{ id: "user-1" }], adminTrash: [{ id: "trash-1", type: "user", snapshot }] };
  const { handler, responses, events } = createHarness(database);
  await handler(adminRequest({ action: "restore", trashId: "trash-1" }), {}, "/api/admin/maintenance");
  assert.equal(responses[0].payload.error, "restore_conflict");
  assert.equal(database.users.length, 1);
  assert.deepEqual(events, []);
});

test("admin maintenance restores equipment and its linked GPM records", async () => {
  const database = {
    users: [],
    catalog: { equipment: { 12: { id: 12, deleted: true } } },
    gpmJournal: {
      equipment: {},
      inspections: { i1: { id: "i1", gpmId: "gpm-1", deleted: true } },
      events: { e1: { id: "e1", gpmId: "gpm-1", deleted: true } },
      managers: {}
    },
    adminTrash: [{
      id: "trash-1",
      type: "equipment",
      targetId: "12",
      label: "Станок",
      snapshot: {
        catalogItem: { name: "Станок" },
        gpmItems: [{ id: "gpm-1", deleted: true }],
        gpmInspections: [{ id: "i1", gpmId: "gpm-1", deleted: true }],
        gpmEvents: [{ id: "e1", gpmId: "gpm-1", deleted: true }]
      }
    }]
  };
  const { handler, responses, events } = createHarness(database);
  await handler(adminRequest({ action: "restore", trashId: "trash-1", reason: "Возврат" }), {}, "/api/admin/maintenance");
  assert.equal(database.catalog.equipment[12].deleted, false);
  assert.equal(database.gpmJournal.equipment["gpm-1"].deleted, false);
  assert.equal(database.gpmJournal.inspections.i1.deleted, false);
  assert.equal(database.gpmJournal.events.e1.deleted, false);
  assert.equal(database.adminTrash[0].restoredAt, "2026-08-23T12:00:00.000Z");
  assert.equal(events[0].audit.action, "trash_restore");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, restored: true } });
});

test("admin maintenance requires exact purge confirmation before backup", async () => {
  const database = { users: [], adminTrash: [{ id: "trash-1", type: "user" }] };
  const { handler, responses, events } = createHarness(database);
  await handler(adminRequest({ action: "purge", trashId: "trash-1", confirm: "УДАЛИТЬ" }), {}, "/api/admin/maintenance");
  assert.equal(responses[0].payload.error, "purge_confirmation_required");
  assert.equal(database.adminTrash.length, 1);
  assert.deepEqual(events, []);
});

test("admin maintenance restores a GPM card with its inspections and events", async () => {
  const database = {
    users: [],
    gpmJournal: {
      equipment: { crane1: { id: "crane1", name: "Кран", deleted: true } },
      inspections: { i1: { id: "i1", gpmId: "crane1", deleted: true } },
      events: { e1: { id: "e1", gpmId: "crane1", deleted: true } },
      managers: {}
    },
    adminTrash: [{
      id: "trash-gpm",
      type: "gpm",
      targetId: "crane1",
      label: "Кран",
      snapshot: {
        gpmItem: { id: "crane1", name: "Кран" },
        gpmInspections: [{ id: "i1", gpmId: "crane1" }],
        gpmEvents: [{ id: "e1", gpmId: "crane1" }]
      }
    }]
  };
  const { handler, responses, broadcasts } = createHarness(database, true);
  await handler(adminRequest({ action: "restore", trashId: "trash-gpm" }), {}, "/api/admin/maintenance");
  assert.equal(database.gpmJournal.equipment.crane1.deleted, false);
  assert.equal(database.gpmJournal.inspections.i1.deleted, false);
  assert.equal(database.gpmJournal.events.e1.deleted, false);
  assert.equal(broadcasts[0][0], "trash-restored");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, restored: true, stateVersion: "state-live" } });
});

test("admin maintenance permanently removes a deleted GPM card and linked history", async () => {
  const database = {
    users: [],
    gpmJournal: {
      equipment: { crane1: { id: "crane1", deleted: true } },
      inspections: { i1: { id: "i1", gpmId: "crane1", deleted: true } },
      events: { e1: { id: "e1", gpmId: "crane1", deleted: true } },
      managers: {}
    },
    adminTrash: [{ id: "trash-gpm", type: "gpm", targetId: "crane1", label: "Кран" }]
  };
  const { handler, responses, events, broadcasts } = createHarness(database, true);
  await handler(adminRequest({ action: "purge", trashId: "trash-gpm", confirm: "УДАЛИТЬ НАВСЕГДА" }), {}, "/api/admin/maintenance");
  assert.equal(database.gpmJournal.equipment.crane1, undefined);
  assert.equal(database.gpmJournal.inspections.i1, undefined);
  assert.equal(database.gpmJournal.events.e1, undefined);
  assert.deepEqual(database.adminTrash, []);
  assert.deepEqual(events[0], { type: "backup", label: "before-trash-purge" });
  assert.equal(broadcasts[0][0], "trash-purged");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, purged: true, stateVersion: "state-live" } });
});

test("admin maintenance backs up and permanently removes deleted equipment", async () => {
  const database = {
    users: [],
    catalog: { equipment: { 12: { id: 12, deleted: true } } },
    gpmJournal: {
      equipment: { linked: { id: "linked", sourceEquipmentId: 12, deleted: true } },
      inspections: { i1: { id: "i1", gpmId: "linked", deleted: true } },
      events: { e1: { id: "e1", gpmId: "linked", deleted: true } }
    },
    adminTrash: [{ id: "trash-1", type: "equipment", targetId: "12", label: "Станок", snapshot: { catalogItem: { builtIn: false } } }]
  };
  const { handler, responses, events } = createHarness(database);
  await handler(adminRequest({ action: "purge", trashId: "trash-1", confirm: "УДАЛИТЬ НАВСЕГДА" }), {}, "/api/admin/maintenance");
  assert.deepEqual(events[0], { type: "backup", label: "before-trash-purge" });
  assert.equal(database.catalog.equipment[12], undefined);
  assert.equal(database.gpmJournal.equipment.linked, undefined);
  assert.equal(database.gpmJournal.inspections.i1, undefined);
  assert.equal(database.gpmJournal.events.e1, undefined);
  assert.deepEqual(database.adminTrash, []);
  assert.equal(events[1].audit.action, "trash_purge");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, purged: true } });
});
