"use strict";

function buildHealthPayload(options = {}) {
  const websocket = Boolean(options.websocket);
  const eventClients = Number(options.eventClients || 0);
  const serverVersion = String(options.serverVersion || "");
  const reportedClientVersion = options.compatibleClient && options.clientVersion
    ? String(options.clientVersion)
    : serverVersion;
  return {
    ok: true,
    version: reportedClientVersion,
    latestVersion: serverVersion,
    clientProtocol: String(options.clientProtocol || ""),
    time: String(options.time || new Date().toISOString()),
    uptimeSeconds: Number.isFinite(options.uptimeSeconds)
      ? Math.round(options.uptimeSeconds)
      : Math.round(process.uptime()),
    memoryMb: Number.isFinite(options.memoryMb)
      ? Math.round(options.memoryMb)
      : Math.round(process.memoryUsage().rss / 1024 / 1024),
    storage: options.storage || { mode: "json" },
    realtime: websocket || eventClients > 0,
    stateVersion: String(options.stateVersion || ""),
    websocket,
    websocketClients: Number(options.websocketClients || 0),
    eventClients,
    productionRequestDuplicatesRemoved: Number(options.productionRequestDuplicatesRemoved || 0)
  };
}

module.exports = { buildHealthPayload };
