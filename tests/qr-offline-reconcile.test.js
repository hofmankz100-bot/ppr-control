"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

function functionSource(name) {
  const source = app.replace(/\r\n/g, "\n");
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf("\n}\n", start) + 2);
}

test("full reconnect and replacement patches retain only the current employee's pending QR marks", () => {
  const vm = require("node:vm");
  const pending = [{ equipmentId: 1, nodeIndex: 0, date: "2026-10-08", shift: "day", group: "technical", ownerId: "me", capturedAt: "2026-10-08T10:00:00Z" }];
  pending.push({ ...pending[0], nodeIndex: 1, ownerId: "other" });
  pending.push({ ...pending[0], nodeIndex: 2, journalAction: "grp" });
  const c = vm.createContext({ state: { checks: {} }, stateDataVersion: 0, authenticatedProfile: { id: "me", name: "Employee", role: "electrician" },
    window: { PprDeviceCachePolicy: require("../modules/device-cache-policy") }, pendingQrWalkMarks: () => pending,
    equipmentById: () => ({ nodes: ["one", "two", "three"] }), key: (eq, node, date) => `${eq}:${node}:${date}`,
    localStorage: { getItem: () => null }, STORE_KEY: "test", WALK_SHIFT_CLEANUP_VERSION: "current",
    pendingStateOwner: { clear() {} }, clearLegacyWalkCompletions() {}, compactCheckRecords: value => value,
    applyRoleLabelOverrides() {}, applyPendingPprSheetActions() {}, persistStateLocally() {},
    mergeArrayByIdLocal: (a, b) => b || a || [], mergePprSheetsLocal: (a, b) => b || a || {},
    mergeObjectByFreshnessLocal: (a, b) => ({ ...a, ...b }),
    hasMeaningfulCheckKind: item => Boolean(item?.walkGroups), mergeCheckRecordLocal: (a, b) => b,
  });
  vm.runInContext(["applyPendingQrWalkMarks", "mergeRemoteState", "mergeRealtimePatch"].map(functionSource).join("\n"), c);
  const recordKey = "1:0:2026-10-08";
  c.mergeRemoteState({ checks: {}, walkShiftCleanupVersion: "current" }, { preferRemote: true });
  assert.equal(c.state.checks[recordKey].to.walkGroups.technical.day.done, true);
  assert.deepEqual(Object.keys(c.state.checks), [recordKey]);
  c.mergeRealtimePatch({ checks: { [recordKey]: {} }, replaceCheckKeys: [recordKey] });
  assert.equal(c.state.checks[recordKey].to.walkGroups.technical.day.done, true);
  assert.equal(pending.length, 3);
  c.mergeRemoteState({ checks: {}, operationalResetAt: "2026-10-08T11:00:00Z", walkShiftCleanupVersion: "current" }, { preferRemote: true });
  assert.equal(Object.keys(c.state.checks).length, 0);
});

test("empty server status cannot erase an offline QR still queued on the phone", () => {
  const start = app.indexOf("function reconcileQrWalkStatusFromServer");
  const end = app.indexOf("function confirmQrScanFeedback", start);
  const source = app.slice(start, end);
  assert.match(source, /const pendingMarks = pendingQrWalkMarks\(\)/);
  assert.match(source, /serverChecks\[recordKey\] \|\| hasPendingMark\(nodeIndex\)/);
  assert.match(source, /mark\?\.equipmentId/);
  assert.match(source, /mark\?\.date/);
  assert.match(source, /mark\?\.shift/);
  assert.match(source, /mark\?\.group/);
});
