"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const os = require("node:os");
const net = require("node:net");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createIsolatedServerEnv } = require("../tools/testing/isolated-env");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8").replace(/\r\n/g, "\n");
function actualFunction(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  assert.ok(start >= 0, name);
  const lineEnd = source.indexOf("\n", start);
  const end = source.slice(start, lineEnd).trimEnd().endsWith("}") ? lineEnd : source.indexOf("\n}", start) + 2;
  return source.slice(start, end);
}
const copy = value => JSON.parse(JSON.stringify(value));
const participant = (id, stamp = id + "-stamp") => ({ id, name: "Welder " + id, role: "welder", position: "Сварщик", stamp, certificate: id + "-cert", joinedAt: "2026-09-01T01:00:00Z" });
function record(overrides = {}) {
  return { id: "work", status: "accepted", description: "Saved bracket", createdById: "requester", createdByName: "Requester", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T01:00:00Z",
    welderId: "a", welderName: "Welder a", welderPosition: "Сварщик", welderStamp: "a-stamp", welderCertificate: "a-cert", acceptedAt: "2026-09-01T01:00:00Z",
    participants: [participant("a"), participant("b")], requestPhoto: "data:image/png;base64,saved", resultPhoto: "data:image/png;base64,old", ...overrides };
}
function form(file) {
  return { dataset: {}, values: { material: "Steel", consumables: "Wire", welderStamp: "b-new-stamp", welderCertificate: "b-new-cert", workComment: "Finished" },
    querySelector: selector => selector.includes("resultPhoto") ? { files: file ? [file] : [] } : null };
}
function client(item = record(), user = { id: "b", role: "welder", name: "Welder b" }) {
  const writes = [], alerts = [], toasts = [], prints = [];
  const context = vm.createContext({
    state: { weldingJournal: { [item.id]: item }, turningJournal: {}, adminConfig: {} },
    profile: user, authenticatedProfile: user, ROLE_ACCESS: {}, permissionBaseRole: role => role,
    FormData: class { constructor(value) { this.values = value.values; } get(key) { return this.values[key]; } },
    window: { alert: value => alerts.push(value), open: () => ({ document: { write: value => prints.push(value) } }) },
    saveState: () => writes.push(copy(context.state.weldingJournal)),
    updateWeldingBadge() {}, renderWeldingJournal() {}, finalizeJournalPopup() {}, setButtonBusy() {},
    showAppToast: value => toasts.push(value), readPhotoFile: async () => "data:image/png;base64,new"
  });
  vm.runInContext(fs.readFileSync(path.join(root, "modules/director.js"), "utf8"), context);
  context.PPRModules = context.window.PPRModules;
  vm.runInContext(source.match(/^const WELDER_TITLE_PATTERN = .*;$/m)[0], context);
  const functions = ["isWelderUser", "isProductionEngineer", "productionWorkWasSelfRequested", "canDecideProductionWork",
    "weldingActor", "productionParticipant", "productionParticipants", "productionParticipantNames", "isProductionParticipant",
    "lockProductionRequestForm", "saveWeldingRecord", "canCompleteWeldingWork", "completeWeldingRequest",
    "escapeHtml", "dateTimeHuman", "weldingRecords", "turningRecords", "weldingMonthKey", "weldingTypeLabel", "weldingPositionLabel",
    "weldingStatusLabel", "productionPhotosHtml", "weldingRecordCard", "productionAcceptanceHtml", "printWeldingJournal", "printTurningJournal"];
  vm.runInContext(functions.map(actualFunction).join("\n"), context);
  return { context, writes, alerts, toasts, prints };
}

test("actual second-participant form completes once, retaining primary signer, photos and team history", async () => {
  const item = record(), before = copy(item), h = client(item);
  assert.match(h.context.weldingRecordCard(item), /class="welding-complete-form"/);
  await h.context.completeWeldingRequest(item, form());
  const saved = h.context.state.weldingJournal.work;
  assert.equal(saved.status, "awaitingAcceptance");
  assert.equal(saved.welderId, "a"); assert.equal(saved.welderStamp, "a-stamp"); assert.equal(saved.welderCertificate, "a-cert");
  assert.deepEqual(copy(saved.participants[0]), before.participants[0]);
  assert.equal(saved.participants[1].stamp, "b-new-stamp"); assert.equal(saved.participants[1].certificate, "b-new-cert");
  assert.equal(saved.participants[1].joinedAt, before.participants[1].joinedAt);
  assert.equal(saved.requestPhoto, before.requestPhoto); assert.equal(saved.resultPhoto, before.resultPhoto);
  assert.equal(saved.acceptedAt, before.acceptedAt); assert.equal(saved.createdById, before.createdById);
  await h.context.completeWeldingRequest(item, form());
  assert.equal(h.writes.length, 1); assert.equal(h.toasts.length, 1);
  assert.deepEqual(item, before);
});

