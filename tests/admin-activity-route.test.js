"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminActivityRoute } = require("../server/admin-activity-route");

function createHarness() {
  const responses = [];
  const events = [];
  const database = {};
  const handler = createAdminActivityRoute({
    adminActivityFeed: (db, user) => ({ readAt: db.adminActivityReadAt[user.id], unreadCount: 0, items: [] }),
    enqueueStateWrite: async task => { events.push("write-start"); return task(); },
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => events.push(audit),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, events, database };
}

test("admin activity route ignores unrelated requests", async () => {
  const { handler, responses, events } = createHarness();
  const handled = await handler({ method: "GET" }, {}, "/api/health");
  assert.equal(handled, false);
  assert.deepEqual(responses, []);
  assert.deepEqual(events, []);
});

test("admin activity route rejects non-admin users", async () => {
  const { handler, responses, events } = createHarness();
  const handled = await handler(
    { method: "POST", authUser: { id: "user-1", role: "viewer" } },
    {},
    "/api/admin/activity/read"
  );
  assert.equal(handled, true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
  assert.deepEqual(events, []);
});

test("admin activity route records the read time and returns the refreshed feed", async () => {
  const { handler, responses, events, database } = createHarness();
  const authUser = { id: "admin-1", role: "editor", name: "Администратор" };
  const handled = await handler({ method: "POST", authUser }, {}, "/api/admin/activity/read");
  assert.equal(handled, true);
  assert.equal(database.adminActivityReadAt["admin-1"], "2026-08-23T12:00:00.000Z");
  assert.deepEqual(events, [
    "write-start",
    { action: "admin_activity_read", user: authUser, reason: "События просмотрены администратором" }
  ]);
  assert.deepEqual(responses, [{
    status: 200,
    payload: {
      ok: true,
      activity: { readAt: "2026-08-23T12:00:00.000Z", unreadCount: 0, items: [] }
    }
  }]);
});
