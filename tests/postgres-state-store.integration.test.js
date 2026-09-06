"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPostgresTestPool } = require("../tools/testing/postgres-test-pool");
const { createPostgresSandbox } = require("../tools/testing/postgres-sandbox");
const { createPostgresStateStore } = require("../server/postgres-state-store");

// Only this explicit localhost opt-in creates a disposable database. Application
// DATABASE_URL, PGHOST, and production credentials are never used by this suite.
test("PostgreSQL durable state and concurrent instances", { skip: !process.env.PPR_E2E_POSTGRES_URL, timeout: 60000 }, async t => {
  const sandbox = await createPostgresSandbox(process.env.PPR_E2E_POSTGRES_URL);
  const connection = new URL(sandbox.databaseUrl);
  const config = {
    host: connection.hostname.replace(/^\[|\]$/g, ""), port: Number(connection.port),
    database: connection.pathname.slice(1), user: "ppr_e2e",
    password: () => decodeURIComponent(connection.password), ssl: false,
    connectionTimeoutMillis: 5000, max: 8, options: "-c search_path=public"
  };
  const { pool: firstPool, close: closeFirstPool } = createPostgresTestPool(config);
  const { pool: secondPool, close: closeSecondPool } = createPostgresTestPool(config);
  try {
    await firstPool.query("CREATE TABLE ppr_settings(setting_key text PRIMARY KEY,payload jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())");
    const first = createPostgresStateStore(firstPool);
    const second = createPostgresStateStore(secondPool);
    const read = async () => (await firstPool.query("SELECT payload,state_revision FROM ppr_settings WHERE setting_key='full_state'")).rows[0];
    const mutate = async (store, operation) => {
      const session = await store.begin();
      try { const next = structuredClone(session.state); operation(next); await session.commit(next); }
      catch (error) { await session.rollback(); throw error; }
      finally { session.release(); }
    };

    await t.test("startup preserves existing records and permanent QR identifiers", async () => {
      await first.initialize(async () => ({ work: [], qrTokens: { "90:0": "permanent-token" }, counter: 0 }));
      await second.initialize(async () => { throw new Error("Existing production state must not be reseeded"); }, state => ({ ...state, migrated: true }));
      const stored = await read();
      assert.equal(stored.payload.qrTokens["90:0"], "permanent-token");
      assert.equal(stored.payload.migrated, true);
    });

    await t.test("two independent pools preserve all competing mutations", async () => {
      await Promise.all(Array.from({ length: 16 }, (_, index) => mutate(index % 2 ? first : second, next => {
        next.work.push(`work-${index}`);
        next.counter += 1;
      })));
      const stored = (await read()).payload;
      assert.equal(stored.counter, 16);
      assert.equal(new Set(stored.work).size, 16);
      assert.equal(stored.qrTokens["90:0"], "permanent-token");
    });

    await t.test("another instance reads committed work after reopening its connection", async () => {
      const { pool: reopenedPool, close: closeReopenedPool } = createPostgresTestPool(config);
      try {
        const reopened = createPostgresStateStore(reopenedPool);
        const session = await reopened.begin();
        try { assert.equal(session.state.work.length, 16); await session.commit(null); }
        finally { session.release(); }
      } finally { await closeReopenedPool(); }
    });

    await t.test("rollback releases the lock and never persists staged work", async () => {
      const before = await read();
      const session = await first.begin();
      session.state.work.push("must-not-persist");
      await session.rollback();
      session.release();
      assert.deepEqual(await read(), before);
      await mutate(second, next => { next.afterRollback = true; });
      assert.equal((await read()).payload.afterRollback, true);
    });

    await t.test("a real COMMIT failure is rejected without acknowledging or persisting the change", async () => {
      await firstPool.query(`CREATE FUNCTION reject_test_commit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.payload ? 'rejectCommit' THEN RAISE EXCEPTION 'deliberate deferred commit failure'; END IF; RETURN NEW; END; $$`);
      await firstPool.query(`CREATE CONSTRAINT TRIGGER reject_test_commit AFTER UPDATE ON ppr_settings
        DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reject_test_commit()`);
      const before = await read();
      await assert.rejects(mutate(first, next => { next.rejectCommit = true; next.work.push("failed-commit"); }), /deliberate deferred commit failure/);
      assert.deepEqual(await read(), before);
      await mutate(second, next => { next.afterCommitFailure = true; });
      assert.equal((await read()).payload.afterCommitFailure, true);
    });

    await t.test("an unavailable authoritative database cannot silently promote a stale mirror", async () => {
      let mirrorUsed = false;
      const offline = createPostgresStateStore({ nodes: [
        { pool: { connect: async () => { throw new Error("primary unavailable"); } } },
        { healthy: true, pool: { connect: async () => { mirrorUsed = true; } } }
      ] });
      await assert.rejects(offline.begin(), /primary unavailable/);
      assert.equal(mirrorUsed, false);
    });

    await t.test("missing durable state after cutover requires recovery and cannot be seeded from local JSON", async () => {
      await firstPool.query("DELETE FROM ppr_settings WHERE setting_key='full_state'");
      let seeded = false;
      await assert.rejects(first.initialize(() => { seeded = true; return { stale: true }; }), /missing after cutover/);
      assert.equal(seeded, false);
      assert.equal((await firstPool.query("SELECT 1 FROM ppr_settings WHERE setting_key='full_state'")).rowCount, 0);
    });
  } finally {
    const cleanup = await Promise.allSettled([closeFirstPool(), closeSecondPool()]);
    cleanup.push(...await Promise.allSettled([sandbox.dispose()]));
    const errors = cleanup.filter(result => result.status === "rejected").map(result => result.reason);
    if (errors.length) throw new AggregateError(errors, "Disposable PostgreSQL test cleanup failed");
  }
});

