"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminConfigPackageRoute } = require("../server/admin-config-package-route");

function createHarness(body = {}) {
  const downloads = [];
  const responses = [];
  const database = { adminConfig: { companyName: "Hofmann" } };
  const handler = createAdminConfigPackageRoute({
    buildAdminConfigPackage: db => ({ companyName: db.adminConfig.companyName, checksum: "abc" }),
    readBody: async () => body,
    readDb: () => database,
    sendDownload: (_res, filename, payload) => downloads.push({ filename, payload }),
    sendJson: (_res, status, payload) => responses.push({ status, payload }),
    todayStamp: () => "2026-08-23",
    validateAdminConfigPackage: input => input?.checksum === "abc"
      ? { summary: { companyName: input.companyName } }
      : { error: "config_checksum_invalid" }
  });
  return { handler, downloads, responses };
}

test("admin config package route exports a dated JSON package", async () => {
  const { handler, downloads, responses } = createHarness();
  const handled = await handler({ method: "GET", authUser: { role: "editor" } }, {}, "/api/admin/config-package");

  assert.equal(handled, true);
  assert.deepEqual(downloads, [{
    filename: "ppr_admin_config_2026-08-23.json",
    payload: { companyName: "Hofmann", checksum: "abc" }
  }]);
  assert.deepEqual(responses, []);
});

test("admin config package preview returns the validated summary", async () => {
  const { handler, responses } = createHarness({ package: { companyName: "Hofmann", checksum: "abc" } });
  await handler({ method: "POST", authUser: { role: "editor" } }, {}, "/api/admin/config-package/preview");
  assert.deepEqual(responses[0], { status: 200, payload: { ok: true, summary: { companyName: "Hofmann" } } });
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
