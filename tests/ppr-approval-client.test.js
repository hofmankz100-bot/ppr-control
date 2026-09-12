"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const moduleSource = fs.readFileSync(path.join(__dirname, "../modules/ppr-plan-editor.js"), "utf8");
const date = "2026-09-08";
const plain = value => JSON.parse(JSON.stringify(value));
function implementation(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  assert.ok(start >= 0, name);
  const tail = source.slice(start);
  const end = tail.slice(1).search(/\n(?:async )?function /);
  return tail.slice(0, end + 1);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(api) {
  const sheet = { date, updatedAt: "2099-01-01T00:00:00Z", rows: [{ id: "r", work: "Осмотр", mark: "done", resolutionComment: "Сохранённый черновик", resolutionUpdatedAt: "2099-01-01T00:00:00Z", updatedAt: "2099-01-01T00:00:00.000Z" }] };
  const history = { approvedAt: "2026-08-01", approvedByName: "Историческая подпись", rows: [] };
  const requests = [], errors = [], persisted = [];
  let renders = 0;
  const context = vm.createContext({
    window: {},
    stateDataVersion: 0, WALK_SHIFT_CLEANUP_VERSION: "test", STORE_KEY: "test",
    localStorage: { getItem: () => "1" },
    clearLegacyWalkCompletions() {}, applyRoleLabelOverrides() {}, compactCheckRecords: records => records,
    mergeCheckRecordsLocal: (left = {}, right = {}) => ({ ...left, ...right }),
    mergeArrayByIdLocal: (left = [], right = []) => [...left, ...right],
    state: { pprSheets: { [date]: sheet, "2026-08-01": history }, checks: { kept: { text: "Журнал" } } },
    profile: { role: "engineer", name: "Текущий инженер" }, CLIENT_ID: "test", nextActionId: () => "approval-action",
    canApprovePprSheet: () => true, pprSheetDefaultRows: () => [],
    apiJson: async (url, options) => { requests.push({ url, options }); return api(url, options); },
    setRealtimeStateVersion() {},
    persistStateLocally: state => persisted.push(plain(state)),
    saveState() { throw Error("Approval must never fall back to generic state writes"); },
    showAppToast: (...args) => errors.push(args),
    rerender: () => { renders++; }
  });
  const names = ["setButtonBusy", "isIncomingNewerRecord", "mergeObjectByFreshnessLocal", "pprRowFreshnessLocal", "pprFieldTimeLocal", "mergePprRowFieldsLocal", "mergePprSheetRowsLocal", "mergePprSheetsLocal", "pprSheetRecord", "pprSheetCompletion", "mergeRemoteState", "mergeRealtimePatch"];
  vm.runInContext(names.map(implementation).join("\n") + "\n" + implementation("publishPprSheetAction"), context);
  vm.runInContext(moduleSource, context);
  function button() {
    const result = { dataset: { approvePprSheet: date }, isConnected: true, disabled: false, textContent: "Принять", addEventListener: (type, handler) => { result.click = handler; } };
    const container = { querySelectorAll: selector => selector === "[data-approve-ppr-sheet]" ? [result] : [] };
    context.window.PprPlanEditor.bind(container, {
      api: context.apiJson, rerender: context.rerender, toast: context.showAppToast, canPlan: () => false,
      approval: { canApprove: context.canApprovePprSheet, getSheet: context.pprSheetRecord, completion: context.pprSheetCompletion,
        publish: context.publishPprSheetAction, persist: () => context.persistStateLocally(context.state), setBusy: context.setButtonBusy }
    });
    return result;
  }
  return { context, button, requests, errors, persisted, renders: () => renders, sheet: () => context.state.pprSheets[date] };
}
function approval(name = "Серверный инженер") {
  return { date, approvedAt: "2026-09-08T14:00:00Z", approvedByName: name, approvedByRole: "engineer", lockedAt: "2026-09-08T14:00:00Z", updatedAt: "2026-09-08T14:00:00Z", rows: [{ id: "r", work: "Осмотр", mark: "done", resolutionComment: "Серверная запись" }] };
}

test("PPR rows are grouped by shop, equipment and node without mutating their saved order", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(moduleSource, context);
  const rows = [
    { id: "paint", area: "Покрасочный цех", equipmentId: 4, equipment: "Печь", node: "Горелка" },
    { id: "press-b", area: "Прессовый участок", equipmentId: 2, equipment: "Пресс", node: "Насос" },
    { id: "press-a", area: "Прессовый участок", equipmentId: 2, equipment: "Пресс", node: "Гидравлика" },
    { id: "blank" }
  ];
  const groups = context.window.PprPlanEditor.groupByTarget(rows);
  assert.deepEqual(plain(groups.map(group => [group.area, group.equipment, group.node, group.rows.map(item => item.row.id)])), [
    ["Покрасочный цех", "Печь", "Горелка", ["paint"]],
    ["Прессовый участок", "Пресс", "Гидравлика", ["press-a"]],
    ["Прессовый участок", "Пресс", "Насос", ["press-b"]],
    ["", "", "", ["blank"]]
  ]);
  assert.deepEqual(rows.map(row => row.id), ["paint", "press-b", "press-a", "blank"]);
});

