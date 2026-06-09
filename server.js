const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
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
  return { checks: {}, requests: {}, inventory: {}, catalog: {}, directorMessages: [], downtimes: [], users: [] };
}

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(emptyDb(), null, 2));
  }
}

function normalizeDb(db) {
  db ||= emptyDb();
  db.checks ||= {};
  db.requests ||= {};
  db.inventory ||= {};
  db.catalog ||= {};
  db.directorMessages ||= [];
  db.downtimes ||= [];
  db.users ||= [];
  return db;
}

function readDb() {
  ensureDb();
  try {
    return normalizeDb(JSON.parse(fs.readFileSync(dbFile, "utf8")));
  } catch {
    return emptyDb();
  }
}

function writeDb(db) {
  ensureDb();
  const tmpFile = `${dbFile}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(normalizeDb(db), null, 2));
  fs.renameSync(tmpFile, dbFile);
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 10_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

function entryKey(entry) {
  return [entry?.text || "", entry?.photo || "", entry?.role || "", entry?.name || ""].join("|#|");
}

function currentCommentEntry(item) {
  if (!item || !String(item.comment || "").trim()) return null;
  return {
    text: item.comment,
    photo: item.commentPhoto || "",
    role: item.commentOwnerRole || "",
    name: item.commentOwnerName || "",
    at: item.commentUpdatedAt || ""
  };
}

function sameCommentAuthor(a, b) {
  return String(a?.commentOwnerRole || "") === String(b?.commentOwnerRole || "")
    && String(a?.commentOwnerName || "") === String(b?.commentOwnerName || "");
}

function mergeCommentFields(saved = {}, incoming = {}) {
  const savedCurrent = currentCommentEntry(saved);
  const incomingCurrent = currentCommentEntry(incoming);
  const log = [];
  const push = entry => {
    if (!entry || !String(entry.text || "").trim()) return;
    if (!log.some(item => entryKey(item) === entryKey(entry))) log.push(entry);
  };

  (Array.isArray(saved.commentLog) ? saved.commentLog : []).forEach(push);
  (Array.isArray(incoming.commentLog) ? incoming.commentLog : []).forEach(push);

  let current = incomingCurrent || savedCurrent;
  if (savedCurrent && incomingCurrent) {
    if (sameCommentAuthor(saved, incoming)) {
      current = incomingCurrent;
    } else {
      push(savedCurrent);
      current = incomingCurrent;
    }
  }

  const next = { ...saved, ...incoming };
  next.commentLog = log;
  next.comment = current?.text || "";
  next.commentPhoto = current?.photo || "";
  next.commentOwnerRole = current?.role || "";
  next.commentOwnerName = current?.name || "";
  next.commentUpdatedAt = current?.at || incoming.commentUpdatedAt || saved.commentUpdatedAt || "";
  return next;
}

function mergeChecks(savedChecks = {}, incomingChecks = {}) {
  const result = { ...(savedChecks || {}) };
  for (const [checkKey, incomingRecord] of Object.entries(incomingChecks || {})) {
    const savedRecord = result[checkKey] || {};
    const mergedRecord = { ...savedRecord, ...incomingRecord };
    for (const kind of new Set([...Object.keys(savedRecord || {}), ...Object.keys(incomingRecord || {})])) {
      if (typeof (savedRecord || {})[kind] === "object" || typeof (incomingRecord || {})[kind] === "object") {
        mergedRecord[kind] = mergeCommentFields((savedRecord || {})[kind] || {}, (incomingRecord || {})[kind] || {});
      }
    }
    result[checkKey] = mergedRecord;
  }
  return result;
}


function mergeRequestComments(saved = {}, incoming = {}) {
  const next = { ...(saved || {}), ...(incoming || {}) };
  const lines = [];
  const pushLines = value => String(value || "").split("\n").forEach(line => {
    const clean = line.trim();
    if (clean && !lines.includes(clean)) lines.push(clean);
  });
  pushLines(saved.comment);
  pushLines(incoming.comment);
  next.comment = lines.join("\n");
  next.commentPhoto = incoming.commentPhoto || saved.commentPhoto || "";
  next.requestPhoto = incoming.requestPhoto || saved.requestPhoto || "";
  next.updatedAt = incoming.updatedAt || saved.updatedAt || new Date().toISOString();
  return next;
}

function mergeRequests(savedRequests = {}, incomingRequests = {}) {
  const result = { ...(savedRequests || {}) };
  for (const [id, incoming] of Object.entries(incomingRequests || {})) {
    result[id] = mergeRequestComments(result[id] || {}, incoming || {});
  }
  return result;
}

function mergeById(savedArray = [], incomingArray = []) {
  const map = new Map();
  for (const item of Array.isArray(savedArray) ? savedArray : []) {
    const id = item?.id || `${item?.equipmentId || ""}:${item?.nodeIndex || ""}:${item?.startedAt || item?.createdAt || JSON.stringify(item)}`;
    map.set(id, item);
  }
  for (const item of Array.isArray(incomingArray) ? incomingArray : []) {
    const id = item?.id || `${item?.equipmentId || ""}:${item?.nodeIndex || ""}:${item?.startedAt || item?.createdAt || JSON.stringify(item)}`;
    map.set(id, { ...(map.get(id) || {}), ...item });
  }
  return [...map.values()];
}

function mergeState(db, body) {
  db.checks = mergeChecks(db.checks || {}, body.checks || {});
  db.requests = mergeRequests(db.requests || {}, body.requests || {});
  db.inventory = { ...(db.inventory || {}), ...(body.inventory || {}) };
  db.catalog = {
    ...(db.catalog || {}),
    ...(body.catalog || {}),
    equipment: { ...((db.catalog || {}).equipment || {}), ...((body.catalog || {}).equipment || {}) }
  };
  db.directorMessages = mergeById(db.directorMessages || [], body.directorMessages || []);
  db.downtimes = mergeById(db.downtimes || [], body.downtimes || []);
  return db;
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/state" && req.method === "GET") {
    const db = readDb();
    sendJson(res, 200, { checks: db.checks, requests: db.requests, inventory: db.inventory, catalog: db.catalog, directorMessages: db.directorMessages, downtimes: db.downtimes });
    return true;
  }

  if (pathname === "/api/state" && req.method === "PUT") {
    const body = await readBody(req);
    const db = mergeState(readDb(), body || {});
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    const user = await readBody(req);
    const db = readDb();
    const phone = String(user.phone || "").trim();
    db.users = (db.users || []).filter(item => !phone || item.phone !== phone);
    db.users.push({ ...user, phone, registeredAt: new Date().toISOString() });
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    sendJson(res, 200, readDb().users || []);
    return true;
  }

  return false;
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const file = path.resolve(root, cleanPath);
  const relative = path.relative(root, file);
  const isOutsideRoot = relative.startsWith("..") || path.isAbsolute(relative);
  const isDataFile = relative === "data" || relative.startsWith(`data${path.sep}`);
  if (isOutsideRoot || isDataFile) {
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
    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname)) return;
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
}).listen(port, "0.0.0.0", () => {
  ensureDb();
  console.log(`PPR Control server: http://0.0.0.0:${port}`);
});
