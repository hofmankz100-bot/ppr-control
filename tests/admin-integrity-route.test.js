"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminIntegrityRoute } = require("../server/admin-integrity-route");

function createHarness(database = {}) {
  const responses = [];
  const events = [];
  const backup = { id: "backup-1", label: "Перед исправлением данных" };
  const handler = createAdminIntegrityRoute({
    createAdminBackup: async (label, createdBy) => {
      events.push({ type: "backup", label, createdBy });
      return backup;
    },
    dataIntegrityReport: db => ({ sessionCount: (db.authSessions || []).length }),
    enqueueStateWrite: async task => { events.push({ type: "write-start" }); return task(); },
    passwordMatches: (supplied, stored) => supplied === stored,
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => events.push({ type: "audit", audit }),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, events, database, backup };
}

test("admin integrity route ignores unrelated requests", async () => {
  const { handler, responses, events } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.deepEqual(responses, []);
  assert.deepEqual(events, []);
});

test("admin integrity report is read-only and restricted to administrators", async () => {
  const denied = createHarness();
  await denied.handler({ method: "GET", authUser: { role: "viewer" } }, {}, "/api/admin/integrity");
  assert.deepEqual(denied.responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);

  const allowed = createHarness({ authSessions: [{ id: "session-1" }] });
  await allowed.handler({ method: "GET", authUser: { role: "editor" } }, {}, "/api/admin/integrity");
  assert.deepEqual(allowed.responses, [{ status: 200, payload: { ok: true, integrity: { sessionCount: 1 } } }]);
  assert.deepEqual(allowed.events, []);
});

test("admin integrity fix validates credentials and selected fixes before backup", async () => {
  const { handler, responses, events } = createHarness();
  const authUser = { role: "editor", passwordHash: "correct" };
  await handler({ method: "POST", authUser, body: { password: "wrong" } }, {}, "/api/admin/integrity/fix");
  await handler({
    method: "POST",
    authUser,
    body: { password: "correct", confirm: "ИСПРАВИТЬ ДАННЫЕ", reason: "Проверка", fixes: ["unknown"] }
  }, {}, "/api/admin/integrity/fix");
  assert.deepEqual(responses.map(item => item.payload.error), ["admin_password_invalid", "integrity_fixes_required"]);
  assert.deepEqual(events, []);
});

test("admin integrity fix backs up, repairs all supported records and audits the result", async () => {
  const currentTime = Date.parse("2026-08-23T12:00:00.000Z");
  const database = {
    users: [{ id: "user-1", employeeId: "employee-1", phone: "+70000000001" }],
    authSessions: [
      { id: "expired", userId: "user-1", expiresAt: new Date(currentTime - 1000).toISOString() },
      { id: "dangling", userId: "missing", expiresAt: new Date(currentTime + 1000).toISOString() },
      { id: "valid", userId: "user-1", expiresAt: new Date(currentTime + 1000).toISOString() }
    ],
    workPermitInstructions: {
      first: { editorIds: ["user-1", "employee-1", "missing"] }
    },
    adminAlerts: [
      { id: "old", status: "resolved", resolvedAt: new Date(currentTime - 91 * 86400000).toISOString() },
      { id: "recent", status: "resolved", resolvedAt: new Date(currentTime - 10 * 86400000).toISOString() },
      { id: "active", status: "open" }
    ]
  };
  const { handler, responses, events, backup } = createHarness(database);
  const authUser = { id: "admin-1", role: "editor", name: "Администратор", passwordHash: "secret" };
  await handler({
    method: "POST",
    authUser,
    body: {
      password: "secret",
      confirm: "ИСПРАВИТЬ ДАННЫЕ",
      reason: "Плановое исправление",
      fixes: ["expired_sessions", "dangling_sessions", "invalid_instruction_editors", "stale_alerts", "stale_alerts"]
    }
  }, {}, "/api/admin/integrity/fix");

  assert.deepEqual(database.authSessions.map(item => item.id), ["valid"]);
  assert.deepEqual(database.workPermitInstructions.first.editorIds, ["user-1", "employee-1"]);
  assert.deepEqual(database.adminAlerts.map(item => item.id), ["recent", "active"]);
  assert.equal(events[0].type, "backup");
  assert.equal(events[1].type, "write-start");
  assert.deepEqual(events[2], {
    type: "audit",
    audit: {
      action: "admin_integrity_fixed",
      user: authUser,
      targetId: "backup-1",
      targetLabel: "expired_sessions, dangling_sessions, invalid_instruction_editors, stale_alerts",
      reason: "Плановое исправление"
    }
  });
  assert.deepEqual(responses, [{
    status: 200,
    payload: {
      ok: true,
      fixed: { expired_sessions: 1, dangling_sessions: 1, invalid_instruction_editors: 1, stale_alerts: 1 },
      backup,
      integrity: { sessionCount: 1 }
    }
  }]);
});
