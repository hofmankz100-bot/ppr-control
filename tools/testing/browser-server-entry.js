"use strict";

const http = require("node:http");
const path = require("node:path");

function observeHttpListeners(report) {
  const createServer = http.createServer;
  let index = 0;
  http.createServer = function (...args) {
    const server = Reflect.apply(createServer, this, args);
    const listenerIndex = index++;
    server.once("listening", () => report({ index: listenerIndex, port: server.address().port }));
    return server;
  };
  return () => { http.createServer = createServer; };
}

if (require.main === module) {
  if (!process.send || process.env.PORT !== "0" || process.env.QR_PORT !== "0" || !path.isAbsolute(process.env.DATA_DIR || "")) {
    throw new Error("Browser test server requires IPC, explicit temporary storage and OS-allocated ports");
  }
  // The application's first two HTTP servers are its primary and QR listeners.
  // Observe actual bound ports without changing handlers, listen arguments or errors.
  // Restoring createServer immediately also leaves all later application code alone.
  const restore = observeHttpListeners(listener => process.send({ type: "ppr-test-listening", ...listener }));
  try { require("../../server"); }
  finally { restore(); }
}

module.exports = { observeHttpListeners };
