"use strict";

async function saveGroupMeasures(req, res, body, deps) {
  const completing = body.action === "complete-measures";
  const equipmentId = Number(body.equipmentId);
  const code = String(body.code || "").trim();
  const cycleNumber = Number(body.cycleNumber ?? 0);
  if (!Number.isSafeInteger(equipmentId) || equipmentId <= 0 || !/^[1-9]\d{0,5}$/.test(code)
    || !Number.isSafeInteger(cycleNumber) || cycleNumber < 0
    || (!completing && (typeof body.text !== "string" || body.text.length > 2000))) {
    deps.sendJson(res, 400, { ok: false, error: "repeat_failure_measures_invalid" });
    return true;
  }
  const result = await deps.enqueueStateWrite(async () => {
    const db = deps.readDb(), actor = req.authUser || {};
    if (actor.role !== "editor" && !deps.activeUserPermission(actor, "repeatFailureGroup")) return { error: "repeat_failure_group_forbidden" };
    const equipment = db.catalog?.equipment?.[String(equipmentId)];
    if (!equipment || equipment.deleted) return { error: "repeat_failure_not_found" };
    if (actor.role !== "editor" && !deps.nodeMutationAccessServer(actor, equipment)) return { error: "repeat_failure_group_forbidden" };
    const cycleId = `${code}:${cycleNumber}`;
    const archived = equipment.repeatFailureArchives?.[cycleId];
    const previous = equipment.repeatFailureMeasures?.[code];
    if (archived && !completing) return { error: "repeat_failure_group_closed" };
    if (!archived && cycleNumber !== (previous?.cycleNumber || 0)) return { error: "repeat_failure_measures_stale" };
    const matching = entry => String(entry?.repeatFailureCode || "").trim() === code
      && (archived ? entry.repeatFailureCycleId === cycleId : !entry.repeatFailureClosedAt && !entry.repeatFailureCycleId);
    const members = (db.downtimes || []).filter(entry => !entry.deleted && entry.type !== "production" && Number(entry.equipmentId) === equipmentId && matching(entry));
    const checks = {};
    Object.entries(db.checks || {}).forEach(([key, record]) => {
      if (Number(key.split(":")[0]) !== equipmentId) return;
      const remarks = (Array.isArray(record?.to?.commentLog) ? record.to.commentLog : []).filter(matching);
      if (remarks.length) { members.push(...remarks); checks[key] = record; }
    });
    if (!members.length) return { error: "repeat_failure_not_found" };
    if (completing && !archived && (!previous?.text?.trim() || members.length < 2)) return { error: "repeat_failure_measures_required" };
    if (completing && !archived && body.expectedUpdatedAt !== previous?.updatedAt) return { error: "repeat_failure_measures_stale" };
    const text = completing ? (archived || previous).text : body.text.trim();
    const changed = completing ? !archived : String(previous?.text || "") !== text;
    const actionId = String(body.actionId || "").trim().slice(0, 160);
    if (changed) {
      const now = new Date().toISOString();
      if (!completing) equipment.repeatFailureMeasures = { ...(equipment.repeatFailureMeasures || {}), [code]: {
        ...previous, cycleNumber, text, updatedAt: now, updatedByKey: deps.resolutionUserKeyServer(actor),
        updatedByName: String(actor.name || ""), updatedByRole: String(actor.role || ""),
        textUpdatedAt: now, textUpdatedByName: String(actor.name || ""),
        textUpdatedByKey: deps.resolutionUserKeyServer(actor), textUpdatedByRole: String(actor.role || "")
      } };
      if (completing) {
        equipment.repeatFailureArchives = { ...(equipment.repeatFailureArchives || {}), [cycleId]: {
          ...previous, code, completedAt: now,
          textUpdatedAt: previous.textUpdatedAt || previous.updatedAt || "",
          textUpdatedByName: previous.textUpdatedByName ?? previous.updatedByName ?? "",
          textUpdatedByKey: previous.textUpdatedByKey ?? previous.updatedByKey ?? "",
          textUpdatedByRole: previous.textUpdatedByRole ?? previous.updatedByRole ?? "",
          completedByName: String(actor.name || ""), completedByKey: deps.resolutionUserKeyServer(actor), completedByRole: String(actor.role || "")
        } };
        equipment.repeatFailureMeasures[code] = { text: "", cycleNumber: cycleNumber + 1, updatedAt: now };
        members.forEach(entry => { entry.repeatFailureClosedAt = now; entry.repeatFailureCycleId = cycleId; entry.updatedAt = now; });
        Object.values(checks).forEach(record => { record.updatedAt = now; record.to.updatedAt = now; });
      }
      equipment.updatedAt = now;
      deps.writeDb(db, { action: completing ? "repeat_failure_group_completed" : "repeat_failure_measures_saved", actionId, clientId: String(body.clientId || ""),
        user: actor, equipmentId, repeatFailureCode: code, cycleNumber, previousText: previous?.text || "", text });
    }
    return { changed, actionId, patch: { catalog: { equipment: { [String(equipmentId)]: equipment } },
      ...(completing ? { checks, downtimes: (db.downtimes || []).filter(entry => members.includes(entry)) } : {}) } };
  });
  if (result.error) {
    deps.sendJson(res, result.error.includes("forbidden") ? 403 : result.error.includes("not_found") ? 404 : 409, { ok: false, error: result.error });
    return true;
  }
  const stateVersion = result.changed ? deps.broadcastState(body.clientId || "api", result.actionId, result.patch, true) : deps.realtimeStateVersion();
  deps.sendJson(res, 200, { ok: true, changed: result.changed, actionId: result.actionId, stateVersion, state: result.patch });
  return true;
}

