"use strict";

function broadcastWebSockets(servers, message, onError = () => {}) {
  for (const server of servers) {
    for (const client of server.clients) {
      if (client.readyState !== 1 || !client.pprAuthenticated) continue;
      try { client.send(message); } catch (error) { onError(error); }
    }
  }
}

function attachWebSocketServer(WebSocketServer, server, { authenticate, stateVersion, onError = () => {} }) {
  const sockets = new WebSocketServer({ server, path: "/ws", perMessageDeflate: { threshold: 1024 } });
  sockets.on("connection", async (socket, req) => {
    // The ws library registers a connection before async session lookup finishes.
    // Never broadcast committed business data until that lookup has succeeded.
    socket.pprAuthenticated = false;
    try {
      if (!(await authenticate(req))) { socket.close(1008, "authentication_required"); return; }
      if (socket.readyState !== 1) return;
      socket.pprAuthenticated = true;
      socket.isAlive = true;
      socket.on("pong", () => { socket.isAlive = true; });
      socket.send(JSON.stringify({ type: "ready", origin: "server", stateVersion: stateVersion() }));
      socket.on("message", raw => {
        try {
          const message = JSON.parse(String(raw || "{}"));
          if (message.type === "ping") socket.send(JSON.stringify({ type: "pong" }));
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

module.exports = { broadcastWebSockets, attachWebSocketServer };
