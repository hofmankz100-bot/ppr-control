"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminUserPermissionsRoute } = require("../server/admin-user-permissions-route");

function createHarness(body, database) {
  const responses = [];
  const audits = [];
  const handler = createAdminUserPermissionsRoute({
    adminPermissionKeys: new Set(["instructionEdit", "remarkGlobalConfirm"]),
    enqueueStateWrite: task => task(),
    passwordMatches: (supplied, stored) => supplied === stored,
    readBody: async () => body,
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    userPublic: user => ({ id: user.id, permissionOverrides: user.permissionOverrides }),
    writeDb: (_db, audit) => audits.push(audit),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, audits };
}

test("admin permission route ignores unrelated requests", async () => {
  const { handler, responses } = createHarness({}, { users: [] });
  const handled = await handler({ method: "GET" }, {}, "/api/health");
  assert.equal(handled, false);
  assert.deepEqual(responses, []);
});

test("admin permission route saves only allowed permissions and ends target sessions", async () => {
  const database = {
    users: [{ id: "target", name: "Target" }],
    authSessions: [{ userId: "target" }, { userId: "other" }]
  };
  const { handler, responses, audits } = createHarness({
    userId: "target",
    password: "secret",
    reason: "Рабочая необходимость",
    permissions: ["instructionEdit", "unsupported"],
    expiresAt: "2026-08-24T12:00:00.000Z"
  }, database);
  const handled = await handler({
    method: "POST",
    authUser: { role: "editor", name: "Admin", passwordHash: "secret" }
  }, {}, "/api/admin/user-permissions");

  assert.equal(handled, true);
  assert.equal(responses[0].status, 200);
  assert.deepEqual(Object.keys(database.users[0].permissionOverrides), ["instructionEdit"]);
  assert.equal(database.users[0].permissionOverrides.instructionEdit.grantedBy, "Admin");
  assert.deepEqual(database.authSessions, [{ userId: "other" }]);
  assert.equal(audits[0].action, "user_permissions_saved");
});

test("admin permission route rejects expired grants before changing data", async () => {
  const database = { users: [{ id: "target", permissionOverrides: {} }], authSessions: [] };
  const { handler, responses, audits } = createHarness({
    userId: "target",
    password: "secret",
    reason: "Проверка",
    permissions: ["instructionEdit"],
    expiresAt: "2026-08-23T11:59:59.000Z"
  }, database);
  await handler({
    method: "POST",
    authUser: { role: "editor", passwordHash: "secret" }
  }, {}, "/api/admin/user-permissions");

  assert.deepEqual(responses[0], { status: 400, payload: { ok: false, error: "permission_expiry_invalid" } });
  assert.deepEqual(database.users[0].permissionOverrides, {});
  assert.deepEqual(audits, []);
});
