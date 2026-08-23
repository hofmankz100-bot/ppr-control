"use strict";

function createAdminUserSessionsRoute(dependencies = {}) {
  const {
    enqueueStateWrite,
    passwordMatches,
    readBody,
    readDb,
    sendJson,
    writeDb,
    allowPasswordlessTestAuth = false
  } = dependencies;

  return async function handleAdminUserSessionsRoute(req, res, pathname) {
    if (pathname !== "/api/admin/user-sessions" || req.method !== "POST") return false;

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
      if (String(target.id || "") === String(req.authUser?.id || "")) {
        return { error: "current_admin_session_protected" };
      }

      const before = (db.authSessions || []).length;
      db.authSessions = (db.authSessions || [])
        .filter(session => String(session.userId || "") !== String(target.id || ""));
      const ended = before - db.authSessions.length;
      writeDb(db, {
        action: "user_sessions_ended",
        user: req.authUser,
        targetId: target.id,
        targetLabel: target.name,
        reason,
        details: `Завершено сеансов: ${ended}`
      });
      return { ended };
    });

    if (result.error) {
      sendJson(res, result.error === "user_not_found" ? 404 : 409, { ok: false, error: result.error });
    } else {
      sendJson(res, 200, { ok: true, ended: result.ended });
    }
    return true;
  };
}

module.exports = { createAdminUserSessionsRoute };
