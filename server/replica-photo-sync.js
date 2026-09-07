"use strict";

function timestamp(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : -Infinity;
}

async function syncPostgresPhotos(sourcePool, targetPool, { batchSize = 100 } = {}) {
  let cursor = "";
  let copied = 0;
  while (true) {
    // Compare only lightweight metadata first. Reading every binary payload when
    // a replica reconnects causes large native-memory spikes on the 512 MiB web
    // service even when all photos are already current.
    const metadata = await sourcePool.query(
      "SELECT file_name,updated_at FROM ppr_photos WHERE file_name > $1 ORDER BY file_name LIMIT $2",
      [cursor, batchSize]
    );
    if (!metadata.rows.length) break;
    const names = metadata.rows.map(row => row.file_name);
    const targetMetadata = await targetPool.query(
      "SELECT file_name,updated_at FROM ppr_photos WHERE file_name = ANY($1::text[])",
      [names]
    );
    const targetByName = new Map(targetMetadata.rows.map(row => [row.file_name, row]));
    for (const sourceRow of metadata.rows) {
      const targetRow = targetByName.get(sourceRow.file_name);
      if (targetRow && timestamp(targetRow.updated_at) >= timestamp(sourceRow.updated_at)) continue;
      const photo = await sourcePool.query(
        "SELECT file_name,mime_type,payload,updated_at FROM ppr_photos WHERE file_name=$1 LIMIT 1",
        [sourceRow.file_name]
      );
      const row = photo.rows[0];
      if (!row) continue;
      const result = await targetPool.query(
        `INSERT INTO ppr_photos(file_name,mime_type,payload,updated_at) VALUES($1,$2,$3,$4)
         ON CONFLICT(file_name) DO UPDATE SET mime_type=EXCLUDED.mime_type,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at
         WHERE ppr_photos.updated_at < EXCLUDED.updated_at`,
        [row.file_name, row.mime_type, row.payload, row.updated_at]
      );
      copied += Number(result.rowCount || 0);
    }
    cursor = metadata.rows.at(-1).file_name;
  }
  return copied;
}

module.exports = { syncPostgresPhotos };
