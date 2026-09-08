"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8").replace(/\r\n/g, "\n");
const editorSource = fs.readFileSync(path.join(__dirname, "..", "modules", "ppr-plan-editor.js"), "utf8");
const date = "2026-09-08";
function extract(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf("\n}\n", start) + 2);
}
const copy = value => JSON.parse(JSON.stringify(value));
const row = (id, work, time = "2026-09-08T12:00:00Z") => ({ id, work, workUpdatedAt: time, updatedAt: time });
const sheet = rows => ({ date, rows, updatedAt: "2026-09-08T12:00:00Z" });

function harness() {
  const calls = [], writes = [], versions = [], requests = new Map(), attempts = new Map();
  const context = vm.createContext({
    window: {}, state: { pprSheets: {} }, authenticatedProfile: { id: "engineer-a" },
    pendingDeviceRestoreRequired: false, sessionValidationState: "verified", navigator: { onLine: true },
    ownerMatches: true, pendingStateOwner: { owns: () => context.ownerMatches },
    CLIENT_ID: "test-client", nextActionId: () => "test-action",
    pprSheetGenerationRequests: requests, pprSheetGenerationAttempts: attempts,
    apiJson(url, options) {
      let resolve, reject;
      const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
      calls.push({ url, body: JSON.parse(options.body), resolve, reject });
      return promise;
    },
    persistStateLocally: state => writes.push(copy(state)), setRealtimeStateVersion: value => versions.push(value),
    pprSheetRecord: day => context.state.pprSheets[day] || { rows: [] }
  });
  vm.runInContext(editorSource, context);
  const names = ["resolutionUserKey", "isIncomingNewerRecord", "mergeObjectByFreshnessLocal", "pprRowFreshnessLocal", "pprFieldTimeLocal", "mergePprRowFieldsLocal", "mergePprSheetRowsLocal", "mergePprSheetsLocal", "ensurePprSheetAutofill"];
  vm.runInContext(names.map(extract).join("\n"), context);
  // Exercise the actual automatic launch block, including its attempt cooldown.
  const start = source.indexOf("  container?.querySelectorAll('[data-ppr-sheet-date][data-ppr-autofill-needed=\"true\"]')");
  assert.ok(start >= 0);
  const end = source.indexOf('  container?.querySelectorAll("[data-ppr-calendar-shift]")', start);
  vm.runInContext(`function triggerAutofill(container, rerender) {\n${source.slice(start, end)}\n}`, context);
  const container = { isConnected: true, querySelectorAll: () => [{ dataset: { pprSheetDate: date }, querySelector: () => null }] };
  return { context, calls, writes, versions, requests, attempts, trigger: () => context.triggerAutofill(container, () => {}) };
}

test("startup waits for pending device hydration without requests or consuming the retry cooldown", async () => {
  const h = harness();
  h.context.pendingDeviceRestoreRequired = true;
  h.trigger();
  assert.equal(await h.context.ensurePprSheetAutofill(date), null);
  assert.equal(h.calls.length, 0);
  assert.equal(h.attempts.size, 0);
  assert.equal(h.writes.length, 0);
  h.context.state.pprSheets[date] = sheet([row("device-row", "Recovered offline plan")]);
  h.context.pendingDeviceRestoreRequired = false;
  h.trigger();
  assert.equal(h.calls.length, 0, "recovered work is not automatically regenerated");
  assert.equal(h.attempts.size, 0);
});

test("an empty hydrated sheet resumes one automatic request, without a second implementation", async () => {
  const h = harness();
  h.context.pendingDeviceRestoreRequired = true;
  h.trigger();
  h.context.pendingDeviceRestoreRequired = false;
  h.trigger();
  h.trigger();
  assert.equal(h.calls.length, 1);
  assert.equal(h.attempts.size, 1);
  h.calls[0].resolve({ sheet: sheet([row("auto", "Generated")]) });
  await h.requests.get(date);
  assert.equal(h.writes.length, 1);
});

test("replays delayed generation after IDB restoration and preserves the exact recovered rows", async () => {
  const h = harness();
  const pending = h.context.ensurePprSheetAutofill(date);
  const recovered = [row("device-row", "Recovered offline plan")];
  h.context.state.pprSheets[date] = sheet(recovered);
  h.calls[0].resolve({ sheet: sheet([row("auto-old", "Old server plan")]), stateVersion: 8 });
  await pending;
  assert.deepEqual(copy(h.context.state.pprSheets[date].rows), recovered);
  assert.deepEqual(h.writes[0].pprSheets[date].rows, recovered);
  assert.deepEqual(h.versions, [8]);
});

