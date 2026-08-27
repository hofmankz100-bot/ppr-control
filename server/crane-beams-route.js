"use strict";

const crypto = require("crypto");

const DEFAULT_CHECKLIST = [
  "Металлоконструкция и крепления",
  "Болтовые и сварные соединения",
  "Крюк и предохранительный замок",
  "Канат, цепь и крепление",
  "Барабан и направляющие",
  "Тормозной механизм",
  "Редуктор и привод",
  "Электродвигатель",
  "Концевые выключатели",
  "Пульт управления",
  "Аварийная остановка",
  "Звуковая сигнализация",
  "Кабели и токоподвод",
  "Заземление",
  "Отсутствие посторонних шумов и вибрации",
  "Рабочая зона и путь перемещения"
];

function text(value, limit = 300) { return String(value || "").trim().slice(0, limit); }
function roleOf(user = {}) {
  const role = text(user.permissionRole || user.role || user.jobRole, 80);
  return ["safetyEngineer", "energyEngineer", "designEngineer", "mechanicalEngineer", "instrumentationEngineer"].includes(role) ? "engineer" : role;
}
function userAreas(user = {}) { return [...new Set([user.area, ...(Array.isArray(user.areas) ? user.areas : [])].map(value => text(value, 200)).filter(Boolean))]; }
function same(value, expected) { return text(value).toLocaleLowerCase("ru-RU") === text(expected).toLocaleLowerCase("ru-RU"); }
function actor(user = {}) { return { id: text(user.id || user.employeeId, 120), employeeId: text(user.employeeId, 80), name: text(user.name || "Сотрудник", 200), role: roleOf(user), jobRole: text(user.jobRole, 100), area: text(user.area, 200) }; }
function newId(prefix) { return `${prefix}:${Date.now()}:${crypto.randomBytes(5).toString("hex")}`; }

function archivedQrAliases(saved = {}) {
  const sourceEquipmentId = Number(saved.sourceEquipmentId);
  const match = /^catalog:(\d+):(\d+)$/u.exec(text(saved.id, 120));
  const equipmentId = sourceEquipmentId || Number(match?.[1]);
  const nodeIndex = Number(match?.[2]);
  if (!Number.isInteger(equipmentId) || equipmentId <= 0 || !Number.isInteger(nodeIndex) || nodeIndex < 0) return [];
  const lowerToken = text(saved.lowerQrToken, 200);
  const upperToken = text(saved.upperQrToken, 200);
  return [
    { type: "shift", payload: `PPRQR|NODE|${equipmentId}|${nodeIndex}${lowerToken ? `|${lowerToken}` : ""}` },
    { type: "monthly", payload: `PPRQR|NODE|${equipmentId}|${nodeIndex}${upperToken ? `|${upperToken}` : ""}|upper` }
  ];
}

function normalized(value) {
  return text(value, 300).toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/[^a-zа-я0-9]+/giu, " ").trim();
}

function workshopHint(asset = {}) {
  const source = normalized(`${asset.name || ""} ${asset.workshop || ""} ${asset.installationPlace || ""}`);
  if (/\bсгп\b/u.test(source)) return "сгп";
  if (/литейн/u.test(source)) return "литейн";
  if (/анод/u.test(source)) return "анод";
  if (/покрас|ванн/u.test(source)) return "покрас";
  if (/инструмент|цианизац/u.test(source)) return "инструмент";
  if (/пресс|матриц|\b1540\b|\b2400\b/u.test(source)) return "пресс";
  return "";
}

