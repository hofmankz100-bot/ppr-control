"use strict";
const v8 = require("node:v8");

function buildHealthPayload(options = {}) {
  const websocket = Boolean(options.websocket);
  const eventClients = Number(options.eventClients || 0);
  const serverVersion = String(options.serverVersion || "");
  const memory = options.memoryUsage || process.memoryUsage();
  const mib = value => Math.round(Number(value || 0) / 1024 / 1024);
  const reportedClientVersion = options.compatibleClient && options.clientVersion
    ? String(options.clientVersion)
    : serverVersion;
  return {
    ok: !["postgres-degraded", "json-fallback"].includes(options.storage?.mode),
    version: reportedClientVersion,
    latestVersion: serverVersion,
    clientProtocol: String(options.clientProtocol || ""),
    time: String(options.time || new Date().toISOString()),
    uptimeSeconds: Number.isFinite(options.uptimeSeconds)
      ? Math.round(options.uptimeSeconds)
      : Math.round(process.uptime()),
    memoryMb: Number.isFinite(options.memoryMb)
      ? Math.round(options.memoryMb)
      : mib(memory.rss),
    memory: {
      heapUsedMb: mib(memory.heapUsed), heapTotalMb: mib(memory.heapTotal),
      externalMb: mib(memory.external), arrayBuffersMb: mib(memory.arrayBuffers),
      heapLimitMb: mib(v8.getHeapStatistics().heap_size_limit)
    },
    realtimeCache: options.realtimeCache || { entries: 0, bytes: 0 },
    storage: options.storage || { mode: "json" },
    realtime: websocket || eventClients > 0,
    stateVersion: String(options.stateVersion || ""),
    websocket,
    websocketClients: Number(options.websocketClients || 0),
    eventClients,
    productionRequestDuplicatesRemoved: Number(options.productionRequestDuplicatesRemoved || 0),
    testInstalledPartRecordsRemoved: Number(options.testInstalledPartRecordsRemoved || 0),
    gasQrNodeCount: Number(options.gasQrNodeCount || 0)
  };
}

module.exports = { buildHealthPayload };
