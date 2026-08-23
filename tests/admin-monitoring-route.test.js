"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminMonitoringRoute } = require("../server/admin-monitoring-route");

function createHarness(database = { adminAlerts: [] }) {
  const responses = [];
  const audits = [];
  const handler = createAdminMonitoringRoute({
    enqueueStateWrite: async task => task(),
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => audits.push(audit),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, audits, database };
}

test("admin monitoring route ignores unrelated requests and rejects non-admin users", async () => {
  const { handler, responses } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/admin/monitoring"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
});

test("admin monitoring route rejects unsupported actions without changing alerts", async () => {
  const database = { adminAlerts: [{ id: "alert-1", status: "open" }] };
  const { handler, responses, audits } = createHarness(database);
  await handler({ method: "POST", authUser: { role: "editor" }, body: { action: "delete", alertId: "alert-1" } }, {}, "/api/admin/monitoring");
  assert.equal(responses[0].payload.error, "monitoring_action_invalid");
  assert.equal(database.adminAlerts[0].status, "open");
  assert.deepEqual(audits, []);
});

test("admin monitoring route reports a missing alert without audit", async () => {
  const { handler, responses, audits } = createHarness();
  await handler({ method: "POST", authUser: { role: "editor" }, body: { action: "resolve", alertId: "missing" } }, {}, "/api/admin/monitoring");
  assert.deepEqual(responses[0], { status: 404, payload: { ok: false, error: "alert_not_found" } });
  assert.deepEqual(audits, []);
});

test("admin monitoring route resolves and audits the selected alert", async () => {
  const database = { adminAlerts: [{ id: "alert-1", title: "Ошибка базы", status: "open" }] };
  const { handler, responses, audits } = createHarness(database);
  const authUser = { id: "admin-1", name: "Admin", role: "editor" };
  await handler({
    method: "POST",
    authUser,
    body: { action: "resolve", alertId: "alert-1", reason: "Проверено вручную" }
  }, {}, "/api/admin/monitoring");
  assert.deepEqual(database.adminAlerts[0], {
    id: "alert-1",
    title: "Ошибка базы",
    status: "resolved",
    resolvedAt: "2026-08-23T12:00:00.000Z",
    resolvedByName: "Admin"
  });
  assert.deepEqual(audits[0], {
    action: "system_alert_resolved",
    user: authUser,
    targetId: "alert-1",
    targetLabel: "Ошибка базы",
    reason: "Проверено вручную"
  });
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, resolved: true } });
});
