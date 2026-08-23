"use strict";

function createAdminArchivesRoute(dependencies = {}) {
  const {
    adminArchiveSelection,
    backupChecksum,
    createAdminArchive,
    createAdminBackup,
    enqueueStateWrite,
    passwordMatches,
    readBody,
    readAdminArchive,
    readDb,
    sendJson,
    shouldStoreArchiveInState,
    writeDb,
    allowPasswordlessTestAuth = false
  } = dependencies;

  return async function handleAdminArchivesRoute(req, res, pathname, url) {
    const isPreview = pathname === "/api/admin/archives/preview" && req.method === "GET";
    const isCreate = pathname === "/api/admin/archives" && req.method === "POST";
    const isRestore = pathname === "/api/admin/archives/restore" && req.method === "POST";
    if (!isPreview && !isCreate && !isRestore) return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    if (isPreview) {
      const preview = adminArchiveSelection(readDb(), url.searchParams.get("days"));
      sendJson(res, 200, {
        ok: true,
        preview: {
          days: preview.days,
          cutoffAt: preview.cutoffAt,
          counts: preview.counts
        }
      });
      return true;
    }

    const body = await readBody(req).catch(() => ({}));
    if (!(allowPasswordlessTestAuth && !req.authUser?.passwordHash)
      && !passwordMatches(String(body.password || ""), String(req.authUser?.passwordHash || ""))) {
      sendJson(res, 401, { ok: false, error: "admin_password_invalid" });
      return true;
    }
    const expectedConfirmation = isRestore ? "ВОССТАНОВИТЬ АРХИВ" : "ПЕРЕНЕСТИ В АРХИВ";
    if (String(body.confirm || "").trim().toUpperCase() !== expectedConfirmation) {
      sendJson(res, 400, {
        ok: false,
        error: isRestore ? "archive_restore_confirmation_required" : "archive_confirmation_required"
      });
      return true;
    }
    const reason = String(body.reason || "").trim().slice(0, 500);
    if (!reason) {
      sendJson(res, 400, { ok: false, error: "reason_required" });
      return true;
    }

    if (isRestore) {
      const archiveId = String(body.archiveId || "");
      const archive = await readAdminArchive(archiveId);
      if (!archive) {
        sendJson(res, 404, { ok: false, error: "archive_not_found" });
        return true;
      }
      if (backupChecksum(archive.payload) !== archive.checksum) {
        sendJson(res, 409, { ok: false, error: "archive_checksum_invalid" });
        return true;
      }

      await createAdminBackup("Перед восстановлением архива", req.authUser?.name || "Администратор");
      const restoredCount = await enqueueStateWrite(async () => {
        const db = readDb();
        const records = archive.payload?.records || {};
        const merge = (current, incoming) => {
          const ids = new Set((current || []).map(item => item.id));
          const additions = (incoming || []).filter(item => item?.id && !ids.has(item.id));
          return { items: [...additions, ...(current || [])], added: additions.length };
        };
        let total = 0;
        let merged = merge(db.adminAuditLog, records.audit);
        db.adminAuditLog = merged.items;
        total += merged.added;
        merged = merge(db.adminAlerts, records.resolved_alerts);
        db.adminAlerts = merged.items;
        total += merged.added;
        merged = merge(db.adminTrash, records.restored_trash);
        db.adminTrash = merged.items;
        total += merged.added;
        merged = merge(db.adminConfigHistory, records.config_history);
        db.adminConfigHistory = merged.items;
        total += merged.added;
        writeDb(db, {
          action: "admin_archive_restored",
          user: req.authUser,
          targetId: archiveId,
          reason,
          details: `${total} записей`
        });
        return total;
      });
      sendJson(res, 200, { ok: true, restoredCount, archiveId });
      return true;
    }

    const allowed = new Set(["audit", "resolved_alerts", "restored_trash", "config_history"]);
    const categories = [...new Set((Array.isArray(body.categories) ? body.categories : [])
      .map(String)
      .filter(value => allowed.has(value)))];
    if (!categories.length) {
      sendJson(res, 400, { ok: false, error: "archive_categories_required" });
      return true;
    }

    const source = adminArchiveSelection(readDb(), body.days);
    const records = Object.fromEntries(categories.map(key => [key, source.records[key] || []]));
    const total = Object.values(records).reduce((sum, items) => sum + items.length, 0);
    if (!total) {
      sendJson(res, 400, { ok: false, error: "archive_empty" });
      return true;
    }

    await createAdminBackup("Перед переносом в архив", req.authUser?.name || "Администратор");
    const payload = { version: 1, cutoffAt: source.cutoffAt, days: source.days, categories, reason, records };
    const archive = await createAdminArchive(
      payload,
      `Архив до ${source.cutoffAt.slice(0, 10)}`,
      req.authUser?.name
    );
    await enqueueStateWrite(async () => {
      const db = readDb();
      const ids = key => new Set((records[key] || []).map(item => item.id));
      if (categories.includes("audit")) {
        db.adminAuditLog = (db.adminAuditLog || []).filter(item => !ids("audit").has(item.id));
      }
      if (categories.includes("resolved_alerts")) {
        db.adminAlerts = (db.adminAlerts || []).filter(item => !ids("resolved_alerts").has(item.id));
      }
      if (categories.includes("restored_trash")) {
        db.adminTrash = (db.adminTrash || []).filter(item => !ids("restored_trash").has(item.id));
      }
      if (categories.includes("config_history")) {
        db.adminConfigHistory = (db.adminConfigHistory || []).filter(item => !ids("config_history").has(item.id));
      }
      if (shouldStoreArchiveInState()) db.adminArchives.unshift(archive);
      writeDb(db, {
        action: "admin_archive_created",
        user: req.authUser,
        targetId: archive.id,
        targetLabel: archive.label,
        reason,
        details: `${total} записей`
      });
    });
    sendJson(res, 200, { ok: true, archive: { ...archive, payload: undefined }, archivedCount: total });
    return true;
  };
}

module.exports = { createAdminArchivesRoute };
