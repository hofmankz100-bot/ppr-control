const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const APP_VERSION = fs.readFileSync(path.join(root, "app.js"), "utf8").match(/const APP_VERSION = "([^"]+)"/)?.[1] || "";
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
  const worker = {
    id: "security-worker",
    name: "Berik Worker",
    employeeId: "19660116",
    phone: "7475408321",
    passwordHash: passwordHash("worker-password"),
    role: "mechanic",
    permissionOverrides: { equipmentEdit: { enabled: true } },
    approved: true,
    pendingApproval: false
  };
  const restrictedWorker = {
    id: "security-restricted-worker",
    name: "Restricted Worker",
    employeeId: "restricted-worker",
    phone: "70000000002",
    passwordHash: passwordHash("restricted-password"),
    role: "mechanic",
    approved: true,
    pendingApproval: false
  };
  const areaOperator = {
    id: "security-area-operator",
    name: "Area Operator",
    employeeId: "area-operator",
    phone: "70000000003",
    passwordHash: passwordHash("operator-password"),
    role: "operator",
    area: "Test shop",
    approved: true,
    pendingApproval: false
  };
  const otherAreaOperator = {
    id: "security-other-area-operator",
    name: "Other Area Operator",
    employeeId: "other-area-operator",
    phone: "70000000004",
    passwordHash: passwordHash("other-password"),
    role: "operator",
    area: "Other shop",
    approved: true,
    pendingApproval: false
  };
  const restrictedDirector = {
    id: "security-director",
    name: "Restricted Director",
    employeeId: "restricted-director",
    phone: "70000000005",
    passwordHash: passwordHash("director-password"),
    role: "director",
    approved: true,
    pendingApproval: false
  };
  const specialistUsers = [
    ["welder", "Security Welder", "welder-password"],
    ["turner", "Security Turner", "turner-password"],
    ["forkliftDriver", "Security Forklift", "forklift-password"],
    ["engineer", "Security Engineer", "engineer-password"]
  ].map(([role, name, password], index) => ({
    id: `security-${role}`,
    name,
    employeeId: `security-${role}`,
    phone: `7000000010${index}`,
    passwordHash: passwordHash(password),
    role,
    approved: true,
    pendingApproval: false
  }));
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({
    checks: {},
    requests: {},
    inventory: {},
    catalog: { equipment: {
      "1": { name: "Test press", area: "Test shop", nodes: ["Main"], editingEnabled: false },
      "2": { name: "Вилочные погрузчики", area: "Transport", equipmentKind: "forklift", nodes: ["Forklift 1"], editingEnabled: false }
    } },
    downtimes: [],
    attendanceSessions: [worker, restrictedWorker].map(user => ({ userKey: user.id, startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString() })),
    users: [editor, worker, restrictedWorker, areaOperator, otherAreaOperator, restrictedDirector, ...specialistUsers]
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
    const instructionAckResponse = await fetch(`${baseUrl}/api/work-permit-instructions/acknowledge`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-client-protocol": CLIENT_PROTOCOL_VERSION },
      body: JSON.stringify({ instructionId: "general", instructionTitle: "Инструкция по технике безопасности" })
    });
    assert.equal(instructionAckResponse.status, 200);
    assert.equal((await instructionAckResponse.json()).ok, true);
    const maintenanceAfterInstructionAck = await fetch(`${baseUrl}/api/admin/maintenance?tab=instructionLog`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.equal(maintenanceAfterInstructionAck.instructionAcknowledgements.some(item => item.instructionId === "general" && item.actorName === editor.name), true);
    const instructionStateAfterAck = await fetch(`${baseUrl}/api/work-permit-instructions`, { headers: { cookie, "x-client-protocol": CLIENT_PROTOCOL_VERSION } }).then(response => response.json());
    assert.equal(instructionStateAfterAck.acknowledgedIds.includes("general"), true);
    const usersResponse = await fetch(`${baseUrl}/api/users`, { headers: { cookie, "x-app-version": APP_VERSION } });
    const users = await usersResponse.json();
    assert.equal(users.find(user => user.id === worker.id).loginDiagnostics.hasPassword, true);
    const loginCookie = async (identifier, password) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
        body: JSON.stringify({ identifier, password })
      });
      assert.equal(response.status, 200);
      return response.headers.get("set-cookie").split(";")[0];
    };
    const areaOperatorCookie = await loginCookie(areaOperator.employeeId, "operator-password");
    const otherAreaOperatorCookie = await loginCookie(otherAreaOperator.employeeId, "other-password");
    const directorCookie = await loginCookie(restrictedDirector.employeeId, "director-password");
    const specialistCookies = Object.fromEntries(await Promise.all(specialistUsers.map(async user => [
      user.role,
      await loginCookie(user.employeeId, `${user.role.replace("forkliftDriver", "forklift")}-password`)
    ])));
    const nodeHeaders = cookieValue => ({
      cookie: cookieValue,
      "content-type": "application/json",
      "x-app-version": APP_VERSION,
      "x-client-protocol": CLIENT_PROTOCOL_VERSION
    });
    const qrStatusUrl = `${baseUrl}/api/qr-walk/status?equipmentId=1&date=2026-08-23&shift=day&group=operational`;
    assert.equal((await fetch(qrStatusUrl, { headers: nodeHeaders(areaOperatorCookie) })).status, 200);
    assert.equal((await fetch(qrStatusUrl, { headers: nodeHeaders(otherAreaOperatorCookie) })).status, 403);
    const technicalQrStatusUrl = `${baseUrl}/api/qr-walk/status?equipmentId=1&date=2026-08-23&shift=day&group=technical`;
    for (const role of ["welder", "turner", "engineer"]) {
      assert.equal((await fetch(technicalQrStatusUrl, { headers: nodeHeaders(specialistCookies[role]) })).status, 200, `${role} must access equipment checks`);
    }
    assert.equal((await fetch(technicalQrStatusUrl, { headers: nodeHeaders(specialistCookies.forkliftDriver) })).status, 403);
    const forkliftQrStatusUrl = `${baseUrl}/api/qr-walk/status?equipmentId=2&date=2026-08-23&shift=day&group=technical`;
    assert.equal((await fetch(forkliftQrStatusUrl, { headers: nodeHeaders(specialistCookies.forkliftDriver) })).status, 200);
    const qrMarkBody = {
      actionId: "area-qr-mark",
      clientId: "security-test",
      equipmentId: 1,
      nodeIndex: 0,
      date: "2026-08-23",
      shift: "day",
      group: "operational",
      area: "Spoofed shop",
      equipment: "Spoofed equipment",
      node: "Spoofed node"
    };
    assert.equal((await fetch(`${baseUrl}/api/qr-walk/mark`, {
      method: "POST",
      headers: nodeHeaders(otherAreaOperatorCookie),
      body: JSON.stringify(qrMarkBody)
    })).status, 403);
    const allowedQrMark = await fetch(`${baseUrl}/api/qr-walk/mark`, {
      method: "POST",
      headers: nodeHeaders(areaOperatorCookie),
      body: JSON.stringify(qrMarkBody)
    });
    assert.equal(allowedQrMark.status, 200);
    const qrJournalState = await fetch(`${baseUrl}/api/qr-walk/journal?date=2026-08-23`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    const qrJournalRow = qrJournalState.entries.find(item => item.id === "1:0:2026-08-23:operational:day");
    assert.equal(qrJournalRow.area, "Test shop");
    assert.equal(qrJournalRow.equipment, "Test press");
    assert.notEqual(qrJournalRow.node, "Spoofed node");
    assert.equal((await fetch(`${baseUrl}/api/qr-walk/mark`, {
      method: "POST",
      headers: nodeHeaders(directorCookie),
      body: JSON.stringify({ ...qrMarkBody, group: "technical", actionId: "director-qr-denied" })
    })).status, 400);
    const allowedNodeUpdate = await fetch(`${baseUrl}/api/node-update`, {
      method: "PUT",
      headers: nodeHeaders(areaOperatorCookie),
      body: JSON.stringify({
        actionId: "area-node-update",
        clientId: "security-test",
        key: "1:0:2026-08-23",
        record: { to: { commentLog: [] } },
        user: { name: "Spoofed User", role: "editor" },
        downtimes: [
          { id: "allowed-area-stop", equipmentId: 1, nodeIndex: 0, area: "Test shop", equipment: "Test press", startedAt: new Date().toISOString(), endedAt: "", type: "breakdown", comment: "Area stop" },
          { id: "foreign-stop", equipmentId: 2, nodeIndex: 0, area: "Other shop", equipment: "Foreign", startedAt: new Date().toISOString(), endedAt: "", type: "breakdown", comment: "Must be ignored" }
        ]
      })
    });
    assert.equal(allowedNodeUpdate.status, 200);
    const nodeState = await fetch(`${baseUrl}/api/state`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.equal(nodeState.downtimes.some(item => item.id === "allowed-area-stop"), true);
    assert.equal(nodeState.downtimes.some(item => item.id === "foreign-stop"), false);
    assert.equal((await fetch(`${baseUrl}/api/node-update`, {
      method: "PUT",
      headers: nodeHeaders(otherAreaOperatorCookie),
      body: JSON.stringify({ actionId: "other-area-denied", key: "1:0:2026-08-23", record: { to: { commentLog: [] } }, downtimes: [] })
    })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/node-update`, {
      method: "PUT",
      headers: nodeHeaders(directorCookie),
      body: JSON.stringify({ actionId: "director-node-denied", key: "1:0:2026-08-23", record: { to: { commentLog: [] } }, downtimes: [] })
    })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/downtime-close`, {
      method: "POST",
      headers: nodeHeaders(otherAreaOperatorCookie),
      body: JSON.stringify({ actionId: "other-area-close-denied", downtimeId: "allowed-area-stop", comment: "Should not close", actor: otherAreaOperator })
    })).status, 403);
    assert.equal((await fetch(`${baseUrl}/api/downtime-close`, {
      method: "POST",
      headers: nodeHeaders(areaOperatorCookie),
      body: JSON.stringify({ actionId: "area-close-allowed", downtimeId: "allowed-area-stop", comment: "Equipment started", actor: areaOperator })
    })).status, 200);
    const grpDate = "2026-08-05";
    const saveGrpResult = payload => fetch(`${baseUrl}/api/qr-walk/grp-result`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ date: grpDate, shift: "day", equipment: "Газовое хозяйство", ...payload })
    });
    assert.equal((await saveGrpResult({ node: "ГРП - Печь №1", hasRemark: false })).status, 200);
    assert.equal((await saveGrpResult({ node: "ГРП - Печь №2", hasRemark: true, comment: "Проверить соединение" })).status, 200);
    const repeatedGrp = await saveGrpResult({ node: "ГРП - Печь №1", hasRemark: true, comment: "Не должен заменить первую запись" }).then(response => response.json());
    assert.equal(repeatedGrp.alreadyDone, true);
    assert.equal((await saveGrpResult({ node: "Контрольная трубка №1", hasRemark: false })).status, 200);
    assert.equal((await saveGrpResult({ node: "Контрольная трубка №2", hasRemark: true, comment: "Повреждена крышка колодца" })).status, 200);
    const repeatedTube = await saveGrpResult({ node: "Контрольная трубка №2", hasRemark: false }).then(response => response.json());
    assert.equal(repeatedTube.alreadyDone, true);
    assert.equal((await saveGrpResult({ node: "Охранная зона газопровода", hasRemark: true, comment: "Повреждено ограждение" })).status, 200);
    const repeatedProtection = await saveGrpResult({ node: "Охранная зона газопровода", hasRemark: false }).then(response => response.json());
    assert.equal(repeatedProtection.alreadyDone, true);
    assert.equal((await saveGrpResult({ node: "Газорегуляторный пункт (ГРП)№10", hasRemark: true, comment: "Проверить настройку давления" })).status, 200);
    const stateWithGrp = await fetch(`${baseUrl}/api/state`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    const grpRow = stateWithGrp.gasJournal[`B::${grpDate}`];
    assert.match(grpRow.gasSmell, /ГРП - Печь №1 — Исправно/);
    assert.match(grpRow.gasSmell, /ГРП - Печь №2 — Есть запах газа/);
    assert.match(grpRow.remarks, /ГРП - Печь №1 — Замечаний нет/);
    assert.match(grpRow.remarks, /ГРП - Печь №2 — Проверить соединение/);
    assert.match(grpRow.wells, /Контрольная трубка №1 — исправна/);
    assert.match(grpRow.wells, /Контрольная трубка №2 — неисправна/);
    assert.match(grpRow.remarks, /Контрольная трубка №2 — Повреждена крышка колодца/);
    assert.match(grpRow.actions, /Контрольная трубка №2 — Требуется/);
    assert.match(grpRow.protectionZone, /Охранная зона газопровода — есть нарушение/);
    assert.match(grpRow.remarks, /Охранная зона газопровода — Повреждено ограждение/);
    assert.match(grpRow.actions, /Охранная зона газопровода — Требуется/);
    assert.match(grpRow.gasSmell, /ГРП - Печь №10 — Есть запах газа/);
    assert.match(grpRow.remarks, /ГРП - Печь №10 — Проверить настройку давления/);
    const equipmentEditorLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ identifier: worker.employeeId, password: "worker-password" })
    });
    assert.equal(equipmentEditorLogin.status, 200);
    const equipmentEditorCookie = equipmentEditorLogin.headers.get("set-cookie").split(";")[0];
    const operationalPauseAt = new Date().toISOString();
    const equipmentPauseResponse = await fetch(`${baseUrl}/api/state`, {
      method: "PUT",
      headers: { cookie: equipmentEditorCookie, "content-type": "application/json", "x-app-version": APP_VERSION, "x-client-protocol": CLIENT_PROTOCOL_VERSION },
      body: JSON.stringify({ actionId: "equipment-pause-permission-test", clientId: "security-test", catalog: { equipment: { "1": { name: "Test press", area: "Test shop", nodes: ["Main"], updatedAt: operationalPauseAt, operationalPauses: [{ startedAt: operationalPauseAt, reason: "Проверка права", changedBy: worker.name }] } } } })
    });
    assert.equal(equipmentPauseResponse.status, 200);
    const pausedState = await fetch(`${baseUrl}/api/state`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.equal(pausedState.catalog.equipment["1"].operationalPauses[0].reason, "Проверка права");
    const restrictedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ identifier: restrictedWorker.employeeId, password: "restricted-password" })
    });
    const restrictedCookie = restrictedLogin.headers.get("set-cookie").split(";")[0];
    await fetch(`${baseUrl}/api/state`, {
      method: "PUT",
      headers: { cookie: restrictedCookie, "content-type": "application/json", "x-app-version": APP_VERSION, "x-client-protocol": CLIENT_PROTOCOL_VERSION },
      body: JSON.stringify({ actionId: "equipment-pause-denied-test", clientId: "security-test", catalog: { equipment: { "1": { updatedAt: new Date(Date.now() + 1000).toISOString(), operationalPauses: [{ startedAt: operationalPauseAt, reason: "Несанкционированная замена" }] } } } })
    });
    const protectedState = await fetch(`${baseUrl}/api/state`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.equal(protectedState.catalog.equipment["1"].operationalPauses[0].reason, "Проверка права");
    const rejectedDelete = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ action: "delete", id: worker.id, reason: "Test safe deletion", adminPassword: "wrong-password" })
    });
    assert.equal(rejectedDelete.status, 400);
    const safeDelete = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ action: "delete", id: worker.id, reason: "Test safe deletion", adminPassword: "correct-password" })
    });
    assert.equal(safeDelete.status, 200);
    const maintenance = await fetch(`${baseUrl}/api/admin/maintenance`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.equal(maintenance.trash.length, 1);
    assert.equal(maintenance.trash[0].type, "user");
    assert.ok(maintenance.audit.some(item => item.action === "user_moved_to_trash"));
    assert.ok(maintenance.monitoring?.node?.online);
    assert.equal(typeof maintenance.monitoring?.node?.memoryMb, "number");
    assert.equal(typeof maintenance.monitoring?.api?.requests, "number");
    assert.ok(Array.isArray(maintenance.alerts));
    assert.ok(Array.isArray(maintenance.backups));
    assert.ok(Array.isArray(maintenance.activity?.items));
    assert.ok(Array.isArray(maintenance.access));
    assert.ok(Array.isArray(maintenance.broadcasts));
    const rejectedBroadcast = await fetch(`${baseUrl}/api/admin/broadcasts`, { method: "POST", headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION }, body: JSON.stringify({ title: "Test", text: "Test", expiresAt: new Date(Date.now() + 3600000).toISOString(), password: "wrong-password", reason: "Test" }) });
    assert.equal(rejectedBroadcast.status, 401);
    const createdBroadcast = await fetch(`${baseUrl}/api/admin/broadcasts`, { method: "POST", headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION }, body: JSON.stringify({ title: "Security notice", text: "Read this notice", priority: "important", roles: ["editor"], expiresAt: new Date(Date.now() + 3600000).toISOString(), password: "correct-password", reason: "Security test" }) });
    assert.equal(createdBroadcast.status, 200);
    const maintenanceWithBroadcast = await fetch(`${baseUrl}/api/admin/maintenance`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    const notice = maintenanceWithBroadcast.broadcasts.find(item => item.title === "Security notice");
    assert.ok(notice?.id);
    assert.equal((await fetch(`${baseUrl}/api/broadcasts/read`, { method: "POST", headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION }, body: JSON.stringify({ id: notice.id }) })).status, 200);
    assert.ok(Array.isArray(maintenance.systemReport?.checks));
    assert.equal(typeof maintenance.systemReport?.summary?.critical, "number");
    const systemReport = await fetch(`${baseUrl}/api/admin/system-report`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.ok(Array.isArray(systemReport.report?.checks));
    assert.equal(systemReport.report?.users, undefined);
    assert.equal((await fetch(`${baseUrl}/api/admin/system-report?download=1`, { headers: { cookie, "x-app-version": APP_VERSION } })).status, 200);
    const configPackageResponse = await fetch(`${baseUrl}/api/admin/config-package`, { headers: { cookie, "x-app-version": APP_VERSION } });
    assert.equal(configPackageResponse.status, 200);
    const configPackage = await configPackageResponse.json();
    assert.equal(configPackage.payload?.format, "ppr-admin-config");
    assert.equal(configPackage.payload?.users, undefined);
    const configPreview = await fetch(`${baseUrl}/api/admin/config-package/preview`, { method: "POST", headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION }, body: JSON.stringify({ package: configPackage }) }).then(response => response.json());
    assert.equal(typeof configPreview.summary?.instructions, "number");
    const unsafeConfigImport = await fetch(`${baseUrl}/api/admin/config-package/import`, { method: "POST", headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION }, body: JSON.stringify({ package: configPackage, password: "correct-password", confirm: "ДА", reason: "Test rejection" }) });
    assert.equal(unsafeConfigImport.status, 400);
    assert.ok(maintenance.access.some(user => user.role === "editor"));
    const rejectedAccessChange = await fetch(`${baseUrl}/api/admin/access`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ userId: worker.id, disabled: true, reason: "Test", password: "wrong-password" })
    });
    assert.equal(rejectedAccessChange.status, 401);
    assert.ok(Array.isArray(maintenance.archives));
    assert.equal(typeof maintenance.automation?.autoBackupEnabled, "boolean");
    assert.equal(typeof maintenance.automation?.autoBackupIntervalHours, "number");
    const rejectedAutomaticBackup = await fetch(`${baseUrl}/api/admin/automation/run`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ password: "wrong-password" })
    });
    assert.equal(rejectedAutomaticBackup.status, 401);
    assert.equal(typeof maintenance.archivePreview?.counts?.audit, "number");
    const archivePreview = await fetch(`${baseUrl}/api/admin/archives/preview?days=90`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.equal(archivePreview.preview?.days, 90);
    const unsafeArchive = await fetch(`${baseUrl}/api/admin/archives`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ categories: ["audit"], days: 90, password: "correct-password", confirm: "ДА", reason: "Test rejection" })
    });
    assert.equal(unsafeArchive.status, 400);
    const unsafeArchiveRestore = await fetch(`${baseUrl}/api/admin/archives/restore`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ archiveId: "missing", password: "correct-password", confirm: "ДА", reason: "Test rejection" })
    });
    assert.equal(unsafeArchiveRestore.status, 400);
    assert.equal(typeof maintenance.activity?.unreadCount, "number");
    const activityRead = await fetch(`${baseUrl}/api/admin/activity/read`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: "{}"
    }).then(response => response.json());
    assert.equal(activityRead.activity?.unreadCount, 0);
    assert.ok(Array.isArray(maintenance.integrity?.issues));
    const integrityReport = await fetch(`${baseUrl}/api/admin/integrity`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.ok(Array.isArray(integrityReport.integrity?.issues));
    const unsafeIntegrityFix = await fetch(`${baseUrl}/api/admin/integrity/fix`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ fixes: ["expired_sessions"], password: "correct-password", confirm: "ДА", reason: "Test rejection" })
    });
    assert.equal(unsafeIntegrityFix.status, 400);
    const createdBackup = await fetch(`${baseUrl}/api/admin/backups`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ label: "Security test backup" })
    }).then(response => response.json());
    assert.ok(createdBackup.backup?.id);
    const backupList = await fetch(`${baseUrl}/api/admin/backups`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.ok(backupList.backups.some(item => item.id === createdBackup.backup.id));
    const backupDir = path.join(dataDir, "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const automaticA = path.join(backupDir, "db_backup_automatic_policy_a.json");
    const automaticB = path.join(backupDir, "db_backup_automatic_policy_b.json");
    fs.writeFileSync(automaticA, "{}");
    fs.writeFileSync(automaticB, "{}");
    const weeklyDate = new Date(Date.now() - 21 * 86400000);
    fs.utimesSync(automaticA, weeklyDate, weeklyDate);
    fs.utimesSync(automaticB, new Date(weeklyDate.getTime() - 60000), new Date(weeklyDate.getTime() - 60000));
    const retentionResult = await fetch(`${baseUrl}/api/admin/backups/retention`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION, "x-idempotency-key": "retention-test" },
      body: JSON.stringify({ password: "correct-password", reason: "Retention test", confirm: "\u041f\u0420\u0418\u041c\u0415\u041d\u0418\u0422\u042c" })
    }).then(response => response.json());
    assert.equal(retentionResult.deleted, 1);
    assert.equal([automaticA, automaticB].filter(file => fs.existsSync(file)).length, 1);
    assert.equal((await fetch(`${baseUrl}/api/admin/backups/${encodeURIComponent(createdBackup.backup.id)}`, { headers: { cookie, "x-app-version": APP_VERSION } })).status, 200);
    const unsafeRestore = await fetch(`${baseUrl}/api/admin/backups/restore`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ backupId: createdBackup.backup.id, password: "correct-password", confirm: "ДА" })
    });
    assert.equal(unsafeRestore.status, 400);
    assert.equal(typeof maintenance.config?.companyName, "string");
    const settingsSaved = await fetch(`${baseUrl}/api/admin/settings`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ reason: "Test settings", password: "correct-password", config: { ...maintenance.config, companyName: "Test Aluminium", departments: ["Литейный цех"], positions: ["Электромеханик"] } })
    });
    assert.equal(settingsSaved.status, 200);
    const repeatedSettingsOptions = {
      method: "PUT",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION, "x-idempotency-key": "settings-dedupe-test" },
      body: JSON.stringify({ reason: "Idempotency test", password: "correct-password", config: { ...maintenance.config, companyName: "Test Aluminium" } })
    };
    assert.equal((await fetch(`${baseUrl}/api/admin/settings`, repeatedSettingsOptions)).status, 200);
    const repeatedSettings = await fetch(`${baseUrl}/api/admin/settings`, repeatedSettingsOptions).then(response => response.json());
    assert.equal(repeatedSettings.duplicate, true);
    const maintenanceWithHistory = await fetch(`${baseUrl}/api/admin/maintenance`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.equal(maintenanceWithHistory.config.companyName, "Test Aluminium");
    assert.ok(maintenanceWithHistory.configHistory.length > 0);
    const rollback = await fetch(`${baseUrl}/api/admin/settings/rollback`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ versionId: maintenanceWithHistory.configHistory[0].id, reason: "Test rollback", password: "correct-password" })
    });
    assert.equal(rollback.status, 200);
    const restored = await fetch(`${baseUrl}/api/admin/maintenance`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ action: "restore", trashId: maintenance.trash[0].id, password: "correct-password" })
    });
    assert.equal(restored.status, 200);
    const restoredUsers = await fetch(`${baseUrl}/api/users`, { headers: { cookie, "x-app-version": APP_VERSION } }).then(response => response.json());
    assert.ok(restoredUsers.some(user => user.id === worker.id));
    const phoneLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ identifier: "+7 747 540 83 21", password: "worker-password" })
    });
    assert.equal(phoneLogin.status, 200);
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

    for (let index = 0; index < 15; index += 1) {
      await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
        body: JSON.stringify({ identifier: worker.employeeId, password: "wrong-password" })
      });
    }
    const workerBlocked = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ identifier: worker.employeeId, password: "worker-password" })
    });
    assert.equal(workerBlocked.status, 429);
    const unlock = await fetch(`${baseUrl}/api/users/unlock`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ id: worker.id })
    });
    assert.equal(unlock.status, 200);
    const workerAfterUnlock = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-version": APP_VERSION },
      body: JSON.stringify({ identifier: worker.employeeId, password: "worker-password" })
    });
    assert.equal(workerAfterUnlock.status, 200);
  } finally {
    if (serverProcess.exitCode === null) {
      serverProcess.kill("SIGTERM");
      await new Promise(resolve => serverProcess.once("exit", resolve));
    }
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
