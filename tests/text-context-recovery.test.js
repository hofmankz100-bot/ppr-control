"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { KEY, repairStoredText, textIntegrityReport } = require("../server/text-integrity");
const reference = require("../server/text-recovery-reference.json");
const approved = reference.exactRecords.filter(item => item.mode === "user-approved-contextual-recovery");

function fixture() {
  const db = { pprSheets: {}, checks: { untouched: { repeatFailureCode: "5", comment: "Журнал" } }, downtimes: [{ id: "stop", minutes: 70 }], targetedCleanupVersions: { [KEY]: { referenceVersion: 2, repaired: 555, changes: [{ before: "история", after: "история" }], invalidatedTranslations: [] } } };
  for (const item of approved) {
    const rows = (db.pprSheets[item.date] ||= { approvedAt: "2026-09-05T10:00:00Z", approvedByName: "Инженер", rows: [] }).rows;
    let row = rows.find(row => row.id === item.rowId);
    if (!row) { row = { id: item.rowId, equipmentId: item.equipmentId, mark: "done", markedByName: "Сотрудник", markedAt: "2026-09-01T10:00:00Z", workUpdatedAt: "2026-08-01T10:00:00Z", markUpdatedAt: "2026-09-01T10:00:00Z", repeatFailureCode: "2" }; rows.unshift(row); }
    row[item.field] = item.before;
  }
  return db;
}

test("approved restoration changes only the 17 original text fields, regardless of row position", () => {
  assert.equal(approved.length, 17);
  const db = fixture(), before = structuredClone(db);
  repairStoredText(db);
  const report = textIntegrityReport(db);
  assert.equal(report.repaired, 572);
  assert.equal(report.remaining, 0);
  assert.equal(report.reviewNotes.length, 1);
  for (const item of approved) {
    const row = db.pprSheets[item.date].rows.find(row => row.id === item.rowId);
    assert.equal(row[item.field], item.after);
    row[item.field] = item.before;
  }
  delete db.targetedCleanupVersions; delete before.targetedCleanupVersions;
  assert.deepEqual(db, before);
});

test("contextual originals and uncertainty are retained, and re-running is idempotent", () => {
  const db = fixture(); repairStoredText(db);
  const changes = db.targetedCleanupVersions[KEY].changes;
  assert.equal(changes.filter(change => change.mode === "user-approved-contextual-recovery").length, 17);
  const pipe = changes.find(change => change.reviewNote);
  assert.match(pipe.after, /Размер трубы требует проверки/);
  assert.match(pipe.after, /«70»/);
  assert.doesNotMatch(pipe.after, /[ØФф⌀]70|70\s*мм/);
  assert.equal(pipe.before, approved.find(item => item.reviewNote).before);
  const saved = structuredClone(db); repairStoredText(db); assert.deepEqual(db, saved);
});

test("a text edited after inspection cannot be overwritten by contextual recovery", () => {
  const db = fixture(), item = approved[0];
  const row = db.pprSheets[item.date].rows.find(row => row.id === item.rowId);
  row[item.field] = "Новое уточнение сотрудника";
  repairStoredText(db);
  assert.equal(row[item.field], "Новое уточнение сотрудника");
  assert.equal(textIntegrityReport(db).repaired, 571);
});
