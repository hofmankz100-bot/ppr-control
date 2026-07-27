const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const APP_VERSION = "v282-gpm-mechanical-engineer";
const CLIENT_PROTOCOL_VERSION = "1";

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForHealth(baseUrl, process, output, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`Server stopped early.\n${output()}`);
    try {
      if ((await fetch(`${baseUrl}/api/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Server did not become ready.\n${output()}`);
}

test("production API requires a server session and rate-limits failed logins", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-security-test-"));
  const editor = {
    id: "security-editor",
    name: "Security Editor",
    employeeId: "security-editor",
    phone: "70000000001",
    passwordHash: passwordHash("correct-password"),
    role: "editor",
    approved: true,
    pendingApproval: false
  };
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({
    checks: {},
    requests: {},
    inventory: {},
    catalog: { equipment: {} },
    downtimes: [],
    users: [editor]
  }));
  const port = await reservePort();
  const qrPort = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = "";
  const serverProcess = spawn(process.execPath, [path.join(root, "server.js")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      QR_PORT: String(qrPort),
      DATA_DIR: dataDir,
      DATABASE_URL: "",
      REQUIRE_POSTGRES: "false",
      NODE_ENV: "production"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  serverProcess.stdout.on("data", chunk => { output += String(chunk); });
  serverProcess.stderr.on("data", chunk => { output += String(chunk); });
  try {
    await waitForHealth(baseUrl, serverProcess, () => output);
    const legacyRefreshPage = await fetch(`${baseUrl}/?v=update-old&refresh=1`);
    assert.equal(legacyRefreshPage.status, 200);
    assert.match(await legacyRefreshPage.text(), /Устанавливаем обновление/);
    assert.equal((await fetch(`${baseUrl}/api/state`, { headers: { "x-app-version": APP_VERSION } })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/state`, { headers: { "x-app-version": "v-old" } })).status, 426);
    assert.equal((await fetch(`${baseUrl}/api/state`, { headers: { "x-app-version": "v-future-ui", "x-client-protocol": CLIENT_PROTOCOL_VERSION } })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/state`, { headers: { "x-app-version": "v275-reliable-forced-update" } })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/state`, { headers: { "x-app-version": "v273-required-client-update" } })).status, 401);
    const compatibleHealth = await fetch(`${baseUrl}/api/health`, { headers: { "x-app-version": "v275-reliable-forced-update" } }).then(response => response.json());
    assert.equal(compatibleHealth.version, "v275-reliable-forced-update");
    assert.equal(compatibleHealth.latestVersion, APP_VERSION);
    assert.notEqual((await fetch(`${baseUrl}/api/auth/session`, { headers: { "x-app-version": "v-old" } })).status, 426);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ identifier: editor.employeeId, password: "correct-password" })
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert.match(cookie, /^ppr_session=/);
    assert.equal((await fetch(`${baseUrl}/api/state`, { headers: { cookie, "x-app-version": APP_VERSION } })).status, 200);
    const gpmWrite = await fetch(`${baseUrl}/api/state`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION, "x-client-protocol": CLIENT_PROTOCOL_VERSION },
      body: JSON.stringify({
        actionId: "gpm-sync-test",
        clientId: "test-client",
        gpmJournal: {
          equipment: { "gpm:1": { id: "gpm:1", name: "Test crane", updatedAt: new Date().toISOString() } },
          inspections: {},
          events: {}
        }
      })
    });
    assert.equal(gpmWrite.status, 200);
    const gpmState = await fetch(`${baseUrl}/api/state`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.equal(gpmState.gpmJournal.equipment["gpm:1"].name, "Test crane");
    assert.equal((await fetch(`${baseUrl}/api/export/all`, { headers: { "x-app-version": APP_VERSION } })).status, 401);

    for (let index = 0; index < 15; index += 1) {
      const failed = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
        body: JSON.stringify({ identifier: "unknown-user", password: "wrong-password" })
      });
      assert.equal(failed.status, 401);
    }
    const blocked = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ identifier: "unknown-user", password: "wrong-password" })
    });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  } finally {
    if (serverProcess.exitCode === null) {
      serverProcess.kill("SIGTERM");
      await new Promise(resolve => serverProcess.once("exit", resolve));
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
