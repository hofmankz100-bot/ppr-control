"use strict";

const ELIGIBLE_QR_JOURNAL_ROLES = new Set([
  "shop", "engineer", "safetyEngineer", "energyEngineer", "designEngineer",
  "mechanicalEngineer", "instrumentationEngineer"
]);

function createAdminQrRoute(dependencies = {}) {
  const {
    enqueueStateWrite,
    passwordMatches,
    randomBytes,
    readBody,
    readDb,
    sendJson,
    todayStamp,
    writeDb,
    allowPasswordlessTestAuth = false,
    now = () => Date.now()
  } = dependencies;

  function passwordIsValid(body, user) {
    return (allowPasswordlessTestAuth && !user?.passwordHash)
      || passwordMatches(String(body.password || ""), String(user?.passwordHash || ""));
  }

  return async function handleAdminQrRoute(req, res, pathname) {
    const isRoutesGet = pathname === "/api/admin/qr-routes" && req.method === "GET";
    const isRoutesPost = pathname === "/api/admin/qr-routes" && req.method === "POST";
    const isCorrection = pathname === "/api/admin/qr-journal/correct" && req.method === "POST";
    const isCsv = pathname === "/api/admin/qr-journal.csv" && req.method === "GET";
    const isJournalAccess = pathname === "/api/qr-walk/journal-access" && req.method === "POST";
    if (!isRoutesGet && !isRoutesPost && !isCorrection && !isCsv && !isJournalAccess) return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: isJournalAccess ? "editor_required" : "admin_required" });
      return true;
    }

    if (isRoutesGet) {
      sendJson(res, 200, { ok: true, routes: (readDb().qrRouteDefinitions || []).slice().reverse() });
      return true;
    }

    if (isCsv) {
      const rows = [
        ["Дата", "Смена", "Группа", "Оборудование", "Узел", "Сотрудник", "Роль", "Время", "Статус", "Причина исправления"],
        ...(readDb().qrWalkJournal || []).map(item => [
          item.date || "", item.shift || "", item.group || "", item.equipmentId ?? "", item.nodeIndex ?? "",
          item.byName || "", item.byRole || "", item.at || "",
          item.invalid ? "Ошибочная фиксация" : "Зафиксировано", item.correctionReason || ""
        ])
      ];
      const csv = `\uFEFF${rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")).join("\r\n")}`;
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="qr_journal_${todayStamp()}.csv"`
      });
      res.end(csv);
      return true;
    }

    const body = await readBody(req).catch(() => ({}));
    if (isJournalAccess) {
      const userId = String(body.userId || "").trim();
      const result = await enqueueStateWrite(async () => {
        const db = readDb();
        const user = (db.users || []).find(item => String(item.id || "") === userId);
        if (!user || !ELIGIBLE_QR_JOURNAL_ROLES.has(String(user.role || ""))) return { error: "user_not_eligible" };
        user.qrWalkJournalAccess = body.enabled === true;
        writeDb(db, { action: "qr_walk_journal_access", user: req.authUser, targetUserId: userId, enabled: user.qrWalkJournalAccess });
        return { userId, enabled: user.qrWalkJournalAccess };
      });
      if (result.error) sendJson(res, 400, { ok: false, error: result.error });
      else sendJson(res, 200, { ok: true, userId: result.userId, enabled: result.enabled });
      return true;
    }

    if (!passwordIsValid(body, req.authUser)) {
      sendJson(res, 401, { ok: false, error: "admin_password_invalid" });
      return true;
    }
    const reason = String(body.reason || "").trim().slice(0, 500);
    if (!reason) {
      sendJson(res, 400, { ok: false, error: "reason_required" });
      return true;
    }

    if (isCorrection) {
      const result = await enqueueStateWrite(async () => {
        const db = readDb();
        const item = (db.qrWalkJournal || []).find(entry => entry.id === String(body.id || ""));
        if (!item) return { error: "journal_entry_not_found" };
        item.correctedAt = new Date(now()).toISOString();
        item.correctedBy = String(req.authUser?.name || "Администратор");
        item.correctionReason = reason;
        item.invalid = body.invalid !== false;
        writeDb(db, { action: "qr_journal_corrected", user: req.authUser, targetId: item.id, reason });
        return { item };
      });
      if (result.error) sendJson(res, 404, { ok: false, error: result.error });
      else sendJson(res, 200, { ok: true, item: result.item });
      return true;
    }

    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.qrRouteDefinitions ||= [];
      const action = String(body.action || "save");
      if (action === "archive") {
        const item = db.qrRouteDefinitions.find(entry => entry.id === String(body.id || ""));
        if (!item) return { error: "route_not_found" };
        item.active = false;
        item.archivedAt = new Date(now()).toISOString();
        writeDb(db, { action: "qr_route_archived", user: req.authUser, targetId: item.id, targetLabel: item.name, reason });
        return { item };
      }
      const name = String(body.name || "").trim().slice(0, 200);
      if (!name) return { error: "route_name_required" };
      const old = db.qrRouteDefinitions.find(entry => entry.id === String(body.id || ""));
      const points = [...new Set((Array.isArray(body.points) ? body.points : [])
        .map(String).map(value => value.trim()).filter(value => /^\d+:\d+$/.test(value)))].slice(0, 1000);
      const timestamp = now();
      const item = {
        ...(old || {}),
        id: old?.id || `qr-route-${timestamp}-${randomBytes(3).toString("hex")}`,
        name,
        group: body.group === "operational" ? "operational" : "technical",
        role: String(body.role || ""),
        area: String(body.area || "").trim().slice(0, 200),
        userIds: [...new Set((Array.isArray(body.userIds) ? body.userIds : []).map(String).filter(Boolean))].slice(0, 500),
        points,
        active: true,
        updatedAt: new Date(timestamp).toISOString(),
        updatedBy: String(req.authUser?.name || "Администратор")
      };
      if (old) Object.assign(old, item);
      else db.qrRouteDefinitions.push(item);
      writeDb(db, { action: "qr_route_saved", user: req.authUser, targetId: item.id, targetLabel: item.name, reason });
      return { item };
    });
    if (result.error) sendJson(res, 400, { ok: false, error: result.error });
    else sendJson(res, 200, { ok: true, item: result.item });
    return true;
  };
}

module.exports = { ELIGIBLE_QR_JOURNAL_ROLES, createAdminQrRoute };
