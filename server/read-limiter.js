"use strict";

// Queue before loading snapshots, so waiting HTTP requests do not retain copies
// of the working database. Writes and health checks have separate execution paths.
function createReadLimiter(limit = 2, maxWaiting = 64) {
  let active = 0;
  const waiting = [];
  return async function limited(task) {
    if (active >= limit) {
      if (waiting.length >= maxWaiting) {
        const error = new Error("Server busy. Please retry shortly.");
        error.statusCode = 503;
        throw error;
      }
      await new Promise(resolve => waiting.push(resolve));
    } else active += 1;
    try { return await task(); }
    finally {
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    }
  };
}

module.exports = { createReadLimiter };
