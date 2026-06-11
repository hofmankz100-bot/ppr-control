const http = require("http");
const fs = require("fs");
const path = require("path");
let WebSocketServer = null;
try {
  ({ WebSocketServer } = require("ws"));
} catch {
  WebSocketServer = null;
}
let Pool = null;
try {
  ({ Pool } = require("pg"));
} catch {
  Pool = null;
}

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
const backupDir = path.join(dataDir, "backups");
const actionLogFile = path.join(dataDir, "actions.log");
const port = Number(process.env.PORT || 8080);
const databaseUrl = process.env.DATABASE_URL || "";
const usePostgres = Boolean(databaseUrl && Pool);
let pgPool = null;
let currentDb = null;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function emptyDb() {
  return { checks: {}, requests: {}, inventory: {}, catalog: { equipment: {} }, directorMessages: [], downtimes: [], users: [] };
}

function normalizeDb(db) {
  db ||= emptyDb();
  db.checks ||= {};
  db.requests ||= {};
  db.inventory ||= {};
  db.catalog ||= { equipment: {} };
  db.catalog.equipment ||= {};
  db.directorMessages ||= [];
  db.downtimes ||= [];
  db.users ||= [];
  return db;
}

function cloneDb(db) {
  return normalizeDb(JSON.parse(JSON.stringify(normalizeDb(db || currentDb || emptyDb()))));
}

function getDbSnapshot() {
  if (!currentDb) currentDb = readDb();
  return cloneDb(currentDb);
}

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(emptyDb(), null, 2));
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

