"use strict";

const ALLOWED_BROADCAST_ROLES = new Set([
  "mechanic", "electrician", "welder", "turner", "forkliftDriver", "operator", "shop", "engineer",
  "safetyEngineer", "energyEngineer", "designEngineer", "mechanicalEngineer", "instrumentationEngineer",
  "productionDirector", "generalDirector", "director", "technicalDirector", "editor"
]);
const ALLOWED_PRIORITIES = new Set(["normal", "important", "critical"]);

function createAdminNotificationsRoute(dependencies = {}) {
  const {
    broadcastState,
    enqueueStateWrite,
    passwordMatches,
    randomBytes,
    readBody,
    readDb,
    sendJson,
    writeDb,
    allowPasswordlessTestAuth = false,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminNotificationsRoute(req, res, pathname) {
    const isPolicy = pathname === "/api/admin/notification-policy" && req.method === "POST";
    const isRemind = pathname === "/api/admin/broadcasts/remind" && req.method === "POST";
    const isBroadcast = pathname === "/api/admin/broadcasts" && req.method === "POST";
    if (!isPolicy && !isRemind && !isBroadcast) return false;

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

    if (isPolicy) {
      await enqueueStateWrite(async () => {
        const db = readDb();
        db.adminNotificationPolicy = {
          defaultPriority: ALLOWED_PRIORITIES.has(body.defaultPriority) ? body.defaultPriority : "normal",
          defaultExpiryHours: Math.max(1, Math.min(720, Number(body.defaultExpiryHours || 24))),
          unreadReminderHours: Math.max(1, Math.min(168, Number(body.unreadReminderHours || 8))),
          updatedAt: new Date(now()).toISOString(),
          updatedBy: String(req.authUser?.name || "Администратор")
        };
        writeDb(db, { action: "admin_notification_policy_saved", user: req.authUser, reason });
      });
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (isRemind) {
      const result = await enqueueStateWrite(async () => {
        const db = readDb();
        const item = (db.systemBroadcasts || []).find(entry => entry.id === String(body.id || ""));
        if (!item || item.active === false) return { error: "broadcast_not_found" };
        item.remindedAt = new Date(now()).toISOString();
        item.remindedBy = String(req.authUser?.name || "Администратор");
        writeDb(db, { action: "admin_broadcast_reminded", user: req.authUser, targetId: item.id, targetLabel: item.title, reason });
        return { ok: true };
      });
      if (result.error) sendJson(res, 404, { ok: false, error: result.error });
      else {
        broadcastState("admin-broadcast-reminder", "", { systemBroadcasts: readDb().systemBroadcasts }, true);
        sendJson(res, 200, { ok: true });
      }
      return true;
    }

    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.systemBroadcasts ||= [];
      if (body.action === "close") {
        const item = db.systemBroadcasts.find(entry => entry.id === String(body.id || ""));
        if (!item) return { error: "broadcast_not_found" };
        item.active = false;
        item.closedAt = new Date(now()).toISOString();
        item.closedBy = String(req.authUser?.name || "Администратор");
        writeDb(db, { action: "admin_broadcast_closed", user: req.authUser, targetId: item.id, targetLabel: item.title, reason });
        return { item };
      }

      const title = String(body.title || "").trim().slice(0, 200);
      const content = String(body.text || "").trim().slice(0, 3000);
      if (!title || !content) return { error: "broadcast_content_required" };
      const roles = [...new Set((Array.isArray(body.roles) ? body.roles : [])
        .map(String)
        .filter(role => ALLOWED_BROADCAST_ROLES.has(role)))];
      const timestamp = now();
      const at = new Date(timestamp).toISOString();
      const expiresAt = String(body.expiresAt || "");
      if (!expiresAt || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= timestamp) {
        return { error: "broadcast_expiry_invalid" };
      }
      const item = {
        id: `broadcast-${timestamp}-${randomBytes(4).toString("hex")}`,
        title,
        text: content,
        priority: ALLOWED_PRIORITIES.has(body.priority) ? body.priority : "normal",
        roles,
        active: true,
        startsAt: at,
        expiresAt,
        createdAt: at,
        author: String(req.authUser?.name || "Администратор"),
        readBy: []
      };
      db.systemBroadcasts.push(item);
      db.systemBroadcasts = db.systemBroadcasts.slice(-500);
      writeDb(db, { action: "admin_broadcast_created", user: req.authUser, targetId: item.id, targetLabel: title, reason });
      return { item };
    });
    if (result.error) sendJson(res, result.error === "broadcast_not_found" ? 404 : 400, { ok: false, error: result.error });
    else {
      broadcastState("admin-broadcast", "", { systemBroadcasts: readDb().systemBroadcasts }, true);
      sendJson(res, 200, { ok: true });
    }
    return true;
  };
}

module.exports = { ALLOWED_BROADCAST_ROLES, ALLOWED_PRIORITIES, createAdminNotificationsRoute };