function resolveWorkshop(asset = {}, equipment = {}) {
  const entries = Object.entries(equipment || {}).filter(([, card]) => card && card.deleted !== true && card.equipmentKind !== "craneBeam");
  const source = normalized(`${asset.name || ""} ${asset.workshop || ""} ${asset.installationPlace || ""}`);
  const preferredParent = entries.find(([id]) => String(id) === String(asset.preferredParentEquipmentId || ""));
  const savedParent = entries.find(([id]) => String(id) === String(asset.parentEquipmentId || ""));
  const numberedParent = /\b1540\b/u.test(source)
    ? entries.find(([, card]) => normalized(card.name).includes("1540"))
    : /\b2400\b/u.test(source) ? entries.find(([, card]) => normalized(card.name).includes("2400")) : null;
  const areas = entries.flatMap(([id, card]) => [
    { id, card, value: text(card.area, 200) },
    { id, card, value: text(card.name, 200) }
  ]).filter(item => item.value && source.includes(normalized(item.value))).sort((a, b) => normalized(b.value).length - normalized(a.value).length);
  const hint = workshopHint(asset);
  const hintedParent = hint ? entries.find(([, card]) => normalized(`${card.name || ""} ${card.area || ""}`).includes(hint)) : null;
  const parent = preferredParent || savedParent || numberedParent || areas[0] && [areas[0].id, areas[0].card] || hintedParent;
  if (!parent) return null;
  const [parentEquipmentId, card] = parent;
  return { parentEquipmentId: String(parentEquipmentId), workshop: text(card.area || card.name, 200), parentName: text(card.name, 200) };
}

function removeLegacyCraneNodes(db, excludedAssetIds = new Set()) {
  Object.values(db.catalog?.equipment || {}).forEach(card => {
    if (!card?.craneBeamNodes || typeof card.craneBeamNodes !== "object") return;
    const removedIndexes = new Set(Object.entries(card.craneBeamNodes)
      .filter(([, craneId]) => !excludedAssetIds.has(String(craneId)))
      .map(([index]) => Number(index)).filter(Number.isInteger));
    if (removedIndexes.size && Array.isArray(card.nodes)) {
      card.nodes = card.nodes.filter((_, index) => !removedIndexes.has(index));
      ["reminders", "reminderMeta", "nodeOperationalPauses", "nodeCreatedAt", "qrTokens", "upperQrTokens", "qrUpdatedAt"].forEach(field => {
        if (!card[field] || typeof card[field] !== "object") return;
        const shifted = {};
        Object.entries(card[field]).forEach(([rawIndex, value]) => {
          const index = Number(rawIndex);
          if (!Number.isInteger(index) || removedIndexes.has(index)) return;
          const nextIndex = index - [...removedIndexes].filter(removed => removed < index).length;
          shifted[nextIndex] = value;
        });
        card[field] = shifted;
      });
    }
    delete card.craneBeamNodes;
  });
}

