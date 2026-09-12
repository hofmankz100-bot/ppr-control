"use strict";

// Audit is the default. Recovery originals are durable PRIMARY rows, never
// ephemeral Render files. This reduces live photo payloads, not total storage.
const path = require("node:path");
const { Pool, Client } = require("pg");
const { loadEnvFile } = require("../server/env");
const { configuredDatabases } = require("../multi-postgres");
const {
  FILE_NAME, assertBudget, ensureRecoveryTable, planMigration,
  currentPhoto, mirrorPhoto, compressOne, restoreOne
} = require("../server/legacy-photo-migration");

function parseOptions(args) {
  const options = { apply: false, limit: 20, after: "", restore: "" };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--apply") options.apply = true;
    else if (["--limit", "--after", "--restore"].includes(arg)) {
      const value = args[++i];
      if (value === undefined || !value.trim() || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      if (arg === "--limit") options.limit = Number(value);
      else if (arg === "--after") options.after = value;
      else options.restore = value;
    } else throw new Error("Unknown option; use --apply, --limit, --after or --restore");
  }
  if (!Number.isSafeInteger(options.limit) || options.limit < 0) throw new Error("--limit must be >= 0 (0 means all)");
  if (options.after && !FILE_NAME.test(options.after)) throw new Error("Invalid --after filename");
  if (options.restore && !FILE_NAME.test(options.restore)) throw new Error("Invalid --restore filename");
  if (options.restore && !options.apply) throw new Error("Restore requires --apply");
  return options;
}

