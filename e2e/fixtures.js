const { test: base, expect } = require("@playwright/test");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createIsolatedServerEnv } = require("../tools/testing/isolated-env");
const { createHttpsGateway } = require("../tools/testing/https-gateway");

const root = path.resolve(__dirname, "..");

function makeUser(role, name, area = "") {
  const password = `browser-${role}-password`;
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id: `e2e-${role}`, employeeId: `e2e-${role}`, name, role, area, password,
    passwordHash: `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`,
    approved: true, pendingApproval: false
  };
}

function createSeed() {
  const users = {
    operator: makeUser("operator", "Оператор Тест", "Тестовый цех"),
    engineer: makeUser("engineer", "Инженер Тест"),
    editor: makeUser("editor", "Администратор Тест")
  };
  const at = new Date().toISOString();
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Qyzylorda" });
  const db = {
    users: Object.values(users).map(({ password, ...user }) => user),
    catalog: { equipment: {
      "90": { id: 90, created: true, name: "Тестовый пресс", area: "Тестовый цех", nodes: ["Тестовый узел"], qrTokens: { "0": "e2e-node-token" }, updatedAt: at },
      "91": { id: 91, created: true, name: "Чужой пресс", area: "Другой цех", nodes: ["Чужой узел"], qrTokens: { "0": "e2e-other-token" }, updatedAt: at }
    } },
    checks: { [`90:0:${date}`]: { createdAt: at, updatedAt: at, to: {
      tasks: Array(15).fill(false), walkGroups: {}, updatedAt: at,
      commentLog: [{
        id: "e2e-print-remark", text: "Проверка крепления тестового пресса", at,
        name: users.operator.name, role: "operator", area: "Тестовый цех",
        resolved: true, resolvedAt: at, resolvedComment: "Крепление восстановлено",
        resolvedByName: users.engineer.name, resolvedByRole: "engineer",
        confirmedAt: at, confirmedByName: users.engineer.name, confirmedByRole: "engineer"
      }]
    } } },
    downtimes: [], qrWalkJournal: [], compressorJournal: {}, gasJournal: {},
    pprSheets: {}, annualPpr: {}, auditHistory: [],
    pushNotifications: { subscriptions: [], vapid: null }
  };
  return { db, users };
}

async function reservePorts() {
  const holders = [net.createServer(), net.createServer()];
  try {
    for (const holder of holders) {
      await new Promise((resolve, reject) => {
        holder.once("error", reject);
        holder.listen(0, "127.0.0.1", resolve);
      });
    }
    return holders.map(holder => holder.address().port);
  } finally {
    await Promise.all(holders.filter(holder => holder.listening).map(holder => new Promise(resolve => holder.close(resolve))));
  }
}

async function stopServer(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once("exit", resolve));
  child.kill("SIGTERM");
  let timer;
  await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 5000); })]);
  clearTimeout(timer);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

const test = base.extend({
  app: async ({}, use, testInfo) => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "ppr-browser-test-"));
    let child;
    let postgres;
    let gateway;
    let output = "";
    try {
      const { db, users } = createSeed();
      await fs.writeFile(path.join(dataDir, "db.json"), JSON.stringify(db));
      const [port, qrPort] = await reservePorts();
      const internalURL = `http://127.0.0.1:${port}`;
      const env = createIsolatedServerEnv({ DATA_DIR: dataDir, PORT: port, QR_PORT: qrPort, NODE_ENV: "production" });
      env.TZ = "Asia/Qyzylorda";
      // A separate, explicitly opted-in localhost sandbox. Never inherit application DB URLs.
      if (process.env.PPR_E2E_POSTGRES_URL) {
        const { createPostgresSandbox } = require("../tools/testing/postgres-sandbox");
        postgres = await createPostgresSandbox(process.env.PPR_E2E_POSTGRES_URL);
        env.DATABASE_URL = postgres.databaseUrl;
        env.REQUIRE_POSTGRES = "true";
        env.PGSSL = "disable";
        env.PGSSLMODE = "disable";
      }
      child = spawn(process.execPath, [path.join(root, "server.js")], {
        cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
      });
      child.stdout.on("data", chunk => { output += chunk; });
      child.stderr.on("data", chunk => { output += chunk; });
      let spawnError;
      child.on("error", error => { spawnError = error; });
      await expect.poll(async () => {
        if (spawnError) throw spawnError;
        if (child.exitCode !== null) throw new Error(`Isolated server stopped: ${output}`);
        try {
          const response = await fetch(`${internalURL}/api/health`, { signal: AbortSignal.timeout(1500) });
          const health = await response.json();
          return response.ok && health.ok && health.storage.mode === (postgres ? "postgres-cluster" : "json");
        } catch { return false; }
      }, { timeout: 20000, message: "Isolated application storage must be ready" }).toBe(true);
      const unauthenticated = await fetch(`${internalURL}/api/state`, { headers: { "x-client-protocol": "1" } });
      expect(unauthenticated.status, "Browser tests must use real authentication").toBe(401);
      gateway = await createHttpsGateway(port);
      await use({ baseURL: gateway.baseURL, users, equipmentId: 90, otherEquipmentId: 91, nodeName: "Тестовый узел", qrPayload: "PPRQR|NODE|90|0|e2e-node-token", storage: postgres ? "postgres" : "json" });
    } finally {
      const cleanupErrors = [];
      const cleanup = async action => { try { await action(); } catch (error) { cleanupErrors.push(error); } };
      if (gateway) await cleanup(() => gateway.dispose());
      await cleanup(() => stopServer(child));
      if (testInfo.status !== "passed") {
        await cleanup(() => testInfo.attach("isolated-server.log", { body: Buffer.from(output), contentType: "text/plain" }));
      }
      if (postgres) await cleanup(() => postgres.dispose());
      await cleanup(async () => {
        const target = path.resolve(dataDir);
        if (path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith("ppr-browser-test-")) {
          throw new Error("Refusing cleanup outside the test's temporary data directory");
        }
        await fs.rm(target, { recursive: true, force: true });
      });
      if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Browser test cleanup failed");
    }
  },
  runtimeErrors: [async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await use(errors);
    expect(errors, "No unhandled JavaScript errors").toEqual([]);
  }, { auto: true }]
});

async function login(page, app, user = app.users.operator) {
  await page.goto(app.baseURL);
  await page.locator("#loginEmployeeId").fill(user.employeeId);
  await page.locator("#loginPassword").fill(user.password);
  await page.locator("#authSubmitButton").click();
  await expect(page.locator("#loginOverlay")).toBeHidden();
  await expect(page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`)).toBeVisible();
}

module.exports = { test, expect, login };
