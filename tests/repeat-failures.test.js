"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../modules/repeat-failures.js"), "utf8"), context);
const { buildAnnualAnalysis, journalHtml } = context.window.PPRModules.repeatFailures;
test("journal stylesheet is publicly served without exposing other server files", () => {
  const { isPublicStaticPath } = require("../server/static-files");
  assert.equal(isPublicStaticPath("modules/repeat-failures.css"), true);
  assert.equal(isPublicStaticPath("server/repeat-failure-group-route.js"), false);
  assert.equal(isPublicStaticPath("modules/../server/env.js"), false);
});
const event = (overrides = {}) => ({ type: "remark", equipmentId: 1, equipment: "Пресс", area: "Цех", node: "Насос", createdAt: "2026-08-01T08:00:00Z", text: "Не работает", ...overrides });
const analyze = events => buildAnnualAnalysis(events, 2026, { workers: [] }).repeatedBreakdowns;
const helpers = { escapeHtml: value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"), dateTimeHuman: value => value || "", durationText: value => String(value), requestRoleLabel: value => value || "" };

test("unmarked identical records never become repeat groups", () => {
  assert.equal(analyze(Array.from({ length: 34 }, () => event())).length, 0);
  assert.equal(analyze([event({ repeatFailureCode: " " }), event({ repeatFailureCode: " " })]).length, 0);
});
test("only matching manual codes on the same equipment are counted", () => {
  const result = analyze([event({ repeatFailureCode: "5" }), event({ type: "breakdown", repeatFailureCode: "5", durationMs: 60000 }), event(), event({ repeatFailureCode: "6" }), event({ repeatFailureCode: "5", equipmentId: 2 }), event({ repeatFailureCode: "5", createdAt: "2025-08-01T08:00:00Z" })]);
  assert.equal(result.length, 1);
  assert.equal(result[0].count, 2);
  assert.equal(result[0].downtimeMs, 60000);
  assert.equal(analyze([event({ repeatFailureCode: "5" }), event({ repeatFailureCode: "" })]).length, 0);
});
test("all manually marked repeat groups remain available beyond the first ten", () => {
  const events = Array.from({ length: 11 }, (_, i) => [event({ repeatFailureCode: String(i + 1) }), event({ repeatFailureCode: String(i + 1) })]).flat();
  assert.equal(analyze(events).length, 11);
});
test("detail journal paginates marked records and retains aggregate repair details", () => {
  const marked = Array.from({ length: 11 }, () => event({ repeatFailureCode: "5", text: "<script>bad</script>", resolvedAt: "2026-08-02T09:00:00Z", resolvedComment: "Заменили насос", ratingParticipants: [{ name: "Иван", role: "mechanic" }, { name: "Нурлан", role: "mechanic" }], confirmedByName: "Инженер", confirmedAt: "2026-08-02T10:00:00Z" }));
  const html = journalHtml({ manualCode: "5", equipment: "Пресс", events: [...marked, event({ text: "UNMARKED" }), event({ repeatFailureCode: "6", text: "OTHER" })] }, 2026, helpers);
  assert.equal((html.match(/class="repeat-journal-sheet"/g) || []).length, 2);
  assert.equal((html.match(/Заменили насос/g) || []).length, 11);
  assert.ok(html.includes("Дата ремонта") && html.includes("Кто устранил / кто подтвердил"));
  assert.ok(html.includes("Иван") && html.includes("Нурлан") && html.includes("Подтвердил: Инженер"));
  assert.ok(html.includes("2026-08-02T09:00:00Z") && html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>") && !html.includes("UNMARKED") && !html.includes("OTHER"));
  assert.ok(!html.includes("repeat-failure-editor") && !html.includes("data-save-repeat-failure"));
});
