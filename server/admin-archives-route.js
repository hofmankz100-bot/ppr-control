"use strict";

function createAdminArchivesRoute(dependencies = {}) {
  const { adminArchiveSelection, readDb, sendJson } = dependencies;

  return async function handleAdminArchivesRoute(req, res, pathname, url) {
    if (pathname !== "/api/admin/archives/preview" || req.method !== "GET") return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    const preview = adminArchiveSelection(readDb(), url.searchParams.get("days"));
    sendJson(res, 200, {
      ok: true,
      preview: {
        days: preview.days,
        cutoffAt: preview.cutoffAt,
        counts: preview.counts
      }
    });
    return true;
  };
}

module.exports = { createAdminArchivesRoute };
