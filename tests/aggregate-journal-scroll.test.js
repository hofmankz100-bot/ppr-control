"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../modules/aggregate-journal-view.js"), "utf8");
function setup() {
  const win = { scrollX: 15, scrollY: 2450, scrollTo(p) { this.scrollX = p.left; this.scrollY = p.top; } };
  vm.runInNewContext(source, { window: win, document: {} });
  let containers = [];
  const list = { scrollTop: 70, scrollLeft: 3, parentElement: null, isConnected: true,
    getClientRects: () => [1], querySelectorAll: () => containers };
  const container = (top = 0, left = 0) => ({
    scrollTop: top, scrollLeft: left,
    getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 300, right: 400 }),
    querySelectorAll: () => []
  });
  return { win, list, container, set: value => { containers = value; }, capture: win.PPRModules.aggregateJournalView.capturePosition };
}
test("save and background rebuilds preserve the fifth sheet, both axes and page scroll", () => {
  const s = setup();
  s.capture(s.list, "press1:2026-08")();
  for (let update = 0; update < 4; update++) {
    s.set(Array.from({ length: 6 }, (_, i) => s.container(i === 4 ? 450 : 0, i === 4 ? 180 : 0)));
    const restore = s.capture(s.list, "press1:2026-08");
    const fresh = Array.from({ length: 6 }, () => s.container());
    s.set(fresh); s.win.scrollY = 0; s.list.scrollTop = 0;
    restore();
    assert.equal(fresh[4].scrollTop, 450);
    assert.equal(fresh[4].scrollLeft, 180);
    assert.equal(fresh[0].scrollTop, 0);
    assert.equal(s.win.scrollY, 2450);
    assert.equal(s.list.scrollTop, 70);
  }
});
test("a changed month or equipment does not inherit the old journal position", () => {
  const s = setup();
  s.capture(s.list, "press1:2026-08")();
  s.set([s.container(450, 80)]);
  const restore = s.capture(s.list, "press2:2026-09");
  const fresh = s.container(); s.set([fresh]); s.win.scrollY = 0;
  restore();
  assert.equal(fresh.scrollTop, 0); assert.equal(s.win.scrollY, 0);
});
test("restoration cannot affect another journal after navigation", () => {
  const s = setup();
  s.capture(s.list, "a")();
  s.set([s.container(450)]);
  const restore = s.capture(s.list, "a");
  s.capture(s.list, "b");
  const fresh = s.container(); s.set([fresh]); s.win.scrollY = 10;
  restore();
  assert.equal(fresh.scrollTop, 0); assert.equal(s.win.scrollY, 10);
});
test("row anchor compensates for a height change above the current record", () => {
  const s = setup();
  s.capture(s.list, "a")();
  const old = s.container(450);
  old.querySelectorAll = () => [{ dataset: { journalRow: "record-5" }, getBoundingClientRect: () => ({ top: -20, bottom: 80, left: 0, right: 400, width: 400, height: 100 }) }];
  s.set([old]); const restore = s.capture(s.list, "a");
  const fresh = s.container();
  fresh.querySelectorAll = () => [{ dataset: { journalRow: "record-5" }, getBoundingClientRect: () => ({ top: 510 - fresh.scrollTop, left: 0 }) }];
  s.set([fresh]); restore();
  assert.equal(fresh.scrollTop, 530);
});
test("the position module is shipped and both direct and scheduled renders use it", () => {
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(app, /capturePosition\(ui.aggregateJournalList,[\s\S]*?selectedJournalMonth\(\)/);
  assert.match(app, /bindAggregateEditors[\s\S]*?restoreJournalPosition\(\)/);
  for (const file of ["index.html", "sw.js"]) assert.ok(fs.readFileSync(path.join(__dirname, "..", file), "utf8").includes("modules/aggregate-journal-view.js"));
});
