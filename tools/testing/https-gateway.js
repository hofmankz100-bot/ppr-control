"use strict";

const http = require("node:http");
const https = require("node:https");
const selfsigned = require("selfsigned");

const HOP_HEADERS = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade"
]);

function streamHeaders(headers) {
  const excluded = new Set(HOP_HEADERS);
  for (const name of String(headers.connection || "").split(",")) excluded.add(name.trim().toLowerCase());
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !excluded.has(name.toLowerCase())));
}

function responseHead(response, streaming = false) {
  const lines = [`HTTP/1.1 ${response.statusCode} ${response.statusMessage || ""}`];
  if (streaming) {
    for (const [name, value] of Object.entries(streamHeaders(response.headers))) {
      for (const entry of Array.isArray(value) ? value : [value]) lines.push(`${name}: ${entry}`);
    }
    // IncomingMessage has decoded upstream chunk framing; close frames the body.
    lines.push("Connection: close");
  } else {
    for (let index = 0; index < response.rawHeaders.length; index += 2) {
      lines.push(`${response.rawHeaders[index]}: ${response.rawHeaders[index + 1]}`);
    }
  }
  return `${lines.join("\r\n")}\r\n\r\n`;
}

async function createHttpsGateway(targetPort) {
  if (!Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535) {
    throw new TypeError("HTTPS gateway targetPort must be an integer from 1 to 65535.");
  }
  const now = Date.now();
  const certificate = await selfsigned.generate([{ name: "commonName", value: "localhost" }], {
    keyType: "ec",
    curve: "P-256",
    algorithm: "sha256",
    notBeforeDate: new Date(now - 60000),
    notAfterDate: new Date(now + 24 * 60 * 60 * 1000),
    extensions: [
      { name: "basicConstraints", cA: false },
      { name: "keyUsage", digitalSignature: true },
      { name: "extKeyUsage", serverAuth: true },
      { name: "subjectAltName", altNames: [
        { type: 2, value: "localhost" },
        { type: 7, ip: "127.0.0.1" }
      ] }
    ]
  });
  const sockets = new Set();
  const trackSocket = socket => {
    if (sockets.has(socket)) return;
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };
  const server = https.createServer({ key: certificate.private, cert: certificate.cert });
  server.on("connection", trackSocket);
  server.on("secureConnection", trackSocket);
  let disposed = false;
  let disposePromise = null;

  function targetOptions(req, upgrade = false) {
    const headers = streamHeaders(req.headers);
    headers["x-forwarded-proto"] = "https";
    headers["x-forwarded-host"] = req.headers.host || "localhost";
    headers["x-forwarded-for"] = req.socket.remoteAddress || "127.0.0.1";
    if (upgrade) {
      headers.connection = "Upgrade";
      headers.upgrade = req.headers.upgrade;
    }
    return {
      hostname: "127.0.0.1",
      port: targetPort,
      method: req.method,
      path: req.url,
      headers,
      agent: false
    };
  }

  function allowedPath(req) {
    return typeof req.url === "string" && /^\/(?!\/)/.test(req.url);
  }

  server.on("request", (req, res) => {
    if (disposed || !allowedPath(req)) {
      res.writeHead(disposed ? 503 : 400);
      res.end();
      return;
    }
    const upstream = http.request(targetOptions(req), response => {
      res.writeHead(response.statusCode, streamHeaders(response.headers));
      response.on("error", () => res.destroy());
      response.pipe(res);
    });
    upstream.on("socket", trackSocket);
    upstream.on("error", () => {
      if (res.headersSent) res.destroy();
      else if (!res.destroyed) {
        res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Test application is unavailable.");
      }
    });
    req.on("aborted", () => upstream.destroy());
    req.on("error", () => upstream.destroy());
    res.on("close", () => upstream.destroy());
    req.pipe(upstream);
  });

  server.on("upgrade", (req, clientSocket, clientHead) => {
    if (disposed || !allowedPath(req) || String(req.headers.upgrade || "").toLowerCase() !== "websocket") {
      clientSocket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
      return;
    }
    trackSocket(clientSocket);
    clientSocket.pause();
    const upstream = http.request(targetOptions(req, true));
    upstream.on("socket", trackSocket);
    clientSocket.on("error", () => upstream.destroy());
    clientSocket.once("close", () => upstream.destroy());
    upstream.on("error", () => clientSocket.destroy());
    upstream.on("response", response => {
      clientSocket.write(responseHead(response, true));
      response.on("error", () => clientSocket.destroy());
      response.pipe(clientSocket);
    });
    upstream.on("upgrade", (response, upstreamSocket, upstreamHead) => {
      trackSocket(upstreamSocket);
      upstreamSocket.on("error", () => clientSocket.destroy());
      upstreamSocket.once("close", () => clientSocket.destroy());
      clientSocket.once("close", () => upstreamSocket.destroy());
      if (clientSocket.destroyed || disposed) {
        upstreamSocket.destroy();
        return;
      }
      clientSocket.write(responseHead(response));
      if (upstreamHead.length) clientSocket.write(upstreamHead);
      if (clientHead.length) upstreamSocket.write(clientHead);
      upstreamSocket.pipe(clientSocket);
      clientSocket.pipe(upstreamSocket);
      clientSocket.resume();
    });
    upstream.end();
  });

  await new Promise((resolve, reject) => {
    const onError = error => reject(error);
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", onError);
      resolve();
    });
  });
  const baseURL = `https://localhost:${server.address().port}`;

  function dispose() {
    if (!disposePromise) {
      disposed = true;
      disposePromise = new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        for (const socket of sockets) socket.destroy();
      });
    }
    return disposePromise;
  }
  return { baseURL, dispose };
}

module.exports = { createHttpsGateway };
