"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const { once } = require("node:events");
const { createPostgresSandbox } = require("../tools/testing/postgres-sandbox");
const { createPostgresTestPool } = require("../tools/testing/postgres-test-pool");
const { createPostgresStateStore } = require("../server/postgres-state-store");

test("isolated PostgreSQL mirror SQL cancellation, socket destruction, and recovery", { skip: !process.env.PPR_E2E_POSTGRES_URL, timeout: 30000 }, async t => {
  const sandboxes = [], trackedPools = [], sockets = new Set();
  let proxy;
  try {
    for (let index = 0; index < 2; index += 1) sandboxes.push(await createPostgresSandbox(process.env.PPR_E2E_POSTGRES_URL));
    const config = sandbox => {
      const url = new URL(sandbox.databaseUrl);
      return { host: url.hostname, port: Number(url.port), database: url.pathname.slice(1), user: "ppr_e2e",
        password: () => decodeURIComponent(url.password), ssl: false, connectionTimeoutMillis: 500, max: 4 };
    };
    const connectPool = options => { const tracked = createPostgresTestPool(options); trackedPools.push(tracked); return tracked.pool; };
    const primary = connectPool(config(sandboxes[0])), replica = connectPool(config(sandboxes[1]));
    for (const pool of [primary, replica]) await pool.query("CREATE TABLE ppr_settings(setting_key text PRIMARY KEY,payload jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())");
    const node = { name: "mirror", healthy: true, pool: replica };
    const store = createPostgresStateStore({ nodes: [{ name: "primary", healthy: true, pool: primary }, node] }, { mirrorStatementTimeoutMs: 80, mirrorQueryTimeoutMs: 1000 });
    await store.initialize(() => ({ preserved: "manual-group", count: 0 }));
    await store.flushMirrors();
    const commit = async (target, count) => {
      const session = await target.begin();
      try { await session.commit({ ...session.state, count }); } finally { session.release(); }
    };
    const read = async pool => (await pool.query("SELECT payload,state_revision FROM ppr_settings WHERE setting_key='full_state'")).rows[0];

    await t.test("statement_timeout really cancels a lock-blocked mirror UPDATE, while primary remains acknowledged", async () => {
      const locker = await replica.connect();
      try {
        await locker.query("BEGIN");
        await locker.query("LOCK TABLE ppr_settings IN ACCESS EXCLUSIVE MODE");
        await commit(store, 1);
        const flushed = await store.flushMirrors();
        assert.equal(flushed[0].status, "rejected");
        assert.equal(flushed[0].reason.code, "57014");
        assert.match(flushed[0].reason.message, /statement timeout/);
        assert.equal((await read(primary)).payload.count, 1);
        assert.equal(store.failoverRevision(), 2n);
        assert.equal(node.healthy, false);
      } finally { await locker.query("ROLLBACK"); locker.release(); }
      await store.prepareMirror(node);
      assert.equal((await store.flushMirrors())[0].status, "fulfilled");
      assert.deepEqual(await read(replica), await read(primary));
    });

    await t.test("network deadline closes the actual pg socket, removes its backend, and resumes latest pending state", async () => {
      let blockReply = true;
      let dropped = false;
      const targetConfig = config(sandboxes[1]);
      proxy = net.createServer(client => {
        const upstream = net.connect({ host: "127.0.0.1", port: targetConfig.port });
        sockets.add(client); sockets.add(upstream);
        let discard = false;
        client.on("data", chunk => {
          if (blockReply && chunk.includes(Buffer.from("INSERT INTO ppr_settings"))) { discard = true; dropped = true; }
          upstream.write(chunk);
        });
        upstream.on("data", chunk => { if (!discard) client.write(chunk); });
        client.on("error", () => upstream.destroy());
        upstream.on("error", () => client.destroy());
        client.on("close", () => { sockets.delete(client); upstream.destroy(); });
        upstream.on("close", () => { sockets.delete(upstream); client.destroy(); });
      });
      proxy.listen(0, "127.0.0.1"); await once(proxy, "listening");
      const applicationName = "ppr-a22-network-timeout";
      const proxyPool = connectPool({ ...targetConfig, port: proxy.address().port, application_name: applicationName });
      const proxyNode = { name: "proxy-mirror", healthy: true, pool: proxyPool };
      const timed = createPostgresStateStore({ nodes: [{ name: "primary", healthy: true, pool: primary }, proxyNode] }, { mirrorQueryTimeoutMs: 150, mirrorStatementTimeoutMs: 1000 });
      await timed.prepareMirror(proxyNode);
      const before = await read(replica);
      await commit(timed, 2);
      const flushed = await timed.flushMirrors();
      assert.equal(dropped, true);
      assert.equal(flushed[0].status, "rejected");
      assert.equal(flushed[0].reason.code, "PPR_MIRROR_QUERY_TIMEOUT");
      assert.equal(proxyPool.totalCount, 0, "timed-out pg client is discarded, not returned idle");
      const deadline = Date.now() + 2000;
      let backends;
      do {
        backends = await replica.query("SELECT pid FROM pg_stat_activity WHERE application_name=$1", [applicationName]);
        if (!backends.rowCount) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      } while (Date.now() < deadline);
      assert.equal(backends.rowCount, 0, "the server no longer retains the disconnected mirror transaction");
      assert.deepEqual(await read(replica), before, "uncommitted mirror transaction rolls back on disconnect");
      assert.equal((await read(primary)).payload.count, 2);
      blockReply = false;
      await timed.prepareMirror(proxyNode);
      assert.equal((await timed.flushMirrors())[0].status, "fulfilled");
      assert.deepEqual(await read(replica), await read(primary));
    });
  } finally {
    await Promise.allSettled(trackedPools.map(tracked => tracked.close()));
    for (const socket of sockets) socket.destroy();
    if (proxy) await new Promise(resolve => proxy.close(resolve));
    const cleanup = await Promise.allSettled(sandboxes.map(sandbox => sandbox.dispose()));
    const errors = cleanup.filter(item => item.status === "rejected").map(item => item.reason);
    if (errors.length) throw new AggregateError(errors, "Mirror sandbox cleanup failed");
  }
});
