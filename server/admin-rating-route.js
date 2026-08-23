"use strict";

function createAdminRatingRoute(dependencies = {}) {
  const {
    enqueueStateWrite,
    normalizedAdminConfig,
    publicState,
    readBody,
    readDb,
    sendJson,
    writeDb,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminRatingRoute(req, res, pathname) {
    if (pathname !== "/api/admin/rating-exclusions" || req.method !== "POST") return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    const action = body.action === "restore" ? "restore" : "hide";
    const key = String(body.key || "").trim().toLocaleLowerCase("ru-RU").slice(0, 300);
    const label = String(body.label || "").trim().slice(0, 300);
    const reason = String(body.reason || "").trim().slice(0, 1000);
    if (!/^(mechanic|welder|turner|forkliftDriver):.+$/i.test(key)) {
      sendJson(res, 400, { ok: false, error: "invalid_rating_worker" });
      return true;
    }
    if (!reason) {
      sendJson(res, 400, { ok: false, error: "reason_required" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const config = normalizedAdminConfig(db.adminConfig);
      const entries = config.excludedRatingWorkers.filter(item => item.key !== key);
      if (action === "hide") {
        entries.push({
          key,
          label,
          reason,
          hiddenAt: new Date(now()).toISOString(),
          hiddenBy: String(req.authUser.name || "Администратор")
        });
      }
      db.adminConfig = { ...config, excludedRatingWorkers: entries };
      writeDb(db, {
        action: action === "hide" ? "rating_worker_hidden" : "rating_worker_restored",
        user: req.authUser,
        targetId: key,
        targetLabel: label || key,
        reason
      });
      return publicState(db).adminConfig.excludedRatingWorkers;
    });
    sendJson(res, 200, { ok: true, excludedRatingWorkers: result });
    return true;
  };
}

module.exports = { createAdminRatingRoute };
