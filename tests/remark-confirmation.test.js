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
        "2": { name: "Оборудование Б", area: "Цех Б", nodes: ["Узел Б1"] }
      }
    },
    directorMessages: [],
    serviceCosts: [],
    downtimes: [{
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
    }],
    compressorJournal: {},
    gasJournal: {},
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
      CODEX_AGENT_TOKEN: "test-codex-agent-token",
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
  assert.deepEqual(pending.resolutionEvents.at(-1).recipientKeys.sort(), ["id:shop-a", "id:shop-a-2"]);

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
  assert.deepEqual(otherPending.resolutionEvents.at(-1).recipientKeys.sort(), ["id:shop-a", "id:shop-a-2"]);
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
  assert.deepEqual(firstPending.resolutionEvents.at(-1).recipientKeys, ["id:engineer-1"]);

  const returnedResponse = await postRemark("2:0:2026-07-16", "remark-engineer", "return", engineer, {
    reason: "Нужно переделать"
  });
  const returned = patchedRemark(returnedResponse, "2:0:2026-07-16", "remark-engineer");
  assert.equal(returned.resolutionPendingConfirmation, false);
  assert.equal(returned.resolutionReturnReason, "Нужно переделать");
  assert.deepEqual(returned.resolutionEvents.at(-1).recipientKeys, ["id:mechanic-1"]);
  assert.equal(returned.resolutionEvents.at(-1).targetKey, "id:mechanic-1");
  assert.equal(returned.resolutionEvents.at(-1).targetRole, "mechanic");

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

  const finalResponse = await postRemark("2:0:2026-07-16", "remark-engineer", "confirm", engineer);
  const finalRemark = patchedRemark(finalResponse, "2:0:2026-07-16", "remark-engineer");
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
  assert.match(source, /const personalCount = isEditorSession\(\) \? 0 : personalRemarkMessages\(\)\.length/);
  assert.match(source, /const personalWaiting = role === profile\?\.role \? personalCount : 0/);
  assert.match(source, /role-personal-count">Личные:/);
  assert.match(source, /function canSeeRequestRoleIndicator[\s\S]*?if \(MANUAL_REQUEST_WORKFLOW\)[\s\S]*?if \(isEditorSession\(\) \|\| role === "all"\) return false[\s\S]*?return role === profile\?\.role/);
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
  assert.match(source, /AGGREGATE_JOURNAL_ROWS_PER_SHEET = 10/);
  assert.match(source, /function printAggregateJournal\(area, selectedSheetIndex = null\)/);
  assert.match(source, /data-print-aggregate-sheet/);
  assert.match(source, /@page \{ size: A4 landscape; margin: 7mm; \}/);
  assert.match(source, /thead \{ display: table-header-group; \}/);
  assert.match(source, /page-break-inside: avoid/);
  assert.match(source, /class="print-sheet continuous"/);
  assert.match(source, /allSheets\.slice\(1\)/);
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
  assert.match(client, /function workerRatingLedger\(year, workerKey\)/);
  assert.match(client, /workerRatingPointMap\(year, null, ledger\)/);
  assert.match(client, /function canAuditWorkerRating\(\)/);
  assert.match(client, /return profile\?\.role === "editor" \|\| hasEngineerInboxAccess\(\)/);
  assert.match(client, /if \(!canAuditWorkerRating\(\)\) return/);
  assert.match(client, /data-worker-rating-details=/);
  assert.match(client, /entries\.reduce\(\(sum, item\) => sum \+ item\.points, 0\)/);
  assert.match(styles, /\.worker-rating-ledger-modal/);
  assert.match(styles, /max-height: 94dvh/);
  assert.match(html, /app\.js\?v=327-ppr-autofill-refresh/);
  assert.match(html, /styles\.css\?v=327-ppr-autofill-refresh/);
  assert.match(serviceWorker, /app\.js\?v=327-ppr-autofill-refresh/);
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
  assert.match(client, /now - lastScanAt >= 220/);
  assert.match(client, /const maxSide = 960/);
  assert.match(client, /data-qr-torch/);
  assert.match(client, /navigator\.vibrate\?\.\(\[80, 40, 80\]\)/);
  assert.match(client, /}, 30000\)/);
  assert.match(client, /let submitting = false/);
  assert.match(server, /pathname === "\/api\/qr-walk\/mark"/);
  assert.match(server, /if \(existing\?\.done\)/);
  assert.match(server, /broadcastState\(result\.origin, result\.actionId, \{ checks:/);
});

