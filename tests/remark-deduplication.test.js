const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createIsolatedServerEnv } = require("../tools/testing/isolated-env");

const root = path.resolve(__dirname, "..");
let serverProcess;
let baseUrl;
let dataDir;
let serverOutput = "";

async function reservePorts(count = 2) {
  const holders = [];
  const ports = [];
  for (let index = 0; index < count; index += 1) {
    const holder = net.createServer();
    await new Promise((resolve, reject) => {
      holder.once("error", reject);
      holder.listen(0, "127.0.0.1", resolve);
    });
    holders.push(holder);
    ports.push(holder.address().port);
  }
  await Promise.all(holders.map(holder => new Promise(resolve => holder.close(resolve))));
  return ports;
}

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serverProcess?.exitCode !== null) throw new Error(`Server stopped early.\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Server did not become ready.\n${serverOutput}`);
}

function resolvedRemark(id, at, resolvedAt) {
  return {
    id,
    name: "Worker One",
    role: "mechanic",
    authorKey: "id:worker-1",
    text: "Exact duplicated warning",
    at,
    resolved: true,
    resolvedAt,
    resolvedByKey: "id:worker-1",
    resolvedByName: "Worker One",
    resolvedByRole: "mechanic",
    resolvedComment: "Exact duplicated repair",
    confirmedAt: resolvedAt,
    confirmedByKey: "id:editor-1",
    confirmedByName: "Administrator",
    confirmedByRole: "editor",
    resolutionEvents: [
      { id: `${id}-event-1`, action: "confirmed", actorKey: "id:editor-1", name: "Administrator", role: "editor", at: resolvedAt },
      { id: `${id}-event-2`, action: "confirmed", actorKey: "id:editor-1", name: "Administrator", role: "editor", at: new Date(Date.parse(resolvedAt) + 1000).toISOString() }
    ],
    resolutionUpdates: []
  };
}

test.before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-remark-dedupe-test-"));
  const db = {
    checks: {
      "1:0:2026-09-07": { to: { commentLog: [resolvedRemark("duplicate-a", "2026-09-07T08:00:00.000Z", "2026-09-07T09:00:00.000Z")] } },
      "1:1:2026-09-07": { to: { commentLog: [resolvedRemark("duplicate-b", "2026-09-07T08:00:30.000Z", "2026-09-07T09:00:30.000Z")] } },
      "1:2:2026-09-07": { to: { commentLog: [{
        id: "open-remark",
        name: "Worker One",
        role: "mechanic",
        authorKey: "id:worker-1",
        text: "Open warning",
        at: "2026-09-07T10:00:00.000Z",
        resolved: false,
        resolutionEvents: [],
        resolutionParticipants: []
      }] } }
    },
    catalog: { equipment: { "1": { id: 1, name: "Equipment", area: "Shop", nodes: ["Correct node", "Copied node", "Open node"] } } },
    downtimes: [],
    qrWalkJournal: [],
    users: [
      { id: "worker-1", employeeId: "worker-1", name: "Worker One", role: "mechanic", approved: true, pendingApproval: false },
      { id: "editor-1", employeeId: "editor-1", name: "Administrator", role: "editor", approved: true, pendingApproval: false }
    ]
  };
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify(db, null, 2));
  const [port, qrPort] = await reservePorts(2);
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, [path.join(root, "server.js")], {
    cwd: root,
    env: createIsolatedServerEnv({ PORT: port, QR_PORT: qrPort, DATA_DIR: dataDir, NODE_ENV: "test" }),
    stdio: ["ignore", "pipe", "pipe"]
  });
  serverProcess.stdout.on("data", chunk => { serverOutput += String(chunk); });
  serverProcess.stderr.on("data", chunk => { serverOutput += String(chunk); });
  await waitForHealth();
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

test("startup removes exact cross-node copies and repeated resolution history", async () => {
  const state = await (await fetch(`${baseUrl}/api/state`)).json();
  assert.equal(state.checks["1:0:2026-09-07"].to.commentLog.length, 1);
  assert.equal(state.checks["1:0:2026-09-07"].to.commentLog[0].resolutionEvents.length, 1);
  assert.equal(state.checks["1:1:2026-09-07"].to.commentLog.length, 0);

  const stored = JSON.parse(fs.readFileSync(path.join(dataDir, "db.json"), "utf8"));
  assert.equal(stored.archivedDuplicateRemarks.length, 1);
  assert.equal(stored.archivedDuplicateRemarks[0].recordKey, "1:1:2026-09-07");
  assert.equal(stored.archivedDuplicateRemarks[0].duplicateOfRecordKey, "1:0:2026-09-07");
  assert.equal(stored.targetedCleanupVersions.remarkDuplicateCleanup20260907.removed, 1);
});

test("remark collaboration accepts a retried semantic action only once", async () => {
  const send = actionId => fetch(`${baseUrl}/api/remark-collaboration`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-user-id": "worker-1" },
    body: JSON.stringify({
      actionId,
      clientId: "dedupe-test",
      key: "1:2:2026-09-07",
      remarkId: "open-remark",
      action: "start",
      actor: { id: "worker-1", employeeId: "worker-1", name: "Worker One", role: "mechanic" }
    })
  }).then(async response => ({ status: response.status, body: await response.json() }));

  const first = await send("start-attempt-1");
  const repeated = await send("start-attempt-2");
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.duplicate, false);
  assert.equal(repeated.status, 200, JSON.stringify(repeated.body));
  assert.equal(repeated.body.duplicate, true);
  const remark = repeated.body.state.checks["1:2:2026-09-07"].to.commentLog[0];
  assert.equal(remark.resolutionEvents.filter(event => event.action === "added").length, 1);
  assert.equal(remark.collaborationActionReceipts.length, 1);
});
