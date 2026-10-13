'use strict';

// Compatibility entrypoint for the existing Render URL. No database or app code
// is loaded here: every business request goes to the factory over verified TLS.
const http = require('node:http');
const https = require('node:https');

const FACTORY = Object.freeze({ hostname: '194.31.135.122', port: 443 });
const HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'proxy-connection', 'te', 'trailer', 'transfer-encoding', 'upgrade'
]);
const HEALTH_PATH = '/factory-proxy-health';
const UNAVAILABLE = Buffer.from(JSON.stringify({
  ok: false, error: 'factory_temporarily_unavailable',
  message: 'ППР временно недоступен. Сохранённые на устройстве действия будут отправлены после восстановления связи.'
}));

function endToEndHeaders(headers) {
  const omitted = new Set(HOP_HEADERS);
  for (const name of String(headers.connection || '').split(',')) {
    if (name.trim()) omitted.add(name.trim().toLowerCase());
  }
  const result = {};
  for (const [name, value] of Object.entries(headers)) {
    if (!omitted.has(name.toLowerCase()) && value !== undefined) result[name] = value;
  }
  return result;
}

function unavailable(res) {
  if (res.destroyed || res.writableEnded) return;
  if (res.headersSent) { res.destroy(); return; }
  res.writeHead(503, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': UNAVAILABLE.length,
    'Cache-Control': 'no-store', 'Retry-After': '30'
  });
  res.end(UNAVAILABLE);
}

function socketUnavailable(socket) {
  if (socket.destroyed) return;
  socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n'
    + 'Content-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\n'
    + `Retry-After: 30\r\nContent-Length: ${UNAVAILABLE.length}\r\n\r\n` + UNAVAILABLE.toString());
}

function responseHead(response, upgrade = false) {
  const headers = endToEndHeaders(response.headers);
  headers.connection = upgrade ? 'Upgrade' : 'close';
  if (upgrade) headers.upgrade = 'websocket';
  const lines = [`HTTP/1.1 ${response.statusCode} ${response.statusMessage || ''}`];
  for (const [name, value] of Object.entries(headers)) {
    for (const item of Array.isArray(value) ? value : [value]) lines.push(`${name}: ${item}`);
  }
  return lines.join('\r\n') + '\r\n\r\n';
}

