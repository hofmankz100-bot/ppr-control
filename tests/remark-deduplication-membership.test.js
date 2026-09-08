"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const deduplication = require("../server/remark-deduplication");

function remark(id, metadata = {}, at = "2026-09-08T08:00:00.000Z") {
  return {
    id, at, text: "Leak", name: "Worker", role: "mechanic", authorKey: "id:worker",
    resolved: false, resolutionEvents: [], resolutionUpdates: [], ...metadata
  };
}

const closed = { repeatFailureCode: "1", repeatFailureName: "Seal", repeatFailureCycleId: "1:0", repeatFailureClosedAt: "2026-09-08T09:00:00.000Z" };
const scenarios = [
  ["different manual numbers", { repeatFailureCode: "1" }, { repeatFailureCode: "2" }],
  ["closed and open groups", closed, { repeatFailureCode: "2" }],
  ["reused number in a new cycle", closed, { repeatFailureCode: "1" }],
  ["different completed cycles", closed, { ...closed, repeatFailureCycleId: "1:1" }],
  ["independent members of one completed cycle", closed, closed],
  ["independent manually classified open members", { repeatFailureCode: "1" }, { repeatFailureCode: "1" }],
  ["manual and unclassified remarks", { repeatFailureCode: "1" }, {}],
  ["an explicitly cleared classification", { repeatFailureCode: "", repeatFailureMarkedAt: "2026-09-08T08:30:00Z" }, {}],
  ["legacy closed membership without cycle id", { repeatFailureCode: "1", repeatFailureClosedAt: closed.repeatFailureClosedAt }, { repeatFailureCode: "1" }]
];

for (const [name, left, right] of scenarios) {
  test(`technical deduplication preserves ${name} within and across records`, () => {
    const entries = [remark("a", left), remark("b", right, "2026-09-08T08:01:00.000Z")];
    const expected = structuredClone(entries);
    assert.deepEqual(deduplication.dedupeRemarkList(entries), expected);
    assert.deepEqual(deduplication.dedupeRemarkList(entries), expected, "repeated processing keeps both memberships");

    // Exact creation times used to take an unconditional cross-record shortcut.
    const crossEntries = [remark("a", left), remark("b", right)];
    const db = { checks: {
      "1:0:2026-09-08": { to: { commentLog: [crossEntries[0]] } },
      "1:1:2026-09-08": { to: { commentLog: [crossEntries[1]] } }
    }, catalog: { equipment: { "1": { repeatFailureArchives: { "1:0": { text: "Retain archived measures" } } } } } };
    const original = structuredClone(db);
    const options = {
      stableRemarkId: deduplication.stableRemarkId,
      isDowntimeEntry: deduplication.isDowntimeEntry,
      syncItemSummary: deduplication.syncItemSummary,
      remarkDeletionKey: (key, id) => `${key}|${id}`
    };
    for (let run = 0; run < 2; run += 1) {
      assert.equal(deduplication.dedupeDatabase(db, options).removed, 0);
      assert.deepEqual(db.checks, original.checks);
      assert.deepEqual(db.catalog, original.catalog);
      assert.deepEqual(db.archivedDuplicateRemarks, []);
      assert.deepEqual(db.remarkDeletionTombstones, {});
    }
  });
}

test("a replay of the same classified member remains idempotent", () => {
  for (const metadata of [{ repeatFailureCode: "1" }, closed]) {
    const saved = remark("same-member", metadata);
    const merged = deduplication.dedupeRemarkList([saved, structuredClone(saved)]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, saved.id);
    for (const [key, value] of Object.entries(metadata)) assert.equal(merged[0][key], value);
    assert.equal(deduplication.dedupeRemarkList(merged).length, 1);
  }
});

test("conflicting manual metadata is not lost even when copied entries share an id", () => {
  const entries = [remark("same-id", closed), remark("same-id", { repeatFailureCode: "2" })];
  assert.equal(deduplication.dedupeRemarkList(entries).length, 2);
});

test("legacy classified entries without ids are preserved rather than guessed to be retries", () => {
  const entries = [remark(undefined, closed), remark(undefined, closed)];
  assert.equal(deduplication.dedupeRemarkList(entries).length, 2);
});

test("ordinary unclassified retry deduplication remains compatible with missing or empty metadata", () => {
  for (const metadata of [{}, { repeatFailureCode: "", repeatFailureName: "", repeatFailureCycleId: "", repeatFailureClosedAt: "" }]) {
    const merged = deduplication.dedupeRemarkList([remark("retry-a"), remark("retry-b", metadata, "2026-09-08T08:01:00.000Z")]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "retry-a");
  }
});
