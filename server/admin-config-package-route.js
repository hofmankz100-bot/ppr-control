"use strict";

function createAdminConfigPackageRoute(dependencies = {}) {
  const {
    buildAdminConfigPackage,
    createAdminBackup,
    enqueueStateWrite,
    normalizedAdminConfig,
    passwordMatches,
    randomHex,
    readBody,
    readDb,
    sendDownload,
    sendJson,
    todayStamp,
    validateAdminConfigPackage,
    writeDb,
    allowPasswordlessTestAuth = false,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminConfigPackageRoute(req, res, pathname) {
    const isExport = pathname === "/api/admin/config-package" && req.method === "GET";
    const isPreview = pathname === "/api/admin/config-package/preview" && req.method === "POST";
    const isImport = pathname === "/api/admin/config-package/import" && req.method === "POST";
    if (!isExport && !isPreview && !isImport) return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    if (isExport) {
      const configPackage = buildAdminConfigPackage(readDb());
      sendDownload(res, `ppr_admin_config_${todayStamp()}.json`, configPackage);
      return true;
    }

    const body = await readBody(req).catch(() => ({}));
    if (isImport && !(allowPasswordlessTestAuth && !req.authUser?.passwordHash)
      && !passwordMatches(String(body.password || ""), String(req.authUser?.passwordHash || ""))) {
      sendJson(res, 401, { ok: false, error: "admin_password_invalid" });
      return true;
    }
    if (isImport && String(body.confirm || "").trim().toUpperCase() !== "ИМПОРТИРОВАТЬ НАСТРОЙКИ") {
      sendJson(res, 400, { ok: false, error: "config_import_confirmation_required" });
      return true;
    }
    const reason = String(body.reason || "").trim().slice(0, 500);
    if (isImport && !reason) {
      sendJson(res, 400, { ok: false, error: "reason_required" });
      return true;
    }

    const validated = validateAdminConfigPackage(body.package);
    if (validated.error) {
      sendJson(res, 400, { ok: false, error: validated.error });
      return true;
    }
    if (isPreview) {
      sendJson(res, 200, { ok: true, summary: validated.summary });
      return true;
    }

    await createAdminBackup("Перед импортом административных настроек", req.authUser?.name || "Администратор");
    await enqueueStateWrite(async () => {
      const db = readDb();
      const timestamp = now();
      const updatedAt = new Date(timestamp).toISOString();
      db.adminConfigHistory ||= [];
      db.adminConfigHistory.unshift({
        id: `config-${timestamp}-${randomHex(3)}`,
        at: updatedAt,
        actorId: String(req.authUser?.id || ""),
        actorName: String(req.authUser?.name || "Администратор"),
        reason: "Автокопия перед импортом пакета",
        snapshot: normalizedAdminConfig(db.adminConfig)
      });
      db.adminConfigHistory = db.adminConfigHistory.slice(0, 100);
      db.adminConfig = validated.config;
      db.workPermitInstructions ||= {};
      for (const [id, instruction] of Object.entries(validated.instructions)) {
        const existing = db.workPermitInstructions[id] || {};
        db.workPermitInstructions[id] = {
          ...existing,
          ...instruction,
          editorIds: Array.isArray(existing.editorIds) ? existing.editorIds : [],
          updatedAt,
          updatedBy: String(req.authUser?.name || "Администратор")
        };
      }
      writeDb(db, {
        action: "admin_config_package_imported",
        user: req.authUser,
        reason,
        details: `${validated.summary.instructions} инструкций`
      });
    });
    sendJson(res, 200, { ok: true, summary: validated.summary });
    return true;
  };
}

module.exports = { createAdminConfigPackageRoute };
