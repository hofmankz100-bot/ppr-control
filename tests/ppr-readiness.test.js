"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const { makeHarness, fixture: pushFixture, source: rawSource } = require("./push-snapshot.test");
const { pprSheetReadyForApproval, reconcilePprApprovalRequest, generatePprSheet } = require("../server/ppr-autofill");
const { planSnapshot } = require("../server/ppr-plan");
const source = rawSource.replace(/\r\n/g, "\n");
const date = "2026-09-08", old = "2020-01-01T00:00:00.000Z";
const target = { equipmentId: 90, equipment: "Press", node: "Motor", area: "A" };
const clone = value => structuredClone(value);
const flush = () => new Promise(resolve => setImmediate(resolve));
function extract(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf("\n}\n", start) + 2);
}
function fixture(options = {}) {
  const db = pushFixture();
  db.checks = {}; db.downtimes = [];
  db.catalog.equipment = { 90: { id: 90, name: "Press", nodes: ["Motor"], area: "A", created: true } };
  db.pprSheets = {
    [date]: { id: `sheet:${date}`, date, rows: [
      { id: "a", work: "First work", mark: "done", markedAt: old, resolutionComment: "First done", ...target },
      { id: "b", work: "Second work", mark: "", ...target },
      { id: "blank", work: " ", mark: "" }
    ] },
    "2026-08-01": { date: "2026-08-01", approvedAt: old, approvedByName: "Historical engineer", approvalRequestedAt: old, rows: [{ id: "history", work: "Historical work", mark: "done" }] }
  };
  db.pushNotifications.subscriptions = db.pushNotifications.subscriptions.filter(entry => entry.profile.id === "engineer");
  const h = makeHarness(db, options), context = h.context;
  Object.assign(context, {
    crypto, URL, isDeepStrictEqual, REMOVED_EQUIPMENT_IDS: new Set(),
    readBody: async req => req.body,
    normalizedAdminConfig: () => ({}),
    sendJson: (res, status, body) => Object.assign(res, { status, body }),
    warnServerDiagnostic: (_, error) => h.errors.push(error),
    nodeMutationAccessServer: () => true, userHasAreaServer: () => true,
    openRemarkKeysServer: () => new Set(),
    // No check/catalog/downtime mutation is requested in this PPR fixture.
    compactCheckRecords: value => value || {}, mergeCheckRecordsByFreshness: value => value || {},
    purgeClosedWithoutScoreRemarksServer() {}, dedupeDuplicateRemarkEntriesServer() {}, purgeRemovedEquipmentData() {},
    mergeArrayById: (current = [], incoming = []) => [...current, ...incoming],
    broadcastState: () => "test:1", realtimeStateVersion: () => "test:1"
  });
  const names = ["publicState", "sanitizeIncomingValue", "mergeObjectRecords", "isIncomingNewerRecord", "mergeObjectRecordsByFreshness",
    "pprRowFreshness", "pprFieldTime", "mergePprRowFields", "mergePprRows", "mergePprSheetsByFreshness",
    "reconcilePprApprovalRequests", "changedRecordPatch", "changedStatePatch"];
  vm.runInContext(names.map(extract).join("\n"), context);
  const start = source.indexOf('  if (pathname === "/api/state" && req.method === "PUT")');
  const end = source.indexOf('  if (pathname === "/api/downtime-close"', start);
  vm.runInContext(`async function pprRoute(req, res, pathname) {\n${source.slice(start, end)}\n}`, context);
  return Object.assign(h, {
    async request(endpoint, body, role = "mechanic", method = "POST") {
      const res = {};
      await h.transactions.run(() => context.pprRoute({ method, body, url: `${endpoint}?date=${date}`, authUser: { id: role, role, name: `Test ${role}` } }, res, endpoint));
      await flush();
      return res;
    },
    mark(mark = "done", rowId = "b") { return this.request("/api/ppr-sheet/action", { date, action: "mark", rowId, mark, resolutionComment: mark ? "Inspected" : "", clientId: "worker" }); },
    async sync(mark) {
      const sheet = clone(this.db.pprSheets[date]);
      Object.assign(sheet.rows.find(row => row.id === "b"), { mark, resolutionComment: mark ? "Offline inspection" : "", updatedAt: "2099-01-01", markUpdatedAt: "2099-01-01", resolutionUpdatedAt: "2099-01-01" });
      return this.request("/api/state", { pprSheets: { [date]: sheet }, clientId: "worker" }, "mechanic", "PUT");
    },
    types() { return this.sent.map(entry => entry.payload.type); },
    pending() { return context.pendingPprCountForSubscription(this.db, { profile: { role: "engineer" } }); }
  });
}

