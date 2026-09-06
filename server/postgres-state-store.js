"use strict";

const { isDeepStrictEqual } = require("node:util");

// full_state has one authoritative database. Cross-database mirrors are backups;
// promoting one automatically after an uncertain commit can lose acknowledged work.
function createPostgresStateStore(pool, { normalize = value => value, onMirrorError = () => {}, onExternalState = () => {}, legacySkipUnavailable = [] } = {}) {
  const primary = pool.nodes?.[0]?.pool || pool;
  const mirrorJobs = new Set();
  const fencedMirrors = new Set();
  let knownRevision = 0n;
  let knownState = null;

  function observe(state, revision, external = false) {
    if (revision <= knownRevision) return;
    knownRevision = revision;
    knownState = structuredClone(state);
    if (external) onExternalState(structuredClone(state));
  }

  async function installRevisionFence(client) {
    await client.query("LOCK TABLE ppr_settings IN SHARE ROW EXCLUSIVE MODE");
    await client.query(`CREATE OR REPLACE FUNCTION ppr_guard_full_state_revision() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.setting_key = 'full_state' AND NEW.state_revision <= OLD.state_revision THEN
          RAISE EXCEPTION 'stale_full_state_writer: use the durable state transaction protocol' USING ERRCODE = '40001';
        END IF;
        RETURN NEW;
      END; $$`);
    await client.query("DROP TRIGGER IF EXISTS ppr_guard_full_state_revision ON ppr_settings");
    await client.query("CREATE TRIGGER ppr_guard_full_state_revision BEFORE UPDATE ON ppr_settings FOR EACH ROW EXECUTE FUNCTION ppr_guard_full_state_revision()");
  }

  async function prepareMirror(node) {
    fencedMirrors.delete(node);
    const client = await node.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '8s'");
      await client.query("SET LOCAL statement_timeout = '30s'");
      await client.query("ALTER TABLE ppr_settings ADD COLUMN IF NOT EXISTS state_revision bigint NOT NULL DEFAULT 0");
      await installRevisionFence(client);
      await client.query("COMMIT");
      fencedMirrors.add(node);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally { client.release(); }
  }

  async function lockedClient(installFence = false) {
    const client = await primary.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '8s'");
      await client.query("SET LOCAL statement_timeout = '30s'");
      await client.query("SET LOCAL synchronous_commit = on");
      await client.query("SELECT pg_advisory_xact_lock(134744123, 1)");
      if (installFence) {
        // Acquire the table lock before a row lock: legacy UPDATEs must finish
        // before activation, rather than deadlocking during a lock upgrade.
        await installRevisionFence(client);
      }
      return client;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      client.release();
      throw error;
    }
  }

  function mirror(state, revision, updatedAt) {
    for (const node of (pool.nodes || []).slice(1)) {
      if (!node.healthy) continue;
      const job = Promise.resolve().then(() => node.pool.query(
        `INSERT INTO ppr_settings(setting_key,payload,state_revision,updated_at)
         VALUES ('full_state',$1::jsonb,$2::bigint,$3)
         ON CONFLICT(setting_key) DO UPDATE SET payload=EXCLUDED.payload,
           state_revision=EXCLUDED.state_revision,updated_at=EXCLUDED.updated_at
         WHERE ppr_settings.state_revision < EXCLUDED.state_revision`,
        [JSON.stringify(state), revision, updatedAt]
      )).catch(error => { node.healthy = false; onMirrorError(error, node.name); })
        .finally(() => mirrorJobs.delete(job));
      mirrorJobs.add(job);
    }
  }

  async function open(initialState, adoptLegacy = false) {
    const client = await lockedClient(adoptLegacy);
    let finished = false;
    try {
      let result = await client.query("SELECT payload,state_revision,updated_at FROM ppr_settings WHERE setting_key='full_state' FOR UPDATE");
      if (adoptLegacy && !result.rows.length) {
        const cutover = await client.query("SELECT 1 FROM ppr_settings WHERE setting_key='durable_state_cutover'");
        if (cutover.rows.length) throw new Error("Authoritative PostgreSQL full_state is missing after cutover; explicit recovery is required");
      }
      let legacyState;
      const unavailableLegacyNodes = [];
      if (adoptLegacy && Number(result.rows[0]?.state_revision || 0) === 0) {
        let freshest = result.rows[0];
        for (const node of (pool.nodes || []).slice(1)) {
          // An unavailable legacy copy may contain the latest acknowledged write.
          // Do not silently choose a stale primary during the first cutover.
          let candidate;
          try { candidate = await node.pool.query("SELECT payload,state_revision,updated_at FROM ppr_settings WHERE setting_key='full_state'"); }
          catch (error) {
            if (!legacySkipUnavailable.includes(node.name)) throw error;
            unavailableLegacyNodes.push(node.name);
            continue;
          }
          if (!fencedMirrors.has(node)) throw new Error(`Readable legacy mirror ${node.name} could not install its writer fence; cutover is unsafe`);
          const row = candidate.rows[0];
          if (!row) continue;
          if (Number(row.state_revision) > 0) throw new Error("A mirror already has a different authoritative history; explicit recovery is required");
          const at = new Date(row.updated_at).getTime();
          const previousAt = freshest ? new Date(freshest.updated_at).getTime() : -Infinity;
          if (!Number.isFinite(at) || (freshest && !Number.isFinite(previousAt))) throw new Error("Legacy state has an invalid timestamp; explicit recovery is required");
          if (at === previousAt && !isDeepStrictEqual(row.payload, freshest.payload)) throw new Error("Legacy PostgreSQL snapshots disagree at the same timestamp; explicit recovery is required");
          if (!freshest || at > previousAt) freshest = row;
        }
        legacyState = freshest?.payload;
        await client.query(
          `INSERT INTO ppr_settings(setting_key,payload) VALUES ('durable_state_cutover',$1::jsonb)
           ON CONFLICT(setting_key) DO NOTHING`,
          [JSON.stringify({ at: new Date().toISOString(), unavailableLegacyNodes, selectedUpdatedAt: freshest?.updated_at || null })]
        );
      }
      if (!result.rows.length && initialState) {
        const seed = legacyState || await initialState();
        result = await client.query(
          "INSERT INTO ppr_settings(setting_key,payload,state_revision) VALUES ('full_state',$1::jsonb,0) RETURNING payload,state_revision",
          [JSON.stringify(seed)]
        );
      }
      if (!result.rows.length) throw new Error("Authoritative PostgreSQL full_state is missing; explicit recovery is required");
      const state = normalize(legacyState || result.rows[0].payload);
      const originalRevision = BigInt(result.rows[0].state_revision);
      if (!adoptLegacy) observe(state, originalRevision, true);
      return {
        state,
        async commit(nextState) {
          try {
            let saved;
            if (nextState) {
              saved = await client.query(
                `UPDATE ppr_settings SET payload=$1::jsonb,state_revision=state_revision+1,updated_at=clock_timestamp()
                 WHERE setting_key='full_state' RETURNING state_revision,updated_at`,
                [JSON.stringify(nextState)]
              );
              if (saved.rowCount !== 1) throw new Error("Authoritative PostgreSQL full_state disappeared");
            }
            await client.query("COMMIT");
            finished = true;
            const revision = saved ? BigInt(saved.rows[0].state_revision) : originalRevision;
            observe(nextState || state, revision);
            if (saved) mirror(nextState, saved.rows[0].state_revision, saved.rows[0].updated_at);
            return { superseded: revision < knownRevision, latestState: revision < knownRevision ? structuredClone(knownState) : null };
          } catch (error) {
            error.statusCode = 503;
            throw error;
          }
        },
        async rollback() {
          if (!finished) { await client.query("ROLLBACK"); finished = true; }
        },
        release() { client.release(); }
      };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      client.release();
      throw error;
    }
  }

  return {
    begin: () => open(),
    prepareMirror,
    async snapshot() {
      try {
        const result = await primary.query("SELECT payload,state_revision FROM ppr_settings WHERE setting_key='full_state'");
        if (!result.rows[0]) throw new Error("Authoritative PostgreSQL full_state is missing");
        const state = normalize(result.rows[0].payload);
        const revision = BigInt(result.rows[0].state_revision);
        observe(state, revision, true);
        return state;
      } catch (error) { error.statusCode = 503; throw error; }
    },
    async refresh() {
      const result = await primary.query("SELECT state_revision FROM ppr_settings WHERE setting_key='full_state'");
      if (!result.rows[0]) throw new Error("Authoritative PostgreSQL full_state is missing");
      if (BigInt(result.rows[0].state_revision) > knownRevision) await this.snapshot();
    },
    async initialize(seed, migrate = value => value) {
      await primary.query("ALTER TABLE ppr_settings ADD COLUMN IF NOT EXISTS state_revision bigint NOT NULL DEFAULT 0");
      await Promise.allSettled((pool.nodes || []).slice(1).map(async node => {
        try {
          await prepareMirror(node);
        } catch (error) {
          node.healthy = false;
          onMirrorError(error, node.name);
        }
      }));
      const session = await open(seed, true);
      try {
        const state = migrate(session.state);
        await session.commit(state);
        return state;
      } catch (error) {
        await session.rollback();
        throw error;
      } finally { session.release(); }
    },
    async flushMirrors() { await Promise.allSettled([...mirrorJobs]); }
  };
}

module.exports = { createPostgresStateStore };