for (const status of [503, 401]) test(`failed approval (${status}) preserves drafts and historical signatures without locking or queueing`, async () => {
  const h = harness(async () => { throw Object.assign(Error("unavailable"), { status }); });
  const before = plain(h.context.state), button = h.button();
  await button.click();
  assert.deepEqual(plain(h.context.state), before);
  assert.equal(h.persisted.length, 0);
  assert.equal(h.requests.length, 1);
  assert.equal(button.disabled, false);
  assert.equal(h.errors.length, 1);
  assert.equal(h.renders(), 1);
});

test("only a confirmed server signature locks the sheet, even when local draft timestamps are newer", async () => {
  const pending = deferred(), h = harness(() => pending.promise), button = h.button();
  const before = plain(h.context.state), saving = button.click();
  assert.equal(button.disabled, true);
  assert.deepEqual(plain(h.context.state), before);
  pending.resolve({ ok: true, state: { pprSheets: { [date]: approval() } }, stateVersion: "v2" });
  await saving;
  assert.equal(h.sheet().approvedByName, "Серверный инженер");
  assert.equal(h.sheet().approvedAt, approval().approvedAt);
  assert.equal(h.sheet().lockedAt, approval().lockedAt);
  assert.equal(h.sheet().rows[0].resolutionComment, before.pprSheets[date].rows[0].resolutionComment);
  assert.deepEqual(plain(h.context.state.pprSheets["2026-08-01"]), before.pprSheets["2026-08-01"]);
  assert.deepEqual(plain(h.context.state.checks), before.checks);
  assert.equal(h.errors.length, 0);
});

test("repeated clicks and a second rendered button send only one approval request", async () => {
  const pending = deferred(), h = harness(() => pending.promise), button = h.button();
  const saving = button.click();
  assert.equal(h.context.window.PprPlanEditor.approvalPending(date), true);
  await button.click();
  await h.button().click();
  assert.equal(h.requests.length, 1);
  pending.resolve({ ok: true, state: { pprSheets: { [date]: approval() } } });
  await saving;
  assert.equal(h.context.window.PprPlanEditor.approvalPending(date), false);
  await h.button().click();
  assert.equal(h.requests.length, 1, "confirmed historical approval is not submitted again");
});

test("a concurrent engineer's approval is read after 409 and its signer is preserved", async () => {
  const h = harness(async url => {
    if (url.includes("/action")) throw Object.assign(Error("locked"), { status: 409, data: { error: "ppr_sheet_locked" } });
    assert.equal(url, `/api/ppr-sheet/plan?date=${date}`);
    return { sheet: approval("Другой инженер") };
  });
  const draft = plain(h.sheet().rows);
  await h.button().click();
  assert.equal(h.requests.length, 2);
  assert.equal(h.sheet().approvedByName, "Другой инженер");
  assert.deepEqual(plain(h.sheet().rows), draft);
  assert.equal(h.errors.length, 0);
});

test("failed conflict refresh cannot create an approval or discard saved work", async () => {
  const h = harness(async url => { throw Object.assign(Error("failed"), url.includes("/action") ? { status: 409, data: { error: "ppr_sheet_locked" } } : { status: 503 }); });
  const before = plain(h.context.state);
  await h.button().click();
  assert.deepEqual(plain(h.context.state), before);
  assert.equal(h.errors.length, 1);
});

test("a failed request does not roll back a concurrent realtime approval", async () => {
  const pending = deferred(), h = harness(() => pending.promise);
  const saving = h.button().click();
  Object.assign(h.sheet(), approval("Инженер из realtime"));
  const before = plain(h.context.state);
  pending.reject(Object.assign(Error("response lost"), { status: 503 }));
  await saving;
  assert.deepEqual(plain(h.context.state), before);
});

test("a successful response without a server signature is not represented as accepted", async () => {
  const h = harness(async () => ({ ok: true }));
  const before = plain(h.context.state);
  await h.button().click();
  assert.deepEqual(plain(h.context.state), before);
  assert.equal(h.errors.length, 1);
});

