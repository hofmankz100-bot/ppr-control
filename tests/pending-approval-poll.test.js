"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8").replace(/\r\n/g, "\n");
function extract(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf("\n}\n", start) + 2);
}
const pending = (id = "pending-a") => ({ id, employeeId: id, name: id, role: "", approved: false, pendingApproval: true, registrationPending: true });
const approved = id => ({ id, employeeId: id, name: id, role: "engineer", approved: true, pendingApproval: false });

function harness() {
  const intervals = new Map(), calls = [], storage = new Map();
  let nextTimer = 1;
  const saved = pending();
  storage.set("profile", JSON.stringify(saved));
  const context = vm.createContext({
    profile: saved, authenticatedProfile: saved, attendanceStatus: null, sessionValidationState: "verified",
    window: { setInterval(fn, delay) { assert.equal(delay, 5000); const id = nextTimer++; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id), confirm: () => true },
    clearTimeout() {}, clearInterval: id => intervals.delete(id), navigator: { onLine: true },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    PROFILE_KEY: "profile", USERS_KEY: "users", EDITOR_PREVIEW_ROLE_KEY: "preview", EDITOR_PREVIEW_AREA_KEY: "area", PUSH_SUBSCRIPTION_KEY: "push",
    ui: { loginOverlay: {}, loginForm: {}, loginError: {} }, t: value => value,
    activeProfileFromSession: user => user, loadProfile: () => JSON.parse(storage.get("profile") || "null"),
    apiJson: async (url, options) => { calls.push(url); return context.respond(url, options); },
    respond: async url => url === "/api/users" ? [pending()] : { user: pending() },
    requirePendingStateAuthor: async () => {}, pendingStateOwner: { captureLegacy() {} },
    appNotificationTrackingReady: false, current: { view: "equipment" },
    processAppNotificationChanges() {}, updateDirectorBadge() {}, scheduleRender() {},
    resetCurrentForProfile() {}, renderProfile() {}, applyLanguage() {}, show() {},
    flushPendingWork() {}, updateConnectionStatus() {}, setupPublicAttendanceEntry() {},
    loadRemoteState: async () => true, refreshAttendanceStatus: async () => null, startAttendanceRefresh() {},
    handleIncomingAttendanceQrFromUrl: async () => false, handleIncomingNodeQrFromUrl: async () => false,
    remoteRetryTimer: null, sessionRetryTimer: null, remoteSaveTimer: null, realtimePollTimer: null,
    realtimeEventSource: null, realtimeSocket: null, ROLE_ACCESS: { engineer: {} },
    removePushSubscriptionForLogout: async () => {}, location: { reload() {} }
  });
  const names = ["resolutionUserKey", "isProfileReady", "isProfileWaitingApproval", "stopPendingApprovalPolling", "startPendingApprovalPolling", "loadRemoteUsers", "finishAuthOnCurrentPage", "loginEmployee", "registerEmployee", "rejectServerSession", "restoreServerSession"];
  vm.runInContext(`let pendingApprovalPollTimer = null, pendingApprovalPollOwner = "", pendingApprovalPollGeneration = 0;\n${names.map(extract).join("\n")}`, context);
  return { context, intervals, calls, storage, async tick() { for (const callback of [...intervals.values()]) callback(); await context.loadRemoteUsers.promise; } };
}

test("both approval entry paths use one timer and overlapping checks reuse the existing user request", async () => {
  assert.doesNotMatch(source, /setInterval\(loadRemoteUsers,\s*5000\)/);
  assert.match(extract("setupLogin"), /startPendingApprovalPolling\(\)/);
  const h = harness();
  h.context.startPendingApprovalPolling();
  await h.context.finishAuthOnCurrentPage();
  await h.context.finishAuthOnCurrentPage();
  assert.equal(h.intervals.size, 1);
  let complete;
  h.context.respond = () => new Promise(resolve => { complete = resolve; });
  const tick = h.tick();
  for (const callback of h.intervals.values()) callback();
  assert.deepEqual(h.calls, ["/api/users"]);
  complete([pending()]);
  await tick;
  assert.equal(h.intervals.size, 1);
});