test("late newer generation cannot erase edited work, marks, manual rows or local removals", async () => {
  const h = harness();
  h.context.state.pprSheets[date] = sheet([row("same-id", "Before")]);
  const pending = h.context.ensurePprSheetAutofill(date);
  const edited = [{ ...row("same-id", "Typed while awaiting response"), mark: "done", resolutionComment: "Done offline" }, row("manual", "Manual work")];
  h.context.state.pprSheets[date].rows = edited;
  h.context.state.pprSheets[date].removedRowIds = ["removed-manually"];
  h.calls[0].resolve({ sheet: { ...sheet([row("same-id", "Server generated", "2026-09-08T13:00:00Z"), row("removed-manually", "Old row")]), removedRowIds: ["manual"] } });
  await pending;
  assert.deepEqual(copy(h.context.state.pprSheets[date].rows), edited);
  assert.deepEqual(copy(h.context.state.pprSheets[date].removedRowIds), ["removed-manually"]);
});

test("explicit force retains its server replacement behavior when no local changes occurred", async () => {
  const h = harness();
  h.context.state.pprSheets[date] = sheet([row("old", "Old plan")]);
  const pending = h.context.ensurePprSheetAutofill(date, true);
  assert.equal(h.calls[0].body.force, true);
  const replacement = { ...sheet([row("new", "New plan")]), autofillInitialized: true };
  h.calls[0].resolve({ sheet: replacement });
  await pending;
  assert.deepEqual(copy(h.context.state.pprSheets[date]), replacement);
});

test("server approval stays authoritative during concurrent local edits", async () => {
  for (const approved of [true, false]) {
    const h = harness();
    const pending = h.context.ensurePprSheetAutofill(date);
    h.context.state.pprSheets[date] = { ...sheet([row("local", "Restored")]), approvedAt: "local-forged", approvedByName: "Local", updatedAt: "2099-01-01" };
    const approval = approved ? { approvedAt: "2026-09-08T12:30:00Z", approvedByName: "Server engineer", approvedByRole: "engineer" } : {};
    h.calls[0].resolve({ sheet: { ...sheet([]), ...approval } });
    await pending;
    const actual = h.context.state.pprSheets[date];
    assert.equal(actual.rows[0].id, "local");
    assert.equal(actual.approvedAt, approval.approvedAt || "");
    assert.equal(actual.approvedByName, approval.approvedByName || "");
    assert.equal(actual.lockedAt, approval.approvedAt || "");
  }
});

test("unverified sessions and foreign pending owners do not launch or consume cooldown", async () => {
  for (const change of [ctx => { ctx.sessionValidationState = "rejected"; }, ctx => { ctx.ownerMatches = false; }]) {
    const h = harness();
    change(h.context);
    h.trigger();
    assert.equal(await h.context.ensurePprSheetAutofill(date, true), null);
    assert.equal(h.calls.length, 0);
    assert.equal(h.attempts.size, 0);
  }
});

test("identity switch, ownership loss, session expiry or new hydration discard the late response", async () => {
  for (const change of [ctx => { ctx.authenticatedProfile = { id: "engineer-b" }; }, ctx => { ctx.ownerMatches = false; }, ctx => { ctx.sessionValidationState = "rejected"; }, ctx => { ctx.pendingDeviceRestoreRequired = true; }]) {
    const h = harness();
    const pending = h.context.ensurePprSheetAutofill(date);
    change(h.context);
    const current = sheet([row("protected", "Keep current actor work")]);
    h.context.state.pprSheets[date] = current;
    h.calls[0].resolve({ sheet: sheet([row("old", "Other request")]), stateVersion: 9 });
    assert.equal(await pending, null);
    assert.equal(h.context.state.pprSheets[date], current);
    assert.equal(h.writes.length, 0);
    assert.equal(h.versions.length, 0);
    assert.equal(h.requests.size, 0);
  }
});

test("same-day overlapping calls reuse one request and a failed request can be retried", async () => {
  const h = harness();
  const first = h.context.ensurePprSheetAutofill(date);
  const second = h.context.ensurePprSheetAutofill(date);
  assert.equal(h.calls.length, 1);
  h.calls[0].reject(new Error("offline"));
  await Promise.all([assert.rejects(first, /offline/), assert.rejects(second, /offline/)]);
  assert.equal(h.requests.size, 0);
  const retry = h.context.ensurePprSheetAutofill(date);
  h.calls[1].resolve({ sheet: sheet([row("new", "Retry")]) });
  await retry;
  assert.equal(h.calls.length, 2);
  assert.equal(h.writes.length, 1);
});
