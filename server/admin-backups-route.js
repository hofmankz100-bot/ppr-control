"use strict";

function createAdminBackupsRoute(dependencies = {}) {
  const {
    applyAdminBackupRetention,
    backupRetentionDeleteIds,
    createAdminBackup,
    enqueueStateWrite,
    listAdminBackups,
    normalizeDb,
    passwordMatches,
    readAdminBackupPayload,
    readBody,
    readDb,
    sendDownload,
    sendJson,
    writeDb,
    allowPasswordlessTestAuth = false,
    now = () => Date.now()
  } = dependencies;

  function passwordIsValid(body, user) {
    return (allowPasswordlessTestAuth && !user?.passwordHash)
      || passwordMatches(String(body.password || ""), String(user?.passwordHash || ""));
  }

  return async function handleAdminBackupsRoute(req, res, pathname) {
    const isRetention = pathname === "/api/admin/backups/retention" && req.method === "POST";
    const isList = pathname === "/api/admin/backups" && req.method === "GET";
    const isCreate = pathname === "/api/admin/backups" && req.method === "POST";
    const isRestore = pathname === "/api/admin/backups/restore" && req.method === "POST";
    const downloadMatch = req.method === "GET" ? pathname.match(/^\/api\/admin\/backups\/([A-Za-z0-9._-]+)$/) : null;
    if (!isRetention && !isList && !isCreate && !isRestore && !downloadMatch) return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    if (isList) {
      sendJson(res, 200, { ok: true, backups: await listAdminBackups() });
      return true;
    }

    if (downloadMatch) {
      const id = downloadMatch[1];
      const backup = await readAdminBackupPayload(id);
      if (!backup) {
        sendJson(res, 404, { ok: false, error: "backup_not_found" });
        return true;
      }
      if (!backup.valid) {
        sendJson(res, 409, { ok: false, error: "backup_checksum_invalid" });
        return true;
      }
      sendDownload(res, `ppr_backup_${id}.json`, {
        exportedAt: new Date(now()).toISOString(),
        backupId: id,
        checksum: backup.checksum,
        payload: backup.payload
      });
      return true;
    }

    const body = await readBody(req).catch(() => ({}));

    if (isCreate) {
      const actionId = String(req.headers?.["x-idempotency-key"] || body.actionId || "").trim().slice(0, 160);
      const beforeDb = readDb();
      const previous = actionId && (beforeDb.adminActionReceipts || [])
        .find(item => item.actionId === actionId && item.action === "admin_backup_created");
      if (previous) {
        sendJson(res, 200, { ok: true, duplicate: true, backup: previous.result });
        return true;
      }
      const backup = await createAdminBackup(body.label || "Ручная копия", req.authUser?.name || "Администратор");
      const db = readDb();
      if (actionId) {
        db.adminActionReceipts ||= [];
        db.adminActionReceipts.unshift({
          actionId,
          action: "admin_backup_created",
          at: new Date(now()).toISOString(),
          result: backup
        });
        db.adminActionReceipts = db.adminActionReceipts.slice(0, 1000);
      }
      writeDb(db, {
        action: "admin_backup_created",
        user: req.authUser,
        targetId: backup.id,
        targetLabel: backup.label,
        reason: String(body.reason || "Ручная резервная копия")
      });
      sendJson(res, 200, { ok: true, backup });
      return true;
    }

    if (!passwordIsValid(body, req.authUser)) {
      sendJson(res, 401, { ok: false, error: "admin_password_invalid" });
      return true;
    }

    if (isRetention) {
      const reason = String(body.reason || "").trim().slice(0, 500);
      if (!reason) {
        sendJson(res, 400, { ok: false, error: "reason_required" });
        return true;
      }
      if (String(body.confirm || "").trim().toUpperCase() !== "ПРИМЕНИТЬ") {
        sendJson(res, 400, { ok: false, error: "confirmation_required" });
        return true;
      }
      const plannedDeleteCount = backupRetentionDeleteIds(await listAdminBackups()).length;
      const backup = await createAdminBackup("Перед применением политики хранения", req.authUser?.name || "Администратор");
      const deletedAfterBackup = await applyAdminBackupRetention();
      const deleted = Math.max(plannedDeleteCount, deletedAfterBackup);
      await enqueueStateWrite(async () => {
        const db = readDb();
        writeDb(db, { action: "admin_backup_retention_applied", user: req.authUser, reason, deleted, targetId: backup.id });
      });
      sendJson(res, 200, { ok: true, deleted, safetyBackup: backup });
      return true;
    }

    if (String(body.confirm || "").trim().toUpperCase() !== "ВОССТАНОВИТЬ БАЗУ") {
      sendJson(res, 400, { ok: false, error: "restore_confirmation_required" });
      return true;
    }
    const id = String(body.backupId || "");
    const backup = await readAdminBackupPayload(id);
    if (!backup) {
      sendJson(res, 404, { ok: false, error: "backup_not_found" });
      return true;
    }
    if (!backup.valid || !backup.payload || typeof backup.payload !== "object") {
      sendJson(res, 409, { ok: false, error: "backup_checksum_invalid" });
      return true;
    }
    await createAdminBackup("Перед восстановлением", req.authUser?.name || "Администратор");
    await enqueueStateWrite(async () => {
      const current = readDb();
      const restored = normalizeDb(structuredClone(backup.payload));
      restored.authSessions = current.authSessions || [];
      writeDb(restored, {
        action: "admin_backup_restored",
        user: req.authUser,
        targetId: id,
        reason: String(body.reason || "Восстановление резервной копии")
      });
    });
    sendJson(res, 200, { ok: true, restored: true, backupId: id });
    return true;
  };
}

module.exports = { createAdminBackupsRoute };
