"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminRatingRoute } = require("../server/admin-rating-route");

function createHarness(database = { adminConfig: { excludedRatingWorkers: [] } }) {
  const responses = [];
  const audits = [];
  const handler = createAdminRatingRoute({
    enqueueStateWrite: async task => task(),
    normalizedAdminConfig: config => ({ ...config, excludedRatingWorkers: Array.isArray(config?.excludedRatingWorkers) ? config.excludedRatingWorkers : [] }),
    publicState: db => ({ adminConfig: db.adminConfig }),
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => audits.push(audit),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, audits, database };
}

test("admin rating route ignores unrelated requests and protects access", async () => {
  const { handler, responses, audits } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/admin/rating-exclusions"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
  assert.deepEqual(audits, []);
});

test("admin rating route rejects unsupported roles and missing reasons", async () => {
  const { handler, responses, audits, database } = createHarness();
  const authUser = { role: "editor" };
  await handler({ method: "POST", authUser, body: { key: "engineer:ivan", reason: "Причина" } }, {}, "/api/admin/rating-exclusions");
  await handler({ method: "POST", authUser, body: { key: "mechanic:ivan" } }, {}, "/api/admin/rating-exclusions");
  assert.deepEqual(responses.map(item => item.payload.error), ["invalid_rating_worker", "reason_required"]);
  assert.deepEqual(database.adminConfig.excludedRatingWorkers, []);
  assert.deepEqual(audits, []);
});

test("admin rating route hides a normalized worker only once", async () => {
  const database = { adminConfig: { excludedRatingWorkers: [{ key: "mechanic:иван", label: "Старое" }] } };
  const { handler, responses, audits } = createHarness(database);
  const authUser = { id: "admin-1", name: "Admin", role: "editor" };
  await handler({
    method: "POST",
    authUser,
    body: { key: "  MECHANIC:ИВАН  ", label: " Иван ", reason: " Дубликат устранён " }
  }, {}, "/api/admin/rating-exclusions");
  assert.deepEqual(database.adminConfig.excludedRatingWorkers, [{
    key: "mechanic:иван",
    label: "Иван",
    reason: "Дубликат устранён",
    hiddenAt: "2026-08-23T12:00:00.000Z",
    hiddenBy: "Admin"
  }]);
  assert.equal(audits[0].action, "rating_worker_hidden");
  assert.deepEqual(responses[0].payload.excludedRatingWorkers, database.adminConfig.excludedRatingWorkers);
});

test("admin rating route restores a hidden worker and audits the reason", async () => {
  const database = { adminConfig: { excludedRatingWorkers: [{ key: "welder:петр" }, { key: "mechanic:иван" }] } };
  const { handler, audits } = createHarness(database);
  await handler({
    method: "POST",
    authUser: { name: "Admin", role: "editor" },
    body: { action: "restore", key: "welder:петр", reason: "Вернуть в рейтинг" }
  }, {}, "/api/admin/rating-exclusions");
  assert.deepEqual(database.adminConfig.excludedRatingWorkers, [{ key: "mechanic:иван" }]);
  assert.equal(audits[0].action, "rating_worker_restored");
  assert.equal(audits[0].reason, "Вернуть в рейтинг");
});
