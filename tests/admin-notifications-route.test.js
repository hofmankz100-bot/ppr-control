"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminNotificationsRoute } = require("../server/admin-notifications-route");

const CURRENT_TIME = Date.parse("2026-08-23T12:00:00.000Z");

function createHarness(database = { systemBroadcasts: [] }) {
  const responses = [];
  const events = [];
  const handler = createAdminNotificationsRoute({
    broadcastState: (...args) => events.push({ type: "broadcast", args }),
    enqueueStateWrite: async task => task(),
    passwordMatches: (supplied, stored) => supplied === stored,
    randomBytes: () => Buffer.from("a1b2c3d4", "hex"),
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    writeDb: (_db, audit) => events.push({ type: "audit", audit }),
    now: () => CURRENT_TIME
  });
  return { handler, responses, events, database };
}

function adminRequest(body) {
  return { method: "POST", authUser: { id: "admin-1", name: "Admin", role: "editor", passwordHash: "secret" }, body: { password: "secret", reason: "Проверка", ...body } };
}

test("admin notifications route ignores unrelated requests and protects access", async () => {
  const { handler, responses } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/admin/broadcasts"), true);
  assert.deepEqual(responses, [{ status: 403, payload: { ok: false, error: "admin_required" } }]);
});

test("notification policy clamps numeric limits and normalizes priority", async () => {
  const { handler, responses, database, events } = createHarness();
  await handler(adminRequest({ defaultPriority: "unknown", defaultExpiryHours: 900, unreadReminderHours: 0 }), {}, "/api/admin/notification-policy");
  assert.deepEqual(database.adminNotificationPolicy, {
    defaultPriority: "normal",
    defaultExpiryHours: 720,
    unreadReminderHours: 8,
    updatedAt: "2026-08-23T12:00:00.000Z",
    updatedBy: "Admin"
  });
  assert.equal(events[0].audit.action, "admin_notification_policy_saved");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true } });
});

test("broadcast creation validates expiry and filters recipient roles", async () => {
  const { handler, responses, database, events } = createHarness();
  await handler(adminRequest({ title: "Событие", text: "Текст", expiresAt: new Date(CURRENT_TIME - 1).toISOString() }), {}, "/api/admin/broadcasts");
  assert.equal(responses[0].payload.error, "broadcast_expiry_invalid");
  assert.deepEqual(events, []);

  responses.length = 0;
  await handler(adminRequest({
    title: "  Событие  ",
    text: "  Важный текст  ",
    priority: "critical",
    roles: ["editor", "mechanic", "unknown", "editor"],
    expiresAt: new Date(CURRENT_TIME + 3600000).toISOString()
  }), {}, "/api/admin/broadcasts");
  assert.deepEqual(database.systemBroadcasts[0].roles, ["editor", "mechanic"]);
  assert.equal(database.systemBroadcasts[0].id, "broadcast-1787486400000-a1b2c3d4");
  assert.equal(events[0].audit.action, "admin_broadcast_created");
  assert.equal(events[1].type, "broadcast");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true } });
});

test("broadcast reminder rejects inactive items and notifies clients after success", async () => {
  const database = { systemBroadcasts: [{ id: "closed", active: false }, { id: "open", title: "Открыто", active: true }] };
  const { handler, responses, events } = createHarness(database);
  await handler(adminRequest({ id: "closed" }), {}, "/api/admin/broadcasts/remind");
  assert.equal(responses[0].status, 404);
  assert.deepEqual(events, []);

  responses.length = 0;
  await handler(adminRequest({ id: "open" }), {}, "/api/admin/broadcasts/remind");
  assert.equal(database.systemBroadcasts[1].remindedAt, "2026-08-23T12:00:00.000Z");
  assert.equal(events[0].audit.action, "admin_broadcast_reminded");
  assert.equal(events[1].args[0], "admin-broadcast-reminder");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true } });
});

test("broadcast closing records administrator and pushes updated state", async () => {
  const database = { systemBroadcasts: [{ id: "broadcast-1", title: "Объявление", active: true }] };
  const { handler, responses, events } = createHarness(database);
  await handler(adminRequest({ action: "close", id: "broadcast-1" }), {}, "/api/admin/broadcasts");
  assert.equal(database.systemBroadcasts[0].active, false);
  assert.equal(database.systemBroadcasts[0].closedBy, "Admin");
  assert.equal(events[0].audit.action, "admin_broadcast_closed");
  assert.equal(events[1].args[0], "admin-broadcast");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true } });
});