test("actual completion eligibility and rendered form agree for roles, statuses and legacy primary participant", async t => {
  for (const [name, user, changes, allowed] of [
    ["primary", { id: "a", role: "welder" }, {}, true],
    ["second", { id: "b", role: "welder" }, {}, true],
    ["title", { id: "b", role: "mechanic", position: "Электрогазосварщик" }, {}, true],
    ["job role", { id: "b", role: "mechanic", jobRole: "welder" }, {}, true],
    ["editor", { id: "admin", role: "editor" }, {}, true],
    ["other welder", { id: "c", role: "welder" }, {}, false],
    ["role removed", { id: "b", role: "operator" }, {}, false],
    ["engineer", { id: "b", role: "engineer" }, {}, false],
    ["legacy primary", { id: "a", role: "welder" }, { participants: undefined }, true],
    ["legacy non-primary", { id: "b", role: "welder" }, { participants: undefined }, false],
    ["returned", { id: "b", role: "welder" }, { status: "returned", returnReason: "Rework", returnedByName: "Historical requester" }, true],
    ...["new", "awaitingAcceptance", "completed"].map(status => [status, { id: "b", role: "welder" }, { status }, false])
  ]) await t.test(name, async () => {
    const item = record(changes), h = client(item, user);
    assert.equal(h.context.weldingRecordCard(item).includes('class="welding-complete-form"'), allowed);
    await h.context.completeWeldingRequest(item, form());
    assert.equal(h.writes.length, allowed ? 1 : 0);
    if (changes.returnReason) assert.equal(h.context.state.weldingJournal.work.returnReason, changes.returnReason);
  });
});

test("concurrent photo submissions lock once; late photo cannot replace accepted/history or another identity", async t => {
  for (const action of ["duplicate", "accepted elsewhere", "participant joined", "identity switched", "role revoked", "photo failed"]) await t.test(action, async () => {
    const item = record(), h = client(item), f = form({});
    let resolve, reject, reads = 0;
    h.context.readPhotoFile = () => { reads++; return new Promise((yes, no) => { resolve = yes; reject = no; }); };
    const pending = h.context.completeWeldingRequest(item, f);
    await h.context.completeWeldingRequest(item, f);
    assert.equal(reads, 1);
    if (action === "accepted elsewhere") h.context.state.weldingJournal.work = { ...item, status: "completed", acceptedByRequesterAt: "2026-09-08T01:00:00Z", acceptedByRequesterName: "Actual requester" };
    if (action === "participant joined") h.context.state.weldingJournal.work = { ...item, participants: [...item.participants, participant("c")] };
    if (action === "identity switched") h.context.authenticatedProfile = { id: "a", role: "welder" };
    if (action === "role revoked") h.context.profile = { id: "b", role: "operator" };
    const before = copy(h.context.state.weldingJournal.work);
    if (action === "photo failed") { reject(new Error("isolated photo failure")); await assert.rejects(pending, /isolated photo failure/); }
    else { resolve("data:image/png;base64,new"); await pending; }
    assert.equal(h.writes.length, action === "duplicate" ? 1 : 0);
    if (action !== "duplicate") assert.deepEqual(copy(h.context.state.weldingJournal.work), before);
    assert.equal(f.dataset.submitting, undefined);
  });
});

test("second welder never fills a primary welder's empty signature with their own", async () => {
  const h = client(record({ welderStamp: "", welderCertificate: "" }), { id: "b", role: "welder", welderStamp: "profile-b", welderCertificate: "profile-b-cert" });
  await h.context.completeWeldingRequest(h.context.state.weldingJournal.work, form());
  assert.equal(h.context.state.weldingJournal.work.welderStamp, "");
  assert.equal(h.context.state.weldingJournal.work.welderCertificate, "");
});

