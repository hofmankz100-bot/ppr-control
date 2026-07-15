const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const QRCode = require("qrcode");
let WebSocketServer = null;
try {
  ({ WebSocketServer } = require("ws"));
} catch {
  WebSocketServer = null;
}

const root = __dirname;

function loadEnvFile() {
  const envFile = path.join(root, ".env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile();

const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
const backupDir = path.join(dataDir, "backups");
const photosDir = path.join(dataDir, "photos");
const actionLogFile = path.join(dataDir, "actions.log");
const port = Number(process.env.PORT || 8080);
const qrPort = Number(process.env.QR_PORT || 8081);
const httpsPort = Number(process.env.HTTPS_PORT || 8443);
let postgresPool = null;
let postgresState = null;
let postgresWriteQueue = Promise.resolve();
let storageStatus = { mode: "json" };

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".mobileconfig": "application/x-apple-aspen-config"
};

function emptyDb() {
  return { checks: {}, requests: {}, inventory: {}, catalog: { equipment: {} }, directorMessages: [], serviceCosts: [], downtimes: [], compressorJournal: {}, gasJournal: {}, pprSheets: {}, journalDueSince: {}, auditHistory: [], operationalResetAt: "", walkShiftCleanupVersion: "", users: [], translationCache: {} };
}

function normalizeDb(db) {
  db ||= emptyDb();
  db.checks ||= {};
  db.requests ||= {};
  db.inventory ||= {};
  db.catalog ||= { equipment: {} };
  db.catalog.equipment ||= {};
  db.directorMessages ||= [];
  db.serviceCosts ||= [];
  db.downtimes ||= [];
  db.compressorJournal ||= {};
  db.gasJournal ||= {};
  db.pprSheets ||= {};
  db.journalDueSince ||= {};
  db.auditHistory ||= [];
  db.operationalResetAt ||= "";
  db.walkShiftCleanupVersion ||= "";
  db.users ||= [];
  db.translationCache ||= {};
  return db;
}

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    const rootDbFile = path.join(root, "db.json");
    if (fs.existsSync(rootDbFile)) {
      fs.copyFileSync(rootDbFile, dbFile);
    } else {
      fs.writeFileSync(dbFile, JSON.stringify(emptyDb(), null, 2));
    }
  }
}

function latestBackupFile() {
  try {
    if (!fs.existsSync(backupDir)) return null;
    return fs.readdirSync(backupDir)
      .filter(name => name.startsWith("db_backup_") && name.endsWith(".json"))
      .sort()
      .map(name => path.join(backupDir, name))
      .pop() || null;
  } catch {
    return null;
  }
}

function readDbFile() {
  ensureDb();
  try {
    return normalizeDb(JSON.parse(fs.readFileSync(dbFile, "utf8")));
  } catch (error) {
    try {
      const brokenFile = `${dbFile}.broken-${Date.now()}`;
      if (fs.existsSync(dbFile)) fs.renameSync(dbFile, brokenFile);
      const backupFile = latestBackupFile();
      if (backupFile) {
        fs.copyFileSync(backupFile, dbFile);
        return normalizeDb(JSON.parse(fs.readFileSync(dbFile, "utf8")));
      }
    } catch {}
    return emptyDb();
  }
}

function readDb() {
  return postgresState || readDbFile();
}

function writeDbFile(db) {
  ensureDb();
  backupDbOncePerDay();
  const tmp = `${dbFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(normalizeDb(db), null, 2));
  fs.renameSync(tmp, dbFile);
}

function photoExtensionFromMime(mime = "") {
  const clean = String(mime || "").toLowerCase();
  if (clean.includes("png")) return "png";
  if (clean.includes("webp")) return "webp";
  return "jpg";
}

function savePhotoDataUrl(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) return "";
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!bytes.length) return "";
  fs.mkdirSync(photosDir, { recursive: true });
  const ext = photoExtensionFromMime(match[1]);
  const hash = crypto.createHash("sha1").update(bytes).digest("hex");
  const fileName = `${hash}.${ext}`;
  const file = path.join(photosDir, fileName);
  if (!fs.existsSync(file)) fs.writeFileSync(file, bytes);
  return `/api/photos/${fileName}`;
}

function externalizePhotosInValue(value, seen = new WeakSet()) {
  let changed = false;
  const walk = item => {
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return item;
    seen.add(item);
    if (Array.isArray(item)) {
      item.forEach((entry, index) => {
        if (typeof entry === "string" && entry.startsWith("data:image/")) {
          const url = savePhotoDataUrl(entry);
          if (url) {
            item[index] = url;
            changed = true;
          }
          return;
        }
        walk(entry);
      });
      return item;
    }
    Object.keys(item).forEach(key => {
      const entry = item[key];
      if (typeof entry === "string" && entry.startsWith("data:image/")) {
        const url = savePhotoDataUrl(entry);
        if (url) {
          item[key] = url;
          changed = true;
        }
        return;
      }
      walk(entry);
    });
    return item;
  };
  walk(value);
  return changed;
}

async function initializeStorage() {
  const connectionString = String(process.env.DATABASE_URL || "").trim();
  if (!connectionString) {
    const db = readDbFile();
    if (migrateLegacyDirectorApprovals(db)) writeDbFile(db);
    storageStatus = { mode: "json" };
    return storageStatus;
  }
  try {
    const { Pool } = require("pg");
    const sslMode = String(process.env.PGSSL || process.env.PGSSLMODE || "").trim().toLowerCase();
    const useSsl = ["1", "true", "require", "verify-ca", "verify-full"].includes(sslMode);
    const pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: Number(process.env.PG_POOL_SIZE || 5)
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ppr_settings (
        setting_key text PRIMARY KEY,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const result = await pool.query(
      "SELECT payload FROM ppr_settings WHERE setting_key = 'full_state' LIMIT 1"
    );
    if (result.rows[0]?.payload) {
      postgresState = normalizeDb(result.rows[0].payload);
      if (migrateLegacyDirectorApprovals(postgresState)) {
        await pool.query(
          `INSERT INTO ppr_settings(setting_key, payload, updated_at)
           VALUES ('full_state', $1::jsonb, now())
           ON CONFLICT(setting_key) DO UPDATE
           SET payload = EXCLUDED.payload, updated_at = now()`,
          [JSON.stringify(postgresState)]
        );
      }
      writeDbFile(postgresState);
    } else {
      postgresState = readDbFile();
      migrateLegacyDirectorApprovals(postgresState);
      await pool.query(
        `INSERT INTO ppr_settings(setting_key, payload, updated_at)
         VALUES ('full_state', $1::jsonb, now())
         ON CONFLICT(setting_key) DO UPDATE
         SET payload = EXCLUDED.payload, updated_at = now()`,
        [JSON.stringify(postgresState)]
      );
    }
    postgresPool = pool;
    storageStatus = { mode: "postgres", table: "ppr_settings", key: "full_state" };
    return storageStatus;
  } catch (error) {
    console.error(`PostgreSQL unavailable, JSON fallback enabled: ${error.message}`);
    if (process.env.REQUIRE_POSTGRES === "true") throw error;
    postgresPool = null;
    postgresState = null;
    storageStatus = { mode: "json-fallback", error: error.message };
    return storageStatus;
  }
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function pruneOldBackups(keep = 14) {
  try {
    if (!fs.existsSync(backupDir)) return;
    const files = fs.readdirSync(backupDir)
      .filter(name => name.startsWith("db_backup_") && name.endsWith(".json"))
      .sort();
    for (const name of files.slice(0, Math.max(0, files.length - keep))) {
      fs.unlinkSync(path.join(backupDir, name));
    }
  } catch {}
}

function backupDbOncePerDay() {
  ensureDb();
  if (!fs.existsSync(dbFile)) return;
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `db_backup_${todayStamp()}.json`);
  if (!fs.existsSync(backupFile)) fs.copyFileSync(dbFile, backupFile);
  pruneOldBackups();
}

function appendActionLog(action) {
  ensureDb();
  const line = JSON.stringify({ at: new Date().toISOString(), ...action }) + "\n";
  fs.appendFileSync(actionLogFile, line);
}



function safeFileName(value) {
  return String(value || "").replace(/[^0-9A-Za-z._-]+/g, "_");
}

function monthKeyFromUrl(url) {
  const raw = String(url.searchParams.get("month") || todayStamp().slice(0, 7));
  return /^\d{4}-\d{2}$/.test(raw) ? raw : todayStamp().slice(0, 7);
}

function itemBelongsToMonth(item, month) {
  const values = [item?.date, item?.createdAt, item?.updatedAt, item?.startedAt, item?.endedAt, item?.registeredAt, item?.repliedAt];
  return values.some(value => String(value || "").startsWith(month));
}

function objectRecordsForMonth(records = {}, month) {
  const out = {};
  for (const [key, value] of Object.entries(records || {})) {
    const text = `${key} ${JSON.stringify(value || {})}`;
    if (text.includes(month)) out[key] = value;
  }
  return out;
}

function monthlyExport(db, month) {
  db = normalizeDb(db);
  const checks = objectRecordsForMonth(db.checks, month);
  const requests = objectRecordsForMonth(db.requests, month);
  const pprSheets = objectRecordsForMonth(db.pprSheets, month);
  const directorMessages = (db.directorMessages || []).filter(item => itemBelongsToMonth(item, month));
  const serviceCosts = (db.serviceCosts || []).filter(item => itemBelongsToMonth(item, month));
  const downtimes = (db.downtimes || []).filter(item => itemBelongsToMonth(item, month));
  return {
    exportedAt: new Date().toISOString(),
    month,
    summary: {
      checks: Object.keys(checks).length,
      requests: Object.keys(requests).length,
      pprSheets: Object.keys(pprSheets).length,
      directorMessages: directorMessages.length,
      serviceCosts: serviceCosts.length,
      downtimes: downtimes.length,
      users: (db.users || []).length
    },
    checks,
    requests,
    pprSheets,
    inventory: db.inventory || {},
    catalog: db.catalog || { equipment: {} },
    directorMessages,
    serviceCosts,
    downtimes,
    users: (db.users || []).map(userPublic)
  };
}

function sendDownload(res, filename, value) {
  const data = JSON.stringify(value, null, 2);
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeFileName(filename)}"`,
    "Cache-Control": "no-store"
  });
  res.end(data);
}


