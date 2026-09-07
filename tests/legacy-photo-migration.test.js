"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  sha256, MAX_NEW_ORIGINAL_BYTES, MAX_DATABASE_BYTES, assertBudget,
  ensureRecoveryTable, planMigration, compressOne, restoreOne, getRecovery
} = require("../server/legacy-photo-migration");
const { parseOptions, safeError } = require("../tools/compress-existing-photos");

const fileName = `${"a".repeat(40)}.jpg`;
const original = Buffer.alloc(320 * 1024, 73);
const compressed = Buffer.alloc(80 * 1024, 28);
const originalDate = new Date("2026-08-03T10:00:00.000Z");
const optimizedDate = new Date("2026-09-07T10:00:00.000Z");
const clone = value => value == null ? value : {
  ...value,
  ...(value.payload ? { payload: Buffer.from(value.payload) } : {}),
  ...(value.original_payload ? { original_payload: Buffer.from(value.original_payload) } : {})
};

function photo(payload = original) {
  return { file_name: fileName, payload: Buffer.from(payload), mime_type: "image/jpeg", updated_at: originalDate };
}

function recovery() {
  return {
    file_name: fileName, original_payload: Buffer.from(original),
    original_sha256: sha256(original), optimized_sha256: sha256(compressed),
    original_mime_type: "image/jpeg", original_updated_at: originalDate,
    optimized_updated_at: optimizedDate, created_at: optimizedDate, restored_at: null
  };
}

// This fake models transaction isolation/rollback, not PostgreSQL itself. It
// rejects unknown SQL so a new persistence path cannot silently pass the tests.
function database(options = {}) {
  const state = {
    photo: photo(), recovery: null, exists: true, databaseBytes: 100 * 1024 * 1024,
    relation: { relpersistence: "p", relkind: "r" },
    ...options
  };
  const events = [];
  let snapshot;
  let released = 0;
  const result = rows => ({ rows, rowCount: rows.length });
  async function query(text, values = []) {
    const sql = text.replace(/\bpublic\./g, "").replace(/\s+/g, " ").trim();
    events.push({ sql, values });
    if (/^BEGIN\b/i.test(sql)) {
      assert.equal(snapshot, undefined, "unexpected nested transaction");
      snapshot = { photo: clone(state.photo), recovery: clone(state.recovery) };
      return result([]);
    }
    if (/^ROLLBACK\b/i.test(sql)) {
      if (snapshot) Object.assign(state, snapshot);
      snapshot = undefined;
      return result([]);
    }
    if (/^COMMIT\b/i.test(sql)) {
      if (options.beforeCommit) await options.beforeCommit();
      snapshot = undefined;
      return result([]);
    }
    if (/^SET LOCAL\b/i.test(sql)) return result([]);
    if (/^CREATE TABLE\b/i.test(sql)) { state.exists = true; return result([]); }
    if (/FROM pg_class\b/i.test(sql)) return result(state.relation ? [{ ...state.relation }] : []);
    if (/to_regclass/i.test(sql)) {
      return result([{ recovery_table: state.exists ? "ppr_photo_originals" : null,
        exists: state.exists, table_name: state.exists ? "ppr_photo_originals" : null }]);
    }
    if (/pg_database_size/i.test(sql)) return result([{ database_bytes: state.databaseBytes, bytes: state.databaseBytes }]);
    if (/^SELECT\b/i.test(sql) && /\bFROM ppr_photo_originals\b/i.test(sql)) {
      const row = clone(state.recovery);
      if (row && options.corruptRecoveryRead) row.original_payload[0] ^= 255;
      return result(row ? [row] : []);
    }
    if (/^SELECT\b/i.test(sql) && /\bFROM ppr_photos\b/i.test(sql)) {
      if (/FOR UPDATE/i.test(sql) || /\bpayload\s*[,\s]/i.test(sql)) return result(state.photo ? [clone(state.photo)] : []);
      return result(state.photo ? [{ file_name: fileName, mime_type: state.photo.mime_type,
        updated_at: state.photo.updated_at, bytes: state.photo.payload.length,
        backup_exists: Boolean(state.recovery) }] : []);
    }
    if (/^INSERT INTO ppr_photo_originals\b/i.test(sql)) {
      if (state.recovery) return result([]);
      const columns = sql.match(/ppr_photo_originals\s*\(([^)]+)\)/i)[1].split(",").map(item => item.trim());
      const expressions = sql.match(/VALUES\s*\(([^)]+)\)/i)[1].split(",").map(item => item.trim());
      state.recovery = {};
      columns.forEach((column, index) => {
        const parameter = expressions[index].match(/^\$(\d+)/);
        state.recovery[column] = parameter ? values[Number(parameter[1]) - 1] : optimizedDate;
      });
      state.recovery = clone(state.recovery);
      return result([{ file_name: fileName }]);
    }
    if (/^UPDATE ppr_photos\b/i.test(sql)) {
      if (options.failPhotoUpdate) throw new Error("injected photo update failure");
      if (options.missPhotoUpdate) return result([]);
      const [setClause, whereClause] = sql.split(/\bWHERE\b/i);
      assert.match(whereClause, /payload\s*=\s*\$\d+/i, "photo writes require a payload compare-and-swap");
      const expected = Number(whereClause.match(/payload\s*=\s*\$(\d+)/i)[1]) - 1;
      if (!state.photo || !state.photo.payload.equals(values[expected])) return result([]);
      const replacement = Number(setClause.match(/payload\s*=\s*\$(\d+)/i)[1]) - 1;
      state.photo.payload = Buffer.from(values[replacement]);
      state.photo.updated_at = optimizedDate;
      const mime = setClause.match(/mime_type\s*=\s*\$(\d+)/i);
      if (mime) state.photo.mime_type = values[Number(mime[1]) - 1];
      return result([{ file_name: fileName, updated_at: optimizedDate }]);
    }
    if (/^UPDATE ppr_photo_originals\b/i.test(sql)) {
      if (/\brestored_at\s*=/i.test(sql)) state.recovery.restored_at = optimizedDate;
      if (/\boptimized_updated_at\s*=/i.test(sql)) state.recovery.optimized_updated_at = optimizedDate;
      return result([{ file_name: fileName }]);
    }
    throw new Error(`Unexpected query in photo migration test: ${sql}`);
  }
  const pool = { query, async connect() { events.push({ sql: "CONNECT" }); return { query, release() { released += 1; } }; } };
  return { pool, state, events, get released() { return released; } };
}

