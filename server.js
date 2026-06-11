const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

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
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(emptyDb(), null, 2));
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
  const tmp = `${dbFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(normalizeDb(db), null, 2));
  fs.renameSync(tmp, dbFile);
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

let wss = null;

function broadcastState(origin = "server", actionId = "") {
  if (!wss) return;
  const message = JSON.stringify({ type: "state", origin, actionId, state: publicState() });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/state" && req.method === "GET") {
    sendJson(res, 200, publicState());
    return true;
  }

  if (pathname === "/api/state" && req.method === "PUT") {
    const body = await readBody(req);
    const db = readDb();
    db.checks = body.checks || {};
    db.requests = body.requests || {};
    db.inventory = body.inventory || {};
    db.catalog = body.catalog || { equipment: {} };
    db.directorMessages = body.directorMessages || [];
    db.downtimes = body.downtimes || [];
    writeDb(db);
    const actionId = String(body.actionId || "");
    sendJson(res, 200, { ok: true, actionId, state: publicState(db) });
    broadcastState(body.clientId || "api", actionId);
    return true;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    const user = await readBody(req);
    const db = readDb();
    const phone = String(user.phone || "").trim();
    db.users = (db.users || []).filter(item => !phone || item.phone !== phone);
    db.users.push({ ...user, phone, registeredAt: new Date().toISOString() });
    writeDb(db);
    const actionId = String(user.actionId || "");
    sendJson(res, 200, { ok: true, actionId });
    broadcastState(user.clientId || "user", actionId);
    return true;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    sendJson(res, 200, readDb().users || []);
    return true;
  }

  return false;
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(root, cleanPath);
  if (!file.startsWith(root) || file.includes(`${path.sep}data${path.sep}`)) {
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
    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname)) return;
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", ws => {
  ws.send(JSON.stringify({ type: "state", origin: "server", state: publicState() }));
  ws.on("message", raw => {
    try {
      const msg = JSON.parse(String(raw || "{}"));
      if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
    } catch {}
  });
});

server.listen(port, "0.0.0.0", () => {
  ensureDb();
  console.log(`PPR Control realtime server: http://0.0.0.0:${port}`);
});
