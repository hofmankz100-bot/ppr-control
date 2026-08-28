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
  return { id, employeeId: id, name, role, area, approved: true, pendingApproval: false };
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
    headers: { "content-type": "application/json", "x-test-user-id": actor.id },
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

async function postEngineerRequest(action, actor, extra = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}/api/engineer-request/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: `engineer-request-test-${Date.now()}-${Math.random()}`,
      clientId: "engineer-request-test",
      action,
      actor,
      ...extra
    })
  });
  const body = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(body));
  return body;
}

test.before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-remark-test-"));
  const db = {
    checks: {
      "1:0:2026-07-16": { to: { commentLog: [remark("remark-shop", "Электрик Один", "electrician", "Предупреждение в цехе А")] } },
      "1:1:2026-07-16": { to: { commentLog: [remark("remark-any-author", "Директор производства", "productionDirector", "Предупреждение другой роли")] } },
      "2:0:2026-07-16": { to: { commentLog: [remark("remark-engineer", "Механик Один", "mechanic", "Предупреждение без начальника")] } }
      ,
      "10:0:2026-07-16": { to: { commentLog: [remark("remark-gas-10", "Электрик Один", "electrician", "Проверить регулятор", "2026-07-16T05:30:00.000Z")] } },
      "3:0:2026-07-16": {
        to: {
          commentLog: [{
            ...remark("remark-existing-pending", "Existing Worker", "mechanic", "Existing pending repair"),
            resolutionPendingConfirmation: true,
            resolutionSubmittedAt: "2026-07-16T10:30:00.000Z",
            resolutionSubmittedByKey: "id:mechanic-1",
            resolutionSubmittedByName: "Mechanic One",
            resolutionSubmittedByRole: "mechanic",
            resolutionSubmittedComment: "Repair already submitted"
          }]
        }
      },
      "1:2:2026-07-16": {
        to: {
          commentLog: [{
            ...remark("remark-repair-assignment", "Начальник А", "shop", "Старая неверная привязка"),
            resolutionParticipants: [user("shop-a", "Начальник А", "shop", "Цех А")],
            resolutionCompletedParticipants: [user("shop-a", "Начальник А", "shop", "Цех А")]
          }]
        }
      }
    },
    requests: {
      "ordinary-request": { id: "ordinary-request", kind: "tmc", text: "Обычная заявка", createdAt: "2026-07-16T08:00:00.000Z", updatedAt: "2026-07-16T08:00:00.000Z" },
      "legacy-warehouse-request": { id: "legacy-warehouse-request", kind: "tmc", text: "Старая активная заявка", status: "warehouse", cashApproved: true, transferredToWarehouse: true, done: false, stock: false, createdAt: "2026-07-16T08:00:00.000Z", updatedAt: "2026-07-16T08:00:00.000Z" },
      "stock-issue:preserve": { id: "stock-issue:preserve", kind: "stock", text: "Складская операция", issued: true, createdAt: "2026-07-16T08:00:00.000Z", updatedAt: "2026-07-16T08:00:00.000Z" }
    },
    inventory: {
      "inventory-preserve": { id: "inventory-preserve", name: "Подшипник", qty: 12, updatedAt: "2026-07-16T08:00:00.000Z" }
    },
    catalog: {
      equipment: {
        "1": { name: "Оборудование А", area: "Цех А", nodes: ["Узел А1", "Узел А2"] },
        "2": { name: "Оборудование Б", area: "Цех Б", nodes: ["Узел Б1"] },
        "3": { name: "Paint equipment", area: "Покрасочный цех", nodes: ["Paint node"] }
      }
    },
    serviceCosts: [],
    downtimes: [
      {
        id: "downtime-test-1",
        key: "1:0",
        equipmentId: 1,
        nodeIndex: 0,
        equipment: "Equipment A",
        node: "Node A1",
        type: "breakdown",
        comment: "Stopped for test",
        startedAt: "2026-07-16T08:00:00.000Z",
        endedAt: "",
        authorName: "Electrician One",
        authorRole: "electrician"
      },
      {
        id: "downtime-resolution-flow",
        key: "2:0",
        equipmentId: 2,
        nodeIndex: 0,
        equipment: "Equipment B",
        node: "Node B1",
        type: "breakdown",
        comment: "Resolution workflow stop",
        startedAt: "2026-07-16T08:00:00.000Z",
        endedAt: "",
        authorName: "Mechanic One",
        authorRole: "mechanic"
      },
      {
        id: "downtime-existing-pending",
        key: "3:0",
        equipmentId: 3,
        nodeIndex: 0,
        equipment: "Paint equipment",
        node: "Paint node",
        type: "breakdown",
        comment: "Existing active painting-shop stop",
        startedAt: "2026-07-16T09:00:00.000Z",
        endedAt: "",
        authorName: "Existing Worker",
        authorRole: "mechanic"
      }
    ],
    compressorJournal: {},
    gasJournal: {
      "B::2026-07-16": {
        id: "B::2026-07-16",
        section: "B",
        date: "2026-07-16",
        entryStatus: "fixed",
        grpQrChecks: {
          "day:1": {
            grpNumber: 1,
            route: "ГРП - Печь №1",
            shift: "day",
            shiftLabel: "День",
            at: "2026-07-16T08:00:00.000Z",
            status: "remark",
            comment: "Предупреждение в цехе А",
            sourceRecordKey: "1:0:2026-07-16",
            remarkId: "remark-shop",
            byName: "Электрик Один",
            byRole: "electrician"
          }
        }
      }
    },
    qrWalkJournal: [{
      id: "10:0:2026-07-16:technical:day",
      equipmentId: 10,
      nodeIndex: 0,
      date: "2026-07-16",
      shift: "day",
      group: "technical",
      at: "2026-07-16T05:29:00.000Z",
      byRole: "electrician",
      byName: "Электрик Один",
      equipment: "Газовое хозяйство",
      node: "Газорегуляторный пункт (ГРП)№10"
    }],
    pprSheets: {},
    journalDueSince: {},
    auditHistory: [],
    operationalResetAt: "",
    walkShiftCleanupVersion: "",
    users: [
      user("welder-1", "Сварщик Один", "welder"),
      user("electrician-1", "Электрик Один", "electrician"),
      user("mechanic-1", "Механик Один", "mechanic"),
      user("shop-a", "Начальник А", "shop", "Цех А"),
      user("shop-other", "Начальник Другого Цеха", "shop", "Другой цех"),
      user("engineer-1", "Инженер Один", "engineer"),
      user("director-1", "Директор производства", "productionDirector"),
      user("editor-1", "Администратор", "editor"),
      { employeeId: "legacy-77", name: "Старый сотрудник", role: "mechanic", approved: true, pendingApproval: false },
      user("shop-a-2", "Second Shop Chief", "shop", "Цех А"),
      user("repair-worker", "Repair Worker", "mechanic"),
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

test("startup stops an existing painting-shop downtime already awaiting chief confirmation", async () => {
  const state = await (await fetch(`${baseUrl}/api/state`)).json();
  const stop = state.downtimes.find(item => item.id === "downtime-existing-pending");
  const pending = state.checks["3:0:2026-07-16"].to.commentLog.find(item => item.id === "remark-existing-pending");
  assert.equal(stop.endedAt, pending.resolutionSubmittedAt);
  assert.equal(stop.closeAwaitingConfirmation, true);
  assert.equal(stop.closedByRemarkId, pending.id);
  assert.deepEqual(pending.resolutionDowntimeIds, [stop.id]);
  const recoveredGasQr = state.gasJournal["B::2026-07-16"].grpQrChecks["day:10"];
  assert.equal(recoveredGasQr.route, "ГРП - Печь №10");
  assert.equal(recoveredGasQr.status, "remark");
  assert.equal(recoveredGasQr.comment, "Проверить регулятор");
  assert.equal(recoveredGasQr.remarkId, "remark-gas-10");
  assert.match(state.gasJournal["B::2026-07-16"].gasSmell, /ГРП - Печь №10 — Есть запах газа/);
});

test("closes a downtime only after the dedicated server action and protects it from stale reopen", async () => {
  const response = await fetch(`${baseUrl}/api/downtime-close`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: "downtime-close-test",
      clientId: "downtime-test-client",
      downtimeId: "downtime-test-1",
      comment: "Equipment started",
      actor: user("mechanic-1", "Mechanic One", "mechanic")
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.ok(body.downtime.endedAt);
  assert.equal(body.downtime.closeComment, "Equipment started");
  assert.equal(body.downtime.closedByRole, "mechanic");

  const stale = await fetch(`${baseUrl}/api/node-update`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: "downtime-stale-reopen-test",
      clientId: "stale-downtime-client",
      key: "1:0:2026-07-16",
      record: { to: { commentLog: [] } },
      downtimes: [{ ...body.downtime, endedAt: "", closeComment: "", closedByName: "" }]
    })
  });
  assert.equal(stale.status, 200);
  const state = await (await fetch(`${baseUrl}/api/state`)).json();
  const protectedStop = state.downtimes.find(item => item.id === "downtime-test-1");
  assert.ok(protectedStop.endedAt);
  assert.equal(protectedStop.closeComment, "Equipment started");
});

test("routes every warning to the equipment shop chief and stores the accepted resolution time", async () => {
  const electrician = user("electrician-1", "Подменённое имя", "mechanic", "Другой цех");
  const resolved = await postRemark("1:0:2026-07-16", "remark-shop", "resolve", electrician, {
    text: "Исправлено с первой попытки",
    equipmentArea: "Другой цех"
  });
  const pending = patchedRemark(resolved, "1:0:2026-07-16", "remark-shop");
  assert.equal(pending.resolutionPendingConfirmation, true);
  assert.equal(pending.resolutionSubmittedByName, "Электрик Один");
  assert.equal(pending.resolutionSubmittedByRole, "electrician");
  assert.equal(pending.confirmationArea, "Цех А");
  assert.equal(pending.confirmationRequiredRole, "shop");
  assert.deepEqual(pending.resolutionEvents.at(-1).recipientKeys.sort(), ["id:editor-1", "id:shop-a", "id:shop-a-2"]);

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
  const linkedGrpRow = confirmed.state.gasJournal["B::2026-07-16"];
  assert.match(linkedGrpRow.actions, /Устранено:/);
  assert.match(linkedGrpRow.actions, /Исправлено с первой попытки/);
  assert.match(linkedGrpRow.actions, /Электрик Один/);
  assert.equal(linkedGrpRow.grpQrChecks["day:1"].resolvedAt, closed.resolvedAt);

  await postRemark(
    "1:0:2026-07-16",
    "remark-shop",
    "confirm",
    user("shop-a-2", "Second Shop Chief", "shop", "Цех А"),
    {},
    409
  );
  await postRemark(
    "1:0:2026-07-16",
    "remark-shop",
    "return",
    user("shop-a-2", "Second Shop Chief", "shop", "Цех А"),
    { reason: "Late return" },
    409
  );

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
  assert.deepEqual(otherPending.resolutionEvents.at(-1).recipientKeys.sort(), ["id:editor-1", "id:shop-a", "id:shop-a-2"]);
});

test("an admin deletes only the selected obsolete personal remark", async () => {
  await postRemark(
    "1:1:2026-07-16",
    "remark-any-author",
    "delete",
    user("shop-a", "Shop Chief", "shop", "Цех А"),
    {},
    403
  );
  await postRemark(
    "1:1:2026-07-16",
    "remark-any-author",
    "delete",
    user("editor-1", "Administrator", "editor")
  );
  const state = await (await fetch(`${baseUrl}/api/state`)).json();
  assert.equal(
    state.checks["1:1:2026-07-16"].to.commentLog.some(entry => entry.id === "remark-any-author"),
    false
  );
  assert.equal(
    state.checks["1:0:2026-07-16"].to.commentLog.some(entry => entry.id === "remark-shop"),
    true
  );
});