test("approval clears registrationPending, opens the profile and removes the five-second poll", async () => {
  const h = harness();
  await h.context.finishAuthOnCurrentPage();
  h.context.respond = async () => [approved("pending-a")];
  await h.tick();
  assert.equal(h.context.profile.approved, true);
  assert.equal(h.context.profile.registrationPending, false);
  assert.equal(h.context.ui.loginOverlay.hidden, true);
  assert.equal(h.intervals.size, 0);
  const callsAfterApproval = h.calls.length;
  for (let i = 0; i < 12; i++) await h.tick();
  assert.equal(h.calls.length, callsAfterApproval, "Approved workers must not keep fetching every five seconds");
});

test("rejecting the session stops polling and an already pending response cannot restore the old profile", async () => {
  const h = harness();
  h.context.startPendingApprovalPolling();
  let complete;
  h.context.respond = () => new Promise(resolve => { complete = resolve; });
  const tick = h.tick();
  h.context.rejectServerSession();
  assert.equal(h.intervals.size, 0);
  complete([approved("pending-a")]);
  await tick;
  assert.equal(h.context.profile, null);
  assert.equal(h.storage.has("profile"), false);
  assert.equal(h.context.sessionValidationState, "signed-out");
});

test("login and new registration replace the poll owner without accepting an old in-flight approval", async () => {
  const h = harness();
  h.context.startPendingApprovalPolling();
  let complete;
  h.context.respond = url => url === "/api/users" ? new Promise(resolve => { complete = resolve; }) : Promise.resolve({ user: approved("login-b") });
  const tick = h.tick();
  await h.context.loginEmployee("login-b", "password");
  assert.equal(h.intervals.size, 0);
  complete([approved("pending-a")]);
  await tick;
  assert.equal(JSON.parse(h.storage.get("profile")).id, "login-b");
  h.context.respond = async () => [approved("login-b")];
  await h.context.finishAuthOnCurrentPage();
  await h.context.loadRemoteUsers.promise;
  assert.equal(h.context.profile.id, "login-b");
  assert.equal(h.intervals.size, 0);
  h.context.respond = async () => ({ user: pending("pending-c") });
  await h.context.registerEmployee({});
  await h.context.finishAuthOnCurrentPage();
  assert.equal(h.intervals.size, 1);
  assert.equal(h.context.profile.id, "pending-c");
  h.context.startPendingApprovalPolling();
  assert.equal(h.intervals.size, 1);
  h.context.respond = async () => [pending("pending-c")];
  const before = h.calls.length;
  await h.tick();
  assert.equal(h.calls.length, before + 1);
  assert.equal(h.context.profile.id, "pending-c");
});

test("a temporary users request failure keeps the pending approval poll available", async () => {
  const h = harness();
  h.context.startPendingApprovalPolling();
  h.context.respond = async () => { throw new Error("Temporary outage"); };
  await h.tick();
  assert.equal(h.intervals.size, 1);
  assert.equal(h.context.profile.pendingApproval, true);
  h.context.respond = async () => [approved("pending-a")];
  await h.tick();
  assert.equal(h.context.profile.approved, true);
  assert.equal(h.intervals.size, 0);
});

test("session revalidation preserves one pending poll and stops it when approval is confirmed", async () => {
  const h = harness();
  h.context.startPendingApprovalPolling();
  await h.context.restoreServerSession();
  await h.context.restoreServerSession();
  assert.equal(h.intervals.size, 1);
  h.context.respond = async () => ({ user: approved("pending-a") });
  await h.context.restoreServerSession();
  assert.equal(h.intervals.size, 0);
  assert.equal(h.context.profile.role, "engineer");
  assert.equal(h.context.sessionValidationState, "verified");
});

test("explicit logout cancels polling before asynchronous logout work", async () => {
  const h = harness();
  h.context.startPendingApprovalPolling();
  let handler;
  h.context.ui.profileBar = { querySelector: () => ({ addEventListener: (name, callback) => { assert.equal(name, "click"); handler = callback; } }) };
  const start = source.indexOf('ui.profileBar.querySelector("#changeUserButton")');
  vm.runInContext(source.slice(start, source.indexOf("\n  syncNotificationSetupPrompt();", start)), h.context);
  let complete;
  h.context.removePushSubscriptionForLogout = () => new Promise(resolve => { complete = resolve; });
  const leaving = handler();
  assert.equal(h.intervals.size, 0);
  complete();
  await leaving;
  assert.equal(h.storage.has("profile"), false);
});
