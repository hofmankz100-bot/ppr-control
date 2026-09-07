"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

function functions(overrides) {
  const context = { Buffer, crypto, path, MAX_PHOTO_BYTES: 5*1024*1024,
    photosDir: "/test/photos", photoExtensionFromMime: () => "jpg", ...overrides };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("function savePhotoDataUrl("), source.indexOf("async function compressLegacyBackupTables(")), context);
  return context;
}

test("PostgreSQL uploads do not cache uncommitted or larger original bytes", () => {
  let writes = 0;
  const ctx = functions({ postgresPool: {}, fs: { mkdirSync() {}, existsSync: () => false, writeFileSync() { writes++; } } });
  const result = ctx.savePhotoDataUrl("data:image/jpeg;base64,aGVsbG8=");
  assert.ok(result.url.startsWith("/api/photos/"));
  assert.equal(writes, 0);
  ctx.postgresPool = null;
  ctx.savePhotoDataUrl("data:image/jpeg;base64,aGVsbG8=");
  assert.equal(writes, 1, "JSON-only deployments still persist the photo file");
});

test("re-upload and replica promotion cannot overwrite smaller optimized aliases", async () => {
  const queries = [];
  const pool = {
    activeIndex: 0,
    orderedIndexes: () => [0, 1],
    nodes: [
      { pool: { query: async () => ({ rows: [] }) } },
      { pool: { query: async () => ({ rows: [{ payload: Buffer.from("original"), mime_type: "image/jpeg" }] }) } }
    ],
    async query(sql) { queries.push(sql); return { rows: [] }; },
    async flushMirrors() {}
  };
  const ctx = functions({ postgresPool: pool });
  await ctx.persistPhotoToPostgres("a.jpg", "image/jpeg", Buffer.from("original"));
  await ctx.readPhotoFromPostgres("a.jpg");
  assert.equal(queries.length, 2);
  for (const sql of queries) assert.match(sql, /WHERE octet_length\(ppr_photos.payload\) >=? octet_length\(EXCLUDED.payload\)/);
});
