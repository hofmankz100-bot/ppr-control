"use strict";

function createAdminSettingsRoute(dependencies = {}) {
  const {
    enqueueStateWrite,
    normalizedAdminConfig,
    passwordMatches,
    randomBytes,
    readBody,
    readDb,
    sendJson,
    writeDb,
    allowPasswordlessTestAuth = false,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminSettingsRoute(req, res, pathname) {
    const isSave = pathname === "/api/admin/settings" && req.method === "PUT";
    const isRollback = pathname === "/api/admin/settings/rollback" && req.method === "POST";
    if (!isSave && !isRollback) return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    const body = await readBody(req).catch(() => ({}));
    if (!(allowPasswordlessTestAuth && !req.authUser?.passwordHash)
      && !passwordMatches(String(body.password || ""), String(req.authUser?.passwordHash || ""))) {
      sendJson(res, 401, { ok: false, error: "admin_password_invalid" });
      return true;
    }
    const reason = String(body.reason || "").trim().slice(0, 500);
    if (!reason) {
      sendJson(res, 400, { ok: false, error: "reason_required" });
      return true;
    }

    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const timestamp = now();
      const at = new Date(timestamp).toISOString();
      const historyEntry = snapshot => ({
        id: `config-${timestamp}-${randomBytes(3).toString("hex")}`,
        at,
        actorId: String(req.authUser?.id || ""),
        actorName: String(req.authUser?.name || "Администратор"),
        reason: isRollback ? "Автокопия перед откатом" : reason,
        snapshot
      });

      db.adminConfigHistory ||= [];
      if (isSave) {
        const before = normalizedAdminConfig(db.adminConfig);
        const after = normalizedAdminConfig(body.config || {});
        db.adminConfigHistory.unshift(historyEntry(before));
        db.adminConfigHistory = db.adminConfigHistory.slice(0, 100);
        db.adminConfig = after;
        writeDb(db, { action: "admin_settings_saved", user: req.authUser, reason });
        return { config: after };
      }

      const versionId = String(body.versionId || "");
      const version = db.adminConfigHistory.find(item => item.id === versionId);
      if (!version) return { error: "config_version_not_found" };
      db.adminConfigHistory.unshift(historyEntry(normalizedAdminConfig(db.adminConfig)));
      db.adminConfigHistory = db.adminConfigHistory.slice(0, 100);
      db.adminConfig = normalizedAdminConfig(version.snapshot);
      writeDb(db, { action: "admin_settings_rollback", user: req.authUser, targetId: versionId, reason });
      return { config: db.adminConfig };
    });

    if (result.error) sendJson(res, 404, { ok: false, error: result.error });
    else sendJson(res, 200, { ok: true, config: result.config });
    return true;
  };
}

module.exports = { createAdminSettingsRoute };
