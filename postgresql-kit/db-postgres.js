const { Pool } = require("pg");

const COLLECTIONS = [
  "checks", "requests", "inventory", "directorMessages", "downtimes",
  "compressorJournal", "gasJournal", "journalDueSince", "auditHistory"
];

function createPostgresStore(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_SIZE || 10)
  });

  async function upsertRecord(collection, recordId, payload) {
    const deleted = Boolean(payload?.deleted);
    await pool.query(
      `INSERT INTO ppr_records(collection, record_id, payload, updated_at, deleted)
       VALUES ($1, $2, $3::jsonb, COALESCE(($3::jsonb->>'updatedAt')::timestamptz, now()), $4)
       ON CONFLICT(collection, record_id) DO UPDATE SET
         payload = EXCLUDED.payload,
         updated_at = GREATEST(ppr_records.updated_at, EXCLUDED.updated_at),
         deleted = EXCLUDED.deleted`,
      [collection, String(recordId), JSON.stringify(payload || {}), deleted]
    );
  }

  async function applyPatch(patch = {}, meta = {}) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const collection of COLLECTIONS) {
        const value = patch[collection];
        if (!value) continue;
        const entries = Array.isArray(value)
          ? value.filter(item => item?.id).map(item => [item.id, item])
          : Object.entries(value);
        for (const [id, payload] of entries) {
          await client.query(
            `INSERT INTO ppr_records(collection, record_id, payload, updated_at, deleted)
             VALUES ($1, $2, $3::jsonb, COALESCE(($3::jsonb->>'updatedAt')::timestamptz, now()), $4)
             ON CONFLICT(collection, record_id) DO UPDATE SET
               payload = EXCLUDED.payload,
               updated_at = GREATEST(ppr_records.updated_at, EXCLUDED.updated_at),
               deleted = EXCLUDED.deleted`,
            [collection, String(id), JSON.stringify(payload || {}), Boolean(payload?.deleted)]
          );
        }
      }
      for (const [id, payload] of Object.entries(patch.catalog?.equipment || {})) {
        await client.query(
          `INSERT INTO ppr_records(collection, record_id, payload, updated_at, deleted)
           VALUES ('catalogEquipment', $1, $2::jsonb, now(), false)
           ON CONFLICT(collection, record_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
          [String(id), JSON.stringify(payload || {})]
        );
      }
      await client.query(
        `INSERT INTO ppr_operations(operation_id, client_id, user_name, user_role, operation_type, payload)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT(operation_id) DO NOTHING`,
        [
          meta.actionId || `server:${Date.now()}`,
          meta.clientId || "",
          meta.user?.name || "",
          meta.user?.role || "",
          "delta",
          JSON.stringify(patch)
        ]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function readState() {
    const result = await pool.query(
      "SELECT collection, record_id, payload FROM ppr_records WHERE deleted = false"
    );
    const state = {
      checks: {}, requests: {}, inventory: {}, catalog: { equipment: {} },
      directorMessages: [], downtimes: [], compressorJournal: {}, gasJournal: {},
      journalDueSince: {}, auditHistory: []
    };
    for (const row of result.rows) {
      if (row.collection === "catalogEquipment") {
        state.catalog.equipment[row.record_id] = row.payload;
      } else if (["directorMessages", "downtimes", "auditHistory"].includes(row.collection)) {
        state[row.collection].push(row.payload);
      } else if (state[row.collection] && !Array.isArray(state[row.collection])) {
        state[row.collection][row.record_id] = row.payload;
      }
    }
    return state;
  }

  return { pool, applyPatch, readState, upsertRecord };
}

module.exports = { createPostgresStore };