test("falls back to the engineer, returns only to the last performer, and accepts the latest attempt", async () => {
  const mechanic = user("mechanic-1", "Механик Один", "mechanic");
  const electrician = user("electrician-1", "Электрик Один", "electrician");
  const engineer = user("engineer-1", "Инженер Один", "engineer");

  await postRemark("2:0:2026-07-16", "remark-engineer", "start", mechanic);
  await postRemark("2:0:2026-07-16", "remark-engineer", "add", mechanic, { participant: electrician });
  const withWelder = await postRemark("2:0:2026-07-16", "remark-engineer", "add", mechanic, {
    participant: user("welder-1", "Сварщик Один", "welder")
  });
  assert.deepEqual(
    patchedRemark(withWelder, "2:0:2026-07-16", "remark-engineer").resolutionParticipants.map(item => item.role).sort(),
    ["electrician", "mechanic", "welder"]
  );
  const firstResolve = await postRemark("2:0:2026-07-16", "remark-engineer", "resolve", mechanic, {
    text: "Первая попытка",
    equipmentArea: "Цех А"
  });
  const firstPending = patchedRemark(firstResolve, "2:0:2026-07-16", "remark-engineer");
  assert.equal(firstPending.confirmationRequiredRole, "engineer");
  assert.deepEqual(firstPending.resolutionEvents.at(-1).recipientKeys.sort(), ["id:editor-1", "id:engineer-1"]);
  const stoppedOnSubmission = firstResolve.state.downtimes.find(item => item.id === "downtime-resolution-flow");
  assert.equal(stoppedOnSubmission.endedAt, firstPending.resolutionSubmittedAt);
  assert.equal(stoppedOnSubmission.closeAwaitingConfirmation, true);
  assert.deepEqual(firstPending.resolutionDowntimeIds, ["downtime-resolution-flow"]);

  const returnedResponse = await postRemark("2:0:2026-07-16", "remark-engineer", "return", engineer, {
    reason: "Нужно переделать"
  });
  const returned = patchedRemark(returnedResponse, "2:0:2026-07-16", "remark-engineer");
  assert.equal(returned.resolutionPendingConfirmation, false);
  assert.equal(returned.resolutionReturnReason, "Нужно переделать");
  assert.deepEqual(returned.resolutionEvents.at(-1).recipientKeys, ["id:mechanic-1"]);
  assert.equal(returned.resolutionEvents.at(-1).targetKey, "id:mechanic-1");
  assert.equal(returned.resolutionEvents.at(-1).targetRole, "mechanic");
  const resumedDowntime = returnedResponse.state.downtimes.find(item =>
    item.continuedFromDowntimeId === "downtime-resolution-flow" && !item.endedAt
  );
  assert.ok(resumedDowntime);
  assert.equal(resumedDowntime.startedAt, returned.resolutionReturnedAt);

  const staleReturnResponse = await fetch(`${baseUrl}/api/state`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: "stale-return-test",
      clientId: "stale-return-client",
      baseOperationalResetAt: "",
      checks: {
        "2:0:2026-07-16": {
          to: {
            commentLog: [{
              ...returned,
              resolutionPendingConfirmation: true,
              resolutionReturnedAt: "",
              resolutionReturnedByKey: "",
              resolutionReturnedByName: "",
              resolutionReturnReason: "",
              resolutionEvents: returned.resolutionEvents.slice(0, -1)
            }]
          }
        }
      },
      user: mechanic
    })
  });
  assert.equal(staleReturnResponse.status, 200);
  const stateAfterStaleReturn = await (await fetch(`${baseUrl}/api/state`)).json();
  const protectedReturn = stateAfterStaleReturn.checks["2:0:2026-07-16"].to.commentLog.find(entry => entry.id === "remark-engineer");
  assert.equal(protectedReturn.resolutionPendingConfirmation, false);
  assert.equal(protectedReturn.resolutionReturnedAt, returned.resolutionReturnedAt);
  assert.equal(protectedReturn.resolutionReturnedByName, returned.resolutionReturnedByName);
  assert.equal(protectedReturn.resolutionEvents.at(-1).action, "returned");

  await new Promise(resolve => setTimeout(resolve, 10));
  const secondResolve = await postRemark("2:0:2026-07-16", "remark-engineer", "resolve", electrician, {
    text: "Повторно устранено другим сотрудником"
  });
  const secondPending = patchedRemark(secondResolve, "2:0:2026-07-16", "remark-engineer");
  assert.equal(secondPending.resolutionSubmittedByName, "Электрик Один");
  assert.notEqual(secondPending.resolutionSubmittedAt, firstPending.resolutionSubmittedAt);
  assert.equal(secondPending.resolutionReturnedAt, "");
  const stoppedAfterRework = secondResolve.state.downtimes.find(item => item.id === resumedDowntime.id);
  assert.equal(stoppedAfterRework.endedAt, secondPending.resolutionSubmittedAt);
  assert.equal(stoppedAfterRework.closeAwaitingConfirmation, true);

  const finalResponse = await postRemark("2:0:2026-07-16", "remark-engineer", "confirm", engineer);
  const finalRemark = patchedRemark(finalResponse, "2:0:2026-07-16", "remark-engineer");
  const confirmedDowntime = finalResponse.state.downtimes.find(item => item.id === resumedDowntime.id);
  assert.equal(confirmedDowntime.closeAwaitingConfirmation, false);
  assert.equal(finalRemark.resolvedAt, secondPending.resolutionSubmittedAt);
  assert.equal(finalRemark.resolvedByName, "Электрик Один");
  assert.equal(finalRemark.resolvedComment, "Повторно устранено другим сотрудником");
  assert.equal(finalRemark.confirmedByName, "Инженер Один");
  assert.deepEqual(finalRemark.resolutionCompletedParticipants.map(item => item.key).sort(), ["id:electrician-1", "id:mechanic-1", "id:welder-1"]);

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
  assert.match(source, /if \(item\?\.resolutionPendingConfirmation\) return canCurrentUserConfirmRemark\(item, eq\)/);
});

test("workers accumulate one server-side engineer draft that is editable and locks after formation", async () => {
  const mechanic = user("mechanic-1", "Механик Один", "mechanic");
  const electrician = user("electrician-1", "Электрик Один", "electrician");
  const engineer = user("engineer-1", "Инженер Один", "engineer");
  const first = await postEngineerRequest("submit", mechanic, {
    area: "Цех А",
    items: [{ name: "Подшипник", article: "A-1", unit: "шт", requestedQty: 1, requiredQty: 2 }]
  });
  const second = await postEngineerRequest("submit", electrician, {
    area: "Цех Б",
    items: [{ name: "Подшипник", article: "A-1", unit: "шт", requestedQty: 2, requiredQty: 3 }]
  });
  assert.equal(second.request.id, first.request.id);
  assert.equal(second.request.items.length, 2);
  assert.deepEqual(second.request.items.map(item => item.sourceRole).sort(), ["electrician", "mechanic"]);

  await postEngineerRequest("edit-item", mechanic, {
    requestId: second.request.id,
    itemId: second.request.items[0].id,
    item: { ...second.request.items[0], name: "Запрещённое изменение" }
  }, 403);
  const edited = await postEngineerRequest("edit-item", engineer, {
    requestId: second.request.id,
    itemId: second.request.items[0].id,
    item: { ...second.request.items[0], note: "Проверено инженером" }
  });
  assert.equal(edited.request.items[0].note, "Проверено инженером");

  const merged = await postEngineerRequest("merge-items", engineer, { requestId: second.request.id });
  assert.equal(merged.request.items.length, 1);
  assert.equal(merged.request.items[0].requestedQty, 3);
  assert.equal(merged.request.items[0].requiredQty, 5);
  assert.equal(merged.request.items[0].sources.length, 2);

  const formed = await postEngineerRequest("form", engineer, { requestId: second.request.id });
  assert.ok(formed.request.formedAt);
  assert.equal(formed.request.engineerApproved, true);
  assert.equal(formed.request.status, "manualFormed");
  await postEngineerRequest("edit-item", engineer, {
    requestId: second.request.id,
    itemId: merged.request.items[0].id,
    item: merged.request.items[0]
  }, 409);
});

test("confirmation is handled in the personal role inbox instead of the PPR node", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(html, /id="rolePersonalInbox"/);
  assert.match(source, /function renderRolePersonalInbox\(\)/);
  assert.match(source, /data-personal-remark-confirm/);
  assert.match(source, /data-personal-remark-return/);
  assert.match(source, /role === profile\?\.role && Boolean\(ROLE_ACCESS\[role\]\)/);
  assert.doesNotMatch(source, /<button[^>]+data-remark-confirm/);
  const reminderPanel = source.slice(source.indexOf("function renderGlobalReminderPanel"), source.indexOf("function updateGlobalReminderBadge"));
  assert.doesNotMatch(reminderPanel, /personalRemarkMessages|personal-remark-inbox|data-open-personal-remark/);
  assert.doesNotMatch(html, /id="personalInboxButton"/);
  assert.match(source, /const personalCount = personalRemarkMessages\(\)\.length/);
  assert.match(source, /isEditorSession\(\) && role === "engineer"/);
  assert.match(source, /role-personal-count">Личные:/);
  assert.match(source, /function canSeeRequestRoleIndicator[\s\S]*?if \(MANUAL_REQUEST_WORKFLOW\)[\s\S]*?if \(isEditorSession\(\)\) return role === "engineer"[\s\S]*?return role === profile\?\.role/);
  assert.match(source, /if \(profile\?\.role === "editor"\) return role === "all" \|\| Boolean\(ROLE_ACCESS\[role\]\)/);
  assert.doesNotMatch(styles, /\.quick-nav \[data-open-role\]:not\(\[data-open-role="warehouse"\]\)/);
});

test("the rating uses the agreed simple values and accepted-work rules", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /journal:\s*2/);
  assert.match(source, /qrShift:\s*3/);
  assert.match(source, /ppr:\s*5/);
  assert.match(source, /pprPress:\s*6/);
  assert.match(source, /remark:\s*10/);
  assert.match(source, /remarkPress:\s*15/);
  assert.match(source, /breakdown:\s*20/);
  assert.match(source, /breakdownPress:\s*30/);
  assert.match(source, /returnPenalty:\s*-1/);
  assert.match(source, /if \(event\.confirmedAt && inPeriod\(event\.confirmedAt\)\)/);
  assert.match(source, /Number\(penaltiesByWorker\.get\(key\) \|\| 0\) >= 2/);
  assert.match(source, /if \(item\.type === "production"\) return/);
});

test("mobile workers use the same engineer inbox instead of a WhatsApp-only draft", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const submitHandler = source.slice(source.indexOf('ui.tmcRequestForm?.addEventListener("submit"'), source.indexOf('ui.requestSearchInput?.addEventListener'));
  assert.ok(submitHandler.indexOf("if (workerSendsTmcRequestToEngineer())") < submitHandler.indexOf("if (mobileShareMode())"));
  assert.match(submitHandler, /publishEngineerRequestAction\("submit", submission\)/);
  assert.match(source, /if \(req\.engineerCombinedBatch && !req\.formedAt\) return false/);
  assert.match(source, /Редактируется · печать после формирования/);
});

test("every signed-in role sees only the factory reliability graph while engineer roles see the detailed report", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /if \(view === "engineerReport"\) return isProfileReady\(\)/);
  assert.match(source, /ui\.factoryStatusButton\.hidden = !isProfileReady\(\)/);
  assert.match(source, /const detailed = \["engineer", "editor"\]\.includes\(profile\?\.role\)/);
  assert.match(source, /if \(!detailed\) \{[\s\S]*?directorFactoryAnalyticsGraphHtml\(\)[\s\S]*?return;/);
  assert.match(source, /if \(controls\) controls\.hidden = !detailed/);
});

test("node editing permission is selective per equipment and admin keeps full access", async () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(source, /if \(role === "editor"\) return true;/);
  assert.match(source, /if \(!isEquipmentCatalogEditingEnabled\(eq\)\) return false;/);
  assert.match(source, /catalogEditorRole\(\) !== "editor"/);
  assert.match(source, /return permissionBaseRole\(authenticatedProfile\?\.role \|\| profile\?\.role \|\| ""\)/);
  assert.match(serverSource, /const catalogRole = permissionBaseRoleServer\(authenticatedRole\)/);
  assert.match(serverSource, /\["editor", "engineer", "shop"\]\.includes\(catalogRole\)/);
  assert.match(source, /function availableEquipmentAreas\(\)/);
  assert.match(source, /const nextArea = String\(patch\?\.area \|\| eq\.area\)/);
  assert.match(source, /data-equipment-area=/);
  assert.match(serverSource, /const requestedArea = String\(rawItem\.area \|\| currentItem\.area \|\| ""\)/);
  assert.match(source, /Разрешить редактирование/);

  const before = await (await fetch(`${baseUrl}/api/state`)).json();
  const response = await fetch(`${baseUrl}/api/state`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: "locked-press-catalog-test",
      clientId: "admin-test",
      user: { role: "editor", authenticatedRole: "editor" },
      catalog: {
        equipment: {
          "1": { ...before.catalog.equipment["1"], name: "Changed press", nodes: ["Changed node"] },
          "2": { ...before.catalog.equipment["2"], name: "Changed press 2", nodes: ["Changed node 2"] }
        }
      }
    })
  });
  assert.equal(response.status, 200);
  const after = await (await fetch(`${baseUrl}/api/state`)).json();
  assert.equal(after.catalog.equipment["1"].name, "Changed press");
  assert.deepEqual(after.catalog.equipment["1"].nodes, ["Changed node"]);
  assert.equal(after.catalog.equipment["2"].name, "Changed press 2");
  assert.deepEqual(after.catalog.equipment["2"].nodes, ["Changed node 2"]);
});

test("deleted and renamed equipment nodes cannot return from stale clients", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const equipmentRoute = fs.readFileSync(path.join(root, "server", "admin-equipment-maintenance-route.js"), "utf8");
  assert.match(source, /state\.catalog\.equipment = \{ \.\.\.\(remote\.catalog\?\.equipment \|\| \{\}\) \}/);
  assert.match(serverSource, /function repairCatalogNodeHistory\(db\)/);
  assert.match(serverSource, /entry\?\.action !== "equipment_node_deleted"/);
  assert.match(equipmentRoute, /catalogNodeTombstone\(catalogItem, nodes\[nodeIndex\]/);
  assert.match(serverSource, /incomingUpdatedAt < currentUpdatedAt/);
  assert.match(serverSource, /removed\.has\(normalizedCatalogNodeName\(value\)\)/);
});

test("SHGRP QR nodes are restored in their historical index order", () => {
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(serverSource, /const GAS_QR_EQUIPMENT_ID = "15"/);
  assert.match(serverSource, /function restoreGasQrCatalog\(db\)/);
  assert.match(serverSource, /item\.nodeHistoryRestoredAt = now/);
  assert.match(serverSource, /"Газорегуляторный пункт \(ГРП\) №11"/);
  assert.match(serverSource, /"ПСК"/);
  assert.match(serverSource, /restoreGasQrCatalog\(db\)/);
  assert.match(serverSource, /function restorePress2400Catalog\(db\)/);
  assert.match(serverSource, /restorePress2400Catalog\(db\)/);
  assert.match(serverSource, /production-backup-20260810-v1/);
});

test("admin can rotate one node QR without changing other node indexes", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const equipmentQrRoute = fs.readFileSync(path.join(root, "server", "admin-equipment-qr-route.js"), "utf8");
  assert.match(client, /data-rotate-node-qr/);
  assert.match(client, /function currentNodeQrMatches\(parsed = \{\}\)/);
  assert.match(client, /api\/admin\/equipment\/node-qr-rotate/);
  assert.match(client, /async function rotateNodeQr\(equipmentId, nodeIndex\)/);
  assert.doesNotMatch(client, /persistStateLocally\(state\);\s*printNodeQrCode\(/);
  assert.match(client, /QR обновлён\. Для печати нажмите отдельную кнопку/);
  assert.match(equipmentQrRoute, /pathname !== "\/api\/admin\/equipment\/node-qr-rotate"/);
  assert.match(equipmentQrRoute, /randomBytes\(12\)\.toString\("hex"\)/);
  assert.match(serverSource, /error: "node_qr_replaced"/);
});

