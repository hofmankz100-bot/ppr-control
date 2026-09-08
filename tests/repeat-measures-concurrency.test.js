"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { handleRepeatFailureGroupRoute } = require("../server/repeat-failure-group-route");
const clientSource = fs.readFileSync(path.join(__dirname, "../modules/repeat-failures.js"), "utf8");
const initialVersion = "2026-09-08T16:00:00.000Z";
const editor = { id: "editor", name: "Editor", role: "editor" };

function fixture() {
  const db = { catalog: { equipment: { "1": { id: 1, area: "A", nodes: ["Original node"],
    repeatFailureMeasures: { "7": { cycleNumber: 0, text: "Original measures", updatedAt: initialVersion, textUpdatedByName: "Original author" }, "9": { text: "Other group" } },
    repeatFailureArchives: { "7:legacy": { text: "History", completedAt: "2026-08-01" } }
  }, "2": { id: 2, repeatFailureMeasures: { "7": { text: "Other equipment" } } } } },
    checks: { "1:0:2026-09-01": { to: { commentLog: [{ id: "r1", text: "Remark", repeatFailureCode: "7" }] } } },
    downtimes: [{ id: "d1", equipmentId: 1, repeatFailureCode: "7", type: "breakdown" }] };
  const writes = [], broadcasts = [];
  let queue = Promise.resolve();
  return { db, writes, broadcasts, current: () => db.catalog.equipment["1"].repeatFailureMeasures["7"],
    async send(body, actor = editor) {
      let response;
      await handleRepeatFailureGroupRoute({ method: "POST", authUser: actor }, {}, "/api/repeat-failure-group", {
        readBody: async () => ({ action: "save-measures", equipmentId: 1, code: "7", cycleNumber: 0, ...body }),
        sendJson: (_, status, payload) => { response = { status, ...structuredClone(payload) }; },
        enqueueStateWrite: fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; },
        readDb: () => db, activeUserPermission: user => user.allowed === true,
        nodeMutationAccessServer: (user, equipment) => user.area === equipment.area,
        resolutionUserKeyServer: user => user.id,
        writeDb: (_, action) => writes.push(structuredClone(action)),
        broadcastState: (...args) => { broadcasts.push(args); return String(broadcasts.length); },
        realtimeStateVersion: () => String(broadcasts.length)
      });
      return response;
    }
  };
}

test("two editors saving one version serialize to one success and one non-mutating conflict", async () => {
  const f = fixture(), before = structuredClone(f.db);
  const results = await Promise.all([
    f.send({ text: "First editor", expectedUpdatedAt: initialVersion }),
    f.send({ text: "Second editor", expectedUpdatedAt: initialVersion }, { ...editor, id: "second", name: "Second" })
  ]);
  assert.deepEqual(results.map(result => result.status), [200, 409]);
  assert.equal(results[1].error, "repeat_failure_measures_stale");
  assert.equal(results[1].state.catalog.equipment["1"].repeatFailureMeasures["7"].text, "First editor");
  assert.equal(f.current().text, "First editor");
  assert.equal(f.writes.length, 1); assert.equal(f.broadcasts.length, 1);
  assert.deepEqual(f.db.checks, before.checks); assert.deepEqual(f.db.downtimes, before.downtimes);
  assert.deepEqual(f.db.catalog.equipment["1"].nodes, before.catalog.equipment["1"].nodes);
  assert.deepEqual(f.db.catalog.equipment["1"].repeatFailureMeasures["9"], before.catalog.equipment["1"].repeatFailureMeasures["9"]);
  assert.deepEqual(f.db.catalog.equipment["1"].repeatFailureArchives, before.catalog.equipment["1"].repeatFailureArchives);
  assert.deepEqual(f.db.catalog.equipment["2"], before.catalog.equipment["2"]);
});

test("identical retries are no-ops; delayed retries cannot replace a later editor's text", async () => {
  const f = fixture(), body = { text: "First", expectedUpdatedAt: initialVersion, actionId: "same-action" };
  assert.equal((await f.send(body)).status, 200);
  const saved = structuredClone(f.current());
  assert.equal((await f.send(body, { ...editor, name: "Another actor" })).changed, false);
  assert.equal((await f.send({ text: "First" })).changed, false, "old client identical retry remains safe");
  assert.deepEqual(f.current(), saved);
  assert.equal((await f.send({ text: "Second", expectedUpdatedAt: saved.updatedAt })).status, 200);
  const second = structuredClone(f.db);
  assert.equal((await f.send(body)).status, 409);
  assert.deepEqual(f.db, second);
  assert.equal(f.writes.length, 2);
});

