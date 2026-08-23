"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminUserSessionsRoute } = require("../server/admin-user-sessions-route");

function createHarness(body, database) {
  const responses = [];
  const audits = [];
  const handler = createAdminUserSessionsRoute({
    enqueueStateWrite: task => task(),
    passwordMatches: (supplied, stored) => supplied === stored,
    readBody: async () => body,
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => audits.push(audit)
  });
  return { handler, responses, audits };
}

test("admin sessions route ignores unrelated requests", async () => {
  const { handler, responses } = createHarness({}, { users: [] });
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.deepEqual(responses, []);
});

test("admin sessions route ends every session belonging to the target user", async () => {
  const database = {
    users: [{ id: "target", name: "Target" }],
    authSessions: [{ userId: "target" }, { userId: "other" }, { userId: "target" }]
  };
  const { handler, responses, audits } = createHarness({
    userId: "target",
    password: "secret",
    reason: "Устройство потеряно"
  }, database);

  const handled = await handler({
    method: "POST",
    authUser: { id: "admin", role: "editor", name: "Admin", passwordHash: "secret" }
  }, {}, "/api/admin/user-sessions");

  assert.equal(handled, true);
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, ended: 2 } });
  assert.deepEqual(database.authSessions, [{ userId: "other" }]);
  assert.equal(audits[0].action, "user_sessions_ended");
  assert.equal(audits[0].details, "Завершено сеансов: 2");
});

test("admin sessions route protects the current administrator session", async () => {
  const database = {
    users: [{ id: "admin", name: "Admin" }],
    authSessions: [{ userId: "admin" }]
  };
  const { handler, responses, audits } = createHarness({
    userId: "admin",
    password: "secret",
    reason: "Проверка"
  }, database);

  await handler({
    method: "POST",
    authUser: { id: "admin", role: "editor", passwordHash: "secret" }
  }, {}, "/api/admin/user-sessions");

  assert.deepEqual(responses[0], {
    status: 409,
    payload: { ok: false, error: "current_admin_session_protected" }
  });
  assert.deepEqual(database.authSessions, [{ userId: "admin" }]);
  assert.deepEqual(audits, []);
});
