"use strict";

const { equipmentForPlan, scheduledItemsForDate, buildAutofillRows, reconcilePprApprovalRequest, pprTargetKey: keyFor, resolvePprTarget, pprTemplateEntry } = require("./ppr-autofill");
const planFields = row => [String(row.id), String(row.work || ""), String(row.equipmentId || ""), String(row.node || ""), ...(row.nodeId ? [String(row.nodeId)] : [])];
const revision = sheet => JSON.stringify((sheet?.rows || []).map(planFields));
const started = row => Boolean(row.mark || row.markedAt || String(row.resolutionComment || "").trim());

function pprNodeBindingAmbiguous(db, equipmentId, nodeIndex) {
  const equipment = equipmentForPlan(db.catalog).find(item => String(item.id) === String(equipmentId));
  const node = equipment?.nodes?.[nodeIndex];
  if (!node) return false;
  const template = db.pprWorkTemplates?.[keyFor({ equipmentId, node })];
  const legacy = (template && !template.nodeId) || Object.values(db.pprSheets || {}).some(sheet => !sheet?.approvedAt && [...(sheet?.rows || []), ...(sheet?.autofilledFor || [])].some(row => !row.nodeId && String(row.equipmentId) === String(equipmentId) && row.node === node));
  if (legacy && equipment.nodes.filter(name => name === node).length > 1) return true;
  const identity = equipment.pprNodeIds?.[nodeIndex];
  if (!identity?.id || identity.name !== node) return false;
  return Object.values(equipment.pprNodeIds).filter(value => value?.id === identity.id).length > 1
    || Object.values(db.pprWorkTemplates || {}).filter(value => String(value?.equipmentId) === String(equipmentId) && value?.nodeId === identity.id).length > 1;
}

// Called only by explicit server writes, never a snapshot/GET. Keep legacy
// template storage keys and their version/author; metadata proves future renames.
function bindPprNodeIdentity(db, equipmentId, nodeIndex, { rename, linkSheets = false } = {}) {
  const equipment = equipmentForPlan(db.catalog).find(item => String(item.id) === String(equipmentId));
  const node = equipment?.nodes?.[nodeIndex];
  const identity = equipment?.pprNodeIds?.[nodeIndex];
  const target = resolvePprTarget(equipment, { equipmentId, node, ...(identity?.name === node ? { nodeId: identity.id } : {}) });
  if (!target) return null;
  const entry = pprTemplateEntry(target, db.pprWorkTemplates);
  if (entry.conflict) return null;
  db.catalog ||= { equipment: {} }; db.catalog.equipment ||= {};
  const card = db.catalog.equipment[equipmentId] ||= { ...equipment };
  card.pprNodeIds ||= {};
  const nodeId = target.nodeId || require("node:crypto").randomUUID();
  card.pprNodeIds[nodeIndex] = { id: nodeId, name: rename ?? node, ...(rename !== undefined || identity?.legacy === false ? { legacy: false } : {}) };
  if (entry.template) Object.assign(entry.template, { equipmentId: target.equipmentId, nodeId });
  if (linkSheets) for (const sheet of Object.values(db.pprSheets || {})) {
    if (!sheet || sheet.approvedAt) continue;
    for (const row of [...(sheet.rows || []), ...(sheet.autofilledFor || [])]) {
      if (started(row) || String(row.equipmentId) !== String(equipmentId)) continue;
      if (row.nodeId ? row.nodeId !== nodeId : row.node !== node) continue;
      Object.assign(row, { nodeId, node: rename ?? node });
    }
  }
  return nodeId;
}

function planSnapshot(db, date) {
  const sheet = db.pprSheets?.[date];
  if (!sheet) return { error: "ppr_sheet_not_found" };
  const equipment = equipmentForPlan(db.catalog);
  const targets = new Map();
  for (const row of [...(sheet.autofilledFor || []), ...scheduledItemsForDate(db.catalog, date), ...sheet.rows]) {
    const eq = equipment.find(item => String(item.id) === String(row.equipmentId));
    const target = resolvePprTarget(eq, row);
    if (!target) continue;
    targets.set(keyFor(target), target);
  }
  return { sheet, revision: revision(sheet), targets: [...targets.values()], suggestedRows: buildAutofillRows(date, [...targets.values()], db.pprWorkTemplates).filter(row => row.work.trim()), templateVersions: Object.fromEntries([...targets].map(([key, target]) => { const entry = pprTemplateEntry(target, db.pprWorkTemplates); return [key, entry.conflict ? -1 : entry.template?.version || 0]; })) };
}

