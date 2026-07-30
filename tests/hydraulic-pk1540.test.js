const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("standalone PK-1540 hydraulic app is Russian and interactive", () => {
  const html = fs.readFileSync(path.join(root, "hydraulic-pk1540.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "hydraulic-pk1540.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "hydraulic-pk1540.css"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const image = path.join(root, "assets", "pk1540-hydraulic.webp");

  assert.match(html, /lang="ru"/);
  assert.match(html, /Интерактивная гидравлическая схема/);
  assert.match(html, /Подача под давлением/);
  assert.match(html, /Слив в бак/);
  assert.match(html, /hydraulic-pk1540\.js/);
  assert.ok(fs.statSync(image).size > 100_000);

  assert.match(script, /Опускание ножниц/);
  assert.match(script, /Открытие контейнера/);
  assert.match(script, /Главный цилиндр вперёд/);
  assert.match(script, /Сброс давления главного цилиндра/);
  assert.match(script, /Главный насос/);
  assert.match(script, /function activateMode\(id\)/);
  assert.match(script, /pressureGroup\.innerHTML = pathMarkup/);
  assert.match(script, /returnGroup\.innerHTML = pathMarkup/);
  assert.match(script, /pointerdown/);
  assert.match(script, /function fitView\(\)/);

  assert.match(styles, /@keyframes oil-flow/);
  assert.match(styles, /\.pressure-flow path/);
  assert.match(styles, /\.return-flow path/);
  assert.match(styles, /@media \(max-width: 820px\)/);

  assert.match(server, /"hydraulic-pk1540\.html"/);
  assert.match(server, /"assets\/pk1540-hydraulic\.webp"/);
  assert.match(server, /const protectedHydraulicPaths = new Set/);
  assert.match(server, /!isPrimaryAdminEngineerServer\(user\)/);
  assert.match(server, /"private, no-store"/);
});

async function freePort() {
  const holder = net.createServer();
  await new Promise((resolve, reject) => {
    holder.once("error", reject);
    holder.listen(0, "127.0.0.1", resolve);
  });
  const port = holder.address().port;
  await new Promise(resolve => holder.close(resolve));
  return port;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Hydraulic security test server stopped early");
    try {
      if ((await fetch(`${url}/api/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Hydraulic security test server did not start");
}

test("only the primary admin account can load the hydraulic application", async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-hydraulic-auth-"));
  const port = await freePort();
  const qrPort = await freePort();
  const primaryToken = "primary-hydraulic-session";
  const otherToken = "other-hydraulic-session";
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const tokenHash = token => crypto.createHash("sha256").update(token).digest("hex");
  fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({
    users: [
      { id: "primary", employeeId: "87064091893", name: "Primary Admin", role: "editor", approved: true },
      { id: "other", employeeId: "other", name: "Other Admin", role: "editor", approved: true }
    ],
    authSessions: [
      { userId: "primary", tokenHash: tokenHash(primaryToken), expiresAt },
      { userId: "other", tokenHash: tokenHash(otherToken), expiresAt }
    ]
  }));
  const child = spawn(process.execPath, [path.join(root, "server.js")], {
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
    stdio: "ignore"
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(base, child);
    assert.equal((await fetch(`${base}/hydraulic-pk1540.html`)).status, 401);
    assert.equal((await fetch(`${base}/hydraulic-pk1540.html`, {
      headers: { cookie: `ppr_session=${otherToken}` }
    })).status, 403);
    const allowed = await fetch(`${base}/hydraulic-pk1540.html`, {
      headers: { cookie: `ppr_session=${primaryToken}` }
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("cache-control"), "private, no-store");
    assert.match(await allowed.text(), /Пресс ПК-1540/);
  } finally {
    child.kill("SIGTERM");
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
