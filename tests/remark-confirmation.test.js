const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
let serverProcess;
let baseUrl;
let dataDir;
let serverOutput = "";

function user(id, name, role, area = "") {
  return { id, name, role, area, approved: true, pendingApproval: false };
}

function remark(id, name, role, text, at = "2026-07-16T08:00:00.000Z") {
  return { id, name, role, text, at, resolved: false, resolutionEvents: [], resolutionParticipants: [] };
}

async function reservePorts(count = 2) {
  const servers = [];
  const ports = [];
  for (let index = 0; index < count; index += 1) {
    const holder = net.createServer();
    await new Promise((resolve, reject) => {
      holder.once("error", reject);
      holder.listen(0, "127.0.0.1", resolve);
    });
    servers.push(holder);
    ports.push(holder.address().port);
  }
  await Promise.all(servers.map(holder => new Promise(resolve => holder.close(resolve))));
  return ports;
}

async function waitForHealth(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null) throw new Error(`Server stopped early.\n${serverOutput}`);
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Server did not become ready.\n${serverOutput}`);
}

async function postRemark(key, remarkId, action, actor, extra = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}/api/remark-collaboration`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: `test-${Date.now()}-${Math.random()}`,
      clientId: "remark-workflow-test",
      key,
      remarkId,
      action,
      actor,
      equipmentArea: extra.equipmentArea || "",
      ...extra
    })
  });
  const body = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(body));
  return body;
}

function patchedRemark(response, key, remarkId) {
  return response.state.checks[key].to.commentLog.find(entry => entry.id === remarkId);
}

test.before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-remark-test-"));
  const db = {
    checks: {
      "1:0:2026-07-16": { to: { commentLog: [remark("remark-shop", "Электрик Один", "electrician", "Предупреждение в цехе А")] } },
      "1:1:2026-07-16": { to: { commentLog: [remark("remark-any-author", "Директор производства", "productionDirector", "Предупреждение другой роли")] } },
      "2:0:2026-07-16": { to: { commentLog: [remark("remark-engineer", "Механик Один", "mechanic", "Предупреждение без начальника")] } }
    },
    requests: {},
    inventory: {},
    catalog: {
      equipment: {
        "1": { name: "Оборудование А", area: "Цех А", nodes: ["Узел А1", "Узел А2"] },
        "2": { name: "Оборудование Б", area: "Цех Б", nodes: ["Узел Б1"] }
      }
    },
    directorMessages: [],
    serviceCosts: [],
    downtimes: [],
    compressorJournal: {},
    gasJournal: {},
    pprSheets: {},
    journalDueSince: {},
    auditHistory: [],
    operationalResetAt: "",
    walkShiftCleanupVersion: "",
    users: [
      user("electrician-1", "Электрик Один", "electrician"),
      user("mechanic-1", "Механик Один", "mechanic"),
      user("shop-a", "Начальник А", "shop", "Цех А"),
      user("shop-other", "Начальник Другого Цеха", "shop", "Другой цех"),
      user("engineer-1", "Инженер Один", "engineer"),
      user("director-1", "Директор производства", "productionDirector")
    ],
    translationCache: {},
    pushNotifications: { subscriptions: [], vapid: null }
  };
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify(db, null, 2));
  const [port, qrPort] = await reservePorts(2);
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, [path.join(root, "server.js")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      QR_PORT: String(qrPort),
      DATA_DIR: dataDir,
      DATABASE_URL: "",
      REQUIRE_POSTGRES: "false",
      NODE_ENV: "test"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  serverProcess.stdout.on("data", chunk => { serverOutput += String(chunk); });
  serverProcess.stderr.on("data", chunk => { serverOutput += String(chunk); });
  await waitForHealth(baseUrl);
});

