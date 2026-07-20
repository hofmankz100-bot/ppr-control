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
    },
    requests: {
      "ordinary-request": { id: "ordinary-request", kind: "tmc", text: "Обычная заявка", createdAt: "2026-07-16T08:00:00.000Z", updatedAt: "2026-07-16T08:00:00.000Z" },
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
      user("electrician-1", "Электрик Один", "electrician"),
      user("mechanic-1", "Механик Один", "mechanic"),
      user("shop-a", "Начальник А", "shop", "Цех А"),
      user("shop-other", "Начальник Другого Цеха", "shop", "Другой цех"),
      user("engineer-1", "Инженер Один", "engineer"),
      user("director-1", "Директор производства", "productionDirector"),
      user("editor-1", "Администратор", "editor"),
      { employeeId: "legacy-77", name: "Старый сотрудник", role: "mechanic", approved: true, pendingApproval: false }
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
  assert.equal(returned.resolutionEvents.at(-1).targetKey, "id:mechanic-1");
  assert.equal(returned.resolutionEvents.at(-1).targetRole, "mechanic");

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
  assert.deepEqual(finalRemark.resolutionCompletedParticipants.map(item => item.key).sort(), ["id:electrician-1", "id:mechanic-1"]);

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

test("the approved press catalogs are locked in the UI and on the server", async () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /LOCKED_EQUIPMENT_CATALOG_IDS = new Set\(\[1, 2\]\)/);
  assert.match(source, /if \(isEquipmentCatalogLocked\(equipmentOrId\)\) return false/);

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
  assert.deepEqual(after.catalog.equipment["1"], before.catalog.equipment["1"]);
  assert.deepEqual(after.catalog.equipment["2"], before.catalog.equipment["2"]);
});

test("obsolete no-material nodes are removed from both fixed press catalogs", () => {
  const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(source, /removeObsoletePressNoMaterialNodes\(postgresState\)/);
  assert.match(source, /=== "нет сырья"/);
  assert.match(source, /for \(const equipmentId of \["1", "2"\]\)/);
});

test("repeat QR scans open an active remark or focus a new comment without another walk", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(source, /function oldestOpenRemarkForNode\(equipmentId, nodeIndex\)/);
  assert.match(source, /function openRepeatedNodeQrDestination\(parsed, shift = currentWalkShift\(\)\)/);
  assert.match(source, /current\.date = openRemark\?\.date \|\| shift\.date/);
  assert.match(source, /current\.focusNodeCommentComposer = !openRemark/);
  assert.match(source, /appendCommentEntry\(item, comment, photo\)/);
  assert.match(source, /finish\("comment-saved"\)/);
  assert.match(source, /Комментарий отправлен\. Обход этой смены засчитан\./);
  assert.doesNotMatch(source, /Узел уже обойден — открыт комментарий узла/);
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

test("admin operational clear preserves inventory and warehouse records", async () => {
  const before = await (await fetch(`${baseUrl}/api/state`)).json();
  assert.ok(Object.keys(before.inventory || {}).length > 0);
  const warehouseRequestId = Object.keys(before.requests || {}).find(id => id.startsWith("stock-issue:"));
  assert.ok(warehouseRequestId);
  const response = await fetch(`${baseUrl}/api/state`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actionId: "warehouse-safe-clear-test",
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
  assert.deepEqual(state.inventory, before.inventory);
  assert.ok(state.requests[warehouseRequestId]);
  assert.equal(state.requests["ordinary-request"], undefined);
  assert.deepEqual(state.checks, {});
});
