"use strict";

const crypto = require("node:crypto");

function normalizeValue(value) {
  return String(value || "").trim().toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
}

function isDowntimeEntry(entry = {}) {
  const text = String(entry.text || "").trim();
  return entry.type === "downtime" || text.startsWith("Пуск:") || text.startsWith("Стоп:");
}

function stableRemarkId(entry = {}) {
  if (entry.id) return String(entry.id);
  const source = [entry.at, entry.type, entry.role, entry.name, entry.text, entry.photo]
    .map(value => String(value || ""))
    .join("\u0001");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `remark:${String(entry.at || "legacy")}:${(hash >>> 0).toString(36)}`;
}

function ensureRemarkEntries(item = {}, collaborationFields = []) {
  const entries = (Array.isArray(item.commentLog) ? item.commentLog : [])
    .filter(entry => entry && !isDowntimeEntry(entry) && String(entry.text || entry.photo || "").trim());
  entries.forEach(entry => {
    entry.id ||= stableRemarkId(entry);
    if (typeof entry.resolved !== "boolean") entry.resolved = Boolean(item.resolved);
  });
  const legacyTarget = entries.find(entry => !entry.resolved);
  if (legacyTarget && collaborationFields.some(field => item[field] !== undefined)) {
    collaborationFields.forEach(field => {
      if (legacyTarget[field] === undefined && item[field] !== undefined) legacyTarget[field] = item[field];
      delete item[field];
    });
  }
  return entries;
}

function syncItemSummary(item = {}, collaborationFields = []) {
  const entries = ensureRemarkEntries(item, collaborationFields);
  if (!entries.length) return;
  const allResolved = entries.every(entry => entry.resolved);
  item.resolved = allResolved;
  if (!allResolved) {
    item.resolvedAt = "";
    item.confirmedAt = "";
    return;
  }
  const latest = entries.slice().sort((a, b) => String(b.resolvedAt || "").localeCompare(String(a.resolvedAt || "")))[0] || {};
  item.resolvedAt = latest.resolvedAt || item.resolvedAt || "";
  item.resolvedByName = latest.resolvedByName || item.resolvedByName || "";
  item.resolvedByRole = latest.resolvedByRole || item.resolvedByRole || "";
  item.resolvedComment = latest.resolvedComment || item.resolvedComment || "";
  item.resolvedPhoto = latest.resolvedPhoto || item.resolvedPhoto || "";
  item.resolvedDurationMs = Number(latest.resolvedDurationMs || item.resolvedDurationMs || 0);
  item.confirmedAt = latest.confirmedAt || item.confirmedAt || "";
  item.confirmedByName = latest.confirmedByName || item.confirmedByName || "";
  item.confirmedByRole = latest.confirmedByRole || item.confirmedByRole || "";
}

function authorIdentity(entry = {}) {
  return String(entry.authorKey || entry.authorId || entry.authorEmployeeId || entry.authorPhone || "").trim()
    || `${normalizeValue(entry.role)}:${normalizeValue(entry.name)}`;
}

function timestampsWithin(left, right, limitMs = 120000) {
  const leftMs = Date.parse(left || "");
  const rightMs = Date.parse(right || "");
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && Math.abs(leftMs - rightMs) <= limitMs;
}

function areTechnicalDuplicates(left = {}, right = {}, sameRecord = true) {
  if (authorIdentity(left) !== authorIdentity(right)) return false;
  if (normalizeValue(left.text) !== normalizeValue(right.text) || !normalizeValue(left.text)) return false;
  if (!timestampsWithin(left.at, right.at)) return false;
  const exactCreationTime = String(left.at || "") === String(right.at || "");
  const leftResolution = normalizeValue(left.resolvedComment || left.resolutionSubmittedComment);
  const rightResolution = normalizeValue(right.resolvedComment || right.resolutionSubmittedComment);
  const matchingResolution = Boolean(leftResolution && leftResolution === rightResolution);
  if (!sameRecord && exactCreationTime) return true;
  if (normalizeValue(left.type || "remark") !== normalizeValue(right.type || "remark") && !matchingResolution) return false;
  if (String(left.photo || "") !== String(right.photo || "") && !matchingResolution) return false;
  if (leftResolution !== rightResolution) return false;
  if (!sameRecord && !leftResolution && String(left.at || "") !== String(right.at || "")) return false;
  const leftResolutionAt = left.resolvedAt || left.resolutionSubmittedAt || "";
  const rightResolutionAt = right.resolvedAt || right.resolutionSubmittedAt || "";
  return !(leftResolutionAt && rightResolutionAt && !timestampsWithin(leftResolutionAt, rightResolutionAt));
}

function mergeHistoryItems(current = [], incoming = [], identity = item => String(item?.id || "")) {
  const map = new Map();
  for (const item of [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!item || typeof item !== "object") continue;
    const key = identity(item);
    if (!key) continue;
    map.set(key, { ...(map.get(key) || {}), ...item });
  }
  return Array.from(map.values()).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
}