test("actual completion validates required execution fields before acquiring the shared form lock", async t => {
  for (const field of ["material", "consumables", "welderStamp", "welderCertificate"]) await t.test(field, async () => {
    const item = record(), h = client(item), f = form();
    f.values[field] = " ";
    await h.context.completeWeldingRequest(item, f);
    assert.equal(h.writes.length, 0); assert.equal(h.alerts.length, 1); assert.equal(f.dataset.submitting, undefined);
  });
});

test("two form instances racing photo reads cannot complete the same record twice", async () => {
  const item = record(), h = client(item), resolves = [];
  h.context.readPhotoFile = () => new Promise(resolve => resolves.push(resolve));
  const first = h.context.completeWeldingRequest(item, form({}));
  const second = h.context.completeWeldingRequest(item, form({}));
  resolves[1]("second-photo"); await second;
  const saved = copy(h.context.state.weldingJournal.work);
  resolves[0]("first-photo"); await first;
  assert.equal(h.writes.length, 1); assert.deepEqual(copy(h.context.state.weldingJournal.work), saved);
});

test("both actual print functions use recorded engineering and requester signers/dates without mutating journals", () => {
  const at = "2026-09-08T08:00:00Z", engineerAt = "2026-09-08T09:00:00Z", requesterAt = "2026-09-08T10:00:00Z";
  const rows = [
    record({ id: "engineering", status: "completed", completedAt: at, acceptedByEngineerAt: engineerAt, acceptedByEngineerName: "Engineer <signed>", acceptedByRequesterAt: "" }),
    record({ id: "requester", status: "completed", completedAt: at, acceptedByRequesterAt: requesterAt, acceptedByRequesterName: "Actual requester" }),
    record({ id: "legacy", status: "completed", completedAt: at, acceptedByRequesterAt: requesterAt, createdByName: "Legacy requester" }),
    record({ id: "both", status: "completed", completedAt: at, acceptedByEngineerAt: engineerAt, acceptedByEngineerName: "Second engineer", acceptedByRequesterAt: requesterAt, acceptedByRequesterName: "First requester" }),
    record({ id: "unsigned", status: "completed", completedAt: at }),
    record({ id: "pending", status: "awaitingAcceptance", completedAt: at, description: "PENDING EXCLUDED" }),
    record({ id: "outside", status: "completed", completedAt: "2026-08-05T08:00:00Z", description: "OTHER MONTH EXCLUDED" })
  ];
  const h = client();
  h.context.state.weldingJournal = Object.fromEntries(rows.map(row => [row.id, row]));
  h.context.state.turningJournal = copy(h.context.state.weldingJournal);
  const before = copy(h.context.state);
  h.context.printWeldingJournal("2026-09"); h.context.printTurningJournal("2026-09");
  assert.equal(h.prints.length, 2);
  for (const html of h.prints) {
    assert.ok(html.includes("Подтвердил инженер: Engineer &lt;signed&gt; · " + h.context.dateTimeHuman(engineerAt)));
    assert.ok(html.includes("Принял заявитель: Actual requester · " + h.context.dateTimeHuman(requesterAt)));
    assert.ok(html.includes("Принял заявитель: Legacy requester · " + h.context.dateTimeHuman(requesterAt)));
    assert.ok(html.includes("Подтвердил инженер: Second engineer")); assert.ok(html.includes("Принял заявитель: First requester"));
    assert.ok(html.includes("Приёмка: —")); assert.ok(!html.includes("PENDING EXCLUDED")); assert.ok(!html.includes("OTHER MONTH EXCLUDED"));
  }
  assert.deepEqual(copy(h.context.state), before);
});

