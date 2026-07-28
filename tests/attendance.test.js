const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const APP_VERSION = "v304-role-sync-director-clean";
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

async function login(baseUrl, identifier, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-app-version": APP_VERSION, "x-client-protocol": CLIENT_PROTOCOL_VERSION },
    body: JSON.stringify({ identifier, password })
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}

async function api(baseUrl, pathname, cookie, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { "content-type": "application/json", "x-app-version": APP_VERSION, "x-client-protocol": CLIENT_PROTOCOL_VERSION, cookie, ...(options.headers || {}) }
  });
}

test("dynamic attendance QR unlocks a worker for one shift and admin can close it", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-attendance-test-"));
  const editor = {
    id: "attendance-editor",
    name: "Admin Engineer",
    employeeId: "87064091893",
    phone: "70000000001",
    passwordHash: passwordHash("editor-password"),
    role: "editor",
    approved: true
  };
  const worker = {
    id: "attendance-worker",
    name: "Test Welder",
    employeeId: "worker-1",
    phone: "77000000002",
    passwordHash: passwordHash("worker-password"),
    role: "welder",
    approved: true
  };
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({
    checks: {},
    requests: {},
    catalog: { equipment: {} },
    downtimes: [],
    users: [editor, worker]
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
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        if ((await fetch(`${baseUrl}/api/health`)).ok) break;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (serverProcess.exitCode !== null) throw new Error(output);

    const editorCookie = await login(baseUrl, editor.employeeId, "editor-password");
    const workerCookie = await login(baseUrl, worker.employeeId, "worker-password");

    let status = await api(baseUrl, "/api/attendance/status", workerCookie);
    assert.deepEqual(await status.json().then(value => ({ required: value.required, canEdit: value.canEdit })), {
      required: true,
      canEdit: false
    });
    assert.equal((await api(baseUrl, "/api/state", workerCookie, {
      method: "PUT",
      body: JSON.stringify({ checks: {} })
    })).status, 403);

    const registered = await api(baseUrl, "/api/attendance/workstation", editorCookie, {
      method: "POST",
      body: JSON.stringify({ action: "register", clientId: "front-desk-browser", workstationName: "Проходная" })
    });
    assert.equal(registered.status, 200);
    const registrationData = await registered.json();
    assert.ok(registrationData.kioskToken);
    const headerlessKiosk = await fetch(`${baseUrl}/api/attendance/kiosk`, {
      headers: {
        "x-attendance-kiosk-token": registrationData.kioskToken,
        "x-attendance-client-id": "front-desk-browser"
      }
    });
    assert.equal(headerlessKiosk.status, 200);
    assert.equal((await headerlessKiosk.json()).updateRequired, undefined);
    const kiosk = await fetch(`${baseUrl}/api/attendance/kiosk`, {
      headers: {
        "x-app-version": APP_VERSION,
        "x-attendance-kiosk-token": registrationData.kioskToken,
        "x-attendance-client-id": "front-desk-browser"
      }
    });
    assert.equal(kiosk.status, 200);
    const kioskData = await kiosk.json();
    assert.equal(kioskData.workstationName, "Проходная");
    assert.match(kioskData.qrDataUrl, /^data:image\/svg\+xml;base64,/);
    const invalidKiosk = await fetch(`${baseUrl}/api/attendance/kiosk`);
    assert.equal(invalidKiosk.status, 401);
    assert.equal((await api(baseUrl, "/api/attendance/kiosk/exit", editorCookie, {
      method: "POST",
      headers: {
        "x-attendance-kiosk-token": registrationData.kioskToken,
        "x-attendance-client-id": "front-desk-browser"
      },
      body: JSON.stringify({ identifier: editor.employeeId, password: "wrong-password" })
    })).status, 401);
    assert.equal((await api(baseUrl, "/api/attendance/kiosk/exit", editorCookie, {
      method: "POST",
      headers: {
        "x-attendance-kiosk-token": registrationData.kioskToken,
        "x-attendance-client-id": "front-desk-browser"
      },
      body: JSON.stringify({ identifier: editor.employeeId, password: "editor-password" })
    })).status, 200);
    const qr = await api(baseUrl, "/api/attendance/qr?clientId=front-desk-browser", editorCookie);
    assert.equal(qr.status, 200);
    const { token } = await qr.json();

    const staffLookup = await fetch(`${baseUrl}/api/attendance/lookup`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ token, identifier: worker.phone })
    });
    assert.equal(staffLookup.status, 200);
    assert.equal((await staffLookup.json()).registered, true);
    const contractorLookup = await fetch(`${baseUrl}/api/attendance/lookup`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ token, identifier: "77009998877" })
    });
    assert.equal(contractorLookup.status, 200);
    const contractorLookupData = await contractorLookup.json();
    assert.equal(contractorLookupData.registered, false);
    assert.ok(contractorLookupData.contractorTicket);
    const contractor = await fetch(`${baseUrl}/api/attendance/contractor`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({
        token: "expired-token",
        contractorTicket: contractorLookupData.contractorTicket,
        name: "Contract Worker",
        phone: "77009998877"
      })
    });
    assert.equal(contractor.status, 200);
    assert.equal((await contractor.json()).contractor, true);

    const scan = await api(baseUrl, "/api/attendance/scan", workerCookie, {
      method: "POST",
      body: JSON.stringify({ token })
    });
    assert.equal(scan.status, 200);
    const session = (await scan.json()).session;
    assert.ok(Date.parse(session.expiresAt) - Date.parse(session.startedAt) === 10 * 60 * 60 * 1000);
    assert.equal((await api(baseUrl, "/api/state", workerCookie, {
      method: "PUT",
      body: JSON.stringify({ checks: {} })
    })).status, 200);

    const monitor = await api(baseUrl, "/api/attendance/status", editorCookie);
    const monitorData = await monitor.json();
    assert.equal(monitorData.isPrimaryAdminEngineer, true);
    assert.equal(monitorData.onDuty[0].name, worker.name);
    assert.equal(monitorData.people.find(person => person.userKey === worker.id).onDuty, true);
    assert.equal(monitorData.people.find(person => person.role === "contractor").name, "Contract Worker");
    assert.equal(monitorData.workstationName, "Проходная");

    const ended = await api(baseUrl, "/api/attendance/admin", editorCookie, {
      method: "POST",
      body: JSON.stringify({ action: "end", sessionId: session.id })
    });
    assert.equal(ended.status, 200);
    const afterEnd = await api(baseUrl, "/api/attendance/status", editorCookie);
    assert.equal((await afterEnd.json()).people.find(person => person.userKey === worker.id).onDuty, false);
    assert.equal((await api(baseUrl, "/api/state", workerCookie, {
      method: "PUT",
      body: JSON.stringify({ checks: {} })
    })).status, 403);

    const replacement = await api(baseUrl, "/api/attendance/workstation", editorCookie, {
      method: "POST",
      body: JSON.stringify({ action: "register", clientId: "replacement-browser", workstationName: "New terminal" })
    });
    assert.equal(replacement.status, 200);
    const replacementData = await replacement.json();
    assert.equal(replacementData.replacedExisting, true);
    assert.ok(replacementData.kioskToken);
    const oldTerminalAfterReplacement = await fetch(`${baseUrl}/api/attendance/kiosk`, {
      headers: {
        "x-app-version": APP_VERSION,
        "x-attendance-kiosk-token": registrationData.kioskToken,
        "x-attendance-client-id": "front-desk-browser"
      }
    });
    assert.equal(oldTerminalAfterReplacement.status, 401);
  } finally {
    if (serverProcess.exitCode === null) {
      serverProcess.kill("SIGTERM");
      await new Promise(resolve => serverProcess.once("exit", resolve));
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
