const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("standalone PK-1540 hydraulic app is Russian and interactive", () => {
  const html = fs.readFileSync(path.join(root, "hydraulic-pk1540.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "hydraulic-pk1540.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "hydraulic-pk1540.css"), "utf8");
  const image = path.join(root, "assets", "pk1540-hydraulic.webp");

  assert.match(html, /lang="ru"/);
  assert.match(html, /Интерактивная гидравлическая схема/);
  assert.match(html, /Подача под давлением/);
  assert.match(html, /Слив в бак/);
  assert.match(html, /hydraulic-pk1540\.js/);
  assert.ok(fs.statSync(image).size > 100_000);

  assert.match(script, /Нож — опустить/);
  assert.match(script, /Контейнер №1 — открыть/);
  assert.match(script, /Контейнер №1 — закрыть/);
  assert.match(script, /Контейнер №2 — открыть/);
  assert.match(script, /Контейнер №2 — закрыть/);
  assert.match(script, /Контейнер №1 — возврат масла при открытии/);
  assert.match(script, /Главный цилиндр — вперёд/);
  assert.match(script, /Сброс давления главного цилиндра/);
  assert.match(script, /Главный насос/);
  assert.match(script, /function activateMode\(id\)/);
  assert.match(script, /Сигнал подан · нажмите для снятия/);
  assert.match(script, /Электромагнит включён — сигнал подан/);
  assert.match(script, /if \(activeModeId === id\)/);
  assert.match(script, /const actuatorByMode/);
  assert.match(script, /function renderActuator\(id\)/);
  assert.match(script, /Главный цилиндр движется вперёд/);
  assert.match(script, /pressureGroup\.innerHTML = pathMarkup/);
  assert.match(script, /returnGroup\.innerHTML = pathMarkup/);
  assert.match(script, /pointerdown/);
  assert.match(script, /function fitView\(\)/);

  assert.match(styles, /@keyframes oil-flow/);
  assert.match(styles, /\.pressure-flow path/);
  assert.match(styles, /\.return-flow path/);
  assert.match(styles, /\.signal-state/);
  assert.match(styles, /@keyframes cylinder-forward/);
  assert.match(styles, /@media \(max-width: 820px\)/);
});

test("main PPR server does not publish the private hydraulic app", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.doesNotMatch(server, /"hydraulic-pk1540\.html"/);
  assert.doesNotMatch(server, /"assets\/pk1540-hydraulic\.webp"/);
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

test("local hydraulic server binds to loopback and exposes only app files", async () => {
  const source = fs.readFileSync(path.join(root, "tools", "hydraulic-local-server.js"), "utf8");
  const launcher = fs.readFileSync(path.join(root, "START-HYDRAULIC-PK1540.bat"), "utf8");
  assert.match(source, /const host = "127\.0\.0\.1"/);
  assert.match(source, /HYDRAULIC_NO_OPEN/);
  assert.match(source, /"Cache-Control": "no-store"/);
  assert.match(launcher, /tools\\hydraulic-local-server\.js/);

  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, "tools", "hydraulic-local-server.js")], {
    cwd: root,
    env: {
      ...process.env,
      HYDRAULIC_PORT: String(port),
      HYDRAULIC_NO_OPEN: "1"
    },
    stdio: "ignore"
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    const deadline = Date.now() + 10_000;
    let response;
    while (Date.now() < deadline) {
      try {
        response = await fetch(`${base}/`);
        if (response.ok) break;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    assert.equal(response?.status, 200);
    assert.match(await response.text(), /Пресс ПК-1540/);
    assert.equal((await fetch(`${base}/assets/pk1540-hydraulic.webp`)).status, 200);
    assert.equal((await fetch(`${base}/server.js`)).status, 404);
  } finally {
    child.kill("SIGTERM");
  }
});
