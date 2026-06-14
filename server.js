const http = require("http");
const fs = require("fs");
const path = require("path");
let WebSocketServer = null;
try {
  ({ WebSocketServer } = require("ws"));
} catch {
  WebSocketServer = null;
}

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
const backupDir = path.join(dataDir, "backups");
const actionLogFile = path.join(dataDir, "actions.log");
const port = Number(process.env.PORT || 8080);

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
  ensureDb();
  backupDbOncePerDay();
  const tmp = `${dbFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(normalizeDb(db), null, 2));
  fs.renameSync(tmp, dbFile);
  appendActionLog(action);
}

function publicState(db = readDb()) {
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

function isIncomingNewerRecord(current, incoming) {
  const recordTime = record => {
    const direct = Date.parse(record?.updatedAt || record?.createdAt || record?.commentUpdatedAt || record?.resolvedAt || "");
    if (Number.isFinite(direct)) return direct;
    if (!record || typeof record !== "object") return NaN;
    return Math.max(
      ...Object.values(record)
        .map(value => Date.parse(value?.updatedAt || value?.createdAt || value?.commentUpdatedAt || value?.resolvedAt || ""))
        .filter(Number.isFinite),
      NaN
    );
  };
  const currentTime = recordTime(current);
  const incomingTime = recordTime(incoming);
  if (Number.isFinite(currentTime) || Number.isFinite(incomingTime)) {
    return (Number.isFinite(incomingTime) ? incomingTime : 0) >= (Number.isFinite(currentTime) ? currentTime : 0);
  }
  return true;
}

function mergeObjectRecordsByFreshness(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  for (const [id, value] of Object.entries(incoming || {})) {
    if (isIncomingNewerRecord(next[id], value)) next[id] = value;
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
const sseClients = new Set();

function sendSse(res, payload) {
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    sseClients.delete(res);
  }
}

function broadcastState(origin = "server", actionId = "") {
  const payload = { type: "state", origin, actionId, state: publicState() };
  if (wss) {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(message);
    }
  }
  for (const client of sseClients) {
    sendSse(client, payload);
  }
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
    sendSse(res, { type: "state", origin: "server", state: publicState() });
    req.on("close", () => sseClients.delete(res));
    return true;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      time: new Date().toISOString(),
      realtime: Boolean(wss) || sseClients.size > 0,
      websocket: Boolean(wss),
      websocketClients: wss ? wss.clients.size : 0,
      eventClients: sseClients.size
    });
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
    sendDownload(res, `ppr_full_export_${todayStamp()}.json`, { exportedAt: new Date().toISOString(), ...readDb() });
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
    sendJson(res, 200, publicState());
    return true;
  }

  if (pathname === "/api/state" && req.method === "PUT") {
    const body = await readBody(req);
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      if (body.clearRecordedData === true) {
        db.checks = {};
        db.requests = {};
        db.inventory = {};
        db.directorMessages = [];
        db.downtimes = [];
      }
      db.checks = mergeObjectRecordsByFreshness(db.checks, body.checks);
      db.requests = mergeObjectRecordsByFreshness(db.requests, body.requests);
      db.inventory = mergeObjectRecords(db.inventory, body.inventory);
      db.catalog = db.catalog || { equipment: {} };
      db.catalog.equipment = mergeObjectRecords(db.catalog.equipment, body.catalog?.equipment);
      db.directorMessages = mergeArrayById(db.directorMessages, body.directorMessages);
      db.downtimes = mergeArrayById(db.downtimes, body.downtimes);
      const actionId = String(body.actionId || "");
      writeDb(db, { action: "state_put_merge", actionId, clientId: String(body.clientId || ""), user: body.user || null });
      return { actionId, state: publicState(db), origin: body.clientId || "api" };
    });
    sendJson(res, 200, { ok: true, actionId: result.actionId, state: result.state });
    broadcastState(result.origin, result.actionId);
    return true;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    const user = await readBody(req);
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const phone = String(user.phone || "").trim();
      db.users = (db.users || []).filter(item => !phone || item.phone !== phone);
      db.users.push({ ...user, phone, registeredAt: new Date().toISOString() });
      const actionId = String(user.actionId || "");
      writeDb(db, { action: "user_register", actionId, clientId: String(user.clientId || ""), user: { name: user.name || "", role: user.role || "", phone: phone || "" } });
      return { actionId, origin: user.clientId || "user" };
    });
    sendJson(res, 200, { ok: true, actionId: result.actionId });
    broadcastState(result.origin, result.actionId);
    return true;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    sendJson(res, 200, readDb().users || []);
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
  if (wss) {
    for (const ws of wss.clients) {
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

function shutdown() {
  clearInterval(heartbeatTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(port, "0.0.0.0", () => {
  ensureDb();
  console.log(`PPR Control realtime server: http://0.0.0.0:${port}`);
});
