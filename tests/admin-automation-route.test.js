"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminAutomationRoute } = require("../server/admin-automation-route");

function createHarness(body = {}) {
  const responses = [];
  const backupCalls = [];
  const database = { adminAutomationStatus: { lastSuccessAt: "2026-08-23T12:00:00.000Z" } };
  const handler = createAdminAutomationRoute({
    adminAutomationSnapshot: db => ({ lastSuccessAt: db.adminAutomationStatus.lastSuccessAt }),
    passwordMatches: (supplied, stored) => supplied === stored,
    readBody: async () => body,
    readDb: () => database,
    runAutomaticBackupIfDue: async (force, actorName) => {
      backupCalls.push({ force, actorName });
      return { backup: { id: "backup-1" } };
    },
    sendJson: (_res, status, payload) => responses.push({ status, payload })
  });
  return { handler, responses, backupCalls };
}

test("admin automation route ignores unrelated requests", async () => {
  const { handler, responses } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.deepEqual(responses, []);
});

test("admin automation route requires a valid administrator password", async () => {
  const { handler, responses, backupCalls } = createHarness({ password: "wrong" });
  await handler({
    method: "POST",
    authUser: { role: "editor", passwordHash: "secret" }
  }, {}, "/api/admin/automation/run");

  assert.deepEqual(responses[0], { status: 401, payload: { ok: false, error: "admin_password_invalid" } });
  assert.deepEqual(backupCalls, []);
});

test("admin automation route forces a backup and returns current status", async () => {
  const { handler, responses, backupCalls } = createHarness({ password: "secret" });
  const handled = await handler({
    method: "POST",
    authUser: { role: "editor", name: "Admin", passwordHash: "secret" }
  }, {}, "/api/admin/automation/run");

  assert.equal(handled, true);
  assert.deepEqual(backupCalls, [{ force: true, actorName: "Admin" }]);
  assert.deepEqual(responses[0], {
    status: 200,
    payload: {
      ok: true,
      backup: { id: "backup-1" },
      status: { lastSuccessAt: "2026-08-23T12:00:00.000Z" }
    }
  });
});
