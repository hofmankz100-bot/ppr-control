"use strict";
// Local-only UI fixture: real grouping route, synthetic in-memory records, no production connections.
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const { handleRepeatFailureGroupRoute } = require("../../server/repeat-failure-group-route");
const root = path.resolve(__dirname, "../..");
const db = { catalog: { equipment: { "1": { id: 1, name: "Пресс 2400 (тест)", area: "Тест", nodes: ["Цилиндр"] } } }, downtimes: [], checks: {} };
let version = 0, counter = 0, queue = Promise.resolve();
function addPair() {
  for (let i = 0; i < 2; i++) db.downtimes.push({ id: `test-${++counter}`, type: "breakdown", equipmentId: 1, equipment: "Пресс 2400 (тест)",
    createdAt: new Date().toISOString(), repeatFailureCode: "1", repeatFailureName: "Течь масла", text: `Тестовая поломка ${counter}`, durationMs: 60000 });
}
addPair();
const files = { "/": "tests/fixtures/repeat-cycles.html", "/modules/repeat-failures.js": "modules/repeat-failures.js",
  "/modules/repeat-failures.css": "modules/repeat-failures.css", "/styles.min.css": "styles.min.css" };
const sendJson = (res, status, value) => { res.writeHead(status, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(value)); };
http.createServer(async (req, res) => {
  try {
    if (req.url === "/state") return sendJson(res, 200, db);
    if (req.url === "/new-pair" && req.method === "POST") { addPair(); return sendJson(res, 200, db); }
    req.authUser = { role: "editor", name: "Тестовый администратор" };
    if (await handleRepeatFailureGroupRoute(req, res, req.url, {
      readBody: async request => { let text = ""; for await (const chunk of request) text += chunk; return JSON.parse(text); }, sendJson,
      enqueueStateWrite: fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; }, readDb: () => db,
      activeUserPermission: () => false, nodeMutationAccessServer: () => true, ensureRemarkEntriesServer: item => item.commentLog,
      resolutionUserKeyServer: () => "test-admin", writeDb: () => {}, broadcastState: () => ++version, realtimeStateVersion: () => version
    })) return;
    const file = files[req.url];
    if (!file) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8" });
    fs.createReadStream(path.join(root, file)).pipe(res);
  } catch (error) { sendJson(res, 500, { error: error.message }); }
}).listen(18712, "127.0.0.1", () => console.log("Synthetic repeat-cycle preview: http://127.0.0.1:18712"));