function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[";,\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sendCsvDownload(res, filename, rows) {
  const data = rows.map(row => row.map(csvEscape).join(";")).join("\n");
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeFileName(filename)}"`,
    "Cache-Control": "no-store"
  });
  res.end("\ufeff" + data);
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendExcelDownload(res, filename, rows) {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
    th { background: #14324a; color: #fff; font-weight: 700; }
    th, td { border: 1px solid #8aa0b2; padding: 6px 8px; vertical-align: top; mso-number-format:"\\@"; }
    .section { font-weight: 700; background: #eef4f8; }
  </style>
</head>
<body>
  <table>
    ${rows.map((row, index) => `<tr>${row.map((cell, cellIndex) => {
      const tag = index === 0 ? "th" : "td";
      const cls = cellIndex === 0 && index > 0 ? ` class="section"` : "";
      return `<${tag}${cls}>${htmlEscape(cell)}</${tag}>`;
    }).join("")}</tr>`).join("\n")}
  </table>
</body>
</html>`;
  res.writeHead(200, {
    "Content-Type": "application/vnd.ms-excel; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeFileName(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "no-store"
  });
  res.end("\ufeff" + html);
}

function monthlyCsvRows(db, month) {
  const exported = monthlyExport(db, month);
  const rows = [["Раздел", "Дата", "Цех", "Оборудование", "Узел", "Статус", "Количество", "Кто записал", "Комментарий / описание"]];
  for (const [key, value] of Object.entries(exported.checks || {})) {
    rows.push([
      "Обход / замечание",
      value?.date || key,
      value?.area || "",
      value?.equipment || "",
      value?.node || key,
      value?.resolved ? "Устранено" : value?.comment ? "Открыто" : value?.status || "",
      "",
      value?.commentAuthorName || value?.authorName || "",
      value?.comment || value?.request || JSON.stringify(value || {})
    ]);
  }
  for (const [key, value] of Object.entries(exported.requests || {})) {
    rows.push([
      "Заявка",
      value?.createdAt || value?.date || key,
      value?.area || value?.stockArea || "",
      value?.equipment || value?.title || key,
      value?.node || "",
      value?.status || value?.routeStatus || "",
      value?.qtyReceived || value?.qtyIssued || value?.qty || "",
      value?.authorName || value?.requestAuthorName || "",
      value?.text || value?.comment || value?.description || JSON.stringify(value || {})
    ]);
  }
  for (const [date, sheet] of Object.entries(exported.pprSheets || {})) {
    const sheetRows = (Array.isArray(sheet?.rows) ? sheet.rows : [])
      .filter(row => String(row?.work || "").trim());
    for (const row of sheetRows) {
      rows.push([
        "Лист ППР",
        date,
        row.area || "",
        row.equipment || "Плановое обслуживание",
        row.node || "",
        row.mark === "done" ? "Выполнено" : row.mark === "na" ? "Не требуется" : "Без отметки",
        "",
        row.markedByName || sheet?.updatedByName || "",
        `${row.work || ""}${row.markedAt ? ` · ${row.markedAt}` : ""}${sheet?.approvedByName ? ` · Принял инженер: ${sheet.approvedByName}` : ""}`
      ]);
    }
  }
  for (const item of exported.downtimes || []) {
    rows.push([
      "Простой",
      item?.startedAt || item?.date || "",
      item?.area || "",
      item?.equipment || "",
      item?.node || "",
      item?.type || item?.status || "",
      item?.durationText || item?.durationMs || "",
      item?.authorName || "",
      item?.reason || item?.comment || JSON.stringify(item || {})
    ]);
  }
  for (const item of exported.directorMessages || []) {
    rows.push([
      "Директорская",
      item?.createdAt || item?.date || "",
      item?.department || item?.area || "",
      "",
      "",
      item?.status || "",
      "",
      item?.from || item?.name || "",
      item?.subject ? `${item.subject}. ${item.text || item.message || ""}` : item?.text || item?.message || JSON.stringify(item || {})
    ]);
  }
  return rows;
}

function createManualBackup(label = "manual") {
  ensureDb();
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `db_backup_${safeFileName(label)}_${stamp}.json`);
  fs.copyFileSync(dbFile, backupFile);
  pruneOldBackups(30);
  return backupFile;
}

function writeDb(db, action = {}) {
  const normalized = normalizeDb(db);
  externalizePhotosInValue(normalized);
  if (postgresPool) postgresState = normalized;
  writeDbFile(normalized);
  if (postgresPool) {
    const snapshot = JSON.stringify(normalized);
    postgresWriteQueue = postgresWriteQueue
      .then(() => postgresPool.query(
        `INSERT INTO ppr_settings(setting_key, payload, updated_at)
         VALUES ('full_state', $1::jsonb, now())
         ON CONFLICT(setting_key) DO UPDATE
         SET payload = EXCLUDED.payload, updated_at = now()`,
        [snapshot]
      ))
      .catch(error => console.error(`PostgreSQL write failed; JSON backup preserved: ${error.message}`));
  }
  appendActionLog(action);
}

function migrateLegacyDirectorApprovals(db) {
  let changed = false;
  const now = new Date().toISOString();
  for (const req of Object.values(db.requests || {})) {
    if (!req || typeof req !== "object") continue;
    if (req.deleted || req.route === "stock" || req.sourceRole === "engineer") continue;
    const isTmcRequest = req.kind === "tmc" || String(req.id || "").startsWith("tmc-request:");
    if (!isTmcRequest || req.productionDirectorRequestApproved) continue;
    const alreadyPastDirector = Boolean(
      req.financePreApproved ||
      req.supplyPrepared ||
      req.financeApproved ||
      req.cashApproved ||
      req.transferredToWarehouse ||
      req.warehouseReceived ||
      req.issued ||
      req.done ||
      req.stock
    );
    if (!alreadyPastDirector) continue;
    req.productionDirectorRequestApproved = true;
    req.approvals ||= {};
    req.approvals.productionDirectorRequest ||= {
      role: "productionDirector",
      name: "Перенесено из старой логики",
      at: req.updatedAt || req.createdAt || now,
      note: "Техническая миграция: заявка уже прошла дальше по старому маршруту."
    };
    req.history ||= [];
    if (!req.history.some(entry => String(entry?.action || "").includes("старая логика"))) {
      req.history.push({
        at: now,
        action: "Техническая отметка: директор производства",
        details: "Перенесено из старой логики, заявка уже была на следующем этапе.",
        status: req.status || "",
        role: "system",
        name: "PPR Control"
      });
    }
    req.updatedAt = req.updatedAt || now;
    changed = true;
  }
  return changed;
}

function publicState(db = readDb()) {
  return {
    checks: db.checks,
    requests: db.requests,
    inventory: db.inventory,
    catalog: db.catalog,
    directorMessages: db.directorMessages,
    serviceCosts: db.serviceCosts,
    downtimes: db.downtimes,
    compressorJournal: db.compressorJournal,
    gasJournal: db.gasJournal,
    pprSheets: db.pprSheets,
    journalDueSince: db.journalDueSince,
    auditHistory: db.auditHistory,
    operationalResetAt: db.operationalResetAt || "",
    walkShiftCleanupVersion: db.walkShiftCleanupVersion || ""
  };
}

function hasMeaningfulCheckKindServer(item) {
  if (!item || typeof item !== "object") return false;
  if (Array.isArray(item.tasks) && item.tasks.some(Boolean)) return true;
  if (item.walkShifts && Object.values(item.walkShifts).some(shift => shift?.done)) return true;
  if (item.walkDone || item.resolved || item.mechanicFixed || item.done) return true;
  if (item.shopApproved || item.engineerApproved || item.supplyPrepared || item.financeApproved || item.cashApproved) return true;
  if (item.transferredToWarehouse || item.warehouseReceived || item.issued || item.mechanicInstalled || item.shopInstallApproved || item.productionDirectorApproved || item.accountingWrittenOff) return true;
  if (String(item.lastRequestId || item.requestStatus || item.status || "").trim()) return true;
  if (String(item.nodeDraftText || "").trim()) return true;
  if (String(item.comment || item.request || item.commentPhoto || item.requestPhoto || item.invoicePhoto || "").trim()) return true;
  return Array.isArray(item.commentLog) && item.commentLog.some(entry => String(entry?.text || entry?.photo || "").trim());
}

function compactCheckRecordsServer(checks = {}) {
  const next = {};
  for (const [id, rec] of Object.entries(checks || {})) {
    if (hasMeaningfulCheckKindServer(rec?.to)) next[id] = rec;
  }
  return next;
}

function isJournalRequestRecordServer(id, req = {}) {
  const kind = String(req?.kind || "");
  return kind === "journal-batch" || kind === "to" || String(id || "").includes(":to");
}

function removeJournalRequestsServer(db) {
  let changed = false;
  const now = new Date().toISOString();
  db.requests ||= {};
  db.checks ||= {};
  for (const [id, req] of Object.entries(db.requests)) {
    if (!isJournalRequestRecordServer(id, req)) continue;
    delete db.requests[id];
    changed = true;
  }
  for (const rec of Object.values(db.checks)) {
    const item = rec?.to;
    if (!item || typeof item !== "object") continue;
    const fields = ["request", "requestPhoto", "requestStatus", "requestedTargetRole", "lastRequestId", "invoicePhoto", "noInvoiceApproved"];
    const hasRequestFields = fields.some(field => Boolean(item[field]));
    if (!hasRequestFields) continue;
    fields.forEach(field => { item[field] = ""; });
    item.updatedAt = now;
    changed = true;
  }
  if (changed) db.checks = compactCheckRecordsServer(db.checks);
  return changed;
}

function clearLegacyWalkCompletionsServer(db) {
  let changed = false;
  const now = new Date().toISOString();
  Object.entries(db.checks || {}).forEach(([, rec]) => {
    const item = rec?.to;
    if (!item || typeof item !== "object") return;
    if (!item.walkDone && !item.tasks?.[0]) return;
    if (Array.isArray(item.tasks)) item.tasks[0] = false;
    item.walkDone = false;
    item.updatedAt = now;
    rec.updatedAt = now;
    changed = true;
  });
  if (changed) db.checks = compactCheckRecordsServer(db.checks || {});
  return changed;
}

function sendJson(res, status, value) {
  const data = Buffer.from(JSON.stringify(value));
  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(String(res.req?.headers?.["accept-encoding"] || ""));
  if (acceptsGzip && data.length >= 1024) {
    const compressed = zlib.gzipSync(data, { level: zlib.constants.Z_BEST_SPEED });
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Encoding": "gzip",
      "Content-Length": compressed.length,
      "Vary": "Accept-Encoding"
    });
    res.end(compressed);
    return;
  }
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": data.length,
    "Vary": "Accept-Encoding"
  });
  res.end(data);
}

let publicStateResponseCache = { version: "", data: null, gzip: null };

function sendPublicState(res, db) {
  const version = realtimeStateVersion();
  if (publicStateResponseCache.version !== version || !publicStateResponseCache.data) {
    const data = Buffer.from(JSON.stringify(publicState(db)));
    publicStateResponseCache = {
      version,
      data,
      gzip: data.length >= 1024 ? zlib.gzipSync(data, { level: zlib.constants.Z_BEST_SPEED }) : null
    };
  }
  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(String(res.req?.headers?.["accept-encoding"] || ""));
  const data = acceptsGzip && publicStateResponseCache.gzip
    ? publicStateResponseCache.gzip
    : publicStateResponseCache.data;
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": data.length,
    "Vary": "Accept-Encoding",
    ...(acceptsGzip && publicStateResponseCache.gzip ? { "Content-Encoding": "gzip" } : {})
  });
  res.end(data);
}

const TRANSLATE_LANGS = new Set(["ru", "kk", "uz", "en"]);

function normalizeTranslateText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function shouldTranslateText(value) {
  const text = normalizeTranslateText(value);
  if (text.length < 2 || text.length > 1200) return false;
  if (/^[\d\s.,:;()+\-/%в„–#]+$/.test(text)) return false;
  if (looksLikeMojibake(text)) return false;
  return /[\p{L}]/u.test(text);
}

function looksLikeMojibake(value) {
  const text = String(value || "");
  const fragments = [
    "\u0420\u045f", "\u0420\u0452", "\u0420\u2019", "\u0420\u045c", "\u0420\u040e",
    "\u0420\u2014", "\u0420\u00b0", "\u0420\u00b5", "\u0420\u0451", "\u0420\u0455",
    "\u0420\u0491", "\u0420\u00b6", "\u0420\u00bb", "\u0420\u0458", "\u0420\u0405",
    "\u0420\u0457", "\u0421\u0452", "\u0421\u0403", "\u0421\u201a", "\u0421\u2021",
    "\u0421\u2030", "\u0421\u2020", "\u0421\u040a", "\u0421\u2039", "\u0421\u040f",
    "\u00d0", "\u00d1"
  ];
  return fragments.some(fragment => text.includes(fragment));
}

function translationCacheKey(target, text) {
  return `${target}::${crypto.createHash("sha1").update(text).digest("hex")}`;
}

async function translateExternal(text, target) {
  if (!shouldTranslateText(text) || !TRANSLATE_LANGS.has(target)) return text;
  if (target === "ru" && /^[\u0400-\u04FF0-9\s.,:;!?()"В«В»в„–%/+_-]+$/.test(text)) return text;
  const endpoint = process.env.TRANSLATE_API_URL || "https://translate.googleapis.com/translate_a/single";
  const url = endpoint.includes("translate_a/single")
    ? `${endpoint}?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`
    : `${endpoint}?sl=auto&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.TRANSLATE_TIMEOUT_MS || 7000));
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "PPR-Control/1.0" },
      signal: controller.signal
    });
    if (!response.ok) return text;
    const data = await response.json();
    if (Array.isArray(data)) {
      const translated = (data[0] || []).map(part => part?.[0] || "").join("").trim();
      return translated || text;
    }
    return String(data?.translatedText || data?.translation || text).trim() || text;
  } catch {
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function translateTexts(texts, target) {
  const lang = TRANSLATE_LANGS.has(target) ? target : "ru";
  const db = readDb();
  db.translationCache ||= {};
  const result = {};
  let changed = false;
  const unique = [...new Set((Array.isArray(texts) ? texts : []).map(normalizeTranslateText).filter(shouldTranslateText))].slice(0, 250);
  const missing = [];
  for (const text of unique) {
    const cacheKey = translationCacheKey(lang, text);
    const cached = db.translationCache[cacheKey];
    if (cached && (looksLikeMojibake(cached.text) || looksLikeMojibake(cached.translated))) {
      delete db.translationCache[cacheKey];
      changed = true;
    }
    if (!db.translationCache[cacheKey]) missing.push({ text, cacheKey });
  }
  for (let i = 0; i < missing.length; i += 8) {
    const batch = missing.slice(i, i + 8);
    const translatedBatch = await Promise.all(batch.map(item => translateExternal(item.text, lang)));
    batch.forEach((item, index) => {
      const translated = translatedBatch[index] || item.text;
      if (!looksLikeMojibake(item.text) && !looksLikeMojibake(translated)) {
        db.translationCache[item.cacheKey] = {
          target: lang,
          text: item.text,
          translated,
          updatedAt: new Date().toISOString()
        };
        changed = true;
      }
    });
  }
  for (const text of unique) {
    const cacheKey = translationCacheKey(lang, text);
    result[text] = db.translationCache[cacheKey]?.translated || text;
  }
  if (changed) writeDb(db, { action: "translate_cache", target: lang, count: unique.length });
  return result;
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function userPublic(user = {}) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password, stored) {
  const [salt, expectedHex] = String(stored || "").split(":");
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function findUser(db, identifier) {
  const normalized = normalizeIdentifier(identifier);
  return (db.users || []).find(user =>
    [user.employeeId, user.phone].some(value => normalizeIdentifier(value) === normalized)
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 25_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Bad JSON")); }
    });
    req.on("error", reject);
  });
}

