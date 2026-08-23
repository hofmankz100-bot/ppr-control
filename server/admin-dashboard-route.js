"use strict";

function createAdminDashboardRoute(dependencies = {}) {
  const {
    adminActivityFeed,
    adminArchiveSelection,
    adminAutomationSnapshot,
    adminDiagnosticWithin,
    adminUserOperationalSummary,
    backupRetentionDeleteIds,
    dataIntegrityReport,
    getPostgresConnected,
    getStorageMode,
    listAdminArchives,
    listAdminBackups,
    normalizedAdminConfig,
    readDb,
    sendJson,
    systemReadinessReport,
    userLoginDiagnostics,
    userPublic
  } = dependencies;

  return async function handleAdminDashboardRoute(req, res, pathname, url) {
    if (pathname !== "/api/admin/maintenance" || req.method !== "GET") return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const db = readDb();
    const requestedTab = String(url.searchParams.get("tab") || "all");
    const needsBackups = requestedTab === "all" || ["backups", "report", "guide", "storage", "automation"].includes(requestedTab);
    const needsArchives = requestedTab === "all" || ["archives", "guide", "storage"].includes(requestedTab);
    const storageMode = getStorageMode();
    const monitoringSnapshot = db.systemMonitor && typeof db.systemMonitor === "object"
      ? db.systemMonitor
      : { node: { online: true }, api: {}, postgres: { connected: getPostgresConnected(), mode: storageMode || "json" } };
    const monitoringResult = { snapshot: monitoringSnapshot, alerts: (db.adminAlerts || []).slice(0, 200) };
    const postgres = {
      connected: Boolean(monitoringSnapshot.postgres?.connected),
      mode: monitoringSnapshot.postgres?.mode || storageMode || "json",
      checkedAt: monitoringSnapshot.checkedAt || "",
      sizeBytes: Number(monitoringSnapshot.postgres?.sizeBytes || 0),
      error: monitoringSnapshot.postgres?.error || ""
    };
    const trash = (db.adminTrash || []).map(item => ({
      id: item.id,
      type: item.type,
      targetId: item.targetId,
      label: item.label,
      reason: item.reason,
      deletedAt: item.deletedAt,
      expiresAt: item.expiresAt,
      deletedByName: item.deletedByName,
      canRestore: !item.restoredAt,
      restoredAt: item.restoredAt || "",
      restoredByName: item.restoredByName || ""
    }));
    const archivePreview = adminArchiveSelection(db, 180);
    const [backups, archives] = await Promise.all([
      needsBackups ? adminDiagnosticWithin(listAdminBackups(), []) : Promise.resolve([]),
      needsArchives ? adminDiagnosticWithin(listAdminArchives(db), []) : Promise.resolve([])
    ]);
    const backupRetention = {
      dailyDays: 14,
      weeklyUntilDays: 56,
      monthlyUntilDays: 366,
      deleteCount: backupRetentionDeleteIds(backups).length
    };
    const systemReport = ["all", "report"].includes(requestedTab)
      ? systemReadinessReport(db, monitoringResult.snapshot, backups)
      : { status: "ok", summary: {}, checks: [], metrics: {}, environment: {}, policy: {} };
    const broadcasts = ["all", "broadcasts"].includes(requestedTab)
      ? (db.systemBroadcasts || []).slice().reverse().slice(0, 200).map(item => {
        const roles = Array.isArray(item.roles) ? item.roles : [];
        const recipients = (db.users || []).filter(user => user.approved !== false
          && user.pendingApproval !== true
          && user.accessDisabled !== true
          && (!roles.length || roles.includes(user.role)));
        const readIds = new Set((item.readBy || []).map(entry => String(entry.userId || "")));
        return {
          id: item.id,
          title: item.title || "Объявление",
          text: item.text || "",
          priority: item.priority || "normal",
          roles,
          active: item.active !== false,
          startsAt: item.startsAt || item.at || "",
          expiresAt: item.expiresAt || "",
          createdAt: item.createdAt || item.at || "",
          author: item.author || "",
          remindedAt: item.remindedAt || "",
          recipientCount: recipients.length,
          readCount: recipients.filter(user => readIds.has(String(user.id || ""))).length,
          recipients: recipients.map(user => ({
            id: user.id,
            name: user.name || "Без имени",
            role: user.role || "",
            employeeId: user.employeeId || "",
            readAt: (item.readBy || []).find(entry => String(entry.userId || "") === String(user.id || ""))?.at || ""
          }))
        };
      })
      : [];
    const operationalReferenceCache = new Map();
    const access = ["all", "access"].includes(requestedTab)
      ? (db.users || []).map(user => ({
        ...userPublic(user),
        loginDiagnostics: userLoginDiagnostics(db, user),
        operationalSummary: adminUserOperationalSummary(db, user, operationalReferenceCache),
        instructionEditorCount: Object.values(db.workPermitInstructions || {})
          .filter(item => (item.editorIds || []).some(key => [user.id, user.employeeId, user.phone].map(String).includes(String(key))))
          .length
      }))
      : [];
    const integrity = ["all", "integrity", "report"].includes(requestedTab)
      ? dataIntegrityReport(db)
      : { healthy: true, fixableCount: 0, issues: [] };
    const activity = ["all", "activity"].includes(requestedTab)
      ? adminActivityFeed(db, req.authUser)
      : { readAt: "", unreadCount: 0, items: [] };
    sendJson(res, 200, {
      ok: true,
      trash,
      audit: ["all", "audit"].includes(requestedTab) ? (db.adminAuditLog || []).slice(0, requestedTab === "all" ? 1000 : 250) : [],
      access,
      broadcasts,
      instructionAcknowledgements: ["all", "instructionLog"].includes(requestedTab) ? (db.workPermitInstructionAcknowledgements || []).slice(0, 2000) : [],
      notificationPolicy: {
        defaultPriority: db.adminNotificationPolicy?.defaultPriority || "normal",
        defaultExpiryHours: Math.max(1, Math.min(720, Number(db.adminNotificationPolicy?.defaultExpiryHours || 24))),
        unreadReminderHours: Math.max(1, Math.min(168, Number(db.adminNotificationPolicy?.unreadReminderHours || 8)))
      },
      activity,
      alerts: ["all", "monitoring"].includes(requestedTab) ? monitoringResult.alerts : [],
      monitoring: monitoringResult.snapshot,
      systemReport,
      automation: adminAutomationSnapshot(db),
      integrity,
      archivePreview: { days: archivePreview.days, cutoffAt: archivePreview.cutoffAt, counts: archivePreview.counts },
      archives,
      postgres,
      backups,
      backupRetention,
      config: normalizedAdminConfig(db.adminConfig),
      configHistory: ["all", "settings"].includes(requestedTab)
        ? (db.adminConfigHistory || []).slice(0, 20).map(item => ({ id: item.id, at: item.at, actorName: item.actorName, reason: item.reason }))
        : []
    });
    return true;
  };
}

module.exports = { createAdminDashboardRoute };
