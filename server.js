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
  ".svg": "image/svg+xml; charset=utf-8"
};

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ checks: {}, requests: {}, inventory: {}, catalog: {}, directorMessages: [], downtimes: [], users: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  try {
    const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    db.checks ||= {};
    db.requests ||= {};
    db.inventory ||= {};
    db.catalog ||= {};
    db.directorMessages ||= [];
    db.downtimes ||= [];
    db.users ||= [];
    return db;
  } catch {
    return { checks: {}, requests: {}, inventory: {}, catalog: {}, directorMessages: [], downtimes: [], users: [] };
  }
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
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
      if (body.length > 5_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/state" && req.method === "GET") {
    const db = readDb();
    sendJson(res, 200, { checks: db.checks, requests: db.requests, inventory: db.inventory, catalog: db.catalog, directorMessages: db.directorMessages, downtimes: db.downtimes });
    return true;
  }

  if (pathname === "/api/state" && req.method === "PUT") {
    const body = await readBody(req);
    const db = readDb();
    db.checks = body.checks || {};
    db.requests = body.requests || {};
    db.inventory = body.inventory || {};
    db.catalog = body.catalog || {};
    db.directorMessages = body.directorMessages || [];
    db.downtimes = body.downtimes || [];
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