function decodeHtmlEntities(text = "") {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function httpGetText(targetUrl, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const request = https.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 PPR-Control price lookup",
        "Accept-Language": "ru,en;q=0.8"
      }
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        resolve(httpGetText(new URL(response.headers.location, targetUrl).toString(), timeoutMs));
        return;
      }
      let data = "";
      response.setEncoding("utf8");
      response.on("data", chunk => {
        data += chunk;
        if (data.length > 700000) request.destroy();
      });
      response.on("end", () => resolve(data));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("timeout")));
    request.on("error", reject);
  });
}

function clearPriceLookupQuery(name = "") {
  const cleanName = String(name || "").trim();
  const words = cleanName.split(/\s+/).filter(word => word.length >= 3);
  const generic = /^(bolt|nut|washer|profile|cable|oil|pipe|belt|pump|sensor|bearing|болт|гайка|шайба|профиль|кабель|масло|труба|лента|насос|датчик|подшипник)$/i.test(cleanName);
  if (words.length >= 2 && cleanName.length >= 8 && !generic) return cleanName;
  return "";
}

function extractPriceCandidates(text = "") {
  const clean = decodeHtmlEntities(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const patterns = [
    /(\d[\d\s.,]{1,15})\s*(?:₸|тг\.?|тенге|kzt|KZT)\b/gi,
    /(?:₸|тг\.?|тенге|kzt|KZT)\s*(\d[\d\s.,]{1,15})/gi,
    /"price"\s*:\s*"?(\d[\d\s.,]{1,15})"?\s*,\s*"priceCurrency"\s*:\s*"?KZT"?/gi,
    /"priceCurrency"\s*:\s*"?KZT"?\s*,\s*"price"\s*:\s*"?(\d[\d\s.,]{1,15})"?/gi
  ];
  const values = [];
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(clean))) {
      const value = Number(String(match[1] || "").replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(value) && value >= 10 && value <= 100000000) values.push(value);
    }
  });
  return values;
}