test.after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
    await Promise.race([
      new Promise(resolve => serverProcess.once("exit", resolve)),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("routes every warning to the equipment shop chief and stores the accepted resolution time", async () => {
  const electrician = user("electrician-1", "Подменённое имя", "electrician", "Другой цех");
  const resolved = await postRemark("1:0:2026-07-16", "remark-shop", "resolve", electrician, {
    text: "Исправлено с первой попытки",
    equipmentArea: "Другой цех"
  });
  const pending = patchedRemark(resolved, "1:0:2026-07-16", "remark-shop");
  assert.equal(pending.resolutionPendingConfirmation, true);
  assert.equal(pending.resolutionSubmittedByName, "Электрик Один");
  assert.equal(pending.confirmationArea, "Цех А");
  assert.equal(pending.confirmationRequiredRole, "shop");
  assert.deepEqual(pending.resolutionEvents.at(-1).recipientKeys, ["id:shop-a"]);

  await postRemark(
    "1:0:2026-07-16",
    "remark-shop",
    "confirm",
    user("shop-other", "Подменённый начальник", "shop", "Цех А"),
    { equipmentArea: "Другой цех" },
    403
  );

  const confirmed = await postRemark(
    "1:0:2026-07-16",
    "remark-shop",
    "confirm",
    user("shop-a", "Начальник А", "shop", "Цех А")
  );
  const closed = patchedRemark(confirmed, "1:0:2026-07-16", "remark-shop");
  assert.equal(closed.resolved, true);
  assert.equal(closed.resolvedAt, pending.resolutionSubmittedAt);
  assert.equal(closed.resolvedByName, "Электрик Один");
  assert.equal(closed.confirmedByName, "Начальник А");
  assert.ok(Date.parse(closed.confirmedAt) >= Date.parse(closed.resolvedAt));

  const staleResponse = await fetch(`${baseUrl}/api/state`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: "stale-confirmation-test",
      clientId: "stale-client",
      baseOperationalResetAt: "",
      checks: {
        "1:0:2026-07-16": {
          to: {
            commentLog: [{
              ...closed,
              resolved: false,
              resolvedAt: "",
              resolutionPendingConfirmation: true,
              confirmedAt: "",
              confirmedByName: ""
            }]
          }
        }
      },
      user: user("electrician-1", "Электрик Один", "electrician")
    })
  });
  assert.equal(staleResponse.status, 200);
  const stateAfterStale = await (await fetch(`${baseUrl}/api/state`)).json();
  const protectedRemark = stateAfterStale.checks["1:0:2026-07-16"].to.commentLog.find(entry => entry.id === "remark-shop");
  assert.equal(protectedRemark.resolved, true);
  assert.equal(protectedRemark.resolvedAt, closed.resolvedAt);
  assert.equal(protectedRemark.confirmedAt, closed.confirmedAt);
  assert.equal(protectedRemark.confirmedByName, "Начальник А");

  const otherRole = await postRemark(
    "1:1:2026-07-16",
    "remark-any-author",
    "resolve",
    user("director-1", "Директор производства", "productionDirector"),
    { text: "Устранено автором другой роли", equipmentArea: "Другой цех" }
  );
  const otherPending = patchedRemark(otherRole, "1:1:2026-07-16", "remark-any-author");
  assert.equal(otherPending.confirmationRequiredRole, "shop");
  assert.deepEqual(otherPending.resolutionEvents.at(-1).recipientKeys, ["id:shop-a"]);
});

test("falls back to the engineer, returns only to the last performer, and accepts the latest attempt", async () => {
  const mechanic = user("mechanic-1", "Механик Один", "mechanic");
  const electrician = user("electrician-1", "Электрик Один", "electrician");
  const engineer = user("engineer-1", "Инженер Один", "engineer");

  await postRemark("2:0:2026-07-16", "remark-engineer", "start", mechanic);
  await postRemark("2:0:2026-07-16", "remark-engineer", "add", mechanic, { participant: electrician });
  const firstResolve = await postRemark("2:0:2026-07-16", "remark-engineer", "resolve", mechanic, {
    text: "Первая попытка",
    equipmentArea: "Цех А"
  });
  const firstPending = patchedRemark(firstResolve, "2:0:2026-07-16", "remark-engineer");
  assert.equal(firstPending.confirmationRequiredRole, "engineer");
  assert.deepEqual(firstPending.resolutionEvents.at(-1).recipientKeys, ["id:engineer-1"]);

  const returnedResponse = await postRemark("2:0:2026-07-16", "remark-engineer", "return", engineer, {
    reason: "Нужно переделать"
  });
  const returned = patchedRemark(returnedResponse, "2:0:2026-07-16", "remark-engineer");
  assert.equal(returned.resolutionPendingConfirmation, false);
  assert.equal(returned.resolutionReturnReason, "Нужно переделать");
  assert.deepEqual(returned.resolutionEvents.at(-1).recipientKeys, ["id:mechanic-1"]);

  await new Promise(resolve => setTimeout(resolve, 10));
  const secondResolve = await postRemark("2:0:2026-07-16", "remark-engineer", "resolve", electrician, {
    text: "Повторно устранено другим сотрудником"
  });
  const secondPending = patchedRemark(secondResolve, "2:0:2026-07-16", "remark-engineer");
  assert.equal(secondPending.resolutionSubmittedByName, "Электрик Один");
  assert.notEqual(secondPending.resolutionSubmittedAt, firstPending.resolutionSubmittedAt);
  assert.equal(secondPending.resolutionReturnedAt, "");

  const finalResponse = await postRemark("2:0:2026-07-16", "remark-engineer", "confirm", engineer);
  const finalRemark = patchedRemark(finalResponse, "2:0:2026-07-16", "remark-engineer");
  assert.equal(finalRemark.resolvedAt, secondPending.resolutionSubmittedAt);
  assert.equal(finalRemark.resolvedByName, "Электрик Один");
  assert.equal(finalRemark.resolvedComment, "Повторно устранено другим сотрудником");
  assert.equal(finalRemark.confirmedByName, "Инженер Один");

  const reportResponse = await fetch(`${baseUrl}/api/export/month.xls?month=2026-07`);
  assert.equal(reportResponse.status, 200);
  const report = await reportResponse.text();
  assert.match(report, /Время устранения/);
  assert.match(report, /Время подтверждения/);
  assert.match(report, /Повторно устранено другим сотрудником/);
  assert.match(report, new RegExp(secondPending.resolutionSubmittedAt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("the common warning hall excludes pending confirmations", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /function commonHallRemarkEntries[\s\S]*?!entry\.resolutionPendingConfirmation/);
  assert.match(source, /return commonHallRemarkEntries\(rec\?\.to \|\| \{\}\)\.map/);
  assert.match(source, /if \(item\?\.resolutionPendingConfirmation\) return canCurrentUserConfirmRemark\(item\)/);
});