function readDb() {
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
  const directorMessages = (db.directorMessages || []).filter(item => itemBelongsToMonth(item, month));
  const downtimes = (db.downtimes || []).filter(item => itemBelongsToMonth(item, month));
  return {
    exportedAt: new Date().toISOString(),
    month,
    summary: {
      checks: Object.keys(checks).length,
      requests: Object.keys(requests).length,
      directorMessages: directorMessages.length,
      downtimes: downtimes.length,
      users: (db.users || []).length
    },
    checks,
    requests,
    inventory: db.inventory || {},
    catalog: db.catalog || { equipment: {} },
    directorMessages,
    downtimes,
    users: db.users || []
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

function monthlyCsvRows(db, month) {
  const exported = monthlyExport(db, month);
  const rows = [["Раздел", "Дата", "Оборудование/номер", "Статус", "Описание"]];
  for (const [key, value] of Object.entries(exported.checks || {})) {
    rows.push(["Чек-лист", value?.date || key, value?.equipment || value?.node || key, value?.status || "", JSON.stringify(value || {})]);
  }
  for (const [key, value] of Object.entries(exported.requests || {})) {
    rows.push(["Заявка", value?.createdAt || value?.date || key, value?.title || value?.equipment || key, value?.status || value?.routeStatus || "", value?.comment || value?.description || JSON.stringify(value || {})]);
  }
  for (const item of exported.downtimes || []) {
    rows.push(["Простой", item?.startedAt || item?.date || "", item?.equipment || item?.area || "", item?.status || "", item?.reason || item?.comment || JSON.stringify(item || {})]);
  }
  for (const item of exported.directorMessages || []) {
    rows.push(["Директорская", item?.createdAt || item?.date || "", item?.from || item?.name || "", item?.status || "", item?.text || item?.message || JSON.stringify(item || {})]);
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
  ensureDb();
  backupDbOncePerDay();
  const tmp = `${dbFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(normalizeDb(db), null, 2));
  fs.renameSync(tmp, dbFile);
  appendActionLog(action);
}

async function initStorage() {
  currentDb = readDb();
  if (!usePostgres) return;
  pgPool = new Pool({ connectionString: databaseUrl, ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false } });
  await pgPool.query(`CREATE TABLE IF NOT EXISTS ppr_state (id INTEGER PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pgPool.query(`CREATE TABLE IF NOT EXISTS ppr_backups (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const existing = await pgPool.query("SELECT data FROM ppr_state WHERE id = 1");
  if (existing.rows.length) {
    currentDb = normalizeDb(existing.rows[0].data);
  } else {
    await pgPool.query("INSERT INTO ppr_state (id, data) VALUES (1, $1::jsonb)", [JSON.stringify(currentDb)]);
  }
}

async function persistDb(db, action = {}) {
  currentDb = cloneDb(db);
  if (usePostgres && pgPool) {
    await pgPool.query("UPDATE ppr_state SET data = $1::jsonb, updated_at = now() WHERE id = 1", [JSON.stringify(currentDb)]);
    try { appendActionLog(action); } catch {}
    return;
  }
  writeDb(currentDb, action);
}

async function createManualBackupSafe(label = "manual") {
  const db = getDbSnapshot();
  if (usePostgres && pgPool) {
    await pgPool.query("INSERT INTO ppr_backups (label, data) VALUES ($1, $2::jsonb)", [safeFileName(label), JSON.stringify(db)]);
    await pgPool.query(`DELETE FROM ppr_backups WHERE id NOT IN (SELECT id FROM ppr_backups ORDER BY created_at DESC LIMIT 30)`);
    return `postgres_backup_${safeFileName(label)}`;
  }
  return createManualBackup(label);
}

function publicState(db = getDbSnapshot()) {
  return {
    checks: db.checks,
    requests: db.requests,
    inventory: db.inventory,
    catalog: db.catalog,
    directorMessages: db.directorMessages,
    downtimes: db.downtimes
  };
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
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

function mergeObjectRecords(current = {}, incoming = {}) {
  return { ...(current || {}), ...(incoming || {}) };
}

function mergeArrayById(current = [], incoming = []) {
  const map = new Map();
  for (const item of Array.isArray(current) ? current : []) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (!item || !item.id) continue;
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
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
    map.set(key, { ...(map.get(key) || {}), ...user });
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

function broadcastState(origin = "server", actionId = "") {
  if (!wss) return;
  const message = JSON.stringify({ type: "state", origin, actionId, state: publicState() });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

async function handleApi(req, res, pathname, url) {
  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, time: new Date().toISOString(), realtime: Boolean(wss), clients: wss ? wss.clients.size : 0, storage: usePostgres ? "postgresql" : "db.json" });
    return true;
  }

  if (pathname === "/api/export/month" && req.method === "GET") {
    const month = monthKeyFromUrl(url);
    await stateWriteQueue.catch(() => {});
    await createManualBackupSafe(`export_${month}`);
    sendDownload(res, `ppr_export_${month}.json`, monthlyExport(getDbSnapshot(), month));
    return true;
  }

  if (pathname === "/api/export/month.csv" && req.method === "GET") {
    const month = monthKeyFromUrl(url);
    await stateWriteQueue.catch(() => {});
    await createManualBackupSafe(`export_csv_${month}`);
    sendCsvDownload(res, `ppr_export_${month}.csv`, monthlyCsvRows(getDbSnapshot(), month));
    return true;
  }

  if (pathname === "/api/export/all" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    await createManualBackupSafe("export_all");
    sendDownload(res, `ppr_full_export_${todayStamp()}.json`, { exportedAt: new Date().toISOString(), storage: usePostgres ? "postgresql" : "db.json", ...getDbSnapshot() });
    return true;
  }

  if (pathname === "/api/backup/manual" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    await stateWriteQueue.catch(() => {});
    const file = await createManualBackupSafe(body?.label || "manual");
    appendActionLog({ action: "manual_backup", file: path.basename(String(file)), clientId: String(body?.clientId || "") });
    sendJson(res, 200, { ok: true, file: path.basename(String(file)), storage: usePostgres ? "postgresql" : "db.json" });
    return true;
  }

  if (pathname === "/api/state" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    sendJson(res, 200, publicState(getDbSnapshot()));
    return true;
  }

  if (pathname === "/api/state" && req.method === "PUT") {
    const body = await readBody(req);
    const result = await enqueueStateWrite(async () => {
      const db = getDbSnapshot();
      if (body.clearRecordedData === true) {
        db.checks = {};
        db.requests = {};
        db.inventory = {};
        db.directorMessages = [];
        db.downtimes = [];
      }
      db.checks = mergeObjectRecords(db.checks, body.checks);
      db.requests = mergeObjectRecords(db.requests, body.requests);
      db.inventory = mergeObjectRecords(db.inventory, body.inventory);
      db.catalog = db.catalog || { equipment: {} };
      db.catalog.equipment = mergeObjectRecords(db.catalog.equipment, body.catalog?.equipment);
      db.directorMessages = mergeArrayById(db.directorMessages, body.directorMessages);
      db.downtimes = mergeArrayById(db.downtimes, body.downtimes);
      const actionId = String(body.actionId || "");
      await persistDb(db, { action: "state_put_merge", actionId, clientId: String(body.clientId || ""), user: body.user || null });
      return { actionId, state: publicState(db), origin: body.clientId || "api" };
    });
    sendJson(res, 200, { ok: true, actionId: result.actionId, state: result.state });
    broadcastState(result.origin, result.actionId);
    return true;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    const user = await readBody(req);
    const result = await enqueueStateWrite(async () => {
      const db = getDbSnapshot();
      const phone = String(user.phone || "").trim();
      db.users = (db.users || []).filter(item => !phone || item.phone !== phone);
      db.users.push({ ...user, phone, registeredAt: new Date().toISOString() });
      const actionId = String(user.actionId || "");
      await persistDb(db, { action: "user_register", actionId, clientId: String(user.clientId || ""), user: { name: user.name || "", role: user.role || "", phone: phone || "" } });
      return { actionId, origin: user.clientId || "user" };
    });
    sendJson(res, 200, { ok: true, actionId: result.actionId });
    broadcastState(result.origin, result.actionId);
    return true;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    sendJson(res, 200, getDbSnapshot().users || []);
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

if (WebSocketServer) {
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", ws => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.send(JSON.stringify({ type: "state", origin: "server", state: publicState() }));
    ws.on("message", raw => {
      try {
        const msg = JSON.parse(String(raw || "{}"));
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {}
    });
  });
}

const heartbeatTimer = setInterval(() => {
  if (!wss) return;
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch {}
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
}, 30000);

function shutdown() {
  clearInterval(heartbeatTimer);
  if (pgPool) pgPool.end().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

initStorage().then(() => {
  server.listen(port, "0.0.0.0", () => {
    console.log(`PPR Control realtime server: http://0.0.0.0:${port}`);
    console.log(`Storage: ${usePostgres ? "PostgreSQL" : "db.json"}`);
  });
}).catch(error => {
  console.error("Storage init failed:", error);
  process.exit(1);
});
