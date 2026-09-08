"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createJsonBodyReader } = require("../server/json-body");
const { repairPprLabels, recoverLabel, preservePprLabels, KEY } = require("../server/ppr-label-repair");
const { sanitizeStateMutation } = require("../server/state-mutation-policy");

function request() {
  const req = new EventEmitter();
  req.destroy = () => { req.destroyed = true; };
  return req;
}

test("JSON reader preserves Cyrillic, Kazakh and emoji at EVERY byte boundary", async () => {
  const value = { equipment: "Насосная", node: "скважина №2", work: "Термичка 2 — КОНТРОЛЬНАЯ ТРУБКА №3. Жөндеу ✅🔧" };
  const bytes = Buffer.from(JSON.stringify(value));
  const read = createJsonBodyReader();
  for (let split = 1; split < bytes.length; split++) {
    const req = request(), result = read(req);
    assert.equal(read(req), result);
    req.emit("data", bytes.subarray(0, split));
    req.emit("data", bytes.subarray(split));
    req.emit("end");
    assert.deepEqual(await result, value, `split ${split}`);
  }
  const req = request(), result = read(req);
  for (const byte of bytes) req.emit("data", Buffer.from([byte]));
  req.emit("end");
  assert.deepEqual(await result, value);
});

test("JSON reader rejects invalid UTF-8 and JSON, handles empty and aborted requests", async () => {
  for (const bytes of [Buffer.from([0x7b, 0x22, 0xd0]), Buffer.from([0xff]), Buffer.from("{invalid}")]) {
    const req = request(), result = createJsonBodyReader()(req);
    req.emit("data", bytes); req.emit("end");
    await assert.rejects(result, /Bad JSON/);
  }
  const empty = request(), result = createJsonBodyReader()(empty);
  empty.emit("end"); assert.deepEqual(await result, {});
  const aborted = request(), pending = createJsonBodyReader()(aborted);
  aborted.emit("aborted"); await assert.rejects(pending, /Request aborted/);
});

test("JSON reader enforces its limit in bytes, including multibyte input", async () => {
  const bytes = Buffer.from('"яя"');
  const req = request(), result = createJsonBodyReader({ maxBytes: bytes.length })(req);
  req.emit("data", bytes); req.emit("end"); assert.equal(await result, "яя");
  const large = request(), rejected = createJsonBodyReader({ maxBytes: bytes.length - 1 })(large);
  large.emit("data", bytes); large.emit("end");
  await assert.rejects(rejected, /Body too large/); assert.equal(large.destroyed, true);
});

function fixture() {
  const base = { mark: "done", markedByName: "Нурлан", markedByRole: "mechanic", resolutionComment: "Проверено", work: "Осмотр", workUpdatedAt: "2026-09-01T00:00:00Z", markUpdatedAt: "2026-09-02T00:00:00Z" };
  const wells = ["ск��ажина №2", "с��важина №2", "скв��жина №2", "��кважина №2", "скважина №2"];
  const rows = wells.map((node, i) => ({ ...base, id: `well-${i}`, equipmentId: "1", equipment: i === 1 ? "Н��сосная" : "Насосная", node, area: "Вода" }));
  return {
    catalog: { equipment: { "1": { name: "Насосная", area: "Вода", nodes: ["скважина №1", "скважина №2"] }, "2": { name: "Пресс 2400 EGE", nodes: ["Термичка 2"] }, "3": { name: "ШГРП / ГРП / ГРУ", nodes: ["КОНТРОЛЬНАЯ ТРУБКА №3"] } } },
    pprSheets: {
      "2026-09-09": { rows, approvedAt: "2026-09-09T10:00:00Z", approvedByName: "Инженер", autofilledFor: [{ equipmentId: "1", equipment: "Насосная", node: "ск��ажина №2" }] },
      "2026-09-22": { rows: [
        { ...base, id: "press", equipmentId: "2", equipment: "Пресс 2400 EGE", node: "Терми��ка 2" },
        { ...base, id: "gas", equipmentId: "3", equipment: "ШГРП / ГРП / ГРУ", node: "КОНТР��ЛЬНАЯ ТРУБКА №3" }
      ] }
    },
    checks: { untouched: { comment: "История", repeatFailureCode: "5" } }, downtimes: [{ id: "untouched" }]
  };
}

