"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { KEY, invalidText, recoverText, repairStoredText, textIntegrityReport, requestContainsInvalidText } = require("../server/text-integrity");
const { createApiDispatcher } = require("../server/api-dispatcher");

test("backup preview matches stable record IDs and cannot restore old marks or change intact words", () => {
  const { backupTextSuggestions } = require("../server/text-integrity");
  const db = { pprSheets: { day: { rows: [{ id: "a", work: "Осмотр нас��са", mark: "done" }, { id: "b", work: "новый текст" }] } } };
  const backup = { pprSheets: { day: { rows: [{ id: "b", work: "Осмотр насоса" }, { id: "a", work: "Осмотр насоса", mark: "" }] } } };
  const before = structuredClone(db);
  assert.deepEqual(backupTextSuggestions(db, backup), [{ path: ["pprSheets", "day", "rows", "0", "work"], before: "Осмотр нас��са", after: "Осмотр насоса" }]);
  assert.deepEqual(db, before);
});

test("all-section repair preserves source evidence and every non-text value", () => {
  const row = { id: "row-1", work: "Осмотр нас��са", markedByName: "Нур��ан", mark: "done", equipmentId: 7, markedAt: "2026-09-01", repeatFailureCode: "5" };
  const db = { users: [{ id: "u1", name: "Нурлан" }], pprSheets: { date: { rows: [row] } }, checks: { old: { comment: "Осмотр нас��са" } }, catalog: { equipment: {} }, auditHistory: [{ text: "Осмотр нас��са" }], secretToken: "secret��", translationCache: { broken: { text: "О��мотр", translated: "test" }, healthy: { text: "Осмотр", translated: "Inspection" } } };
  const before = structuredClone(db);
  const report = repairStoredText(db, { source: "test backup", fields: { work: ["Осмотр насоса"] } });
  assert.equal(report.repaired, 4);
  assert.equal(row.work, "Осмотр насоса"); assert.equal(row.markedByName, "Нурлан");
  assert.deepEqual({ ...row, work: before.pprSheets.date.rows[0].work, markedByName: before.pprSheets.date.rows[0].markedByName }, before.pprSheets.date.rows[0]);
  assert.equal(db.secretToken, before.secretToken);
  assert.deepEqual(report.invalidatedTranslations, [{ key: "broken", value: before.translationCache.broken }]);
  assert.deepEqual(db.translationCache, { healthy: before.translationCache.healthy });
  assert.equal(report.changes[0].before.includes("�"), true);
  const saved = structuredClone(db);
  repairStoredText(db); assert.deepEqual(db, saved);
  const audit = textIntegrityReport(db);
  assert.equal(audit.remaining, 1); assert.equal(audit.unresolved[0].text, "[служебное поле]");
  assert.equal(db.targetedCleanupVersions[KEY].changes.length, 4);
});

test("recovery never chooses between ambiguous people or rewrites intact historical wording", () => {
  assert.equal(recoverText("Нур��ан", ["Нурлан", "Нуржан"]), "Нур��ан");
  assert.equal(recoverText("�� №2", ["Узел №2"]), "�� №2");
  assert.equal(recoverText("старое имя", ["новое имя"]), "старое имя");
  assert.equal(recoverText("строка (т��ст)\n", ["строка (тест)\n"]), "строка (тест)\n");
  const db = { checks: { a: { comment: "Неизвестный т��кст" } } };
  repairStoredText(db, { fields: {} });
  assert.equal(db.checks.a.comment, "Неизвестный т��кст");
  assert.equal(textIntegrityReport(db).remaining, 1);
});

test("clean backup templates recover character damage without spelling or meaning edits", () => {
  const values = require("../server/text-recovery-reference.json").fields.work.filter(value => value.length > 10);
  for (const original of values) {
    const index = [...original].findIndex(character => /[а-яА-Я]/u.test(character));
    const characters = [...original]; characters.splice(index, 1, "��");
    assert.equal(recoverText(characters.join(""), values), original);
  }
});

test("write guard rejects newly damaged text including escaped surrogates, not ordinary Cyrillic", () => {
  assert.equal(invalidText("Жөндеу ✅🔧"), false);
  assert.equal(requestContainsInvalidText(JSON.parse('{"work":"\\ufffd"}')), true);
  assert.equal(requestContainsInvalidText(JSON.parse('{"name":"\\ud800"}')), true);
  assert.equal(requestContainsInvalidText({ work: "Термичка — жөндеу 🔧", count: 3 }), false);
  const previous = { rows: [{ id: "a", comment: "стар��е" }, { id: "b", comment: "текст" }] };
  assert.equal(requestContainsInvalidText({ rows: [...previous.rows].reverse() }, previous), false);
  assert.equal(requestContainsInvalidText({ rows: [{ id: "b", comment: "стар��е" }] }, previous), true);
  assert.equal(requestContainsInvalidText({ rows: [{ id: "a", comment: "нов��е" }] }, previous), true);
  assert.equal(requestContainsInvalidText({ rows: [{ id: "a", comment: "стар��е" }] }, { rows: [{ id: "a", comment: "старое" }] }), true);
});

test("malformed body never reaches a mutation handler or state lock", async () => {
  let response;
  const dispatch = createApiDispatcher({ readBody: async () => { throw new Error("Bad JSON"); }, sendJson: (res, status, body) => { response = { status, body }; }, enqueueStateWrite: () => assert.fail("must not write"), handleApiTransaction: () => assert.fail("must not handle") });
  assert.equal(await dispatch({ method: "POST" }, {}, "/api/ppr-sheet/action"), true);
  assert.equal(response.status, 400); assert.equal(response.body.code, "invalid_json_encoding");
});
