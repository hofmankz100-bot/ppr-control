"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { compressBackupPayload, decodeBackupPayload } = require("../server/backup-codec");

test("compressed backups round-trip without changing their data", () => {
  const payload = { catalog: { equipment: { 1: { name: "Пресс", nodes: ["Узел 1"] } } }, repeated: "данные ".repeat(10000) };
  const compressed = compressBackupPayload(payload);
  assert.ok(compressed.length < Buffer.byteLength(JSON.stringify(payload)) / 10);
  assert.deepEqual(decodeBackupPayload({ payload_gzip: compressed }), payload);
});

test("legacy JSONB backups remain readable", () => {
  const payload = { legacy: true, value: "Старая копия" };
  assert.equal(decodeBackupPayload({ payload, payload_gzip: null }), payload);
  assert.equal(decodeBackupPayload({ payload: null, payload_gzip: null }), null);
});
