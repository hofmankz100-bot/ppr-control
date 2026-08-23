"use strict";

function createAdminConfigPackageRoute(dependencies = {}) {
  const {
    buildAdminConfigPackage,
    readBody,
    readDb,
    sendDownload,
    sendJson,
    todayStamp,
    validateAdminConfigPackage
  } = dependencies;

  return async function handleAdminConfigPackageRoute(req, res, pathname) {
    const isExport = pathname === "/api/admin/config-package" && req.method === "GET";
    const isPreview = pathname === "/api/admin/config-package/preview" && req.method === "POST";
    if (!isExport && !isPreview) return false;

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
    const validated = validateAdminConfigPackage(body.package);
    if (validated.error) {
      sendJson(res, 400, { ok: false, error: validated.error });
    } else {
      sendJson(res, 200, { ok: true, summary: validated.summary });
    }
    return true;
  };
}

module.exports = { createAdminConfigPackageRoute };