function historySignature(item = {}, kind = "event") {
  const photo = String(item.photo || "");
  const photoIdentity = photo ? `${photo.length}:${photo.slice(0, 48)}:${photo.slice(-48)}` : "";
  const fields = kind === "update"
    ? [item.actorKey, item.name, item.role, item.text, photoIdentity]
    : [item.action, item.actorKey, item.name, item.role, item.targetKey, item.targetName,
        (item.targetKeys || []).join(","), item.reason, (item.recipientKeys || []).join(",")];
  return fields.map(normalizeValue).join("\u0001");
}

function dedupeHistoryItems(items = [], kind = "event") {
  const result = [];
  const groups = new Map();
  for (const item of (Array.isArray(items) ? items : []).filter(value => value && typeof value === "object")
    .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")))) {
    const signature = historySignature(item, kind);
    const candidates = groups.get(signature) || [];
    const duplicateIndex = candidates.find(index => timestampsWithin(result[index]?.at, item.at));
    if (duplicateIndex !== undefined) {
      result[duplicateIndex] = { ...result[duplicateIndex], ...item, id: result[duplicateIndex].id || item.id };
      continue;
    }
    candidates.push(result.length);
    groups.set(signature, candidates);
    result.push(item);
  }
  return result;
}

function decisionTime(entry = {}) {
  return Math.max(
    Date.parse(entry.confirmedAt || "") || 0,
    Date.parse(entry.resolutionReturnedAt || "") || 0,
    Date.parse(entry.resolutionSubmittedAt || "") || 0,
    Date.parse(entry.commentEditedAt || "") || 0
  );
}

function preference(entry = {}) {
  return (entry.resolved ? 1_000_000_000_000_000 : 0)
    + (entry.resolutionPendingConfirmation ? 500_000_000_000_000 : 0)
    + decisionTime(entry)
    + Object.values(entry).filter(value => value !== undefined && value !== "" && value !== false).length;
}

function mergeDuplicateRemarks(keeper = {}, duplicate = {}, resolutionUserKey = item => String(item?.key || "")) {
  const preferred = preference(duplicate) > preference(keeper) ? duplicate : keeper;
  const fallback = preferred === keeper ? duplicate : keeper;
  const next = { ...fallback, ...preferred, id: keeper.id || duplicate.id, at: keeper.at || duplicate.at };
  next.resolutionEvents = dedupeHistoryItems(mergeHistoryItems(keeper.resolutionEvents, duplicate.resolutionEvents), "event");
  next.resolutionUpdates = dedupeHistoryItems(mergeHistoryItems(keeper.resolutionUpdates, duplicate.resolutionUpdates), "update");
  next.commentEditHistory = mergeHistoryItems(keeper.commentEditHistory, duplicate.commentEditHistory);
  next.collaborationActionReceipts = mergeHistoryItems(keeper.collaborationActionReceipts, duplicate.collaborationActionReceipts).slice(-100);
  next.resolutionParticipants = mergeHistoryItems(keeper.resolutionParticipants, duplicate.resolutionParticipants, resolutionUserKey);
  return next;
}

function dedupeRemarkList(entries = [], { resolutionUserKey } = {}) {
  const result = [];
  const participantIdentity = resolutionUserKey || (item => String(item?.key || ""));
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || typeof entry !== "object") continue;
    entry.resolutionEvents = dedupeHistoryItems(entry.resolutionEvents, "event");
    entry.resolutionUpdates = dedupeHistoryItems(entry.resolutionUpdates, "update");
    const duplicateIndex = result.findIndex(item => areTechnicalDuplicates(item, entry, true));
    if (duplicateIndex < 0) result.push(entry);
    else result[duplicateIndex] = mergeDuplicateRemarks(result[duplicateIndex], entry, participantIdentity);
  }
  return result;
}

