const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../modules/device-cache-policy");

test("downtime cache keeps every active stop and recent closed stops regardless of insertion order", () => {
  const closed = Array.from({ length: 250 }, (_, i) => ({ id: `closed-${i}`, startedAt: new Date(i * 86400000).toISOString(), endedAt: new Date((i + 1) * 86400000).toISOString() }));
  const active = Array.from({ length: 205 }, (_, i) => ({ id: `active-${i}`, startedAt: "1960-01-01T00:00:00Z", endedAt: "" }));
  const markers = [{ id: "deleted", deleted: true, deletedAt: "1950-01-01T00:00:00Z" }, { id: "reset", clearAll: true, updatedAt: "1950-01-01T00:00:00Z" }];
  const input = [...closed.slice().reverse(), ...active, ...markers];
  const original = JSON.stringify(input);
  const cached = policy.selectDowntimes(input);
  assert.equal(cached.length, 407);
  assert.deepEqual(cached.filter(x => x.endedAt).map(x => x.id), closed.slice(50).reverse().map(x => x.id));
  for (const item of [...active, ...markers]) assert.ok(cached.includes(item));
  assert.equal(JSON.stringify(input), original);
});

test("check cache retains old unresolved work and chooses recent history by timestamp", () => {
  const checks = Object.fromEntries(Array.from({ length: 510 }, (_, i) => [`1:${i}:2026-01-01`, { updatedAt: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString(), to: { commentLog: [{ text: "done", resolved: true }] } }]));
  checks["1:old:1950-01-01"] = { to: { commentLog: [{ text: "Pending confirmation", resolutionPendingConfirmation: true, resolved: false }] } };
  checks["1:draft:1950-01-01"] = { to: { nodeDraftText: "Unsent work" } };
  const cached = policy.selectChecks(checks);
  assert.equal(Object.keys(cached).length, 502);
  assert.ok(cached["1:old:1950-01-01"]);
  assert.ok(cached["1:draft:1950-01-01"]);
  assert.ok(cached["1:509:2026-01-01"]);
  assert.equal(cached["1:0:2026-01-01"], undefined);
  const ordered = policy.selectChecks({ older: { updatedAt: "2026-02-01" }, newer: { updatedAt: "2026-09-01" } }, 1);
  assert.deepEqual(Object.keys(ordered), ["newer"]);
});

test("audit cache uses event time and does not mutate caller arrays", () => {
  const items = [{ id: "old", at: "2020-01-01" }, { id: "new", at: "2026-09-01" }, { id: "middle", at: "2024-01-01" }];
  assert.deepEqual(policy.selectAudit(items, 2).map(x => x.id), ["new", "middle"]);
  assert.deepEqual(items.map(x => x.id), ["old", "new", "middle"]);
});

test("only previously confirmed profiles can be restored; temporary failures are not revocation", () => {
  const user = { id: "employee", name: "Worker", role: "operator", approved: true };
  assert.equal(policy.canRestoreCachedProfile(user), true);
  for (const patch of [{ approved: false }, { pendingApproval: true }, { registrationPending: true }, { role: "" }]) {
    assert.equal(policy.canRestoreCachedProfile({ ...user, ...patch }), false);
  }
  assert.equal(policy.canRestoreCachedProfile(null), false);
  for (const status of [401, 403]) assert.equal(policy.isSessionRejected({ status }), true);
  for (const status of [408, 429, 500, 502, 503, 504, undefined]) assert.equal(policy.isSessionRejected({ status }), false);
});

test("queue drain preserves scans appended while a request is in flight", async () => {
  let queue = [{ actionId: "first" }];
  let completeFirst;
  const delivered = [];
  const flush = policy.createQueueFlusher({
    read: () => queue, write: next => { queue = next; }, canSend: () => true,
    identity: item => item.actionId, discard: () => false,
    send: async item => {
      delivered.push(item.actionId);
      if (item.actionId === "first") await new Promise(resolve => { completeFirst = resolve; });
    }
  });
  const running = flush();
  queue.push({ actionId: "second" });
  assert.equal(flush(), running);
  completeFirst();
  await running;
  assert.deepEqual(delivered, ["first", "second"]);
  assert.deepEqual(queue, []);
});

test("reconnect during an in-flight network failure schedules a retry with the same action ID", async () => {
  let queue = [{ actionId: "durable-id" }];
  let online = true;
  let rejectFirst;
  let scheduled;
  const delivered = [];
  const flush = policy.createQueueFlusher({
    read: () => queue, write: next => { queue = next; }, canSend: () => online,
    identity: item => item.actionId, discard: () => false,
    schedule: callback => { scheduled = callback; }, cancel: () => {},
    send: async item => {
      delivered.push(item.actionId);
      if (delivered.length === 1) await new Promise((resolve, reject) => { rejectFirst = reject; });
    }
  });
  const running = flush();
  online = false;
  online = true;
  assert.equal(flush(), running);
  rejectFirst(new TypeError("Network unavailable"));
  await running;
  assert.equal(queue.length, 1);
  assert.equal(typeof scheduled, "function");
  await scheduled();
  assert.deepEqual(delivered, ["durable-id", "durable-id"]);
  assert.deepEqual(queue, []);
});