test("actual second-welder completion persists through authenticated HTTP, requester/engineer acceptance and stale replay", { timeout: 30000 }, async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-production-complete-"));
  const password = "isolated-production-password", salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = salt + ":" + crypto.scryptSync(password, salt, 64).toString("hex");
  const users = [["a", "welder"], ["b", "welder"], ["requester", "operator"], ["engineer", "engineer"]].map(([id, role]) => ({ id, role, employeeId: "production-" + id, name: "Actual " + id, approved: true, pendingApproval: false, passwordHash }));
  const ordinary = record(), self = record({ id: "self", createdById: "a", createdByName: "Actual a" });
  const attendanceSessions = users.map(user => ({ userKey: user.id, userId: user.id, startedAt: new Date().toISOString(), expiresAt: "2099-01-01T00:00:00Z" }));
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({ users, attendanceSessions, weldingJournal: { work: ordinary, self }, pushNotifications: { subscriptions: [] } }));
  const holders = [net.createServer(), net.createServer()];
  for (const holder of holders) { holder.listen(0, "127.0.0.1"); await once(holder, "listening"); }
  const [port, qrPort] = holders.map(holder => holder.address().port);
  await Promise.all(holders.map(holder => new Promise(resolve => holder.close(resolve))));
  const base = "http://127.0.0.1:" + port;
  let output = "";
  const child = spawn(process.execPath, [path.join(root, "server.js")], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: createIsolatedServerEnv({ DATA_DIR: dataDir, PORT: port, QR_PORT: qrPort, NODE_ENV: "production" }) });
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  t.after(async () => {
    if (child.exitCode === null) { const stopped = once(child, "exit"); child.kill(); await stopped; }
    assert.equal(path.dirname(path.resolve(dataDir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dataDir).startsWith("ppr-production-complete-"));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  const deadline = Date.now() + 15000;
  while (true) {
    try { if ((await fetch(base + "/api/health", { signal: AbortSignal.timeout(1000) })).ok) break; } catch {}
    assert.ok(Date.now() < deadline && child.exitCode === null, output);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  const cookies = {};
  for (const user of users) {
    const res = await fetch(base + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json", "x-client-protocol": "1" }, body: JSON.stringify({ identifier: user.employeeId, password }) });
    assert.equal(res.status, 200); cookies[user.id] = res.headers.get("set-cookie").split(";")[0];
  }
  async function request(user, body) {
    const res = await fetch(base + "/api/state", { method: body ? "PUT" : "GET", headers: { cookie: cookies[user], "content-type": "application/json", "x-client-protocol": "1" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json(); assert.equal(res.status, 200, JSON.stringify(data)); return data;
  }
  for (const [id, signer, kind] of [["work", "requester", "Requester"], ["self", "engineer", "Engineer"]]) {
    let item = (await request("b")).weldingJournal[id];
    const h = client(item, users.find(user => user.id === "b"));
    await h.context.completeWeldingRequest(item, form());
    const completed = copy(h.context.state.weldingJournal[id]);
    assert.equal(completed.status, "awaitingAcceptance");
    await request("b", { weldingJournal: { [id]: completed } });
    item = (await request("b")).weldingJournal[id];
    assert.equal(item.status, "awaitingAcceptance"); assert.equal(item.welderStamp, "a-stamp");
    assert.equal(item.participants[1].stamp, "b-new-stamp"); assert.equal(item.participants[0].stamp, "a-stamp");
    const final = { ...item, status: "completed", updatedAt: "2099-01-01", ["acceptedBy" + kind + "Name"]: "FORGED" };
    await request("b", { weldingJournal: { [id]: final } });
    assert.equal((await request("b")).weldingJournal[id].status, "awaitingAcceptance");
    await request(signer, { weldingJournal: { [id]: final } });
    const signed = (await request("b")).weldingJournal[id];
    assert.equal(signed.status, "completed"); assert.equal(signed["acceptedBy" + kind + "Name"], "Actual " + signer); assert.ok(signed["acceptedBy" + kind + "At"]);
    assert.ok(h.context.productionAcceptanceHtml(signed).includes("Actual " + signer));
    await request("b", { weldingJournal: { [id]: { ...completed, updatedAt: "2099-01-02" } } });
    assert.deepEqual((await request("b")).weldingJournal[id], signed);
    h.context.state.weldingJournal[id] = signed;
    await h.context.completeWeldingRequest(item, form());
    assert.equal(h.writes.length, 1);
    assert.deepEqual(h.context.state.weldingJournal[id], signed);
  }
  const disk = JSON.parse(fs.readFileSync(path.join(dataDir, "db.json"), "utf8"));
  assert.equal(disk.weldingJournal.work.acceptedByRequesterName, "Actual requester");
  assert.equal(disk.weldingJournal.self.acceptedByEngineerName, "Actual engineer");
});
