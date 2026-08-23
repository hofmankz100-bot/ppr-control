"use strict";

function createAdminEquipmentQrRoute(dependencies = {}) {
  const {
    broadcastState,
    enqueueStateWrite,
    randomBytes,
    readBody,
    readDb,
    sendJson,
    writeDb,
    now = () => Date.now()
  } = dependencies;

  return async function handleAdminEquipmentQrRoute(req, res, pathname) {
    if (pathname !== "/api/admin/equipment/node-qr-rotate" || req.method !== "POST") return false;

    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    const equipmentId = Number(body.equipmentId);
    const nodeIndex = Number(body.nodeIndex);
    if (!Number.isSafeInteger(equipmentId) || !Number.isSafeInteger(nodeIndex) || nodeIndex < 0) {
      sendJson(res, 400, { ok: false, error: "node_qr_rotate_invalid" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const item = db.catalog?.equipment?.[String(equipmentId)];
      if (!item || !Array.isArray(item.nodes) || !item.nodes[nodeIndex]) return { error: "node_not_found" };
      item.qrTokens = item.qrTokens && typeof item.qrTokens === "object" ? item.qrTokens : {};
      item.qrTokens[nodeIndex] = randomBytes(12).toString("hex");
      item.qrUpdatedAt = item.qrUpdatedAt && typeof item.qrUpdatedAt === "object" ? item.qrUpdatedAt : {};
      item.qrUpdatedAt[nodeIndex] = new Date(now()).toISOString();
      item.updatedAt = item.qrUpdatedAt[nodeIndex];
      writeDb(db, {
        action: "equipment_node_qr_rotated",
        user: req.authUser,
        targetId: `${equipmentId}:${nodeIndex}`,
        targetLabel: item.nodes[nodeIndex]
      });
      return { item };
    });
    if (result.error) {
      sendJson(res, 404, { ok: false, error: result.error });
      return true;
    }
    const patch = { catalog: { equipment: { [String(equipmentId)]: result.item } } };
    const stateVersion = broadcastState("node-qr-rotate", "", patch, true);
    sendJson(res, 200, { ok: true, item: result.item, stateVersion });
    return true;
  };
}

module.exports = { createAdminEquipmentQrRoute };