async function lookupInternetPrice(name = "") {
  const queryBase = clearPriceLookupQuery(name);
  if (!queryBase) return { ok: false, reason: "unclear_query" };
  const query = `${queryBase} цена купить Казахстан тенге`;
  const searchUrls = [
    `https://yandex.kz/search/?text=${encodeURIComponent(query)}`,
    `https://satu.kz/search?search_term=${encodeURIComponent(queryBase)}`,
    `https://kaspi.kz/shop/search/?text=${encodeURIComponent(queryBase)}`,
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  ];
  const candidates = [];
  const errors = [];
  let answered = false;
  for (const url of searchUrls) {
    try {
      const html = await httpGetText(url);
      answered = true;
      candidates.push(...extractPriceCandidates(html));
      if (candidates.length >= 3) break;
    } catch (error) {
      errors.push(error.message || "lookup_failed");
    }
  }
  if (!candidates.length && errors.length && !answered) return { ok: false, reason: "lookup_error" };
  if (!candidates.length) return { ok: false, reason: "price_not_found" };
  candidates.sort((a, b) => a - b);
  const median = candidates[Math.floor(candidates.length / 2)];
  const closeCount = candidates.filter(value => Math.abs(value - median) / Math.max(median, 1) <= 0.45).length;
  if (closeCount < 1) return { ok: false, reason: "low_confidence" };
  return {
    ok: true,
    price: Math.round(median),
    currency: "KZT",
    source: "internet",
    query,
    confidence: closeCount >= 2 ? "medium" : "low"
  };
}
function mergeObjectRecords(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  for (const [id, value] of Object.entries(incoming || {})) {
    if (id.includes("\uFFFD")) continue;
    next[id] = sanitizeIncomingValue(next[id], value);
  }
  return next;
}

function sanitizeIncomingValue(current, incoming) {
  if (typeof incoming === "string") {
    if (!incoming.includes("\uFFFD")) return incoming;
    return typeof current === "string" && !current.includes("\uFFFD") ? current : "";
  }
  if (Array.isArray(incoming)) {
    const currentArray = Array.isArray(current) ? current : [];
    return incoming.map((value, index) => sanitizeIncomingValue(currentArray[index], value));
  }
  if (incoming && typeof incoming === "object") {
    const currentObject = current && typeof current === "object" && !Array.isArray(current) ? current : {};
    const next = {};
    for (const [key, value] of Object.entries(incoming)) {
      if (key.includes("\uFFFD")) continue;
      next[key] = sanitizeIncomingValue(currentObject[key], value);
    }
    return next;
  }
  return incoming;
}

function isIncomingNewerRecord(current, incoming) {
  const recordTime = record => {
    if (!record || typeof record !== "object") return NaN;
    const times = [Date.parse(record?.updatedAt || record?.createdAt || record?.commentUpdatedAt || record?.resolvedAt || "")];
    const commentTimes = Array.isArray(record?.commentLog)
      ? record.commentLog.map(entry => Date.parse(entry?.at || "")).filter(Number.isFinite)
      : [];
    times.push(...commentTimes);
    times.push(...Object.values(record)
      .map(value => Date.parse(value?.updatedAt || value?.createdAt || value?.commentUpdatedAt || value?.resolvedAt || ""))
      .filter(Number.isFinite));
    const finiteTimes = times.filter(Number.isFinite);
    return finiteTimes.length ? Math.max(...finiteTimes) : NaN;
  };
  const currentTime = recordTime(current);
  const incomingTime = recordTime(incoming);
  if (Number.isFinite(currentTime) || Number.isFinite(incomingTime)) {
    return (Number.isFinite(incomingTime) ? incomingTime : 0) >= (Number.isFinite(currentTime) ? currentTime : 0);
  }
  return true;
}

function protectPaidRequestProgress(current = {}, incoming = {}) {
  if (!current?.cashApproved) return incoming;
  const next = { ...incoming };
  const recoveringPaidRejection = Boolean(
    (current.rejected && incoming.rejected === false)
    || (
      current.done
      && incoming.done === false
      && current.status === "waitingWarehouse"
      && incoming.status === "waitingWarehouse"
    )
  );
  if (!current.rejected && next.rejected) {
    next.rejected = false;
    next.rejectionReason = "";
    next.done = Boolean(current.done);
  }
  const irreversibleFlags = [
    "cashApproved",
    "transferredToWarehouse",
    "warehouseReceived",
    "issued",
    "mechanicInstalled",
    "shopInstallApproved",
    "productionDirectorApproved",
    "accountingWrittenOff",
    "done",
    "stock"
  ];
  irreversibleFlags.forEach(field => {
    if (recoveringPaidRejection && field === "done") return;
    if (current[field] === true) next[field] = true;
  });
  const stageRank = {
    shop: 1,
    engineer: 2,
    supply: 3,
    finance: 4,
    cash: 5,
    cashApproved: 6,
    waitingWarehouse: 7,
    warehouse: 8,
    issued: 9,
    waitingShopDone: 10,
    productionDirector: 11,
    accounting: 12,
    done: 13,
    stock: 13,
    rejected: 0
  };
  const currentStatus = String(current.status || current.requestStatus || "cashApproved");
  const incomingStatus = String(next.status || next.requestStatus || "");
  if ((stageRank[incomingStatus] || 0) < (stageRank[currentStatus] || 6)) {
    next.status = currentStatus;
    next.requestStatus = current.requestStatus || currentStatus;
  }
  if (["shop", "engineer", "supply", "finance", "cash"].includes(String(next.returnedTo || ""))) {
    next.returnedTo = "";
    next.returnReason = "";
  }
  return next;
}

function mergeObjectRecordsByFreshness(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  for (const [id, value] of Object.entries(incoming || {})) {
    if (id.includes("\uFFFD")) continue;
    const cleanValue = protectPaidRequestProgress(next[id], sanitizeIncomingValue(next[id], value));
    if (isIncomingNewerRecord(next[id], cleanValue)) next[id] = cleanValue;
  }
  return next;
}

