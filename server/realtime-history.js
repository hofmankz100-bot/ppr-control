"use strict";

// This is a short reconnect cache, not the durable journal. Missing history is
// recovered by the existing /api/changes reset + /api/state handshake.
function createRealtimeHistory({ maxBytes = 8 * 1024 * 1024, maxEntries = 100 } = {}) {
  const entries = [];
  let bytes = 0;
  return {
    entries,
    get bytes() { return bytes; },
    add(counter, payload, serialized = JSON.stringify(payload)) {
      const size = Buffer.byteLength(serialized, "utf8");
      if (size > maxBytes) {
        // A gap must discard the entire prefix, otherwise /api/changes could
        // claim a contiguous history while silently omitting this snapshot.
        entries.length = 0;
        bytes = 0;
        return;
      }
      entries.push({ counter, payload, bytes: size });
      bytes += size;
      while (bytes > maxBytes || entries.length > maxEntries) bytes -= entries.shift().bytes;
    }
  };
}

module.exports = { createRealtimeHistory };