test("authentication rejection stops delivery while retaining the original queue", async () => {
  let allowed = true;
  let queue = [{ actionId: "pending" }];
  const flush = policy.createQueueFlusher({
    read: () => queue, write: next => { queue = next; }, canSend: () => allowed,
    identity: item => item.actionId,
    send: async () => { throw Object.assign(new Error("Session expired"), { status: 401 }); },
    discard: error => { assert.equal(error.status, 401); allowed = false; return false; },
    schedule: () => assert.fail("Revoked session cannot schedule another write")
  });
  await flush();
  assert.deepEqual(queue, [{ actionId: "pending" }]);
});

test("a different login cannot send another employee's queue or claim legacy marks", async () => {
  const operator = { id: "operator", employeeId: "op-1" };
  const engineer = { id: "engineer", employeeId: "eng-1" };
  let actor = engineer;
  let queue = [{ actionId: "old", ownerId: operator.id }, { actionId: "legacy" }, { actionId: "current", ownerEmployeeId: engineer.employeeId }];
  const sent = [];
  const flush = policy.createQueueFlusher({
    read: () => queue, write: next => { queue = next; }, canSend: () => true,
    canSendItem: item => policy.queueItemOwnedBy(item, actor), identity: item => item.actionId,
    send: async item => { sent.push(item.actionId); }, discard: () => false,
    schedule: () => assert.fail("Unowned work must not create a retry loop")
  });
  await flush();
  assert.deepEqual(sent, ["current"]);
  assert.deepEqual(queue.map(x => x.actionId), ["old", "legacy"]);
  actor = operator;
  await flush();
  assert.deepEqual(sent, ["current", "old"]);
  assert.deepEqual(queue, [{ actionId: "legacy" }]);
});

function memoryStorage() {
  const entries = new Map();
  return { getItem: key => entries.get(key) || null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}

test("pending state retains its original author through rejection and a different login", () => {
  const store = memoryStorage(), pending = policy.createPendingStateOwner(store, "state");
  const operator = { id: "op", name: "Operator", role: "operator", approved: true };
  const engineer = { id: "eng", name: "Engineer", role: "engineer", approved: true };
  pending.mark(operator);
  pending.mark(engineer);
  assert.equal(pending.reconcile(engineer, null), false);
  assert.equal(pending.owner().ownerName, "Operator");
  assert.equal(pending.reconcile(operator, null), true);
  pending.clear();
  assert.equal(pending.owns(engineer), true);
  assert.equal(pending.owner(), null);
});

test("legacy pending state binds only after its saved confirmed profile matches server identity", () => {
  const store = memoryStorage(), pending = policy.createPendingStateOwner(store, "state");
  const operator = { employeeId: "op-1", name: "Operator", role: "operator", approved: true };
  store.setItem("state-pending", "1");
  pending.captureLegacy(operator); // Captured before a 401 removes the cached login.
  assert.equal(pending.owns(operator), false);
  assert.equal(pending.reconcile({ employeeId: "eng-1" }, null), false);
  assert.equal(pending.reconcile({ ...operator, id: "server-op" }, null), true);
  assert.equal(pending.owns({ ...operator, id: "different-user" }), false);
  pending.clear();
  store.setItem("state-pending", "1");
  assert.equal(pending.reconcile(operator, null), true, "An ownerless pending marker must not lock future logins");
  assert.equal(pending.owns(operator), false, "Ownerless pending work stays isolated and is never sent as the new login");
  assert.equal(store.getItem("state-pending"), "1");
});

test("ignored sections replace rejected local timestamps with accepted server content", async () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const source = fs.readFileSync(require("node:path").join(__dirname, "..", "app.js"), "utf8");
  const code = source.slice(source.indexOf("async function refreshIgnoredStateSections("), source.indexOf("async function saveRemoteState("));
  const state = { checks: { work: { updatedAt: "2099-01-01", forbiddenEdit: true } }, requests: [{ text: "Unrelated pending request" }] };
  const remote = { checks: { work: { updatedAt: "2026-09-01", acceptedMark: true } }, requests: [], stateVersion: "version" };
  const fingerprints = new Map([["checks", JSON.stringify(state.checks)]]), baseline = new Map(), toasts = [];
  let persisted, renders = 0;
  const context = vm.createContext({ state, REMOTE_STATE_FIELDS: ["checks", "requests"], stateDataVersion: 0, remoteSavePending: false,
    apiJson: async url => { assert.equal(url, "/api/state"); return remote; }, remoteSectionFingerprints: baseline,
    remoteSectionFingerprint: (field, value) => JSON.stringify(value), persistStateLocally: value => { persisted = structuredClone(value); },
    scheduleRender: () => { renders += 1; }, setRealtimeStateVersion: () => {}, showAppToast: text => toasts.push(text), fingerprints });
  vm.runInContext(`${code}; globalThis.apply = refreshIgnoredStateSections;`, context);
  await context.apply({ ignoredSections: ["checks", "unknown"] }, fingerprints);
  assert.deepEqual(state.checks, remote.checks);
  assert.equal(state.requests[0].text, "Unrelated pending request");
  assert.deepEqual(persisted.checks, remote.checks);
  assert.equal(fingerprints.get("checks"), baseline.get("checks"));
  assert.equal(renders, 1);
  await context.apply({ ignoredSections: ["checks"] }, fingerprints);
  assert.equal(toasts.length, 1);
  state.checks = { ...state.checks, newWork: { text: "Typed while authoritative GET was in flight" } };
  await context.apply({ ignoredSections: ["checks"] }, fingerprints);
  assert.equal(state.checks.newWork.text, "Typed while authoritative GET was in flight");
  assert.equal(context.remoteSavePending, true, "Concurrent edits are retried before replacing their section");
});