test("notification setup stops nagging unsupported and legacy phones", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /function notificationDeviceCapability\(\)/);
  assert.match(source, /Number\(iosMatch\[1\]\) === 16 && Number\(iosMatch\[2\]\) < 4/);
  assert.match(source, /\["ready", "unsupported", "failed"\]\.includes\(setupState\)/);
  assert.match(source, /data-notification-dismiss/);
  assert.match(source, /failures >= 2/);
});

test("Uzbek Cyrillic user messages are translated for Russian recipients", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.doesNotMatch(serverSource, /if \(language === "ru"\) return JSON\.stringify\(payload\)/);
  assert.doesNotMatch(serverSource, /target === "ru" && \/\^\[\\u0400-\\u04FF/);
  assert.match(serverSource, /function normalizeTranslationSource\(text, target\)/);
  assert.match(serverSource, /Pressga moy qo'shish kerak\. Moy darajasi kamaygan\. Daraja ko'rsatkichi ishlamayapti\./);
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
  assert.match(source, /CREATE TABLE IF NOT EXISTS ppr_photos/);
  assert.match(source, /SELECT mime_type, payload FROM ppr_photos WHERE file_name = \$1/);
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
  assert.match(htmlSource, /data-mobile-request-count/);
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
    leakGrounding: "исправно",
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
  assert.match(appSource, /function compressorJournalAddDays\(dateISO, days\) \{[\s\S]*?setUTCDate\(date\.getUTCDate\(\) \+ days\)/);
  assert.match(appSource, /function addDaysISO\(dateISO, days\) \{[\s\S]*?setUTCDate\(date\.getUTCDate\(\) \+ days\)/);
  assert.match(appSource, /data-mobile-label="Давление воздуха"/);
  assert.match(appSource, /const locked = compressorJournalRowComplete\(row\)/);
  assert.match(appSource, /data-compressor-field="airPressure"[\s\S]*?\$\{locked \? "disabled" : ""\}/);
  assert.match(styleSource, /\.compressor-date-fix-button/);
  assert.match(styleSource, /\.compressor-journal-table input:disabled/);
  assert.match(styleSource, /\.compressor-mobile-date-panel/);
  assert.match(styleSource, /\.compressor-journal-table tbody tr \{[\s\S]*?border-radius: 11px/);
  assert.match(styleSource, /\.compressor-journal-table input,[\s\S]*?font-size: 16px !important/);
  assert.match(appSource, /aria-label="\$\{escapeHtml\(row\.compressor\)\} — утечки и заземление"/);
  assert.match(appSource, /input\.addEventListener\("change", \(\) => \{\s*renderEquipment\(\);/);
  assert.match(styleSource, /\.equipment-journal-cell \.compressor-journal-alert \{[\s\S]*?animation: none !important/);
  assert.match(styleSource, /\.compressor-journal-alert \{ animation: none !important/);
});

test("only the primary admin also receives the engineer workflow", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(client, /PRIMARY_ADMIN_ENGINEER_EMPLOYEE_ID = "87064091893"/);
  assert.match(client, /function hasEngineerInboxAccess\(user = profile\)/);
  assert.match(client, /"Админ \+ Инженер"/);
  assert.match(server, /PRIMARY_ADMIN_ENGINEER_EMPLOYEE_ID = "87064091893"/);
  assert.match(server, /function engineerPermissionRoleServer\(profile = \{\}\)/);
  assert.match(server, /isPrimaryAdminEngineerServer\(profile\) \? "engineer"/);
});

test("the create request button uses a calm halo instead of blinking", () => {
  const style = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(style, /#createTmcRequestButton\.request-alert,[\s\S]*?animation: requestButtonHalo 2\.2s ease-in-out infinite !important/);
  assert.match(style, /@keyframes requestButtonHalo/);
  assert.match(style, /box-shadow: 0 0 0 7px rgba\(22, 130, 170, \.25\)/);
});

test("the Hofmann forklift drives, smokes and carries aluminum profiles without blocking the app", () => {
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const style = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(app, /function setupHofmannForkliftMascot\(\)/);
  assert.match(app, /forklift-smoke/);
  assert.match(app, /forklift-aluminum-load/);
  assert.match(app, /HOFMANN/);
  assert.match(app, /ALUMINIUM/);
  assert.match(app, /is-loading/);
  assert.match(app, /is-carrying/);
  assert.doesNotMatch(app, /forklift-spider-driver/);
  assert.doesNotMatch(app, /forklift-web-screen/);
  assert.doesNotMatch(app, /is-web-shooting/);
  assert.match(app, /document\.body\.append\(mascot\);\s+mascot\.hidden = true/);
  assert.match(style, /pointer-events: none/);
  assert.match(style, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(style, /@keyframes forkliftSmoke/);
  assert.match(style, /@keyframes hofmannFlagWave/);
  assert.doesNotMatch(style, /@keyframes webLineShoot/);
  assert.doesNotMatch(style, /@keyframes webNetOpen/);
  assert.match(sw, /assets\/hofmann-forklift\.png/);
  assert.match(server, /assets\/hofmann-forklift\.png/);
});

test("admin garbage check is read-only and Back skips invalid history entries", () => {
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const style = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(app, /id="storageDiagnosticsButton">Проверить мусор/);
  assert.match(app, /apiJson\("\/api\/admin\/storage-status"/);
  assert.match(app, /Только проверка — ничего не удалено/);
  assert.match(server, /pathname === "\/api\/admin\/storage-status" && req\.method === "GET"/);
  assert.match(server, /safeCheckOnly: true/);
  assert.match(server, /req\.authUser\?\.role !== "editor"/);
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

test("only the primary admin can create and read Codex tasks", async () => {
  const clientSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(clientSource, /data-codex-selected-files/);
  assert.match(clientSource, /data-remove-codex-file/);
  assert.match(clientSource, /selectedFiles\.splice/);
  assert.match(clientSource, /primaryAdminCodexLiveTimer = window\.setInterval\(pollPrimaryAdminCodexTasks, 3000\)/);
  assert.match(clientSource, /if \(!isPrimaryAdminEngineer\(\)\) return/);
  assert.match(clientSource, /showAppToast\(`Codex:/);
  assert.match(clientSource, /requestedView === "codex" && isPrimaryAdminEngineer\(\)/);
  assert.match(clientSource, /Статус обновляется автоматически/);
  const bridgeSource = fs.readFileSync(path.join(root, "agent", "codex-bridge.mjs"), "utf8");
  assert.match(bridgeSource, /совет, инструкцию или ответ на вопрос/);
  assert.match(bridgeSource, /CODEX_AGENT_POLL_MS\) \|\| 5000/);
  const forbidden = await fetch(`${baseUrl}/api/admin/codex-tasks`, {
    headers: { "x-test-user-id": "engineer-1" }
  });
  assert.equal(forbidden.status, 403);
  const promote = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": "editor-1" },
    body: JSON.stringify({
      id: "editor-1",
      employeeId: "87064091893",
      name: "Администратор",
      role: "editor",
      approved: true,
      pendingApproval: false
    })
  });
  assert.equal(promote.status, 200, await promote.text());
  const fileData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const upload = await fetch(`${baseUrl}/api/photos`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": "editor-1" },
    body: JSON.stringify({ data: fileData })
  });
  const uploadBody = await upload.json();
  assert.equal(upload.status, 200, JSON.stringify(uploadBody));
  const created = await fetch(`${baseUrl}/api/admin/codex-tasks`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": "editor-1" },
    body: JSON.stringify({
      text: "Проверить отображение должности сотрудника во всех разделах.",
      attachments: [{ name: "screen.png", type: "image/png", size: 68, url: uploadBody.url }]
    })
  });
  const createdBody = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  assert.equal(createdBody.task.status, "new");
  const list = await fetch(`${baseUrl}/api/admin/codex-tasks`, {
    headers: { "x-test-user-id": "editor-1" }
  });
  const listBody = await list.json();
  assert.equal(list.status, 200, JSON.stringify(listBody));
  assert.equal(listBody.agentConnected, false);
  assert.equal(listBody.tasks[0].id, createdBody.task.id);
  assert.equal(listBody.tasks[0].attachments[0].name, "screen.png");
  assert.equal(listBody.tasks[0].attachments[0].url, uploadBody.url);
  const unauthorizedUpdate = await fetch(`${baseUrl}/api/agent/codex-tasks/${encodeURIComponent(createdBody.task.id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "accepted", estimatedMinutes: 45 })
  });
  assert.equal(unauthorizedUpdate.status, 401);
  const agentUpdate = await fetch(`${baseUrl}/api/agent/codex-tasks/${encodeURIComponent(createdBody.task.id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-codex-agent-token": "test-codex-agent-token" },
    body: JSON.stringify({ status: "accepted", estimatedMinutes: 45, result: "Задание принято." })
  });
  const agentUpdateBody = await agentUpdate.json();
  assert.equal(agentUpdate.status, 200, JSON.stringify(agentUpdateBody));
  assert.equal(agentUpdateBody.task.estimatedMinutes, 45);
  const claimSeedResponse = await fetch(`${baseUrl}/api/admin/codex-tasks`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": "editor-1" },
    body: JSON.stringify({ text: "Run a safe Codex bridge test task." })
  });
  const claimSeedBody = await claimSeedResponse.json();
  assert.equal(claimSeedResponse.status, 201, JSON.stringify(claimSeedBody));
  const unauthorizedClaim = await fetch(`${baseUrl}/api/agent/codex-tasks/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agentId: "test-agent" })
  });
  assert.equal(unauthorizedClaim.status, 401);
  const claim = await fetch(`${baseUrl}/api/agent/codex-tasks/claim`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-codex-agent-token": "test-codex-agent-token" },
    body: JSON.stringify({ agentId: "test-agent" })
  });
  const claimBody = await claim.json();
  assert.equal(claim.status, 200, JSON.stringify(claimBody));
  assert.equal(claimBody.task.id, claimSeedBody.task.id);
  assert.equal(claimBody.task.status, "accepted");
  assert.ok(claimBody.task.leaseId);
  const leaseUpdate = await fetch(`${baseUrl}/api/agent/codex-tasks/${encodeURIComponent(claimSeedBody.task.id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-codex-agent-token": "test-codex-agent-token" },
    body: JSON.stringify({ status: "completed", result: "done", leaseId: claimBody.task.leaseId })
  });
  assert.equal(leaseUpdate.status, 200, await leaseUpdate.text());
  assert.equal(agentUpdateBody.task.result, "Задание принято.");
  const serverSource = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(serverSource, /\.filter\(entry => isPrimaryAdminEngineerServer\(entry\.profile \|\| \{\}\)\)/);
  assert.match(serverSource, /url: "\/\?view=codex"/);
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
    body: JSON.stringify({ id: "mechanic-1", role: "designEngineer", area: "", actionId: "role-update-test", clientId: "admin-test" })
  });
  const updateBody = await update.json();
  assert.equal(update.status, 200, JSON.stringify(updateBody));
  assert.equal(updateBody.user.role, "designEngineer");
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
  assert.match(serverSource, /RESOLUTION_EXECUTOR_ROLES_SERVER/);
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

test("only admin can close a false or test remark without awarding points", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(client, /const canCloseWithoutScore = resolutionActor\(\)\.role === "editor"/);
  assert.match(client, /data-remark-close-no-score/);
  assert.match(client, /data-close-remark-no-score/);
  assert.match(client, /data-close-remark-with-score/);
  assert.match(client, /function askAdminRemarkClose\(withScore = false\)/);
  assert.doesNotMatch(client, /Почему закрываем предупреждение без начисления баллов/);
  assert.match(client, /overlay\.querySelectorAll\("\[data-close-remark-no-score\]"\)/);
  assert.match(client, /if \(item\?\.closedWithoutScore\) return \[\]/);
  assert.match(server, /if \(action === "close-no-score"\)/);
  assert.match(server, /if \(actor\.role !== "editor"\) return \{ error: "remark_confirmation_forbidden" \}/);
  assert.match(server, /remark\.resolutionCompletedParticipants = \[\]/);
  assert.match(server, /if \(action === "close-with-score"\)/);
  assert.match(server, /remark\.resolutionCompletedParticipants = \[performer\]/);
  assert.match(styles, /\.send-kind-overlay\s*\{[\s\S]*?z-index:\s*5000/);
  assert.match(styles, /\.send-kind-dialog\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 32px\)/);
  assert.match(styles, /@media \(max-width:\s*560px\)[\s\S]*?\.send-kind-dialog/);
});

test("gas and compressor printing gathers filled days without date selectors", () => {
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(appSource, /function printGasJournalSheet\(section\)/);
  assert.match(appSource, /function printCompressorJournalFilledDays\(area/);
  assert.match(appSource, /gasJournalDateHasFilledRow\(section, row\.date\)/);
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
  assert.doesNotMatch(appSource, /navigator\.share/);
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
  const removedEndpoint = await fetch(`${baseUrl}/api/warehouse/issue`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  assert.equal(removedEndpoint.status, 410);
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
