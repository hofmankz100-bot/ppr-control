"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminDashboardRoute } = require("../server/admin-dashboard-route");

function createHarness(database = {}) {
  const responses = [];
  const calls = [];
  const summaryCaches = [];
  const handler = createAdminDashboardRoute({
    adminActivityFeed: () => ({ readAt: "read", unreadCount: 2, items: ["activity"] }),
    adminArchiveSelection: (_db, days) => ({ days, cutoffAt: "cutoff", counts: { audit: 1 } }),
    adminAutomationSnapshot: () => ({ enabled: true }),
    adminDiagnosticWithin: async (promise, fallback) => {
      calls.push("diagnostic");
      try { return await promise; } catch { return fallback; }
    },
    adminUserOperationalSummary: (_db, user, cache) => { summaryCaches.push(cache); return { userId: user.id }; },
    backupRetentionDeleteIds: rows => rows.map(item => item.id),
    dataIntegrityReport: () => ({ healthy: true, fixableCount: 0, issues: [] }),
    getPostgresConnected: () => true,
    getStorageMode: () => "postgres-cluster",
    listAdminArchives: async () => { calls.push("archives"); return [{ id: "archive-1" }]; },
    listAdminBackups: async () => { calls.push("backups"); return [{ id: "backup-1" }]; },
    normalizedAdminConfig: value => ({ companyName: value?.companyName || "Factory" }),
    readDb: () => { calls.push("database"); return database; },
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    systemReadinessReport: () => ({ status: "ok", summary: { ok: 1 } }),
    userLoginDiagnostics: (_db, user) => ({ userId: user.id }),
    userPublic: user => ({ id: user.id, name: user.name, role: user.role })
  });
  return { handler, responses, calls, summaryCaches, database };
}

test("access tab avoids full production-history scans and reuses active sessions", async () => {
  const database = { adminTrash: [], adminAlerts: [], adminConfig: {}, users: [{ id: "one" }, { id: "two" }], authSessions: [{ userId: "one", expiresAt: "2099-01-01T00:00:00.000Z", userAgent: "phone" }] };
  const { handler, summaryCaches, responses } = createHarness(database);
  await handler({ method: "GET", authUser: { role: "editor" } }, {}, "/api/admin/maintenance", new URL("https://example.test/api/admin/maintenance?tab=access"));
  assert.equal(summaryCaches.length, 0);
  assert.equal(responses[0].payload.access[0].operationalSummary.lightweight, true);
  assert.equal(responses[0].payload.access[0].operationalSummary.activeSessions, 1);
  assert.equal(responses[0].payload.access[1].operationalSummary.activeSessions, 0);
});

test("admin dashboard route ignores unrelated requests and protects access", async () => {
  const { handler, responses, calls } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health", new URL("https://example.test/api/health")), false);
  assert.equal(await handler({ method: "GET", authUser: { role: "viewer" } }, {}, "/api/admin/maintenance", new URL("https://example.test/api/admin/maintenance")), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
  assert.deepEqual(calls, []);
});

test("admin dashboard loads only data required by the selected tab", async () => {
  const database = { adminTrash: [], users: [], adminAlerts: [], adminConfig: {} };
  const { handler, responses, calls } = createHarness(database);
  await handler(
    { method: "GET", authUser: { role: "editor" } },
    {},
    "/api/admin/maintenance",
    new URL("https://example.test/api/admin/maintenance?tab=activity")
  );
  assert.equal(calls.includes("backups"), false);
  assert.equal(calls.includes("archives"), false);
  assert.deepEqual(responses[0].payload.backups, []);
  assert.deepEqual(responses[0].payload.archives, []);
  assert.equal(responses[0].payload.activity.unreadCount, 2);
  assert.deepEqual(responses[0].payload.systemReport.checks, []);
});

test("admin dashboard summarizes broadcast recipients and read receipts", async () => {
  const database = {
    adminTrash: [],
    adminAlerts: [],
    adminConfig: {},
    users: [
      { id: "user-1", name: "Механик", role: "mechanic", employeeId: "101", approved: true },
      { id: "user-2", name: "Электрик", role: "electrician", approved: true },
      { id: "user-3", name: "Отключён", role: "mechanic", accessDisabled: true }
    ],
    systemBroadcasts: [{
      id: "broadcast-1",
      title: "Для механиков",
      roles: ["mechanic"],
      readBy: [{ userId: "user-1", at: "2026-08-23T12:00:00.000Z" }]
    }]
  };
  const { handler, responses } = createHarness(database);
  await handler(
    { method: "GET", authUser: { role: "editor" } },
    {},
    "/api/admin/maintenance",
    new URL("https://example.test/api/admin/maintenance?tab=broadcasts")
  );
  const item = responses[0].payload.broadcasts[0];
  assert.equal(item.recipientCount, 1);
  assert.equal(item.readCount, 1);
  assert.deepEqual(item.recipients, [{ id: "user-1", name: "Механик", role: "mechanic", employeeId: "101", readAt: "2026-08-23T12:00:00.000Z" }]);
});

test("admin dashboard all tab combines backups archives access and retention", async () => {
  const database = {
    adminTrash: [{ id: "trash-1", restoredAt: "done" }],
    adminAuditLog: [{ id: "audit-1" }],
    adminAlerts: [{ id: "alert-1" }],
    adminConfig: { companyName: "Hofmann" },
    adminConfigHistory: [{ id: "config-1", at: "at", actorName: "Admin", reason: "reason", snapshot: { secret: true } }],
    users: [{ id: "user-1", name: "Admin", role: "editor" }],
    workPermitInstructions: { first: { editorIds: ["user-1"] } }
  };
  const { handler, responses, calls } = createHarness(database);
  await handler(
    { method: "GET", authUser: { id: "admin-1", role: "editor" } },
    {},
    "/api/admin/maintenance",
    new URL("https://example.test/api/admin/maintenance")
  );
  const payload = responses[0].payload;
  assert.equal(calls.includes("backups"), true);
  assert.equal(calls.includes("archives"), true);
  assert.equal(payload.backupRetention.deleteCount, 1);
  assert.equal(payload.trash[0].canRestore, false);
  assert.equal(payload.access[0].instructionEditorCount, 1);
  assert.deepEqual(payload.configHistory, [{ id: "config-1", at: "at", actorName: "Admin", reason: "reason" }]);
  assert.equal(payload.postgres.connected, true);
});
