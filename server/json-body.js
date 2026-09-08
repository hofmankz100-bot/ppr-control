"use strict";
const { TextDecoder } = require("node:util");

function createJsonBodyReader({ maxBytes = 25_000_000 } = {}) {
  const requests = new WeakMap();
  return function readBody(req) {
    if (requests.has(req)) return requests.get(req);
    const result = new Promise((resolve, reject) => {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let body = "", bytes = 0, failed = false;
      const fail = message => { if (failed) return; failed = true; reject(new Error(message)); };
      req.on("data", chunk => {
        if (failed) return;
        const buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
        bytes += buffer.length;
        if (bytes > maxBytes) { fail("Body too large"); req.destroy(); return; }
        try { body += decoder.decode(buffer, { stream: true }); }
        catch { fail("Bad JSON"); }
      });
      req.on("end", () => {
        if (failed) return;
        try { body += decoder.decode(); resolve(body ? JSON.parse(body) : {}); }
        catch { fail("Bad JSON"); }
      });
      req.on("error", error => fail(error.message));
      req.on("aborted", () => fail("Request aborted"));
    });
    requests.set(req, result);
    return result;
  };
}
module.exports = { createJsonBodyReader };
