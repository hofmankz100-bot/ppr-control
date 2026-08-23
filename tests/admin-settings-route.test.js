"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminSettingsRoute } = require("../server/admin-settings-route");

function createHarness(database = { adminConfig: { value: "old" }, adminConfigHistory: [] }) {
  const responses = [];
  const audits = [];
  const handler = createAdminSettingsRoute({
    enqueueStateWrite: async task => task(),
    normalizedAdminConfig: value => ({ value: String(value?.value || "default") }),
    passwordMatches: (supplied, stored) => supplied === stored,
    randomBytes: () => Buffer.from("a1b2c3", "hex"),
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => audits.push(audit),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, audits, database };
}

test("admin settings route ignores unrelated requests and rejects non-admin users", async () => {
  const { handler, responses } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "PUT", authUser: { role: "viewer" } }, {}, "/api/admin/settings"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
});

test("admin settings validation does not mutate configuration", async () => {
  const { handler, responses, database, audits } = createHarness();
  await handler({
    method: "PUT",
    authUser: { role: "editor", passwordHash: "secret" },
    body: { password: "wrong", reason: "Изменение", config: { value: "new" } }
  }, {}, "/api/admin/settings");
  assert.equal(responses[0].payload.error, "admin_password_invalid");
  assert.deepEqual(database.adminConfig, { value: "old" });
  assert.deepEqual(audits, []);
});

test("admin settings save records the previous normalized version", async () => {
  const { handler, responses, database, audits } = createHarness();
  const authUser = { id: "admin-1", name: "Admin", role: "editor", passwordHash: "secret" };
  await handler({
    method: "PUT",
    authUser,
    body: { password: "secret", reason: "Новая настройка", config: { value: "new" } }
  }, {}, "/api/admin/settings");
  assert.deepEqual(database.adminConfig, { value: "new" });
  assert.deepEqual(database.adminConfigHistory[0], {
    id: "config-1787486400000-a1b2c3",
    at: "2026-08-23T12:00:00.000Z",
    actorId: "admin-1",
    actorName: "Admin",
    reason: "Новая настройка",
    snapshot: { value: "old" }
  });
  assert.equal(audits[0].action, "admin_settings_saved");
  assert.deepEqual(responses[0].payload.config, { value: "new" });
});

test("admin settings rollback saves the current version and restores the selected one", async () => {
  const database = {
    adminConfig: { value: "current" },
    adminConfigHistory: [{ id: "version-1", snapshot: { value: "restored" } }]
  };
  const { handler, responses, audits } = createHarness(database);
  const authUser = { id: "admin-1", name: "Admin", role: "editor", passwordHash: "secret" };
  await handler({
    method: "POST",
    authUser,
    body: { password: "secret", reason: "Возврат", versionId: "version-1" }
  }, {}, "/api/admin/settings/rollback");
  assert.deepEqual(database.adminConfig, { value: "restored" });
  assert.equal(database.adminConfigHistory[0].reason, "Автокопия перед откатом");
  assert.deepEqual(database.adminConfigHistory[0].snapshot, { value: "current" });
  assert.equal(audits[0].action, "admin_settings_rollback");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, config: { value: "restored" } } });
});

test("admin settings rollback reports a missing version without writing audit", async () => {
  const { handler, responses, audits } = createHarness();
  await handler({
    method: "POST",
    authUser: { role: "editor", passwordHash: "secret" },
    body: { password: "secret", reason: "Возврат", versionId: "missing" }
  }, {}, "/api/admin/settings/rollback");
  assert.deepEqual(responses[0], { status: 404, payload: { ok: false, error: "config_version_not_found" } });
  assert.deepEqual(audits, []);
});