test("the application binds approval through the existing PPR module without a second handler", () => {
  assert.match(source, /approval: \{ canApprove: canApprovePprSheet, getSheet: pprSheetRecord, completion: pprSheetCompletion,/);
  assert.match(source, /publish: publishPprSheetAction, persist: \(\) => persistStateLocally\(state\), setBusy: setButtonBusy/);
  assert.match(source, /window\.PprPlanEditor\.approvalPending\(date\)/);
  assert.doesNotMatch(source, /function approvePprSheet\(|pprSheetApprovalRequests|querySelectorAll\("\[data-approve-ppr-sheet\]"\)/);
});

for (const entry of ["hydrate", "realtime"]) test(`${entry} corrects a legacy false approval using only server signature fields and keeps future-dated drafts`, () => {
  const h = harness(async () => {});
  Object.assign(h.sheet(), approval("Ложная локальная подпись"), {
    updatedAt: "2099-01-01T00:00:00Z", approvalRequestedAt: "2026-09-08T12:00:00Z",
    rows: [{ id: "r", work: "Осмотр", mark: "done", resolutionComment: "Черновик", resolutionUpdatedAt: "2099-01-01T00:00:00Z", updatedAt: "2099-01-01T00:00:00.000Z" }]
  });
  const old = h.sheet(), before = plain(h.context.state);
  const server = { updatedAt: "2026-09-08T13:00:00Z", rows: [{ id: "r", work: "Осмотр", mark: "done" }] };
  const serverBefore = plain(server);
  const patch = { pprSheets: { [date]: server } };
  if (entry === "hydrate") h.context.mergeRemoteState(patch, { preferRemote: true, serverPprApprovals: true });
  else h.context.mergeRealtimePatch(patch);
  for (const field of ["approvedAt", "approvedByName", "approvedByRole", "lockedAt"]) assert.equal(h.sheet()[field], "", field);
  assert.deepEqual(plain(h.sheet().rows), before.pprSheets[date].rows);
  assert.equal(h.sheet().approvalRequestedAt, before.pprSheets[date].approvalRequestedAt);
  assert.deepEqual(plain(h.context.state.pprSheets["2026-08-01"]), before.pprSheets["2026-08-01"]);
  assert.deepEqual(plain(h.context.state.checks), before.checks);
  assert.deepEqual(plain(old), before.pprSheets[date], "source cached snapshot is not mutated");
  assert.deepEqual(plain(server), serverBefore, "source server snapshot is not mutated");
});

test("verified server signature wins over a future local signature without overwriting local rows", () => {
  const h = harness(async () => {}), rows = plain(h.sheet().rows);
  Object.assign(h.sheet(), { approvedAt: "2099-01-01", approvedByName: "Локальная подпись", approvedByRole: "editor", lockedAt: "2099-01-01" });
  h.context.mergeRemoteState({ pprSheets: { [date]: approval("Подтвердил сервер") } }, { serverPprApprovals: true });
  assert.equal(h.sheet().approvedByName, "Подтвердил сервер");
  assert.equal(h.sheet().approvedAt, approval().approvedAt);
  assert.equal(h.sheet().approvedByRole, "engineer");
  assert.equal(h.sheet().lockedAt, approval().lockedAt);
  assert.deepEqual(plain(h.sheet().rows), rows);
});

test("an omitted historical sheet is never cleared by a partial or empty server response", () => {
  const h = harness(async () => {}), before = plain(h.context.state.pprSheets);
  h.context.mergeRemoteState({ pprSheets: {} }, { serverPprApprovals: true });
  h.context.mergeRealtimePatch({ pprSheets: {} });
  assert.deepEqual(plain(h.context.state.pprSheets), before);
});

test("offline IDB merges keep cached signatures until an actual server sheet is available", () => {
  const h = harness(async () => {});
  Object.assign(h.sheet(), { approvedAt: "2099-01-01", approvedByName: "Кэшированная подпись", lockedAt: "2099-01-01" });
  const before = plain(h.sheet());
  h.context.mergeRemoteState({ pprSheets: { [date]: { updatedAt: "2026-09-08", rows: [{ id: "r", work: "Осмотр", mark: "done" }] } } });
  assert.equal(h.sheet().approvedAt, before.approvedAt);
  assert.equal(h.sheet().approvedByName, before.approvedByName);
  const restored = h.context.mergePprSheetsLocal({}, { [date]: before });
  assert.deepEqual(plain(restored[date]), before);
});

test("legacy approved server sheets preserve their signer and derive lock time without inheriting local approval fields", () => {
  const h = harness(async () => {});
  Object.assign(h.sheet(), { approvedByRole: "editor", lockedAt: "2099-01-01" });
  h.context.mergeRealtimePatch({ pprSheets: { [date]: { approvedAt: "2026-08-31", approvedByName: "Исторический инженер", rows: [] } } });
  assert.equal(h.sheet().approvedAt, "2026-08-31");
  assert.equal(h.sheet().approvedByName, "Исторический инженер");
  assert.equal(h.sheet().lockedAt, "2026-08-31");
  assert.equal(h.sheet().approvedByRole, "");
});

test("only confirmed network snapshots opt into server approval reconciliation", () => {
  assert.match(source, /mergeRemoteState\(cached\);/);
  assert.match(source, /mergeRemoteState\(deviceState\);/);
  assert.match(source, /mergeRemoteState\(remote, \{ preferRemote: true, serverPprApprovals: true \}\)/);
  assert.match(source, /mergeRemoteState\(msg\.state \|\| \{\}, \{ preferRemote: true, serverPprApprovals: true \}\)/);
  assert.doesNotMatch(source, /mergeRemoteState\(result\.state, \{ preferRemote: (true|!hasNewLocalChanges) \}\)/);
});
