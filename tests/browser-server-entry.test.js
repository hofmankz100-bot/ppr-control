"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const { observeHttpListeners } = require("../tools/testing/browser-server-entry");
const { createIsolatedServerEnv } = require("../tools/testing/isolated-env");

test("HTTP listener discovery reports OS-allocated ports while both sockets remain bound", async t => {
  const original = http.createServer;
  const reports = [];
  const restore = observeHttpListeners(listener => reports.push(listener));
  const servers = [http.createServer((req, res) => res.end("primary")), http.createServer((req, res) => res.end("qr"))];
  restore();
  assert.equal(http.createServer, original);
  t.after(() => Promise.all(servers.map(server => new Promise(resolve => server.close(resolve)))));
  await Promise.all(servers.map(async server => {
    const ready = once(server, "listening");
    server.listen(0, "127.0.0.1");
    await ready;
  }));
  assert.equal(reports.length, 2);
  assert.notEqual(reports[0].port, reports[1].port);
  for (const report of reports) {
    assert.equal(report.port, servers[report.index].address().port);
    const response = await fetch(`http://127.0.0.1:${report.port}`);
    assert.equal(await response.text(), report.index === 0 ? "primary" : "qr");
  }
});

test("listener discovery preserves a real bind failure without retrying or reporting readiness", async t => {
  const occupied = http.createServer();
  occupied.listen(0, "127.0.0.1");
  await once(occupied, "listening");
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  const reports = [];
  const restore = observeHttpListeners(listener => reports.push(listener));
  const conflicting = http.createServer();
  restore();
  const failure = once(conflicting, "error");
  conflicting.listen(occupied.address().port, "127.0.0.1");
  assert.equal((await failure)[0].code, "EADDRINUSE");
  assert.deepEqual(reports, []);
});

test("test bootstrap preserves application startup failures and never reports them ready", { timeout: 10000 }, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ppr-listener-failure-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("ppr-listener-failure-"));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const dataFile = path.join(directory, "not-a-directory");
  await fs.writeFile(dataFile, "Synthetic startup error");
  const child = spawn(process.execPath, [path.resolve(__dirname, "../tools/testing/browser-server-entry.js")], {
    env: createIsolatedServerEnv({ DATA_DIR: dataFile, NODE_ENV: "production" }),
    windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let output = "";
  const messages = [];
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  child.on("message", message => messages.push(message));
  const [code] = await once(child, "close");
  assert.notEqual(code, 0);
  assert.match(output, /ENOTDIR|EEXIST/);
  assert.deepEqual(messages, []);
});