// Dependency injection is only available to code importing this module (tests).
// The executable entrypoint below always uses the fixed FACTORY address.
function createFactoryProxy({
  target = FACTORY, ca,
  connectTimeoutMs = 15000, upstreamTimeoutMs = 90000,
  shutdownGraceMs = 25000
} = {}) {
  if (!target.hostname || !Number.isInteger(target.port) || target.port < 1 || target.port > 65535) {
    throw new Error('invalid_upstream');
  }
  const authority = target.port === 443 ? target.hostname : `${target.hostname}:${target.port}`;
  const agent = new https.Agent({
    keepAlive: true, maxSockets: 128, maxFreeSockets: 16, maxTotalSockets: 128,
    rejectUnauthorized: true, servername: '', ...(ca ? { ca } : {})
  });
  const sockets = new Set();
  const tunnels = new Set();
  let stopping = false;
  let closePromise = null;

  function upstreamRequest(req) {
    const headers = endToEndHeaders(req.headers);
    headers.host = authority;
    headers['x-forwarded-host'] = String(req.headers.host || '');
    headers['x-forwarded-proto'] = 'https';
    headers['x-forwarded-port'] = '443';
    delete headers.forwarded;
    const request = https.request({
      hostname: target.hostname, port: target.port,
      method: req.method, path: req.url, headers, agent,
      rejectUnauthorized: true, servername: '', ...(ca ? { ca } : {})
    });
    const connectTimer = setTimeout(() => request.destroy(new Error('upstream_connect_timeout')), connectTimeoutMs);
    connectTimer.unref();
    request.once('socket', socket => {
      if (request.reusedSocket) clearTimeout(connectTimer);
      else socket.once('secureConnect', () => clearTimeout(connectTimer));
    });
    request.once('close', () => clearTimeout(connectTimer));
    request.setTimeout(upstreamTimeoutMs, () => request.destroy(new Error('upstream_inactivity_timeout')));
    return request;
  }

  function validPath(req) {
    return typeof req.url === 'string' && req.url.startsWith('/') && !req.url.startsWith('//');
  }

  const server = http.createServer((req, res) => {
    // This endpoint describes the bridge, never database/application readiness.
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url === HEALTH_PATH && !stopping) {
      const body = Buffer.from(JSON.stringify({ ok: true, service: 'ppr-factory-proxy', databaseChecked: false }));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Length': body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }
    if (stopping || !validPath(req)) { unavailable(res); return; }
    const upstream = upstreamRequest(req);
    let response = null;
    upstream.once('response', incoming => {
      response = incoming;
      if (res.destroyed) { incoming.destroy(); return; }
      res.writeHead(incoming.statusCode, endToEndHeaders(incoming.headers));
      // Headers must reach SSE clients even before the first event arrives.
      res.flushHeaders();
      incoming.once('error', () => res.destroy());
      incoming.once('aborted', () => res.destroy());
      incoming.pipe(res);
    });
    upstream.once('error', () => unavailable(res));
    req.once('aborted', () => upstream.destroy());
    req.once('error', () => upstream.destroy());
    res.once('close', () => {
      if (!res.writableFinished) { upstream.destroy(); response?.destroy(); }
    });
    req.pipe(upstream);
  });

  server.on('connection', socket => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    socket.on('error', () => {});
  });
  server.on('connect', (_req, socket) => socketUnavailable(socket));
  server.on('clientError', (_error, socket) => {
    if (!socket.destroyed) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  server.on('upgrade', (req, downstream, clientHead) => {
    if (stopping || !validPath(req) || req.method !== 'GET'
      || String(req.headers.upgrade || '').toLowerCase() !== 'websocket') {
      socketUnavailable(downstream); return;
    }
    const upstream = upstreamRequest(req);
    upstream.setHeader('Connection', 'Upgrade');
    upstream.setHeader('Upgrade', 'websocket');
    let upgraded = false;
    let upstreamSocket = null;
    const destroyBoth = () => {
      upstream.destroy(); upstreamSocket?.destroy(); downstream.destroy();
    };
    downstream.once('close', () => { upstream.destroy(); upstreamSocket?.destroy(); });
    downstream.once('error', destroyBoth);
    upstream.once('error', () => {
      if (upgraded) destroyBoth(); else socketUnavailable(downstream);
    });
    // Preserve an upstream HTTP rejection rather than manufacturing a 101.
    upstream.once('response', incoming => {
      downstream.write(responseHead(incoming));
      incoming.once('error', destroyBoth);
      incoming.once('aborted', destroyBoth);
      incoming.pipe(downstream);
    });
    upstream.once('upgrade', (incoming, socket, serverHead) => {
      upgraded = true;
      upstreamSocket = socket;
      if (downstream.destroyed || incoming.statusCode !== 101
        || String(incoming.headers.upgrade || '').toLowerCase() !== 'websocket') { destroyBoth(); return; }
      socket.setTimeout(0);
      downstream.setTimeout(0);
      tunnels.add(downstream);
      downstream.once('close', () => tunnels.delete(downstream));
      socket.once('error', destroyBoth);
      socket.once('close', () => downstream.destroy());
      downstream.write(responseHead(incoming, true));
      if (serverHead.length) downstream.write(serverHead);
      if (clientHead.length) socket.write(clientHead);
      socket.pipe(downstream);
      downstream.pipe(socket);
    });
    upstream.end();
  });

  function close() {
    if (closePromise) return closePromise;
    stopping = true;
    closePromise = new Promise(resolve => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        agent.destroy();
        resolve();
      };
      const timer = setTimeout(() => {
        for (const socket of sockets) socket.destroy();
        agent.destroy();
        finish();
      }, shutdownGraceMs);
      timer.unref();
      for (const socket of tunnels) socket.end();
      server.close(finish);
      server.closeIdleConnections();
    });
    return closePromise;
  }
  return { server, close };
}

module.exports = { createFactoryProxy };

if (require.main === module) {
  const portText = process.env.PORT || '10000';
  const port = /^\d+$/.test(portText) ? Number(portText) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('invalid_listen_port');
  const bridge = createFactoryProxy();
  bridge.server.on('error', error => {
    console.error('Factory proxy listener failed:', error.code || 'listener_error');
    process.exitCode = 1;
    bridge.close();
  });
  bridge.server.listen(port, '0.0.0.0', () => console.log(`Factory proxy listening on ${port}; verified upstream https://194.31.135.122`));
  const shutdown = () => bridge.close().then(() => { process.exitCode = 0; });
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