test("admin can print one existing node QR without rotating it", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(client, /data-print-node-qr=/);
  assert.match(client, /Печатать QR/);
  assert.match(client, /node-admin-action-groups/);
  assert.match(client, /equipment-secondary-tools/);
  assert.match(client, /querySelector\("\[data-print-node-qr\]"\)/);
  assert.match(client, /printNodeQrCode\(eq, index\)/);
  assert.match(client, /class="qr-back"/);
  assert.match(client, /@media\(max-width:700px\)/);
  assert.match(client, /\.actions\{display:none\}/);
  assert.match(client, /meta name="viewport" content="width=device-width,initial-scale=1"><title>QR -/);
  assert.match(client, /\.sheet\{width:94\.5mm;height:136mm/);
  assert.match(client, /\.qr img\{width:80mm;height:80mm/);
  assert.match(client, /@page\{size:A4 portrait;margin:8mm\}/);
  assert.match(client, /@media print\{body\{background:#fff;padding-top:0\}\.sheet\{margin:0\}/);
});

test("registered employees can be searched by name phone or employee number", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(client, /data-director-user-search/);
  assert.match(client, /Введите имя, телефон или табельный номер/);
  assert.match(client, /data-director-user-row data-user-search=/);
  assert.match(client, /const filterDirectorUsers = \(\) =>/);
  assert.match(client, /const digits = query\.replace\(\/\\D\/g, ""\)/);
  assert.match(client, /row\.hidden = !matches/);
  assert.match(css, /\[data-director-user-row\]\[hidden\][\s\S]*?display:\s*none\s*!important/);
  assert.match(client, /Сотрудник не найден/);
  assert.match(css, /\.director-user-search input/);
  assert.match(css, /html\[data-theme="dark"\] \.director-user-search input/);
  assert.match(client, /const pageSize = 20/);
  assert.match(client, /data-director-user-page/);
});

test("idle synchronization avoids repeated user loads and oversized local storage", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const realtimeHandler = client.slice(client.indexOf("function handleRealtimeMessage"), client.indexOf("async function syncRemoteChanges"));
  assert.doesNotMatch(realtimeHandler, /loadRemoteUsers\(\)/);
  assert.match(client, /now - lastRemoteUsersPollAt < 30000/);
  assert.match(client, /if \(appBootstrapComplete\) \{[\s\S]*?syncRemoteChanges\(\)/);
  assert.match(client, /await loadRemoteState\(\);\s*appBootstrapComplete = true;/);
  const localLoad = client.slice(client.indexOf("function loadState()"), client.indexOf("function persistStateLocally"));
  const remoteMerge = client.slice(client.indexOf("function mergeRemoteState"), client.indexOf("function mergeRealtimePatch"));
  assert.doesNotMatch(localLoad, /remoteMigrationChanged[\s\S]*?STORE_KEY.*pending/);
  assert.doesNotMatch(remoteMerge, /journalCleanup\.changed[\s\S]*?STORE_KEY.*pending/);
  assert.match(client, /Object\.entries\(snapshot\?\.checks \|\| \{\}\)\.slice\(-500\)/);
  assert.doesNotMatch(client.slice(client.indexOf("function persistStateLocally"), client.indexOf("let devicePersistTimer")), /\.\.\.snapshot/);
});

test("mobile journal print windows create a shareable PDF while desktop keeps printing", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(client, /function finalizeJournalPopup\(popup, requestedTitle = ""\)/);
  assert.match(client, /data-mobile-journal-share>Отправить PDF/);
  assert.match(client, /popup\.navigator\.share/);
  assert.match(client, /popup\.navigator\.share\(\{ files: \[file\] \}\)/);
  assert.match(client, /popup\.document\.close\(\);/);
  assert.match(client, /finalizeJournalPopup\(popup\)/);
  assert.match(client, /finalizeJournalPopup\(win\)/);
});

test("new catalog nodes are registered atomically with a permanent QR identity", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server", "admin-equipment-maintenance-route.js"), "utf8");
  assert.match(client, /async function addNodeName\(equipmentId, value\)/);
  assert.match(client, /\/api\/admin\/equipment\/node-add/);
  assert.match(client, /mergeRemoteState\(result\.state, \{ preferRemote: true \}\)/);
  assert.match(client, /\.\.\.override,[\s\S]*id: eq\.id,[\s\S]*name: override\.name \|\| eq\.name/);
  assert.match(server, /pathname === "\/api\/admin\/equipment\/node-add"/);
  assert.match(server, /catalogItem\.nodeCreatedAt\[nodeIndex\]/);
  assert.match(server, /catalogItem\.qrTokens\[nodeIndex\] = randomBytes\(12\)/);
  assert.match(server, /broadcastState\("equipment-node-added"/);
  assert.match(client, /function syncOpenEquipmentLabels\(equipmentId, name, area, nodeIndex = null, nodeName = ""\)/);
  assert.match(client, /syncOpenEquipmentLabels\(equipmentId, nextName, nextArea\)/);
  assert.match(client, /syncOpenEquipmentLabels\(equipmentId, eq\.name, eq\.area, nodeIndex, nextName\)/);
});

test("admin can create complete equipment cards from the main screen", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server", "admin-equipment-config-route.js"), "utf8");
  assert.match(client, /data-create-equipment/);
  assert.match(client, /function openCreateEquipmentDialog\(\)/);
  assert.match(client, /Обычное оборудование/);
  assert.match(client, /\/api\/admin\/equipment\/create/);
  assert.match(client, /item\?\.created === true/);
  assert.match(server, /pathname === "\/api\/admin\/equipment\/create"/);
  assert.match(server, /equipmentId = Math\.max\(999, \.\.\.usedIds\) \+ 1/);
  assert.match(server, /created: true/);
  assert.match(server, /broadcastState\("equipment-created"/);
});

test("admin can move any equipment to trash and restore it with its journal", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server", "admin-equipment-maintenance-route.js"), "utf8");
  const maintenanceRoute = fs.readFileSync(path.join(root, "server", "admin-maintenance-route.js"), "utf8");
  assert.match(client, /profile\?\.role === "editor" \? `<button[^`]*data-delete-equipment/);
  assert.match(client, /\/api\/admin\/equipment\/delete/);
  assert.match(server, /pathname === "\/api\/admin\/equipment\/delete"/);
  assert.match(server, /if \(!existing\) return \{ error: "equipment_not_found" \}/);
  assert.doesNotMatch(server, /body\.builtIn === true/);
  assert.match(server, /type: "equipment"/);
  assert.match(server, /snapshot: \{[\s\S]*catalogItem: \{ \.\.\.item \}/);
  assert.match(maintenanceRoute, /item\.type === "equipment"/);
  assert.match(maintenanceRoute, /deleted: false/);
  assert.match(maintenanceRoute, /builtIn: true,/);
  assert.match(maintenanceRoute, /purged: true,/);
});

test("admin can temporarily pause equipment or one node without creating PPR overdue warnings", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  assert.match(source, /function setOperationalPause\(equipmentId, nodeIndex, paused, reason = ""\)/);
  assert.match(source, /catalogEditorRole\(\) !== "editor"/);
  assert.match(source, /data-toggle-equipment-pause/);
  assert.match(source, /data-toggle-node-pause/);
  assert.match(source, /activeNodeIndexes[\s\S]*?filter\(index => !activeOperationalPause\(eq, index, date\)\)/);
  assert.match(source, /const overdue = !operationalPause/);
  assert.match(source, /if \(activeOperationalPause\(eq, planNodeIndex >= 0 \? planNodeIndex : null, plan\.dueDate\)\) return/);
  assert.match(source, /recordAudit\("Временно остановил"/);
  assert.match(source, /recordAudit\("Возобновил работу"/);
  assert.match(source, /if \(endDate && targetDate === todayISO\(\)\) return false/);
  assert.match(styles, /\.operational-paused-day/);
});

test("maintenance work can be auto-filled from renamed equipment and node names, then edited", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(source, /function nodeReminderItems\(nodeName, equipmentName = ""\)/);
  assert.match(source, /data-autofill-reminder/);
  assert.match(source, /После автозаполнения его можно редактировать/);
  assert.match(source, /meta\?\.mode === "auto"\) meta\.stale = true/);
  assert.match(source, /item\.reminderMeta\[nodeIndex\]\.stale = true/);
  assert.match(source, /Заменить текущий список типовыми работами/);
  assert.match(server, /rawItem\.reminderMeta/);
  assert.match(server, /rawItem\.operationalPauses/);
  assert.match(server, /rawItem\.nodeOperationalPauses/);
});

test("the planned maintenance sheet auto-fills its work rows and keeps every row editable", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(source, /function pprSheetAutofillRows\(date, scheduledItems = \[\]\)/);
  assert.match(source, /function ensurePprSheetAutofill\(date, scheduledItems = \[\], force = false\)/);
  assert.match(source, /const sheet = ensurePprSheetAutofill\(date, scheduledItems\)/);
  assert.match(source, /data-autofill-ppr-sheet/);
  assert.match(source, /После заполнения каждую строку можно редактировать/);
  assert.match(source, /textarea data-ppr-work-input=/);
  assert.match(source, /input\.addEventListener\("input"/);
  assert.match(source, /nodeReminderItems\(scheduled\?\.node \|\| "", scheduled\?\.equipment \|\| ""\)/);
  assert.match(source, /function pprAutofillEngineer\(\)/);
  assert.match(source, /includes\("ербол"\)/);
  assert.match(source, /sheet\.plannedAutomatically = true/);
  assert.match(source, /sheet\.plannedAutomatically \? "Автовыбор" : "План составил"/);
});

test("PPR schedules only weekdays and moves weekend work to Monday", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /function isPprWorkday\(date\)/);
  assert.match(source, /return day >= 1 && day <= 5/);
  assert.match(source, /if \(!isPprWorkday\(date\)\) return null/);
  assert.match(source, /for \(const daysBack of \[1, 2\]\)/);
  assert.match(source, /shiftedFrom: originalDate/);
});

test("completed PPR is sent to every engineer and only the first confirmation wins", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(client, /type: "ppr"/);
  assert.match(client, /data-personal-ppr-confirm/);
  assert.match(client, /await publishPprSheetAction\(message\.date, "approve"\)/);
  assert.match(server, /sendPprApprovalPushNotifications/);
  assert.match(server, /clearPprApprovalPushNotifications/);
  assert.match(server, /silentUpdate:\s*true/);
  assert.match(server, /engineerPermissionRoleServer\(entry\.profile\) === "engineer"/);
  assert.match(server, /if \(sheet\.approvedAt\) return \{ error: "ppr_sheet_locked" \}/);
});

test("aggregate journal prints as complete landscape A4 pages", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(source, /AGGREGATE_JOURNAL_ROWS_PER_SHEET = 10/);
  assert.match(source, /function printAggregateJournal\(area, selectedSheetIndex = null\)/);
  assert.match(source, /data-print-aggregate-sheet/);
  assert.match(source, /@page \{ size: A4 landscape; margin: 7mm; \}/);
  assert.match(source, /thead \{ display: table-header-group; \}/);
  assert.match(source, /page-break-inside: avoid/);
  assert.match(source, /class="print-sheet continuous"/);
  assert.match(source, /allSheets\.slice\(1\)/);
  assert.match(source, /querySelectorAll\("\.no-print, \.aggregate-sheet-print"\)\.forEach\(node => node\.remove\(\)\)/);
  assert.match(source, /\.aggregate-sheet-print, \.no-print, \.aggregate-correction \{ display: none !important; \}/);
  assert.match(source, /standard-aggregate-journal-sheet/);
  assert.match(source, /data-mobile-label="Оборудование и узел"/);
  assert.match(source, /aggregate-mobile-record-carousel/);
  assert.match(source, /sourceRows\.forEach\(row =>/);
  assert.match(styles, /standard-aggregate-journal-sheet \.aggregate-journal-table td::before/);
  assert.match(styles, /scroll-snap-type: x mandatory/);
  assert.match(styles, /#aggregateJournalScreen \.aggregate-print-actions/);
});

test("aggregate journals are separated by equipment even inside one area", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /function aggregateJournalItems\(area, equipmentFilterId = 0\)/);
  assert.match(source, /targetEquipmentId && equipmentId !== targetEquipmentId/);
  assert.match(source, /data-aggregate-equipment/);
  assert.match(source, /aggregateJournalItems\(selectedArea, selectedEquipment\?\.id\)/);
});

test("reserve journals keep distinct stable colors after renaming", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /const RESERVE_EQUIPMENT_COLORS = Object\.freeze\(\{[\s\S]*?17: "#7c3aed"[\s\S]*?18: "#2563eb"[\s\S]*?19: "#f59e0b"[\s\S]*?20: "#0f766e"/);
  assert.match(source, /if \(eq\?\.area === "Резерв" && fixedReserveColor\) return fixedReserveColor/);
});

test("admin and engineers can audit every rating point in a mobile-friendly ledger", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(client, /function workerRatingLedger\(year, monthIndex, workerKey\)/);
  assert.match(client, /workerRatingPointMap\(year, monthIndex, ledger\)/);
  assert.match(client, /function canAuditWorkerRating\(\)/);
  assert.match(client, /return profile\?\.role === "editor" \|\| hasEngineerInboxAccess\(\)/);
  assert.match(client, /if \(!canAuditWorkerRating\(\)\) return/);
  assert.match(client, /data-worker-rating-details=/);
  assert.match(client, /entries\.reduce\(\(sum, item\) => sum \+ item\.points, 0\)/);
  assert.match(styles, /\.worker-rating-ledger-modal/);
  assert.match(styles, /max-height: 94dvh/);
  const deployedVersion = client.match(/const APP_VERSION = "([^"]+)"/)?.[1] || "";
  assert.ok(deployedVersion && html.includes(`app.js?v=${deployedVersion}`));
  assert.ok(html.includes(`styles.css?v=${deployedVersion}`));
  assert.ok(serviceWorker.includes(`app.js?v=${deployedVersion}`));
});

test("obsolete no-material nodes are removed from both fixed press catalogs", () => {
  const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(source, /removeObsoletePressNoMaterialNodes\(postgresState\)/);
  assert.match(source, /=== "нет сырья"/);
  assert.match(source, /for \(const equipmentId of \["1", "2"\]\)/);
});

test("repeat QR scans stay in an overlay on the main screen", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /function oldestOpenRemarkForNode\(equipmentId, nodeIndex\)/);
  assert.match(source, /function openRepeatedNodeQrDestination\(parsed, shift = currentWalkShift\(\)\)/);
  assert.match(source, /overlay\.className = "qr-result-overlay"/);
  assert.match(source, /show\(homeViewForProfile\(profile\?\.role\), false\)/);
  assert.match(source, /data-qr-action-create/);
  assert.match(source, /data-qr-action-resolve/);
  assert.match(source, /data-qr-repeat-details hidden/);
  assert.match(source, /data-qr-repeat-open/);
  assert.match(source, /if \(details\) details\.hidden = false/);
  assert.match(source, /Если обнаружена новая проблема, запишите её ниже/);
  assert.match(source, /if \(!openRemark \|\| action === "create"\)/);
  assert.match(source, /appendCommentEntry\(item, (?:comment|text), photo, \{ area: eq\?\.area \|\| "" \}\)/);
  assert.match(source, /finish\("comment-saved"\)/);
  assert.match(source, /Вы остались на главном экране/);
  assert.doesNotMatch(source, /Узел уже обойден — открыт комментарий узла/);
});

