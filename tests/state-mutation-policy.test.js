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
const { sanitizeStateMutation } = require("../server/state-mutation-policy");

const root = path.resolve(__dirname, "..");
const date = "2026-09-04";
const oldTime = "2026-09-04T09:00:00.000Z";
const future = "2099-09-04T09:00:00.000Z";
const remark = (id, text) => ({ id, text, at: oldTime, role: "operator", name: "Other operator", authorId: "other", authorKey: "id:other", resolved: false });

async function port() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const value = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return value;
}

test("generic state writes use the production session, preserve foreign snapshots, and restrict action fields", { timeout: 30000 }, async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-state-policy-"));
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = `${salt}:${crypto.scryptSync("policy-test-password", salt, 64).toString("hex")}`;
  const users = [["operator", "operator", "Area A"], ["other", "operator", "Area B"], ["worker", "mechanic", "Area A"], ["engineer", "engineer", "Area A"], ["welder", "welder", "Area A"]].map(([id, role, area]) => ({ id, employeeId: `policy-${id}`, name: `Policy ${id}`, role, area, approved: true, pendingApproval: false, passwordHash }));
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({
    users,
    attendanceSessions: users.filter(user => ["mechanic", "welder"].includes(user.role)).map(user => ({ userKey: user.id, startedAt: oldTime, expiresAt: future })),
    catalog: { equipment: {
      "15": { id: 15, name: "Policy gas equipment", area: "Газовое хозяйство", nodes: ["ШГРП"], updatedAt: oldTime },
      "90": { name: "Policy machine A", area: "Area A", nodes: ["Motor"], created: true, updatedAt: oldTime, editingEnabled: true },
      "91": { name: "Policy machine B", area: "Area B", nodes: ["Motor"], created: true, updatedAt: oldTime, editingEnabled: true }
    } },
    checks: {
      [`90:0:${date}`]: { updatedAt: oldTime, to: { updatedAt: oldTime, commentLog: [remark("own-existing", "Existing A")], walkGroups: {} } },
      [`91:0:${date}`]: { updatedAt: oldTime, to: { updatedAt: oldTime, commentLog: [remark("foreign-existing", "Existing B")], walkGroups: {} } }
    },
    pprSheets: {
      [date]: { id: `sheet:${date}`, date, updatedAt: oldTime, plannedByName: "Original engineer", rows: [{ id: "row-1", work: "Inspect motor", equipmentId: "90", workUpdatedAt: oldTime, mark: "" }] },
      "2026-09-03": { id: "locked-sheet", date: "2026-09-03", approvedAt: oldTime, approvedByName: "Original engineer", lockedAt: oldTime, rows: [{ id: "locked-row", work: "Locked plan", mark: "done", markedByName: "Original worker" }] }
    },
    annualPpr: { "2026": { year: 2026, revision: "01", updatedAt: oldTime } },
    gasJournal: { [`B::${date}`]: { id: `B::${date}`, section: "B", date, entryStatus: "draft", updatedAt: oldTime, grpQrChecks: { "1": { status: "remark", comment: "Gas remark", resolvedAt: "", resolvedByName: "" } }, shiftRows: { day: { remarks: "Unresolved gas remark" } } } },
    systemBroadcasts: [{ id: "server-message", text: "Original broadcast", at: oldTime }]
  }));
  const httpPort = await port();
  const qrPort = await port();
  const base = `http://127.0.0.1:${httpPort}`;
  let output = "";
  const child = spawn(process.execPath, ["server.js"], { cwd: root, env: createIsolatedServerEnv({ PORT: httpPort, QR_PORT: qrPort, DATA_DIR: dataDir, NODE_ENV: "production" }), stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  t.after(async () => {
    if (child.exitCode === null) { const stopped = once(child, "exit"); child.kill(); await stopped; }
    assert.equal(path.dirname(path.resolve(dataDir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dataDir).startsWith("ppr-state-policy-"));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const deadline = Date.now() + 15000;
  while (true) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
    if (Date.now() > deadline || child.exitCode !== null) throw new Error(`Isolated server startup failed: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const cookies = {};
  for (const user of users) {
    const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-client-protocol": "1" }, body: JSON.stringify({ identifier: user.employeeId, password: "policy-test-password" }) });
    assert.equal(response.status, 200);
    cookies[user.id] = response.headers.get("set-cookie").split(";")[0];
  }
  const request = async (user, endpoint, method = "GET", body) => {
    const response = await fetch(`${base}${endpoint}`, { method, headers: { cookie: cookies[user], "content-type": "application/json", "x-client-protocol": "1" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const state = async () => (await request("operator", "/api/state")).data;
  const put = (user, body) => request(user, "/api/state", "PUT", body);

  await t.test("full snapshots preserve other areas and annual plans while adding a real remark", async () => {
    const snapshot = await state();
    const foreignBefore = structuredClone(snapshot.checks[`91:0:${date}`]);
    snapshot.checks[`91:0:${date}`].to.commentLog[0].text = "stale foreign text";
    snapshot.checks[`91:0:${date}`].updatedAt = future;
    snapshot.annualPpr["2026"].revision = "forged";
    snapshot.catalog.equipment["91"].name = "foreign overwrite";
    snapshot.pprSheets["2026-09-03"].approvedByName = "forged";
    snapshot.checks[`90:0:${date}`].to.commentLog.push({ ...remark("new-real", "New observation"), name: "Forged editor", role: "editor", authorId: "forged", resolved: true, confirmedAt: future, confirmedByName: "Forged confirmer", resolutionParticipants: [{ key: "id:forged" }] });
    const result = await put("operator", snapshot);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.ok(result.data.ignoredSections.includes("checks"));
    const saved = await state();
    assert.equal(saved.checks[`91:0:${date}`].updatedAt, foreignBefore.updatedAt);
    assert.equal(saved.checks[`91:0:${date}`].to.commentLog[0].text, foreignBefore.to.commentLog[0].text);
    assert.equal(saved.checks[`91:0:${date}`].to.commentLog[0].authorKey, foreignBefore.to.commentLog[0].authorKey);
    assert.equal(saved.annualPpr["2026"].revision, "01");
    assert.equal(saved.catalog.equipment["91"].name, "Policy machine B");
    assert.equal(saved.pprSheets["2026-09-03"].approvedByName, "Original engineer");
    const added = saved.checks[`90:0:${date}`].to.commentLog.find(entry => entry.id === "new-real");
    assert.equal(added.name, "Policy operator");
    assert.equal(added.authorKey, "id:operator");
    assert.equal(added.resolved, false);
    assert.ok(!added.confirmedAt);
    assert.equal((added.resolutionParticipants || []).length, 0);
  });

  await t.test("a forbidden new record rejects the whole write without partly adding an allowed remark", async () => {
    const snapshot = await state();
    const own = structuredClone(snapshot.checks[`90:0:${date}`]);
    own.to.commentLog.push(remark("must-not-exist", "Atomicity"));
    const result = await put("operator", { checks: { [`90:0:${date}`]: own, "91:0:2026-09-05": { to: { commentLog: [remark("forbidden", "Another area")] } } } });
    assert.equal(result.status, 403);
    assert.equal((await state()).checks[`90:0:${date}`].to.commentLog.some(entry => entry.id === "must-not-exist"), false);
  });

  await t.test("workers can mark planned work but cannot author plans or approve sheets", async () => {
    const result = await put("worker", { pprSheets: { [date]: { updatedAt: future, approvedAt: future, approvedByName: "Forged", lockedAt: future, rows: [{ id: "row-1", work: "Injected plan", workUpdatedAt: future, mark: "done", resolutionComment: "Inspected", resolutionUpdatedAt: future, markUpdatedAt: future, markedByName: "Forged", markedByRole: "editor" }] } } });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const sheet = (await state()).pprSheets[date];
    assert.equal(sheet.rows[0].work, "Inspect motor");
    assert.equal(sheet.rows[0].mark, "done");
    assert.equal(sheet.rows[0].markedByName, "Policy worker");
    assert.equal(sheet.rows[0].draftByName, "Policy worker");
    assert.equal(sheet.approvedAt, undefined);
    assert.equal(sheet.lockedAt, undefined);
    assert.equal((await put("worker", { pprSheets: { "2026-09-07": { rows: [{ id: "arbitrary", work: "Forged plan" }] } } })).status, 403);
    const approval = await request("engineer", "/api/ppr-sheet/action", "POST", { date, action: "approve" });
    assert.equal(approval.status, 200);
    assert.equal((await state()).pprSheets[date].approvedByName, "Policy engineer");
  });

  await t.test("downtime creation cannot smuggle a closure or another signer", async () => {
    const result = await put("operator", { downtimes: [{ id: "policy-downtime", equipmentId: 90, nodeIndex: 0, date, reason: "Stopped", startedAt: oldTime, endedAt: future, closedByName: "Forged", byName: "Forged" }] });
    assert.equal(result.status, 200);
    const item = (await state()).downtimes.find(entry => entry.id === "policy-downtime");
    assert.equal(item.endedAt, "");
    assert.equal(item.closedByName, undefined);
    assert.equal(item.byName, "Policy operator");
  });

  await t.test("production work keeps request, trade execution and requester acceptance with real signers", async () => {
    const id = "policy-welding";
    assert.equal((await put("operator", { weldingJournal: { [id]: { id, status: "new", description: "Weld bracket", createdById: "forged", createdByName: "Forged" } } })).status, 200);
    let item = (await state()).weldingJournal[id];
    assert.equal(item.createdById, "operator");
    await put("operator", { weldingJournal: { [id]: { ...item, status: "accepted", updatedAt: future } } });
    assert.equal((await state()).weldingJournal[id].status, "new");
    await put("welder", { weldingJournal: { [id]: { ...item, status: "accepted", updatedAt: future, welderName: "Forged", participants: [{ id: "forged", name: "Forged" }] } } });
    item = (await state()).weldingJournal[id];
    assert.equal(item.welderName, "Policy welder");
    assert.equal(item.participants[0].id, "welder");
    await put("welder", { weldingJournal: { [id]: { ...item, status: "awaitingAcceptance", material: "Steel", consumables: "Wire", updatedAt: future } } });
    item = (await state()).weldingJournal[id];
    assert.equal(item.status, "awaitingAcceptance");
    await put("other", { weldingJournal: { [id]: { ...item, status: "completed", updatedAt: future } } });
    assert.equal((await state()).weldingJournal[id].status, "awaitingAcceptance");
    await put("operator", { weldingJournal: { [id]: { ...item, status: "completed", acceptedByRequesterName: "Forged", updatedAt: future } } });
    item = (await state()).weldingJournal[id];
    assert.equal(item.status, "completed");
    assert.equal(item.acceptedByRequesterName, "Policy operator");
  });

  await t.test("gas drafts cannot overwrite nested QR decisions or their projected shift rows", async () => {
    const id = `B::${date}`;
    const before = (await state()).gasJournal[id];
    const result = await put("worker", { gasJournal: { [id]: { ...before, updatedAt: future, valveState: "Checked", updatedByName: "Forged", resolvedAt: future, resolvedByName: "Forged", resolutionComment: "Forged resolution", grpQrChecks: { "1": { status: "ok", resolvedAt: future, resolvedByName: "Forged" } }, shgrpQrChecks: { "injected": { resolvedAt: future } }, shiftRows: { day: { remarks: "Forged closure" } } } } });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.ok(result.data.ignoredSections.includes("gasJournal"));
    const saved = (await state()).gasJournal[id];
    assert.equal(saved.valveState, "Checked");
    assert.equal(saved.updatedByName, "Policy worker");
    assert.deepEqual(saved.grpQrChecks, before.grpQrChecks);
    assert.deepEqual(saved.shiftRows, before.shiftRows);
    assert.equal(saved.shgrpQrChecks, undefined);
    assert.ok(!saved.resolvedAt);
    assert.ok(!saved.resolutionComment);
  });

  await t.test("a worker triggers the same automatic daily plan using only its date, with a system signer", async () => {
    const generated = await request("worker", "/api/ppr-sheet/generate", "POST", { date: "2026-09-07", rows: [{ work: "Injected arbitrary plan" }], plannedByName: "Forged engineer" });
    assert.equal(generated.status, 200, JSON.stringify(generated.data));
    assert.equal(generated.data.changed, true);
    assert.equal(generated.data.sheet.plannedByName, "Система");
    assert.equal(generated.data.sheet.plannedByRole, "system");
    assert.ok(generated.data.sheet.rows.some(row => row.work));
    assert.equal(generated.data.sheet.rows.some(row => row.work === "Injected arbitrary plan"), false);
    const repeated = await request("worker", "/api/ppr-sheet/generate", "POST", { date: "2026-09-07" });
    assert.equal(repeated.data.changed, false);
    assert.deepEqual(repeated.data.sheet, generated.data.sheet);
    assert.equal((await request("worker", "/api/ppr-sheet/generate", "POST", { date: "2026-09-07", force: true })).status, 403);
    assert.equal((await request("engineer", "/api/ppr-sheet/generate", "POST", { date: "2026-09-07", force: true })).data.changed, true);
    const locked = (await state()).pprSheets[date];
    assert.deepEqual((await request("worker", "/api/ppr-sheet/generate", "POST", { date })).data.sheet, locked);
    assert.deepEqual((await request("engineer", "/api/ppr-sheet/generate", "POST", { date, force: true })).data.sheet, locked);
    assert.equal((await request("worker", "/api/ppr-sheet/generate", "POST", { date: "2026-02-31" })).status, 400);
  });
});

test("policy leaves its input and server state untouched when a later section fails", () => {
  const previous = { catalog: { equipment: { "1": { nodes: ["Node"] } } }, checks: {} };
  const incoming = { checks: { "1:0:2026-09-04": { to: { commentLog: [remark("one", "Allowed")] } } }, annualPpr: { "2026": { year: 2026 } } };
  const before = structuredClone({ previous, incoming });
  assert.throws(() => sanitizeStateMutation({ previous, incoming, user: { id: "one", role: "operator" }, canAccessEquipment: () => true, hasArea: () => true }), { code: "state_mutation_forbidden" });
  assert.deepEqual({ previous, incoming }, before);
});