test("readiness ignores blank rows and stale flags; reconciliation preserves approved history", () => {
  const sheet = { approvalRequestedAt: old, rows: [{ work: "Active", mark: "" }, { work: " ", mark: "done" }] };
  assert.equal(pprSheetReadyForApproval(sheet), false);
  const before = clone(sheet);
  assert.equal(reconcilePprApprovalRequest(sheet, before), "clear");
  assert.equal(sheet.approvalRequestedAt, "");
  const approved = { ...before, approvedAt: old, approvedByName: "Historical engineer" }, saved = clone(approved);
  assert.equal(reconcilePprApprovalRequest(approved, saved), "");
  assert.deepEqual(approved, saved);
});

test("actual mark API: last mark notifies once, unmark clears, remark notifies again, retries never duplicate", async () => {
  const h = fixture(), history = clone(h.db.pprSheets["2026-08-01"]);
  assert.equal((await h.mark()).status, 200);
  const firstRequest = h.db.pprSheets[date].approvalRequestedAt;
  assert.ok(firstRequest);
  assert.deepEqual(h.types(), ["ppr-approval"]);
  assert.equal(h.pending(), 1);
  assert.equal((await h.mark()).status, 200);
  assert.equal(h.db.pprSheets[date].approvalRequestedAt, firstRequest);
  assert.deepEqual(h.types(), ["ppr-approval"]);
  assert.equal((await h.mark("")).status, 200);
  assert.equal(h.db.pprSheets[date].approvalRequestedAt, "");
  assert.equal(h.pending(), 0);
  assert.deepEqual(h.types(), ["ppr-approval", "ppr-approval-cleared"]);
  await h.mark("");
  assert.equal(h.sent.length, 2);
  await h.mark("na");
  assert.deepEqual(h.types(), ["ppr-approval", "ppr-approval-cleared", "ppr-approval"]);
  assert.deepEqual(h.sent.map(item => item.payload.badgeCount), [1, 0, 1]);
  assert.deepEqual(h.db.pprSheets["2026-08-01"], history);
});

test("actual generic/offline PUT shares the same transitions and ignores stale mark replays", async () => {
  const h = fixture();
  for (const mark of ["done", "done", "", "", "na"]) assert.equal((await h.sync(mark)).status, 200);
  assert.deepEqual(h.types(), ["ppr-approval", "ppr-approval-cleared", "ppr-approval"]);
  assert.equal(h.pending(), 1);
  const stale = clone(h.db.pprSheets[date]);
  Object.assign(stale.rows.find(row => row.id === "b"), { mark: "", resolutionComment: "", updatedAt: old, markUpdatedAt: old, resolutionUpdatedAt: old });
  await h.request("/api/state", { pprSheets: { [date]: stale } }, "mechanic", "PUT");
  assert.equal(h.db.pprSheets[date].rows.find(row => row.id === "b").mark, "na");
  assert.equal(h.sent.length, 3);
});

test("savePlan makes a previously ready sheet incomplete and clears its notification without editing completed work", async () => {
  const h = fixture();
  await h.mark();
  const snapshot = planSnapshot(h.db, date);
  const rows = clone(snapshot.sheet.rows);
  rows.push({ id: "new-work", work: "Additional inspection", ...target });
  const result = await h.request("/api/ppr-sheet/plan", { date, rows, revision: snapshot.revision, templateVersions: snapshot.templateVersions }, "engineer");
  assert.equal(result.status, 200);
  assert.equal(h.db.pprSheets[date].approvalRequestedAt, "");
  assert.deepEqual(h.types(), ["ppr-approval", "ppr-approval-cleared"]);
  assert.equal(h.db.pprSheets[date].rows.find(row => row.id === "b").mark, "done");
  await h.mark("done", "new-work");
  assert.equal(h.types().at(-1), "ppr-approval");
});

