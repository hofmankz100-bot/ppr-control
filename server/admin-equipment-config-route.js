"use strict";

function createAdminEquipmentConfigRoute({
  broadcastState,
  enqueueStateWrite,
  now = () => new Date(),
  publicState,
  randomBytes,
  readBody,
  readDb,
  sendJson,
  writeDb
}) {
  return async function handleAdminEquipmentConfigRoute(req, res, pathname) {
    const isCreate = pathname === "/api/admin/equipment/create" && req.method === "POST";
    const isJournalSchema = pathname === "/api/admin/equipment/journal-schema" && req.method === "POST";
    if (!isCreate && !isJournalSchema) return false;
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }

    const body = await readBody(req).catch(() => ({}));
    if (isCreate) {
      // Forklifts are ordinary equipment now. A fleet is represented by one
      // catalog card and every forklift is one of its QR nodes.
      const type = "ordinary";
      const name = String(body.name || "").trim().slice(0, 200);
      const area = String(body.area || "").trim().slice(0, 200);
      const firstNode = String(body.firstNode || "").trim().slice(0, 200) || "Основное оборудование";
      const capacity = String(body.capacity || "").trim().slice(0, 100);
      if (!name || !area) {
        sendJson(res, 400, { ok: false, error: "equipment_create_invalid" });
        return true;
      }
      const result = await enqueueStateWrite(async () => {
        const db = readDb();
        db.catalog ||= { equipment: {} };
        db.catalog.equipment ||= {};
        const duplicate = Object.values(db.catalog.equipment).some(item => item?.deleted !== true
          && String(item?.name || "").trim().toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU")
          && String(item?.area || "").trim().toLocaleLowerCase("ru-RU") === area.toLocaleLowerCase("ru-RU"));
        if (duplicate) return { error: "equipment_already_exists" };
        const usedIds = Object.keys(db.catalog.equipment).map(Number).filter(Number.isSafeInteger);
        const equipmentId = Math.max(999, ...usedIds) + 1;
        const createdAt = now();
        const timestamp = createdAt.toISOString();
        const nodes = [type === "ordinary" ? firstNode : "Вахтенный осмотр кран-балки"];
        const catalogItem = {
          id: equipmentId,
          created: true,
          createdAt: timestamp,
          createdByName: String(req.authUser?.name || "Администратор"),
          updatedAt: timestamp,
          name,
          area,
          equipmentKind: type,
          nodes,
          nodeCreatedAt: { 0: timestamp },
          qrTokens: { 0: randomBytes(12).toString("hex") },
          reminders: {},
          reminderMeta: {},
          operationalPauses: [],
          nodeOperationalPauses: {}
        };
        db.catalog.equipment[equipmentId] = catalogItem;
        let gpmId = "";
        if (type !== "ordinary") {
          db.gpmJournal ||= { equipment: {}, inspections: {}, events: {}, managers: {} };
          db.gpmJournal.equipment ||= {};
          gpmId = `gpm:${createdAt.getTime()}:${randomBytes(5).toString("hex")}`;
          const due = new Date(createdAt.getTime());
          due.setDate(due.getDate() + 30);
          if (due.getDay() === 6) due.setDate(due.getDate() + 2);
          if (due.getDay() === 0) due.setDate(due.getDate() + 1);
          const dueDate = due.toISOString().slice(0, 10);
          db.gpmJournal.equipment[gpmId] = {
            id: gpmId,
            sourceEquipmentId: equipmentId,
            sourceEquipmentName: name,
            equipmentKind: type,
            name,
            location: area,
            capacity,
            operationStatus: "allowed",
            inspectorKeys: [],
            engineerKeys: [],
            nextMonthlyInspectionDate: dueDate,
            nextMaintenanceDate: "",
            createdAt: timestamp,
            updatedAt: timestamp,
            updatedByName: String(req.authUser?.name || "Администратор")
          };
        }
        writeDb(db, { action: "equipment_created", user: req.authUser, targetId: String(equipmentId), targetLabel: `${name} · ${area}` });
        return { state: publicState(db), equipmentId, gpmId };
      });
      if (result.error) sendJson(res, 409, { ok: false, error: result.error });
      else {
        const stateVersion = broadcastState("equipment-created", "", result.state, true);
        sendJson(res, 200, { ok: true, equipmentId: result.equipmentId, gpmId: result.gpmId, state: result.state, stateVersion });
      }
      return true;
    }

    const equipmentId = Number(body.equipmentId);
    const fieldsTiming = String(body.fieldsTiming || "immediate") === "afterChoice" ? "afterChoice" : "immediate";
    const resultMode = ["both", "goodOnly", "remarkOnly", "none"].includes(String(body.resultMode || "")) ? String(body.resultMode) : "both";
    const frequency = String(body.frequency || "twoShifts") === "daily" ? "daily" : "twoShifts";
    const title = String(body.title || "").trim().slice(0, 200);
    const scope = String(body.scope || "equipment") === "node" ? "node" : "equipment";
    const journalNodeIndex = Number(body.journalNodeIndex);
    const allowedTypes = new Set(["autoDate", "autoTime", "autoShift", "autoEmployee", "autoEquipment", "autoNode", "result", "text", "number", "checkbox", "select", "signature"]);
    const columns = Array.isArray(body.columns) ? body.columns.slice(0, 30).map((column, index) => {
      const type = allowedTypes.has(String(column?.type || "")) ? String(column.type) : "text";
      const requestedNode = column?.nodeIndex === "all" ? "all" : Number(column?.nodeIndex);
      return {
        id: String(column?.id || `column-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `column-${index + 1}`,
        label: String(column?.label || "").trim().slice(0, 120),
        type,
        required: column?.required === true,
        nodeIndex: requestedNode === "all" || (Number.isSafeInteger(requestedNode) && requestedNode >= 0 && requestedNode <= 500) ? requestedNode : "all",
        options: type === "select" ? String(column?.options || "").split(/[,;\n]/).map(value => value.trim().slice(0, 80)).filter(Boolean).slice(0, 30) : []
      };
    }).filter(column => column.label) : [];
    if (!Number.isSafeInteger(equipmentId) || !title || !columns.length) {
      sendJson(res, 400, { ok: false, error: "journal_schema_invalid" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const item = db.catalog?.equipment?.[equipmentId];
      if (!item || item.deleted === true) return { error: "equipment_not_found" };
      if (item.created !== true || String(item.equipmentKind || "ordinary") !== "ordinary") return { error: "journal_schema_protected" };
      item.journalSchema = {
        version: Number(item.journalSchema?.version || 0) + 1,
        title,
        scope,
        nodeIndex: scope === "node" && Number.isSafeInteger(journalNodeIndex) && journalNodeIndex >= 0 && journalNodeIndex < (item.nodes?.length || 0) ? journalNodeIndex : null,
        fieldsTiming: resultMode === "none" ? "immediate" : fieldsTiming,
        resultMode,
        frequency,
        columns,
        updatedAt: now().toISOString(),
        updatedByName: String(req.authUser?.name || "Администратор").slice(0, 200)
      };
      item.updatedAt = item.journalSchema.updatedAt;
      writeDb(db, { action: "equipment_journal_schema_updated", user: req.authUser, targetId: String(equipmentId), targetLabel: title, version: item.journalSchema.version });
      return { state: publicState(db), schema: item.journalSchema };
    });
    if (result.error) sendJson(res, result.error === "equipment_not_found" ? 404 : 409, { ok: false, error: result.error });
    else {
      const stateVersion = broadcastState("equipment-journal-schema-updated", "", result.state, true);
      sendJson(res, 200, { ok: true, schema: result.schema, state: result.state, stateVersion });
    }
    return true;
  };
}

module.exports = { createAdminEquipmentConfigRoute };
