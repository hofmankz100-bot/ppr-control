"use strict";

async function seedEmptyPostgresReplicas(nodes, sourceIndex) {
  const source = nodes[sourceIndex];
  if (!source) return;
  const tableSpecs = [
    {
      table: "ppr_photos",
      key: "file_name",
      select: "SELECT file_name, mime_type, payload, updated_at FROM ppr_photos",
      insert: `INSERT INTO ppr_photos(file_name,mime_type,payload,updated_at) VALUES($1,$2,$3,$4)
        ON CONFLICT(file_name) DO UPDATE SET mime_type=EXCLUDED.mime_type,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at`,
      values: row => [row.file_name, row.mime_type, row.payload, row.updated_at]
    },
    {
      table: "ppr_admin_backups",
      key: "backup_id",
      select: "SELECT backup_id,label,payload,payload_gzip,checksum,created_by,created_at FROM ppr_admin_backups",
      insert: `INSERT INTO ppr_admin_backups(backup_id,label,payload,payload_gzip,checksum,created_by,created_at) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7)
        ON CONFLICT(backup_id) DO NOTHING`,
      values: row => [row.backup_id, row.label, row.payload ? JSON.stringify(row.payload) : null, row.payload_gzip || null, row.checksum, row.created_by, row.created_at]
    },
    {
      table: "ppr_admin_archives",
      key: "archive_id",
      select: "SELECT archive_id,label,payload,checksum,created_by,created_at FROM ppr_admin_archives",
      insert: `INSERT INTO ppr_admin_archives(archive_id,label,payload,checksum,created_by,created_at) VALUES($1,$2,$3::jsonb,$4,$5,$6)
        ON CONFLICT(archive_id) DO NOTHING`,
      values: row => [row.archive_id, row.label, JSON.stringify(row.payload), row.checksum, row.created_by, row.created_at]
    }
  ];
  for (const target of nodes) {
    if (target === source || !target.healthy) continue;
    for (const spec of tableSpecs) {
      try {
        const count = await target.pool.query(`SELECT count(*)::int AS count FROM ${spec.table}`);
        if (Number(count.rows[0]?.count || 0) > 0) continue;
        let cursor = "";
        while (true) {
          const rows = await source.pool.query(`${spec.select} WHERE ${spec.key} > $1 ORDER BY ${spec.key} LIMIT 1`, [cursor]);
          const row = rows.rows[0];
          if (!row) break;
          await target.pool.query(spec.insert, spec.values(row));
          cursor = row[spec.key];
        }
      } catch (error) {
        target.healthy = false;
        target.error = String(error.message || error);
        target.lastErrorAt = new Date().toISOString();
        break;
      }
    }
  }
}

module.exports = { seedEmptyPostgresReplicas };
