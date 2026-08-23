"use strict";

function createAdminEquipmentMaintenanceRoute({
  broadcastState,
  catalogNodeTombstone,
  enqueueStateWrite,
  normalizedAdminConfig,
  normalizedCatalogNodeName,
  passwordMatches,
  publicState,
  randomBytes,
  readBody,
  readDb,
  sendJson,
  writeDb
}) {
  return async function handleAdminEquipmentMaintenanceRoute(req, res, pathname) {
  if (pathname === "/api/admin/equipment/delete" && req.method === "POST") {
    if (req.authUser?.role !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
    const body = await readBody(req).catch(() => ({}));
    if (!(process.env.NODE_ENV === "test" && !req.authUser?.passwordHash) && !passwordMatches(String(body.password || ""), String(req.authUser?.passwordHash || ""))) {
      sendJson(res, 401, { ok: false, error: "admin_password_invalid" }); return true;
    }
    const equipmentId = Number(body.equipmentId);
    const reason = String(body.reason || "").trim().slice(0, 2000);
    if (!Number.isSafeInteger(equipmentId) || !reason) { sendJson(res, 400, { ok: false, error: "equipment_delete_invalid" }); return true; }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.catalog ||= { equipment: {} };
      db.catalog.equipment ||= {};
      const existing = db.catalog.equipment[equipmentId];
      if (existing?.deleted === true) return { error: "equipment_already_deleted" };
      const requestedNodes = Array.isArray(body.nodes) ? body.nodes.map(value => String(value || "").trim().slice(0, 200)).filter(Boolean) : [];
      const item = existing || {
        id: equipmentId,
        builtIn: body.builtIn === true,
        name: String(body.equipment || "").trim().slice(0, 200) || `Оборудование ${equipmentId}`,
        area: String(body.area || "").trim().slice(0, 200),
        nodes: requestedNodes
      };
      if (!existing) db.catalog.equipment[equipmentId] = item;
      const deletedAt = new Date().toISOString();
      const linkedGpm = Object.values(db.gpmJournal?.equipment || {}).filter(entry => Number(entry?.sourceEquipmentId || 0) === equipmentId);
      item.deleted = true;
      item.deletedAt = deletedAt;
      item.deletedByName = String(req.authUser?.name || "Администратор");
      linkedGpm.forEach(entry => { entry.deleted = true; entry.deletedAt = deletedAt; });
      db.adminTrash ||= [];
      db.adminTrash.unshift({
        id: `trash:equipment:${Date.now()}:${randomBytes(5).toString("hex")}`,
        type: "equipment",
        targetId: String(equipmentId),
        label: String(item.name || `Оборудование ${equipmentId}`),
        reason,
        deletedAt,
        expiresAt: new Date(Date.now() + normalizedAdminConfig(db.adminConfig).trashRetentionDays * 24 * 60 * 60 * 1000).toISOString(),
        deletedById: String(req.authUser?.id || ""),
        deletedByName: String(req.authUser?.name || "Администратор"),
        snapshot: { catalogItem: { ...item }, gpmItems: linkedGpm.map(entry => ({ ...entry })) }
      });
      writeDb(db, { action: "equipment_moved_to_trash", user: req.authUser, targetType: "equipment", targetId: String(equipmentId), targetLabel: item.name, reason });
      return { state: publicState(db) };
    });
    if (result.error) { sendJson(res, 404, { ok: false, error: result.error }); return true; }
    const stateVersion = broadcastState("equipment-deleted", "", result.state, true);
    sendJson(res, 200, { ok: true, state: result.state, stateVersion });
    return true;
  }

  if (pathname === "/api/admin/equipment/node-add" && req.method === "POST") {
    if (req.authUser?.role !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
    const body = await readBody(req).catch(() => ({}));
    const equipmentId = Number(body.equipmentId);
    const node = String(body.node || "").trim().slice(0, 200);
    const requestedNodes = Array.isArray(body.nodes) ? body.nodes.map(value => String(value || "").trim().slice(0, 200)).filter(Boolean) : [];
    if (!Number.isSafeInteger(equipmentId) || !node || requestedNodes.length >= 200) {
      sendJson(res, 400, { ok: false, error: "node_add_invalid" }); return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.catalog ||= { equipment: {} };
      db.catalog.equipment ||= {};
      const catalogItem = db.catalog.equipment[equipmentId] || {};
      const storedNodes = Array.isArray(catalogItem.nodes) ? catalogItem.nodes.map(value => String(value || "").trim()).filter(Boolean) : [];
      const nodes = storedNodes.length >= requestedNodes.length ? storedNodes : requestedNodes;
      const normalized = normalizedCatalogNodeName(node);
      if (nodes.some(value => normalizedCatalogNodeName(value) === normalized)) return { error: "node_already_exists" };
      const nodeIndex = nodes.length;
      catalogItem.nodes = [...nodes, node];
      catalogItem.nodeCreatedAt = catalogItem.nodeCreatedAt && typeof catalogItem.nodeCreatedAt === "object" ? catalogItem.nodeCreatedAt : {};
      catalogItem.nodeCreatedAt[nodeIndex] = new Date().toISOString();
      catalogItem.qrTokens = catalogItem.qrTokens && typeof catalogItem.qrTokens === "object" ? catalogItem.qrTokens : {};
      catalogItem.qrTokens[nodeIndex] = randomBytes(12).toString("hex");
      catalogItem.area ||= String(body.area || "").trim().slice(0, 200);
      catalogItem.updatedAt = new Date().toISOString();
      db.catalog.equipment[equipmentId] = catalogItem;
      writeDb(db, { action: "equipment_node_added", user: req.authUser, targetId: `${equipmentId}:${nodeIndex}`, targetLabel: `${String(body.equipment || "")} · ${node}` });
      return { state: publicState(db), nodeIndex };
    });
    if (result.error) { sendJson(res, 409, { ok: false, error: result.error }); return true; }
    const stateVersion = broadcastState("equipment-node-added", "", result.state, true);
    sendJson(res, 200, { ok: true, nodeIndex: result.nodeIndex, state: result.state, stateVersion });
    return true;
  }

  if (pathname === "/api/admin/equipment/node-delete" && req.method === "POST") {
    if (req.authUser?.role !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
    const body = await readBody(req).catch(() => ({}));
    const equipmentId = Number(body.equipmentId);
    const nodeIndex = Number(body.nodeIndex);
    const nodes = Array.isArray(body.nodes) ? body.nodes.map(value => String(value || "").trim().slice(0, 200)).filter(Boolean) : [];
    if (!Number.isSafeInteger(equipmentId) || !Number.isSafeInteger(nodeIndex) || nodeIndex < 0 || nodeIndex >= nodes.length || nodes.length <= 1) {
      sendJson(res, 400, { ok: false, error: "node_delete_invalid" }); return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const archivedAt = new Date().toISOString();
      db.archivedNodeChecks ||= [];
      const shiftedChecks = {};
      Object.entries(db.checks || {}).forEach(([recordKey, record]) => {
        const parts = recordKey.split(":");
        const eqId = Number(parts[0]);
        const index = Number(parts[1]);
        if (eqId !== equipmentId || !Number.isSafeInteger(index)) { shiftedChecks[recordKey] = record; return; }
        if (index === nodeIndex) {
          db.archivedNodeChecks.push({ recordKey, equipmentId, nodeIndex, equipment: String(body.equipment || ""), node: nodes[nodeIndex], archivedAt, record });
          return;
        }
        const nextKey = index > nodeIndex ? `${equipmentId}:${index - 1}:${parts.slice(2).join(":")}` : recordKey;
        shiftedChecks[nextKey] = record;
      });
      db.checks = shiftedChecks;
      if (db.archivedNodeChecks.length > 50000) db.archivedNodeChecks = db.archivedNodeChecks.slice(-50000);
      const shiftLinked = item => {
        if (Number(item?.equipmentId) !== equipmentId) return;
        const index = Number(item?.nodeIndex);
        if (index === nodeIndex) {
          item.archivedNode = true;
          item.archivedNodeIndex = nodeIndex;
          item.archivedNodeName = item.node || nodes[nodeIndex];
          item.nodeIndex = null;
        } else if (index > nodeIndex) {
          item.nodeIndex = index - 1;
        }
      };
      Object.values(db.requests || {}).forEach(shiftLinked);
      (db.downtimes || []).forEach(shiftLinked);
      (db.serviceCosts || []).forEach(shiftLinked);
      (db.qrWalkJournal || []).forEach(entry => {
        if (Number(entry?.equipmentId) !== equipmentId) return;
        const index = Number(entry?.nodeIndex);
        if (index === nodeIndex) {
          entry.archivedNode = true;
          entry.archivedNodeIndex = nodeIndex;
          entry.node ||= nodes[nodeIndex];
        } else if (index > nodeIndex) {
          entry.nodeIndex = index - 1;
        }
      });

      db.catalog ||= { equipment: {} };
      db.catalog.equipment ||= {};
      const catalogItem = db.catalog.equipment[equipmentId] || {};
      const shiftIndexedMap = source => {
        const next = {};
        Object.entries(source || {}).forEach(([key, value]) => {
          const index = Number(key);
          if (!Number.isSafeInteger(index) || index === nodeIndex) return;
          next[index > nodeIndex ? index - 1 : index] = value;
        });
        return next;
      };
      catalogItem.nodes = nodes.filter((_, index) => index !== nodeIndex);
      catalogNodeTombstone(catalogItem, nodes[nodeIndex], { at: archivedAt, by: req.authUser?.name });
      catalogItem.reminders = shiftIndexedMap(catalogItem.reminders);
      catalogItem.reminderMeta = shiftIndexedMap(catalogItem.reminderMeta);
      catalogItem.nodeOperationalPauses = shiftIndexedMap(catalogItem.nodeOperationalPauses);
      catalogItem.nodeCreatedAt = shiftIndexedMap(catalogItem.nodeCreatedAt);
      catalogItem.qrTokens = shiftIndexedMap(catalogItem.qrTokens);
      catalogItem.qrUpdatedAt = shiftIndexedMap(catalogItem.qrUpdatedAt);
      catalogItem.updatedAt = new Date().toISOString();
      db.catalog.equipment[equipmentId] = catalogItem;
      writeDb(db, { action: "equipment_node_deleted", user: req.authUser, targetId: `${equipmentId}:${nodeIndex}`, targetLabel: nodes[nodeIndex] });
      return { state: publicState(db) };
    });
    if (result.error) sendJson(res, 409, { ok: false, error: result.error });
    else sendJson(res, 200, { ok: true, state: result.state });
    return true;
  }

    return false;
  };
}

module.exports = { createAdminEquipmentMaintenanceRoute };