test("autofill repairs stale readiness without replacing saved rows; unchanged reopening does not resend", async () => {
  const h = fixture();
  h.db.pprSheets[date].approvalRequestedAt = old;
  const rows = clone(h.db.pprSheets[date].rows);
  assert.equal(h.pending(), 0, "incomplete stale flag is never counted");
  let result = await h.request("/api/ppr-sheet/generate", { date }, "engineer");
  assert.equal(result.status, 200);
  assert.equal(result.body.changed, true);
  assert.equal(h.db.pprSheets[date].approvalRequestedAt, "");
  assert.deepEqual(h.db.pprSheets[date].rows, rows);
  assert.deepEqual(h.types(), ["ppr-approval-cleared"]);
  result = await h.request("/api/ppr-sheet/generate", { date }, "engineer");
  assert.equal(result.body.changed, false);
  assert.equal(h.sent.length, 1);
  const legacy = { rows: [{ id: "legacy", work: "Completed", mark: "done" }] };
  const repaired = generatePprSheet({ previous: legacy, date, catalog: {}, now: old });
  assert.equal(repaired.changed, true);
  assert.equal(repaired.sheet.approvalRequestedAt, old);
  assert.deepEqual(repaired.sheet.rows, legacy.rows);
});

test("server approval clears the request notification but preserves its historical timestamp and signer", async () => {
  const h = fixture();
  await h.mark();
  const requestedAt = h.db.pprSheets[date].approvalRequestedAt;
  const result = await h.request("/api/ppr-sheet/action", { date, action: "approve" }, "engineer");
  assert.equal(result.status, 200);
  assert.equal(h.db.pprSheets[date].approvalRequestedAt, requestedAt);
  assert.equal(h.db.pprSheets[date].approvedByName, "Test engineer");
  assert.deepEqual(h.types(), ["ppr-approval", "ppr-approval-cleared"]);
  assert.equal(h.pending(), 0);
  const approved = clone(h.db.pprSheets[date]);
  assert.equal((await h.mark("")).status, 409);
  await h.request("/api/ppr-sheet/generate", { date, force: true }, "engineer");
  await h.sync("");
  assert.deepEqual(h.db.pprSheets[date], approved);
  assert.equal(h.sent.length, 2);
});

test("failed commit discards the readiness flag and all deferred notifications; retry commits exactly once", async () => {
  let fail = true;
  const h = fixture({ commit: async () => { if (fail) throw new Error("isolated commit failure"); } });
  const before = clone(h.db);
  await assert.rejects(h.mark(), /isolated commit failure/);
  await flush();
  assert.deepEqual(h.db, before);
  assert.equal(h.sent.length, 0);
  fail = false;
  await h.mark();
  assert.deepEqual(h.types(), ["ppr-approval"]);
});

test("notification delivery begins only after the write is durably committed", async () => {
  let release;
  const committed = new Promise(resolve => { release = resolve; });
  const h = fixture({ commit: () => committed });
  const pending = h.mark();
  await flush();
  assert.equal(h.sent.length, 0);
  assert.equal(h.db.pprSheets[date].approvalRequestedAt, undefined);
  release();
  await pending;
  assert.ok(h.db.pprSheets[date].approvalRequestedAt);
  assert.deepEqual(h.types(), ["ppr-approval"]);
});

test("failed unmark cannot clear a valid notification or saved readiness; a later retry clears once", async () => {
  let fail = false;
  const h = fixture({ commit: async () => { if (fail) throw new Error("isolated unmark failure"); } });
  await h.mark();
  const before = clone(h.db.pprSheets[date]);
  fail = true;
  await assert.rejects(h.mark(""), /isolated unmark failure/);
  await flush();
  assert.deepEqual(h.db.pprSheets[date], before);
  assert.deepEqual(h.types(), ["ppr-approval"]);
  fail = false;
  await h.mark("");
  assert.deepEqual(h.types(), ["ppr-approval", "ppr-approval-cleared"]);
});

test("concurrent duplicate marks and ordered mark/unmark/mark transactions have one notification per committed transition", async () => {
  const h = fixture();
  const replies = await Promise.all([h.mark(), h.mark()]);
  assert.ok(replies.every(reply => reply.status === 200));
  assert.deepEqual(h.types(), ["ppr-approval"]);
  await Promise.all([h.mark(""), h.mark("done")]);
  assert.deepEqual(h.types(), ["ppr-approval", "ppr-approval-cleared", "ppr-approval"]);
  assert.equal(h.pending(), 1);
});