test("PPR repair restores reported spellings and preserves every work, signature and mark", () => {
  const db = fixture(), before = structuredClone(db);
  assert.equal(repairPprLabels(db), 8);
  assert.equal(db.pprSheets["2026-09-09"].rows.length, 5);
  for (const row of db.pprSheets["2026-09-09"].rows) {
    assert.equal(row.equipment, "Насосная"); assert.equal(row.node, "скважина №2");
  }
  assert.equal(db.pprSheets["2026-09-22"].rows[0].node, "Термичка 2");
  assert.equal(db.pprSheets["2026-09-22"].rows[1].node, "КОНТРОЛЬНАЯ ТРУБКА №3");
  const strip = value => JSON.parse(JSON.stringify(value, (key, item) => ["equipment", "node", "area", "targetedCleanupVersions"].includes(key) ? undefined : item));
  assert.deepEqual(strip(db), strip(before));
  const audit = structuredClone(db.targetedCleanupVersions[KEY]);
  assert.equal(audit.unresolved.length, 0);
  assert.equal(audit.changes.length, 8);
  assert.equal(repairPprLabels(db), 0);
  assert.deepEqual(db.targetedCleanupVersions[KEY], audit);
});

test("PPR repair does not guess ambiguous labels or change healthy historical names", () => {
  assert.equal(recoverLabel("Нас��с", ["Насос", "Нассс"]), "Нас��с");
  assert.equal(recoverLabel("�� №2", ["Узел №2"]), "�� №2");
  assert.equal(recoverLabel("Старый узел", ["Новый узел"]), "Старый узел");
  assert.equal(recoverLabel("Тру��ка (№3)", ["Трубка (№3)"]), "Трубка (№3)");
  const db = fixture(); db.catalog.equipment["1"].nodes = ["скважина №1"];
  // Clean historical peer still permits exact repair without forcing current catalog names.
  repairPprLabels(db); assert.equal(db.pprSheets["2026-09-09"].rows[0].node, "скважина №2");
});

test("sparse live catalogs retain names in sheet peers; repair uses only the same equipment ID", () => {
  const db = fixture();
  delete db.catalog.equipment["1"].name;
  delete db.catalog.equipment["1"].area;
  const rows = db.pprSheets["2026-09-09"].rows;
  rows[1].area = "Во��а";
  rows.push({ id: "unrelated", equipmentId: "99", equipment: "Нассосная", node: "скважина №2", area: "Вона" });
  const previousAudit = { at: "2026-09-08T00:00:00Z", changes: [{ before: "original" }] };
  db.targetedCleanupVersions = { pprLabelEncodingRepair20260908: previousAudit };
  repairPprLabels(db);
  assert.equal(rows[1].equipment, "Насосная");
  assert.equal(rows[1].area, "Вода");
  assert.equal(rows[5].equipment, "Нассосная");
  assert.deepEqual(db.targetedCleanupVersions.pprLabelEncodingRepair20260908, previousAudit);
});

test("stale browser labels cannot undo repair or clear existing completion marks", () => {
  const previous = fixture(); repairPprLabels(previous);
  delete previous.pprSheets["2026-09-09"].approvedAt;
  const incoming = { pprSheets: structuredClone(previous.pprSheets) };
  const raw = incoming.pprSheets["2026-09-09"].rows[0];
  raw.node = "ск��ажина №2"; raw.equipment = "Н��сосная"; raw.workUpdatedAt = "2099-01-01T00:00:00Z";
  const result = sanitizeStateMutation({ previous, incoming, user: { role: "editor", name: "Админ" }, canAccessEquipment: () => true, hasArea: () => true });
  assert.deepEqual(result.body.pprSheets["2026-09-09"].rows[0], previous.pprSheets["2026-09-09"].rows[0]);
  assert.equal(raw.node, "ск��ажина №2");
  assert.deepEqual(preservePprLabels({ node: "Новый узел" }, { node: "Старый узел" }), { node: "Новый узел" });
});
