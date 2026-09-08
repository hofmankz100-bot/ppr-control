"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const policy = require("../modules/device-cache-policy");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8").replace(/\r\n/g, "\n");
function functionSource(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf("\n}\n", start) + 2);
}

const worker = { id: "worker-a", employeeId: "001", name: "Worker A", role: "mechanic" };
const otherWorker = { id: "worker-b", employeeId: "002", name: "Worker B", role: "mechanic" };
const shift = { date: "2026-09-08", key: "day" };
const recordKey = "1:0:2026-09-08";
const active = () => ({ canEdit: true, session: { expiresAt: new Date(Date.now() + 3600000).toISOString() } });
const mark = owner => ({ actionId: `scan-${owner.id}`, ownerId: owner.id, ownerEmployeeId: owner.employeeId, equipmentId: 1, nodeIndex: 0, date: shift.date, shift: shift.key, group: "technical", qrToken: "valid-token" });
const serverError = (status, error) => Object.assign(new Error(error), { status, data: { error } });

function harness(initialQueue = [mark(worker)], initialAttendance = active()) {
  let queue = structuredClone(initialQueue);
  const sent = [], scheduled = [], toasts = [];
  const context = vm.createContext({
    window: { PprDeviceCachePolicy: { ...policy, createQueueFlusher: options => policy.createQueueFlusher({ ...options, schedule: callback => { scheduled.push(callback); }, cancel() {} }) } },
    navigator: { onLine: true }, authenticatedProfile: worker, profile: worker,
    sessionValidationState: "verified", attendanceStatus: initialAttendance,
    ATTENDANCE_WORKER_ROLES: new Set(["mechanic"]), isProfileReady: () => true,
    pendingQrWalkMarks: () => queue, savePendingQrWalkMarks: next => { queue = next; },
    qrWalkMarkIdentity: item => item.actionId, showAppToast: message => toasts.push(message), showQrSavedNotice: message => toasts.push(message), updateConnectionStatus() {}, renderProfile() {},
    CLIENT_ID: "test-phone", nextActionId: () => "direct-scan", console: { warn() {} },
    apiJson: async (url, options) => {
      if (url === "/api/attendance/status") return context.nextAttendance;
      assert.equal(url, "/api/qr-walk/mark");
      const payload = JSON.parse(options.body);
      sent.push({ payload, actor: context.authenticatedProfile.id });
      return context.send(payload);
    },
    send: async () => ({}), nextAttendance: active(),
    rejectServerSession() { context.sessionValidationState = "signed-out"; context.authenticatedProfile = context.profile = context.attendanceStatus = null; },
    mergeRealtimePatch() {}, equipmentById: () => ({ id: 1, nodes: ["Node"] }),
    key: (equipment, node, date) => `${equipment}:${node}:${date}`,
    state: { checks: { [recordKey]: { to: { walkGroups: { technical: { day: { done: true } } } } } } },
    compactCheckRecords: value => value, persistStateLocally() {}
  });
  const functions = ["attendanceRole", "attendanceRequired", "attendanceAllowsEditing", "refreshAttendanceStatus", "isQrWalkAttendanceRequired", "isPermanentQrWalkError", "sendQrWalkPayload", "flushQrWalkQueue", "reconcileQrWalkStatusFromServer", "qrWalkGroup", "enqueuePendingQrWalkMark", "publishQrWalkMark"];
  vm.runInContext(`let qrWalkQueueFlusher = null;\n${functions.map(functionSource).join("\n")}`, context);
  return { context, sent, scheduled, toasts, queue: () => queue };
}

test("attendance-required retains the original scan and local mark without busy retries, then resumes once", async () => {
  const h = harness();
  h.context.send = async () => { throw serverError(403, "attendance_required"); };
  await h.context.flushQrWalkQueue();
  assert.deepEqual(h.queue(), [mark(worker)]);
  assert.equal(h.context.attendanceStatus.canEdit, false);
  assert.equal(h.context.sessionValidationState, "verified");
  assert.equal(h.scheduled.length, 0);
  for (let i = 0; i < 5; i++) await h.context.flushQrWalkQueue();
  assert.equal(h.sent.length, 1);
  assert.equal(h.context.reconcileQrWalkStatusFromServer(1, shift, "technical", {}), false);
  assert.equal(h.context.state.checks[recordKey].to.walkGroups.technical.day.done, true);

  h.context.nextAttendance = { canEdit: false, session: null };
  await h.context.refreshAttendanceStatus();
  assert.equal(h.sent.length, 1);
  let complete;
  h.context.send = () => new Promise(resolve => { complete = resolve; });
  h.context.nextAttendance = active();
  await h.context.refreshAttendanceStatus();
  const inFlight = h.context.flushQrWalkQueue();
  await h.context.refreshAttendanceStatus();
  assert.equal(h.context.flushQrWalkQueue(), inFlight);
  assert.equal(h.sent.length, 2, "Only one resumed request may be in flight");
  complete({});
  await inFlight;
  assert.deepEqual(h.queue(), []);
  assert.deepEqual(h.sent.map(item => item.payload.actionId), [mark(worker).actionId, mark(worker).actionId]);
  assert.ok(h.sent.every(item => item.actor === worker.id));
  assert.equal(h.scheduled.length, 0);
  assert.equal(h.toasts.length, 0, "An attendance pause is not a permanent QR rejection");
});

