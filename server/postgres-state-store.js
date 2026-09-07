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

  function primaryStatus(error) {
    if (typeof pool.markSuccess !== "function" || typeof pool.markFailure !== "function") return;
    if (error) pool.markFailure(0, error);
    else pool.markSuccess(0);
    pool.onStatus?.(pool.status());
  }

  async function primaryQuery(sql, params) {
    try {
      const result = await primary.query(sql, params);
      primaryStatus();
      return result;
    } catch (error) { primaryStatus(error); throw error; }
  }

  function checkout(queryable) {
    return new Promise((resolve, reject) => queryable.connect((error, client) => {
      if (error) {
        if (queryable === primary) primaryStatus(error);
        reject(error);
        return;
      }
      let connectionError;
      let releaseError;
      let released = false;
      const onError = error => {
        connectionError ||= error;
        if (queryable === primary) primaryStatus(error);
      };
      // pg-pool removes its idle error listener while a client is checked out.
      // Attach inside the connect callback, before even a Promise continuation:
      // a socket can fail immediately after pg-pool hands out the client.
      client.on("error", onError);
      resolve({
        async query(sql, params) {
          if (connectionError) throw connectionError;
          try {
            const result = await client.query(sql, params);
            // An error event can race a response, including the COMMIT response.
            if (connectionError) throw connectionError;
            if (queryable === primary) primaryStatus();
            return result;
          } catch (error) {
            if (queryable === primary) primaryStatus(connectionError || error);
            throw connectionError || error;
          }
        },
        async rollback() {
          if (connectionError) return;
          try { await client.query("ROLLBACK"); }
          catch (error) { releaseError = error; throw error; }
        },
        release() {
          if (released) return;
          released = true;
          try { client.release(connectionError || releaseError); }
          finally { client.removeListener("error", onError); }
        }
      });
    }));
  }

  function observe(state, revision, external = false) {
    if (knownState && revision <= knownRevision) return;
    knownRevision = revision;
    // State transaction snapshots are immutable after commit. Reusing that
    // canonical object avoids retaining a second full copy of the database.
    knownState = state;
    if (external) onExternalState(knownState);
  }

  async function loadSnapshot(shared = false) {
    try {
      // Validate freshness on the authoritative database for every read. Most
      // requests can avoid transferring the large JSONB value when it has not
      // changed; failures must never authorize a request from a stale cache.
      const current = await primaryQuery("SELECT state_revision FROM ppr_settings WHERE setting_key='full_state'");
      if (!current.rows[0]) throw new Error("Authoritative PostgreSQL full_state is missing");
      if (knownState && BigInt(current.rows[0].state_revision) === knownRevision) {
        return shared ? knownState : structuredClone(knownState);
      }
      const result = await primaryQuery("SELECT payload,state_revision FROM ppr_settings WHERE setting_key='full_state'");
      if (!result.rows[0]) throw new Error("Authoritative PostgreSQL full_state is missing");
      const state = normalize(result.rows[0].payload);
      const revision = BigInt(result.rows[0].state_revision);
      observe(state, revision, true);
      return shared ? knownState : structuredClone(knownState);
    } catch (error) { error.statusCode = 503; throw error; }
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
    const client = await checkout(node.pool);
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '8s'");
      await client.query("SET LOCAL statement_timeout = '30s'");
      await client.query("ALTER TABLE ppr_settings ADD COLUMN IF NOT EXISTS state_revision bigint NOT NULL DEFAULT 0");
      await installRevisionFence(client);
      await client.query("COMMIT");
      fencedMirrors.add(node);
    } catch (error) {
      try { await client.rollback(); } catch {}
      throw error;
    } finally { client.release(); }
  }

  async function lockedClient(installFence = false) {
    const client = await checkout(primary);
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
      try { await client.rollback(); } catch {}
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
          if (!finished) { await client.rollback(); finished = true; }
        },
        release() { client.release(); }
      };
    } catch (error) {
      try { await client.rollback(); } catch {}
      client.release();
      throw error;
    }
  }

  return {
    begin: () => open(),
    prepareMirror,
    async authSnapshot() {
      try {
        // Photo reads need fresh session/user authorization, not the work history.
        // Keep this on the authoritative node and do not advance the full-state
        // revision/cache: this projection cannot replace a complete snapshot.
        const result = await primaryQuery("SELECT payload->'users' AS users,payload->'authSessions' AS auth_sessions FROM ppr_settings WHERE setting_key='full_state'");
        if (!result.rows[0]) throw new Error("Authoritative PostgreSQL full_state is missing");
        return {
          users: Array.isArray(result.rows[0].users) ? result.rows[0].users : [],
          authSessions: Array.isArray(result.rows[0].auth_sessions) ? result.rows[0].auth_sessions : []
        };
      } catch (error) { error.statusCode = 503; throw error; }
    },
    snapshot: () => loadSnapshot(false),
    // Server request views clone this object exactly once before exposing it to
    // handlers. Callers that need mutation isolation should use snapshot().
    sharedSnapshot: () => loadSnapshot(true),
    async refresh() {
      const result = await primaryQuery("SELECT state_revision FROM ppr_settings WHERE setting_key='full_state'");
      if (!result.rows[0]) throw new Error("Authoritative PostgreSQL full_state is missing");
      if (BigInt(result.rows[0].state_revision) > knownRevision) await loadSnapshot(true);
    },
    async initialize(seed, migrate = value => value) {
      await primaryQuery("ALTER TABLE ppr_settings ADD COLUMN IF NOT EXISTS state_revision bigint NOT NULL DEFAULT 0");
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
        try { await session.rollback(); } catch {}
        throw error;
      } finally { session.release(); }
    },
    async flushMirrors() { await Promise.allSettled([...mirrorJobs]); }
  };
}

module.exports = { createPostgresStateStore };
