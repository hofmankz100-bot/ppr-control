"use strict";

const MAX_BUFFERED_BYTES = 8 * 1024 * 1024;

function messageBytes(message) {
  return typeof message === "string" ? Buffer.byteLength(message, "utf8") : message.byteLength;
}

function authorizeWebSocket(client, authorize, onError = () => {}) {
  if (client.readyState !== 1 || !client.pprAuthenticated) return false;
  try { if (authorize(client)) return true; } catch (error) { onError(error); }
  client.pprAuthenticated = false;
  try { client.close(1008, "authentication_required"); } catch (error) { onError(error); }
  return false;
}

function sendBounded(client, message, onError, bytes = messageBytes(message)) {
  if (client.readyState !== 1 || !client.pprAuthenticated) return false;
  const queued = Number(client.bufferedAmount || 0);
  // Permit one full snapshot larger than the ordinary queue budget, including
  // an earlier small ready/pong frame. Never keep adding to a slow socket's
  // already-large queue. Reconnecting clients recover via /api/changes/state.
  if (queued > MAX_BUFFERED_BYTES || queued + bytes > Math.max(MAX_BUFFERED_BYTES, 2 * bytes)) {
    client.pprAuthenticated = false;
    try {
      if (typeof client.terminate === "function") client.terminate();
      else client.close(1013, "slow_consumer_reconnect");
    } catch (error) { onError(error); }
    return false;
  }
  try {
    client.send(message, error => { if (error) onError(error); });
    return true;
  } catch (error) { onError(error); return false; }
}

function broadcastWebSockets(servers, message, onError = () => {}, authorize = () => true) {
  const bytes = messageBytes(message);
  for (const server of servers) {
    for (const client of server.clients) {
      if (!authorizeWebSocket(client, authorize, onError)) continue;
      sendBounded(client, message, onError, bytes);
    }
  }
}

function attachWebSocketServer(WebSocketServer, server, { authenticate, stateVersion, validator = () => () => true, onError = () => {} }) {
  // Per-socket zlib contexts can fragment native memory on the 512 MiB host.
  const sockets = new WebSocketServer({ server, path: "/ws", perMessageDeflate: false });
  sockets.on("connection", async (socket, req) => {
    // The ws library registers a connection before async session lookup finishes.
    // Never broadcast committed business data until that lookup has succeeded.
    socket.pprAuthenticated = false;
    socket.on("error", onError);
    try {
      socket.pprAuth = await authenticate(req);
      if (!socket.pprAuth) { socket.close(1008, "authentication_required"); return; }
      if (socket.readyState !== 1) return;
      socket.pprAuthenticated = true;
      if (!authorizeWebSocket(socket, validator(), onError)) return;
      socket.isAlive = true;
      socket.on("pong", () => { socket.isAlive = true; });
      if (!sendBounded(socket, JSON.stringify({ type: "ready", origin: "server", stateVersion: stateVersion() }), onError)) return;
      socket.on("message", raw => {
        if (!authorizeWebSocket(socket, validator(), onError)) return;
        try {
          const message = JSON.parse(String(raw || "{}"));
          if (message.type === "ping") sendBounded(socket, JSON.stringify({ type: "pong" }), onError);
        } catch (error) { onError(error); }
      });
    } catch (error) {
      socket.pprAuthenticated = false;
      onError(error);
      try { socket.close(1008, "authentication_required"); } catch (closeError) { onError(closeError); }
    }
  });
  return sockets;
}

function sendServerEvent(clients, res, payload, authorize = () => true) {
  try {
    if (!authorize(res)) { clients.delete(res); res.end(); return; }
    const message = typeof payload === "string" ? payload : `data: ${JSON.stringify(payload)}\n\n`;
    const queued = Number(res.writableLength || 0);
    const bytes = Buffer.byteLength(message);
    if (res.destroyed || res.writableEnded || queued > MAX_BUFFERED_BYTES
      || queued + bytes > Math.max(MAX_BUFFERED_BYTES, 2 * bytes)) {
      clients.delete(res); res.destroy?.(); return;
    }
    res.write(message);
  } catch { clients.delete(res); res.destroy?.(); }
}

module.exports = { broadcastWebSockets, attachWebSocketServer, authorizeWebSocket, sendServerEvent, MAX_BUFFERED_BYTES };
