"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminQrRoute } = require("../server/admin-qr-route");

const CURRENT_TIME = Date.parse("2026-08-23T12:00:00.000Z");

function createHarness(database = {}) {
  const responses = [];
  const audits = [];
  const downloads = [];
  const handler = createAdminQrRoute({
    enqueueStateWrite: async task => task(),
    passwordMatches: (supplied, stored) => supplied === stored,
    randomBytes: () => Buffer.from("a1b2c3", "hex"),
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    todayStamp: () => "2026-08-23",
    writeDb: (_db, audit) => audits.push(audit),
    now: () => CURRENT_TIME
  });
  const res = {
    writeHead: (status, headers) => downloads.push({ status, headers }),
    end: body => { downloads[downloads.length - 1].body = body; }
  };
  return { handler, responses, audits, downloads, database, res };
}

function adminRequest(method, body = {}) {
  return { method, authUser: { id: "admin-1", name: "Admin", role: "editor", passwordHash: "secret" }, body: { password: "secret", reason: "Проверка", ...body } };
}

test("admin QR route ignores unrelated requests and protects endpoints", async () => {
  const { handler, responses } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "GET", authUser: { role: "viewer" } }, {}, "/api/admin/qr-routes"), true);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/qr-walk/journal-access"), true);
  assert.deepEqual(responses.map(item => item.payload.error), ["admin_required", "editor_required"]);
});

test("QR route creation filters invalid points and duplicate users", async () => {
  const database = { qrRouteDefinitions: [] };
  const { handler, responses, audits } = createHarness(database);
  await handler(adminRequest("POST", {
    name: " Маршрут №1 ", group: "operational", userIds: ["u1", "u1", ""], points: ["1:2", "bad", "1:2", "3:4"]
  }), {}, "/api/admin/qr-routes");
  const item = database.qrRouteDefinitions[0];
  assert.equal(item.id, "qr-route-1787486400000-a1b2c3");
  assert.deepEqual(item.points, ["1:2", "3:4"]);
  assert.deepEqual(item.userIds, ["u1"]);
  assert.equal(audits[0].action, "qr_route_saved");
  assert.equal(responses[0].status, 200);
});

test("QR route archive reports unknown routes and archives an existing route", async () => {
  const database = { qrRouteDefinitions: [{ id: "route-1", name: "Маршрут", active: true }] };
  const { handler, responses, audits } = createHarness(database);
  await handler(adminRequest("POST", { action: "archive", id: "missing" }), {}, "/api/admin/qr-routes");
  assert.equal(responses[0].payload.error, "route_not_found");
  await handler(adminRequest("POST", { action: "archive", id: "route-1" }), {}, "/api/admin/qr-routes");
  assert.equal(database.qrRouteDefinitions[0].active, false);
  assert.equal(audits[0].action, "qr_route_archived");
});

test("QR journal correction is audited and can restore validity", async () => {
  const database = { qrWalkJournal: [{ id: "entry-1", invalid: true }] };
  const { handler, responses, audits } = createHarness(database);
  await handler(adminRequest("POST", { id: "entry-1", invalid: false, reason: "Проверено" }), {}, "/api/admin/qr-journal/correct");
  assert.equal(database.qrWalkJournal[0].invalid, false);
  assert.equal(database.qrWalkJournal[0].correctedAt, "2026-08-23T12:00:00.000Z");
  assert.equal(audits[0].action, "qr_journal_corrected");
  assert.equal(responses[0].status, 200);
});

test("QR journal CSV escapes values and identifies invalid entries", async () => {
  const database = { qrWalkJournal: [{ date: "2026-08-23", byName: 'Иван "И.И."', invalid: true, correctionReason: "Ошибка" }] };
  const { handler, downloads, res } = createHarness(database);
  await handler(adminRequest("GET"), res, "/api/admin/qr-journal.csv");
  assert.equal(downloads[0].status, 200);
  assert.match(downloads[0].headers["Content-Disposition"], /qr_journal_2026-08-23\.csv/);
  assert.equal(downloads[0].body.startsWith("\uFEFF"), true);
  assert.match(downloads[0].body, /Иван ""И\.И\.""/);
  assert.match(downloads[0].body, /Ошибочная фиксация/);
});

test("QR journal access is limited to eligible engineering roles", async () => {
  const database = { users: [{ id: "worker", role: "mechanic" }, { id: "engineer", role: "engineer" }] };
  const { handler, responses, audits } = createHarness(database);
  await handler(adminRequest("POST", { userId: "worker", enabled: true }), {}, "/api/qr-walk/journal-access");
  assert.equal(responses[0].payload.error, "user_not_eligible");
  await handler(adminRequest("POST", { userId: "engineer", enabled: true }), {}, "/api/qr-walk/journal-access");
  assert.equal(database.users[1].qrWalkJournalAccess, true);
  assert.equal(audits[0].action, "qr_walk_journal_access");
});
