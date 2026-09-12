"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const implementation = source.slice(source.indexOf("function updateConnectionStatus()"), source.indexOf("function rejectServerSession()"));

test("connection notice hides all queue diagnostics online without reading or modifying stored work", () => {
  for (const role of ["editor", "engineer", "mechanic", "operator"]) {
    const notice = { hidden: false, textContent: "Old queue notice" };
    const context = vm.createContext({ document: { querySelector: () => notice }, navigator: { onLine: true }, isProfileReady: () => true,
      profile: { role }, pendingQrWalkMarks: () => { throw Error("Banner must not inspect queue"); }, localStorage: new Proxy({}, { get() { throw Error("Banner must not touch saved data"); } }) });
    vm.runInContext(implementation + "updateConnectionStatus();", context);
    assert.equal(notice.hidden, true); assert.equal(notice.textContent, "");
  }
});
test("real offline warning remains, and reconnect clears its text and space", () => {
  const notice = {}; const navigator = { onLine: false };
  const context = vm.createContext({ document: { querySelector: () => notice }, navigator, isProfileReady: () => true });
  vm.runInContext(implementation + "updateConnectionStatus();", context);
  assert.equal(notice.hidden, false); assert.match(notice.textContent, /^Нет связи/);
  navigator.onLine = true; vm.runInContext("updateConnectionStatus();", context);
  assert.equal(notice.hidden, true); assert.equal(notice.textContent, "");
});
