"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminSystemReportRoute } = require("../server/admin-system-report-route");

function createHarness() {
  const responses = [];
  const downloads = [];
  const calls = [];
  const database = { users: [{ id: "user-1" }] };
  const backups = [{ id: "backup-1" }];
  const monitoring = { status: "healthy" };
  const report = { status: "ok", summary: { ok: 3 } };
  const handler = createAdminSystemReportRoute({
    listAdminBackups: async () => { calls.push("backups"); return backups; },
    readDb: () => { calls.push("database"); return database; },
    refreshSystemMonitoring: async () => { calls.push("monitoring"); return { snapshot: monitoring }; },
    sendDownload: (_res, filename, payload) => downloads.push({ filename, payload }),
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    systemReadinessReport: (db, snapshot, rows) => {
      calls.push({ db, snapshot, rows });
      return report;
    },
    todayStamp: () => "2026-08-23"
  });
  return { handler, responses, downloads, calls, database, backups, monitoring, report };
}

test("admin system report route ignores unrelated requests", async () => {
  const { handler, responses, downloads, calls } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health", new URL("https://example.test/api/health")), false);
  assert.deepEqual(responses, []);
  assert.deepEqual(downloads, []);
  assert.deepEqual(calls, []);
});

test("admin system report route rejects non-admin users before diagnostics", async () => {
  const { handler, responses, calls } = createHarness();
  assert.equal(await handler(
    { method: "GET", authUser: { role: "viewer" } },
    {},
    "/api/admin/system-report",
    new URL("https://example.test/api/admin/system-report")
  ), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
  assert.deepEqual(calls, []);
});

test("admin system report route returns and downloads the same generated report", async () => {
  const { handler, responses, downloads, calls, database, backups, monitoring, report } = createHarness();
  const req = { method: "GET", authUser: { role: "editor" } };
  await handler(req, {}, "/api/admin/system-report", new URL("https://example.test/api/admin/system-report"));
  await handler(req, {}, "/api/admin/system-report", new URL("https://example.test/api/admin/system-report?download=1"));
  assert.deepEqual(responses, [{ status: 200, payload: { ok: true, report } }]);
  assert.deepEqual(downloads, [{ filename: "ppr_system_report_2026-08-23.json", payload: report }]);
  assert.equal(calls.filter(item => item === "monitoring").length, 2);
  assert.deepEqual(calls.filter(item => typeof item === "object"), [
    { db: database, snapshot: monitoring, rows: backups },
    { db: database, snapshot: monitoring, rows: backups }
  ]);
});