const optimize = async () => ({ changed: true, bytes: Buffer.from(compressed), mimeType: "image/jpeg",
  originalBytes: original.length, savedBytes: original.length - compressed.length });
const writes = db => db.events.filter(event => /^(INSERT|UPDATE|DELETE|CREATE|ALTER)\b/i.test(event.sql));

async function cache(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ppr-photo-migration-test-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, fileName);
  await fs.writeFile(file, original);
  return { directory, file };
}

test("migration budgets enforce original-copy and total-database limits independently", () => {
  assert.equal(MAX_NEW_ORIGINAL_BYTES, 128 * 1024 * 1024);
  assert.equal(MAX_DATABASE_BYTES, 900 * 1024 * 1024);
  assert.doesNotThrow(() => assertBudget({ databaseBytes: 1, newOriginalBytes: MAX_NEW_ORIGINAL_BYTES }));
  assert.throws(() => assertBudget({ databaseBytes: 1, newOriginalBytes: MAX_NEW_ORIGINAL_BYTES + 1 }));
  assert.doesNotThrow(() => assertBudget({ databaseBytes: MAX_DATABASE_BYTES - 1, newOriginalBytes: 0 }));
  assert.throws(() => assertBudget({ databaseBytes: MAX_DATABASE_BYTES - 1, newOriginalBytes: 1 }));
});

