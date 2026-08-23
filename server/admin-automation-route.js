"use strict";

function createAdminAutomationRoute(dependencies = {}) {
  const {
    adminAutomationSnapshot,
    passwordMatches,
    readBody,
    readDb,
    runAutomaticBackupIfDue,
    sendJson,
    allowPasswordlessTestAuth = false
  } = dependencies;

  return async function handleAdminAutomationRoute(req, res, pathname) {
    if (pathname !== "/api/admin/automation/run" || req.method !== "POST") return false;

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

    const result = await runAutomaticBackupIfDue(true, req.authUser?.name || "Администратор");
    sendJson(res, 200, { ok: true, ...result, status: adminAutomationSnapshot(readDb()) });
    return true;
  };
}

module.exports = { createAdminAutomationRoute };
