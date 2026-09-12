"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const FILE_NAME = /^[a-f0-9]{40}\.(jpg|jpeg|png|webp)$/i;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_NEW_ORIGINAL_BYTES = 128 * 1024 * 1024;
const MAX_DATABASE_BYTES = 900 * 1024 * 1024;
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function assertBudget({ databaseBytes, newOriginalBytes }) {
  if (![databaseBytes, newOriginalBytes].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error("Invalid database space estimate");
  if (newOriginalBytes > MAX_NEW_ORIGINAL_BYTES) throw new Error("Recovery originals exceed the 128 MiB budget; no more photos changed");
  if (databaseBytes + newOriginalBytes >= MAX_DATABASE_BYTES) throw new Error("Database plus recovery originals would reach the 900 MiB safety limit; no more photos changed");
}

function photoPath(directory, fileName) {
  if (!FILE_NAME.test(fileName)) throw new Error("Invalid photo filename");
  return path.join(path.resolve(directory), fileName);
}

async function replaceCache(directory, fileName, bytes) {
  if (!directory) return;
  const file = photoPath(directory, fileName);
  await fs.mkdir(directory, { recursive: true });
  const temporary = `${file}.compress-${crypto.randomBytes(8).toString("hex")}`;
  let handle;
  try {
    handle = await fs.open(temporary, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close(); handle = null;
    await fs.rename(temporary, file);
  } finally {
    await handle?.close();
    await fs.unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; });
  }
}

async function publishCache(directory, fileName, bytes) {
  try { await replaceCache(directory, fileName, bytes); return ""; }
  catch { return "Database committed; local photo cache needs repair by rerunning this command"; }
}

async function recoveryTableExists(pool) {
  const result = await pool.query("SELECT to_regclass('public.ppr_photo_originals') IS NOT NULL AS exists");
  return Boolean(result.rows[0]?.exists);
}

