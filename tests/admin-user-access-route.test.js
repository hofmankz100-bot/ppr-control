"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminUserAccessRoute } = require("../server/admin-user-access-route");

function createHarness(body, database) {
  const responses = [];
  const audits = [];
  const handler = createAdminUserAccessRoute({
    enqueueStateWrite: task => task(),
    passwordMatches: (supplied, stored) => supplied === stored,
    readBody: async () => body,
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    userPublic: user => ({ id: user.id, accessDisabled: user.accessDisabled }),
    writeDb: (_db, audit) => audits.push(audit),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, audits };
}

test("admin access route disables a user and ends existing sessions", async () => {
  const database = {
    users: [{ id: "target", name: "Target", role: "engineer" }],
    authSessions: [{ userId: "target" }, { userId: "other" }]
  };
  const { handler, responses, audits } = createHarness({
    userId: "target",
    disabled: true,
    password: "secret",
    reason: "Отпуск"
  }, database);

  const handled = await handler({
    method: "POST",
    authUser: { id: "admin", role: "editor", name: "Admin", passwordHash: "secret" }
  }, {}, "/api/admin/access");

  assert.equal(handled, true);
  assert.equal(responses[0].status, 200);
  assert.equal(database.users[0].accessDisabled, true);
  assert.equal(database.users[0].accessUpdatedAt, "2026-08-23T12:00:00.000Z");
  assert.deepEqual(database.authSessions, [{ userId: "other" }]);
  assert.equal(audits[0].action, "user_access_disabled");
});

test("admin access route can enable a user without ending sessions", async () => {
  const database = {
    users: [{ id: "target", name: "Target", role: "engineer", accessDisabled: true }],
    authSessions: [{ userId: "target" }]
  };
  const { handler, responses, audits } = createHarness({
    userId: "target",
    disabled: false,
    password: "secret",
    reason: "Возвращение"
  }, database);

  await handler({
    method: "POST",
    authUser: { id: "admin", role: "editor", name: "Admin", passwordHash: "secret" }
  }, {}, "/api/admin/access");

  assert.equal(responses[0].status, 200);
  assert.equal(database.users[0].accessDisabled, false);
  assert.deepEqual(database.authSessions, [{ userId: "target" }]);
  assert.equal(audits[0].action, "user_access_enabled");
});

test("admin access route refuses to disable an administrator", async () => {
  const database = {
    users: [{ id: "other-admin", name: "Admin", role: "editor" }],
    authSessions: [{ userId: "other-admin" }]
  };
  const { handler, responses, audits } = createHarness({
    userId: "other-admin",
    disabled: true,
    password: "secret",
    reason: "Проверка"
  }, database);

  await handler({
    method: "POST",
    authUser: { id: "admin", role: "editor", passwordHash: "secret" }
  }, {}, "/api/admin/access");

  assert.deepEqual(responses[0], { status: 409, payload: { ok: false, error: "admin_access_protected" } });
  assert.equal(database.users[0].accessDisabled, undefined);
  assert.deepEqual(audits, []);
});
