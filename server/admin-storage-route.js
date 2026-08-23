"use strict";

function createAdminStorageRoute(dependencies = {}) {
  const {
    appendActionLog,
    basename,
    byteLength,
    createManualBackup,
    directoryStorageStats,
    getBackupDirectory,
    getPhotosDirectory,
    githubRepositoryStorage,
    publicState,
    readBody,
    readDb,
    sendJson,
    unusedPublicAssetCandidates,
    waitForStateWrites,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminStorageRoute(req, res, pathname) {
    const isStatus = pathname === "/api/admin/storage-status" && req.method === "GET";
    const isManualBackup = pathname === "/api/backup/manual" && req.method === "POST";
    if (!isStatus && !isManualBackup) return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    if (isStatus) {
      const db = readDb();
      const databaseBytes = byteLength(JSON.stringify(publicState(db)), "utf8");
      const photos = directoryStorageStats(getPhotosDirectory());
      const backups = directoryStorageStats(getBackupDirectory());
      const garbageCandidates = unusedPublicAssetCandidates();
      const github = await githubRepositoryStorage();
      sendJson(res, 200, {
        ok: true,
        checkedAt: new Date(now()).toISOString(),
        github,
        application: {
          databaseBytes,
          photosBytes: photos.bytes,
          photoFiles: photos.files,
          backupsBytes: backups.bytes,
          backupFiles: backups.files
        },
        garbage: {
          candidates: garbageCandidates,
          bytes: garbageCandidates.reduce((sum, item) => sum + item.bytes, 0),
          safeCheckOnly: true
        },
        billing: {
          githubLfs: "Для точного остатка требуется защищённый GitHub billing token",
          render: "Точный лимит тарифа смотрите в Render; приложение показывает фактически занятые данные"
        }
      }, { "Cache-Control": "no-store" });
      return true;
    }

    const body = await readBody(req).catch(() => ({}));
    await waitForStateWrites();
    const file = createManualBackup(body?.label || "manual");
    const filename = basename(file);
    appendActionLog({ action: "manual_backup", file: filename, clientId: String(body?.clientId || "") });
    sendJson(res, 200, { ok: true, file: filename });
    return true;
  };
}

module.exports = { createAdminStorageRoute };
