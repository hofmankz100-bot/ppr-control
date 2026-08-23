"use strict";

const ALLOWED_INTEGRITY_FIXES = new Set([
  "expired_sessions",
  "dangling_sessions",
  "invalid_instruction_editors",
  "stale_alerts"
]);

function createAdminIntegrityRoute(dependencies = {}) {
  const {
    createAdminBackup,
    dataIntegrityReport,
    enqueueStateWrite,
    passwordMatches,
    readBody,
    readDb,
    sendJson,
    writeDb,
    allowPasswordlessTestAuth = false,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminIntegrityRoute(req, res, pathname) {
    const isReport = pathname === "/api/admin/integrity" && req.method === "GET";
    const isFix = pathname === "/api/admin/integrity/fix" && req.method === "POST";
    if (!isReport && !isFix) return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    if (isReport) {
      sendJson(res, 200, { ok: true, integrity: dataIntegrityReport(readDb()) });
      return true;
    }

    const body = await readBody(req).catch(() => ({}));
    if (!(allowPasswordlessTestAuth && !req.authUser?.passwordHash)
      && !passwordMatches(String(body.password || ""), String(req.authUser?.passwordHash || ""))) {
      sendJson(res, 401, { ok: false, error: "admin_password_invalid" });
      return true;
    }
    if (String(body.confirm || "").trim().toUpperCase() !== "ИСПРАВИТЬ ДАННЫЕ") {
      sendJson(res, 400, { ok: false, error: "integrity_confirmation_required" });
      return true;
    }
    const reason = String(body.reason || "").trim().slice(0, 500);
    if (!reason) {
      sendJson(res, 400, { ok: false, error: "reason_required" });
      return true;
    }
    const fixes = [...new Set((Array.isArray(body.fixes) ? body.fixes : [])
      .map(String)
      .filter(id => ALLOWED_INTEGRITY_FIXES.has(id)))];
    if (!fixes.length) {
      sendJson(res, 400, { ok: false, error: "integrity_fixes_required" });
      return true;
    }

    const backup = await createAdminBackup("Перед исправлением данных", req.authUser?.name || "Администратор");
    const fixed = await enqueueStateWrite(async () => {
      const db = readDb();
      const counts = {};
      const currentTime = now();
      if (fixes.includes("expired_sessions")) {
        const before = (db.authSessions || []).length;
        db.authSessions = (db.authSessions || []).filter(item => Number.isFinite(Date.parse(item.expiresAt || "")) && Date.parse(item.expiresAt) > currentTime);
        counts.expired_sessions = before - db.authSessions.length;
      }
      if (fixes.includes("dangling_sessions")) {
        const userIds = new Set((db.users || []).map(user => String(user.id || "")).filter(Boolean));
        const before = (db.authSessions || []).length;
        db.authSessions = (db.authSessions || []).filter(item => !item.userId || userIds.has(String(item.userId)));
        counts.dangling_sessions = before - db.authSessions.length;
      }
      if (fixes.includes("invalid_instruction_editors")) {
        const userKeys = new Set((db.users || []).flatMap(user => [user.id, user.employeeId, user.phone]
          .map(value => String(value || "").trim())
          .filter(Boolean)));
        let removed = 0;
        for (const instruction of Object.values(db.workPermitInstructions || {})) {
          const before = (instruction.editorIds || []).length;
          instruction.editorIds = (instruction.editorIds || []).filter(key => userKeys.has(String(key || "")));
          removed += before - instruction.editorIds.length;
        }
        counts.invalid_instruction_editors = removed;
      }
      if (fixes.includes("stale_alerts")) {
        const before = (db.adminAlerts || []).length;
        db.adminAlerts = (db.adminAlerts || []).filter(item => !(item.status === "resolved"
          && Date.parse(item.resolvedAt || item.lastSeenAt || 0) < currentTime - 90 * 86400000));
        counts.stale_alerts = before - db.adminAlerts.length;
      }
      writeDb(db, {
        action: "admin_integrity_fixed",
        user: req.authUser,
        targetId: backup.id,
        targetLabel: fixes.join(", "),
        reason
      });
      return counts;
    });
    sendJson(res, 200, { ok: true, fixed, backup, integrity: dataIntegrityReport(readDb()) });
    return true;
  };
}

module.exports = { ALLOWED_INTEGRITY_FIXES, createAdminIntegrityRoute };
