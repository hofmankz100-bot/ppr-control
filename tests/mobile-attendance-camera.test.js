"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");

function extract(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const regularEnd = source.indexOf(`\nfunction ${nextName}`, start);
  const asyncEnd = source.indexOf(`\nasync function ${nextName}`, start);
  const end = [regularEnd, asyncEnd].filter(index => index > start).sort((a, b) => a - b)[0] ?? -1;
  assert.ok(start >= 0 && end > start, `${name} must be present`);
  return source.slice(start, end);
}

test("attendance QR can be read by the existing in-app camera without opening a browser tab", () => {
  const parser = extract("attendanceTokenFromScannedValue", "scanAttendanceQrInsideApp");
  const context = vm.createContext({ URL, window: { location: { origin: "https://ppr.example" } } });
  vm.runInContext(parser, context);
  assert.equal(context.attendanceTokenFromScannedValue("https://ppr.example/?attendance=shift-token"), "shift-token");
  assert.equal(context.attendanceTokenFromScannedValue("javascript:alert(1)?attendance=bad"), "");

  const scanner = extract("scanAttendanceQrInsideApp", "attendanceTokenFromUrl");
  assert.match(scanner, /scanNodeQrCode\([\s\S]*applyValue/);
  assert.match(scanner, /submitAttendanceScan\(scanned\.attendanceToken\)/);
  assert.doesNotMatch(scanner, /window\.open|location\.(?:assign|replace)|href\s*=/);
});

test("staff use the in-app entry while contractor-only public attendance remains available", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(source, /attendanceRequired\(\) \|\| profile\?\.role === "editor"/);
  assert.match(source, /if \(!attendanceRequired\(\)\) return openAttendancePanel\(\)/);
  assert.match(source, /apiJson\("\/api\/attendance\/contractor"/);
  assert.match(source, /error\.message === "attendance_registered_user"/);
  assert.doesNotMatch(html, /id="attendanceHomeButton"[^>]*data-mobile-view/);
});

test("delayed background restoration does not pull an Android user back after a new scroll gesture", () => {
  const restoreSource = extract("restoreBackgroundScroll", "scheduleRender");
  const frames = [];
  const window = {
    scrollX: 0,
    scrollY: 0,
    scrollTo({ left, top }) { this.scrollX = left; this.scrollY = top; },
    requestAnimationFrame(callback) { frames.push(callback); }
  };
  const context = vm.createContext({ Math, current: { view: "equipment" }, window });
  vm.runInContext(restoreSource, context);
  context.restoreBackgroundScroll("equipment", 0, 480);
  assert.equal(window.scrollY, 480);
  window.scrollY = 620;
  frames.shift()();
  assert.equal(window.scrollY, 620);
  assert.equal(frames.length, 0);
});