test("legacy requests without a version cannot overwrite differing existing text", async () => {
  const f = fixture(), before = structuredClone(f.db);
  assert.equal((await f.send({ text: "Unversioned overwrite" })).status, 409);
  assert.deepEqual(f.db, before); assert.equal(f.writes.length, 0);
  delete f.db.catalog.equipment["1"].repeatFailureMeasures["7"];
  assert.equal((await f.send({ text: "First creation" })).status, 200);
  assert.equal((await f.send({ text: "Overwrite after creation" })).status, 409);
  assert.equal(f.current().text, "First creation");
});

test("legacy saved measures without updatedAt can be edited only with an explicitly captured empty version", async () => {
  const f = fixture(); delete f.current().updatedAt;
  assert.equal((await f.send({ text: "No version" })).status, 409);
  assert.equal((await f.send({ text: "Explicit legacy version", expectedUpdatedAt: "" })).status, 200);
  assert.ok(f.current().updatedAt);
});

test("updates within one clock millisecond still produce distinct optimistic concurrency versions", async t => {
  const f = fixture(); t.mock.method(Date, "now", () => Date.parse(initialVersion));
  assert.equal((await f.send({ text: "First", expectedUpdatedAt: initialVersion })).status, 200);
  assert.equal(f.current().updatedAt, "2026-09-08T16:00:00.001Z");
  assert.equal((await f.send({ text: "Stale", expectedUpdatedAt: initialVersion })).status, 409);
  assert.equal((await f.send({ text: "Next", expectedUpdatedAt: f.current().updatedAt })).status, 200);
  assert.equal(f.current().updatedAt, "2026-09-08T16:00:00.002Z");
});

test("closed cycles, manual group numbers and archived measures cannot be changed by delayed saves", async () => {
  const f = fixture();
  assert.equal((await f.send({ action: "complete-measures", expectedUpdatedAt: initialVersion })).status, 200);
  const before = structuredClone(f.db);
  const closed = await f.send({ text: "Late text", expectedUpdatedAt: initialVersion });
  assert.equal(closed.error, "repeat_failure_group_closed");
  assert.equal((await f.send({ text: "Wrong next cycle", cycleNumber: 1, expectedUpdatedAt: initialVersion })).error, "repeat_failure_not_found");
  assert.deepEqual(f.db, before);
  assert.equal(f.db.downtimes[0].repeatFailureCode, "7");
  assert.equal(f.db.checks["1:0:2026-09-01"].to.commentLog[0].repeatFailureCode, "7");
});

test("conflict responses never bypass role or equipment access checks", async () => {
  const f = fixture(), before = structuredClone(f.db);
  for (const actor of [{ role: "mechanic", area: "A" }, { role: "engineer", allowed: true, area: "B" }]) {
    const result = await f.send({ text: "Overwrite", expectedUpdatedAt: "stale" }, actor);
    assert.equal(result.status, 403); assert.equal(result.state, undefined);
  }
  assert.deepEqual(f.db, before);
});

function clientHarness(fixture, intercept) {
  const scrolls = [], persisted = [];
  const window = { confirm: () => true, scrollTo(position) { scrolls.push({ ...position }); }, scrollX: 72, scrollY: 840 };
  vm.runInNewContext(clientSource, { window });
  const client = window.PPRModules.repeatFailures;
  const group = { groupKey: "manual|1|7", equipmentId: 1, manualCode: "7" };
  let saved = structuredClone(fixture.current()), renders = 0;
  const requests = [], notices = [];
  const decode = text => text.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const escape = text => String(text).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const helpers = {
    nextActionId: () => `client-${requests.length}`, clientId: "client",
    runButtonOperation: async (button, operation) => { if (button.disabled) return; button.disabled = true; try { return await operation(); } finally { button.disabled = false; } },
    apiJson: async (_, options) => {
      const body = JSON.parse(options.body); requests.push(body);
      if (intercept) await intercept(body);
      const result = await fixture.send(body);
      if (result.status >= 400) throw Object.assign(Error(result.error), { status: result.status, data: result });
      return result;
    },
    mergeRealtimePatch: patch => { saved = structuredClone(patch.catalog.equipment["1"].repeatFailureMeasures["7"]); },
    setRealtimeStateVersion() {}, persist() { persisted.push(structuredClone(saved)); }, showAppToast: (...args) => notices.push(args),
    render: () => { renders++; }, isCurrent: () => true
  };
  function render() {
    const html = client.measuresCell(group, saved, false, true, escape);
    const dataset = Object.fromEntries([...html.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([, key, value]) => [key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), decode(value)]));
    const node = () => ({ disabled: false, addEventListener(type, listener) { this[type] = listener; } });
    const input = { ...node(), value: decode(html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1]) };
    const save = node(), cancel = node(); save.disabled = /data-save-repeat-measures disabled/.test(html);
    const element = { dataset, querySelector: selector => ({ "[data-repeat-measures]": input, "[data-save-repeat-measures]": save, "[data-cancel-repeat-measures]": cancel })[selector] };
    client.bindMeasures({ querySelectorAll: selector => selector === "[data-repeat-measures-key]" ? [element] : [] }, helpers);
    return { html, input, save, cancel, dataset, type(text) { input.value = text; input.input(); }, click: () => save.click({ currentTarget: save }) };
  }
  return { render, requests, notices, window, scrolls, persisted, renders: () => renders, receive: next => { saved = structuredClone(next); } };
}

