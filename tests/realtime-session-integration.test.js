"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const net = require("node:net");
const crypto = require("node:crypto");
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const WebSocket = require("ws");
const { createIsolatedServerEnv } = require("../tools/testing/isolated-env");
const root = path.resolve(__dirname, "..");

async function reservePorts() {
  const holders = [net.createServer(), net.createServer()];
  try {
    for (const holder of holders) { holder.listen(0, "127.0.0.1"); await once(holder, "listening"); }
    return holders.map(holder => holder.address().port);
  } finally { await Promise.all(holders.filter(holder => holder.listening).map(holder => new Promise(resolve => holder.close(resolve)))); }
}
async function until(check, label, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (!await check()) {
    assert.ok(Date.now() < deadline, label);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

test("real HTTP sessions stop delivering WS/SSE after logout and admin revocation while another actor keeps receiving committed state", { timeout: 30000 }, async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-realtime-session-"));
  const salt = crypto.randomBytes(16).toString("hex"), password = "isolated-realtime-password";
  const passwordHash = `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
  const date = "2026-09-08";
  const users = ["revoked", "active", "admin"].map(id => ({ id, employeeId: `realtime-${id}`, name: `Realtime ${id}`, role: id === "admin" ? "editor" : "engineer", approved: true, pendingApproval: false, passwordHash }));
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({ users, pprSheets: { [date]: { date, rows: [{ id: "original", work: "Preserve original work", mark: "" }] } }, pushNotifications: { subscriptions: [] } }));
  const [port, qrPort] = await reservePorts(), base = `http://127.0.0.1:${port}`;
  let output = "";
  const child = spawn(process.execPath, [path.join(root, "server.js")], { cwd: root, windowsHide: true,
    env: createIsolatedServerEnv({ DATA_DIR: dataDir, PORT: port, QR_PORT: qrPort, NODE_ENV: "production" }), stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", data => { output += data; });
  child.stderr.on("data", data => { output += data; });
  const sockets = [], streams = [];
  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    for (const stream of streams) stream.destroy();
    if (child.exitCode === null) { const stopped = once(child, "exit"); child.kill(); await stopped; }
    assert.equal(path.dirname(path.resolve(dataDir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dataDir).startsWith("ppr-realtime-session-"));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  await until(async () => {
    assert.equal(child.exitCode, null, output);
    try { return (await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
  }, "isolated server startup", 15000);
  const cookies = {};
  async function login(id) {
    const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-client-protocol": "1" }, body: JSON.stringify({ identifier: `realtime-${id}`, password }) });
    assert.equal(response.status, 200);
    cookies[id] = response.headers.get("set-cookie").split(";")[0];
  }
  async function request(id, endpoint, method = "GET", body) {
    const response = await fetch(`${base}${endpoint}`, { method, headers: { cookie: cookies[id], "content-type": "application/json", "x-client-protocol": "1" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  async function connectWs(id) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers: { cookie: cookies[id] } });
    sockets.push(socket);
    const result = { messages: [], closed: null };
    socket.on("message", data => result.messages.push(JSON.parse(data.toString())));
    socket.on("close", (code, reason) => { result.closed = [code, reason.toString()]; });
    socket.on("error", error => { result.error = error; });
    await until(() => result.messages.some(message => message.type === "ready"), "WS ready");
    assert.equal(result.error, undefined);
    return result;
  }
  async function connectSse(id) {
    const result = { messages: [], ended: false, buffer: "" };
    const req = http.get(`${base}/api/events`, { headers: { cookie: cookies[id], "x-client-protocol": "1" } }, res => {
      result.status = res.statusCode;
      res.setEncoding("utf8");
      res.on("data", chunk => {
        result.buffer += chunk;
        let end;
        while ((end = result.buffer.indexOf("\n\n")) >= 0) {
          const event = result.buffer.slice(0, end); result.buffer = result.buffer.slice(end + 2);
          if (event.startsWith("data: ")) result.messages.push(JSON.parse(event.slice(6)));
        }
      });
      res.on("end", () => { result.ended = true; });
    });
    req.on("error", error => { result.error = error; });
    streams.push(req);
    await until(() => result.messages.some(message => message.type === "ready"), "SSE ready");
    assert.equal(result.status, 200);
    return result;
  }
  for (const id of ["revoked", "active", "admin"]) await login(id);
  const activeWs = await connectWs("active"), activeSse = await connectSse("active");
  for (const mode of ["logout", "admin-revoke"]) {
    if (mode === "admin-revoke") await login("revoked");
    const revokedWs = await connectWs("revoked"), revokedSse = await connectSse("revoked");
    const revoke = mode === "logout"
      ? await request("revoked", "/api/auth/logout", "POST", {})
      : await request("admin", "/api/admin/user-sessions", "POST", { userId: "revoked", reason: "Isolated regression test", password });
    assert.equal(revoke.status, 200, JSON.stringify(revoke.body));
    if (mode === "admin-revoke") assert.equal(revoke.body.ended, 1);
    assert.equal((await request("revoked", "/api/auth/session")).status, 401);
    const actionId = `realtime-after-${mode}`;
    const mutation = await request("active", "/api/ppr-sheet/action", "POST", { date, action: "add-row", rowId: actionId, actionId });
    assert.equal(mutation.status, 200, JSON.stringify(mutation.body));
    await until(() => activeWs.messages.some(message => message.actionId === actionId) && activeSse.messages.some(message => message.actionId === actionId), "active clients receive the real committed mutation");
    await until(() => revokedWs.closed && revokedSse.ended, "revoked WS and SSE disconnect");
    assert.deepEqual(revokedWs.closed, [1008, "authentication_required"]);
    assert.equal(revokedWs.messages.some(message => message.actionId === actionId), false);
    assert.equal(revokedSse.messages.some(message => message.actionId === actionId), false);
    assert.equal(activeWs.closed, null);
    assert.equal(activeSse.ended, false);
  }
  const saved = await request("active", "/api/state");
  assert.equal(saved.body.pprSheets[date].rows.find(row => row.id === "original").work, "Preserve original work");
  assert.ok(saved.body.pprSheets[date].rows.some(row => row.id === "realtime-after-admin-revoke"));
});
