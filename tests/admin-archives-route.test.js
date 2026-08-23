"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminArchivesRoute } = require("../server/admin-archives-route");

function createHarness() {
  const responses = [];
  const calls = [];
  const events = [];
  const database = { adminAuditLog: [], adminAlerts: [], adminTrash: [], adminConfigHistory: [], adminArchives: [] };
  const handler = createAdminArchivesRoute({
    adminArchiveSelection: (db, days) => {
      calls.push({ db, days });
      return {
        days: Number(days),
        cutoffAt: "2026-05-25T00:00:00.000Z",
        counts: { audit: 3, resolved_alerts: 1 },
        records: {
          audit: database.adminAuditLog.filter(item => item.old),
          resolved_alerts: database.adminAlerts.filter(item => item.old),
          restored_trash: database.adminTrash.filter(item => item.old),
          config_history: database.adminConfigHistory.filter(item => item.old)
        }
      };
    },
    backupChecksum: payload => `checksum:${JSON.stringify(payload)}`,
    createAdminArchive: async (payload, label, createdBy) => {
      events.push({ type: "archive", payload });
      return { id: "archive-1", label, createdBy, payload, checksum: "abc" };
    },
    createAdminBackup: async () => events.push({ type: "backup" }),
    enqueueStateWrite: async task => { events.push({ type: "write-start" }); return task(); },
    passwordMatches: (supplied, stored) => supplied === stored,
    readBody: async req => req.body || {},
    readAdminArchive: async id => database.archiveToRead?.id === id ? database.archiveToRead : null,
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    shouldStoreArchiveInState: () => true,
    writeDb: (_db, audit) => events.push({ type: "audit", audit })
  });
  return { handler, responses, calls, database, events };
}

test("admin archives route ignores unrelated requests", async () => {
  const { handler, responses, calls } = createHarness();
  const handled = await handler({ method: "GET" }, {}, "/api/health", new URL("https://example.test/api/health"));
  assert.equal(handled, false);
  assert.deepEqual(responses, []);
  assert.deepEqual(calls, []);
});

test("admin archive restore rejects a damaged archive before backup", async () => {
  const { handler, responses, database, events } = createHarness();
  database.archiveToRead = { id: "archive-1", payload: { records: {} }, checksum: "wrong" };
  await handler({
    method: "POST",
    authUser: { role: "editor", passwordHash: "secret" },
    body: {
      password: "secret",
      confirm: "ВОССТАНОВИТЬ АРХИВ",
      reason: "Проверка",
      archiveId: "archive-1"
    }
  }, {}, "/api/admin/archives/restore", new URL("https://example.test/api/admin/archives/restore"));
  assert.deepEqual(responses[0], { status: 409, payload: { ok: false, error: "archive_checksum_invalid" } });
  assert.deepEqual(events, []);
});

test("admin archive restore backs up and adds only missing records", async () => {
  const { handler, responses, database, events } = createHarness();
  database.adminAuditLog = [{ id: "existing" }];
  const payload = {
    records: {
      audit: [{ id: "existing" }, { id: "restored-audit" }],
      resolved_alerts: [{ id: "restored-alert" }]
    }
  };
  database.archiveToRead = {
    id: "archive-1",
    payload,
    checksum: `checksum:${JSON.stringify(payload)}`
  };

  await handler({
    method: "POST",
    authUser: { role: "editor", name: "Admin", passwordHash: "secret" },
    body: {
      password: "secret",
      confirm: "ВОССТАНОВИТЬ АРХИВ",
      reason: "Возврат истории",
      archiveId: "archive-1"
    }
  }, {}, "/api/admin/archives/restore", new URL("https://example.test/api/admin/archives/restore"));

  assert.deepEqual(events.map(event => event.type), ["backup", "write-start", "audit"]);
  assert.deepEqual(database.adminAuditLog.map(item => item.id), ["restored-audit", "existing"]);
  assert.deepEqual(database.adminAlerts.map(item => item.id), ["restored-alert"]);
  assert.equal(events[2].audit.action, "admin_archive_restored");
  assert.deepEqual(responses[0], {
    status: 200,
    payload: { ok: true, restoredCount: 2, archiveId: "archive-1" }
  });
});

test("admin archive creation validates confirmation before changing data", async () => {
  const { handler, responses, events } = createHarness();
  await handler({
    method: "POST",
    authUser: { role: "editor", passwordHash: "secret" },
    body: { password: "secret", confirm: "ДА", reason: "Очистка", categories: ["audit"] }
  }, {}, "/api/admin/archives", new URL("https://example.test/api/admin/archives"));
  assert.deepEqual(responses[0], { status: 400, payload: { ok: false, error: "archive_confirmation_required" } });
  assert.deepEqual(events, []);
});

test("admin archive creation backs up before removing archived records", async () => {
  const { handler, responses, database, events } = createHarness();
  database.adminAuditLog = [{ id: "old-audit", old: true }, { id: "new-audit", old: false }];
  database.adminAlerts = [{ id: "old-alert", old: true }, { id: "new-alert", old: false }];

  await handler({
    method: "POST",
    authUser: { role: "editor", name: "Admin", passwordHash: "secret" },
    body: {
      password: "secret",
      confirm: "ПЕРЕНЕСТИ В АРХИВ",
      reason: "Плановая архивация",
      categories: ["audit", "resolved_alerts", "unsupported"],
      days: 90
    }
  }, {}, "/api/admin/archives", new URL("https://example.test/api/admin/archives"));

  assert.deepEqual(events.map(event => event.type), ["backup", "archive", "write-start", "audit"]);
  assert.deepEqual(database.adminAuditLog.map(item => item.id), ["new-audit"]);
  assert.deepEqual(database.adminAlerts.map(item => item.id), ["new-alert"]);
  assert.equal(database.adminArchives[0].id, "archive-1");
  assert.equal(events[3].audit.action, "admin_archive_created");
  assert.equal(responses[0].status, 200);
  assert.equal(responses[0].payload.archivedCount, 2);
  assert.equal(responses[0].payload.archive.payload, undefined);
});

test("admin archive preview returns counts for the requested age", async () => {
  const { handler, responses, calls, database } = createHarness();
  const handled = await handler(
    { method: "GET", authUser: { role: "editor" } },
    {},
    "/api/admin/archives/preview",
    new URL("https://example.test/api/admin/archives/preview?days=90")
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [{ db: database, days: "90" }]);
  assert.deepEqual(responses[0], {
    status: 200,
    payload: {
      ok: true,
      preview: {
        days: 90,
        cutoffAt: "2026-05-25T00:00:00.000Z",
        counts: { audit: 3, resolved_alerts: 1 }
      }
    }
  });
});

test("admin archive preview rejects non-administrators", async () => {
  const { handler, responses, calls } = createHarness();
  await handler(
    { method: "GET", authUser: { role: "engineer" } },
    {},
    "/api/admin/archives/preview",
    new URL("https://example.test/api/admin/archives/preview?days=90")
  );
  assert.deepEqual(responses[0], { status: 403, payload: { ok: false, error: "admin_required" } });
  assert.deepEqual(calls, []);
});