test("planning reports candidate sizes without retrieving images or creating the recovery table", async () => {
  for (const exists of [false, true]) {
    const db = database({ exists });
    const plan = await planMigration(db.pool, { after: "", limit: 20 });
    assert.equal(plan.recoveryTableExists, exists);
    assert.equal(plan.databaseBytes, db.state.databaseBytes);
    assert.equal(plan.newOriginalBytes, original.length);
    assert.equal(plan.candidates.length, 1);
    assert.equal(plan.candidates[0].bytes, original.length);
    assert.equal(Object.hasOwn(plan.candidates[0], "payload"), false);
    assert.ok(db.events.every(event => /^SELECT\b/i.test(event.sql)));
    assert.equal(db.state.exists, exists);
    const photosQuery = db.events.find(event => /FROM ppr_photos/i.test(event.sql));
    assert.match(photosQuery.sql, /octet_length\(p.payload\)/);
    assert.deepEqual(photosQuery.values, ["", 20]);
  }
});

test("planning does not charge existing verified-backup candidates against the new-original budget", async () => {
  const db = database({ recovery: recovery() });
  assert.equal((await planMigration(db.pool)).newOriginalBytes, 0);
  assert.equal(writes(db).length, 0);
});

test("recovery schema creation is an explicit operation separate from planning", async () => {
  const db = database({ exists: false });
  await ensureRecoveryTable(db.pool);
  assert.equal(db.state.exists, true);
  assert.equal(writes(db).length, 1);
  assert.match(writes(db)[0].sql, /^CREATE TABLE IF NOT EXISTS ppr_photo_originals/);
  assert.match(writes(db)[0].sql, /original_payload bytea NOT NULL/);
  assert.ok(db.events.some(event => /FROM pg_class\b/i.test(event.sql)));
});

test("recovery schema rejects unlogged, temporary, view, or missing relations", async () => {
  for (const relation of [
    { relpersistence: "u", relkind: "r" },
    { relpersistence: "t", relkind: "r" },
    { relpersistence: "p", relkind: "v" },
    null
  ]) {
    const db = database({ relation });
    await assert.rejects(ensureRecoveryTable(db.pool), /permanent|logged|durable|recovery table/i);
    assert.deepEqual(db.state.photo.payload, original);
    assert.equal(db.state.recovery, null);
    assert.equal(db.events.some(event => /^(INSERT|UPDATE|DELETE)\b/i.test(event.sql)), false);
  }
});

test("photo CLI defaults to audit and requires explicit apply for restore", () => {
  assert.deepEqual(parseOptions([]), { apply: false, limit: 20, after: "", restore: "" });
  assert.throws(() => parseOptions(["--restore", fileName]), /Restore requires --apply/);
  assert.deepEqual(parseOptions(["--apply", "--restore", fileName]),
    { apply: true, limit: 20, after: "", restore: fileName });
  assert.equal(parseOptions(["--limit", "0"]).limit, 0);
});

test("photo CLI rejects unknown options, missing values and unsafe filenames", () => {
  for (const args of [
    ["--unknown"], ["--limit"], ["--after"], ["--restore"],
    ["--limit", "--apply"], ["--apply", "--restore", ""],
    ["--limit", ""], ["--limit", "   "],
    ["--limit", "-1"], ["--limit", "1.5"], ["--limit", "NaN"],
    ["--after", "../photo.jpg"], ["--apply", "--restore", "../photo.jpg"]
  ]) assert.throws(() => parseOptions(args), Error, `arguments must be rejected: ${JSON.stringify(args)}`);
});

test("photo CLI diagnostic errors redact PostgreSQL URLs and password assignments", () => {
  const message = "connection failed postgres://test-user:one-secret@db.invalid:5432/main "
    + "postgresql://other-user:two-secret@db2.invalid/backup "
    + "password=three-secret, passwd:'four secret'; PWD=\"five secret\"";
  const redacted = safeError(new Error(message));
  assert.match(redacted, /^connection failed/);
  assert.equal((redacted.match(/\[database URL redacted\]/g) || []).length, 2);
  assert.equal((redacted.match(/\[redacted\]/g) || []).length, 3);
  for (const secret of ["test-user", "other-user", "db.invalid", "db2.invalid", "one-secret", "two-secret", "three-secret", "four secret", "five secret"]) {
    assert.equal(redacted.includes(secret), false, `diagnostic leaked ${secret}`);
  }
});

