"use strict";

const KEY = "textIntegrity20260908";
const invalidText = value => typeof value === "string" && /\uFFFD|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
const protectedField = key => /password|token|secret|checksum|hash|photo|base64|payload|^id$|Id$|Key$|^role$|Role$|^permissions$|^url$/i.test(key);
const ignoredSections = new Set(["targetedCleanupVersions", "authSessions", "translationCache"]);

// Walk existing values only. IDs, dates, signatures' identities, row order and
// numeric/status fields are never reconstructed, and recovery evidence is immutable.
function scanStoredText(db) {
  const found = [];
  function visit(value, path = [], parent = null, key = "") {
    if (typeof value === "string") {
      if (invalidText(value)) found.push({ path, before: value, parent, key, protected: protectedField(key) });
    } else if (value && typeof value === "object") {
      for (const [field, item] of Object.entries(value)) {
        if (!path.length && ignoredSections.has(field)) continue;
        if (invalidText(field)) found.push({ path: [...path, field], before: field, protected: true, keyDamage: true });
        visit(item, [...path, field], value, field);
      }
    }
  }
  visit(db);
  return found;
}

function recoverText(value, candidates) {
  if (!invalidText(value) || value.length > 10000) return value;
  const pieces = value.split(/(\uFFFD+)/u);
  const fragment = pieces.filter(piece => !invalidText(piece)).sort((a, b) => b.length - a.length)[0] || "";
  if ((value.replace(/\uFFFD/g, "").match(/\p{L}/gu) || []).length < 3) return value;
  const pattern = new RegExp("^" + pieces.map(piece => invalidText(piece) ? `.{1,${piece.length}}` : piece.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("") + "$", "u");
  let match;
  for (const candidate of new Set(candidates)) {
    if (typeof candidate !== "string" || invalidText(candidate) || candidate.length > value.length || !candidate.includes(fragment)) continue;
    if (!pattern.test(candidate)) continue;
    if (match !== undefined && match !== candidate) return value;
    match = candidate;
  }
  return match ?? value;
}

function bucket(key) {
  if (/ByName$|OwnerName$|LeadName$|^checkedBy$|^userName$|^author$/.test(key)) return "person";
  if (/work|comment|text|description|reason|details/i.test(key)) return "content";
  if (/equipment|node|area|title|name/i.test(key) || /^\d+$/.test(key)) return "label";
  return key;
}

function candidatePools(db, reference) {
  const pools = new Map();
  const add = (kind, value) => {
    if (typeof value !== "string" || !value.trim() || invalidText(value) || value.length > 10000) return;
    if (!pools.has(kind)) pools.set(kind, new Set());
    pools.get(kind).add(value);
  };
  function collect(value, key = "", path = []) {
    if (typeof value === "string") { if (!protectedField(key)) add(bucket(key), value); return; }
    if (!value || typeof value !== "object") return;
    for (const [field, child] of Object.entries(value)) {
      if (!path.length && ignoredSections.has(field)) continue;
      collect(child, field, [...path, field]);
    }
  }
  collect(db);
  for (const user of db.users || []) add("person", user.name);
  // Names in historic participant snapshots can remain valid after staff leave.
  const visitNames = value => {
    if (!value || typeof value !== "object") return;
    if (value.name && (value.role || value.userId || value.employeeId)) add("person", value.name);
    for (const child of Object.values(value)) if (child && typeof child === "object") visitNames(child);
  };
  for (const [section, value] of Object.entries(db)) if (!ignoredSections.has(section)) visitNames(value);
  for (const [field, values] of Object.entries(reference.fields || {})) for (const value of values) add(bucket(field), value);
  const { EQUIPMENT, nodeReminderItems } = require("./ppr-autofill");
  for (const equipment of [...EQUIPMENT, ...Object.values(db.catalog?.equipment || {})]) {
    if (!equipment) continue;
    add("label", equipment.name); add("label", equipment.area);
    for (const node of equipment.nodes || []) {
      add("label", node);
      for (const work of nodeReminderItems(node, equipment.name)) add("content", work);
    }
  }
  return pools;
}

function repairStoredText(db, reference = require("./text-recovery-reference.json")) {
  db.targetedCleanupVersions ||= {};
  if (db.targetedCleanupVersions[KEY]) return db.targetedCleanupVersions[KEY];
  const pools = candidatePools(db, reference);
  const report = { at: new Date().toISOString(), source: reference.source, repaired: 0, changes: [], unresolved: [], invalidatedTranslations: [] };
  for (const entry of scanStoredText(db)) {
    const after = entry.protected ? entry.before : recoverText(entry.before, pools.get(bucket(entry.key)) || []);
    const evidence = { path: entry.path, before: entry.before };
    if (after === entry.before) { report.unresolved.push(evidence); continue; }
    entry.parent[entry.key] = after;
    report.changes.push({ ...evidence, after });
    report.repaired++;
  }
  // Derived translations are regenerated; keep their exact previous values for recovery.
  for (const [key, value] of Object.entries(db.translationCache || {})) {
    if (!invalidText(key) && !invalidText(value?.text) && !invalidText(value?.translated)) continue;
    report.invalidatedTranslations.push({ key, value });
    delete db.translationCache[key];
  }
  db.targetedCleanupVersions[KEY] = report;
  return report;
}

function textIntegrityReport(db) {
  const entries = scanStoredText(db), sections = {};
  for (const entry of entries) sections[entry.path[0]] = (sections[entry.path[0]] || 0) + 1;
  const migration = db.targetedCleanupVersions?.[KEY];
  return { remaining: entries.length, sections, repaired: migration?.repaired || 0,
    invalidatedTranslations: migration?.invalidatedTranslations?.length || 0,
    unresolved: entries.map(({ path, before, protected: sensitive }) => ({ path, text: sensitive ? "[служебное поле]" : before })) };
}

// Compare the same record (not the same array position) with a checksum-verified
// historical snapshot. This is a text-only preview, never a database restore.
function backupTextSuggestions(db, backup) {
  const suggestions = [];
  function visit(current, old, path = [], parent = null, key = "") {
    if (typeof current === "string") {
      if (protectedField(key) || !invalidText(current) || typeof old !== "string") return;
      const after = recoverText(current, [old]);
      if (after !== current) suggestions.push({ path, before: current, after });
      return;
    }
    if (!current || typeof current !== "object" || !old || typeof old !== "object") return;
    if (Array.isArray(current)) {
      // Never align historic arrays without stable IDs: rows may have moved.
      const byId = new Map((Array.isArray(old) ? old : []).filter(item => item?.id != null).map(item => [String(item.id), item]));
      current.forEach((row, i) => { if (row?.id != null) visit(row, byId.get(String(row.id)), [...path, String(i)], current, String(i)); });
      return;
    }
    for (const [field, value] of Object.entries(current)) {
      if (!path.length && ignoredSections.has(field)) continue;
      visit(value, old[field], [...path, field], current, field);
    }
  }
  visit(db, backup);
  return suggestions;
}

function requestContainsInvalidText(value, previous) {
  if (typeof value === "string") return invalidText(value) && value !== previous;
  if (!value || typeof value !== "object") return false;
  // An unrelated save may carry an unchanged historical damaged field. Do not
  // block other work; reject only NEW damage. Match array records by stable ID.
  if (Array.isArray(value)) {
    const saved = Array.isArray(previous) ? previous : [];
    const byId = new Map(saved.filter(item => item?.id != null).map(item => [String(item.id), item]));
    return value.some((child, index) => requestContainsInvalidText(child, child?.id != null ? byId.get(String(child.id)) : saved[index]));
  }
  return Object.entries(value).some(([key, child]) => invalidText(key) || requestContainsInvalidText(child, previous?.[key]));
}

module.exports = { KEY, invalidText, recoverText, scanStoredText, repairStoredText, textIntegrityReport, backupTextSuggestions, requestContainsInvalidText };