function ensureCraneBeams(db, builtInEquipment = {}) {
  db.craneBeams ||= { schemaVersion: 1, assets: {}, inspections: {}, defects: {}, installationJournal: {}, corrections: {}, unresolvedArchive: {}, migrationVersion: "" };
  db.craneBeams.schemaVersion = 1;
  for (const key of ["assets", "inspections", "defects", "installationJournal", "corrections", "unresolvedArchive"]) db.craneBeams[key] ||= {};
  const equipmentReference = { ...(builtInEquipment || {}), ...(db.catalog?.equipment || {}) };
  const removedNestedEquipmentIds = new Set();
  Object.entries(db.catalog?.equipment || {}).forEach(([equipmentId, card]) => {
    if (card?.equipmentKind !== "craneBeam") return;
    removedNestedEquipmentIds.add(Number(equipmentId));
    delete db.catalog.equipment[equipmentId];
  });
  Object.values(db.catalog?.equipment || {}).forEach(card => {
    if (Array.isArray(card?.childEquipmentIds)) card.childEquipmentIds = card.childEquipmentIds.filter(id => !removedNestedEquipmentIds.has(Number(id)));
  });
  Object.values(db.craneBeams.assets).forEach(asset => {
    if (!asset) return;
    delete asset.catalogEquipmentId;
  });
  const ordinaryNodeAssetIds = new Set(Object.values(db.craneBeams.assets)
    .filter(asset => asset && /финишн(?:ая|ый)?\s*пил/iu.test(text(asset.name, 240)))
    .map(asset => String(asset.id)));
  if (ordinaryNodeAssetIds.size) {
    ordinaryNodeAssetIds.forEach(id => delete db.craneBeams.assets[id]);
    Object.values(db.catalog?.equipment || {}).forEach(card => {
      if (!card?.craneBeamNodes) return;
      Object.entries(card.craneBeamNodes).forEach(([index, craneId]) => {
        if (ordinaryNodeAssetIds.has(String(craneId))) delete card.craneBeamNodes[index];
      });
    });
    Object.entries(db.craneBeams.inspections).forEach(([id, row]) => {
      if (ordinaryNodeAssetIds.has(String(row?.craneId))) delete db.craneBeams.inspections[id];
    });
    Object.entries(db.craneBeams.defects).forEach(([id, row]) => {
      if (ordinaryNodeAssetIds.has(String(row?.craneId))) delete db.craneBeams.defects[id];
    });
    Object.entries(db.craneBeams.installationJournal).forEach(([id, row]) => {
      if (ordinaryNodeAssetIds.has(String(row?.craneId))) delete db.craneBeams.installationJournal[id];
    });
  }
  removeLegacyCraneNodes(db, ordinaryNodeAssetIds);
  Object.entries(db.craneBeams.unresolvedArchive).forEach(([id, saved]) => {
    if (!resolveWorkshop(saved, equipmentReference)) return;
    db.craneBeams.assets[id] = { ...saved };
    delete db.craneBeams.assets[id].archiveStatus;
    delete db.craneBeams.assets[id].archivedAt;
    delete db.craneBeams.unresolvedArchive[id];
  });
  const archivedById = new Map((Array.isArray(db.retiredCraneBeamArchive?.assets) ? db.retiredCraneBeamArchive.assets : []).map(item => [String(item?.id || ""), item]));
  Object.entries(db.craneBeams.assets).forEach(([id, asset]) => {
    if (!asset) return;
    const resolved = resolveWorkshop(asset, equipmentReference);
    if (!resolved) {
      db.craneBeams.unresolvedArchive[id] = { ...asset, archiveStatus: "workshop_unresolved", archivedAt: asset.archivedAt || new Date().toISOString() };
      delete db.craneBeams.assets[id];
      return;
    }
    asset.workshop = resolved.workshop;
    asset.parentWorkshop = resolved.workshop;
    asset.parentEquipmentId = resolved.parentEquipmentId;
    asset.parentEquipmentName = resolved.parentName;
    asset.entityType = "nestedEquipment";
    asset.lowerQrToken ||= crypto.randomBytes(12).toString("hex");
    asset.upperQrToken ||= crypto.randomBytes(12).toString("hex");
    asset.pausePeriods = Array.isArray(asset.pausePeriods) ? asset.pausePeriods : [];
    const archivedSource = archivedById.get(String(id));
    if (archivedSource) asset.legacyQrAliases = archivedQrAliases(archivedSource);
    if (asset.checklistSchemaVersion !== 2) {
      const previousChecklist = Array.isArray(asset.checklist) ? asset.checklist.map(item => ({ ...item })) : [];
      if (previousChecklist.length) {
        asset.checklistHistory ||= [];
        asset.checklistHistory.push({ version: Number(asset.checklistVersion || 1), checklist: previousChecklist, retiredAt: new Date().toISOString() });
      }
      asset.checklistVersion = Math.max(2, Number(asset.checklistVersion || 1) + (previousChecklist.length ? 1 : 0));
      asset.checklist = DEFAULT_CHECKLIST.map((label, itemIndex) => ({ id: `check-${itemIndex + 1}`, label }));
      asset.checklistSchemaVersion = 2;
    }
    delete asset.parentNodeIndex;
    delete db.craneBeams.unresolvedArchive[id];
  });
  if (db.craneBeams.migrationVersion === "retired-archive-v1") return false;
  const archived = Array.isArray(db.retiredCraneBeamArchive?.assets) ? db.retiredCraneBeamArchive.assets : [];
  const now = new Date().toISOString();
  archived.forEach((saved, index) => {
    const id = text(saved.id, 120) || `crane-${index + 1}`;
    if (db.craneBeams.assets[id]) return;
    const resolved = resolveWorkshop(saved, equipmentReference);
    if (!resolved) {
      db.craneBeams.unresolvedArchive[id] = { ...saved, id, archiveStatus: "workshop_unresolved", archivedAt: now };
      return;
    }
    const workshop = resolved.workshop;
    const asset = {
      id, name: text(saved.name, 200) || `Кран-балка ${index + 1}`, workshop, parentWorkshop: workshop, entityType: "nestedEquipment",
      parentEquipmentId: resolved.parentEquipmentId, parentEquipmentName: resolved.parentName,
      inventoryNumber: text(saved.inventoryNumber, 120), installationPlace: text(saved.installationPlace || saved.workshop, 240),
      installationDate: text(saved.installationDate, 10), installationStatus: "installed", installed: true,
      lowerQr: text(saved.lowerQr, 300) || `PPRGPM|SHIFT|${id}`,
      upperQr: text(saved.upperQr, 300) || `PPRGPM|MONTHLY|${id}`,
      legacyQrAliases: archivedQrAliases(saved),
      checklistVersion: 1, checklistSchemaVersion: 2, checklist: DEFAULT_CHECKLIST.map((label, itemIndex) => ({ id: `check-${itemIndex + 1}`, label })),
      monthlyDay: 1, createdAt: now, restoredFromArchive: true, operationalPaused: false
    };
    db.craneBeams.assets[id] = asset;
    const eventId = `installation:restored:${id}`;
    db.craneBeams.installationJournal[eventId] = { id: eventId, craneId: id, action: "restored", status: "installed", workshop, place: asset.installationPlace, date: asset.installationDate, at: now, byName: "Система", comment: "Восстановлено из защищённого архива" };
  });
  db.craneBeams.migrationVersion = "retired-archive-v1";
  return archived.length > 0;
}