function mergeCommentLogs(current = [], incoming = []) {
  const map = new Map();
  for (const entry of [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!entry || typeof entry !== "object") continue;
    const key = [entry.at, entry.type, entry.role, entry.name, entry.text, entry.photo].map(value => String(value || "")).join("\u0001");
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
}

function mergeCheckRecord(current = {}, incoming = {}) {
  const cleanIncoming = sanitizeIncomingValue(current, incoming);
  const incomingWins = isIncomingNewerRecord(current, cleanIncoming);
  const next = incomingWins ? { ...cleanIncoming } : { ...current };
  const currentTo = current?.to && typeof current.to === "object" ? current.to : {};
  const incomingTo = cleanIncoming?.to && typeof cleanIncoming.to === "object" ? cleanIncoming.to : {};
  const baseTo = incomingWins ? incomingTo : currentTo;
  next.to = {
    ...baseTo,
    commentLog: mergeCommentLogs(currentTo.commentLog, incomingTo.commentLog)
  };
  const timestamps = [current.updatedAt, cleanIncoming.updatedAt, currentTo.updatedAt, incomingTo.updatedAt]
    .filter(Boolean)
    .sort();
  if (timestamps.length) next.updatedAt = timestamps.at(-1);
  return next;
}

function mergeCheckRecordsByFreshness(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  for (const [id, value] of Object.entries(incoming || {})) {
    if (id.includes("\uFFFD") || !value || typeof value !== "object") continue;
    next[id] = mergeCheckRecord(next[id] || {}, value);
  }
  return next;
}

function inventoryCanonicalKey(item = {}) {
  const area = String(item.area || "Общий склад");
  const article = String(item.article || "").trim().toLowerCase();
  if (article) return `${area}::article::${article}`;
  return `${area}::name::${String(item.name || "").trim().toLowerCase()}`;
}

function canonicalizeInventoryRecords(records = {}) {
  const next = {};
  const sourceWasCanonical = new Map();
  for (const [sourceId, rawItem] of Object.entries(records || {})) {
    if (!rawItem || typeof rawItem !== "object" || sourceId.includes("\uFFFD")) continue;
    const id = inventoryCanonicalKey(rawItem);
    const isCanonical = sourceId === id;
    if (next[id] && (sourceWasCanonical.get(id) || !isCanonical)) continue;
    next[id] = { ...rawItem, id };
    sourceWasCanonical.set(id, isCanonical);
  }
  return next;
}

function mergeInventoryRecordsByFreshness(current = {}, incoming = {}) {
  const next = canonicalizeInventoryRecords(current);
  const cleanIncoming = canonicalizeInventoryRecords(incoming);
  for (const [id, value] of Object.entries(cleanIncoming)) {
    const existing = next[id];
    if (!existing) {
      next[id] = sanitizeIncomingValue({}, value);
      continue;
    }
    const currentTime = Date.parse(existing.updatedAt || existing.createdAt || "");
    const incomingTime = Date.parse(value.updatedAt || value.createdAt || "");
    if (Number.isFinite(incomingTime) && (!Number.isFinite(currentTime) || incomingTime > currentTime)) {
      next[id] = sanitizeIncomingValue(existing, value);
    }
  }
  return next;
}

function hasMeaningfulCheckKind(item) {
  if (!item || typeof item !== "object") return false;
  if (Array.isArray(item.tasks) && item.tasks.some(Boolean)) return true;
  if (item.walkShifts && Object.values(item.walkShifts).some(shift => shift?.done)) return true;
  if (item.walkDone || item.resolved || item.mechanicFixed || item.done) return true;
  if (item.shopApproved || item.engineerApproved || item.supplyPrepared || item.financeApproved || item.cashApproved) return true;
  if (item.transferredToWarehouse || item.warehouseReceived || item.issued || item.mechanicInstalled || item.shopInstallApproved || item.productionDirectorApproved || item.accountingWrittenOff) return true;
  if (String(item.lastRequestId || item.requestStatus || item.status || "").trim()) return true;
  if (String(item.comment || item.request || item.commentPhoto || item.requestPhoto || item.invoicePhoto || "").trim()) return true;
  return Array.isArray(item.commentLog) && item.commentLog.some(entry => String(entry?.text || entry?.photo || "").trim());
}

function compactCheckRecords(checks = {}) {
  const next = {};
  for (const [id, rec] of Object.entries(checks || {})) {
    if (hasMeaningfulCheckKind(rec?.to)) next[id] = rec;
  }
  return next;
}

function mergeArrayById(current = [], incoming = []) {
  const map = new Map();
  for (const item of Array.isArray(current) ? current : []) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (!item || !item.id) continue;
    if (String(item.id).includes("\uFFFD")) continue;
    const currentItem = map.get(item.id) || {};
    map.set(item.id, { ...currentItem, ...sanitizeIncomingValue(currentItem, item) });
  }
  return Array.from(map.values()).sort((a, b) => String(b.updatedAt || b.createdAt || b.startedAt || b.registeredAt || '').localeCompare(String(a.updatedAt || a.createdAt || a.startedAt || a.registeredAt || '')));
}

function mergeUsers(current = [], incoming = []) {
  const map = new Map();
  for (const user of Array.isArray(current) ? current : []) {
    const key = String(user.phone || user.clientId || user.name || Math.random());
    map.set(key, user);
  }
  for (const user of Array.isArray(incoming) ? incoming : []) {
    const key = String(user.phone || user.clientId || user.name || Math.random());
    if (key.includes("\uFFFD")) continue;
    const currentUser = map.get(key) || {};
    map.set(key, { ...currentUser, ...sanitizeIncomingValue(currentUser, user) });
  }
  return Array.from(map.values());
}

let stateWriteQueue = Promise.resolve();
function enqueueStateWrite(task) {
  const next = stateWriteQueue.then(task, task);
  stateWriteQueue = next.catch(() => {});
  return next;
}

let wss = null;
const wsServers = [];
const sseClients = new Set();
const realtimeInstanceId = crypto.randomBytes(8).toString("hex");
let realtimeStateCounter = 0;

function realtimeStateVersion() {
  return `${realtimeInstanceId}:${realtimeStateCounter}`;
}

