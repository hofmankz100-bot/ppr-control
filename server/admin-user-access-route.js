"use strict";

function createAdminUserAccessRoute(dependencies = {}) {
  const {
    enqueueStateWrite,
    passwordMatches,
    readBody,
    readDb,
    sendJson,
    userPublic,
    writeDb,
    allowPasswordlessTestAuth = false,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminUserAccessRoute(req, res, pathname) {
    if (pathname !== "/api/admin/access" || req.method !== "POST") return false;

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

    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const target = (db.users || []).find(user => String(user.id || "") === String(body.userId || ""));
      if (!target) return { error: "user_not_found" };

      const disabled = body.disabled === true;
      if (disabled && (target.role === "editor" || String(target.id || "") === String(req.authUser?.id || ""))) {
        return { error: "admin_access_protected" };
      }

      target.accessDisabled = disabled;
      target.accessUpdatedAt = new Date(now()).toISOString();
      target.accessUpdatedBy = String(req.authUser?.name || "Администратор");
      if (disabled) {
        db.authSessions = (db.authSessions || []).filter(session => session.userId !== target.id);
      }
      writeDb(db, {
        action: disabled ? "user_access_disabled" : "user_access_enabled",
        user: req.authUser,
        targetId: target.id,
        targetLabel: target.name,
        reason
      });
      return { user: userPublic(target) };
    });

    if (result.error) {
      sendJson(res, result.error === "user_not_found" ? 404 : 409, { ok: false, error: result.error });
    } else {
      sendJson(res, 200, { ok: true, ...result });
    }
    return true;
  };
}

module.exports = { createAdminUserAccessRoute };