test("compression commits a verified original and CAS before publishing cache bytes", async t => {
  const files = await cache(t);
  const db = database({ beforeCommit: async () => assert.deepEqual(await fs.readFile(files.file), original) });
  const budget = { newOriginalBytes: 0 };
  const result = await compressOne({ pool: db.pool, row: photo(), optimize, cacheDirectory: files.directory, budget });
  assert.equal(result.changed, true);
  assert.deepEqual(db.state.photo.payload, compressed);
  assert.deepEqual(db.state.recovery.original_payload, original);
  assert.equal(db.state.recovery.original_sha256, sha256(original));
  assert.equal(db.state.recovery.optimized_sha256, sha256(compressed));
  assert.deepEqual(await fs.readFile(files.file), compressed);
  assert.equal(budget.newOriginalBytes, original.length);
  const inserted = db.events.findIndex(event => /^INSERT INTO ppr_photo_originals/i.test(event.sql));
  const replaced = db.events.findIndex(event => /^UPDATE ppr_photos/i.test(event.sql));
  const committed = db.events.findIndex(event => /^COMMIT/i.test(event.sql));
  assert.ok(inserted >= 0 && inserted < replaced && replaced < committed);
  assert.ok(db.events.slice(inserted + 1, replaced).some(event => /^SELECT\b/i.test(event.sql) && /ppr_photo_originals/i.test(event.sql)));
  assert.ok(db.events.some(event => /^SET LOCAL synchronous_commit\b/i.test(event.sql)));
  assert.equal(db.released, 1);
});

test("corrupt recovery verification rolls back without changing database or cache originals", async t => {
  const files = await cache(t);
  const db = database({ corruptRecoveryRead: true });
  const budget = { newOriginalBytes: 0 };
  await assert.rejects(compressOne({ pool: db.pool, row: photo(), optimize, cacheDirectory: files.directory, budget }), /Recovery original checksum/);
  assert.deepEqual(db.state.photo.payload, original);
  assert.equal(db.state.recovery, null);
  assert.deepEqual(await fs.readFile(files.file), original);
  assert.equal(budget.newOriginalBytes, 0);
  assert.ok(db.events.some(event => event.sql === "ROLLBACK"));
  assert.equal(db.released, 1);
});

test("photo update errors roll back the newly inserted recovery row and release the connection", async t => {
  const files = await cache(t);
  const db = database({ failPhotoUpdate: true });
  const budget = { newOriginalBytes: 0 };
  await assert.rejects(compressOne({ pool: db.pool, row: photo(), optimize, cacheDirectory: files.directory, budget }), /injected photo update failure/);
  assert.deepEqual(db.state.photo.payload, original);
  assert.equal(db.state.recovery, null);
  assert.deepEqual(await fs.readFile(files.file), original);
  assert.equal(budget.newOriginalBytes, 0);
  assert.ok(db.events.some(event => event.sql === "ROLLBACK"));
  assert.equal(db.released, 1);
});

test("exceeding either migration budget prevents photo and recovery writes", async () => {
  for (const limits of [
    { databaseBytes: MAX_DATABASE_BYTES - original.length, newOriginalBytes: 0 },
    { databaseBytes: 1, newOriginalBytes: MAX_NEW_ORIGINAL_BYTES - original.length + 1 }
  ]) {
    const db = database({ databaseBytes: limits.databaseBytes });
    await assert.rejects(compressOne({ pool: db.pool, row: photo(), optimize, budget: { newOriginalBytes: limits.newOriginalBytes } }), /128 MiB|900 MiB/);
    assert.equal(writes(db).length, 0);
    assert.deepEqual(db.state.photo.payload, original);
    assert.equal(db.state.recovery, null);
    assert.equal(db.released, 1);
  }
});

test("getRecovery rejects a backup whose bytes no longer match its saved checksum", async () => {
  const db = database({ recovery: recovery(), corruptRecoveryRead: true });
  await assert.rejects(getRecovery(db.pool, fileName), /Recovery original checksum/);
  assert.equal(writes(db).length, 0);
});

