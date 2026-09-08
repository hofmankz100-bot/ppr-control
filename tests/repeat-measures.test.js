"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { handleRepeatFailureGroupRoute } = require("../server/repeat-failure-group-route");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../modules/repeat-failures.js"), "utf8"), context);
const { measuresCell } = context.window.PPRModules.repeatFailures;
test("repeat summary replaces area with measures and omits node without changing other report tables", () => {
  const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const rows = source.slice(source.indexOf("  const repeatRows = engineerReportRows("), source.indexOf("  const employeeRows = engineerReportRows("));
  assert.doesNotMatch(rows, /item\.area|item\.node/);
  assert.match(rows, /measuresCell/);
  assert.match(rows, /`, 5\s*\);/);
  assert.ok(source.includes('<th>Мероприятия</th><th>Оборудование</th><th>Повторов</th><th>Простой</th><th>№ / Название поломки</th>'));
  assert.match(source, /renderRow, columnCount = 6/);
});
const escapeHtml = text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function fixture() {
  const db = { catalog: { equipment: {
    "1": { id: 1, name: "Press 2400", area: "A", nodes: ["Cylinder"], repeatFailureMeasures: { "2": { text: "Other group" } } },
    "2": { id: 2, name: "Press 1540", area: "B", nodes: ["Pump"], repeatFailureMeasures: { "1": { text: "Other equipment" } } }
  } }, checks: { "1:0:2026-08-01": { to: { commentLog: [{ id: "r1", repeatFailureCode: "1", text: "Leak" }] } } }, downtimes: [] };
  let writes = 0, broadcasts = 0;
  return { db, writes: () => writes, broadcasts: () => broadcasts,
    async send(body = {}, actor = { role: "editor", name: "Admin" }) {
      let response;
      const deps = { readBody: async () => ({ action: "save-measures", equipmentId: 1, code: "1", text: "Replace seal", ...body }),
        sendJson: (_, status, value) => { response = { status, ...value }; }, enqueueStateWrite: fn => fn(), readDb: () => db,
        activeUserPermission: user => user.allowed === true && !user.expired,
        nodeMutationAccessServer: (user, equipment) => user.area === equipment.area,
        resolutionUserKeyServer: () => "admin", writeDb: () => { writes++; },
        broadcastState: () => ++broadcasts, realtimeStateVersion: () => broadcasts };
      await handleRepeatFailureGroupRoute({ method: "POST", authUser: actor }, {}, "/api/repeat-failure-group", deps);
      return response;
    }
  };
}
test("measures are separate from node names and groups and repeated saves are idempotent", async () => {
  const f = fixture(), checks = JSON.stringify(f.db.checks), other = JSON.stringify(f.db.catalog.equipment["2"]);
  const response = await f.send({ text: "Inspect cylinder\nReplace seal" });
  assert.equal(response.status, 200);
  assert.equal(response.state.catalog.equipment["1"].repeatFailureMeasures["1"].text, "Inspect cylinder\nReplace seal");
  assert.equal(f.db.catalog.equipment["1"].repeatFailureMeasures["2"].text, "Other group");
  assert.deepEqual(f.db.catalog.equipment["1"].nodes, ["Cylinder"]);
  assert.equal(JSON.stringify(f.db.checks), checks);
  assert.equal(JSON.stringify(f.db.catalog.equipment["2"]), other);
  assert.equal((await f.send({ text: "Inspect cylinder\nReplace seal" })).changed, false);
  assert.equal(f.writes(), 1); assert.equal(f.broadcasts(), 1);
});
test("server checks permission, equipment access, group existence and input length", async () => {
  const f = fixture();
  assert.equal((await f.send({}, { role: "mechanic", area: "A" })).status, 403);
  assert.equal((await f.send({}, { role: "engineer", allowed: true, expired: true, area: "A" })).status, 403);
  assert.equal((await f.send({}, { role: "engineer", allowed: true, area: "B" })).status, 403);
  assert.equal((await f.send({ code: "99" })).status, 404);
  assert.equal((await f.send({ equipmentId: 999 })).status, 404);
  assert.equal((await f.send({ text: "x".repeat(2001) })).status, 400);
  assert.equal((await f.send({ text: {} })).status, 400);
  assert.equal(f.writes(), 0);
  assert.equal((await f.send({}, { role: "engineer", allowed: true, area: "A" })).status, 200);
});
test("saved measures survive serialization, can be edited and cleared without changing grouping", async () => {
  const f = fixture();
  await f.send();
  const reloaded = JSON.parse(JSON.stringify(f.db));
  assert.equal(reloaded.catalog.equipment["1"].repeatFailureMeasures["1"].text, "Replace seal");
  await f.send({ text: "Repair cylinder" });
  assert.equal(f.db.catalog.equipment["1"].repeatFailureMeasures["1"].text, "Repair cylinder");
  await f.send({ text: "" });
  assert.equal(f.db.catalog.equipment["1"].repeatFailureMeasures["1"].text, "");
  assert.equal(f.db.checks["1:0:2026-08-01"].to.commentLog[0].repeatFailureCode, "1");
});
test("report shows editable measures only with permission; print contains escaped saved text without controls", () => {
  const group = { equipmentId: 1, manualCode: "1", groupKey: "manual|1|1" };
  const saved = { text: "Inspect <cylinder>\nReplace seal" };
  assert.match(measuresCell(group, saved, false, true, escapeHtml), /textarea/);
  for (const [printable, allowed] of [[true, true], [false, false]]) {
    const html = measuresCell(group, saved, printable, allowed, escapeHtml);
    assert.ok(html.includes("Inspect &lt;cylinder&gt;<br>Replace seal"));
    assert.doesNotMatch(html, /textarea|button|data-save/);
  }
});