function safeError(error) {
  return String(error?.message || error)
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[database URL redacted]")
    .replace(/\b(password|passwd|pwd)\s*[=:]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1=[redacted]");
}

async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  const root = path.resolve(__dirname, "..");
  loadEnvFile(root);
  if (!String(process.env.DATABASE_URL || "").trim()) throw new Error("DATABASE_URL for the authoritative primary is required; automatic failover is forbidden");
  const configured = configuredDatabases(process.env);
  if (configured[0]?.name !== "primary") throw new Error("Authoritative primary database is not configured");
  const cacheDirectory = path.join(process.env.DATA_DIR || path.join(root, "data"), "photos");
  const nodes = configured.map(item => ({ ...item, pool: new Pool({
    connectionString: item.connectionString,
    max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000,
    statement_timeout: 20000, application_name: "ppr-photo-maintenance"
  }) }));
  const primary = nodes[0].pool;
  let lockClient, lockLost = false;
  const summary = { checked: 0, compressed: 0, skipped: 0, repaired: 0, livePhotoBytesSaved: 0,
    newOriginalBytes: 0, mirrorWarnings: 0, cacheWarnings: 0, lastFile: options.after };
  for (const node of nodes) node.pool.on("error", () => {
    if (node.name === "primary") lockLost = true;
  });
  try {
    if (options.apply) {
      // The session lock is separate from the one-connection transaction pool.
      lockClient = new Client({ connectionString: configured[0].connectionString,
        connectionTimeoutMillis: 8000, statement_timeout: 20000 });
      lockClient.on("error", () => { lockLost = true; });
      await lockClient.connect();
      const lock = await lockClient.query("SELECT pg_try_advisory_lock(786, 250) AS locked");
      if (!lock.rows[0].locked) throw new Error("Another photo migration is running");
    }
    const report = await primary.query(`SELECT count(*)::int AS files,
      coalesce(sum(octet_length(payload)),0)::text AS bytes,
      count(*) FILTER(WHERE mime_type LIKE 'image/%' AND octet_length(payload)>256000)::int AS large_images,
      pg_database_size(current_database())::text AS database_bytes FROM ppr_photos`);
    const plan = await planMigration(primary, options.restore ? { limit: 1 } : options);
    console.log(JSON.stringify({ mode: options.apply ? "apply" : "audit", primary: "primary", ...report.rows[0],
      selectedFiles: plan.candidates.length, plannedNewOriginalBytes: options.restore ? 0 : plan.newOriginalBytes,
      recoveryTableExists: plan.recoveryTableExists,
      note: "Recovery originals remain in primary; live photo reduction is not total database disk savings" }));
    if (!options.apply) return;
    if (lockLost) throw new Error("Primary maintenance connection was lost; no photos changed");
    // Budget validation precedes even CREATE TABLE. Unknown actual optimisation
    // savings are conservatively ignored by the read-only preflight estimate.
    if (!options.restore) assertBudget(plan);
    else if (!plan.recoveryTableExists) throw new Error("Recovery table is missing; original cannot be restored");
    if (!options.restore) await ensureRecoveryTable(primary);
    const mirrors = [];
    for (const node of nodes.slice(1)) {
      try { await node.pool.query("SELECT 1"); mirrors.push(node); }
      catch (error) { summary.mirrorWarnings++; console.log(JSON.stringify({ mirror: node.name, warning: safeError(error) })); }
    }
    async function publishMirrors(fileName, result) {
      if (!result.bytes || !result.previousSha256) return;
      for (const node of mirrors) {
        try {
          const copied = await mirrorPhoto(node.pool,
            { file_name: fileName, mime_type: result.mimeType, payload: result.bytes },
            result.previousSha256, result.updatedAt);
          if (!copied) {
            summary.mirrorWarnings++;
            console.log(JSON.stringify({ mirror: node.name, file: fileName, warning: "Different or newer mirror photo preserved; retry after checking" }));
          }
        } catch (error) { summary.mirrorWarnings++; console.log(JSON.stringify({ mirror: node.name, warning: safeError(error) })); }
      }
    }
    if (options.restore) {
      if (lockLost) throw new Error("Primary maintenance connection was lost; restore stopped");
      const restored = await restoreOne({ pool: primary, fileName: options.restore, cacheDirectory });
      if (restored.cacheWarning) summary.cacheWarnings++;
      await publishMirrors(options.restore, restored);
      console.log(JSON.stringify({ restored: options.restore, changed: restored.changed,
        bytes: restored.bytes.length, cacheWarning: restored.cacheWarning || undefined }));
      return;
    }
    const sharp = require("sharp");
    sharp.cache(false);
    sharp.concurrency(1);
    const { optimizeLegacyPhoto } = require("../server/legacy-photo-optimizer");
    const budget = { newOriginalBytes: 0 };
    for (const candidate of plan.candidates) {
      if (lockLost) throw new Error("Primary maintenance connection was lost; no more photos changed");
      const fileName = candidate.file_name;
      summary.lastFile = fileName;
      summary.checked++;
      if (!FILE_NAME.test(fileName) || Number(candidate.bytes) > 20 * 1024 * 1024) { summary.skipped++; continue; }
      const row = await currentPhoto(primary, fileName);
      if (!row) { summary.skipped++; continue; }
      const result = await compressOne({ pool: primary, row, optimize: optimizeLegacyPhoto, cacheDirectory, budget });
      if (result.changed) {
        summary.compressed++;
        summary.livePhotoBytesSaved += result.savedBytes;
      } else {
        summary.skipped++;
        if (["already_optimized", "already_restored"].includes(result.reason)) summary.repaired++;
      }
      summary.newOriginalBytes = budget.newOriginalBytes;
      if (result.cacheWarning) summary.cacheWarnings++;
      await publishMirrors(fileName, result);
      console.log(JSON.stringify({ file: fileName, ...summary,
        reason: result.reason || "compressed", cacheWarning: result.cacheWarning || undefined }));
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  } finally {
    console.log(JSON.stringify({ result: summary }));
    await lockClient?.end().catch(() => {});
    await Promise.allSettled(nodes.map(node => node.pool.end()));
  }
}

if (require.main === module) main().catch(error => { console.error(safeError(error)); process.exitCode = 1; });
module.exports = { main, parseOptions, safeError };
