"use strict";

const zlib = require("zlib");

function compressBackupPayload(payload) {
  return zlib.gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 6 });
}

function decodeBackupPayload(row = {}) {
  if (row.payload && typeof row.payload === "object") return row.payload;
  if (!row.payload_gzip) return null;
  const buffer = Buffer.isBuffer(row.payload_gzip) ? row.payload_gzip : Buffer.from(row.payload_gzip);
  return JSON.parse(zlib.gunzipSync(buffer).toString("utf8"));
}

module.exports = { compressBackupPayload, decodeBackupPayload };
