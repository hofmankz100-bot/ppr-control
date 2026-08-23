"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminStorageRoute } = require("../server/admin-storage-route");

function createHarness() {
  const responses = [];
  const events = [];
  const database = { users: [{ id: "user-1", passwordHash: "hidden" }] };
  const handler = createAdminStorageRoute({
    appendActionLog: event => events.push({ type: "log", event }),
    basename: file => file.split("/").pop(),
    byteLength: value => Buffer.byteLength(value, "utf8"),
    createManualBackup: label => { events.push({ type: "backup", label }); return `/backups/${label}.json`; },
    directoryStorageStats: directory => directory === "/photos" ? { bytes: 120, files: 3 } : { bytes: 450, files: 2 },
    getBackupDirectory: () => "/backups",
    getPhotosDirectory: () => "/photos",
    githubRepositoryStorage: async () => ({ available: true, bytes: 1000 }),
    publicState: db => ({ users: db.users.map(user => ({ id: user.id })) }),
    readBody: async req => req.body || {},
    readDb: () => database,
    sendJson: (_res, status, payload, headers) => responses.push({ status, payload, headers }),
    unusedPublicAssetCandidates: () => [{ name: "old.png", bytes: 25 }, { name: "old.pdf", bytes: 75 }],
    waitForStateWrites: async () => events.push({ type: "writes-finished" }),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, responses, events, database };
}

test("admin storage route ignores unrelated requests and protects both endpoints", async () => {
  const { handler, responses, events } = createHarness();
  assert.equal(await handler({ method: "GET" }, {}, "/api/health"), false);
  assert.equal(await handler({ method: "GET", authUser: { role: "viewer" } }, {}, "/api/admin/storage-status"), true);
  assert.equal(await handler({ method: "POST", authUser: { role: "viewer" } }, {}, "/api/backup/manual"), true);
  assert.deepEqual(responses.map(item => item.status), [403, 403]);
  assert.deepEqual(events, []);
});

test("admin storage status returns safe totals without cache", async () => {
  const { handler, responses } = createHarness();
  await handler({ method: "GET", authUser: { role: "editor" } }, {}, "/api/admin/storage-status");
  const response = responses[0];
  assert.equal(response.status, 200);
  assert.equal(response.payload.checkedAt, "2026-08-23T12:00:00.000Z");
  assert.deepEqual(response.payload.application, {
    databaseBytes: Buffer.byteLength(JSON.stringify({ users: [{ id: "user-1" }] }), "utf8"),
    photosBytes: 120,
    photoFiles: 3,
    backupsBytes: 450,
    backupFiles: 2
  });
  assert.equal(response.payload.garbage.bytes, 100);
  assert.equal(response.payload.garbage.safeCheckOnly, true);
  assert.deepEqual(response.headers, { "Cache-Control": "no-store" });
});

test("manual backup waits for state writes and logs only the basename", async () => {
  const { handler, responses, events } = createHarness();
  await handler({
    method: "POST",
    authUser: { role: "editor" },
    body: { label: "before-change", clientId: "phone-1" }
  }, {}, "/api/backup/manual");
  assert.deepEqual(events, [
    { type: "writes-finished" },
    { type: "backup", label: "before-change" },
    { type: "log", event: { action: "manual_backup", file: "before-change.json", clientId: "phone-1" } }
  ]);
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, file: "before-change.json" }, headers: undefined });
});