test("QR walk uses a fast idempotent save and a throttled phone scanner", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(client, /apiJson\("\/api\/qr-walk\/mark"/);
  assert.match(client, /now - lastScanAt >= 420/);
  assert.match(client, /const maxSide = 720/);
  assert.match(client, /width: \{ ideal: 1280 \}/);
  assert.match(client, /frameRate: \{ ideal: 24, max: 30 \}/);
  assert.match(client, /let nativeQrDetector = null/);
  assert.match(client, /const qrWorkCanvas = document\.createElement\("canvas"\)/);
  assert.match(client, /data-qr-torch/);
  assert.match(client, /navigator\.vibrate\?\.\(\[80, 40, 80\]\)/);
  assert.match(client, /}, 30000\)/);
  assert.match(client, /let submitting = false/);
  assert.match(server, /pathname === "\/api\/qr-walk\/mark"/);
  assert.match(server, /if \(existing\?\.done\)/);
  assert.match(server, /broadcastState\(result\.origin, result\.actionId, \{ checks:/);
});

test("test and duplicate worker identities are excluded without hiding the valid rating", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const ratingRoute = fs.readFileSync(path.join(root, "server", "admin-rating-route.js"), "utf8");
  assert.match(server, /"mechanic:шонов\.уткел"/);
  assert.match(server, /"mechanic:рамазан"/);
  assert.match(server, /"mechanic:адлет"/);
  assert.match(ratingRoute, /pathname !== "\/api\/admin\/rating-exclusions"/);
  assert.match(client, /data-hide-worker-rating=/);
  assert.match(client, /data-restore-worker-rating=/);
  assert.match(client, /Без комментария действие не выполнено/);
  assert.match(client, /if \(!cleanName \|\| workerRatingExcluded\(role, cleanName\)\) return/);
});

test("QR walks are separated into technical and operational journals", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const equipmentRoute = fs.readFileSync(path.join(root, "server", "admin-equipment-maintenance-route.js"), "utf8");
  const qrRoute = fs.readFileSync(path.join(root, "server", "admin-qr-route.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(client, /const QR_WALK_GROUPS/);
  assert.match(client, /function qrWalkGroup\(role = profile\?\.role\)/);
  assert.match(client, /\["operator", "shop"\]\.includes\(String\(role \|\| ""\)\)/);
  assert.match(client, /function reconcileQrWalkStatusFromServer\(equipmentId, shiftInfo, group, serverChecks = \{\}\)/);
  assert.match(client, /delete item\.walkGroups\[group\]\[shiftInfo\.key\]/);
  assert.match(client, /reconcileQrWalkStatusFromServer\(equipmentId, shiftInfo, qrWalkGroup\(\), result\?\.checks \|\| \{\}\)/);
  assert.match(client, /walkGroups\[group\]\[shiftInfo\.key\]/);
  assert.match(client, /Object\.values\(item\.walkGroups\)\.some\(group =>/);
  assert.match(client, /Object\.values\(group\)\.some\(shift => shift\?\.done\)/);
  assert.match(client, /function renderQrWalkJournal\(\)/);
  assert.match(client, /Инженеры и электромеханики/);
  assert.match(client, /Операторы и начальники цехов/);
  assert.match(client, /Не зафиксирован/);
  assert.match(client, /Печать \/ PDF/);
  assert.match(client, /qr-journal-area-overview/);
  assert.match(client, /data-qr-journal-area-back/);
  assert.match(client, /current\.qrWalkJournalArea/);
  assert.match(styles, /\.qr-journal-area-card\.has-missing/);
  assert.match(styles, /\.qr-walk-journal-table tbody[\s\S]*?scroll-snap-type: x mandatory/);
  assert.match(server, /pathname === "\/api\/qr-walk\/journal"/);
  assert.match(server, /pathname === "\/api\/qr-walk\/status"/);
  assert.match(client, /await refreshQrWalkStatusFromServer\(parsed\.equipmentId, shift\)/);
  assert.match(client, /\/api\/qr-walk\/status\?\$\{query\.toString\(\)\}/);
  assert.match(equipmentRoute, /pathname === "\/api\/admin\/equipment\/node-delete"/);
  assert.match(equipmentRoute, /db\.archivedNodeChecks\.push/);
  assert.match(equipmentRoute, /entry\.archivedNode = true/);
  assert.match(server, /entry\.archivedNode === true/);
  assert.match(server, /db\.qrWalkJournal\.push/);
  assert.match(server, /group !== expectedGroup/);
  assert.match(server, /role === "editor" && \["technical", "operational"\]\.includes\(requestedGroup\)/);
  assert.match(server, /targetedCleanupVersions\.compressorWalk20260810/);
  assert.match(server, /recordKey\.startsWith\("9:"\) && recordKey\.endsWith\(`:\$\{testDate\}`\)/);
  assert.match(server, /Number\(entry\?\.equipmentId\) === 9 && entry\?\.date === testDate/);
  assert.match(server, /function restoreQrWalkChecksFromJournal/);
  assert.match(server, /restoreQrWalkChecksFromJournal\(db\)/);
  assert.match(server, /currentItem\.walkGroups\?\.\[group\]\?\.\[shift\]\?\.done/);
  assert.match(client, /function canViewQrWalkJournal/);
  assert.match(client, /Кому разрешён просмотр журнала/);
  assert.match(qrRoute, /pathname === "\/api\/qr-walk\/journal-access"/);
  assert.match(qrRoute, /qrWalkJournalAccess/);
  assert.match(client, /selfRemarkBonus: 5/);
  assert.match(client, /Сам обнаружил и устранил замечание · бонус \+5/);
  assert.match(client, /if \(!isElectromechanicRole\(shift\.byRole\)\) return/);
});

test("admin maintenance keeps an immutable audit and a recoverable trash", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const maintenanceRoute = fs.readFileSync(path.join(root, "server", "admin-maintenance-route.js"), "utf8");
  const dashboardRoute = fs.readFileSync(path.join(root, "server", "admin-dashboard-route.js"), "utf8");
  const qrRoute = fs.readFileSync(path.join(root, "server", "admin-qr-route.js"), "utf8");
  const userPermissionsRoute = fs.readFileSync(path.join(root, "server", "admin-user-permissions-route.js"), "utf8");
  const userSessionsRoute = fs.readFileSync(path.join(root, "server", "admin-user-sessions-route.js"), "utf8");
  assert.match(client, /function renderAdminMaintenance\(\)/);
  assert.match(client, /Журнал действий администратора/);
  assert.match(client, /Корзина удалённых данных/);
  assert.match(client, /УДАЛИТЬ НАВСЕГДА/);
  assert.match(client, /adminPassword/);
  assert.match(server, /adminTrash/);
  assert.match(server, /adminAuditLog/);
  assert.match(dashboardRoute, /pathname !== "\/api\/admin\/maintenance"/);
  assert.match(server, /function adminDiagnosticWithin/);
  assert.match(dashboardRoute, /const \[backups, archives\] = await Promise\.all/);
  assert.match(dashboardRoute, /adminDiagnosticWithin\(listAdminBackups\(\), \[\]\)/);
  assert.match(client, /\/api\/admin\/maintenance\?tab=\$\{encodeURIComponent\(requestedTab\)\}/);
  assert.match(dashboardRoute, /const requestedTab = String\(url\.searchParams\.get\("tab"\) \|\| "all"\)/);
  assert.match(dashboardRoute, /\["all", "access"\]\.includes\(requestedTab\)/);
  assert.match(dashboardRoute, /\["all", "audit"\]\.includes\(requestedTab\)/);
  assert.doesNotMatch(dashboardRoute, /await refreshSystemMonitoring\(\)/);
  assert.match(maintenanceRoute, /createManualBackup\("before-trash-purge"\)/);
  assert.match(server, /30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(maintenanceRoute, /passwordMatches\(String\(body\.password/);
  assert.match(server, /function adminUserOperationalSummary/);
  assert.match(userSessionsRoute, /pathname !== "\/api\/admin\/user-sessions"/);
  assert.match(client, /function adminUserDetailsHtml/);
  assert.match(client, /data-access-end-sessions/);
  assert.match(userPermissionsRoute, /pathname !== "\/api\/admin\/user-permissions"/);
  assert.match(client, /data-user-permissions-form/);
  assert.doesNotMatch(client, /data-admin-catalog-form/);
  assert.doesNotMatch(client, /Конструктор справочников/);
  assert.doesNotMatch(client, /Сохранить справочники/);
  assert.match(client, /\["forms", "activity", "settings", "monitoring", "guide"\]/);
  assert.match(client, /adminMaintenanceTab: "trash"/);
  assert.match(client, /current\.adminMaintenanceTab \|\| "trash"/);
  assert.doesNotMatch(client, /Сохранить названия ролей/);
  assert.doesNotMatch(client, /data-role-label=/);
  assert.match(server, /downtimeReasons/);
  assert.match(qrRoute, /pathname === "\/api\/admin\/qr-routes"/);
  assert.match(qrRoute, /pathname === "\/api\/admin\/qr-journal\/correct"/);
  assert.match(client, /data-admin-qr-route-form/);
});

test("notification setup stops nagging unsupported and legacy phones", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /function notificationDeviceCapability\(\)/);
  assert.match(source, /Number\(iosMatch\[1\]\) === 16 && Number\(iosMatch\[2\]\) < 4/);
  assert.match(source, /\["ready", "unsupported", "failed"\]\.includes\(setupState\)/);
  assert.match(source, /data-notification-dismiss/);
  assert.match(source, /failures >= 2/);
});

test("automatic translation runs only for users who selected Uzbek", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(appSource, /const AUTO_TRANSLATION_TARGET_LANG = "uz"/);
  assert.match(appSource, /targetLanguage !== AUTO_TRANSLATION_TARGET_LANG/);
  assert.match(appSource, /target !== AUTO_TRANSLATION_TARGET_LANG/);
  assert.match(appSource, /currentLanguage\(\) !== AUTO_TRANSLATION_TARGET_LANG/);
  assert.match(serverSource, /if \(language !== "uz"\) return JSON\.stringify\(payload\)/);
  assert.match(serverSource, /if \(target !== "uz" \|\| !shouldTranslateText\(text\)\) return text/);
  assert.match(serverSource, /const lang = target === "uz" \? "uz" : ""/);
  assert.match(serverSource, /const TRANSLATION_CACHE_VERSION = "v2"/);
  assert.match(serverSource, /`\$\{TRANSLATION_CACHE_VERSION\}:\$\{target\}::/);
  assert.match(serverSource, /const originals = \[\.\.\.new Set/);
  assert.match(serverSource, /result\[original\] = db\.translationCache\[cacheKey\]\?\.translated \|\| original/);
  assert.match(appSource, /const TRANSLATION_CACHE_KEY = "ppr-translation-cache-v2"/);
  assert.match(appSource, /<p>\$\{userTextWithRussianHtml\(target\.text\)\}<\/p>/);
  assert.match(appSource, /<p>\$\{userTextWithRussianHtml\(target\.submittedComment\)\}<\/p>/);
  assert.match(appSource, /userTextWithRussianHtml\(target\.returnReason\)/);
  assert.match(appSource, /document\.body\.append\(overlay\);\s+translateUserTextsForCurrentProfile\(\);/);
  assert.match(appSource, /userTextWithRussianHtml\(message\.originalText/);
  assert.match(appSource, /userTextWithRussianHtml\(message\.submittedComment/);
  assert.match(appSource, /userTextWithRussianHtml\(entry\.resolutionReturnReason/);
  assert.match(appSource, /userTextWithRussianHtml\(update\.text/);
});

test("push subscriptions use the authenticated employee and expose admin diagnostics", async () => {
  const subscribed = await fetch(`${baseUrl}/api/push/subscribe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-user-id": "mechanic-1",
      "user-agent": "Push Test Device"
    },
    body: JSON.stringify({
      clientId: "push-test-client",
      subscription: {
        endpoint: "https://push.example.test/device-1",
        keys: { p256dh: "test-p256dh", auth: "test-auth" }
      },
      profile: {
        id: "spoofed-admin",
        name: "Spoofed Admin",
        role: "editor",
        area: "Wrong Area",
        language: "ru"
      }
    })
  });
  assert.equal(subscribed.status, 200);

  const statusResponse = await fetch(`${baseUrl}/api/push/status`, {
    headers: { "x-test-user-id": "editor-1" }
  });
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  const device = status.devices.find(item => item.device === "Push Test Device");
  assert.ok(device);
  assert.equal(device.name, "Механик Один");
  assert.equal(device.role, "mechanic");
  assert.notEqual(device.name, "Spoofed Admin");

  const forbidden = await fetch(`${baseUrl}/api/push/status`, {
    headers: { "x-test-user-id": "mechanic-1" }
  });
  assert.equal(forbidden.status, 403);
});