test("client draft keeps its original version through rerenders and conflict responses; cancellation is explicit", async () => {
  const f = fixture(), c = clientHarness(f), first = c.render();
  first.type("My draft");
  await f.send({ text: "Other editor's text", expectedUpdatedAt: initialVersion });
  c.receive(f.current());
  const refreshed = c.render();
  assert.equal(refreshed.input.value, "My draft");
  assert.equal(refreshed.dataset.measuresUpdatedAt, initialVersion);
  await refreshed.click();
  assert.equal(c.requests.length, 1); assert.equal(c.requests[0].expectedUpdatedAt, initialVersion);
  assert.equal(c.render().input.value, "My draft"); assert.equal(f.current().text, "Other editor's text");
  assert.equal(c.persisted.at(-1).text, "Other editor's text", "conflict persists the server snapshot, not the unsaved draft");
  assert.match(c.notices.at(-1)[0], /изменены другим сотрудником/);
  await c.render().click();
  assert.equal(f.current().text, "Other editor's text", "another click does not silently rebase the draft");
  c.window.confirm = () => false; c.render().cancel.click();
  assert.equal(c.render().input.value, "My draft");
  const scrollCount = c.scrolls.length;
  c.window.confirm = () => true; c.render().cancel.click();
  assert.equal(c.scrolls.length, scrollCount + 1);
  assert.deepEqual(c.scrolls.at(-1), { left: 72, top: 840, behavior: "instant" });
  const latest = c.render(); assert.equal(latest.input.value, "Other editor's text");
  latest.type("Reviewed replacement"); await latest.click();
  assert.equal(f.current().text, "Reviewed replacement");
});

test("double clicks and another rendered save button cannot create duplicate writes", async () => {
  let release; const waiting = new Promise(resolve => { release = resolve; });
  const f = fixture(), c = clientHarness(f, () => waiting), view = c.render();
  view.type("Saved once"); const saving = view.click();
  await view.click(); const second = c.render(); assert.equal(second.save.disabled, true);
  second.save.disabled = false; await second.click();
  assert.equal(c.requests.length, 1);
  release(); await saving;
  assert.equal(f.writes.length, 1); assert.equal(c.render().input.value, "Saved once");
});

test("typing while a successful save is in flight preserves the newer draft and advances only its acknowledged base", async () => {
  let release; const waiting = new Promise(resolve => { release = resolve; });
  const f = fixture(), c = clientHarness(f, () => waiting), view = c.render();
  view.type("First submitted text"); const saving = view.click();
  view.type("Newer unsent text"); release(); await saving;
  assert.equal(f.current().text, "First submitted text");
  const next = c.render(); assert.equal(next.input.value, "Newer unsent text");
  assert.equal(next.dataset.measuresUpdatedAt, f.current().updatedAt);
  await next.click(); assert.equal(f.current().text, "Newer unsent text");
});

test("a network failure retains the draft and its unchanged expected version", async () => {
  const f = fixture(), c = clientHarness(f, async () => { throw Object.assign(Error("offline"), { status: 503 }); }), view = c.render();
  view.type("Offline draft"); await assert.rejects(view.click(), /offline/);
  const next = c.render(); assert.equal(next.input.value, "Offline draft");
  assert.equal(next.dataset.measuresUpdatedAt, initialVersion);
  assert.equal(f.writes.length, 0);
});
