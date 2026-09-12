"use strict";

const { equipmentForPlan, scheduledItemsForDate, buildAutofillRows, reconcilePprApprovalRequest } = require("./ppr-autofill");
const keyFor = row => JSON.stringify([String(row.equipmentId || ""), String(row.node || "")]);
const planFields = row => [String(row.id), String(row.work || ""), String(row.equipmentId || ""), String(row.node || "")];
const revision = sheet => JSON.stringify((sheet?.rows || []).map(planFields));
const started = row => Boolean(row.mark || row.markedAt || String(row.resolutionComment || "").trim());

function planSnapshot(db, date) {
  const sheet = db.pprSheets?.[date];
  if (!sheet) return { error: "ppr_sheet_not_found" };
  const equipment = equipmentForPlan(db.catalog);
  const targets = new Map();
  for (const row of [...(sheet.autofilledFor || []), ...scheduledItemsForDate(db.catalog, date), ...sheet.rows]) {
    const eq = equipment.find(item => String(item.id) === String(row.equipmentId));
    if (!eq || !eq.nodes.includes(row.node)) continue;
    const target = { equipmentId: eq.id, equipment: eq.name, node: row.node, area: eq.area };
    targets.set(keyFor(target), target);
  }
  return { sheet, revision: revision(sheet), targets: [...targets.values()], suggestedRows: buildAutofillRows(date, [...targets.values()], db.pprWorkTemplates).filter(row => row.work.trim()), templateVersions: Object.fromEntries([...targets.keys()].map(key => [key, db.pprWorkTemplates?.[key]?.version || 0])) };
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
  const saved = new Map(old.rows.map(row => [String(row.id), row]));
  const ids = new Set();
  const rows = [];
  for (const raw of body.rows) {
    const id = String(raw?.id || "");
    if (!id || id.length > 160 || ids.has(id) || old.removedRowIds?.includes(id)) return { error: "ppr_rows_invalid" };
    ids.add(id);
    if (typeof raw?.work !== "string" || raw.work.length > 4000) return { error: "ppr_rows_invalid" };
    const previous = saved.get(id);
    const target = targets.get(keyFor(raw));
    const work = raw.work.trim();
    if (work && !target) return { error: "ppr_target_required" };
    const unchanged = previous && work === String(previous.work || "").trim() && (!work || keyFor(raw) === keyFor(previous));
    if (previous && !unchanged && started(previous)) return { error: "ppr_row_started" };
    rows.push(unchanged ? structuredClone(previous) : {
      ...(previous || { id, mark: "" }), ...(target || {}), work,
      updatedAt: now, workUpdatedAt: now, autoFilled: false
    });
  }
  const removed = old.rows.filter(row => !ids.has(String(row.id)));
  if (removed.some(started)) return { error: "ppr_row_started" };
  const groups = new Map();
  {
    for (const row of rows.filter(row => row.work.trim())) {
      const key = keyFor(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row.work);
    }
    if (!groups.size) return { error: "ppr_template_empty" };
    // Do not silently erase another equipment/node's entire saved template.
    for (const row of old.rows.filter(row => String(row.work || "").trim())) {
      if (targets.has(keyFor(row)) && !groups.has(keyFor(row))) return { error: "ppr_template_empty_target" };
    }
    for (const key of groups.keys()) {
      if (body.templateVersions?.[key] !== (db.pprWorkTemplates?.[key]?.version || 0)) return { error: "ppr_template_conflict" };
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
    for (const [key, works] of groups) db.pprWorkTemplates[key] = {
      ...targets.get(key), works, version: (db.pprWorkTemplates[key]?.version || 0) + 1,
      updatedAt: now, updatedByName: actor.name, updatedByRole: actor.role
    };
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
  const { equipmentId, equipment, node, area } = targets[0];
  return { equipmentId, equipment, node, area };
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

module.exports = { keyFor, revision, started, planSnapshot, savePlan, legacyMarkTarget, reconcilePprApprovalRequests };