test("PostgreSQL legacy cutover, writer fencing and ordered mirrors", { skip: !process.env.PPR_E2E_POSTGRES_URL, timeout: 60000 }, async t => {
  const sandboxes = [];
  const pools = [];
  const poolClosers = [];
  let releaseDelayed = () => {};
  try {
    for (let index = 0; index < 2; index += 1) {
      const sandbox = await createPostgresSandbox(process.env.PPR_E2E_POSTGRES_URL);
      sandboxes.push(sandbox);
      const url = new URL(sandbox.databaseUrl);
      const tracked = createPostgresTestPool({ host: url.hostname.replace(/^\[|\]$/g, ""), port: Number(url.port),
        database: url.pathname.slice(1), user: "ppr_e2e", password: () => decodeURIComponent(url.password),
        ssl: false, connectionTimeoutMillis: 5000, max: 4, options: "-c search_path=public" });
      pools.push(tracked.pool);
      poolClosers.push(tracked.close);
      await pools[index].query("CREATE TABLE ppr_settings(setting_key text PRIMARY KEY,payload jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())");
    }
    const [primary, replica] = pools;
    let delayRevision = "";
    const delayed = new Promise(resolve => { releaseDelayed = resolve; });
    let mirroredNewest;
    const newest = new Promise(resolve => { mirroredNewest = resolve; });
    const replicaNode = { name: "supabase", healthy: true, pool: {
      connect: () => replica.connect(),
      async query(sql, params) {
        if (String(params?.[1]) === delayRevision && delayRevision) await delayed;
        const result = await replica.query(sql, params);
        if (String(params?.[1]) === "3") mirroredNewest();
        return result;
      }
    } };
    const cluster = { nodes: [{ name: "primary", healthy: true, pool: primary }, replicaNode] };
    const read = async pool => (await pool.query("SELECT payload,state_revision FROM ppr_settings WHERE setting_key='full_state'")).rows[0];
    const seedLegacy = async (primaryState = { source: "older" }, mirrorState = { source: "newer", qrTokens: { permanent: "keep-me" } }, sameTime = false) => {
      await Promise.all(pools.map(pool => pool.query("TRUNCATE ppr_settings")));
      await primary.query("INSERT INTO ppr_settings(setting_key,payload,updated_at) VALUES ('full_state',$1::jsonb,'2026-01-01T00:00:00Z')", [JSON.stringify(primaryState)]);
      await replica.query("INSERT INTO ppr_settings(setting_key,payload,updated_at) VALUES ('full_state',$1::jsonb,$2)", [JSON.stringify(mirrorState), sameTime ? "2026-01-01T00:00:00Z" : "2026-01-02T00:00:00Z"]);
    };
    const mutate = async (store, value) => {
      const session = await store.begin();
      try { await session.commit({ ...session.state, value }); }
      catch (error) { await session.rollback(); throw error; }
      finally { session.release(); }
    };
    const store = createPostgresStateStore(cluster);

    await t.test("legacy mirrors are frozen before reading them, including revision zero", async () => {
      await seedLegacy();
      await store.prepareMirror(replicaNode);
      await assert.rejects(replica.query("UPDATE ppr_settings SET payload='{}' WHERE setting_key='full_state'"), /stale_full_state_writer/);
      assert.equal((await read(replica)).payload.source, "newer");
    });

    await t.test("first activation adopts the freshest legacy mirror without reseeding permanent QR", async () => {
      await store.initialize(async () => { throw new Error("Existing legacy state must not be reseeded"); });
      await store.flushMirrors();
      assert.equal((await read(primary)).payload.source, "newer");
      assert.equal((await read(primary)).payload.qrTokens.permanent, "keep-me");
      assert.equal((await read(primary)).state_revision, "1");
      assert.deepEqual(await read(primary), await read(replica));
    });

    await t.test("legacy upserts are rejected on primary and mirrors after cutover", async () => {
      for (const pool of pools) {
        const before = await read(pool);
        await assert.rejects(pool.query(`INSERT INTO ppr_settings(setting_key,payload) VALUES ('full_state','{"legacy":true}')
          ON CONFLICT(setting_key) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()`), /stale_full_state_writer/);
        assert.deepEqual(await read(pool), before);
      }
    });

    await t.test("a delayed older mirror write cannot overwrite a newer committed revision", async () => {
      delayRevision = "2";
      try {
        await mutate(store, "older-delayed");
        await mutate(store, "newest");
        await newest;
      } finally { releaseDelayed(); }
      await store.flushMirrors();
      assert.equal((await read(replica)).payload.value, "newest");
      assert.equal((await read(replica)).state_revision, "3");
      assert.equal(replicaNode.healthy, true);
      delayRevision = "";
    });

    await t.test("unavailable legacy node requires explicit named exception recorded at cutover", async () => {
      await seedLegacy();
      const unavailable = { name: "neon", healthy: false, pool: {
        async connect() { throw new Error("deliberate quota unavailable"); },
        async query() { throw new Error("deliberate quota unavailable"); }
      } };
      const degradedCluster = { nodes: [...cluster.nodes, unavailable] };
      await assert.rejects(createPostgresStateStore(degradedCluster).initialize(() => ({})), /deliberate quota unavailable/);
      assert.equal((await read(primary)).state_revision, "0");
      const accepted = createPostgresStateStore(degradedCluster, { legacySkipUnavailable: ["neon"] });
      await accepted.initialize(() => ({}));
      await accepted.flushMirrors();
      assert.equal((await read(primary)).payload.source, "newer");
      const marker = (await primary.query("SELECT payload FROM ppr_settings WHERE setting_key='durable_state_cutover'")).rows[0].payload;
      assert.deepEqual(marker.unavailableLegacyNodes, ["neon"]);
    });

    await t.test("ambiguous legacy histories fail closed instead of replacing existing work", async () => {
      await seedLegacy({ source: "primary" }, { source: "mirror" }, true);
      const before = await read(primary);
      await assert.rejects(createPostgresStateStore(cluster).initialize(() => ({})), /disagree at the same timestamp/);
      assert.deepEqual(await read(primary), before);
    });

    await t.test("a readable legacy mirror with failed fence installation blocks cutover despite a skip exception", async () => {
      await seedLegacy();
      const readableButUnfenced = { name: "supabase", healthy: true, pool: {
        query: (sql, params) => replica.query(sql, params),
        async connect() {
          const client = await replica.connect();
          return {
            async query(sql, params) {
              if (sql.startsWith("CREATE OR REPLACE FUNCTION")) throw new Error("deliberate fence DDL rejection");
              return client.query(sql, params);
            },
            release: () => client.release()
          };
        }
      } };
      const unsafe = createPostgresStateStore({ nodes: [cluster.nodes[0], readableButUnfenced] }, { legacySkipUnavailable: ["supabase"] });
      const before = await read(primary);
      await assert.rejects(unsafe.initialize(() => ({})), /could not install its writer fence/);
      assert.deepEqual(await read(primary), before);
      assert.equal((await primary.query("SELECT 1 FROM ppr_settings WHERE setting_key='durable_state_cutover'")).rowCount, 0);
    });
  } finally {
    releaseDelayed();
    const cleanup = await Promise.allSettled(poolClosers.map(close => close()));
    cleanup.push(...await Promise.allSettled(sandboxes.map(sandbox => sandbox.dispose())));
    const errors = cleanup.filter(result => result.status === "rejected").map(result => result.reason);
    if (errors.length) throw new AggregateError(errors, "Disposable PostgreSQL test cleanup failed");
  }
});