function dedupeDatabase(db = {}, options = {}) {
  const { stableRemarkId, isDowntimeEntry, resolutionUserKey, syncItemSummary, remarkDeletionKey } = options;
  db.archivedDuplicateRemarks = Array.isArray(db.archivedDuplicateRemarks) ? db.archivedDuplicateRemarks : [];
  db.remarkDeletionTombstones = db.remarkDeletionTombstones && typeof db.remarkDeletionTombstones === "object" ? db.remarkDeletionTombstones : {};
  const archivedKeys = new Set(db.archivedDuplicateRemarks.map(item => `${item.recordKey}|${item.remarkId}`));
  const keepersBySignature = new Map();
  const affectedRecordKeys = new Set();
  let removed = 0;
  let historyRemoved = 0;
  for (const [recordKey, record] of Object.entries(db.checks || {})) {
    const item = record?.to;
    if (!item || !Array.isArray(item.commentLog)) continue;
    const beforeHistory = item.commentLog.reduce((sum, entry) => sum
      + (Array.isArray(entry?.resolutionEvents) ? entry.resolutionEvents.length : 0)
      + (Array.isArray(entry?.resolutionUpdates) ? entry.resolutionUpdates.length : 0), 0);
    const withinRecord = dedupeRemarkList(item.commentLog, { resolutionUserKey });
    removed += Math.max(0, item.commentLog.length - withinRecord.length);
    const [equipmentId, , date] = recordKey.split(":");
    const kept = [];
    for (const entry of withinRecord) {
      if (!entry || isDowntimeEntry(entry)) { kept.push(entry); continue; }
      const signature = [equipmentId, date, authorIdentity(entry), normalizeValue(entry.text)]
        .map(normalizeValue).join("\u0001");
      const candidates = keepersBySignature.get(signature) || [];
      const duplicateOf = candidates.find(candidate => areTechnicalDuplicates(candidate.entry, entry, false));
      if (!duplicateOf) {
        candidates.push({ recordKey, entry, item });
        keepersBySignature.set(signature, candidates);
        kept.push(entry);
        continue;
      }
      Object.assign(duplicateOf.entry, mergeDuplicateRemarks(duplicateOf.entry, entry, resolutionUserKey));
      syncItemSummary(duplicateOf.item);
      affectedRecordKeys.add(duplicateOf.recordKey);
      const remarkId = String(entry.id || stableRemarkId(entry));
      const archiveKey = `${recordKey}|${remarkId}`;
      if (!archivedKeys.has(archiveKey)) {
        db.archivedDuplicateRemarks.push({
          recordKey,
          remarkId,
          duplicateOfRecordKey: duplicateOf.recordKey,
          duplicateOfRemarkId: String(duplicateOf.entry.id || stableRemarkId(duplicateOf.entry)),
          at: String(entry.at || ""),
          archivedAt: new Date().toISOString()
        });
        archivedKeys.add(archiveKey);
      }
      db.remarkDeletionTombstones[remarkDeletionKey(recordKey, remarkId)] = new Date().toISOString();
      removed += 1;
    }
    const afterHistory = kept.reduce((sum, entry) => sum
      + (Array.isArray(entry?.resolutionEvents) ? entry.resolutionEvents.length : 0)
      + (Array.isArray(entry?.resolutionUpdates) ? entry.resolutionUpdates.length : 0), 0);
    const recordHistoryRemoved = Math.max(0, beforeHistory - afterHistory);
    historyRemoved += recordHistoryRemoved;
    if (kept.length !== item.commentLog.length || recordHistoryRemoved > 0) {
      item.commentLog = kept;
      syncItemSummary(item);
      affectedRecordKeys.add(recordKey);
    }
  }
  db.archivedDuplicateRemarks = db.archivedDuplicateRemarks.slice(-5000);
  if (removed || historyRemoved) {
    db.targetedCleanupVersions ||= {};
    db.targetedCleanupVersions.remarkDuplicateCleanup20260907 = { at: new Date().toISOString(), removed, historyRemoved };
  }
  return { removed, historyRemoved, affectedRecordKeys: [...affectedRecordKeys] };
}

function compactPhoto(value) {
  const photo = String(value || "");
  return photo ? `${photo.length}:${photo.slice(0, 64)}:${photo.slice(-64)}` : "";
}

function actionFingerprint(action, actor = {}, body = {}, resolutionUserKey = item => String(item?.key || "")) {
  const participantKeys = (Array.isArray(body.participants) ? body.participants : [body.participant || {}])
    .map(resolutionUserKey).filter(Boolean).sort();
  const performerKeys = (Array.isArray(body.performerKeys) ? body.performerKeys : [body.performerKey])
    .map(value => String(value || "").trim()).filter(Boolean).sort();
  const payload = {
    action: String(action || ""), actorKey: String(actor.key || ""), text: normalizeValue(body.text),
    reason: normalizeValue(body.reason), participantKey: String(body.participantKey || ""), participantKeys,
    performerKeys, performerName: normalizeValue(body.performerName), confirmerName: normalizeValue(body.confirmerName),
    defectText: normalizeValue(body.defectText), resolvedComment: normalizeValue(body.resolvedComment),
    correctionReason: normalizeValue(body.correctionReason), partInstalled: body.partInstalled === true,
    partDescription: normalizeValue(body.partDescription), photo: compactPhoto(body.photo),
    partPhotos: (Array.isArray(body.partPhotos) ? body.partPhotos : []).map(compactPhoto)
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("base64url");
}

function repeatedActionReceipt(remark = {}, actionId = "", fingerprint = "", now = Date.now()) {
  return (Array.isArray(remark.collaborationActionReceipts) ? remark.collaborationActionReceipts : []).find(receipt => {
    if (!receipt || typeof receipt !== "object") return false;
    if (actionId && String(receipt.id || "") === actionId) return true;
    const receiptMs = Date.parse(receipt.at || "");
    return fingerprint && receipt.fingerprint === fingerprint && Number.isFinite(receiptMs) && now - receiptMs >= 0 && now - receiptMs <= 120000;
  }) || null;
}

module.exports = {
  actionFingerprint,
  decisionTime,
  dedupeDatabase,
  dedupeHistoryItems,
  dedupeRemarkList,
  ensureRemarkEntries,
  isDowntimeEntry,
  mergeHistoryItems,
  normalizeValue,
  repeatedActionReceipt,
  stableRemarkId,
  syncItemSummary
};
