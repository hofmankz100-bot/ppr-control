"use strict";

const crypto = require("crypto");

const DEFAULT_CHECKLIST = [
  "Состояние металлоконструкции и креплений",
  "Крюк, канат, цепь и грузозахватные устройства",
  "Тормоза и ограничители",
  "Пульт управления и аварийная остановка",
  "Электрооборудование и кабель",
  "Путь перемещения и рабочая зона"
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

function inferWorkshop(asset = {}, equipment = {}) {
  const source = `${asset.name || ""} ${asset.workshop || ""}`.toLocaleLowerCase("ru-RU");
  const areas = [...new Set(Object.values(equipment || {}).map(item => text(item?.area, 200)).filter(Boolean))];
  return areas.sort((a, b) => b.length - a.length).find(area => source.includes(area.toLocaleLowerCase("ru-RU"))) || text(asset.workshop, 200) || "Цех не определён";
}

function ensureCraneBeams(db) {
  db.craneBeams ||= { assets: {}, inspections: {}, defects: {}, installationJournal: {}, migrationVersion: "" };
  for (const key of ["assets", "inspections", "defects", "installationJournal"]) db.craneBeams[key] ||= {};
  Object.values(db.craneBeams.assets).forEach(asset => {
    if (!asset) return;
    const name = text(asset.name, 200).toLocaleLowerCase("ru-RU");
    if (/сгп/u.test(name)) asset.workshop = "Сгп";
    else if (/литейн/u.test(name)) asset.workshop = "Литейный цех";
    else if (/анод/u.test(name)) asset.workshop = "Анодный цех";
    else if (/покрас|покраск|ванн/u.test(name)) asset.workshop = "Покрасочный цех";
    else if (/инструмент|цианизац/u.test(name)) asset.workshop = "инструментальный цех";
    else if (/пресс|матриц/u.test(name)) asset.workshop = "Прессовый участок";
    asset.entityType = "workshopNode";
    asset.parentWorkshop = text(asset.workshop, 200);
  });
  if (db.craneBeams.migrationVersion === "retired-archive-v1") return false;
  const archived = Array.isArray(db.retiredCraneBeamArchive?.assets) ? db.retiredCraneBeamArchive.assets : [];
  const now = new Date().toISOString();
  archived.forEach((saved, index) => {
    const id = text(saved.id, 120) || `crane-${index + 1}`;
    if (db.craneBeams.assets[id]) return;
    const workshop = inferWorkshop(saved, db.catalog?.equipment);
    const asset = {
      id, name: text(saved.name, 200) || `Кран-балка ${index + 1}`, workshop, parentWorkshop: workshop, entityType: "workshopNode",
      inventoryNumber: text(saved.inventoryNumber, 120), installationPlace: text(saved.installationPlace || saved.workshop, 240),
      installationDate: text(saved.installationDate, 10), installationStatus: "installed", installed: true,
      lowerQr: text(saved.lowerQr, 300) || `PPRGPM|SHIFT|${id}`,
      upperQr: text(saved.upperQr, 300) || `PPRGPM|MONTHLY|${id}`,
      checklistVersion: 1, checklist: DEFAULT_CHECKLIST.map((label, itemIndex) => ({ id: `check-${itemIndex + 1}`, label })),
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
  if (type === "monthly") return role === "engineer" || ["mechanic", "electrician"].includes(role);
  return Boolean(user?.id || user?.employeeId) && user?.approved !== false;
}

function closesCounter(user, asset, type) {
  const role = roleOf(user);
  if (type === "monthly") return role === "engineer" || ["mechanic", "electrician"].includes(role);
  return ["operator", "shop"].includes(role) && userAreas(user).some(area => same(area, asset.workshop));
}

function publicCraneState(db, user) {
  ensureCraneBeams(db);
  const assets = Object.values(db.craneBeams.assets).filter(item => item && item.archived !== true).map(item => ({ ...item }));
  return { assets, inspections: Object.values(db.craneBeams.inspections), defects: Object.values(db.craneBeams.defects), installationJournal: Object.values(db.craneBeams.installationJournal), canManage: roleOf(user) === "editor" };
}

function createCraneBeamsRoute({ enqueueStateWrite, readBody, readDb, sendJson, writeDb }) {
  return async function handleCraneBeamsRoute(req, res, pathname, url) {
    if ((pathname === "/api/crane-beam-qr" || pathname === "/api/gpm-qr") && req.method === "GET") {
      const mode = String(url.searchParams.get("mode") || "shift").toLowerCase() === "monthly" ? "monthly" : "shift";
      const id = text(url.searchParams.get("id"), 120);
      res.writeHead(302, { Location: `/?craneQr=${encodeURIComponent(`CRANE|${mode.toUpperCase()}|${id}`)}`, "Cache-Control": "no-store" }); res.end(); return true;
    }
    if (!pathname.startsWith("/api/crane-beams")) return false;
    if (!req.authUser) { sendJson(res, 401, { ok: false, error: "auth_required" }); return true; }
    if (pathname === "/api/crane-beams" && req.method === "GET") { sendJson(res, 200, { ok: true, ...publicCraneState(readDb(), req.authUser) }); return true; }
    const body = await readBody(req).catch(() => ({}));
    if (pathname === "/api/crane-beams/inspect" && req.method === "POST") {
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db);
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
        if (defects.length) { const defectId = newId("crane-defect"); db.craneBeams.defects[defectId] = { id: defectId, craneId: asset.id, inspectionId: id, createdAt: inspection.at, createdBy: who, items: defects, status: "open", resolution: null, confirmation: null }; }
        if (type === "monthly" && inspection.counterApplied) asset.lastMonthlyAt = inspection.at;
        if (type === "shift" && inspection.counterApplied) asset.lastShiftAt = inspection.at;
        writeDb(db, { action: "crane_beam_inspection_saved", user: req.authUser, craneId: asset.id, inspectionId: id, type });
        return { inspection, state: publicCraneState(db, req.authUser) };
      });
      if (result.error) sendJson(res, result.error.includes("forbidden") ? 403 : 400, { ok: false, error: result.error }); else sendJson(res, 200, { ok: true, ...result }); return true;
    }
    if (pathname === "/api/crane-beams/save" && req.method === "POST") {
      if (roleOf(req.authUser) !== "editor") { sendJson(res, 403, { ok: false, error: "admin_required" }); return true; }
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db); const now = new Date().toISOString();
        const id = text(body.id, 120) || newId("crane"); const previous = db.craneBeams.assets[id];
        const name = text(body.name, 200), workshop = text(body.workshop, 200); if (!name || !workshop) return { error: "crane_fields_required" };
        const checklist = Array.isArray(body.checklist) ? body.checklist.map((label, index) => ({ id: previous?.checklist?.[index]?.id || `check-${index + 1}`, label: text(typeof label === "string" ? label : label?.label, 240) })).filter(item => item.label) : previous?.checklist || DEFAULT_CHECKLIST.map((label, index) => ({ id: `check-${index + 1}`, label }));
        const status = ["installed", "dismantled", "temporary", "archived"].includes(body.installationStatus) ? body.installationStatus : previous?.installationStatus || "installed";
        const asset = { ...(previous || {}), id, name, workshop, parentWorkshop: workshop, entityType: "workshopNode", inventoryNumber: text(body.inventoryNumber, 120), installationPlace: text(body.installationPlace, 240), installationDate: text(body.installationDate, 10), installationStatus: status, installed: status === "installed", archived: status === "archived", operationalPaused: body.operationalPaused === true, monthlyDay: Math.max(1, Math.min(28, Number(body.monthlyDay) || 1)), checklist, checklistVersion: previous && JSON.stringify(previous.checklist) !== JSON.stringify(checklist) ? Number(previous.checklistVersion || 1) + 1 : Number(previous?.checklistVersion || 1), lowerQr: previous?.lowerQr || `PPRGPM|SHIFT|${id}`, upperQr: previous?.upperQr || `PPRGPM|MONTHLY|${id}`, createdAt: previous?.createdAt || now, updatedAt: now };
        db.craneBeams.assets[id] = asset;
        const changedInstallation = !previous || previous.workshop !== asset.workshop || previous.installationPlace !== asset.installationPlace || previous.installationStatus !== asset.installationStatus || previous.installationDate !== asset.installationDate;
        if (changedInstallation) { const eventId = newId("installation"); db.craneBeams.installationJournal[eventId] = { id: eventId, craneId: id, action: previous ? (status === "installed" ? "installed_or_moved" : status) : "installed", status, workshop, previousWorkshop: previous?.workshop || "", place: asset.installationPlace, date: asset.installationDate, at: now, byName: text(req.authUser.name, 200), byRole: roleOf(req.authUser), comment: text(body.installationComment, 1000) }; }
        writeDb(db, { action: "crane_beam_saved", user: req.authUser, craneId: id }); return { asset, state: publicCraneState(db, req.authUser) };
      });
      if (result.error) sendJson(res, 400, { ok: false, error: result.error }); else sendJson(res, 200, { ok: true, ...result }); return true;
    }
    if (pathname === "/api/crane-beams/defect" && req.method === "POST") {
      const result = await enqueueStateWrite(async () => {
        const db = readDb(); ensureCraneBeams(db); const defect = db.craneBeams.defects[text(body.defectId, 160)];
        if (!defect) return { error: "crane_defect_not_found" };
        const action = text(body.action, 30), role = roleOf(req.authUser), now = new Date().toISOString(), who = actor(req.authUser);
        if (action === "resolve") {
          if (!["mechanic", "electrician", "engineer"].includes(role)) return { error: "crane_defect_resolution_forbidden" };
          const comment = text(body.comment, 1500); if (!comment) return { error: "crane_resolution_comment_required" };
          defect.resolution = { at: now, actor: who, comment, parts: text(body.parts, 1000), photo: text(body.photo, 500) }; defect.status = "awaiting_confirmation";
        } else if (["confirm", "return"].includes(action)) {
          if (role !== "engineer") return { error: "crane_defect_confirmation_forbidden" };
          defect.confirmation = { at: now, actor: who, accepted: action === "confirm", comment: text(body.comment, 1500) }; defect.status = action === "confirm" ? "closed" : "returned";
        } else return { error: "crane_defect_action_invalid" };
        writeDb(db, { action: `crane_beam_defect_${action}`, user: req.authUser, defectId: defect.id, craneId: defect.craneId });
        return { defect, state: publicCraneState(db, req.authUser) };
      });
      if (result.error) sendJson(res, result.error.includes("forbidden") ? 403 : result.error.includes("not_found") ? 404 : 400, { ok: false, error: result.error }); else sendJson(res, 200, { ok: true, ...result }); return true;
    }
    sendJson(res, 404, { ok: false, error: "not_found" }); return true;
  };
}

module.exports = { DEFAULT_CHECKLIST, createCraneBeamsRoute, ensureCraneBeams, publicCraneState };