// Separate from planning: an over-budget run must not even create a table.
async function ensureRecoveryTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS public.ppr_photo_originals (
    file_name text PRIMARY KEY,
    original_payload bytea NOT NULL,
    original_sha256 text NOT NULL CHECK (length(original_sha256)=64),
    optimized_sha256 text NOT NULL CHECK (length(optimized_sha256)=64),
    original_mime_type text NOT NULL,
    original_updated_at timestamptz NOT NULL,
    optimized_updated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    restored_at timestamptz
  )`);
  const relation = await pool.query("SELECT c.relpersistence,c.relkind FROM pg_class c WHERE c.oid=to_regclass('public.ppr_photo_originals')");
  if (relation.rows[0]?.relpersistence !== "p" || relation.rows[0]?.relkind !== "r") {
    throw new Error("Recovery storage must be a permanent WAL-logged table; no photos changed");
  }
}

async function planMigration(pool, { after = "", limit = 20 } = {}) {
  const exists = await recoveryTableExists(pool);
  const result = await pool.query(`SELECT p.file_name,p.mime_type,octet_length(p.payload) AS bytes,
    ${exists ? "(o.file_name IS NOT NULL)" : "false"} AS backup_exists
    FROM ppr_photos p ${exists ? "LEFT JOIN public.ppr_photo_originals o ON o.file_name=p.file_name" : ""}
    WHERE p.file_name>$1 ORDER BY p.file_name LIMIT $2`, [after, limit || null]);
  const size = await pool.query("SELECT pg_database_size(current_database())::text AS database_bytes");
  const candidates = result.rows;
  const newOriginalBytes = candidates.reduce((total, row) => {
    const bytes = Number(row.bytes);
    return total + (!row.backup_exists && FILE_NAME.test(row.file_name)
      && /^(image\/(jpeg|jpg|png|webp))$/i.test(row.mime_type)
      && bytes > 250 * 1024 && bytes <= MAX_INPUT_BYTES ? bytes : 0);
  }, 0);
  return { candidates, databaseBytes: Number(size.rows[0].database_bytes), newOriginalBytes, recoveryTableExists: exists };
}

function verifyRecovery(row) {
  if (!row) return null;
  if (!Buffer.isBuffer(row.original_payload) || row.original_payload.length > MAX_INPUT_BYTES
    || sha256(row.original_payload) !== row.original_sha256
    || !/^[a-f0-9]{64}$/.test(row.optimized_sha256)) throw new Error("Recovery original checksum or size is invalid; photo was not changed");
  return row;
}

async function getRecovery(pool, fileName, lock = false) {
  const result = await pool.query(`SELECT file_name,
    CASE WHEN octet_length(original_payload)<=20971520 THEN original_payload ELSE NULL END AS original_payload,
    original_sha256,optimized_sha256,original_mime_type,original_updated_at,
    optimized_updated_at,created_at,restored_at FROM public.ppr_photo_originals
    WHERE file_name=$1${lock ? " FOR UPDATE" : ""}`, [fileName]);
  return verifyRecovery(result.rows[0]);
}

async function currentPhoto(pool, fileName, lock = false) {
  const result = await pool.query(`SELECT file_name,mime_type,payload,updated_at FROM ppr_photos
    WHERE file_name=$1 AND octet_length(payload)<=20971520${lock ? " FOR UPDATE" : ""}`, [fileName]);
  return result.rows[0] || null;
}

async function transaction(pool, task) {
  const client = await pool.connect();
  let finished = false;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL synchronous_commit = on");
    await client.query("SET LOCAL lock_timeout = '8s'");
    await client.query("SET LOCAL statement_timeout = '20s'");
    const result = await task(client);
    await client.query("COMMIT");
    finished = true;
    return result;
  } catch (error) {
    if (!finished) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

// Use one explicitly supplied PRIMARY Pool, never a failover query wrapper.
async function compressOne({ pool, row, optimize, cacheDirectory, budget = { newOriginalBytes: 0 } }) {
  if (!FILE_NAME.test(row.file_name)) return { changed: false, reason: "unsupported_filename" };
  if (!Buffer.isBuffer(row.payload) || row.payload.length > MAX_INPUT_BYTES) return { changed: false, reason: "invalid_input" };
  const existing = await getRecovery(pool, row.file_name);
  const currentSha = sha256(row.payload);
  if (existing) {
    if (row.mime_type !== existing.original_mime_type) throw new Error("Photo MIME differs from its recovery record");
    if (currentSha !== existing.optimized_sha256 && !(existing.restored_at && currentSha === existing.original_sha256)) {
      return { changed: false, reason: "concurrent_change" };
    }
    const restored = currentSha === existing.original_sha256;
    return {
      changed: false, reason: restored ? "already_restored" : "already_optimized", bytes: row.payload,
      mimeType: row.mime_type, updatedAt: row.updated_at,
      previousSha256: restored ? existing.optimized_sha256 : existing.original_sha256,
      cacheWarning: await publishCache(cacheDirectory, row.file_name, row.payload)
    };
  }
  const optimized = await optimize(row.payload, { fileName: row.file_name, mimeType: row.mime_type });
  if (!optimized.changed) return optimized;
  if (!Buffer.isBuffer(optimized.bytes) || optimized.bytes.length >= row.payload.length) throw new Error("Invalid optimized photo output");
  if (optimized.mimeType !== row.mime_type && !(row.mime_type === "image/jpg" && optimized.mimeType === "image/jpeg")) {
    throw new Error("Refusing to change MIME type behind an existing photo URL");
  }
  const optimizedSha = sha256(optimized.bytes);
  const replaced = await transaction(pool, async client => {
    const current = await currentPhoto(client, row.file_name, true);
    if (!current || current.mime_type !== row.mime_type || sha256(current.payload) !== currentSha) return null;
    if (await getRecovery(client, row.file_name, true)) return null;
    const size = await client.query("SELECT pg_database_size(current_database())::text AS database_bytes");
    assertBudget({ databaseBytes: 0, newOriginalBytes: budget.newOriginalBytes + row.payload.length });
    assertBudget({ databaseBytes: Number(size.rows[0].database_bytes), newOriginalBytes: row.payload.length });
    await client.query(`INSERT INTO public.ppr_photo_originals
      (file_name,original_payload,original_sha256,optimized_sha256,original_mime_type,original_updated_at)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(file_name) DO NOTHING RETURNING file_name`,
    [row.file_name, row.payload, currentSha, optimizedSha, row.mime_type, current.updated_at]);
    const backup = await getRecovery(client, row.file_name, true);
    if (!backup || backup.original_sha256 !== currentSha || backup.optimized_sha256 !== optimizedSha
      || backup.original_mime_type !== row.mime_type) throw new Error("Recovery verification failed; photo was not changed");
    const result = await client.query(`UPDATE ppr_photos SET payload=$2,updated_at=clock_timestamp()
      WHERE file_name=$1 AND payload=$3 AND mime_type=$4 RETURNING updated_at`,
    [row.file_name, optimized.bytes, row.payload, row.mime_type]);
    if (result.rowCount !== 1) throw new Error("Photo changed concurrently; backup and replacement rolled back");
    await client.query("UPDATE public.ppr_photo_originals SET optimized_updated_at=$2 WHERE file_name=$1", [row.file_name, result.rows[0].updated_at]);
    return result.rows[0];
  });
  if (!replaced) return { changed: false, reason: "concurrent_change" };
  budget.newOriginalBytes += row.payload.length;
  return { ...optimized, mimeType: row.mime_type, updatedAt: replaced.updated_at, previousSha256: currentSha,
    cacheWarning: await publishCache(cacheDirectory, row.file_name, optimized.bytes) };
}

async function restoreOne({ pool, fileName, cacheDirectory }) {
  if (!FILE_NAME.test(fileName)) throw new Error("Invalid photo filename");
  const restored = await transaction(pool, async client => {
    const row = await currentPhoto(client, fileName, true);
    const backup = await getRecovery(client, fileName, true);
    if (!row || !backup) throw new Error("Photo or recovery original is missing");
    if (row.mime_type !== backup.original_mime_type) throw new Error("Photo MIME changed; automatic restore refused");
    const currentSha = sha256(row.payload);
    if (backup.restored_at && currentSha === backup.original_sha256) {
      return { changed: false, reason: "already_restored", bytes: backup.original_payload,
        mimeType: backup.original_mime_type, updatedAt: row.updated_at, previousSha256: backup.optimized_sha256 };
    }
    if (currentSha !== backup.optimized_sha256) throw new Error("Photo changed since compression; automatic restore refused");
    const result = await client.query(`UPDATE ppr_photos SET payload=$2,mime_type=$4,updated_at=clock_timestamp()
      WHERE file_name=$1 AND payload=$3 AND mime_type=$4 RETURNING updated_at`,
    [fileName, backup.original_payload, row.payload, backup.original_mime_type]);
    if (result.rowCount !== 1) throw new Error("Photo changed concurrently; restore rolled back");
    await client.query("UPDATE public.ppr_photo_originals SET restored_at=$2 WHERE file_name=$1", [fileName, result.rows[0].updated_at]);
    return { changed: true, bytes: backup.original_payload, originalBytes: backup.original_payload.length,
      mimeType: backup.original_mime_type, updatedAt: result.rows[0].updated_at, previousSha256: backup.optimized_sha256 };
  });
  return { ...restored, cacheWarning: await publishCache(cacheDirectory, fileName, restored.bytes) };
}

async function mirrorPhoto(pool, row, previousSha256, updatedAt) {
  const current = await currentPhoto(pool, row.file_name);
  if (current) {
    if (sha256(current.payload) === sha256(row.payload) && current.mime_type === row.mime_type) return true;
    if (sha256(current.payload) !== previousSha256 || current.mime_type !== row.mime_type) return false;
    const result = await pool.query(`UPDATE ppr_photos SET payload=$2,updated_at=$4
      WHERE file_name=$1 AND payload=$3 AND mime_type=$5 AND updated_at <= $4 RETURNING file_name`,
    [row.file_name, row.payload, current.payload, updatedAt, row.mime_type]);
    return result.rowCount === 1;
  }
  const result = await pool.query(`INSERT INTO ppr_photos(file_name,mime_type,payload,updated_at)
    VALUES($1,$2,$3,$4) ON CONFLICT(file_name) DO NOTHING RETURNING file_name`,
  [row.file_name, row.mime_type, row.payload, updatedAt]);
  return result.rowCount === 1;
}

module.exports = {
  FILE_NAME, MAX_NEW_ORIGINAL_BYTES, MAX_DATABASE_BYTES, sha256, photoPath,
  assertBudget, ensureRecoveryTable, planMigration, getRecovery, currentPhoto,
  replaceCache, mirrorPhoto, compressOne, restoreOne
};
