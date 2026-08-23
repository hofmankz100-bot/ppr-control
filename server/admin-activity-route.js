"use strict";

function createAdminActivityRoute(dependencies = {}) {
  const {
    adminActivityFeed,
    enqueueStateWrite,
    readDb,
    sendJson,
    writeDb,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminActivityRoute(req, res, pathname) {
    if (pathname !== "/api/admin/activity/read" || req.method !== "POST") return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const key = String(req.authUser?.id || req.authUser?.employeeId || "primary-admin");
      db.adminActivityReadAt ||= {};
      db.adminActivityReadAt[key] = new Date(now()).toISOString();
      writeDb(db, {
        action: "admin_activity_read",
        user: req.authUser,
        reason: "События просмотрены администратором"
      });
      return adminActivityFeed(db, req.authUser);
    });
    sendJson(res, 200, { ok: true, activity: result });
    return true;
  };
}

module.exports = { createAdminActivityRoute };