test("uploaded photos are served and production keeps a PostgreSQL fallback", async () => {
  const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /CREATE TABLE IF NOT EXISTS ppr_photos/);
  assert.match(source, /SELECT mime_type, payload FROM ppr_photos WHERE file_name = \$1/);
  assert.match(source, /await persistPhotoToPostgres\(saved\.fileName, saved\.mimeType, saved\.bytes\)/);
  assert.match(source, /async function readPhotoFromPostgres\(fileName\)/);
  assert.match(source, /postgresPool\.orderedIndexes\(\)/);
  assert.match(source, /await postgresPool\.flushMirrors\?\.\(\)/);
  assert.match(source, /const stored = await readPhotoFromPostgres\(fileName\)/);
  assert.match(source, /photo_storage_unavailable/);
  assert.doesNotMatch(source, /externalizePhotosInValue/);
  assert.match(appSource, /if \(!\/\^image\\\/\/i\.test\(String\(file\.type \|\| ""\)\)\)/);
  assert.match(appSource, /dataset\.photoRetry/);
  assert.match(appSource, /storedPhotoUrls = serialized\.match\(\/\\\/api\\\/photos/);
  assert.match(appSource, /new Set\(storedPhotoUrls\.map/);
  const data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const upload = await fetch(`${baseUrl}/api/photos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data })
  });
  const uploaded = await upload.json();
  assert.equal(upload.status, 200, JSON.stringify(uploaded));
  assert.match(uploaded.url, /^\/api\/photos\/[a-f0-9]{40}\.png$/);
  const photo = await fetch(`${baseUrl}${uploaded.url}`);
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get("content-type"), "image/png");
  assert.ok((await photo.arrayBuffer()).byteLength > 0);
});

test("engineers receive visible counters and push notifications for incoming requests", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(appSource, /function updateTmcRequestButtonLabels\(\)/);
  assert.match(appSource, /classList\.toggle\("request-alert", engineerCount > 0\)/);
  assert.match(appSource, /mobileRequestCount\.textContent = String\(engineerCount\)/);
  assert.match(appSource, /engineer-request\|\$\{req\.id\}/);
  assert.match(appSource, /requestedView === "requestCreate"/);
  assert.match(appSource, /function syncPushSubscriptionProfile\(\)/);
  assert.match(appSource, /\[actor\.id, actor\.employeeId, actor\.phone, actor\.role, actor\.area, actor\.language \|\| currentLanguage\(\)\]/);
  assert.doesNotMatch(htmlSource, /data-mobile-request-count/);
  assert.match(serverSource, /sendEngineerRequestPushNotifications/);
  assert.match(serverSource, /engineerPermissionRoleServer\(entry\.profile\) === "engineer"/);
  assert.match(serverSource, /ALKZ — новая заявка инженеру/);
});

test("the gas journal becomes readable date cards on phones", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styleSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(appSource, /data-mobile-label="Давление входное, МПа"/);
  assert.match(appSource, /data-mobile-label="Трубопровод и колодцы"/);
  assert.match(styleSource, /Phone gas journal: one readable date card/);
  assert.match(styleSource, /\.gas-journal-table\.gas-sheet-table tbody tr \{[\s\S]*?border-radius: 11px/);
  assert.match(styleSource, /content: attr\(data-mobile-label\)/);
  assert.match(styleSource, /touch-action: manipulation/);
  assert.match(styleSource, /\.gas-journal-sheet \.gas-a4-wrap \{[\s\S]*?touch-action: pan-y !important/);
  assert.match(appSource, /const datesA = mobileMode \? \[mobileDate\] : gasJournalSheetDates\("A"\)/);
  assert.match(appSource, /shiftGasJournalMobileDate\(deltaX < 0 \? 1 : -1\)/);
  assert.match(appSource, /data-gas-day-prev/);
  assert.match(appSource, /data-gas-day-next/);
  assert.match(appSource, /class="gas-mobile-date-panel"/);
  assert.match(appSource, /aria-label="\$\{escapeHtml\(gasControlAriaLabel\(section, field\)\)\}"/);
  assert.match(appSource, /el\.addEventListener\("input", commitGasValue\)/);
  assert.match(styleSource, /\.gas-sheet-page-button,[\s\S]*?\.gas-sheet-today-button \{[\s\S]*?display: none !important/);
  assert.match(appSource, /data-gas-print="\$\{section\}"/);
  assert.doesNotMatch(appSource, /data-gas-clear/);
  assert.doesNotMatch(appSource, /function clearGasJournalSheet/);
  assert.doesNotMatch(appSource, /Журнал заполняется только на русском или казахском языке/);
  assert.doesNotMatch(appSource, /При печати система сама соберёт заполненные дни и пропустит пустые/);
  assert.doesNotMatch(appSource, /Журнал заполняется вручную/);
  assert.doesNotMatch(appSource, /замечания сюда не попадают/);
  assert.doesNotMatch(appSource, /Печать появится после заполнения хотя бы одного дня/);
  assert.doesNotMatch(appSource, /function journalEntryLanguageNotice/);
  assert.doesNotMatch(styleSource, /\.journal-language-rule/);
});

test("SHGRP entries require an explicit fixation after editing", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styleSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const moduleSource = fs.readFileSync(path.join(root, "modules", "shgrp.js"), "utf8");
  const testWindow = {};
  new Function("window", moduleSource)(testWindow);
  const completeA = {
    inletMpa: "5",
    outletMpa: "2.5",
    tempInC: "26",
    tempOutC: "25",
    pressureDeltaMpa: "0.1",
    equipmentStatus: "Исправно",
    pskTrigger: "Нет",
    maintenance: "Не требуется",
    remarks: "Нет",
    checkedBy: "Сотрудник"
  };

  assert.equal(testWindow.PPRModules.shgrp.rowAComplete(completeA), true);
  assert.equal(testWindow.PPRModules.shgrp.rowAComplete({ ...completeA, entryStatus: "draft" }), false);
  assert.equal(testWindow.PPRModules.shgrp.rowAComplete({ ...completeA, entryStatus: "fixed" }), true);
  assert.match(appSource, /function fixGasJournalEntry\(section, date, button\)/);
  assert.match(appSource, /Зафиксировать запись/);
  assert.match(appSource, /Запись ШГРП зафиксирована и сохранена/);
  assert.match(appSource, /entryStatus: "draft"/);
  assert.match(appSource, /entryStatus: "fixed"/);
  assert.match(appSource, /Запись уже зафиксирована и недоступна для редактирования/);
  assert.match(appSource, /data-gas-fix-date="\$\{date\}" \$\{fixed \? "disabled" : ""\}/);
  assert.match(appSource, /const locked = gasJournalEntryIsFixed\(section, gasJournalRecord\(section, date\)\)/);
  assert.match(styleSource, /\.gas-entry-fix-button/);
  assert.match(styleSource, /\.gas-journal-table input:disabled/);
});

test("QR PSK status and comment are synchronized with the gas journal", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(serverSource, /pskTrigger: psk \? \(psk\.status === "remark" \? "Есть" : "Нет"\) : ""/);
  assert.match(serverSource, /sectionADescriptor\?\.kind === "psk"/);
  assert.match(serverSource, /const checkKey = `psk:\$\{mark\.shift\}`/);
  assert.match(serverSource, /buildShgrpSectionARowServer\(\{ \.\.\.current, shgrpQrChecks: checks \}/);
  assert.match(serverSource, /recordKey\.match\(\/\^15:5:/);
  assert.match(serverSource, /record\?\.to\?\.walkGroups\?\.technical\?\.\[shift\]/);
  assert.match(serverSource, /const previous = new Date\(`\$\{localDate\}T12:00:00Z`\)/);
  assert.doesNotMatch(serverSource, /const previous = new Date\(`\$\{localDate\}T00:00:00\+05:00`\)/);
  assert.match(serverSource, /\.map\(entry => `\$\{entry\.label\}: \$\{entry\.comment\}`\)/);
  assert.match(appSource, /if \(text === "Исправно"\) return "Нет"/);
  assert.match(appSource, /if \(text === "Неисправно"\) return "Есть"/);
  assert.match(appSource, /normalizedPskTrigger\(row\.pskTrigger \?\? row\.psk\), \["Нет", "Есть"\]/);
});

test("one compressor button fixes and locks all three rows for a date", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styleSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const moduleSource = fs.readFileSync(path.join(root, "modules", "compressor.js"), "utf8");
  const testWindow = {};
  new Function("window", moduleSource)(testWindow);
  const completeRow = {
    airPressure: "7",
    airTemp: "28",
    oilPressureTemp: "3 / 65",
    leakGrounding: "Заземлено, утечек нет",
    operatingState: "Включено",
    remarks: "Без замечаний",
    shiftTime: "день 10:15",
    blowTime: "10:15",
    checkedBy: "Сотрудник"
  };

  assert.equal(testWindow.PPRModules.compressor.rowComplete(completeRow), true);
  assert.equal(testWindow.PPRModules.compressor.rowComplete({ ...completeRow, entryStatus: "draft" }), false);
  assert.equal(testWindow.PPRModules.compressor.rowComplete({ ...completeRow, entryStatus: "fixed" }), true);
  assert.match(appSource, /function fixCompressorJournalDate\(area, date, button\)/);
  assert.match(appSource, /Три компрессора зафиксированы и сохранены одной записью/);
  assert.match(appSource, /data-compressor-fix-date=/);
  assert.match(appSource, /Зафиксировать 3 компрессора/);
  assert.doesNotMatch(appSource, /data-compressor-fix-entry=/);
  assert.match(appSource, /const sheetRows = mobileMode[\s\S]*?compressorJournalDateRows\(area, mobileDate\)/);
  assert.match(appSource, /shiftCompressorJournalMobileDate\(deltaX < 0 \? 1 : -1\)/);
  assert.match(appSource, /function addDaysISO\(dateISO, days\) \{[\s\S]*?setUTCDate\(date\.getUTCDate\(\) \+ days\)/);
  assert.doesNotMatch(appSource, /function compressorJournalAddDays\(/);
  assert.match(appSource, /function journalMobileMode\(\)/);
  assert.doesNotMatch(appSource, /function (?:compressor|gas)JournalMobileMode\(/);
  assert.match(appSource, /data-mobile-label="Давление воздуха"/);
  assert.match(appSource, /const locked = compressorJournalRowComplete\(row\)/);
  assert.match(appSource, /data-compressor-field="airPressure"[\s\S]*?\$\{locked \? "disabled" : ""\}/);
  assert.match(styleSource, /\.compressor-date-fix-button/);
  assert.match(styleSource, /\.compressor-journal-table input:disabled/);
  assert.match(styleSource, /\.compressor-mobile-date-panel/);
  assert.match(styleSource, /\.compressor-journal-table tbody tr \{[\s\S]*?border-radius: 11px/);
  assert.match(styleSource, /\.compressor-journal-table input,[\s\S]*?font-size: 16px !important/);
  assert.match(appSource, /aria-label="\$\{escapeHtml\(row\.compressor\)\} — утечки и заземление"/);
  assert.match(appSource, /function promptCompressorQrDecision\(parsed\)/);
  assert.match(appSource, /compressorJournalCompressorForQr\(parsed\.equipmentId, parsed\.nodeIndex\)/);
  assert.match(appSource, /Заземлено, утечек нет/);
  assert.match(appSource, /Замечание добавлено в предупреждения/);
  assert.match(appSource, /sourceRecordKey: key\(parsed\.equipmentId, parsed\.nodeIndex, shift\.date\)/);
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(serverSource, /function linkResolvedCompressorRemarkToJournalServer\(db, recordKey, remark, actor, now\)/);
  assert.match(serverSource, /compressorJournal: compressorJournalPatch/);
  assert.match(appSource, /input\.addEventListener\("change", \(\) => \{\s*renderEquipment\(\);/);
  assert.match(styleSource, /\.equipment-journal-cell \.compressor-journal-alert \{[\s\S]*?animation: none !important/);
  assert.match(styleSource, /\.compressor-journal-alert \{ animation: none !important/);
});

test("only the primary admin also receives the engineer workflow", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const permissions = fs.readFileSync(path.join(root, "server", "permissions.js"), "utf8");
  assert.match(client, /PRIMARY_ADMIN_ENGINEER_EMPLOYEE_ID = "87064091893"/);
  assert.match(client, /function hasEngineerInboxAccess\(user = profile\)/);
  assert.match(client, /"Админ \+ Инженер"/);
  assert.match(server, /PRIMARY_ADMIN_ENGINEER_EMPLOYEE_ID = "87064091893"/);
  assert.match(server, /createServerPermissions\(\{ primaryAdminEmployeeId: PRIMARY_ADMIN_ENGINEER_EMPLOYEE_ID \}\)/);
  assert.match(permissions, /function engineerPermissionRole\(profile = \{\}\)/);
  assert.match(permissions, /isPrimaryAdminEngineer\(profile\) \? "engineer"/);
});

test("the create request button uses a calm halo instead of blinking", () => {
  const style = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(style, /#createTmcRequestButton\.request-alert,[\s\S]*?animation: requestButtonHalo 2\.2s ease-in-out infinite !important/);
  assert.match(style, /@keyframes requestButtonHalo/);
  assert.match(style, /box-shadow: 0 0 0 7px rgba\(22, 130, 170, \.25\)/);
});

test("the decorative Hofmann forklift animation is completely removed", () => {
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const style = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.doesNotMatch(app, /setupHofmannForkliftMascot|hofmann-forklift-mascot|forklift-smoke|forklift-aluminum-load/);
  assert.doesNotMatch(style, /hofmann-forklift-mascot|forkliftRoadBounce|forkliftSmoke|hofmannFlagWave/);
  assert.doesNotMatch(sw, /assets\/hofmann-forklift\.png/);
  assert.doesNotMatch(server, /assets\/hofmann-forklift\.png/);
});

test("admin garbage check is read-only and Back skips invalid history entries", () => {
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const storageRoute = fs.readFileSync(path.join(root, "server", "admin-storage-route.js"), "utf8");
  const style = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(app, /data-open-storage-diagnostics>Проверить мусор/);
  assert.match(app, /admin-technical-tools-grid[\s\S]*data-open-storage-diagnostics/);
  assert.match(app, /apiJson\("\/api\/admin\/storage-status"/);
  assert.match(app, /Только проверка — ничего не удалено/);
  assert.match(storageRoute, /pathname === "\/api\/admin\/storage-status" && req\.method === "GET"/);
  assert.match(storageRoute, /safeCheckOnly: true/);
  assert.match(storageRoute, /req\.authUser\?\.role !== "editor"/);
  assert.match(app, /while \(nav\.length\)[\s\S]*?previous === current\.view \|\| !canOpenView\(previous\)/);
  assert.match(app, /show\(homeViewForProfile\(profile\?\.role\), false\)/);
  assert.match(style, /\.storage-diagnostics-grid/);
});

test("the technical maintenance update banner is not shown", () => {
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.doesNotMatch(app, /renderAdminMaintenanceNotice/);
  assert.doesNotMatch(app, /Техническая проверка завершена/);
  assert.doesNotMatch(app, /Убран паучий герой и паутина/);
});

test("admin repair replaces the old resolver, awards only the performer, and cannot run twice", async () => {
  const repairedResponse = await postRemark(
    "1:2:2026-07-16",
    "remark-repair-assignment",
    "admin-repair-close",
    user("editor-1", "Администратор", "editor"),
    {
      performerName: "Repair Worker",
      confirmerName: "Second Shop Chief",
      equipmentArea: "Цех А"
    }
  );
  const repaired = patchedRemark(repairedResponse, "1:2:2026-07-16", "remark-repair-assignment");
  assert.equal(repaired.resolved, true);
  assert.equal(repaired.resolvedByName, "Repair Worker");
  assert.equal(repaired.confirmedByName, "Second Shop Chief");
  assert.deepEqual(repaired.resolutionParticipants.map(item => item.name), ["Repair Worker"]);
  assert.deepEqual(repaired.resolutionCompletedParticipants.map(item => item.name), ["Repair Worker"]);

  await postRemark(
    "1:2:2026-07-16",
    "remark-repair-assignment",
    "admin-repair-close",
    user("editor-1", "Администратор", "editor"),
    {
      performerName: "Repair Worker",
      confirmerName: "Second Shop Chief",
      equipmentArea: "Цех А"
    },
    409
  );
});

test("every field worker role sends requests to engineers", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /\["mechanic", "electrician", "operator", "welder", "turner", "forkliftDriver"\]\.includes\(role\)/);
});


test("admin changes an employee role without losing the employee password", async () => {
  const password = await fetch(`${baseUrl}/api/users/password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "mechanic-1", newPassword: "RolePass-1", actionId: "role-password-test", clientId: "admin-test" })
  });
  assert.equal(password.status, 200, await password.text());
  const pushEndpoint = `https://push.example.test/${Date.now()}`;
  const subscribe = await fetch(`${baseUrl}/api/push/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": "mechanic-1" },
    body: JSON.stringify({
      clientId: "mechanic-role-sync-test",
      subscription: {
        endpoint: pushEndpoint,
        keys: { p256dh: "test-p256dh", auth: "test-auth" }
      },
      profile: { language: "ru" }
    })
  });
  assert.equal(subscribe.status, 200, await subscribe.text());
  const update = await fetch(`${baseUrl}/api/users/role`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "mechanic-1", role: "designEngineer", area: "Цех А", areas: ["Цех А", "Другой цех", "Цех А"], actionId: "role-update-test", clientId: "admin-test" })
  });
  const updateBody = await update.json();
  assert.equal(update.status, 200, JSON.stringify(updateBody));
  assert.equal(updateBody.user.role, "designEngineer");
  assert.equal(updateBody.user.area, "Цех А");
  assert.deepEqual(updateBody.user.areas, ["Цех А", "Другой цех"]);
  const pushStatus = await fetch(`${baseUrl}/api/push/status`);
  const pushStatusBody = await pushStatus.json();
  assert.equal(pushStatus.status, 200, JSON.stringify(pushStatusBody));
  assert.equal(pushStatusBody.devices.find(device => device.name === updateBody.user.name)?.role, "designEngineer");
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "mechanic-1", password: "RolePass-1" })
  });
  assert.equal(login.status, 200, await login.text());
});

test("admin resets a legacy employee password and clears the login lock", async () => {
  const reset = await fetch(`${baseUrl}/api/users/password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      employeeId: "legacy-77",
      newPassword: "TempPass-77",
      actionId: "password-reset-test",
      clientId: "admin-test"
    })
  });
  const resetBody = await reset.json();
  assert.equal(reset.status, 200, JSON.stringify(resetBody));
  for (let index = 0; index < 15; index += 1) {
    const failed = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "legacy-77", password: "wrong-password" })
    });
    assert.equal(failed.status, 401);
  }
  const blocked = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "legacy-77", password: "TempPass-77" })
  });
  assert.equal(blocked.status, 429);
  const unlock = await fetch(`${baseUrl}/api/users/password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      employeeId: "legacy-77",
      newPassword: "TempPass-78",
      actionId: "password-unlock-test",
      clientId: "admin-test"
    })
  });
  assert.equal(unlock.status, 200, await unlock.text());
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "legacy-77", password: "TempPass-78" })
  });
  assert.equal(login.status, 200, await login.text());
});

test("an admin can delete a legacy employee that has no internal id", async () => {
  const response = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "delete",
      id: "",
      employeeId: "legacy-77",
      name: "Старый сотрудник",
      reason: "Проверка безопасного удаления",
      adminPassword: "test-only",
      actor: { role: "editor", name: "Администратор" },
      actionId: "delete-legacy-user-test",
      clientId: "admin-test"
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const users = await (await fetch(`${baseUrl}/api/users`)).json();
  assert.equal(users.some(item => item.employeeId === "legacy-77"), false);
});

test("warehouse data is removed from the simplified request workflow", async () => {
  const before = await (await fetch(`${baseUrl}/api/state`)).json();
  assert.deepEqual(before.inventory, {});
  assert.equal(Object.keys(before.requests || {}).some(id => id.startsWith("stock-issue:")), false);
  assert.equal(before.requests["legacy-warehouse-request"].status, "engineer");
  assert.equal(before.requests["legacy-warehouse-request"].engineerCombinedBatch, true);
  assert.equal(before.requests["legacy-warehouse-request"].transferredToWarehouse, false);
  const response = await fetch(`${baseUrl}/api/state`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: "warehouse-removed-clear-test",
      clientId: "admin-test",
      clearRecordedData: true,
      clearConfirm: "ОЧИСТИТЬ",
      baseOperationalResetAt: "",
      user: { role: "editor", authenticatedRole: "editor", name: "Администратор" }
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const state = await (await fetch(`${baseUrl}/api/state`)).json();
  assert.deepEqual(state.inventory, {});
  assert.equal(Object.keys(state.requests || {}).some(id => id.startsWith("stock-issue:")), false);
  assert.equal(state.requests["ordinary-request"], undefined);
  assert.deepEqual(state.checks, {});
});

test("collaborative resolution UI batches checked participants and shows every resolver", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(appSource, /type="checkbox" data-remark-user/);
  assert.match(appSource, /data-remark-user-search/);
  assert.match(appSource, /resolution-score-recipients/);
  assert.match(appSource, /participants: participantsToAdd/);
  assert.match(appSource, /Устранили: \$\{escapeHtml\(completedBy\)\}/);
  assert.match(appSource, /resolutionCompletedParticipants: completedResolutionParticipants\(entry\)/);
  assert.match(appSource, /Устранили: \$\{resolver\}/);
  assert.match(serverSource, /Array\.isArray\(body\.participants\)/);
  assert.match(serverSource, /notifyParticipants = addedParticipants/);
  const permissionsSource = fs.readFileSync(path.join(root, "server", "permissions.js"), "utf8");
  assert.match(permissionsSource, /RESOLUTION_EXECUTOR_ROLES/);
  assert.match(serverSource, /action === "admin-close"/);
  assert.match(appSource, /data-admin-close-legacy-remark/);
  assert.match(appSource, /data-toggle-aggregate-repair/);
  assert.match(appSource, /repairMode && item\.kind === "Замечание" && !item\.resolved/);
  assert.match(appSource, /current\.aggregateRepairEquipmentId = 0/);
  assert.match(appSource, /event\?\.action === "confirmed" && event\.confirmerKey && event\.targetKey/);
  assert.match(appSource, /\.filter\(participant => isResolutionExecutorRole\(participant\.role\)\)/);
  assert.match(appSource, /ratingParticipants: completedResolutionParticipants\(entry\)/);
});

test("an executor can submit work immediately and is joined automatically", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /const canWriteResolution = currentParticipant \|\| actorCanJoin/);
  assert.match(source, /const ensureCurrentResolverJoined = async \(\) =>/);
  assert.match(source, /await ensureCurrentResolverJoined\(\);[\s\S]*?"update"/);
  assert.match(source, /await ensureCurrentResolverJoined\(\);[\s\S]*?"resolve"/);
});

test("specialized executor roles can join collaborative resolution", () => {
  const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(source, /const allowedRoles = new Set\(\[[\s\S]*?"welder"[\s\S]*?"turner"[\s\S]*?"forkliftDriver"[\s\S]*?\]\);/);
});

test("an invited resolver receives a personal message that opens the exact remark", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /\["added", "submitted", "returned"\]\.includes\(event\.action\)/);
  assert.match(source, /String\(event\.targetKey \|\| ""\) !== actorKey/);
  assert.match(source, /Вас добавили к совместному устранению/);
  assert.match(source, /data-personal-remark-open-node>Открыть и присоединиться/);
});

test("production remark actions trust the authenticated session instead of a stale phone profile", () => {
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const collaborationEndpoint = serverSource.slice(serverSource.indexOf('if (pathname === "/api/remark-collaboration"'), serverSource.indexOf('if (pathname === "/api/node-update"'));
  assert.match(collaborationEndpoint, /const registeredActor = req\.authUser \|\| \(db\.users \|\| \[\]\)\.find/);
  assert.doesNotMatch(collaborationEndpoint, /requestedActor\.key !== sessionActorKey/);
  assert.match(appSource, /remark_actor_invalid: "Сервер не подтвердил учётную запись сотрудника/);
});

test("joining a collaborative resolution does not require an open attendance shift", () => {
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(serverSource, /attendanceMutationExempt[\s\S]*?pathname === "\/api\/remark-collaboration"/);
  assert.match(serverSource, /action !== "start"[\s\S]*?attendanceRoleAllowed\(registeredActor\)[\s\S]*?!activeAttendanceSession\(db, registeredActor\)/);
  assert.match(appSource, /attendance_required: "Для записи выполненной работы сначала откройте смену/);
});

test("authorized users can close remarks for several employees with or without points", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(client, /function canCloseRemarksForEmployees[\s\S]*?remarkMultiClose/);
  assert.match(client, /data-remark-close-no-score/);
  assert.match(client, /data-close-remark-no-score/);
  assert.match(client, /data-close-remark-with-score/);
  assert.match(client, /function askAdminRemarkClose\(withScore = false\)/);
  assert.doesNotMatch(client, /Почему закрываем предупреждение без начисления баллов/);
  assert.match(client, /overlay\.querySelectorAll\("\[data-close-remark-no-score\]"\)/);
  assert.match(client, /!entry\.closedWithoutScore && !isDowntimeCommentEntry\(entry\)/);
  assert.match(server, /if \(action === "close-no-score"\)/);
  assert.match(server, /canCloseForEmployees = actor\.role === "editor" \|\| activeUserPermission\(registeredActor, "remarkMultiClose"\)/);
  assert.match(server, /const performerKeys = \[\.\.\.new Set/);
  assert.match(server, /deleteWithoutScore = true/);
  assert.match(server, /if \(action === "close-with-score"\)/);
  assert.match(server, /remark\.resolutionCompletedParticipants = performers/);
  assert.match(client, /data-admin-close-performer value=/);
  assert.match(client, /performerKeys: decision\.performerKeys/);
  assert.match(client, /remarkMultiClose","Закрытие замечаний за нескольких сотрудников/);
  assert.match(server, /ADMIN_PERMISSION_KEYS[\s\S]*?remarkMultiClose/);
  assert.match(client, /Предупреждение будет полностью удалено без начисления баллов/);
  const noScoreServer = server.slice(server.indexOf('if (action === "close-no-score")'), server.indexOf('if (action === "close-with-score")'));
  assert.doesNotMatch(noScoreServer, /performerKeys|performerUsers/);
  assert.match(noScoreServer, /deleteWithoutScore = true/);
  assert.match(server, /action: deleteWithoutScore \? "remark_deleted_without_score"/);
  assert.match(server, /function purgeClosedWithoutScoreRemarksServer/);
  assert.match(styles, /\.send-kind-overlay\s*\{[\s\S]*?z-index:\s*5000/);
  assert.match(styles, /\.send-kind-dialog\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 32px\)/);
  assert.match(styles, /@media \(max-width:\s*560px\)[\s\S]*?\.send-kind-dialog/);
});

test("production stops do not reduce the factory reliability score", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(client, /if \(item\.type !== "production"\) months\[created\.month\]\.reliabilityStops \+= 1/);
  assert.match(client, /if \(item\.type !== "production"\) month\.reliabilityDowntimeMs \+= overlapMs/);
  assert.match(client, /month\.reliabilityDowntimeMs \?\? month\.downtimeMs/);
  assert.match(client, /month\.reliabilityStops \?\? month\.stops/);
  assert.match(client, /function downtimeOverlapMsForMonth/);
  assert.match(client, /Number\.isFinite\(month\.openWorks\)/);
  assert.doesNotMatch(client, /const breakdownPenalty/);
  assert.match(client, /downtimeHours \/ 250 \* 30/);
  assert.match(client, /reliabilityStops \?\? month\.stops\) \* 2/);
  assert.match(client, /const openPenalty = Math\.min\(openWorks, 15\)/);
  assert.match(client, /\(100 - qrPercent\) \* 0\.2/);
  assert.match(client, /factory-score-explanation/);
  assert.match(client, /const isFutureMonth =/);
  assert.match(client, /future-baseline/);
  assert.match(client, /<strong>100%<\/strong>/);
  assert.doesNotMatch(client, /Старт месяца/);
  assert.match(client, /индекс текущего месяца/);
  assert.doesNotMatch(client, /\+ \/ - под месяцем показывает рост или падение/);
  assert.match(client, /const breakdownDowntimeItems = downtimeItems\.filter\(item => item\.type !== "production"\)/);
  assert.match(client, /\[\.\.\.createdRemarks, \.\.\.breakdownDowntimeItems\]\.forEach/);
  assert.doesNotMatch(client, /\[\.\.\.createdRemarks, \.\.\.downtimeItems\]\.forEach/);
});

test("PPR resolution drafts survive background rerenders before a mark is submitted", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /querySelectorAll\("\[data-ppr-resolution-input\]"\)/);
  assert.match(source, /row\.resolutionComment = input\.value/);
  assert.match(source, /row\.draftUpdatedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(source, /touchPprSheet\(sheet, false\)/);
  assert.match(source, /publishPprSheetAction\(date, "draft"/);
  assert.match(source, /window\.setTimeout\(queueDraftSave, 700\)/);
  assert.match(source, /draftSaveChain = draftSaveChain\.catch\(\(\) => \{\}\)\.then\(publishDraft\)/);
  assert.match(source, />\$\{escapeHtml\(row\.resolutionComment \|\| ""\)\}<\/textarea>/);
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(server, /\["draft", "mark", "add-row", "approve"\]/);
  assert.match(server, /row\.draftByName = name/);
  assert.doesNotMatch(server, /if \(!row \|\| row\.mark \|\| !String\(row\.work/);
  assert.match(source, /function mergePprSheetRowsLocal\(currentRows = \[\], incomingRows = \[\]\)/);
  assert.match(source, /mergePprSheetsLocal\(state\.pprSheets, remote\.pprSheets\)/);
  assert.doesNotMatch(source, /state\.pprSheets = preferRemote\s*\? \{ \.\.\.\(remote\.pprSheets/);
  assert.match(server, /function mergePprSheetsByFreshness\(current = \{\}, incoming = \{\}\)/);
  assert.match(server, /db\.pprSheets = mergePprSheetsByFreshness\(db\.pprSheets, body\.pprSheets\)/);
  assert.match(source, /function mergePprRowFieldsLocal\(currentRow, incomingRow\)/);
  assert.match(source, /row\.workUpdatedAt = changedAt/);
  assert.match(source, /row\.resolutionUpdatedAt = row\.draftUpdatedAt/);
  assert.match(server, /function mergePprRowFields\(currentRow, incomingRow\)/);
  assert.match(server, /row\.markUpdatedAt = now/);
  assert.match(source, /row\.markUpdatedAt = changedAt/);
  assert.match(server, /incomingTime >= savedTime/);
});

test("PPR synchronization merges concurrent edits to separate fields of the same row", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const start = server.indexOf("function pprRowFreshness(");
  const end = server.indexOf("function mergePprSheetsByFreshness(", start);
  assert.ok(start >= 0 && end > start);
  const implementation = server.slice(start, end);
  const { mergePprRows } = new Function(`${implementation}; return { mergePprRows };`)();
  const current = [{
    id: "row-1",
    work: "Новая работа инженера",
    workUpdatedAt: "2026-08-27T10:05:00.000Z",
    resolutionComment: "Старый результат",
    resolutionUpdatedAt: "2026-08-27T10:00:00.000Z",
    mark: "done",
    markUpdatedAt: "2026-08-27T10:03:00.000Z",
    markedByName: "Исполнитель"
  }];
  const incoming = [{
    id: "row-1",
    work: "Старый план",
    workUpdatedAt: "2026-08-27T09:00:00.000Z",
    resolutionComment: "Новый результат исполнителя",
    resolutionUpdatedAt: "2026-08-27T10:06:00.000Z",
    mark: "",
    markUpdatedAt: "2026-08-27T09:30:00.000Z"
  }];
  const [merged] = mergePprRows(current, incoming);
  assert.equal(merged.work, "Новая работа инженера");
  assert.equal(merged.resolutionComment, "Новый результат исполнителя");
  assert.equal(merged.mark, "done");
  assert.equal(merged.markedByName, "Исполнитель");
});

test("month closing API remains compatible but its panel is removed from the report", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(client, /function canManageMonthClose[^\n]+return isPrimaryAdminEngineer\(user\)/);
  const renderer = client.slice(client.indexOf("function renderEngineerReport"), client.indexOf("function openEngineerReport"));
  assert.doesNotMatch(renderer, /Умное закрытие месяца|monthClosePanelHtml|loadMonthClosePanel/);
  assert.match(client, /data-month-close-conditional/);
  assert.match(client, /data-month-close-full/);
  assert.match(client, /data-month-reopen/);
  assert.doesNotMatch(server, /ADMIN_PERMISSION_KEYS[^\n]+monthCloseManage/);
  assert.match(server, /function monthCloseReadiness/);
  assert.match(server, /item\.type === "production"/);
  assert.match(server, /pathname === "\/api\/month-close"/);
  assert.match(server, /"confirm-area", "close-conditional", "close-full", "reopen"/);
  assert.match(server, /snapshot: \{ \.\.\.readiness/);
  assert.match(client, /monthlyClosures\?\.\[month\.monthKey\]\?\.snapshot\?\.factoryReliabilityScore/);
  assert.match(server, /factoryReliabilityScore:/);
  assert.match(server, /carryoverTo/);
  assert.match(server, /action === "close-conditional" && readiness\.criticalCount/);
  assert.match(client, /data-month-transfer-row/);
  assert.match(client, /Нужно отметить каждую переносимую работу/);
  assert.match(server, /month_transfers_incomplete/);
  assert.match(server, /carryovers: transfers/);
  const readinessSource = server.slice(server.indexOf("function monthCloseReadiness"), server.indexOf("function publicState"));
  assert.doesNotMatch(readinessSource, /db\.requests|openRequests/);
  assert.match(client, /Заявки на закупку здесь не учитываются/);
  assert.match(server, /pathname === "\/api\/month-close" && req\.method === "GET"[\s\S]*?!isPrimaryAdminEngineerServer\(req\.authUser\)/);
  assert.match(server, /pathname === "\/api\/month-close" && req\.method === "POST"[\s\S]*?!isPrimaryAdminEngineerServer\(req\.authUser\)/);
  assert.doesNotMatch(renderer, /canManageMonthClose|monthClosePanelHtml/);
  assert.match(server, /function resetMonthClosePermissionsOnce[\s\S]*?delete user\.permissionOverrides\.monthCloseManage/);
  assert.match(server, /monthClosePermissionResetVersion === "all-users-v1"/);
  assert.match(styles, /\.month-close-panel/);
});

test("gas and compressor printing gathers filled days without date selectors", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(appSource, /function printGasJournalSheet\(section\)/);
  assert.match(appSource, /function printCompressorJournalFilledDays\(area/);
  assert.match(appSource, /gasJournalDateHasFilledRow\(section, row\.date\)/);
  assert.match(appSource, /function printGasJournalSections\(sections = \["A", "B"\], includeBlank = false\)/);
  assert.match(appSource, /data-gas-print-all/);
  assert.match(appSource, /data-gas-print-blank-a/);
  assert.match(appSource, /gas-official-head/);
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(styles, /Unified aggregate-journal frame for both SHGRP sections/);
  assert.match(appSource, /compressorJournalFilledRows\(area\)\.sort/);
  assert.match(appSource, /thead\{display:table-header-group\}/);
  assert.doesNotMatch(appSource, /data-gas-saved-date/);
  assert.doesNotMatch(appSource, /data-compressor-saved-date/);
  assert.doesNotMatch(appSource, /data-print-compressor-sheet/);
});

test("request output archives before mobile share or desktop print starts", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(appSource, /async function archiveTmcRequestAfterOutput\(req, action\)/);
  const archiveFlow = appSource.match(/async function archiveTmcRequestAfterOutput\(req, action\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(archiveFlow.indexOf("saveState();") < archiveFlow.indexOf("sendRequestByDevice(req)"));
  assert.match(archiveFlow, /const publishPromise = publishStateNow\(\)/);
  assert.match(archiveFlow, /const outputStarted = await sendRequestByDevice\(req\)/);
  assert.match(archiveFlow, /return \{ archived: true, outputStarted \}/);
  assert.match(appSource, /req\.archivedAt \|\|= now/);
  assert.match(appSource, /Открыто в WhatsApp и сохранено в архив/);
  assert.match(appSource, /Отправлено на печать и сохранено в архив/);
  assert.match(appSource, /function openRequestInWhatsApp\(req\)/);
  assert.doesNotMatch(archiveFlow, /navigator\.share/);
  assert.match(appSource, /tr \{ break-inside: avoid; page-break-inside: avoid; \}/);
  assert.match(appSource, /if \(result\?\.request\) \{[\s\S]*?archiveTmcRequestAfterOutput/);
  assert.match(appSource, /Зам\. директора __________________/);
  assert.match(appSource, /function downloadRequestPrintFile\(req\)/);
  assert.match(appSource, /data-save-download-request-archive/);
  assert.doesNotMatch(appSource, />Сохранить и WhatsApp</);
  assert.doesNotMatch(appSource, />Сохранить и печатать</);
  assert.doesNotMatch(appSource, /data-print-request-archive-all/);
  assert.match(appSource, /Скачано на компьютер и сохранено в архив/);
});

test("warehouse role, screen, endpoint, and money report blocks are removed", async () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.doesNotMatch(html, /data-open-role="warehouse"/);
  assert.doesNotMatch(html, /id="warehousePanel"/);
  assert.doesNotMatch(html, /Цех \/ склад/);
  const roles = appSource.slice(appSource.indexOf("const ROLE_ACCESS"), appSource.indexOf("const ROLE_PERMISSION_BASE"));
  assert.doesNotMatch(roles, /warehouse:/);
  const report = appSource.slice(appSource.indexOf("function engineerMonthlyReportHtml"), appSource.indexOf("function renderEngineerReport"));
  assert.doesNotMatch(report, /Затраты по складу|Цена услуги|formatMoney/);
  assert.match(serverSource, /function removeWarehouseWorkflow\(db\)/);
  assert.match(serverSource, /db\.inventory = \{\}/);
  assert.match(serverSource, /filter\(user => user\?\.role !== "warehouse"\)/);
  assert.doesNotMatch(serverSource, /pathname === "\/api\/warehouse\/issue"/);
  const removedEndpoint = await fetch(`${baseUrl}/api/warehouse/issue`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  assert.notEqual(removedEndpoint.status, 200);
});

test("create request feature is removed and production erases request records", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(client, /const TMC_REQUESTS_DISABLED = true/);
  assert.match(client, /function disableTmcRequestFeature\(\)/);
  assert.match(client, /ui\.createTmcRequestButton\?\.remove\(\)/);
  assert.match(client, /ui\.requestCreateScreen\?\.remove\(\)/);
  assert.match(client, /state\.requests = TMC_REQUESTS_DISABLED\s*\? \{\}/);
  assert.match(server, /const TMC_REQUESTS_DISABLED = process\.env\.NODE_ENV !== "test"/);
  assert.match(server, /if \(TMC_REQUESTS_DISABLED\) db\.requests = \{\}/);
  assert.match(server, /error: "request_feature_removed"/);
});

test("mobile navigation reuses one attendance button instead of the removed request slot", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.equal((html.match(/id="attendanceHomeButton"/g) || []).length, 1);
  assert.doesNotMatch(html, /data-mobile-view="requestCreate"/);
  assert.doesNotMatch(html, /data-mobile-view="requests"/);
  assert.match(html, /id="attendanceHomeButton"[^>]*data-mobile-view="attendance"/);
  assert.match(client, /function placeSingleAttendanceButton\(\)/);
  assert.match(client, /mobileNav\.prepend\(button\)/);
  assert.match(client, /quickNav\.insertBefore\(button, permitButton\)/);
  assert.match(styles, /\.mobile-nav \[data-mobile-view="attendance"\]/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
});

test("a full server refresh replaces stale local check records", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(appSource, /state\.checks = preferRemote\s*\? compactCheckRecords\(\{ \.\.\.\(remote\.checks \|\| \{\}\) \}\)\s*:\s*compactCheckRecords\(mergeCheckRecordsLocal\(state\.checks, remote\.checks\)\)/);
});

test("annual PPR schedule is desktop-only and follows the live equipment catalog", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(appSource, /function annualPprRows\(year\)/);
  assert.match(appSource, /allEquipment\(\)[\s\S]*flatMap\(eq => eq\.nodes\.map/);
  assert.match(appSource, /function annualPprAutomaticPlan\(eq, node, year\)/);
  assert.match(appSource, /recommendedMaintenanceForDate\(eq, date\)/);
  assert.match(appSource, /isNodeCheckedForGroup\(rec, "technical"\)/);
  assert.match(appSource, /openAnnualPprSchedule\(initialYear = new Date\(\)\.getFullYear\(\)\)/);
  assert.match(appSource, /\["ТО", "ТР", "АР"\]\.filter\(type => types\.has\(type\)\)\.join\(" "\)/);
  assert.match(appSource, /@page\{size:A3 landscape/);
  assert.match(stylesSource, /@media \(max-width: 900px\)[\s\S]*\.desktop-annual-ppr-button, \.annual-ppr-overlay/);
});

test("only admin or an explicitly permitted engineer can edit annual PPR", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(appSource, /function canEditAnnualPpr\(\)/);
  assert.match(appSource, /profile\?\.role === "engineer" && activeUserPermission\([\s\S]*"annualPprEdit"\)/);
  assert.match(appSource, /Редактирование годового графика ППР/);
  assert.match(serverSource, /req\.authUser\?\.role === "editor"[\s\S]*req\.authUser\?\.role === "engineer" && activeUserPermission\(req\.authUser, "annualPprEdit"\)/);
  assert.match(serverSource, /annual_ppr_permission_denied/);
});

test("administration keeps four primary tabs and only useful technical tools", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(stylesSource, /\.admin-maintenance-tabs\.segmented\s*\{[\s\S]*grid-template-columns: repeat\(4/);
  assert.match(appSource, /primaryAdminTabs = new Set\(\["trash", "backups", "audit", "report"\]\)/);
  assert.match(appSource, /class="admin-technical-tools"/);
  for (const tab of ["instructionLog", "storage", "broadcasts", "settings", "transfer", "access", "automation", "archives", "integrity"]) {
    assert.match(appSource, new RegExp(`data-admin-maintenance-tab="${tab}"`));
  }
  assert.doesNotMatch(appSource, /Инструкция администратора/);
  assert.doesNotMatch(appSource, /data-admin-maintenance-tab="guide"/);
  assert.doesNotMatch(appSource, /data-open-push-diagnostics|openPushDiagnostics|Push-устройства/);
  assert.doesNotMatch(appSource, /data-admin-maintenance-tab="forms"/);
  assert.doesNotMatch(appSource, /data-admin-maintenance-tab="activity"/);
  assert.match(stylesSource, /@media \(max-width: 1180px\)[\s\S]*repeat\(2/);
  assert.match(stylesSource, /@media \(max-width: 760px\)[\s\S]*repeat\(2/);
});

test("worker rating is calculated and displayed separately for each calendar month", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(appSource, /ratingMonth: todayISO\(\)\.slice\(0, 7\)/);
  assert.match(appSource, /id="workerRatingMonth" type="month"/);
  assert.match(appSource, /function workerRatingStats\(period = current\.ratingMonth/);
  assert.match(appSource, /workerRatingPointMap\(year, monthIndex\)/);
  assert.match(appSource, /at\.month !== monthIndex/);
  assert.match(appSource, /current\.ratingMonth = ui\.workerRatingMonth\.value/);
});

test("forklift drivers, welders and turners never participate in the employee rating", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(appSource, /function isWorkerRatingRole\(role\)/);
  assert.match(appSource, /\["forkliftDriver", "welder", "turner"\]/);
  assert.match(appSource, /\.filter\(user => isWorkerRatingRole\(user\.role\)\)/);
  assert.match(appSource, /if \(!isWorkerRatingRole\(role\)\) return/);
  assert.match(appSource, /const eligibleKeys = new Set\(loadUsers\(\)/);
  assert.match(appSource, /filter\(item => eligibleKeys\.has\(String\(item\?\.key/);
});

test("annual PPR can be downloaded or shared as an A3 landscape PDF", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(appSource, /async function shareAnnualPprPdf\(/);
  assert.match(appSource, /format: "a3", orientation: "landscape"/);
  assert.match(appSource, /Math\.ceil\(rowPairs\.length \/ 12\)/);
  assert.match(appSource, /await window\.html2canvas\(page/);
  assert.match(appSource, /pdf\.addPage\("a3", "landscape"\)/);
  assert.match(serverSource, /node_modules\/html2canvas\/dist\/html2canvas\.min\.js/);
  assert.match(serverSource, /node_modules\/jspdf\/dist\/jspdf\.umd\.min\.js/);
  assert.match(appSource, /navigator\.canShare\?\.\(\{ files: \[file\] \}\)/);
  assert.match(appSource, /link\.download = fileName/);
  assert.match(appSource, /data-share-annual-ppr-pdf/);
  assert.match(appSource, /clone\.style\.left = "0"/);
  assert.doesNotMatch(appSource, /clone\.style\.left = "-20000px"/);
});

test("annual PPR records equipment replacement and commissioning with printable Kazakhstan act fields", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(appSource, /ANNUAL_PPR_TYPES = \["", "ТО", "КР"\]/);
  assert.match(appSource, /function openAnnualPprActs\(/);
  assert.match(appSource, /приказ МФ РК № 562/i);
  assert.match(appSource, /name="manufacturer"/);
  assert.match(appSource, /name="serialNumber"/);
  assert.match(appSource, /name="passportNumber"/);
  assert.match(appSource, /name="requiredWorks"/);
  assert.match(appSource, /function printAnnualPprActsTogether\(/);
  assert.match(appSource, /application\/msword;charset=utf-8/);
  assert.match(appSource, /Скачать комплект Word/);
  assert.match(stylesSource, /\.annual-ppr-act-columns/);
});

test("downtime chart legend shows monthly breakdown and production stop counters", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(appSource, /const productionCount = items\.filter\(item => item\.type === "production"\)\.length/);
  assert.match(appSource, /const breakdownCount = items\.filter\(item => item\.type !== "production" && item\.type !== "remark"\)\.length/);
  assert.match(appSource, /"поломка", "поломки", "поломок"/);
  assert.match(appSource, /"производственная остановка"/);
  assert.match(appSource, /class="downtime-legend-counts"/);
  assert.match(appSource, /\$\{breakdownText\} · \$\{durationText\(item\.breakdownMs\)\}/);
  assert.match(appSource, /\$\{productionText\} · \$\{durationText\(item\.productionMs\)\}/);
  assert.match(styles, /\.downtime-legend-counts/);
});

test("downtime shop buttons expand an inline journal responsively", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(appSource, /function downtimeDetailsHtml\(area\)/);
  assert.match(appSource, /class="downtime-expanded-mobile"/);
  assert.match(appSource, /class="downtime-expanded-desktop"/);
  assert.match(appSource, /aria-expanded="\$\{selected\}"/);
  assert.match(appSource, /const canCollapse = control\.matches\("button"\) && current\.selectedDowntimeArea === area/);
  assert.match(styles, /\.downtime-legend-buttons\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit/);
  assert.match(styles, /@media \(max-width:\s*680px\)[\s\S]*?\.downtime-legend-buttons\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(styles, /\.downtime-expanded-mobile\s*\{[\s\S]*?display:\s*none/);
});

test("downtime journal paginates A4 sheets and prints current, selected, or all pages", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(appSource, /const DOWNTIME_JOURNAL_ROWS_PER_SHEET = 6/);
  assert.match(appSource, /function downtimeJournalSheetsHtml\(area, selectedItems\)/);
  assert.match(appSource, /Лист \$\{pageIndex \+ 1\} из \$\{pageCount\}/);
  assert.match(appSource, /function parseDowntimePrintPages\(value, pageCount\)/);
  assert.match(appSource, /function printDowntimeJournal\(area, pageNumbers = \[\]\)/);
  assert.match(appSource, /function openDowntimePrintDialog\(area, currentPage = 1\)/);
  assert.match(appSource, /Текущий лист \$\{currentPage\}/);
  assert.match(appSource, /Все листы/);
  assert.match(appSource, /Например: 1, 3 или 2-4/);
  assert.match(appSource, /@page\{size:A4 landscape/);
  assert.match(appSource, /<th>Подтвердил<\/th>/);
  assert.match(styles, /\.downtime-journal-sheet/);
  assert.match(styles, /\.downtime-journal-table/);
});

test("selected engineers and the administrator can confirm remarks from every shop", () => {
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(serverSource, /ADMIN_PERMISSION_KEYS[\s\S]*?remarkGlobalConfirm/);
  assert.match(serverSource, /activeUserPermission\(user, "remarkGlobalConfirm"\)/);
  assert.match(serverSource, /permissionBaseRoleServer\(actor\?\.role\) === "editor"/);
  assert.match(clientSource, /function canConfirmRemarksAcrossShops[\s\S]*?remarkGlobalConfirm/);
  assert.match(clientSource, /remarkGlobalConfirm","Подтверждение замечаний всех цехов/);
  assert.match(clientSource, /Открыть карточку/);
  assert.match(clientSource, /Подтверждения всех цехов доступны/);
  assert.match(clientSource, /isAdminEngineerBlock[\s\S]*?current\.requestRole === "engineer"/);
  assert.match(clientSource, /ИНЖЕНЕР · ДЛЯ АДМИНИСТРАТОРА/);
  assert.match(clientSource, /if \(isEditorSession\(\)\) return role === "engineer"/);
  assert.match(clientSource, /data-personal-remark-close-no-score/);
  assert.match(clientSource, /publishRemarkCollaborationAction\(message\.equipmentId, message\.nodeIndex, message\.date, "close-no-score"/);
});

test("removed requests leave confirmations visible and never reduce factory status", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(clientSource, /if \(MANUAL_REQUEST_WORKFLOW\) \{[\s\S]*?Подтверждение устранённых замечаний/);
  assert.doesNotMatch(clientSource, /Заявки — только документы|Заявки не требуют подтверждения/);
  assert.match(clientSource, /if \(MANUAL_REQUEST_WORKFLOW\) \{[\s\S]*?const draft = buildMobileTmcRequestDraft\(\)[\s\S]*?archiveTmcRequestAfterOutput/);
  assert.match(clientSource, /const emergencyRequests = 0/);
  const reminders = clientSource.slice(clientSource.indexOf("function directorReminderItems"), clientSource.indexOf("function globalControlEquipment"));
  assert.doesNotMatch(reminders, /allRequests|Просрочена заявка/);
  const repairs = clientSource.slice(clientSource.indexOf("function annualRepairEvents"), clientSource.indexOf("function directorAnnualStats"));
  assert.doesNotMatch(repairs, /allRequests/);
});

test("mobile users use the single main warnings button", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(htmlSource, /id="alertCounter"[\s\S]*?Предупреждения/);
  assert.doesNotMatch(htmlSource, /data-mobile-view="requests"/);
  assert.match(clientSource, /view === "requests" && MANUAL_REQUEST_WORKFLOW\) return isProfileReady\(\)/);
  assert.match(clientSource, /mobileRemarkCount\.textContent = ownWaiting/);
  assert.match(stylesSource, /\.mobile-nav \[data-mobile-view="attendance"\][\s\S]*?grid-column:\s*1/);
});

test("director private messaging is removed while admin employee approval remains", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(clientSource, /directorMessages|createDirectorMessage|renderDirectorSendForm|data-open-director-messages|Директорская/);
  assert.doesNotMatch(htmlSource, /Директорская|Личные обращения директору/);
  assert.match(clientSource, /function renderDirector\(\)[\s\S]*?if \(!isEditorSession\(\)\)/);
  assert.match(clientSource, /ui\.directorPanel\.innerHTML = renderDirectorUsers\(\)/);
  assert.match(serverSource, /delete db\.directorMessages/);
  assert.doesNotMatch(serverSource, /directorMessages:\s*db\.directorMessages|mergeArrayById\(db\.directorMessages/);
});

test("order journal is separate, permission controlled, and scores every selected performer", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(htmlSource, /id="ordersButton"/);
  assert.match(htmlSource, /id="ordersScreen"/);
  assert.match(clientSource, /function renderOrders\(\)/);
  assert.match(clientSource, /type: "order"/);
  assert.match(serverSource, /pathname === "\/api\/orders\/action"/);
  assert.match(serverSource, /ADMIN_PERMISSION_KEYS[\s\S]*?orderJournalManage/);
  assert.match(clientSource, /function canViewOrderJournal[\s\S]*?\["mechanic", "electrician", "forkliftDriver", "operator"\]/);
  assert.match(clientSource, /\["engineer", "shop"\]\.includes\(role\)[\s\S]*?orderJournalManage/);
  assert.match(clientSource, /ui\.ordersButton\.hidden = !canViewOrderJournal\(\)/);
  assert.match(serverSource, /\["engineer", "shop"\]\.includes\(engineerPermissionRoleServer\(registeredActor\)\)/);
  assert.match(serverSource, /pointsPerPerformer = order\.withScore \? 15 : 0/);
  assert.match(serverSource, /Array\.isArray\(body\.performerKeys\)/);
  assert.match(clientSource, /function printOrderJournal\(orders = \[\]\)/);
  assert.match(clientSource, /data-print-order/);
  assert.match(clientSource, /data-print-all-orders/);
  assert.match(clientSource, /@page\{size:A4 landscape/);
  assert.doesNotMatch(clientSource, /window\.open\("", "_blank", "noopener,noreferrer"\)/);
});

test("aggregate journal corrections reassign the scorer while no-score warnings are deleted", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(clientSource, /!entry\.closedWithoutScore && !isDowntimeCommentEntry\(entry\)/);
  assert.match(clientSource, /item\.resolved && !item\.closedWithoutScore/);
  assert.match(serverSource, /action: deleteWithoutScore \? "remark_deleted_without_score"/);
  assert.match(clientSource, /data-correct-resolved-remark/);
  assert.match(clientSource, /Комментарий исправил/);
  assert.match(serverSource, /action === "admin-edit-resolved"/);
  assert.match(clientSource, /canCorrectAggregateJournal/);
  assert.match(clientSource, /aggregateJournalCorrect","Исправление записей агрегатного журнала/);
  assert.match(serverSource, /activeUserPermission\(registeredActor, "aggregateJournalCorrect"\)/);
  assert.match(serverSource, /remark\.resolutionCompletedParticipants = \[performer\]/);
  assert.match(serverSource, /remark\.confirmedByKey = actor\.key/);
  const correctionBlock = serverSource.slice(serverSource.indexOf('if (action === "admin-edit-resolved")'), serverSource.indexOf('if (action === "confirm")'));
  assert.match(correctionBlock, /remark\.correctedDefectText = defectText/);
  assert.match(correctionBlock, /remark\.correctedResolvedComment = resolvedComment/);
  assert.match(correctionBlock, /remark\.correctionReason = correctionReason/);
  assert.doesNotMatch(correctionBlock, /remark\.text\s*=\s*defectText/);
  assert.doesNotMatch(correctionBlock, /remark\.resolvedComment\s*=\s*resolvedComment/);
  assert.match(clientSource, /Исправленный комментарий:/);
  assert.match(clientSource, /data-correction-reason/);
  assert.doesNotMatch(correctionBlock, /remark\.confirmedByKey\s*=/);
});

test("production work section is named welder and turner", () => {
  const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(htmlSource, /<span>Сварщик и токарь<\/span>/);
  assert.match(clientSource, /<h1>Сварщик и токарь<\/h1>/);
});

test("admin can build a QR-linked journal for created equipment without changing factory journals", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server/admin-equipment-config-route.js"), "utf8");
  assert.match(clientSource, /function openCustomJournalEditor\(eq\)/);
  assert.match(clientSource, /data-edit-journal/);
  assert.match(clientSource, /Ко всему оборудованию/);
  assert.match(clientSource, /К конкретному узлу/);
  assert.match(clientSource, /Периодичность обхода/);
  assert.match(clientSource, /2 раза: дневная и ночная смена/);
  assert.match(clientSource, /data-journal-fields-timing/);
  assert.match(clientSource, /data-journal-result-mode/);
  assert.match(clientSource, /Сохранить обход/);
  assert.match(clientSource, /customSchema\?\.frequency === "daily"/);
  assert.match(clientSource, /customJournal: options\.customJournal \|\| null/);
  assert.match(clientSource, /function renderCustomEquipmentJournal\(eq\)/);
  assert.match(serverSource, /\/api\/admin\/equipment\/journal-schema/);
  assert.match(serverSource, /item\.created !== true/);
  assert.match(serverSource, /journal_schema_protected/);
  assert.match(serverSource, /equipment_journal_schema_updated/);
  assert.match(serverSource, /frequency: resultMode|frequency,/);
});

test("PPR completion records the actual performer and resolution comment", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(clientSource, /Исполнитель и комментарий об устранении/);
  assert.match(clientSource, /data-ppr-resolution-input/);
  assert.match(clientSource, /Напишите комментарий о выполненной работе/);
  assert.match(clientSource, /Напишите причину отметки «Не требуется»/);
  assert.match(serverSource, /row\.resolutionComment = mark \?/);
  assert.match(serverSource, /row\.markedByRole = mark \? role/);
});

test("organization settings and role-name editor are no longer accessible", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(clientSource, /\["forms", "activity", "settings", "monitoring", "guide"\]/);
  assert.match(clientSource, /maintenanceTabs\?\.querySelector\('\[data-admin-maintenance-tab="settings"\]'\)\?\.remove/);
  assert.doesNotMatch(clientSource, /data-role-label=/);
  assert.doesNotMatch(clientSource, /Вернуть стандартные названия/);
});

test("engineer PPR report groups completed work compactly", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const start = clientSource.indexOf("function engineerMonthlyReportHtml");
  const end = clientSource.indexOf("function monthClosePanelHtml", start);
  const reportSource = clientSource.slice(start, end);
  assert.match(reportSource, /class="engineer-ppr-table"/);
  assert.match(reportSource, /class="engineer-ppr-progress">\$\{completed\}\/\$\{item\.works\.length\}/);
  assert.match(reportSource, /<summary>Показать работы<\/summary>/);
  assert.match(reportSource, /const performers = \[\.\.\.new Set/);
  assert.match(reportSource, /const equipmentGroups = new Map/);
  assert.doesNotMatch(reportSource, /Работы и исполнители/);
  assert.match(styles, /\.engineer-ppr-status\.accepted/);
  assert.match(styles, /html\[data-theme="dark"\] \.engineer-ppr-progress/);
});

test("closing without score replaces the check record on every realtime client", () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(serverSource, /deleteWithoutScore \? \{ replaceCheckKeys: \[recordKey\] \} : \{\}/);
  assert.match(clientSource, /Array\.isArray\(remote\.replaceCheckKeys\)/);
  assert.match(clientSource, /state\.checks\[recordKey\] = compactCheckRecords/);
  assert.match(clientSource, /delete state\.checks\[recordKey\]/);
});

test("deleted warnings cannot return from a stale device", () => {
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(serverSource, /db\.remarkDeletionTombstones/);
  assert.match(serverSource, /function applyRemarkDeletionTombstonesServer/);
  assert.match(serverSource, /remarkDeletionKeyServer\(recordKey, remarkId\)/);
  assert.match(serverSource, /returnedLegacyWarnings20260826/);
  assert.match(serverSource, /ямага су жиналган жасалды/);
  assert.match(serverSource, /замена краник сварщик керек/);
  assert.match(serverSource, /стол жасау керек/);
});
