"use strict";

const { isDeepStrictEqual } = require("node:util");
const { ROLE_PERMISSION_BASE, activeUserPermission } = require("./permissions");

const clone = value => value === undefined ? undefined : structuredClone(value);
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const pick = (value, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(value || {}, key)).map(key => [key, clone(value[key])]));
const baseRole = value => ROLE_PERMISSION_BASE[value] || value;
const time = value => Date.parse(value?.updatedAt || value?.createdAt || "") || 0;
const stale = (old, incoming) => Boolean(old && time(old) && time(incoming) < time(old));
const actorKey = user => user.id ? `id:${user.id}` : user.employeeId ? `employee:${String(user.employeeId).toLowerCase()}` : `phone:${String(user.phone || "").replace(/\D/g, "")}`;
const identity = user => ({ id: String(user.id || ""), name: String(user.name || ""), role: String(user.jobRole || user.role || ""), position: String(user.position || user.title || "") });
const meaningful = value => {
  if (Array.isArray(value)) return value.map(meaningful);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => !["updatedAt", "updatedByName", "updatedByRole"].includes(key) && item !== undefined && item !== "" && item !== false && item !== null && !(typeof item === "object" && Object.keys(item).length === 0)).map(([key, item]) => [key, meaningful(item)]));
};
const same = (left, right) => isDeepStrictEqual(meaningful(left), meaningful(right));

/**
 * The old client sends whole sections, without a baseline revision for each item.
 * Existing fields outside the caller's authority therefore retain their server
 * values (including stale replays); forbidden new entities are rejected. This
 * is deliberately a filter, not a trust decision based on client timestamps.
 * Narrow action APIs remain the only writers of confirmations and closures.
 */
