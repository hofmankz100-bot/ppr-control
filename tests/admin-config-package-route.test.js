"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminConfigPackageRoute } = require("../server/admin-config-package-route");

function createHarness(body = {}) {
  const downloads = [];
  const responses = [];
  const events = [];
  const database = { adminConfig: { companyName: "Old" }, workPermitInstructions: {} };
  const handler = createAdminConfigPackageRoute({
    buildAdminConfigPackage: db => ({ companyName: db.adminConfig.companyName, checksum: "abc" }),
    createAdminBackup: async (label, actorName) => events.push({ type: "backup", label, actorName }),
    enqueueStateWrite: async task => { events.push({ type: "write-start" }); return task(); },
    normalizedAdminConfig: value => ({ ...value }),
    passwordMatches: (supplied, stored) => supplied === stored,
    randomHex: () => "a1b2c3",
    readBody: async () => body,
    readDb: () => database,
    sendDownload: (_res, filename, payload) => downloads.push({ filename, payload }),
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    todayStamp: () => "2026-08-23",
    validateAdminConfigPackage: input => input?.checksum === "abc"
      ? {
          config: { companyName: input.companyName },
          instructions: input.instructions || {},
          summary: { companyName: input.companyName, instructions: Object.keys(input.instructions || {}).length }
        }
      : { error: "config_checksum_invalid" },
    writeDb: (_db, audit) => events.push({ type: "audit", audit }),
    now: () => Date.parse("2026-08-23T12:00:00.000Z")
  });
  return { handler, downloads, responses, events, database };
}

test("admin config package route exports a dated JSON package", async () => {
  const { handler, downloads, responses } = createHarness();
  const handled = await handler({ method: "GET", authUser: { role: "editor" } }, {}, "/api/admin/config-package");

  assert.equal(handled, true);
  assert.deepEqual(downloads, [{
    filename: "ppr_admin_config_2026-08-23.json",
    payload: { companyName: "Old", checksum: "abc" }
  }]);
  assert.deepEqual(responses, []);
});

test("admin config package preview returns the validated summary", async () => {
  const { handler, responses } = createHarness({ package: { companyName: "Hofmann", checksum: "abc" } });
  await handler({ method: "POST", authUser: { role: "editor" } }, {}, "/api/admin/config-package/preview");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, summary: { companyName: "Hofmann", instructions: 0 } } });
});

test("admin config package import validates confirmation before creating a backup", async () => {
  const { handler, responses, events } = createHarness({
    password: "secret",
    confirm: "ДА",
    reason: "Перенос",
    package: { companyName: "New", checksum: "abc" }
  });
  await handler({
    method: "POST",
    authUser: { role: "editor", passwordHash: "secret" }
  }, {}, "/api/admin/config-package/import");
  assert.deepEqual(responses[0], {
    status: 400,
    payload: { ok: false, error: "config_import_confirmation_required" }
  });
  assert.deepEqual(events, []);
});

test("admin config package import backs up, stores history and merges instructions", async () => {
  const { handler, responses, events, database } = createHarness({
    password: "secret",
    confirm: "ИМПОРТИРОВАТЬ НАСТРОЙКИ",
    reason: "Перенос настроек",
    package: {
      companyName: "New",
      checksum: "abc",
      instructions: { safety: { title: "Safety", body: "Text" } }
    }
  });
  database.workPermitInstructions.safety = { editorIds: ["employee-1"], body: "Old" };

  await handler({
    method: "POST",
    authUser: { id: "admin", role: "editor", name: "Admin", passwordHash: "secret" }
  }, {}, "/api/admin/config-package/import");

  assert.deepEqual(events.map(event => event.type), ["backup", "write-start", "audit"]);
  assert.equal(database.adminConfig.companyName, "New");
  assert.equal(database.adminConfigHistory[0].snapshot.companyName, "Old");
  assert.deepEqual(database.workPermitInstructions.safety.editorIds, ["employee-1"]);
  assert.equal(database.workPermitInstructions.safety.title, "Safety");
  assert.equal(events[2].audit.action, "admin_config_package_imported");
  assert.deepEqual(responses[0], {
    status: 200,
    payload: { ok: true, summary: { companyName: "New", instructions: 1 } }
  });
});

test("admin config package preview rejects an invalid package", async () => {
  const { handler, responses, downloads } = createHarness({ package: { checksum: "wrong" } });
  await handler({ method: "POST", authUser: { role: "editor" } }, {}, "/api/admin/config-package/preview");
  assert.deepEqual(responses[0], { status: 400, payload: { ok: false, error: "config_checksum_invalid" } });
  assert.deepEqual(downloads, []);
});

test("admin config package routes reject non-administrators", async () => {
  const { handler, responses, downloads } = createHarness();
  await handler({ method: "GET", authUser: { role: "engineer" } }, {}, "/api/admin/config-package");
  assert.deepEqual(responses[0], { status: 403, payload: { ok: false, error: "admin_required" } });
  assert.deepEqual(downloads, []);
});
