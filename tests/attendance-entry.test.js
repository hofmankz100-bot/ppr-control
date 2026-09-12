"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "modules/attendance-entry.js"), "utf8");

test("attendance entry module is a public application asset", () => {
  assert.equal(require("../server/static-files").isPublicStaticPath("modules/attendance-entry.js"), true);
});

function harness({ closed = false } = {}) {
  const storageListeners = [];
  const channelListeners = [];
  const stored = [];
  const posted = [];
  class BroadcastChannel {
    addEventListener(type, listener) { if (type === "message") channelListeners.push(listener); }
    postMessage(message) { posted.push(message); }
  }
  const window = {
    PPRModules: {}, BroadcastChannel, closed,
    addEventListener(type, listener) { if (type === "storage") storageListeners.push(listener); },
    close() { this.closeCalled = true; },
    setTimeout(listener) { listener(); }
  };
  const localStorage = { setItem(key, value) { stored.push([key, JSON.parse(value)]); } };
  vm.runInNewContext(source, { window, localStorage, BroadcastChannel, Date });
  return { module: window.PPRModules.attendanceEntry, window, storageListeners, channelListeners, stored, posted };
}

test("attendance updates notify the original tab without changing the session", () => {
  const h = harness();
  let refreshes = 0;
  h.module.listen(() => { refreshes += 1; });
  h.module.announce({ expiresAt: "2026-09-12T18:00:00Z" });
  assert.equal(h.stored.length, 1);
  assert.equal(h.stored[0][0], "ppr-attendance-updated-v1");
  assert.equal(h.stored[0][1].expiresAt, "2026-09-12T18:00:00Z");
  assert.equal(h.posted.length, 1);
  h.storageListeners[0]({ key: "unrelated" });
  h.storageListeners[0]({ key: "ppr-attendance-updated-v1" });
  h.channelListeners[0]({ data: h.posted[0] });
  assert.equal(refreshes, 2);
});

test("scan window reports when the browser refuses to close it", () => {
  const h = harness({ closed: false });
  let blocked = 0;
  h.module.closeScanWindow(() => { blocked += 1; });
  assert.equal(h.window.closeCalled, true);
  assert.equal(blocked, 1);
});

test("attendance token stays in the URL until the scan succeeds", () => {
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const submitStart = app.indexOf("async function submitAttendanceScan");
  const start = app.indexOf("async function handleIncomingAttendanceQrFromUrl");
  const end = app.indexOf("\nfunction showAttendanceScanConfirmation", start);
  const submit = app.slice(submitStart, start);
  const handler = app.slice(start, end);
  assert.ok(submit.indexOf("await apiJson") < submit.indexOf("clearAttendanceTokenFromUrl()"));
  assert.match(submit, /attendanceEntry\?\.announce\(result\.session\)/);
  assert.match(handler, /submitAttendanceScan\(token, \{ clearUrl: true, scanEntry: true \}\)/);
});
