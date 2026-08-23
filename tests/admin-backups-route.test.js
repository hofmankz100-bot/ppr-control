"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminBackupsRoute } = require("../server/admin-backups-route");

function createHarness(database = { authSessions: [] }) {
  const responses = [];
  const downloads = [];
  const events = [];
  const backups = [{ id: "backup-1", label: "Копия", checksum: "sum", valid: true, payload: { users: [] } }];
  const handler = createAdminBackupsRoute({
    applyAdminBackupRetention: async () => { events.push("retention"); return 2; },
    backupRetentionDeleteIds: rows => rows.length ? ["old-1"] : [],
    createAdminBackup: async (label, createdBy) => {
      const result = { id: `created-${events.length}`, label, createdBy };
      events.push({ type: "backup", result });
      return result;
    },
    enqueueStateWrite: async task => { events.push("write-start"); return task(); },
    listAdminBackups: async () => backups,
    normalizeDb: value => ({ ...value, normalized: true }),
    passwordMatches: (supplied, stored) => supplied === stored,
    readAdminBackupPayload: async id => backups.find(item => item.id === id) || null,
    readBody: async req => req.body || {},
    readDb: () => database,
    sendDownload: (_res, filename, payload) => downloads.push({ filename, payload }),
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (db, audit) => events.push({ type: "write", db, audit }),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, downloads, events, backups, database };
}

test("admin backups route ignores unrelated requests and rejects non-admin users", async () => {
  const { handler, responses } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "GET", authUser: { role: "viewer" } }, {}, "/api/admin/backups"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
});

test("admin backup creation is idempotent", async () => {
  const database = { adminActionReceipts: [] };
  const { handler, responses, events } = createHarness(database);
  const req = { method: "POST", headers: { "x-idempotency-key": "action-1" }, authUser: { role: "editor", name: "Admin" }, body: {} };
  await handler(req, {}, "/api/admin/backups");
  await handler(req, {}, "/api/admin/backups");
  assert.equal(events.filter(item => item?.type === "backup").length, 1);
  assert.equal(responses[1].payload.duplicate, true);
  assert.equal(database.adminActionReceipts.length, 1);
});

test("admin backup download verifies checksum status", async () => {
  const { handler, responses, downloads, backups } = createHarness();
  const authUser = { role: "editor" };
  backups[0].valid = false;
  await handler({ method: "GET", authUser }, {}, "/api/admin/backups/backup-1");
  assert.equal(responses[0].status, 409);
  backups[0].valid = true;
  await handler({ method: "GET", authUser }, {}, "/api/admin/backups/backup-1");
  assert.equal(downloads[0].filename, "ppr_backup_backup-1.json");
  assert.equal(downloads[0].payload.exportedAt, "2026-08-23T12:00:00.000Z");
});

test("admin backup retention validates first and creates a safety backup", async () => {
  const { handler, responses, events } = createHarness();
  const authUser = { role: "editor", name: "Admin", passwordHash: "secret" };
  await handler({ method: "POST", authUser, body: { password: "secret", reason: "Очистка", confirm: "ПРИМЕНИТЬ" } }, {}, "/api/admin/backups/retention");
  assert.equal(events[0].type, "backup");
  assert.equal(events[1], "retention");
  assert.equal(responses[0].payload.deleted, 2);
  assert.ok(responses[0].payload.safetyBackup);
});

test("admin backup restore preserves current sessions and audits restoration", async () => {
  const database = { authSessions: [{ id: "current-session" }] };
  const { handler, responses, events } = createHarness(database);
  const authUser = { role: "editor", name: "Admin", passwordHash: "secret" };
  await handler({
    method: "POST",
    authUser,
    body: { password: "secret", confirm: "ВОССТАНОВИТЬ БАЗУ", backupId: "backup-1", reason: "Проверенное восстановление" }
  }, {}, "/api/admin/backups/restore");
  const write = events.find(item => item?.type === "write");
  assert.deepEqual(write.db.authSessions, database.authSessions);
  assert.equal(write.db.normalized, true);
  assert.equal(write.audit.action, "admin_backup_restored");
  assert.deepEqual(responses[0].payload, { ok: true, restored: true, backupId: "backup-1" });
});