function sendSse(res, payload) {
  try {
    res.write(typeof payload === "string" ? payload : `data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    sseClients.delete(res);
  }
}

function broadcastState(origin = "server", actionId = "", state = publicState(), partial = false) {
  realtimeStateCounter += 1;
  const payload = { type: "state", origin, actionId, stateVersion: realtimeStateVersion(), partial, state };
  if (wss) {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(message);
    }
  }
  const sseMessage = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    sendSse(client, sseMessage);
  }
  return payload.stateVersion;
}

function changedRecordPatch(before = {}, after = {}) {
  const patch = {};
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    if (!(key in (after || {}))) continue;
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) patch[key] = after[key];
  }
  return patch;
}

function changedStatePatch(before = {}, after = {}) {
  const patch = {};
  for (const key of ["checks", "requests", "inventory", "compressorJournal", "gasJournal", "pprSheets", "journalDueSince"]) {
    const records = changedRecordPatch(before?.[key], after?.[key]);
    if (Object.keys(records).length) patch[key] = records;
  }
  const equipment = changedRecordPatch(before?.catalog?.equipment, after?.catalog?.equipment);
  if (Object.keys(equipment).length) patch.catalog = { equipment };
  for (const key of ["directorMessages", "serviceCosts", "downtimes", "auditHistory"]) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) patch[key] = after?.[key] || [];
  }
  for (const key of ["operationalResetAt", "walkShiftCleanupVersion"]) {
    if (String(before?.[key] || "") !== String(after?.[key] || "")) patch[key] = after?.[key] || "";
  }
  return patch;
}

async function handleApi(req, res, pathname, url) {
  if (pathname === "/api/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write(": connected\n\n");
    sseClients.add(res);
    sendSse(res, { type: "ready", origin: "server", stateVersion: realtimeStateVersion() });
    req.on("close", () => sseClients.delete(res));
    return true;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      time: new Date().toISOString(),
      storage: storageStatus,
      realtime: Boolean(wss) || sseClients.size > 0,
      stateVersion: realtimeStateVersion(),
      websocket: Boolean(wss),
      websocketClients: wss ? wss.clients.size : 0,
      eventClients: sseClients.size
    });
    return true;
  }

  if (pathname === "/api/qr" && req.method === "GET") {
    const data = String(url.searchParams.get("data") || "").trim();
    const size = Math.min(Math.max(Number(url.searchParams.get("size") || 240), 120), 640);
    if (!data || data.length > 300) {
      sendJson(res, 400, { ok: false, error: "QR data is empty or too long." });
      return true;
    }
    const svg = await QRCode.toString(data, {
      type: "svg",
      margin: 2,
      width: size,
      errorCorrectionLevel: "M"
    });
    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(svg);
    return true;
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    const body = await readBody(req);
    const name = String(body.name || "").trim();
    const employeeId = String(body.employeeId || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const language = ["ru", "kk"].includes(String(body.language || "")) ? String(body.language) : "ru";
    if (name.length < 3 || employeeId.length < 2 || phone.length < 5 || password.length < 6) {
      sendJson(res, 400, { ok: false, error: "Заполните ФИО, табельный номер, телефон и пароль не короче 6 символов." });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const duplicate = (db.users || []).find(user =>
        normalizeIdentifier(user.employeeId) === normalizeIdentifier(employeeId) ||
        normalizeIdentifier(user.phone) === normalizeIdentifier(phone)
      );
      if (duplicate) return { duplicate: true };
      const user = {
        id: `user:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`,
        name,
        employeeId,
        phone,
        passwordHash: hashPassword(password),
        role: "",
        area: "",
        language,
        approved: false,
        pendingApproval: true,
        status: "pending",
        registeredAt: new Date().toISOString()
      };
      db.users.push(user);
      writeDb(db, { action: "user_register_pending", user: { name, employeeId, phone } });
      return { user: userPublic(user) };
    });
    if (result.duplicate) {
      sendJson(res, 409, { ok: false, error: "Такой табельный номер или телефон уже зарегистрирован." });
      return true;
    }
    sendJson(res, 200, { ok: true, user: result.user });
    broadcastState("auth-register", "", {}, true);
    return true;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    const db = readDb();
    const user = findUser(db, body.identifier);
    const bootstrapPassword = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || "");
    const legacyAdminLogin = Boolean(
      bootstrapPassword &&
      user &&
      !user.passwordHash &&
      ["editor", "director"].includes(user.role) &&
      String(body.password) === bootstrapPassword
    );
    if (user && !user.passwordHash && !["editor", "director"].includes(user.role)) {
      sendJson(res, 428, { ok: false, error: "Админ должен сначала задать вам новый пароль." });
      return true;
    }
    if (!user || (!legacyAdminLogin && !passwordMatches(body.password, user.passwordHash))) {
      sendJson(res, 401, { ok: false, error: "Неверный табельный номер, телефон или пароль." });
      return true;
    }
    if (user.approved === false || user.pendingApproval === true || !user.role) {
      sendJson(res, 403, { ok: false, error: "Регистрация ещё не подтверждена админом.", pending: true });
      return true;
    }
    if (legacyAdminLogin) {
      user.passwordHash = hashPassword(body.password);
    }
    user.lastLoginAt = new Date().toISOString();
    writeDb(db, { action: legacyAdminLogin ? "legacy_admin_password_created" : "user_login", user: { name: user.name, phone: user.phone } });
    sendJson(res, 200, { ok: true, user: userPublic(user) });
    return true;
  }

  if (pathname === "/api/export/month" && req.method === "GET") {
    const month = monthKeyFromUrl(url);
    await stateWriteQueue.catch(() => {});
    createManualBackup(`export_${month}`);
    sendDownload(res, `ppr_export_${month}.json`, monthlyExport(readDb(), month));
    return true;
  }

  if (pathname === "/api/export/month.csv" && req.method === "GET") {
    const month = monthKeyFromUrl(url);
    await stateWriteQueue.catch(() => {});
    createManualBackup(`export_csv_${month}`);
    sendCsvDownload(res, `ppr_export_${month}.csv`, monthlyCsvRows(readDb(), month));
    return true;
  }

  if (pathname === "/api/export/month.xls" && req.method === "GET") {
    const month = monthKeyFromUrl(url);
    await stateWriteQueue.catch(() => {});
    createManualBackup(`export_excel_${month}`);
    sendExcelDownload(res, `PPR_otchet_${month}.xls`, monthlyCsvRows(readDb(), month));
    return true;
  }

  if (pathname === "/api/export/all" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    createManualBackup("export_all");
    const db = readDb();
    sendDownload(res, `ppr_full_export_${todayStamp()}.json`, {
      exportedAt: new Date().toISOString(),
      ...db,
      users: (db.users || []).map(userPublic)
    });
    return true;
  }

  if (pathname === "/api/backup/manual" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    await stateWriteQueue.catch(() => {});
    const file = createManualBackup(body?.label || "manual");
    appendActionLog({ action: "manual_backup", file: path.basename(file), clientId: String(body?.clientId || "") });
    sendJson(res, 200, { ok: true, file: path.basename(file) });
    return true;
  }

  if (pathname === "/api/state" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    const db = readDb();
    if (externalizePhotosInValue(db)) writeDb(db, { action: "externalize_photos_get" });
    sendPublicState(res, db);
    return true;
  }

  if (pathname === "/api/photos" && req.method === "POST") {
    const body = await readBody(req);
    const url = savePhotoDataUrl(body?.data || "");
    if (!url) {
      sendJson(res, 400, { ok: false, error: "Bad photo" });
      return true;
    }
    sendJson(res, 200, { ok: true, url });
    return true;
  }

  if (pathname.startsWith("/api/photos/") && req.method === "GET") {
    const fileName = path.basename(decodeURIComponent(pathname.slice("/api/photos/".length)));
    if (!/^[a-f0-9]{40}\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
      res.writeHead(404);
      res.end("Not found");
      return true;
    }
    const file = path.join(photosDir, fileName);
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": contentTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable"
      });
      res.end(data);
    });
    return true;
  }

  if (pathname === "/api/translate" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    const target = String(body.target || "ru").trim();
    const texts = Array.isArray(body.texts) ? body.texts : [];
    const translations = await translateTexts(texts, target);
    sendJson(res, 200, { ok: true, target: TRANSLATE_LANGS.has(target) ? target : "ru", translations });
    return true;
  }

  if (pathname === "/api/price-lookup" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    try {
      const result = await lookupInternetPrice(body.name || "");
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 200, { ok: false, reason: "lookup_error" });
    }
    return true;
  }

  if (pathname === "/api/state" && req.method === "PUT") {
    const body = await readBody(req);
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const beforeState = JSON.stringify(publicState(db));
      const authenticatedRole = String(body.user?.authenticatedRole || body.user?.role || "");
      db.catalog ||= { equipment: {} };
      db.catalog.equipment ||= {};
      const mergedCatalog = mergeObjectRecords(db.catalog.equipment, body.catalog?.equipment);
      const catalogChanged = JSON.stringify(mergedCatalog) !== JSON.stringify(db.catalog.equipment);
      if ((body.clearRecordedData === true || catalogChanged) && authenticatedRole !== "editor") {
        return { actionId: String(body.actionId || ""), origin: body.clientId || "api", error: "admin_required" };
      }
      if (body.clearRecordedData === true) {
        if (String(body.clearConfirm || "").trim().toUpperCase() !== "ОЧИСТИТЬ") {
          return { actionId: String(body.actionId || ""), origin: body.clientId || "api", error: "clear_requires_confirmation" };
        }
        db.checks = {};
        db.requests = {};
        db.inventory = {};
        db.directorMessages = [];
        db.serviceCosts = [];
        db.downtimes = [];
        db.compressorJournal = {};
        db.gasJournal = {};
        db.pprSheets = {};
        db.journalDueSince = {};
        db.auditHistory = [];
        db.operationalResetAt = new Date().toISOString();
      }
      const acceptOperational = body.clearRecordedData === true
        || !db.operationalResetAt
        || String(body.operationalResetAt || "") === String(db.operationalResetAt);
      if (acceptOperational && body.walkShiftCleanupVersion) clearLegacyWalkCompletionsServer(db);
      if (acceptOperational) {
        db.checks = compactCheckRecords(mergeCheckRecordsByFreshness(db.checks, body.checks));
        if (body.walkShiftCleanupVersion) db.checks = compactCheckRecordsServer(db.checks);
        db.requests = mergeObjectRecordsByFreshness(db.requests, body.requests);
        removeJournalRequestsServer(db);
      }
      db.inventory = mergeInventoryRecordsByFreshness(db.inventory, body.inventory);
      db.catalog.equipment = mergedCatalog;
      if (acceptOperational) {
        db.directorMessages = mergeArrayById(db.directorMessages, body.directorMessages);
        db.serviceCosts = mergeArrayById(db.serviceCosts, body.serviceCosts);
        db.downtimes = mergeArrayById(db.downtimes, body.downtimes);
        db.compressorJournal = mergeObjectRecordsByFreshness(db.compressorJournal, body.compressorJournal);
        db.gasJournal = mergeObjectRecordsByFreshness(db.gasJournal, body.gasJournal);
        db.pprSheets = mergeObjectRecordsByFreshness(db.pprSheets, body.pprSheets);
        db.journalDueSince = { ...(db.journalDueSince || {}), ...(body.journalDueSince || {}) };
        db.auditHistory = mergeArrayById(db.auditHistory, body.auditHistory);
      }
      db.operationalResetAt = db.operationalResetAt || String(body.operationalResetAt || "");
      db.walkShiftCleanupVersion = body.walkShiftCleanupVersion || db.walkShiftCleanupVersion || "";
      migrateLegacyDirectorApprovals(db);
      const actionId = String(body.actionId || "");
      const afterState = publicState(db);
      const changed = beforeState !== JSON.stringify(afterState);
      if (changed) writeDb(db, { action: "state_put_merge", actionId, clientId: String(body.clientId || ""), user: body.user || null });
      return { actionId, changed, patch: changedStatePatch(JSON.parse(beforeState), afterState), fullState: afterState, origin: body.clientId || "api", cleared: body.clearRecordedData === true };
    });
    if (result.error) {
      sendJson(res, result.error === "admin_required" ? 403 : 400, { ok: false, error: result.error, actionId: result.actionId });
      return true;
    }
    const stateVersion = result.changed
      ? broadcastState(result.origin, result.actionId, result.cleared ? result.fullState : result.patch, !result.cleared)
      : realtimeStateVersion();
    sendJson(res, 200, { ok: true, actionId: result.actionId, stateVersion });
    return true;
  }

  if (pathname === "/api/ppr-sheet/action" && req.method === "POST") {
    const body = await readBody(req);
    const date = String(body.date || "").trim();
    const action = String(body.action || "").trim();
    const rowId = String(body.rowId || "").trim();
    const role = String(body.user?.role || "").trim();
    const name = String(body.user?.name || "").trim();
    const allowedPlan = new Set(["engineer", "editor"]);
    const allowedMark = new Set(["mechanic", "electrician", "editor"]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["mark", "add-row", "approve"].includes(action) || !name) {
      sendJson(res, 400, { ok: false, error: "ppr_action_invalid" });
      return true;
    }
    if ((action === "mark" && !allowedMark.has(role)) || (action !== "mark" && !allowedPlan.has(role))) {
      sendJson(res, 403, { ok: false, error: "ppr_action_forbidden" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.pprSheets ||= {};
      const sheet = db.pprSheets[date];
      if (!sheet) return { error: "ppr_sheet_not_found" };
      if (sheet.approvedAt) return { error: "ppr_sheet_locked" };
      sheet.rows = Array.isArray(sheet.rows) ? sheet.rows : [];
      const now = new Date().toISOString();
      if (action === "mark") {
        const row = sheet.rows.find(item => String(item?.id || "") === rowId);
        const mark = String(body.mark || "");
        if (!row || !String(row.work || "").trim() || !["", "done", "na"].includes(mark)) return { error: "ppr_row_invalid" };
        row.mark = mark;
        row.markedByName = mark ? name : "";
        row.markedByRole = mark ? role : "";
        row.markedAt = mark ? now : "";
        row.equipmentId = String(body.equipmentId || row.equipmentId || "").slice(0, 80);
        row.equipment = String(body.equipment || row.equipment || "").slice(0, 300);
        row.node = String(body.node || row.node || "").slice(0, 300);
        row.area = String(body.area || row.area || "").slice(0, 300);
      } else if (action === "add-row") {
        sheet.rows.push({ id: rowId || `${date}-work-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`, work: "", mark: "" });
      } else if (action === "approve") {
        const activeRows = sheet.rows.filter(row => String(row?.work || "").trim());
        if (!activeRows.length || !activeRows.every(row => ["done", "na"].includes(row.mark))) return { error: "ppr_sheet_not_ready" };
        sheet.approvedAt = now;
        sheet.approvedByName = name;
        sheet.approvedByRole = role;
        sheet.lockedAt = now;
      }
      sheet.updatedAt = now;
      sheet.updatedByName = name;
      const actionId = String(body.actionId || "");
      writeDb(db, { action: `ppr_sheet_${action}`, actionId, clientId: String(body.clientId || ""), user: body.user || null, date, rowId });
      return { actionId, origin: body.clientId || "api", patch: { pprSheets: { [date]: sheet } } };
    });
    if (result.error) {
      const status = result.error === "ppr_sheet_locked" ? 409 : result.error === "ppr_sheet_not_found" ? 404 : 400;
      sendJson(res, status, { ok: false, error: result.error });
      return true;
    }
    const stateVersion = broadcastState(result.origin, result.actionId, result.patch, true);
    sendJson(res, 200, { ok: true, actionId: result.actionId, stateVersion, state: result.patch });
    return true;
  }

  if (pathname === "/api/warehouse/issue" && req.method === "POST") {
    const body = await readBody(req);
    if (!new Set(["warehouse", "editor"]).has(String(body.user?.role || ""))) {
      sendJson(res, 403, { ok: false, error: "warehouse_role_required" });
      return true;
    }
    const inventoryId = String(body.inventoryId || "").trim();
    const quantity = Number(body.quantity || 0);
    const targetRole = String(body.targetRole || "").trim();
    const targetName = String(body.targetName || "").trim();
    const targetPhone = String(body.targetPhone || "").trim();
    const existingRequestId = String(body.requestId || "").trim();
    const allowedRoles = new Set(["mechanic", "electrician", "operator", "shop", "engineer"]);
    if (!inventoryId || !Number.isFinite(quantity) || quantity <= 0 || (!existingRequestId && (!allowedRoles.has(targetRole) || !targetName))) {
      sendJson(res, 400, { ok: false, error: "warehouse_issue_invalid" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.inventory = canonicalizeInventoryRecords(db.inventory);
      db.requests ||= {};
      const item = db.inventory[inventoryId];
      const existingRequest = existingRequestId ? db.requests[existingRequestId] : null;
      const effectiveTargetRole = String(existingRequest?.issueTargetRole || targetRole || "").trim();
      const effectiveTargetName = String(existingRequest?.issueTargetName || targetName || "").trim();
      const effectiveTargetPhone = String(existingRequest?.issueTargetPhone || targetPhone || "").trim();
      const available = Number(item?.qty || 0);
      if (!item) return { error: "warehouse_item_not_found", available: 0 };
      if (existingRequestId && !existingRequest) return { error: "warehouse_request_not_found", available };
      if (!allowedRoles.has(effectiveTargetRole) || !effectiveTargetName) return { error: "warehouse_issue_invalid", available };
      if (existingRequest && (existingRequest.issued || existingRequest.done || !existingRequest.warehouseAsk)) return { error: "warehouse_request_already_processed", available };
      if (available < quantity) return { error: "warehouse_insufficient_stock", available };
      const now = new Date().toISOString();
      const unitPrice = Number(body.unitPrice || 0);
      if (Number.isFinite(unitPrice) && unitPrice > 0) {
        item.unitPrice = unitPrice;
        item.price = String(body.priceText || unitPrice);
        item.lastPrice = item.price;
        item.priceUpdatedAt = now;
        item.priceUpdatedBy = String(body.user?.name || "");
      }
      item.qty = available - quantity;
      item.issuedQty = Number(item.issuedQty || 0) + quantity;
      item.lastIssuedAt = now;
      item.updatedAt = now;
      if (item.qty <= 0) item.archivedAt = now;
      const requestId = existingRequestId || `stock-issue:${Date.now()}:${crypto.randomBytes(5).toString("hex")}`;
      const issuedRequest = existingRequest || {
        id: requestId,
        equipmentId: "",
        nodeIndex: "",
        date: now.slice(0, 10),
        kind: "stock",
        equipment: `Склад: ${item.area || "Общий склад"}`,
        area: item.area || "Общий склад",
        node: item.source || "Ручная выдача со склада",
        comment: "Выдано из складского остатка",
        text: item.name || "",
        article: item.article || "",
        items: [{ number: 1, name: item.name || "", article: item.article || "", stockRemainder: "", unit: item.unit || "шт", requestedQty: quantity, requiredQty: quantity, note: item.note || "" }],
        status: "issued",
        shopApproved: true,
        engineerApproved: true,
        supplyPrepared: true,
        financeApproved: true,
        cashApproved: true,
        transferredToWarehouse: true,
        warehouseReceived: true,
        issued: true,
        issueTargetRole: effectiveTargetRole,
        issueTargetName: effectiveTargetName,
        issueTargetPhone: effectiveTargetPhone,
        installComment: "",
        aggregateRemarkKey: "",
        mechanicInstalled: false,
        shopInstallApproved: false,
        productionDirectorApproved: false,
        accountingWrittenOff: false,
        done: false,
        stock: false,
        qtyReceived: quantity,
        qtyIssued: quantity,
        aggregateInstalledQty: 0,
        stockArea: item.area || "Общий склад",
        inventoryAddedQty: 0,
        approvals: { warehouse: { at: now, role: "warehouse", name: String(body.user?.name || ""), action: "Выдано складовщиком" } },
        createdAt: now,
        updatedAt: now
      };
      if (existingRequest) {
        Object.assign(issuedRequest, {
          warehouseReceived: true,
          warehouseReceivedAt: issuedRequest.warehouseReceivedAt || now,
          issued: true,
          warehouseAsk: false,
          qtyIssued: quantity,
          qtyAccepted: quantity,
          status: "issued",
          done: false,
          stock: false,
          updatedAt: now
        });
        issuedRequest.approvals ||= {};
        issuedRequest.approvals.warehouse = { at: now, role: "warehouse", name: String(body.user?.name || ""), action: "Выдано складовщиком по запросу" };
      }
      db.requests[requestId] = issuedRequest;
      const actionId = String(body.actionId || "");
      writeDb(db, { action: "warehouse_atomic_issue", actionId, clientId: String(body.clientId || ""), user: body.user || null, inventoryId, requestId, quantity, targetRole: effectiveTargetRole, targetName: effectiveTargetName });
      return {
        actionId,
        origin: body.clientId || "api",
        patch: { inventory: { [inventoryId]: item }, requests: { [requestId]: db.requests[requestId] } },
        requestId,
        available: item.qty
      };
    });
    if (result.error) {
      const status = ["warehouse_insufficient_stock", "warehouse_request_already_processed"].includes(result.error)
        ? 409
        : result.error === "warehouse_issue_invalid" ? 400 : 404;
      sendJson(res, status, { ok: false, error: result.error, available: result.available });
      return true;
    }
    const stateVersion = broadcastState(result.origin, result.actionId, result.patch, true);
    sendJson(res, 200, { ok: true, actionId: result.actionId, stateVersion, state: result.patch, requestId: result.requestId, available: result.available });
    return true;
  }

  if (pathname === "/api/node-update" && req.method === "PUT") {
    const body = await readBody(req);
    const recordKey = String(body.key || "").trim();
    if (!recordKey || recordKey.includes("\uFFFD") || !body.record || typeof body.record !== "object") {
      sendJson(res, 400, { ok: false, error: "Bad node update" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const before = JSON.stringify({ record: db.checks?.[recordKey] || null, downtimes: db.downtimes || [] });
      db.checks ||= {};
      db.checks = compactCheckRecords(mergeCheckRecordsByFreshness(db.checks, { [recordKey]: body.record }));
      db.downtimes = mergeArrayById(db.downtimes, body.downtimes);
      const patch = {
        checks: db.checks[recordKey] ? { [recordKey]: db.checks[recordKey] } : {},
        downtimes: db.downtimes || []
      };
      const changed = before !== JSON.stringify({ record: db.checks?.[recordKey] || null, downtimes: db.downtimes || [] });
      const actionId = String(body.actionId || "");
      if (changed) {
        writeDb(db, {
          action: "node_update",
          actionId,
          clientId: String(body.clientId || ""),
          user: body.user || null,
          recordKey
        });
      }
      return { actionId, changed, origin: body.clientId || "api", patch };
    });
    const stateVersion = result.changed
      ? broadcastState(result.origin, result.actionId, result.patch, true)
      : realtimeStateVersion();
    sendJson(res, 200, {
      ok: true,
      actionId: result.actionId,
      changed: result.changed,
      stateVersion,
      state: result.patch
    });
    return true;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    const user = await readBody(req);
    if (String(user.actor?.role || "") !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const phone = String(user.phone || "").trim();
      const name = String(user.name || "").trim();
      const actionId = String(user.actionId || "");
      const employeeId = String(user.employeeId || "").trim();
      const sameUserForUpdate = item =>
        (user.id && item.id === user.id) ||
        (employeeId && item.employeeId === employeeId) ||
        (phone && item.phone === phone);
      const sameUserById = item => Boolean(user.id && item.id === user.id);
      const existing = (db.users || []).find(sameUserForUpdate);
      if (user.action === "delete") {
        if (!user.id) return { actionId, origin: user.clientId || "user", error: "delete_requires_id" };
        const beforeCount = (db.users || []).length;
        db.users = (db.users || []).filter(item => !sameUserById(item));
        if (db.users.length === beforeCount) return { actionId, origin: user.clientId || "user", error: "user_not_found" };
        writeDb(db, { action: "user_delete", actionId, clientId: String(user.clientId || ""), user: { id: user.id, name, phone } });
        return { actionId, origin: user.clientId || "user" };
      }
      db.users = (db.users || []).filter(item => !sameUserForUpdate(item));
      const {
        passwordHash: ignoredPasswordHash,
        newPassword: ignoredNewPassword,
        actor: ignoredActor,
        action: ignoredAction,
        actionId: ignoredActionId,
        clientId: ignoredClientId,
        ...safeUser
      } = user;
      if (existing?.role === "editor" && safeUser.role && safeUser.role !== "editor") {
        safeUser.role = "editor";
      }
      const nextUser = {
        ...(existing || {}),
        ...safeUser,
        phone,
        employeeId: employeeId || existing?.employeeId || "",
        registeredAt: existing?.registeredAt || user.registeredAt || new Date().toISOString()
      };
      if (user.newPassword) nextUser.passwordHash = hashPassword(user.newPassword);
      delete nextUser.newPassword;
      db.users.push(nextUser);
      writeDb(db, { action: "user_register", actionId, clientId: String(user.clientId || ""), user: { name: user.name || "", role: user.role || "", phone: phone || "" } });
      return { actionId, origin: user.clientId || "user" };
    });
    if (result.error) {
      sendJson(res, result.error === "user_not_found" ? 404 : 400, { ok: false, error: result.error, actionId: result.actionId });
      return true;
    }
    sendJson(res, 200, { ok: true, actionId: result.actionId });
    broadcastState(result.origin, result.actionId, {}, true);
    return true;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    sendJson(res, 200, (readDb().users || []).map(userPublic));
    return true;
  }

  return false;
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(root, cleanPath);
  const relative = path.relative(root, file);
  const isInsideRoot = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  const isDataFile = relative.split(path.sep).includes("data");
  if (!isInsideRoot || isDataFile) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname, url)) return;
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

const qrServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname, url)) return;
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

function createHttpsServer() {
  const pfxFile = process.env.HTTPS_PFX_FILE || "";
  const certFile = process.env.HTTPS_CERT_FILE || "";
  const keyFile = process.env.HTTPS_KEY_FILE || "";
  try {
    let options = null;
    if (pfxFile && fs.existsSync(path.resolve(root, pfxFile))) {
      options = {
        pfx: fs.readFileSync(path.resolve(root, pfxFile)),
        passphrase: process.env.HTTPS_PFX_PASS || ""
      };
    } else if (certFile && keyFile && fs.existsSync(path.resolve(root, certFile)) && fs.existsSync(path.resolve(root, keyFile))) {
      options = {
        cert: fs.readFileSync(path.resolve(root, certFile)),
        key: fs.readFileSync(path.resolve(root, keyFile))
      };
    }
    if (!options) return null;
    return https.createServer(options, async (req, res) => {
      try {
        const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
        if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname, url)) return;
        serveStatic(req, res, url.pathname);
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message });
      }
    });
  } catch (error) {
    console.warn(`HTTPS disabled: ${error.message}`);
    return null;
  }
}

const httpsServer = createHttpsServer();

if (WebSocketServer) {
  wss = new WebSocketServer({
    server,
    path: "/ws",
    perMessageDeflate: { threshold: 1024 }
  });
  wsServers.push(wss);
  wss.on("connection", ws => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.send(JSON.stringify({ type: "ready", origin: "server", stateVersion: realtimeStateVersion() }));
    ws.on("message", raw => {
      try {
        const msg = JSON.parse(String(raw || "{}"));
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {}
    });
  });
  const qrWss = new WebSocketServer({
    server: qrServer,
    path: "/ws",
    perMessageDeflate: { threshold: 1024 }
  });
  wsServers.push(qrWss);
  qrWss.on("connection", ws => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.send(JSON.stringify({ type: "ready", origin: "server", stateVersion: realtimeStateVersion() }));
    ws.on("message", raw => {
      try {
        const msg = JSON.parse(String(raw || "{}"));
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {}
    });
  });
  if (httpsServer) {
    const httpsWss = new WebSocketServer({
      server: httpsServer,
      path: "/ws",
      perMessageDeflate: { threshold: 1024 }
    });
    wsServers.push(httpsWss);
    httpsWss.on("connection", ws => {
      ws.isAlive = true;
      ws.on("pong", () => { ws.isAlive = true; });
      ws.send(JSON.stringify({ type: "ready", origin: "server", stateVersion: realtimeStateVersion() }));
      ws.on("message", raw => {
        try {
          const msg = JSON.parse(String(raw || "{}"));
          if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
        } catch {}
      });
    });
  }
}

const heartbeatTimer = setInterval(() => {
  for (const wsServer of wsServers) {
    for (const ws of wsServer.clients) {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch {}
        continue;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    }
  }
  for (const client of sseClients) {
    sendSse(client, { type: "ping", time: new Date().toISOString() });
  }
}, 15000);

async function shutdown() {
  clearInterval(heartbeatTimer);
  try {
    await postgresWriteQueue;
    if (postgresPool) await postgresPool.end();
  } catch {}
  server.close(() => process.exit(0));
  qrServer.close(() => {});
  if (httpsServer) httpsServer.close(() => {});
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

initializeStorage()
  .then(storage => {
    server.listen(port, "0.0.0.0", () => {
      ensureDb();
      console.log(`PPR Control realtime server: http://0.0.0.0:${port} [${storage.mode}]`);
    });
    qrServer.listen(qrPort, "0.0.0.0", () => {
      console.log(`PPR Control QR clean server: http://0.0.0.0:${qrPort} [${storage.mode}]`);
    });
    if (httpsServer) {
      httpsServer.listen(httpsPort, "0.0.0.0", () => {
        console.log(`PPR Control HTTPS server: https://0.0.0.0:${httpsPort} [${storage.mode}]`);
      });
    }
  })
  .catch(error => {
    console.error(`Server startup failed: ${error.stack || error.message}`);
    process.exit(1);
  });