function sanitizeStateMutation({ previous, incoming, user, canAccessEquipment, hasArea, now = new Date().toISOString() }) {
  const body = clone(incoming);
  const role = baseRole(String(user.role || ""));
  const admin = role === "editor";
  const planner = admin || role === "engineer";
  const worker = admin || role === "mechanic";
  const actor = identity(user);
  const ignored = new Set();
  const deny = section => {
    const error = new Error("state_mutation_forbidden");
    error.code = "state_mutation_forbidden";
    error.section = section;
    throw error;
  };
  const preserve = (section, old, requested) => {
    if (!same(old, requested)) ignored.add(section);
    return clone(old);
  };
  const access = equipmentId => {
    const equipment = previous.catalog?.equipment?.[String(equipmentId)];
    return Boolean(equipment && canAccessEquipment(user, equipment));
  };
  const eachObject = (section, mutate) => {
    if (!Object.hasOwn(body, section)) return;
    body[section] = Object.fromEntries(Object.entries(object(body[section])).map(([id, raw]) => {
      const old = previous[section]?.[id];
      const next = mutate(object(raw), old, id);
      return [id, next];
    }).filter(([, value]) => value !== undefined));
  };
  const signature = () => ({ authorKey: actorKey(user), authorId: actor.id, authorEmployeeId: String(user.employeeId || ""), authorPhone: String(user.phone || ""), name: actor.name, role: actor.role });

  eachObject("checks", (raw, old, id) => {
    const match = /^(\d+):(\d+):(\d{4}-\d{2}-\d{2})$/.exec(id);
    if (!match || !access(match[1]) || !previous.catalog.equipment[match[1]].nodes?.[Number(match[2])]) {
      if (old) return preserve("checks", old, raw);
      // Empty local record skeletons are created while merely rendering nodes.
      const item = object(raw.to);
      const meaningfulRecord = [item.comment, item.commentPhoto, item.nodeDraftText].some(value => String(value || "").trim())
        || item.commentLog?.some(entry => entry?.text || entry?.photo) || item.tasks?.some(Boolean)
        || item.walkDone || item.resolved || item.mechanicFixed || item.done
        || Object.values(object(item.walkShifts)).some(mark => mark?.done)
        || Object.values(object(item.walkGroups)).some(group => Object.values(object(group)).some(mark => mark?.done));
      if (!meaningfulRecord) return undefined;
      return deny("checks");
    }
    const next = { ...clone(old || {}), ...pick(raw, ["updatedAt", "createdAt"]) };
    const oldItem = object(old?.to);
    const rawItem = object(raw.to);
    const item = { ...clone(oldItem) };
    if (!stale(old, raw)) Object.assign(item, pick(rawItem, ["tasks", "nodeDraftText", "comment", "commentPhoto", "updatedAt", "createdAt"]));
    if (Object.hasOwn(rawItem, "comment") || Object.hasOwn(rawItem, "commentPhoto")) {
      item.commentOwnerName = actor.name;
      item.commentOwnerRole = actor.role;
    }
    const entries = new Map((oldItem.commentLog || []).map(entry => [String(entry.id || `${entry.at}|${entry.text}|${entry.photo || ""}`), clone(entry)]));
    for (const entry of Array.isArray(rawItem.commentLog) ? rawItem.commentLog : []) {
      const key = String(entry?.id || `${entry?.at}|${entry?.text}|${entry?.photo || ""}`);
      if (entries.has(key)) {
        if (!same(entries.get(key), entry)) ignored.add("checks");
        continue;
      }
      if (!String(entry?.text || entry?.photo || "").trim()) continue;
      const added = { ...pick(entry, ["id", "at", "text", "photo", "type", "area"]), ...signature(), resolved: entry.type === "downtime" };
      added.at ||= now;
      entries.set(key, added);
    }
    item.commentLog = [...entries.values()];
    item.walkGroups = clone(oldItem.walkGroups || {});
    // Match qr-walk/mark: the session's primary base role selects the group;
    // additional jobRole grants equipment access, and editor can select either.
    const groups = admin ? ["technical", "operational"] : [["operator", "shop"].includes(role) ? "operational" : "technical"];
    for (const group of groups) {
      for (const [shift, mark] of Object.entries(object(rawItem.walkGroups?.[group]))) {
        if (!mark?.done || oldItem.walkGroups?.[group]?.[shift]?.done) continue;
        item.walkGroups[group] ||= {};
        item.walkGroups[group][shift] = { ...pick(mark, ["at", "shift", "label", "range", "customJournal"]), done: true, group, byName: actor.name, byRole: String(user.role || "") };
      }
    }
    // Legacy no-group walk records are retained but never used to overwrite
    // another role's QR mark. Current clients send walkGroups.
    next.to = item;
    return next;
  });

  if (Object.hasOwn(body, "downtimes")) {
    const oldById = new Map((previous.downtimes || []).map(item => [String(item.id), item]));
    body.downtimes = (Array.isArray(body.downtimes) ? body.downtimes : []).map(raw => {
      const old = oldById.get(String(raw?.id));
      if (old) return preserve("downtimes", old, raw);
      const equipment = previous.catalog?.equipment?.[String(raw?.equipmentId)];
      if (!raw?.id || !access(raw.equipmentId) || !Number.isInteger(Number(raw.nodeIndex)) || !equipment.nodes?.[Number(raw.nodeIndex)]) return deny("downtimes");
      return { ...pick(raw, ["id", "equipmentId", "nodeIndex", "date", "reason", "comment", "photo", "type", "recordKey", "remarkId"]), key: `${raw.equipmentId}:${raw.nodeIndex}`, equipment: equipment.name, node: equipment.nodes[Number(raw.nodeIndex)], area: equipment.area, startedAt: raw.startedAt || now, updatedAt: now, endedAt: "", byName: actor.name, byRole: actor.role, authorName: actor.name, authorRole: actor.role, authorKey: actorKey(user), authorId: actor.id };
    });
  }

  eachObject("pprSheets", (raw, old, date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return deny("pprSheets");
    if (old?.approvedAt || (!planner && !worker)) return old ? preserve("pprSheets", old, raw) : deny("pprSheets");
    if (!old && !planner) return deny("pprSheets");
    const sheet = clone(old || { id: raw.id || `ppr:${date}`, date, rows: [], createdAt: now });
    const oldRows = new Map((old?.rows || []).map(row => [String(row.id), row]));
    const rows = new Map([...oldRows].map(([id, row]) => [id, clone(row)]));
    let changed = false;
    for (const rawRow of Array.isArray(raw.rows) ? raw.rows : []) {
      const id = String(rawRow?.id || "");
      if (!id) continue;
      const saved = oldRows.get(id);
      if (!saved && !planner) { ignored.add("pprSheets"); continue; }
      const row = clone(saved || { id, work: "", mark: "" });
      const planFields = ["work", "equipmentId", "equipment", "node", "area", "autoFilled"];
      const planChange = !same(pick(saved, planFields), { ...pick(saved, planFields), ...pick(rawRow, planFields) });
      if (planChange && planner && (!saved || (Date.parse(rawRow.workUpdatedAt || rawRow.updatedAt || raw.updatedAt) || 0) >= (Date.parse(saved.workUpdatedAt || saved.updatedAt || "") || 0))) {
        Object.assign(row, pick(rawRow, planFields), { workUpdatedAt: now, mark: "", markedAt: "", markedByName: "", markedByRole: "", markUpdatedAt: now });
        sheet.plannedByName = actor.name; sheet.plannedByRole = role; sheet.plannedAt = now; sheet.plannedAutomatically = false;
        changed = true;
      } else if (planChange) ignored.add("pprSheets");
      const markChange = Object.hasOwn(rawRow, "mark") && String(rawRow.mark || "") !== String(saved?.mark || "");
      const draftChange = Object.hasOwn(rawRow, "resolutionComment") && String(rawRow.resolutionComment || "") !== String(saved?.resolutionComment || "");
      if ((markChange || draftChange) && worker && String(row.work || "").trim()) {
        const rawTime = Date.parse(rawRow.resolutionUpdatedAt || rawRow.markUpdatedAt || rawRow.updatedAt || raw.updatedAt || "") || 0;
        const savedTime = Math.max(Date.parse(saved?.resolutionUpdatedAt || "") || 0, Date.parse(saved?.markUpdatedAt || "") || 0);
        if (!savedTime || rawTime >= savedTime) {
          const comment = String(rawRow.resolutionComment ?? row.resolutionComment ?? "").trim().slice(0, 2000);
          if (draftChange) Object.assign(row, { resolutionComment: comment, resolutionUpdatedAt: now, draftUpdatedAt: now, draftByName: actor.name, draftByRole: role });
          if (markChange) {
            const mark = String(rawRow.mark || "");
            if (!["", "done", "na"].includes(mark) || (mark && !comment)) return deny("pprSheets");
            Object.assign(row, { mark, markedAt: mark ? now : "", markedByName: mark ? actor.name : "", markedByRole: mark ? role : "", markUpdatedAt: now, resolutionComment: mark ? comment : "", resolutionUpdatedAt: now });
          }
          changed = true;
        }
      } else if (markChange || draftChange) ignored.add("pprSheets");
      if (!saved || !same(saved, row)) { row.updatedAt = now; changed = true; }
      rows.set(id, row);
    }
    sheet.rows = [...rows.values()];
    if (planner && !stale(old, raw)) {
      const fields = ["autofillInitialized", "autofillMode", "autofilledAt", "autofilledFor"];
      const requested = pick(raw, fields);
      if (!same(pick(sheet, fields), { ...pick(sheet, fields), ...requested })) { Object.assign(sheet, requested); changed = true; }
    }
    if (changed) { sheet.updatedAt = now; sheet.updatedByName = actor.name; }
    const active = sheet.rows.filter(row => String(row.work || "").trim());
    if (active.length && active.every(row => ["done", "na"].includes(row.mark))) sheet.approvalRequestedAt ||= now;
    // Approval/locking and their actor can only originate in ppr-sheet/action.
    if (["approvedAt", "approvedByName", "approvedByRole", "lockedAt"].some(field => raw[field] && raw[field] !== old?.[field])) ignored.add("pprSheets");
    return sheet;
  });

  eachObject("annualPpr", (raw, old) => {
    if (!admin && !(planner && activeUserPermission(user, "annualPprEdit"))) return old ? preserve("annualPpr", old, raw) : Object.keys(raw).length ? deny("annualPpr") : undefined;
    return raw;
  });

  for (const [section, equipmentId] of [["compressorJournal", 9], ["gasJournal", 15]]) {
    eachObject(section, (raw, old) => {
      if (!access(equipmentId)) return old ? preserve(section, old, raw) : deny(section);
      if (old && (old.entryStatus === "fixed" || old.fixedAt) && !admin && !activeUserPermission(user, "aggregateJournalCorrect")) return preserve(section, old, raw);
      if (stale(old, raw) || same(old, raw)) return clone(old);
      const result = { ...clone(old || {}), ...raw, updatedByName: actor.name, updatedByRole: actor.role };
      for (const field of ["resolvedAt", "resolvedByName", "resolvedByRole", "confirmedAt", "confirmedByName", "grpQrChecks", "shgrpQrChecks", "shiftRows"]) {
        if (old && Object.hasOwn(old, field)) result[field] = clone(old[field]); else delete result[field];
      }
      result.resolutionComment = old?.resolutionComment || (raw.remarks === "Нет" ? "Не требуется" : "");
      if (["grpQrChecks", "shgrpQrChecks", "shiftRows", "resolvedAt", "resolvedByName", "resolutionComment"].some(field => Object.hasOwn(raw, field) && !same(raw[field], result[field]))) ignored.add(section);
      if (raw.entryStatus === "fixed" || raw.fixedAt) { result.fixedAt = old?.fixedAt || now; result.fixedByName = old?.fixedByName || actor.name; result.checkedBy = old?.checkedBy || actor.name; }
      return result;
    });
  }

  for (const [section, trade, prefix] of [["weldingJournal", "welder", "welder"], ["turningJournal", "turner", "turner"]]) {
    eachObject(section, (raw, old, id) => {
      if (old && (same(old, raw) || stale(old, raw))) return clone(old);
      const requestFields = ["requestType", "description", "drawingNumber", "requestPhoto", "quantity", "dueDate"];
      if (!old) {
        if (raw.status && raw.status !== "new") return deny(section);
        return { ...pick(raw, requestFields), id, status: "new", createdAt: raw.createdAt || now, updatedAt: now, createdById: actor.id, createdByName: actor.name, createdByRole: actor.role, createdByPosition: actor.position };
      }
      const result = clone(old);
      const participants = (Array.isArray(old.participants) && old.participants.length ? old.participants : old[`${prefix}Id`] ? [{ id: old[`${prefix}Id`], name: old[`${prefix}Name`], role: old[`${prefix}Role`], position: old[`${prefix}Position`] }] : []).map(clone);
      const title = [user.title, user.position, user.profession, user.jobRoleLabel].join(" ");
      const isTrade = admin || [user.role, user.jobRole].includes(trade) || (trade === "welder" ? /(^|\s|[-–—])(электро)?газосварщик|(^|\s|[-–—])электросварщик|(^|\s|[-–—])сварщик/i : /(^|\s|[-–—])токарь/i).test(title);
      const ownParticipant = participants.find(person => String(person.id) === actor.id);
      const rawSelf = (raw.participants || []).find(person => String(person?.id) === actor.id) || {};
      const self = { ...actor, ...pick(rawSelf, ["stamp", "certificate"]), joinedAt: now };
      if (old.status === "new" && raw.status === "accepted" && isTrade) {
        Object.assign(result, { status: "accepted", acceptedAt: now, participants: [self], [`${prefix}Id`]: actor.id, [`${prefix}Name`]: actor.name, [`${prefix}Role`]: actor.role, [`${prefix}Position`]: actor.position, [`${prefix}Stamp`]: String(raw[`${prefix}Stamp`] || self.stamp || ""), [`${prefix}Certificate`]: String(raw[`${prefix}Certificate`] || self.certificate || "") });
      } else if (["accepted", "returned"].includes(old.status) && raw.status === old.status && isTrade && !ownParticipant && (raw.participants || []).some(person => String(person?.id) === actor.id)) {
        result.participants = [...participants, self];
      } else if (["accepted", "returned"].includes(old.status) && raw.status === "awaitingAcceptance" && (admin || (isTrade && ownParticipant))) {
        Object.assign(result, pick(raw, ["material", "consumables", "jointPosition", "workComment", "resultPhoto", "blankSize", "machine", "operations", "madeQty", "goodQty", "rejectQty", "measurements", "rejectReason"]), { status: "awaitingAcceptance", completedAt: now, participants: participants.map(person => String(person.id) === actor.id ? { ...person, ...pick(rawSelf, ["stamp", "certificate"]) } : person) });
        if (String(old[`${prefix}Id`]) === actor.id) Object.assign(result, pick(raw, [`${prefix}Stamp`, `${prefix}Certificate`]));
      } else if (old.status === "awaitingAcceptance" && ["completed", "returned"].includes(raw.status)) {
        const selfRequested = participants.some(person => String(person.id) === String(old.createdById));
        if (!(admin || (selfRequested ? planner : String(old.createdById) === actor.id))) return preserve(section, old, raw);
        if (raw.status === "returned") {
          if (!String(raw.returnReason || "").trim()) return deny(section);
          Object.assign(result, { status: "returned", returnedAt: now, returnedById: actor.id, returnedByName: actor.name, returnReason: String(raw.returnReason).slice(0, 1000), completedAt: "" });
        } else {
          const signer = selfRequested ? "Engineer" : "Requester";
          Object.assign(result, { status: "completed", [`acceptedBy${signer}At`]: now, [`acceptedBy${signer}Id`]: actor.id, [`acceptedBy${signer}Name`]: actor.name });
        }
      } else return preserve(section, old, raw);
      result.updatedAt = now;
      return result;
    });
  }

  if (body.catalog?.equipment) {
    const override = activeUserPermission(user, "equipmentEdit");
    const result = {};
    for (const [id, raw] of Object.entries(object(body.catalog.equipment))) {
      const old = previous.catalog?.equipment?.[id];
      const allowed = (admin || ["engineer", "shop"].includes(role) || override) && (admin || override || old?.editingEnabled === true) && (role !== "shop" || override || hasArea(user, old?.area || raw?.area));
      if (!allowed) {
        if (old) result[id] = preserve("catalog", old, raw);
        else if (Object.keys(object(raw)).length) deny("catalog");
        continue;
      }
      result[id] = clone(raw);
      if (Object.hasOwn(raw, "editingEnabled")) {
        if (!admin) result[id].editingEnabled = Boolean(old?.editingEnabled);
        else if (Boolean(raw.editingEnabled) !== Boolean(old?.editingEnabled)) { result[id].editingEnabledAt = now; result[id].editingEnabledBy = actor.name; }
      }
      for (const pauses of [result[id].operationalPauses, ...Object.values(object(result[id].nodeOperationalPauses))]) {
        if (!Array.isArray(pauses)) continue;
        for (const pause of pauses) {
          const saved = [...(old?.operationalPauses || []), ...Object.values(object(old?.nodeOperationalPauses)).flat()].find(item => item.startedAt === pause.startedAt);
          pause.changedBy = saved?.changedBy || actor.name;
          if (pause.endedAt) pause.endedBy = saved?.endedBy || actor.name;
        }
      }
    }
    body.catalog = { equipment: result };
  }

  if (Object.hasOwn(body, "auditHistory")) {
    const oldById = new Map((previous.auditHistory || []).map(entry => [String(entry.id), entry]));
    body.auditHistory = (Array.isArray(body.auditHistory) ? body.auditHistory : []).map(entry => oldById.has(String(entry?.id)) ? preserve("auditHistory", oldById.get(String(entry.id)), entry) : { ...pick(entry, ["id", "action", "target", "reason", "details"]), at: now, userName: actor.name, userRole: actor.role });
  }
  if (Object.hasOwn(body, "systemBroadcasts")) body.systemBroadcasts = preserve("systemBroadcasts", previous.systemBroadcasts || [], body.systemBroadcasts);
  if (Object.hasOwn(body, "journalDueSince")) {
    body.journalDueSince = clone(previous.journalDueSince || {});
    for (const [key, section] of [["compressor", "compressorJournal"], ["gas", "gasJournal"]]) {
      if (body.journalDueSince[key] || !Object.hasOwn(incoming.journalDueSince || {}, key)) continue;
      const dates = Object.values(previous[section] || {}).map(row => String(row?.date || "")).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= now.slice(0, 10)).sort();
      body.journalDueSince[key] = dates[0] || now.slice(0, 10);
    }
  }
  // These are server maintenance cursors, never ordinary client mutations.
  body.walkShiftCleanupVersion = previous.walkShiftCleanupVersion || "";
  body.user = clone(user);
  return { body, ignoredSections: [...ignored] };
}

module.exports = { sanitizeStateMutation };
