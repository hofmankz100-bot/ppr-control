"use strict";

function createAdminUserPermissionsRoute(dependencies = {}) {
  const {
    adminPermissionKeys,
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

  return async function handleAdminUserPermissionsRoute(req, res, pathname) {
    if (pathname !== "/api/admin/user-permissions" || req.method !== "POST") return false;

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

      const action = String(body.action || "save");
      if (action === "reset") {
        target.permissionOverrides = {};
      } else if (action === "copy") {
        const source = (db.users || []).find(user => String(user.id || "") === String(body.sourceUserId || ""));
        if (!source) return { error: "source_user_not_found" };
        target.permissionOverrides = JSON.parse(JSON.stringify(source.permissionOverrides || {}));
      } else {
        const expiresAt = String(body.expiresAt || "");
        const timestamp = now();
        if (expiresAt && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= timestamp)) {
          return { error: "permission_expiry_invalid" };
        }
        const enabled = new Set((Array.isArray(body.permissions) ? body.permissions : [])
          .map(String)
          .filter(key => adminPermissionKeys.has(key)));
        target.permissionOverrides = Object.fromEntries([...adminPermissionKeys]
          .filter(key => enabled.has(key))
          .map(key => [key, {
            enabled: true,
            expiresAt,
            grantedAt: new Date(timestamp).toISOString(),
            grantedBy: String(req.authUser?.name || "Администратор")
          }]));
      }

      db.authSessions = (db.authSessions || [])
        .filter(session => String(session.userId || "") !== String(target.id || ""));
      writeDb(db, {
        action: action === "reset"
          ? "user_permissions_reset"
          : action === "copy" ? "user_permissions_copied" : "user_permissions_saved",
        user: req.authUser,
        targetId: target.id,
        targetLabel: target.name,
        reason
      });
      return { user: userPublic(target) };
    });

    if (result.error) {
      sendJson(res, result.error.includes("not_found") ? 404 : 400, { ok: false, error: result.error });
    } else {
      sendJson(res, 200, { ok: true, user: result.user });
    }
    return true;
  };
}

module.exports = { createAdminUserPermissionsRoute };
