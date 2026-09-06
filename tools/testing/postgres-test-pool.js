"use strict";

function createPostgresTestPool(config, Pool = require("pg").Pool) {
  const pool = new Pool(config);
  const clientEnds = new Set();
  let closing;
  pool.on("connect", client => {
    const ended = new Promise(resolve => client.once("end", resolve));
    clientEnds.add(ended);
    ended.then(() => clientEnds.delete(ended));
  });
  return {
    pool,
    close() {
      if (!closing) closing = (async () => {
        // pg-pool removes idle clients from its bookkeeping before their sockets
        // close. DROP DATABASE WITH (FORCE) must wait for those actual end events.
        await pool.end();
        await Promise.all([...clientEnds]);
      })();
      return closing;
    }
  };
}

module.exports = { createPostgresTestPool };
