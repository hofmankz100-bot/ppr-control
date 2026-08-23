"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminArchivesRoute } = require("../server/admin-archives-route");

function createHarness() {
  const responses = [];
  const calls = [];
  const database = { adminAuditLog: [] };
  const handler = createAdminArchivesRoute({
    adminArchiveSelection: (db, days) => {
      calls.push({ db, days });
      return {
        days: Number(days),
        cutoffAt: "2026-05-25T00:00:00.000Z",
        counts: { audit: 3, resolved_alerts: 1 }
      };
    },
    readDb: () => database,
    sendJson: (_res, status, payload) => responses.push({ status, payload })
  });
  return { handler, responses, calls, database };
}

test("admin archives route ignores unrelated requests", async () => {
  const { handler, responses, calls } = createHarness();
  const handled = await handler({ method: "GET" }, {}, "/api/health", new URL("https://example.test/api/health"));
  assert.equal(handled, false);
  assert.deepEqual(responses, []);
  assert.deepEqual(calls, []);
});

test("admin archive preview returns counts for the requested age", async () => {
  const { handler, responses, calls, database } = createHarness();
  const handled = await handler(
    { method: "GET", authUser: { role: "editor" } },
    {},
    "/api/admin/archives/preview",
    new URL("https://example.test/api/admin/archives/preview?days=90")
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [{ db: database, days: "90" }]);
  assert.deepEqual(responses[0], {
    status: 200,
    payload: {
      ok: true,
      preview: {
        days: 90,
        cutoffAt: "2026-05-25T00:00:00.000Z",
        counts: { audit: 3, resolved_alerts: 1 }
      }
    }
  });
});

test("admin archive preview rejects non-administrators", async () => {
  const { handler, responses, calls } = createHarness();
  await handler(
    { method: "GET", authUser: { role: "engineer" } },
    {},
    "/api/admin/archives/preview",
    new URL("https://example.test/api/admin/archives/preview?days=90")
  );
  assert.deepEqual(responses[0], { status: 403, payload: { ok: false, error: "admin_required" } });
  assert.deepEqual(calls, []);
});