test("restore does not overwrite a photo changed since its recorded optimization", async t => {
  const files = await cache(t);
  const newer = Buffer.from("a newer independently uploaded photograph");
  const db = database({ photo: photo(newer), recovery: recovery() });
  await assert.rejects(restoreOne({ pool: db.pool, fileName, cacheDirectory: files.directory }), /Photo changed since compression/);
  assert.deepEqual(db.state.photo.payload, newer);
  assert.equal(writes(db).length, 0);
  assert.deepEqual(await fs.readFile(files.file), original);
  assert.equal(db.released, 1);
});

test("resuming completed optimization repairs stale cache without recompressing or storing another original", async t => {
  const files = await cache(t);
  const row = { ...photo(compressed), updated_at: optimizedDate };
  const db = database({ photo: row, recovery: recovery() });
  const budget = { newOriginalBytes: 37 };
  const result = await compressOne({ pool: db.pool, row, cacheDirectory: files.directory, budget,
    optimize: async () => assert.fail("a resumed image must never be recompressed") });
  assert.equal(result.changed, false);
  assert.equal(result.reason, "already_optimized");
  assert.equal(result.previousSha256, sha256(original));
  assert.deepEqual(await fs.readFile(files.file), compressed);
  assert.deepEqual(db.state.recovery.original_payload, original);
  assert.equal(writes(db).length, 0);
  assert.equal(budget.newOriginalBytes, 37);
});

test("resuming a restored image keeps the original and never runs optimization again", async t => {
  const files = await cache(t);
  await fs.writeFile(files.file, compressed);
  const saved = { ...recovery(), restored_at: optimizedDate };
  const db = database({ recovery: saved });
  const result = await compressOne({ pool: db.pool, row: photo(), cacheDirectory: files.directory,
    optimize: async () => assert.fail("a restored original must never be recompressed") });
  assert.equal(result.reason, "already_restored");
  assert.equal(result.previousSha256, sha256(compressed));
  assert.equal(writes(db).length, 0);
  assert.deepEqual(await fs.readFile(files.file), original);
});

test("a failed photo compare-and-swap rolls back its recovery insert", async () => {
  const db = database({ missPhotoUpdate: true });
  const budget = { newOriginalBytes: 0 };
  await assert.rejects(compressOne({ pool: db.pool, row: photo(), optimize, budget }), /Photo changed concurrently/);
  assert.deepEqual(db.state.photo.payload, original);
  assert.equal(db.state.recovery, null);
  assert.equal(budget.newOriginalBytes, 0);
  assert.ok(db.events.some(event => event.sql === "ROLLBACK"));
  assert.equal(db.released, 1);
});

test("cache publication failure leaves the committed database and recovery available for repair", async t => {
  const files = await cache(t);
  const db = database();
  const result = await compressOne({ pool: db.pool, row: photo(), optimize, cacheDirectory: files.file });
  assert.equal(result.changed, true);
  assert.match(result.cacheWarning, /cache needs repair/);
  assert.deepEqual(db.state.photo.payload, compressed);
  assert.deepEqual(db.state.recovery.original_payload, original);
  assert.deepEqual(await fs.readFile(files.file), original);
  assert.ok(db.events.some(event => event.sql === "COMMIT"));
  assert.ok(!db.events.some(event => event.sql === "ROLLBACK"));
});

test("restore verifies and commits original bytes before replacing the optimized cache", async t => {
  const files = await cache(t);
  await fs.writeFile(files.file, compressed);
  const db = database({ photo: photo(compressed), recovery: recovery(),
    beforeCommit: async () => assert.deepEqual(await fs.readFile(files.file), compressed) });
  const result = await restoreOne({ pool: db.pool, fileName, cacheDirectory: files.directory });
  assert.equal(result.changed, true);
  assert.deepEqual(db.state.photo.payload, original);
  assert.deepEqual(db.state.recovery.original_payload, original);
  assert.ok(db.state.recovery.restored_at);
  assert.deepEqual(await fs.readFile(files.file), original);
  assert.equal(db.released, 1);
});
