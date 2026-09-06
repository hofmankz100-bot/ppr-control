"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const https = require("node:https");
const { once } = require("node:events");
const { WebSocket, WebSocketServer } = require("ws");
const { createHttpsGateway } = require("../tools/testing/https-gateway");

async function testBackend(t, handler) {
  const server = http.createServer(handler);
  const sockets = new Set();
  server.on("connection", socket => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    const closed = new Promise(resolve => server.close(resolve));
    for (const socket of sockets) socket.destroy();
    await closed;
  });
  return server;
}

function request(baseURL, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(options.path || "/", baseURL), {
      ...options,
      family: 4,
      rejectUnauthorized: false,
      agent: false
    }, res => {
      const chunks = [];
      const certificate = res.socket.getPeerCertificate();
      res.on("data", chunk => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks), certificate }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

test("HTTPS gateway rejects invalid target ports", async () => {
  for (const value of [undefined, null, "5432", 0, -1, 65536, 3.14, Infinity, NaN]) {
    await assert.rejects(createHttpsGateway(value), /targetPort/);
  }
});

test("HTTPS gateway preserves request bytes, response bytes, and Secure cookie headers", { timeout: 10000 }, async t => {
  const payload = Buffer.from([0, 1, 2, 13, 10, 128, 255]);
  const cookies = ["ppr_session=mock-token; Path=/; HttpOnly; Secure; SameSite=Lax", "second=test; Secure; Path=/"];
  let observed;
  const backend = await testBackend(t, (req, res) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      observed = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) };
      res.writeHead(201, { "Content-Type": "application/octet-stream", "Set-Cookie": cookies });
      res.end(observed.body);
    });
  });
  const gateway = await createHttpsGateway(backend.address().port);
  t.after(() => gateway.dispose());
  const response = await request(gateway.baseURL, {
    path: "/api/mock?value=encoded%20text",
    method: "POST",
    headers: { Cookie: "ppr_session=mock-token", "Content-Type": "application/octet-stream" }
  }, payload);
  assert.match(gateway.baseURL, /^https:\/\/localhost:\d+$/);
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, payload);
  assert.deepEqual(response.headers["set-cookie"], cookies);
  assert.deepEqual(observed.body, payload);
  assert.equal(observed.url, "/api/mock?value=encoded%20text");
  assert.equal(observed.method, "POST");
  assert.equal(observed.headers.cookie, "ppr_session=mock-token");
  assert.equal(observed.headers["x-forwarded-proto"], "https");
  assert.equal(observed.headers.host, new URL(gateway.baseURL).host);
  assert.match(response.certificate.subjectaltname, /DNS:localhost/);
  assert.match(response.certificate.subjectaltname, /IP Address:127\.0\.0\.1/);
});

test("HTTPS gateway streams SSE before the upstream response ends", { timeout: 10000 }, async t => {
  let finishUpstream;
  const backend = await testBackend(t, (req, res) => {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    res.write("data: first\n\n");
    finishUpstream = () => res.end("data: second\n\n");
  });
  const gateway = await createHttpsGateway(backend.address().port);
  t.after(() => gateway.dispose());
  const chunks = [];
  await new Promise((resolve, reject) => {
    const req = https.get(`${gateway.baseURL}/api/events`, { family: 4, rejectUnauthorized: false, agent: false }, res => {
      res.on("data", chunk => {
        chunks.push(chunk.toString());
        if (chunks.length === 1) {
          assert.equal(chunks[0], "data: first\n\n");
          finishUpstream();
        }
      });
      res.on("error", reject);
      res.on("end", resolve);
    });
    req.on("error", reject);
  });
  assert.equal(chunks.join(""), "data: first\n\ndata: second\n\n");
});

test("HTTPS gateway proxies WebSocket echo and disposal closes active sockets", { timeout: 10000 }, async t => {
  const backend = await testBackend(t);
  const wss = new WebSocketServer({ server: backend, path: "/ws" });
  t.after(() => wss.close());
  let observedCookie;
  wss.on("connection", (socket, req) => {
    observedCookie = req.headers.cookie;
    socket.send("welcome");
    socket.on("message", (data, isBinary) => socket.send(data, { binary: isBinary }));
  });
  const gateway = await createHttpsGateway(backend.address().port);
  t.after(() => gateway.dispose());
  const client = new WebSocket(`${gateway.baseURL.replace("https:", "wss:")}/ws`, {
    family: 4,
    rejectUnauthorized: false,
    headers: { Cookie: "ppr_session=websocket-mock" }
  });
  t.after(() => client.terminate());
  const welcome = once(client, "message");
  await once(client, "open");
  assert.equal(String((await welcome)[0]), "welcome");
  const echoed = once(client, "message");
  const payload = Buffer.from([0, 128, 255, 10]);
  client.send(payload);
  const [data, isBinary] = await echoed;
  assert.deepEqual(data, payload);
  assert.equal(isBinary, true);
  assert.equal(observedCookie, "ppr_session=websocket-mock");
  const closed = once(client, "close");
  await Promise.all([gateway.dispose(), gateway.dispose()]);
  await closed;
  await gateway.dispose();
  await assert.rejects(request(gateway.baseURL), error => error.code === "ECONNREFUSED");
});

test("HTTPS gateway preserves a rejected WebSocket handshake response", { timeout: 10000 }, async t => {
  const backend = await testBackend(t, (req, res) => {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.write("authentication_");
    res.end("required");
  });
  const gateway = await createHttpsGateway(backend.address().port);
  t.after(() => gateway.dispose());
  const client = new WebSocket(`${gateway.baseURL.replace("https:", "wss:")}/ws`, {
    family: 4,
    rejectUnauthorized: false
  });
  client.on("error", () => {});
  const response = await new Promise((resolve, reject) => {
    client.on("unexpected-response", (req, res) => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() });
        client.terminate();
      });
    });
    client.on("error", reject);
  });
  assert.deepEqual(response, { status: 401, body: "authentication_required" });
});
