"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createIsolatedServerEnv } = require("../tools/testing/isolated-env");
const root = path.resolve(__dirname, "..");
async function ports() {
  const holders = [net.createServer(), net.createServer()];
  try {
    for (const holder of holders) { holder.listen(0, "127.0.0.1"); await once(holder, "listening"); }
    return holders.map(holder => holder.address().port);
  } finally { await Promise.all(holders.filter(holder => holder.listening).map(holder => new Promise(resolve => holder.close(resolve)))); }
}

test("real authenticated HTTP mark/offline-sync transitions preserve approval history and survive reopen", { timeout: 30000 }, async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-readiness-http-"));
  const password = "isolated-readiness-password", salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
  const users = ["mechanic", "engineer"].map(role => ({ id: role, employeeId: `readiness-${role}`, role, name: `Readiness ${role}`, area: "A", approved: true, pendingApproval: false, passwordHash }));
  const date = "2026-09-08", at = new Date().toISOString(), old = "2020-01-01T00:00:00.000Z";
  const history = { date: "2026-08-01", approvedAt: old, approvedByName: "Historical engineer", approvalRequestedAt: old, rows: [{ id: "historical", work: "Preserve accepted work", mark: "done" }] };
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({ users, checks: {},
    attendanceSessions: [{ userKey: "mechanic", userId: "mechanic", startedAt: at, expiresAt: "2099-01-01T00:00:00Z" }],
    catalog: { equipment: { 90: { id: 90, created: true, name: "Isolated press", area: "A", nodes: ["Motor"] } } },
    pprSheets: { [date]: { id: "readiness-sheet", date, rows: [{ id: "work", work: "Inspect motor", mark: "", equipmentId: 90, equipment: "Isolated press", node: "Motor", area: "A" }, { id: "blank", work: "", mark: "" }] }, "2026-08-01": history },
    pushNotifications: { subscriptions: [] }
  }));
  const [port, qrPort] = await ports(), base = `http://127.0.0.1:${port}`;
  let output = "";
  const child = spawn(process.execPath, [path.join(root, "server.js")], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: createIsolatedServerEnv({ DATA_DIR: dataDir, PORT: port, QR_PORT: qrPort, NODE_ENV: "production" }) });
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  t.after(async () => {
    if (child.exitCode === null) { const stopped = once(child, "exit"); child.kill(); await stopped; }
    assert.equal(path.dirname(path.resolve(dataDir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dataDir).startsWith("ppr-readiness-http-"));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const deadline = Date.now() + 15000;
  while (true) {
    try { if ((await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) })).ok) break; } catch {}
    assert.ok(Date.now() < deadline && child.exitCode === null, `Isolated startup: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  const cookies = {};
  for (const user of users) {
    const res = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-client-protocol": "1" }, body: JSON.stringify({ identifier: user.employeeId, password }) });
    assert.equal(res.status, 200); cookies[user.role] = res.headers.get("set-cookie").split(";")[0];
  }
  async function request(endpoint, body, role = "mechanic", method = "POST") {
    const res = await fetch(`${base}${endpoint}`, { method, headers: { cookie: cookies[role], "content-type": "application/json", "x-client-protocol": "1" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await res.json(); assert.equal(res.status, 200, JSON.stringify(result)); return result;
  }
  const state = () => request("/api/state", undefined, "mechanic", "GET");
  const mark = value => request("/api/ppr-sheet/action", { date, action: "mark", rowId: "work", mark: value, resolutionComment: value ? "Inspected" : "" });
  await mark("done");
  const first = (await state()).pprSheets[date].approvalRequestedAt;
  assert.ok(first);
  await mark("done"); assert.equal((await state()).pprSheets[date].approvalRequestedAt, first);
  await mark(""); assert.equal((await state()).pprSheets[date].approvalRequestedAt, "");
  await mark("na"); assert.ok((await state()).pprSheets[date].approvalRequestedAt);
  for (const value of ["", "done", "done"]) {
    const sheet = (await state()).pprSheets[date];
    Object.assign(sheet.rows.find(row => row.id === "work"), { mark: value, resolutionComment: value ? "Offline inspection" : "", markUpdatedAt: "2099-01-01", resolutionUpdatedAt: "2099-01-01", updatedAt: "2099-01-01" });
    await request("/api/state", { pprSheets: { [date]: sheet } }, "mechanic", "PUT");
    assert.equal(Boolean((await state()).pprSheets[date].approvalRequestedAt), Boolean(value));
  }
  const beforeApprove = (await state()).pprSheets[date].approvalRequestedAt;
  await request("/api/ppr-sheet/action", { date, action: "approve" }, "engineer");
  const approved = (await state()).pprSheets[date];
  assert.equal(approved.approvalRequestedAt, beforeApprove);
  assert.equal(approved.approvedByName, "Readiness engineer");
  await request("/api/ppr-sheet/generate", { date, force: true }, "engineer");
  assert.deepEqual((await state()).pprSheets[date], approved);
  assert.deepEqual((await state()).pprSheets["2026-08-01"], history);
  const durable = JSON.parse(fs.readFileSync(path.join(dataDir, "db.json"), "utf8"));
  assert.deepEqual(durable.pprSheets[date], approved);
});
