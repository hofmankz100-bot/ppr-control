"use strict";

async function handleRepeatFailureGroupRoute(req, res, pathname, deps) {
  if (pathname !== "/api/repeat-failure-group" || req.method !== "POST") return false;
  const { readBody, sendJson, enqueueStateWrite, readDb, activeUserPermission, nodeMutationAccessServer, ensureRemarkEntriesServer, resolutionUserKeyServer, writeDb, broadcastState, realtimeStateVersion } = deps;
  const body = await readBody(req);
  const sourceType = String(body.sourceType || "").trim();
  const code = String(body.code || "").trim();
  if (!new Set(["downtime", "remark"]).has(sourceType) || (code && !/^[1-9]\d{0,5}$/.test(code))) {
    sendJson(res, 400, { ok: false, error: "repeat_failure_group_invalid" });
    return true;
  }
  const result = await enqueueStateWrite(async () => {
    const db = readDb();
    const actor = req.authUser || {};
    if (actor.role !== "editor" && !activeUserPermission(actor, "repeatFailureGroup")) return { error: "repeat_failure_group_forbidden" };
    const now = new Date().toISOString();
    const actionId = String(body.actionId || "").trim().slice(0, 160);
    let target;
    let patch;
    let equipmentId = 0;
    let nodeIndex = -1;
    if (sourceType === "downtime") {
      target = (db.downtimes || []).find(item => item?.id === String(body.downtimeId || "").trim() && !item.deleted);
      if (!target || target.type === "production") return { error: "repeat_failure_not_found" };
      equipmentId = Number(target.equipmentId);
      nodeIndex = Number(target.nodeIndex);
      const catalogItem = db.catalog?.equipment?.[String(equipmentId)] || { area: target.area || "", name: target.equipment || "" };
      if (actor.role !== "editor" && !nodeMutationAccessServer(actor, catalogItem)) return { error: "repeat_failure_group_forbidden" };
      patch = { downtimes: [target] };
    } else {
      const recordKey = String(body.recordKey || "").trim();
      const remarkId = String(body.remarkId || "").trim();
      const record = db.checks?.[recordKey];
      const parts = recordKey.split(":");
      equipmentId = Number(parts[0]);
      nodeIndex = Number(parts[1]);
      const catalogItem = db.catalog?.equipment?.[String(equipmentId)] || {};
      if (!record?.to || !remarkId) return { error: "repeat_failure_not_found" };
      if (actor.role !== "editor" && !nodeMutationAccessServer(actor, catalogItem)) return { error: "repeat_failure_group_forbidden" };
      target = ensureRemarkEntriesServer(record.to).find(entry => String(entry?.id || "") === remarkId);
      if (!target) return { error: "repeat_failure_not_found" };
      patch = { checks: { [recordKey]: record } };
    }
    const changed = String(target.repeatFailureCode || "") !== code;
    if (changed) {
      target.repeatFailureCode = code;
      target.repeatFailureMarkedAt = now;
      target.repeatFailureMarkedByKey = resolutionUserKeyServer(actor);
      target.repeatFailureMarkedByName = String(actor.name || "").trim();
      target.repeatFailureMarkedByRole = String(actor.role || "").trim();
      target.updatedAt = now;
      if (sourceType === "remark") {
        const record = patch.checks[String(body.recordKey || "").trim()];
        record.to.updatedAt = now;
        record.updatedAt = now;
      }
      writeDb(db, { action: code ? "repeat_failure_group_set" : "repeat_failure_group_cleared", actionId, clientId: String(body.clientId || ""), user: actor, sourceType, sourceId: sourceType === "downtime" ? String(body.downtimeId || "") : `${String(body.recordKey || "")}:${String(body.remarkId || "")}`, equipmentId, nodeIndex, repeatFailureCode: code });
    }
    return { actionId, changed, origin: body.clientId || "api", patch };
  });
  if (result.error) {
    const status = result.error.includes("forbidden") ? 403 : result.error.includes("not_found") ? 404 : 400;
    sendJson(res, status, { ok: false, error: result.error });
    return true;
  }
  const stateVersion = result.changed ? broadcastState(result.origin, result.actionId, result.patch, true) : realtimeStateVersion();
  sendJson(res, 200, { ok: true, actionId: result.actionId, changed: result.changed, stateVersion, state: result.patch });
  return true;
}

module.exports = { handleRepeatFailureGroupRoute };