// Validate everything before touching the live DB object. Results and signatures
// are always taken from the current server row, never from the editor's snapshot.
function savePlan(db, body, actor, now = new Date().toISOString()) {
  const snapshot = planSnapshot(db, body.date);
  if (snapshot.error) return snapshot;
  const old = snapshot.sheet;
  if (old.approvedAt) return { error: "ppr_sheet_locked" };
  if (body.revision !== snapshot.revision) return { error: "ppr_plan_conflict" };
  if (!Array.isArray(body.rows) || body.rows.length > 500) return { error: "ppr_rows_invalid" };
  const targets = new Map(snapshot.targets.map(target => [keyFor(target), target]));
  const equipment = equipmentForPlan(db.catalog);
  const targetFor = row => {
    const target = resolvePprTarget(equipment.find(item => String(item.id) === String(row.equipmentId)), row);
    return target && targets.get(keyFor(target));
  };
  const saved = new Map(old.rows.map(row => [String(row.id), row]));
  const ids = new Set();
  const rows = [];
  for (const raw of body.rows) {
    const id = String(raw?.id || "");
    if (!id || id.length > 160 || ids.has(id) || old.removedRowIds?.includes(id)) return { error: "ppr_rows_invalid" };
    ids.add(id);
    if (typeof raw?.work !== "string" || raw.work.length > 4000) return { error: "ppr_rows_invalid" };
    const previous = saved.get(id);
    const target = targetFor(raw) || (!raw.nodeId && previous && String(raw.equipmentId) === String(previous.equipmentId) && raw.node === previous.node ? targetFor(previous) : null);
    const work = raw.work.trim();
    const unchanged = previous && work === String(previous.work || "").trim() && (!work || keyFor(raw) === keyFor(previous)
      || (!raw.nodeId && String(raw.equipmentId) === String(previous.equipmentId) && raw.node === previous.node));
    if (work && !target && !(unchanged && started(previous))) return { error: "ppr_target_required" };
    if (previous && !unchanged && started(previous)) return { error: "ppr_row_started" };
    rows.push(unchanged ? structuredClone(previous) : {
      ...(previous || { id, mark: "" }), ...(target || {}), work,
      updatedAt: now, workUpdatedAt: now, autoFilled: false
    });
  }
  const removed = old.rows.filter(row => !ids.has(String(row.id)));
  if (removed.some(started)) return { error: "ppr_row_started" };
  const groups = new Map();
  const nodeIndexes = new Map();
  {
    for (const row of rows.filter(row => row.work.trim())) {
      const target = targetFor(row);
      if (!target && started(row)) continue; // Unresolved history stays exact, not a new template.
      const key = keyFor(target);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row.work);
    }
    if (!groups.size) return { error: "ppr_template_empty" };
    // Do not silently erase another equipment/node's entire saved template.
    for (const row of old.rows.filter(row => String(row.work || "").trim())) {
      const target = targetFor(row);
      if (target && !groups.has(keyFor(target))) return { error: "ppr_template_empty_target" };
    }
    for (const key of groups.keys()) {
      const target = targets.get(key), entry = pprTemplateEntry(target, db.pprWorkTemplates);
      if (entry.conflict || body.templateVersions?.[key] !== (entry.template?.version || 0)) return { error: "ppr_template_conflict" };
      const eq = equipment.find(item => String(item.id) === String(target.equipmentId));
      const index = resolvePprTarget(eq, target, { nodeIndexOnly: true });
      if (index === null) return { error: "ppr_target_required" };
      nodeIndexes.set(key, index);
    }
  }
  const sheet = { ...old, rows, updatedAt: now, updatedByName: actor.name,
    plannedByName: actor.name, plannedByRole: actor.role, plannedAt: now,
    plannedAutomatically: false, autofillInitialized: true, explicitPlan: true,
    removedRowIds: [...new Set([...(old.removedRowIds || []), ...removed.map(row => String(row.id))])] };
  reconcilePprApprovalRequest(sheet, old, now);
  if (removed.length) {
    db.pprRemovedRows ||= {};
    db.pprRemovedRows[body.date] ||= {};
    for (const row of removed) db.pprRemovedRows[body.date][row.id] = { row: structuredClone(row), removedAt: now, removedByName: actor.name };
  }
  if (groups.size) {
    db.pprWorkTemplates ||= {};
    for (const [key, works] of groups) {
      const target = targets.get(key), entry = pprTemplateEntry(target, db.pprWorkTemplates);
      const nodeId = bindPprNodeIdentity(db, target.equipmentId, nodeIndexes.get(key));
      db.pprWorkTemplates[entry.key] = { ...target, ...(nodeId ? { nodeId } : {}), works, version: (entry.template?.version || 0) + 1,
        updatedAt: now, updatedByName: actor.name, updatedByRole: actor.role };
      if (nodeId) for (const row of rows) if (!started(row) && targetFor(row) === target) Object.assign(row, { nodeId });
    }
  }
  db.pprSheets[body.date] = sheet;
  return { sheet };
}

// Old, unbound sheets used the only scheduled target in the browser. Preserve
// that compatibility using the server schedule, never labels sent by a worker.
function legacyMarkTarget(sheet, row, catalog, now = new Date().toISOString()) {
  if (sheet.explicitPlan || row.equipmentId || row.equipment || row.node || row.area) return {};
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  const targets = scheduledItemsForDate(catalog, sheet.date, today);
  if (targets.length !== 1) return {};
  const { equipmentId, equipment, node, nodeId, area } = targets[0];
  return { equipmentId, equipment, node, ...(nodeId ? { nodeId } : {}), area };
}

function reconcilePprApprovalRequests(sheets, previous, dates, { notify, clear, origin = "", onError = () => {}, now = new Date().toISOString() }) {
  for (const date of new Set(dates)) {
    const sheet = sheets?.[date];
    const transition = reconcilePprApprovalRequest(sheet, previous?.[date], now);
    if (!transition) continue;
    // Existing send/clear functions snapshot only their small payload and defer
    // delivery with the state transaction. Never retain the DB in an async task.
    try { Promise.resolve((transition === "notify" ? notify : clear)(sheet, origin)).catch(onError); }
    catch (error) { onError(error); }
  }
}

module.exports = { keyFor, revision, started, planSnapshot, savePlan, legacyMarkTarget, reconcilePprApprovalRequests, bindPprNodeIdentity, pprNodeBindingAmbiguous };