async function handleRepeatFailureGroupRoute(req, res, pathname, deps) {
  if (pathname !== "/api/repeat-failure-group" || req.method !== "POST") return false;
  const { readBody, sendJson, enqueueStateWrite, readDb, activeUserPermission, nodeMutationAccessServer, ensureRemarkEntriesServer, resolutionUserKeyServer, writeDb, broadcastState, realtimeStateVersion } = deps;
  const body = await readBody(req);
  if (["save-measures", "complete-measures"].includes(body.action)) return saveGroupMeasures(req, res, body, deps);
  const sourceType = String(body.sourceType || "").trim();
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  if (name.length > 120 || (!code && name)) {
    sendJson(res, 400, { ok: false, error: "repeat_failure_group_invalid" });
    return true;
  }
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
    if (target.repeatFailureClosedAt || target.repeatFailureCycleId) return { error: "repeat_failure_group_closed" };
    // A number is local to one equipment; reuse its latest explicitly saved name.
    let existingName = "";
    let namedAt = "";
    const consider = entry => {
      if (String(entry?.repeatFailureCode || "") !== code || !entry.repeatFailureName) return;
      const at = String(entry.repeatFailureMarkedAt || "");
      if (!existingName || at > namedAt) { existingName = entry.repeatFailureName; namedAt = at; }
    };
    if (code) {
      (db.downtimes || []).forEach(entry => {
        if (!entry.deleted && entry.type !== "production" && Number(entry.equipmentId) === equipmentId) consider(entry);
      });
      Object.entries(db.checks || {}).forEach(([key, record]) => {
        if (Number(key.split(":")[0]) === equipmentId && record?.to) {
          (Array.isArray(record.to.commentLog) ? record.to.commentLog : []).forEach(consider);
        }
      });
    }
    const savedName = code ? name || existingName : "";
    const changed = String(target.repeatFailureCode || "") !== code || String(target.repeatFailureName || "") !== savedName;
    if (changed) {
      target.repeatFailureCode = code;
      target.repeatFailureName = savedName;
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
    const status = result.error.includes("forbidden") ? 403 : result.error.includes("not_found") ? 404 : result.error === "repeat_failure_group_closed" ? 409 : 400;
    sendJson(res, status, { ok: false, error: result.error });
    return true;
  }
  const stateVersion = result.changed ? broadcastState(result.origin, result.actionId, result.patch, true) : realtimeStateVersion();
  sendJson(res, 200, { ok: true, actionId: result.actionId, changed: result.changed, stateVersion, state: result.patch });
  return true;
}

// Generic device sync cannot assign, move or unlock groups. Only this audited route may do so.
function preserveRepeatFailureMetadata(current, incoming) {
  const keys = new Set([...Object.keys(current), ...Object.keys(incoming)].filter(key => key.startsWith("repeatFailure")));
  for (const key of keys) {
    if (Object.hasOwn(current, key)) incoming[key] = current[key];
    else delete incoming[key];
  }
  if (current.repeatFailureClosedAt && current.equipmentId != null) incoming.equipmentId = current.equipmentId;
  return incoming;
}

module.exports = { handleRepeatFailureGroupRoute, preserveRepeatFailureMetadata };