function canInspect(user, asset, type) {
  const role = roleOf(user);
  const activeRegisteredUser = Boolean(user?.id || user?.employeeId) && Boolean(role) && user?.approved !== false && user?.pendingApproval !== true && user?.disabled !== true && user?.deleted !== true;
  if (!activeRegisteredUser) return false;
  if (type === "monthly") return role === "engineer" || ["mechanic", "electrician"].includes(role);
  return true;
}

function closesCounter(user, asset, type) {
  const role = roleOf(user);
  if (type === "monthly") return role === "engineer" || ["mechanic", "electrician"].includes(role);
  return ["operator", "shop"].includes(role) && userAreas(user).some(area => same(area, asset.workshop));
}

function publicCraneState(db, user, builtInEquipment = {}) {
  ensureCraneBeams(db, builtInEquipment);
  const assets = Object.values(db.craneBeams.assets).filter(item => item && item.archived !== true).map(item => ({ ...item }));
  const canManage = roleOf(user) === "editor";
  const archivedAssets = canManage ? Object.values(db.craneBeams.assets).filter(item => item?.archived === true).map(item => ({ ...item })) : [];
  return { assets, archivedAssets, inspections: Object.values(db.craneBeams.inspections), defects: Object.values(db.craneBeams.defects), installationJournal: Object.values(db.craneBeams.installationJournal), corrections: canManage ? Object.values(db.craneBeams.corrections) : [], unresolvedArchive: canManage ? Object.values(db.craneBeams.unresolvedArchive) : [], canManage };
}

