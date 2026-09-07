"use strict";

const MAX_BUFFERED_BYTES = 8 * 1024 * 1024;

function messageBytes(message) {
  return typeof message === "string" ? Buffer.byteLength(message, "utf8") : message.byteLength;
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

function broadcastWebSockets(servers, message, onError = () => {}) {
  const bytes = messageBytes(message);
  for (const server of servers) {
    for (const client of server.clients) {
      sendBounded(client, message, onError, bytes);
    }
  }
}

function attachWebSocketServer(WebSocketServer, server, { authenticate, stateVersion, onError = () => {} }) {
  // Per-socket zlib contexts can fragment native memory on the 512 MiB host.
  const sockets = new WebSocketServer({ server, path: "/ws", perMessageDeflate: false });
  sockets.on("connection", async (socket, req) => {
    // The ws library registers a connection before async session lookup finishes.
    // Never broadcast committed business data until that lookup has succeeded.
    socket.pprAuthenticated = false;
    socket.on("error", onError);
    try {
      if (!(await authenticate(req))) { socket.close(1008, "authentication_required"); return; }
      if (socket.readyState !== 1) return;
      socket.pprAuthenticated = true;
      socket.isAlive = true;
      socket.on("pong", () => { socket.isAlive = true; });
      if (!sendBounded(socket, JSON.stringify({ type: "ready", origin: "server", stateVersion: stateVersion() }), onError)) return;
      socket.on("message", raw => {
        if (socket.readyState !== 1 || !socket.pprAuthenticated) return;
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

module.exports = { broadcastWebSockets, attachWebSocketServer, MAX_BUFFERED_BYTES };
