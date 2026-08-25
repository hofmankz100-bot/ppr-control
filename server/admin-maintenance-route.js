"use strict";

function createAdminMaintenanceRoute(dependencies = {}) {
  const {
    broadcastState,
    createManualBackup,
    enqueueStateWrite,
    passwordMatches,
    readBody,
    readDb,
    sendJson,
    publicState,
    writeDb,
    allowPasswordlessTestAuth = false,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminMaintenanceRoute(req, res, pathname) {
    if (pathname !== "/api/admin/maintenance" || req.method !== "POST") return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    if (!(allowPasswordlessTestAuth && !req.authUser?.passwordHash)
      && !passwordMatches(String(body.password || ""), String(req.authUser?.passwordHash || ""))) {
      sendJson(res, 401, { ok: false, error: "admin_password_invalid" });
      return true;
    }
    const action = String(body.action || "");
    const trashId = String(body.trashId || "");
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const item = (db.adminTrash || []).find(entry => entry.id === trashId);
      if (!item) return { error: "trash_item_not_found" };

      if (action === "restore") {
        if (item.restoredAt) return { error: "trash_item_already_restored" };
        if (item.type === "user") {
          const snapshot = item.snapshot || {};
          const conflict = (db.users || []).some(user =>
            (snapshot.id && user.id === snapshot.id)
            || (snapshot.employeeId && user.employeeId === snapshot.employeeId)
            || (snapshot.phone && user.phone === snapshot.phone));
          if (conflict) return { error: "restore_conflict" };
          db.users ||= [];
          db.users.push(snapshot);
        } else if (item.type === "equipment") {
          const snapshot = item.snapshot || {};
          const catalogItem = snapshot.catalogItem;
          const equipmentId = Number(item.targetId);
          if (!catalogItem || !Number.isSafeInteger(equipmentId)) return { error: "restore_snapshot_invalid" };
          db.catalog ||= { equipment: {} };
          db.catalog.equipment ||= {};
          const active = db.catalog.equipment[equipmentId];
          if (active && active.deleted !== true) return { error: "restore_conflict" };
          const restoredAt = new Date(now()).toISOString();
          db.catalog.equipment[equipmentId] = {
            ...catalogItem,
            id: equipmentId,
            deleted: false,
            deletedAt: "",
            deletedByName: "",
            restoredAt
          };
          db.gpmJournal ||= { equipment: {}, inspections: {}, events: {}, managers: {} };
          db.gpmJournal.equipment ||= {};
          (snapshot.gpmItems || []).forEach(gpm => {
            if (!gpm?.id) return;
            db.gpmJournal.equipment[gpm.id] = { ...gpm, deleted: false, deletedAt: "", restoredAt };
          });
          const linkedGpmIds = new Set((snapshot.gpmItems || []).map(gpm => String(gpm?.id || "")).filter(Boolean));
          const restoreEquipmentLinked = (target, snapshots) => {
            (snapshots || []).forEach(entry => {
              if (!entry?.id || !linkedGpmIds.has(String(entry.gpmId || ""))) return;
              target[entry.id] = { ...entry, deleted: false, deletedAt: "", restoredAt, updatedAt: restoredAt };
            });
            Object.values(target).forEach(entry => {
              if (!linkedGpmIds.has(String(entry?.gpmId || ""))) return;
              entry.deleted = false; entry.deletedAt = ""; entry.restoredAt = restoredAt; entry.updatedAt = restoredAt;
            });
          };
          db.gpmJournal.inspections ||= {};
          db.gpmJournal.events ||= {};
          restoreEquipmentLinked(db.gpmJournal.inspections, snapshot.gpmInspections);
          restoreEquipmentLinked(db.gpmJournal.events, snapshot.gpmEvents);
        } else if (item.type === "gpm") {
          const snapshot = item.snapshot || {};
          const gpmItem = snapshot.gpmItem;
          const gpmId = String(item.targetId || gpmItem?.id || "").trim();
          if (!gpmId || !gpmItem) return { error: "restore_snapshot_invalid" };
          db.gpmJournal ||= { equipment: {}, inspections: {}, events: {}, managers: {} };
          db.gpmJournal.equipment ||= {};
          db.gpmJournal.inspections ||= {};
          db.gpmJournal.events ||= {};
          const active = db.gpmJournal.equipment[gpmId];
          if (active && active.deleted !== true) return { error: "restore_conflict" };
          const restoredAt = new Date(now()).toISOString();
          db.gpmJournal.equipment[gpmId] = {
            ...gpmItem,
            id: gpmId,
            deleted: false,
            deletedAt: "",
            deletedByName: "",
            restoredAt,
            updatedAt: restoredAt
          };
          const restoreLinked = (target, snapshots) => {
            (snapshots || []).forEach(entry => {
              if (!entry?.id || String(entry.gpmId || "") !== gpmId) return;
              target[entry.id] = { ...entry, deleted: false, deletedAt: "", restoredAt, updatedAt: restoredAt };
            });
            Object.values(target).forEach(entry => {
              if (String(entry?.gpmId || "") !== gpmId) return;
              entry.deleted = false;
              entry.deletedAt = "";
              entry.restoredAt = restoredAt;
              entry.updatedAt = restoredAt;
            });
          };
          restoreLinked(db.gpmJournal.inspections, snapshot.gpmInspections);
          restoreLinked(db.gpmJournal.events, snapshot.gpmEvents);
        } else {
          return { error: "restore_type_not_supported" };
        }
        item.restoredAt = new Date(now()).toISOString();
        item.restoredByName = String(req.authUser?.name || "Администратор");
        writeDb(db, {
          action: "trash_restore",
          user: req.authUser,
          targetType: item.type,
          targetId: item.targetId,
          targetLabel: item.label,
          reason: String(body.reason || "Восстановление из корзины")
        });
        return { restored: true, targetType: item.type, state: typeof publicState === "function" ? publicState(db) : null };
      }

      if (action === "purge") {
        if (String(body.confirm || "").trim().toUpperCase() !== "УДАЛИТЬ НАВСЕГДА") {
          return { error: "purge_confirmation_required" };
        }
        createManualBackup("before-trash-purge");
        if (item.type === "equipment") {
          const equipmentId = Number(item.targetId);
          const linkedGpmIds = new Set((item.snapshot?.gpmItems || []).map(gpm => String(gpm?.id || "")).filter(Boolean));
          if (Number.isSafeInteger(equipmentId) && db.catalog?.equipment?.[equipmentId]?.deleted === true) {
            if (item.snapshot?.catalogItem?.builtIn === true) {
              db.catalog.equipment[equipmentId] = {
                id: equipmentId,
                builtIn: true,
                deleted: true,
                purged: true,
                purgedAt: new Date(now()).toISOString()
              };
            } else {
              delete db.catalog.equipment[equipmentId];
            }
          }
          Object.keys(db.gpmJournal?.equipment || {}).forEach(id => {
            const gpm = db.gpmJournal.equipment[id];
            if (Number(gpm?.sourceEquipmentId || 0) === equipmentId && gpm.deleted === true) {
              linkedGpmIds.add(String(gpm.id || id));
              delete db.gpmJournal.equipment[id];
            }
          });
          [db.gpmJournal?.inspections, db.gpmJournal?.events].forEach(collection => {
            Object.keys(collection || {}).forEach(id => {
              if (linkedGpmIds.has(String(collection[id]?.gpmId || ""))) delete collection[id];
            });
          });
        } else if (item.type === "gpm") {
          const gpmId = String(item.targetId || item.snapshot?.gpmItem?.id || "").trim();
          if (!gpmId) return { error: "restore_snapshot_invalid" };
          if (db.gpmJournal?.equipment?.[gpmId]?.deleted === true) {
            delete db.gpmJournal.equipment[gpmId];
          }
          [db.gpmJournal?.inspections, db.gpmJournal?.events].forEach(collection => {
            Object.keys(collection || {}).forEach(id => {
              if (String(collection[id]?.gpmId || "") === gpmId) delete collection[id];
            });
          });
        }
        db.adminTrash = (db.adminTrash || []).filter(entry => entry.id !== trashId);
        writeDb(db, {
          action: "trash_purge",
          user: req.authUser,
          targetType: item.type,
          targetId: item.targetId,
          targetLabel: item.label,
          reason: String(body.reason || "Окончательное удаление")
        });
        return { purged: true, targetType: item.type, state: typeof publicState === "function" ? publicState(db) : null };
      }
      return { error: "maintenance_action_invalid" };
    });
    if (result.error) sendJson(res, 400, { ok: false, error: result.error });
    else {
      const shouldBroadcast = ["equipment", "gpm"].includes(result.targetType) && result.state && typeof broadcastState === "function";
      const stateVersion = shouldBroadcast
        ? broadcastState(result.restored ? "trash-restored" : "trash-purged", "", result.state, true)
        : "";
      sendJson(res, 200, {
        ok: true,
        ...(result.restored ? { restored: true } : {}),
        ...(result.purged ? { purged: true } : {}),
        ...(stateVersion ? { stateVersion } : {})
      });
    }
    return true;
  };
}

module.exports = { createAdminMaintenanceRoute };