test("reopening waits for attendance and a different login cannot send the saved owner's scan", async () => {
  const h = harness([mark(worker), mark(otherWorker)], null);
  await h.context.flushQrWalkQueue();
  assert.equal(h.sent.length, 0, "A reopened worker session has no confirmed attendance yet");
  h.context.nextAttendance = { canEdit: false, session: null };
  await h.context.refreshAttendanceStatus();
  assert.equal(h.sent.length, 0);
  h.context.authenticatedProfile = h.context.profile = otherWorker;
  h.context.nextAttendance = active();
  await h.context.refreshAttendanceStatus();
  await h.context.flushQrWalkQueue();
  assert.deepEqual(h.sent.map(item => item.actor), [otherWorker.id]);
  assert.deepEqual(h.queue(), [mark(worker)]);
  h.context.authenticatedProfile = h.context.profile = worker;
  h.context.attendanceStatus = null;
  await h.context.flushQrWalkQueue();
  assert.equal(h.sent.length, 1);
  await h.context.refreshAttendanceStatus();
  await h.context.flushQrWalkQueue();
  assert.deepEqual(h.sent.map(item => item.actor), [otherWorker.id, worker.id]);
  assert.deepEqual(h.queue(), []);
  assert.equal(h.scheduled.length, 0);
});

test("expired attendance prevents an initial QR replay", async () => {
  const h = harness([mark(worker)], { canEdit: true, session: { expiresAt: "2000-01-01T00:00:00Z" } });
  await h.context.flushQrWalkQueue();
  assert.equal(h.sent.length, 0);
  assert.deepEqual(h.queue(), [mark(worker)]);
  assert.equal(h.scheduled.length, 0);
});

test("a direct scan rejected by newly closed attendance joins the durable queue", async () => {
  const h = harness([]);
  h.context.send = async () => { throw serverError(403, "attendance_required"); };
  const result = await h.context.publishQrWalkMark(1, 0, shift.date, shift, "valid-token");
  assert.equal(result, "queued");
  assert.equal(h.queue().length, 1);
  assert.equal(h.queue()[0].ownerId, worker.id);
  assert.equal(h.queue()[0].actionId, "direct-scan");
  assert.equal(h.context.attendanceStatus.canEdit, false);
  await h.context.flushQrWalkQueue();
  assert.equal(h.sent.length, 1);
  assert.equal(h.scheduled.length, 0);
  assert.match(h.toasts[0], /Кто на работе/);
});

test("invalid QR tokens and genuine access denials remain permanent; 401 retains and signs out", async () => {
  for (const [status, code, retained] of [[410, "node_qr_replaced", false], [403, "qr_walk_access_denied", false], [401, "authentication_required", true]]) {
    const h = harness();
    h.context.send = async () => { throw serverError(status, code); };
    await h.context.flushQrWalkQueue();
    assert.equal(h.queue().length, retained ? 1 : 0, code);
    assert.equal(h.scheduled.length, 0, code);
    assert.equal(h.context.sessionValidationState, retained ? "signed-out" : "verified", code);
  }
});

test("attendance rejection cannot invalidate a new login while the previous owner's request settles", async () => {
  const h = harness();
  let reject;
  h.context.send = () => new Promise((resolve, failure) => { reject = failure; });
  const running = h.context.flushQrWalkQueue();
  h.context.authenticatedProfile = h.context.profile = otherWorker;
  h.context.attendanceStatus = active();
  reject(serverError(403, "attendance_required"));
  await running;
  assert.equal(h.context.attendanceStatus.canEdit, true);
  assert.deepEqual(h.queue(), [mark(worker)]);
  assert.equal(h.scheduled.length, 0);
});
