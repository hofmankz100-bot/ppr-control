"use strict";

function createAdminSystemReportRoute(dependencies = {}) {
  const {
    listAdminBackups,
    readDb,
    refreshSystemMonitoring,
    sendDownload,
    sendJson,
    systemReadinessReport,
    todayStamp
  } = dependencies;

  return async function handleAdminSystemReportRoute(req, res, pathname, url) {
    if (pathname !== "/api/admin/system-report" || req.method !== "GET") return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const monitoringResult = await refreshSystemMonitoring();
    const report = systemReadinessReport(readDb(), monitoringResult.snapshot, await listAdminBackups());
    if (url.searchParams.get("download") === "1") {
      sendDownload(res, `ppr_system_report_${todayStamp()}.json`, report);
    } else {
      sendJson(res, 200, { ok: true, report });
    }
    return true;
  };
}

module.exports = { createAdminSystemReportRoute };
