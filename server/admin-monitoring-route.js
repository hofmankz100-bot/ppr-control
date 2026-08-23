"use strict";

function createAdminMonitoringRoute(dependencies = {}) {
  const {
    enqueueStateWrite,
    readBody,
    readDb,
    sendJson,
    writeDb,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminMonitoringRoute(req, res, pathname) {
    if (pathname !== "/api/admin/monitoring" || req.method !== "POST") return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    if (String(body.action || "") !== "resolve") {
      sendJson(res, 400, { ok: false, error: "monitoring_action_invalid" });
      return true;
    }
    const alertId = String(body.alertId || "");
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const alert = (db.adminAlerts || []).find(item => item.id === alertId);
      if (!alert) return { error: "alert_not_found" };
      alert.status = "resolved";
      alert.resolvedAt = new Date(now()).toISOString();
      alert.resolvedByName = String(req.authUser?.name || "Администратор");
      writeDb(db, {
        action: "system_alert_resolved",
        user: req.authUser,
        targetId: alert.id,
        targetLabel: alert.title,
        reason: String(body.reason || "Проверено администратором")
      });
      return { resolved: true };
    });
    if (result.error) sendJson(res, 404, { ok: false, error: result.error });
    else sendJson(res, 200, { ok: true, resolved: true });
    return true;
  };
}

module.exports = { createAdminMonitoringRoute };
