const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

test("caught failures in critical phone paths are reported with stable scopes", () => {
  for (const scope of [
    "indexeddb.read",
    "indexeddb.write",
    "sync.state-save",
    "realtime.message",
    "realtime.ping",
    "qr.decoder.load",
    "qr.camera-frame",
    "qr.camera-start",
    "qr.photo-read"
  ]) {
    assert.match(app, new RegExp(`reportCaughtClientError\\(\\"${scope.replace(/[.]/g, "\\.")}\\"`));
  }
});

test("caught error reporting is throttled and keeps offline work queued", () => {
  assert.match(app, /lastReportedAt\s*\|\|=\s*new Map\(\)/);
  assert.match(app, /reportCaughtClientError\("sync\.state-save", error, 60000\);\s*scheduleRemoteRetry\(\)/);
  assert.match(app, /keepalive:\s*true/);
});

test("server monitoring retains bounded diagnostic details for administrators", () => {
  assert.match(server, /recentClientErrors:/);
  assert.match(server, /scope:\s*String\(body\.source/);
  assert.match(server, /message:\s*String\(body\.message/);
  assert.match(server, /runtimeMonitor\.clientErrors\s*=\s*runtimeMonitor\.clientErrors\.filter/);
  assert.match(server, /warnServerDiagnostic\("websocket\.message", error\)/);
  assert.match(server, /warnServerDiagnostic\("websocket\.ping", error\)/);
});