function createCraneBeamsRoute({ builtInEquipment = {}, enqueueStateWrite, notifyCraneEvent = async () => {}, readBody, readDb, sendJson, writeDb }) {
  return async function handleCraneBeamsRoute(req, res, pathname, url) {
    if ((pathname === "/api/crane-beam-qr" || pathname === "/api/gpm-qr") && req.method === "GET") {
      const mode = String(url.searchParams.get("mode") || "shift").toLowerCase() === "monthly" ? "monthly" : "shift";
      const id = text(url.searchParams.get("id"), 120);
      const db = readDb(); ensureCraneBeams(db, builtInEquipment);
      const asset = db.craneBeams.assets[id];
      const token = text(url.searchParams.get("token"), 200);
      const expected = mode === "monthly" ? text(asset?.upperQrToken, 200) : text(asset?.lowerQrToken, 200);
      const rotated = mode === "monthly" ? asset?.upperQrRotated === true : asset?.lowerQrRotated === true;
      if (!asset || asset.archived || (rotated && token !== expected)) { res.writeHead(302, { Location: "/?craneQr=INVALID", "Cache-Control": "no-store" }); res.end(); return true; }
      res.writeHead(302, { Location: `/?craneQr=${encodeURIComponent(`CRANE|${mode.toUpperCase()}|${id}|${expected}`)}`, "Cache-Control": "no-store" }); res.end(); return true;
    }
    if (!pathname.startsWith("/api/crane-beams")) return false;
    if (!req.authUser) { sendJson(res, 401, { ok: false, error: "auth_required" }); return true; }
    if (pathname === "/api/crane-beams" && req.method === "GET") { sendJson(res, 200, { ok: true, ...publicCraneState(readDb(), req.authUser, builtInEquipment) }); return true; }
    const body = await readBody(req).catch(() => ({}));
    if (pathname === "/api/crane-beams/inspect" && req.method === "POST") {
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db, builtInEquipment);
        const asset = db.craneBeams.assets[text(body.craneId, 120)];
        const type = body.type === "monthly" ? "monthly" : "shift";
        if (!asset || asset.archived || !asset.installed || asset.operationalPaused) return { error: "crane_unavailable" };
        if (!canInspect(req.authUser, asset, type)) return { error: "crane_inspection_forbidden" };
        const checklist = Array.isArray(asset.checklist) ? asset.checklist : [];
        const answers = checklist.map(item => { const supplied = (body.answers || {})[item.id] || {}; return { id: item.id, label: item.label, ok: supplied.ok === true, comment: text(supplied.comment, 1000), photo: text(supplied.photo, 500) }; });
        if (!answers.length || answers.some(item => !item.ok && !item.comment)) return { error: "crane_defect_comment_required" };
        const shift = body.shift === "night" ? "night" : "day";
        const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? body.date : new Date().toISOString().slice(0, 10);
        const counterEligible = closesCounter(req.authUser, asset, type);
        const duplicate = Object.values(db.craneBeams.inspections).some(item => item.craneId === asset.id && item.type === type && item.date === date && (type === "monthly" || item.shift === shift) && item.counterEligible);
        const id = newId("crane-inspection"), who = actor(req.authUser), defects = answers.filter(item => !item.ok);
        const inspection = { id, craneId: asset.id, craneName: asset.name, workshop: asset.workshop, type, date, shift, at: new Date().toISOString(), actor: who, checklistVersion: asset.checklistVersion, answers, result: defects.length ? (body.decision === "prohibited" ? "prohibited" : "remark") : "good", decision: defects.length ? (body.decision === "prohibited" ? "prohibited" : "allowed_with_remark") : "allowed", counterEligible, counterApplied: counterEligible && !duplicate };
        db.craneBeams.inspections[id] = inspection;
        if (defects.length) {
          const defectId = newId("crane-defect");
          db.craneBeams.defects[defectId] = { id: defectId, craneId: asset.id, inspectionId: id, createdAt: inspection.at, createdBy: who, items: defects, status: "open", operationDecision: inspection.decision, resolution: null, confirmation: null };
          if (inspection.decision === "prohibited") {
            asset.operationStatus = "prohibited";
            asset.prohibitedAt = inspection.at;
            asset.prohibitedByInspectionId = inspection.id;
          }
        }
        if (type === "monthly" && inspection.counterApplied) asset.lastMonthlyAt = inspection.at;
        if (type === "shift" && inspection.counterApplied) asset.lastShiftAt = inspection.at;
        writeDb(db, { action: "crane_beam_inspection_saved", user: req.authUser, craneId: asset.id, inspectionId: id, type });
        return { inspection, notification: defects.length ? { event: "defect_opened", craneId: asset.id, craneName: asset.name, workshop: asset.workshop, prohibited: inspection.decision === "prohibited" } : null, state: publicCraneState(db, req.authUser, builtInEquipment) };
      });
      if (result.error) sendJson(res, result.error.includes("forbidden") ? 403 : 400, { ok: false, error: result.error }); else { if (result.notification) await Promise.resolve(notifyCraneEvent(result.notification, req)).catch(() => {}); sendJson(res, 200, { ok: true, ...result }); } return true;
    }
    if (pathname === "/api/crane-beams/save" && req.method === "POST") {
      if (roleOf(req.authUser) !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db, builtInEquipment); const now = new Date().toISOString();
        const id = text(body.id, 120) || newId("crane"); const previous = db.craneBeams.assets[id];
        const name = text(body.name, 200), workshopInput = text(body.workshop, 200); if (!name || !workshopInput) return { error: "crane_fields_required" };
        const resolved = resolveWorkshop({ ...(previous || {}), name, workshop: workshopInput, installationPlace: body.installationPlace, parentEquipmentId: previous?.parentEquipmentId, preferredParentEquipmentId: body.parentEquipmentId }, { ...builtInEquipment, ...(db.catalog?.equipment || {}) });
        if (!resolved) return { error: "crane_workshop_unresolved" };
        const workshop = resolved.workshop;
        const checklist = Array.isArray(body.checklist) ? body.checklist.map((label, index) => ({ id: previous?.checklist?.[index]?.id || `check-${index + 1}`, label: text(typeof label === "string" ? label : label?.label, 240) })).filter(item => item.label) : previous?.checklist || DEFAULT_CHECKLIST.map((label, index) => ({ id: `check-${index + 1}`, label }));
        const status = ["installed", "dismantled", "temporary"].includes(body.installationStatus) ? body.installationStatus : previous?.installationStatus || "installed";
        const asset = { ...(previous || {}), id, name, workshop, parentWorkshop: workshop, parentEquipmentId: resolved.parentEquipmentId, parentEquipmentName: resolved.parentName, entityType: "nestedEquipment", inventoryNumber: text(body.inventoryNumber, 120), installationPlace: text(body.installationPlace, 240), installationDate: text(body.installationDate, 10), installationStatus: status, installed: status === "installed", archived: status === "archived", operationalPaused: previous?.operationalPaused === true, monthlyDay: Math.max(1, Math.min(28, Number(body.monthlyDay) || 1)), checklist, checklistVersion: previous && JSON.stringify(previous.checklist) !== JSON.stringify(checklist) ? Number(previous.checklistVersion || 1) + 1 : Number(previous?.checklistVersion || 1), lowerQr: previous?.lowerQr || `PPRGPM|SHIFT|${id}`, upperQr: previous?.upperQr || `PPRGPM|MONTHLY|${id}`, lowerQrToken: previous?.lowerQrToken || crypto.randomBytes(12).toString("hex"), upperQrToken: previous?.upperQrToken || crypto.randomBytes(12).toString("hex"), pausePeriods: Array.isArray(previous?.pausePeriods) ? previous.pausePeriods : [], createdAt: previous?.createdAt || now, updatedAt: now };
        delete asset.parentNodeIndex;
        db.craneBeams.assets[id] = asset;
        const changedInstallation = !previous || previous.workshop !== asset.workshop || previous.installationPlace !== asset.installationPlace || previous.installationStatus !== asset.installationStatus || previous.installationDate !== asset.installationDate;
        if (changedInstallation) { const eventId = newId("installation"); db.craneBeams.installationJournal[eventId] = { id: eventId, craneId: id, action: previous ? (status === "installed" ? "installed_or_moved" : status) : "installed", status, workshop, previousWorkshop: previous?.workshop || "", place: asset.installationPlace, date: asset.installationDate, at: now, byName: text(req.authUser.name, 200), byRole: roleOf(req.authUser), comment: text(body.installationComment, 1000) }; }
        writeDb(db, { action: "crane_beam_saved", user: req.authUser, craneId: id }); return { asset, state: publicCraneState(db, req.authUser, builtInEquipment) };
      });
      if (result.error) sendJson(res, 400, { ok: false, error: result.error }); else sendJson(res, 200, { ok: true, ...result }); return true;
    }
    if (pathname === "/api/crane-beams/correct" && req.method === "POST") {
      if (roleOf(req.authUser) !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db, builtInEquipment);
        const inspection = db.craneBeams.inspections[text(body.inspectionId, 180)];
        const reason = text(body.reason, 1200);
        if (!inspection) return { error: "crane_inspection_not_found" };
        if (!reason) return { error: "crane_correction_reason_required" };
        const before = structuredClone(inspection);
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.date || ""))) inspection.date = body.date;
        if (inspection.type === "shift" && ["day", "night"].includes(body.shift)) inspection.shift = body.shift;
        inspection.actor ||= {};
        if (text(body.actorName, 200)) inspection.actor.name = text(body.actorName, 200);
        if (text(body.actorRole, 80)) inspection.actor.role = text(body.actorRole, 80);
        if (body.answers && typeof body.answers === "object") {
          inspection.answers = (inspection.answers || []).map(answer => {
            const patch = body.answers[answer.id];
            if (!patch || typeof patch !== "object") return answer;
            return { ...answer, ok: patch.ok === true, comment: text(patch.comment, 1000), photo: text(patch.photo || answer.photo, 500) };
          });
        }
        inspection.result = inspection.answers.some(answer => !answer.ok) ? (body.decision === "prohibited" ? "prohibited" : "remark") : "good";
        inspection.decision = inspection.result === "good" ? "allowed" : inspection.result === "prohibited" ? "prohibited" : "allowed_with_remark";
        inspection.correctedAt = new Date().toISOString();
        const correctionId = newId("crane-correction");
        db.craneBeams.corrections[correctionId] = { id: correctionId, inspectionId: inspection.id, craneId: inspection.craneId, at: inspection.correctedAt, reason, actor: actor(req.authUser), before, after: structuredClone(inspection) };
        writeDb(db, { action: "crane_beam_inspection_corrected", user: req.authUser, craneId: inspection.craneId, inspectionId: inspection.id, correctionId, reason });
        return { inspection, correction: db.craneBeams.corrections[correctionId], state: publicCraneState(db, req.authUser, builtInEquipment) };
      });
      if (result.error) sendJson(res, result.error.includes("not_found") ? 404 : 400, { ok: false, error: result.error }); else sendJson(res, 200, { ok: true, ...result }); return true;
    }
    if (pathname === "/api/crane-beams/pause" && req.method === "POST") {
      if (roleOf(req.authUser) !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db, builtInEquipment); const asset = db.craneBeams.assets[text(body.craneId, 120)];
        if (!asset || asset.archived) return { error: "crane_not_found" };
        const now = new Date().toISOString(), action = body.action === "resume" ? "resume" : "pause";
        asset.pausePeriods = Array.isArray(asset.pausePeriods) ? asset.pausePeriods : [];
        if (action === "pause") {
          const reason = text(body.reason, 1000); if (!reason) return { error: "crane_pause_reason_required" };
          if (!asset.operationalPaused) asset.pausePeriods.push({ id: newId("crane-pause"), from: now, to: "", reason, by: actor(req.authUser) });
          asset.operationalPaused = true; asset.pauseReason = reason; asset.pausedAt = now;
        } else {
          const open = [...asset.pausePeriods].reverse().find(period => !period.to); if (open) { open.to = now; open.resumedBy = actor(req.authUser); }
          asset.operationalPaused = false; asset.pauseReason = ""; asset.resumedAt = now;
        }
        writeDb(db, { action: `crane_beam_${action}d`, user: req.authUser, craneId: asset.id, reason: asset.pauseReason });
        return { asset, state: publicCraneState(db, req.authUser, builtInEquipment) };
      });
      if (result.error) sendJson(res, result.error.includes("not_found") ? 404 : 400, { ok: false, error: result.error }); else sendJson(res, 200, { ok: true, ...result }); return true;
    }
    if (pathname === "/api/crane-beams/archive" && req.method === "POST") {
      if (roleOf(req.authUser) !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db, builtInEquipment); const asset = db.craneBeams.assets[text(body.craneId, 120)];
        if (!asset) return { error: "crane_not_found" };
        const restore = body.action === "restore";
        const reason = text(body.reason, 1000);
        if (!restore && !reason) return { error: "crane_archive_reason_required" };
        asset.archived = !restore; asset.installed = restore ? asset.installationStatus === "installed" : false;
        const now = new Date().toISOString();
        if (restore) { asset.restoredAt = now; delete asset.archivedAt; } else asset.archivedAt = now;
        const eventId = newId("installation");
        db.craneBeams.installationJournal[eventId] = { id: eventId, craneId: asset.id, action: restore ? "restored" : "archived", status: restore ? asset.installationStatus : "archived", workshop: asset.workshop, place: asset.installationPlace, date: now.slice(0, 10), at: now, byName: text(req.authUser.name, 200), byRole: roleOf(req.authUser), comment: reason };
        writeDb(db, { action: restore ? "crane_beam_restored" : "crane_beam_archived", user: req.authUser, craneId: asset.id, reason });
        return { state: publicCraneState(db, req.authUser, builtInEquipment) };
      });
      if (result.error) sendJson(res, 404, { ok: false, error: result.error }); else sendJson(res, 200, { ok: true, ...result }); return true;
    }
    if (pathname === "/api/crane-beams/qr-rotate" && req.method === "POST") {
      if (roleOf(req.authUser) !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db, builtInEquipment); const asset = db.craneBeams.assets[text(body.craneId, 120)];
        if (!asset || asset.archived) return { error: "crane_not_found" };
        const kind = body.kind === "monthly" ? "monthly" : "shift", now = new Date().toISOString();
        if (kind === "monthly") { asset.upperQrToken = crypto.randomBytes(12).toString("hex"); asset.upperQrRotated = true; asset.upperQrUpdatedAt = now; }
        else { asset.lowerQrToken = crypto.randomBytes(12).toString("hex"); asset.lowerQrRotated = true; asset.lowerQrUpdatedAt = now; }
        writeDb(db, { action: "crane_beam_qr_rotated", user: req.authUser, craneId: asset.id, kind });
        return { asset, state: publicCraneState(db, req.authUser, builtInEquipment) };
      });
      if (result.error) sendJson(res, 404, { ok: false, error: result.error }); else sendJson(res, 200, { ok: true, ...result }); return true;
    }
    if (pathname === "/api/crane-beams/defect" && req.method === "POST") {
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db, builtInEquipment); const defect = db.craneBeams.defects[text(body.defectId, 160)];
        if (!defect) return { error: "crane_defect_not_found" };
        const action = text(body.action, 30), role = roleOf(req.authUser), now = new Date().toISOString(), who = actor(req.authUser);
        if (action === "resolve") {
          if (!["mechanic", "electrician", "engineer"].includes(role)) return { error: "crane_defect_resolution_forbidden" };
          const comment = text(body.comment, 1500); if (!comment) return { error: "crane_resolution_comment_required" };
          defect.resolution = { at: now, actor: who, comment, parts: text(body.parts, 1000), photo: text(body.photo, 500) }; defect.status = "awaiting_confirmation";
          if (defect.resolution.parts) {
            const eventId = newId("installation-parts");
            const asset = db.craneBeams.assets[defect.craneId];
            db.craneBeams.installationJournal[eventId] = { id: eventId, craneId: defect.craneId, defectId: defect.id, action: "parts_installed", status: "installed", workshop: asset?.workshop || "", place: asset?.installationPlace || "", date: now.slice(0, 10), at: now, byName: who.name, byRole: who.role, parts: defect.resolution.parts, comment: `Установлено: ${defect.resolution.parts}. ${comment}` };
          }
        } else if (["confirm", "return"].includes(action)) {
          if (role !== "engineer") return { error: "crane_defect_confirmation_forbidden" };
          defect.confirmation = { at: now, actor: who, accepted: action === "confirm", comment: text(body.comment, 1500) }; defect.status = action === "confirm" ? "closed" : "returned";
          if (action === "confirm") {
            const asset = db.craneBeams.assets[defect.craneId];
            const remainingProhibitions = Object.values(db.craneBeams.defects).some(item => item && item.craneId === defect.craneId && item.id !== defect.id && item.operationDecision === "prohibited" && item.status !== "closed");
            if (asset && !remainingProhibitions) {
              asset.operationStatus = "allowed";
              asset.prohibitionClearedAt = now;
              asset.prohibitionClearedBy = who;
              delete asset.prohibitedByInspectionId;
            }
          }
        } else return { error: "crane_defect_action_invalid" };
        writeDb(db, { action: `crane_beam_defect_${action}`, user: req.authUser, defectId: defect.id, craneId: defect.craneId });
        const asset = db.craneBeams.assets[defect.craneId];
        return { defect, notification: { event: action === "resolve" ? "awaiting_confirmation" : action === "confirm" ? "confirmed" : "returned", craneId: defect.craneId, craneName: asset?.name || defect.craneId, workshop: asset?.workshop || "" }, state: publicCraneState(db, req.authUser, builtInEquipment) };
      });
      if (result.error) sendJson(res, result.error.includes("forbidden") ? 403 : result.error.includes("not_found") ? 404 : 400, { ok: false, error: result.error }); else { await Promise.resolve(notifyCraneEvent(result.notification, req)).catch(() => {}); sendJson(res, 200, { ok: true, ...result }); } return true;
    }
    sendJson(res, 404, { ok: false, error: "not_found" }); return true;
  };
}

module.exports = { DEFAULT_CHECKLIST, createCraneBeamsRoute, ensureCraneBeams, publicCraneState };
