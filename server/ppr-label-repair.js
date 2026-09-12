"use strict";
const KEY = "pprLabelEncodingRepair20260908v2";
const damaged = value => typeof value === "string" && value.includes("\uFFFD");
const fields = ["equipment", "node", "area"];
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function recoverLabel(value, candidates) {
  if (!damaged(value)) return value;
  // Do not infer a name from a number alone or fill an ambiguous missing fragment.
  if ((value.replace(/\uFFFD/g, "").match(/\p{L}/gu) || []).length < 3) return value;
  const pattern = new RegExp("^" + value.split(/(\uFFFD+)/u).map(part => damaged(part) ? `.{1,${part.length}}` : escapeRegex(part)).join("") + "$", "u");
  const matches = [...new Set(candidates.filter(candidate => typeof candidate === "string" && !damaged(candidate) && pattern.test(candidate)))];
  return matches.length === 1 ? matches[0] : value;
}

function repairPprLabels(db) {
  db.targetedCleanupVersions ||= {};
  if (db.targetedCleanupVersions[KEY]) return 0;
  const equipmentList = Object.values(db.catalog?.equipment || {}).filter(item => item && typeof item === "object");
  const changes = [], unresolved = [];
  for (const [date, sheet] of Object.entries(db.pprSheets || {})) {
    if (!sheet || typeof sheet !== "object") continue;
    const rows = [...(Array.isArray(sheet.rows) ? sheet.rows : []), ...(Array.isArray(sheet.autofilledFor) ? sheet.autofilledFor : [])].filter(row => row && typeof row === "object");
    rows.forEach((row, index) => {
      let equipment = db.catalog?.equipment?.[String(row.equipmentId)];
      if (!equipment) {
        const name = recoverLabel(row.equipment, equipmentList.map(item => item.name));
        const matches = equipmentList.filter(item => item.name === name && !damaged(name));
        if (matches.length === 1) equipment = matches[0];
      }
      const peers = rows.filter(peer => row.equipmentId != null ? String(peer.equipmentId) === String(row.equipmentId) : equipment?.name && peer.equipment === equipment.name);
      const candidates = {
        equipment: [equipment?.name, ...peers.map(peer => peer.equipment)], area: [equipment?.area, ...peers.map(peer => peer.area)],
        node: [...(equipment?.nodes || []), ...peers.map(peer => peer.node)]
      };
      for (const field of fields) {
        if (!damaged(row[field])) continue;
        const before = row[field], after = recoverLabel(before, candidates[field]);
        if (before === after) { unresolved.push({ date, rowId: row.id || `label:${index}`, field, before }); continue; }
        row[field] = after;
        changes.push({ date, rowId: row.id || `label:${index}`, field, before, after });
      }
    });
  }
  // Keep original values for audit/recovery; never alter work, marks, timestamps or IDs.
  db.targetedCleanupVersions[KEY] = { at: new Date().toISOString(), repaired: changes.length, changes, unresolved };
  return changes.length;
}

function preservePprLabels(incoming, saved) {
  const next = { ...incoming };
  for (const field of fields) {
    if (damaged(next[field]) && typeof saved?.[field] === "string" && !damaged(saved[field])) next[field] = saved[field];
  }
  return next;
}
module.exports = { repairPprLabels, recoverLabel, preservePprLabels, KEY };
