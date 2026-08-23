const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const QRCode = require("qrcode");
const webPush = require("web-push");
const { buildHealthPayload } = require("./server/health");
const { createAdminUserPermissionsRoute } = require("./server/admin-user-permissions-route");
const { createAdminUserSessionsRoute } = require("./server/admin-user-sessions-route");
const { createAdminUserAccessRoute } = require("./server/admin-user-access-route");
const { createAdminAutomationRoute } = require("./server/admin-automation-route");
const { createAdminConfigPackageRoute } = require("./server/admin-config-package-route");
const { createAdminArchivesRoute } = require("./server/admin-archives-route");
const { createAdminActivityRoute } = require("./server/admin-activity-route");
const { createAdminIntegrityRoute } = require("./server/admin-integrity-route");
const { createAdminBackupsRoute } = require("./server/admin-backups-route");
const { createAdminSettingsRoute } = require("./server/admin-settings-route");
const { createAdminMonitoringRoute } = require("./server/admin-monitoring-route");
const { createAdminMaintenanceRoute } = require("./server/admin-maintenance-route");
const { createAdminNotificationsRoute } = require("./server/admin-notifications-route");
const { createAdminSystemReportRoute } = require("./server/admin-system-report-route");
const { createAdminDashboardRoute } = require("./server/admin-dashboard-route");
const { createAdminStorageRoute } = require("./server/admin-storage-route");
const { createAdminQrRoute } = require("./server/admin-qr-route");
const { createAdminRatingRoute } = require("./server/admin-rating-route");
const { createAdminEquipmentQrRoute } = require("./server/admin-equipment-qr-route");
const { createAdminEquipmentConfigRoute } = require("./server/admin-equipment-config-route");
const { createAdminEquipmentMaintenanceRoute } = require("./server/admin-equipment-maintenance-route");
const {
  ADMIN_PERMISSION_KEYS,
  activeUserPermission,
  createServerPermissions
} = require("./server/permissions");
let WebSocketServer = null;
try {
  ({ WebSocketServer } = require("ws"));
} catch {
  WebSocketServer = null;
}

const root = __dirname;

function loadEnvFile() {
  const envFile = path.join(root, ".env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile();

const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
const backupDir = path.join(dataDir, "backups");
const photosDir = path.join(dataDir, "photos");
const actionLogFile = path.join(dataDir, "actions.log");
const port = Number(process.env.PORT || 8080);
const qrPort = Number(process.env.QR_PORT || 8081);
const httpsPort = Number(process.env.HTTPS_PORT || 8443);
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 15;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const TMC_REQUESTS_DISABLED = process.env.NODE_ENV !== "test";
const SERVER_VERSION = "v584-dark-dialogs";
const TRANSLATION_CACHE_VERSION = "v2";
const CLIENT_PROTOCOL_VERSION = "1";
const SUPPORTED_CLIENT_VERSIONS = new Set([
  "v273-required-client-update",
  "v274-attendance-two-columns",
  "v275-reliable-forced-update",
  "v302-shgrp-mobile-day-swipe",
  "v303-director-personal-messages",
  "v304-role-sync-director-clean",
  "v530-forklift-clean-form",
  SERVER_VERSION
]);
const PRIMARY_ADMIN_ENGINEER_EMPLOYEE_ID = "87064091893";
const {
  permissionBaseRole: permissionBaseRoleServer,
  isPrimaryAdminEngineer: isPrimaryAdminEngineerServer,
  engineerPermissionRole: engineerPermissionRoleServer,
  samePermissionRole: samePermissionRoleServer,
  isResolutionExecutorRole: isResolutionExecutorRoleServer
} = createServerPermissions({ primaryAdminEmployeeId: PRIMARY_ADMIN_ENGINEER_EMPLOYEE_ID });
const ATTENDANCE_WINDOW_MS = 10 * 60 * 60 * 1000;
const ATTENDANCE_WORKER_ROLES = new Set(["mechanic", "electrician", "welder", "turner", "forkliftDriver"]);
const FALSE_DOWNTIME_IDS = new Set(["downtime:1784527334957:1fd01bff99135"]);
const REMOVED_EQUIPMENT_IDS = new Set(["16"]);
const GAS_QR_EQUIPMENT_ID = "15";
const GAS_QR_NODES = Object.freeze([
  "ШГРП",
  "КОНТРОЛЬНАЯ ТРУБКА №1",
  "КОНТРОЛЬНАЯ ТРУБКА №2",
  "КОНТРОЛЬНАЯ ТРУБКА №3",
  "КОНТРОЛЬНАЯ ТРУБКА №4",
  "КОНТРОЛЬНАЯ ТРУБКА №5",
  "Охранная зона газопровода",
  "Газорегуляторный пункт (ГРП) №1",
  "Газорегуляторный пункт (ГРП) №2",
  "Газорегуляторный пункт (ГРП) №3",
  "Газорегуляторный пункт (ГРП) №4",
  "Газорегуляторный пункт (ГРП) №5",
  "Газорегуляторный пункт (ГРП) №6",
  "Газорегуляторный пункт (ГРП) №7",
  "Газорегуляторный пункт (ГРП) №8",
  "Газорегуляторный пункт (ГРП) №9",
  "Газорегуляторный пункт (ГРП) №10",
  "Газорегуляторный пункт (ГРП) №11",
  "ПСК"
]);
const PRESS_2400_EQUIPMENT_ID = "1";
// Exact production order recovered from the 2026-08-10 database backup.
// The order is significant because existing checks and printed QR codes use node indexes.
const PRESS_2400_HISTORICAL_NODES = Object.freeze([
  "Пресс гидравлический станция и цилиндры",
  "Печь загатовка и Робот",
  "Контейнер и Прессштемпель (магнит размер,темп контейнера,латун центровка))",
  "Кассета матрицы и Конвейнер , Нож",
  "Пульт управление кнопки (пила,пресс,печь заг)",
  "Печь матрица ,Толкатель матрицы, Кран-балка матрицы",
  "Стол охлаждение вентиляторы(бикса,стол ролик,стол пуллер)",
  "Лента стол 1-2-3-4 (цилиндр,вал,цеп,клапн воздух)",
  "Горячий пила и Пуллер A.B",
  "Термичка 1",
  "Термичка 2",
  "Финишный пила (экран управление,лапа,размер проф)"
]);
const loginAttempts = new Map();
const contractorAttendanceAttempts = new Map();
let postgresPool = null;
let postgresState = null;
let postgresWriteQueue = Promise.resolve();
let postgresPendingState = null;
let postgresWriterActive = false;
let lastPostgresBackupDate = "";
let postgresPhotoWriteQueue = Promise.resolve();
let localBackupPendingState = null;
let localBackupTimer = null;
let storageStatus = { mode: "json" };
let postgresClusterStatus = { active: "", nodes: [] };
let postgresRecoveryTimer = null;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".mobileconfig": "application/x-apple-aspen-config"
};
const publicRootFiles = new Set([
  "index.html",
  "styles.css",
  "styles.min.css",
  "app.js",
  "app.min.js",
  "sw.js",
  "manifest.json",
  "icon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "hoffmann-logo.png",
  "phone-fix.html",
  "cache-clear.html",
  "update.html",
  "ppr-ios-profile.mobileconfig"
]);

function isPublicStaticPath(relativePath = "") {
  const normalized = String(relativePath).split(path.sep).join("/");
  if (publicRootFiles.has(normalized)) return true;
  if (/^modules\/[A-Za-z0-9._-]+\.js$/.test(normalized)) return true;
  if (normalized === "assets/hofmann-forklift.png") return true;
  return normalized === "node_modules/jsqr/dist/jsQR.js"
    || normalized === "node_modules/html2canvas/dist/html2canvas.min.js"
    || normalized === "node_modules/jspdf/dist/jspdf.umd.min.js"
    || normalized === "node_modules/html2pdf.js/dist/html2pdf.bundle.min.js"
    || normalized === "node_modules/mammoth/mammoth.browser.min.js";
}

function directoryStorageStats(directory) {
  if (!fs.existsSync(directory)) return { bytes: 0, files: 0 };
  let bytes = 0;
  let files = 0;
  const walk = target => {
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      const fullPath = path.join(target, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile()) {
        files += 1;
        bytes += Number(fs.statSync(fullPath).size || 0);
      }
    }
  };
  try { walk(directory); } catch {}
  return { bytes, files };
}

function unusedPublicAssetCandidates() {
  const assetsDir = path.join(root, "assets");
  if (!fs.existsSync(assetsDir)) return [];
  const referenceFiles = ["app.js", "index.html", "styles.css", "sw.js", "manifest.json"]
    .map(name => path.join(root, name))
    .filter(file => fs.existsSync(file))
    .map(file => fs.readFileSync(file, "utf8"))
    .join("\n");
  return fs.readdirSync(assetsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && !referenceFiles.includes(`assets/${entry.name}`))
    .map(entry => {
      const bytes = Number(fs.statSync(path.join(assetsDir, entry.name)).size || 0);
      return { name: entry.name, bytes, reason: "Файл не подключён к текущей версии приложения" };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

async function githubRepositoryStorage() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://api.github.com/repos/hofmankz100-bot/ppr-control", {
      headers: { "Accept": "application/vnd.github+json", "User-Agent": "PPR-Control-Storage-Monitor" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`github_${response.status}`);
    const data = await response.json();
    return {
      available: true,
      bytes: Number(data.size || 0) * 1024,
      safeLimitBytes: 1024 * 1024 * 1024,
      recommendedMaximumBytes: 5 * 1024 * 1024 * 1024,
      updatedAt: data.updated_at || ""
    };
  } catch {
    return { available: false, bytes: 0, safeLimitBytes: 1024 * 1024 * 1024, recommendedMaximumBytes: 5 * 1024 * 1024 * 1024, updatedAt: "" };
  } finally {
    clearTimeout(timeout);
  }
}

function emptyDb() {
  return { checks: {}, requests: {}, orders: {}, inventory: {}, catalog: { equipment: {} }, serviceCosts: [], downtimes: [], monthlyClosures: {}, compressorJournal: {}, gasJournal: {}, gpmJournal: { equipment: {}, inspections: {}, events: {}, managers: {} }, weldingJournal: {}, turningJournal: {}, pprSheets: {}, annualPpr: {}, qrWalkJournal: [], workPermitInstructionAcknowledgements: [], adminActionReceipts: [], adminTrash: [], adminAuditLog: [], adminArchives: [], adminActivityReadAt: {}, adminAutomationStatus: {}, adminAlerts: [], adminConfig: {}, adminConfigHistory: [], systemMonitor: {}, journalDueSince: {}, auditHistory: [], systemBroadcasts: [], operationalResetAt: "", walkShiftCleanupVersion: "", users: [], authSessions: [], translationCache: {}, attendanceSessions: [], attendanceConfig: {} };
}

function removeWarehouseWorkflow(db) {
  db.inventory = {};
  db.serviceCosts = [];
  const removedUserIds = new Set(
    (db.users || [])
      .filter(user => user?.role === "warehouse")
      .flatMap(user => [user.id, user.employeeId, user.phone].filter(Boolean).map(String))
  );
  db.users = (db.users || []).filter(user => user?.role !== "warehouse");
  db.authSessions = (db.authSessions || []).filter(session =>
    !removedUserIds.has(String(session?.userId || session?.employeeId || session?.phone || ""))
  );
  const now = new Date().toISOString();
  for (const [id, req] of Object.entries(db.requests || {})) {
    if (!req || typeof req !== "object") continue;
    const warehouseOnly = String(id).startsWith("warehouse-ask:")
      || String(id).startsWith("manual-warehouse:")
      || String(id).startsWith("stock-issue:")
      || req.route === "stock"
      || req.warehouseAsk;
    if (warehouseOnly) {
      delete db.requests[id];
      continue;
    }
    const isTmc = req.kind === "tmc" || String(id).startsWith("tmc-request:") || String(id).startsWith("engineer-batch:");
    if (!isTmc || req.deleted || req.done || req.stock) continue;
    const oldStatus = String(req.status || req.requestStatus || "");
    const hadOldWorkflow = Boolean(
      req.financePreApproved
      || req.supplyPrepared
      || req.financeApproved
      || req.cashApproved
      || req.transferredToWarehouse
      || req.warehouseReceived
      || req.issued
      || req.accountingWrittenOff
      || ["financePre", "supply", "finance", "cash", "warehouse", "accounting", "confirmInstall"].includes(oldStatus)
    );
    if (!hadOldWorkflow) continue;
    req.engineerCombinedBatch = true;
    req.formedAt = "";
    req.status = "engineer";
    req.requestStatus = "engineer";
    req.engineerApproved = false;
    req.productionDirectorRequestApproved = false;
    req.financePreApproved = false;
    req.supplyPrepared = false;
    req.financeApproved = false;
    req.cashApproved = false;
    req.transferredToWarehouse = false;
    req.warehouseReceived = false;
    req.issued = false;
    req.accountingWrittenOff = false;
    req.returnedTo = "";
    req.route = "request";
    req.updatedAt = now;
    req.history = Array.isArray(req.history) ? req.history : [];
    if (!req.history.some(entry => entry?.action === "Переведено инженеру без склада")) {
      req.history.push({
        at: now,
        action: "Переведено инженеру без склада",
        details: "Старый маршрут согласований и склада удалён.",
        status: "engineer",
        role: "system",
        name: "Система"
      });
    }
  }
}

function normalizedCatalogNodeName(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function catalogNodeTombstone(item, name, event = {}) {
  const cleanName = String(name || "").trim().slice(0, 200);
  if (!cleanName) return;
  item.removedNodes = Array.isArray(item.removedNodes) ? item.removedNodes : [];
  const normalizedName = normalizedCatalogNodeName(cleanName);
  if (item.removedNodes.some(entry => normalizedCatalogNodeName(entry?.name) === normalizedName)) return;
  item.removedNodes.push({
    name: cleanName,
    at: String(event.at || new Date().toISOString()).slice(0, 50),
    by: String(event.by || event.actorName || "").trim().slice(0, 200),
    reason: String(event.reason || "").trim().slice(0, 500)
  });
  item.removedNodes = item.removedNodes.slice(-500);
}

function removeCatalogNodeByHistory(item, name, preferredIndex = -1) {
  if (!Array.isArray(item?.nodes)) return false;
  const normalizedName = normalizedCatalogNodeName(name);
  if (!normalizedName) return false;
  let index = Number.isSafeInteger(preferredIndex)
    && normalizedCatalogNodeName(item.nodes[preferredIndex]) === normalizedName
    ? preferredIndex
    : item.nodes.findIndex(node => normalizedCatalogNodeName(node) === normalizedName);
  if (index < 0 || item.nodes.length <= 1) return false;
  item.nodes.splice(index, 1);
  return true;
}

function repairCatalogNodeHistory(db) {
  const equipment = db?.catalog?.equipment;
  if (!equipment || typeof equipment !== "object") return;
  const events = [];
  for (const entry of db.adminAuditLog || []) {
    if (entry?.action !== "equipment_node_deleted") continue;
    const [equipmentId, nodeIndexRaw] = String(entry.targetId || "").split(":");
    if (!equipmentId || !equipment[equipmentId]) continue;
    events.push({ type: "delete", at: entry.at || "", equipmentId, nodeIndex: Number(nodeIndexRaw), name: entry.targetLabel || "", entry });
  }
  for (const entry of db.auditHistory || []) {
    const action = String(entry?.action || "").toLocaleLowerCase("ru-RU");
    if (!action.includes("название узла")) continue;
    const target = String(entry.target || "");
    const separator = target.lastIndexOf(" · ");
    const match = String(entry.details || "").match(/:\s*(.+)$/);
    if (separator < 0 || !match?.[1]) continue;
    const equipmentName = target.slice(0, separator).trim();
    const oldName = target.slice(separator + 3).trim();
    const equipmentId = Object.keys(equipment).find(id => normalizedCatalogNodeName(equipment[id]?.name) === normalizedCatalogNodeName(equipmentName));
    if (!equipmentId) continue;
    events.push({ type: "rename", at: entry.at || "", equipmentId, oldName, newName: match[1].trim(), entry });
  }
  events.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  for (const event of events) {
    const item = equipment[event.equipmentId];
    if (!item || !Array.isArray(item.nodes)) continue;
    if (item.nodeHistoryRestoredAt && String(event.at || "") <= String(item.nodeHistoryRestoredAt)) continue;
    if (event.type === "rename") {
      const oldKey = normalizedCatalogNodeName(event.oldName);
      const newKey = normalizedCatalogNodeName(event.newName);
      const index = item.nodes.findIndex(node => normalizedCatalogNodeName(node) === oldKey);
      if (index >= 0 && newKey && !item.nodes.some(node => normalizedCatalogNodeName(node) === newKey)) item.nodes[index] = event.newName;
      catalogNodeTombstone(item, event.oldName, event.entry);
    } else {
      removeCatalogNodeByHistory(item, event.name, event.nodeIndex);
      catalogNodeTombstone(item, event.name, event.entry);
    }
  }
  for (const item of Object.values(equipment)) {
    if (!Array.isArray(item?.nodes) || !Array.isArray(item.removedNodes)) continue;
    const removed = new Set(item.removedNodes.map(entry => normalizedCatalogNodeName(entry?.name)).filter(Boolean));
    item.nodes = item.nodes.filter(node => !removed.has(normalizedCatalogNodeName(node)));
  }
}

function restoreGasQrCatalog(db) {
  const equipment = db?.catalog?.equipment;
  if (!equipment || typeof equipment !== "object") return;
  const item = equipment[GAS_QR_EQUIPMENT_ID];
  if (!item || !Array.isArray(item.nodes)) return;
  if (item.gasQrRestoreVersion === "historical-order-v1") return;

  const now = new Date().toISOString();
  item.nodes = [...GAS_QR_NODES];
  item.removedNodes = (Array.isArray(item.removedNodes) ? item.removedNodes : [])
    .filter(entry => !GAS_QR_NODES.some(name => normalizedCatalogNodeName(name) === normalizedCatalogNodeName(entry?.name)));
  item.nodeHistoryRestoredAt = now;
  item.gasQrRestoreVersion = "historical-order-v1";
  item.updatedAt = now;
}

function restorePress2400Catalog(db) {
  const item = db?.catalog?.equipment?.[PRESS_2400_EQUIPMENT_ID];
  if (!item || !Array.isArray(item.nodes)) return false;
  if (item.press2400RestoreVersion === "production-backup-20260810-v1") return false;

  const currentNames = item.nodes.map(normalizedCatalogNodeName);
  const historicalNames = PRESS_2400_HISTORICAL_NODES.map(normalizedCatalogNodeName);
  const completeAndOrdered = currentNames.length === historicalNames.length
    && currentNames.every((name, index) => name === historicalNames[index]);
  if (completeAndOrdered) {
    item.press2400RestoreVersion = "production-backup-20260810-v1";
    return false;
  }

  const now = new Date().toISOString();
  item.nodes = [...PRESS_2400_HISTORICAL_NODES];
  item.removedNodes = (Array.isArray(item.removedNodes) ? item.removedNodes : [])
    .filter(entry => !PRESS_2400_HISTORICAL_NODES.some(name => (
      normalizedCatalogNodeName(name) === normalizedCatalogNodeName(entry?.name)
    )));
  item.nodeHistoryRestoredAt = now;
  item.press2400RestoreVersion = "production-backup-20260810-v1";
  item.updatedAt = now;
  return true;
}

function normalizeDb(db) {
  db ||= emptyDb();
  db.checks ||= {};
  db.requests ||= {};
  if (TMC_REQUESTS_DISABLED) db.requests = {};
  db.orders ||= {};
  db.inventory ||= {};
  db.catalog ||= { equipment: {} };
  db.catalog.equipment ||= {};
  delete db.directorMessages;
  delete db.codexTasks;
  delete db.codexAgent;
  db.serviceCosts ||= [];
  db.downtimes ||= [];
  db.monthlyClosures = db.monthlyClosures && typeof db.monthlyClosures === "object" ? db.monthlyClosures : {};
  db.compressorJournal ||= {};
  db.gasJournal ||= {};
  db.gpmJournal ||= { equipment: {}, inspections: {}, events: {}, managers: {} };
  db.gpmJournal.equipment ||= {};
  db.gpmJournal.inspections ||= {};
  db.gpmJournal.events ||= {};
  db.gpmJournal.managers ||= {};
  db.weldingJournal ||= {};
  db.turningJournal ||= {};
  db.pprSheets ||= {};
  db.annualPpr ||= {};
  db.qrWalkJournal = Array.isArray(db.qrWalkJournal) ? db.qrWalkJournal : [];
  db.workPermitInstructionAcknowledgements = Array.isArray(db.workPermitInstructionAcknowledgements) ? db.workPermitInstructionAcknowledgements : [];
  db.adminActionReceipts = Array.isArray(db.adminActionReceipts) ? db.adminActionReceipts : [];
  db.archivedNodeChecks = Array.isArray(db.archivedNodeChecks) ? db.archivedNodeChecks : [];
  restoreQrWalkChecksFromJournal(db);
  db.targetedCleanupVersions = db.targetedCleanupVersions && typeof db.targetedCleanupVersions === "object" ? db.targetedCleanupVersions : {};
  if (!db.targetedCleanupVersions.compressorWalk20260810) {
    const testDate = "2026-08-10";
    Object.keys(db.checks).forEach(recordKey => {
      if (recordKey.startsWith("9:") && recordKey.endsWith(`:${testDate}`)) delete db.checks[recordKey];
    });
    Object.keys(db.compressorJournal).forEach(rowId => {
      if (rowId.startsWith(`Компрессорная::${testDate}::`)) delete db.compressorJournal[rowId];
    });
    db.qrWalkJournal = db.qrWalkJournal.filter(entry => !(Number(entry?.equipmentId) === 9 && entry?.date === testDate));
    db.targetedCleanupVersions.compressorWalk20260810 = new Date().toISOString();
  }
  db.adminTrash = Array.isArray(db.adminTrash) ? db.adminTrash : [];
  db.adminAuditLog = Array.isArray(db.adminAuditLog) ? db.adminAuditLog : [];
  db.adminArchives = Array.isArray(db.adminArchives) ? db.adminArchives : [];
  db.adminActivityReadAt = db.adminActivityReadAt && typeof db.adminActivityReadAt === "object" ? db.adminActivityReadAt : {};
  db.adminAutomationStatus = db.adminAutomationStatus && typeof db.adminAutomationStatus === "object" ? db.adminAutomationStatus : {};
  db.adminAlerts = Array.isArray(db.adminAlerts) ? db.adminAlerts : [];
  db.adminConfig = db.adminConfig && typeof db.adminConfig === "object" ? db.adminConfig : {};
  db.adminConfigHistory = Array.isArray(db.adminConfigHistory) ? db.adminConfigHistory : [];
  db.systemMonitor = db.systemMonitor && typeof db.systemMonitor === "object" ? db.systemMonitor : {};
  db.journalDueSince ||= {};
  db.auditHistory ||= [];
  repairCatalogNodeHistory(db);
  restoreGasQrCatalog(db);
  restorePress2400Catalog(db);
  db.systemBroadcasts ||= [];
  if (!db.systemBroadcasts.some(item => item.id === "admin-stages-18-25-complete-v1")) {
    db.systemBroadcasts.unshift({
      id: "admin-stages-18-25-complete-v1",
      title: "Административные этапы 18–25 завершены",
      text: "Финальная версия проверена: формы, инструкции, исправления, хранилище, резервные копии, защита повторных запросов, телефонная и компьютерная версии.",
      priority: "important",
      roles: ["editor"],
      active: true,
      createdAt: new Date().toISOString(),
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      author: "Система",
      readBy: []
    });
  }
  db.operationalResetAt ||= "";
  db.walkShiftCleanupVersion ||= "";
  db.users ||= [];
  if (db.gpmJournal.managerMigrationVersion !== "initial-maksut-v1") {
    const initialManager = db.users.find(user =>
      String(user?.name || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU") === "нурахунов махсут махмутович"
    );
    if (initialManager) {
      const userKey = resolutionUserKeyServer(initialManager);
      db.gpmJournal.managers[`manager:${userKey}`] = {
        id: `manager:${userKey}`,
        userKey,
        userName: String(initialManager.name || ""),
        active: true,
        updatedAt: new Date().toISOString()
      };
    }
    db.gpmJournal.managerMigrationVersion = "initial-maksut-v1";
  }
  db.authSessions = Array.isArray(db.authSessions) ? db.authSessions : [];
  db.translationCache ||= {};
  db.pushNotifications ||= { subscriptions: [], vapid: null };
  db.pushNotifications.subscriptions = Array.isArray(db.pushNotifications.subscriptions) ? db.pushNotifications.subscriptions : [];
  db.attendanceSessions = Array.isArray(db.attendanceSessions) ? db.attendanceSessions : [];
  db.attendanceConfig = db.attendanceConfig && typeof db.attendanceConfig === "object" ? db.attendanceConfig : {};
  removeWarehouseWorkflow(db);
  return db;
}

function removeDuplicateProductionRequests(db) {
  db.targetedCleanupVersions = db.targetedCleanupVersions && typeof db.targetedCleanupVersions === "object" ? db.targetedCleanupVersions : {};
  if (db.targetedCleanupVersions.productionRequestDedup20260820) return 0;
  const statusRank = { new: 0, accepted: 1, returned: 2, awaitingAcceptance: 3, completed: 4 };
  const normalized = value => String(value || "").trim().toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
  const now = new Date().toISOString();
  let removed = 0;
  const cleanJournal = (journal = {}, trade = "welding") => {
    const groups = new Map();
    Object.values(journal).filter(item => item && !item.deletedAt).forEach(item => {
      const author = String(item.createdById || "").trim() || normalized(item.createdByName);
      const fields = [author, item.requestType, item.description, item.drawingNumber];
      if (trade === "turning") fields.push(item.quantity, item.dueDate);
      const fingerprint = fields.map(normalized).join("\u0001");
      if (!fingerprint || !normalized(item.description)) return;
      const list = groups.get(fingerprint) || [];
      list.push(item);
      groups.set(fingerprint, list);
    });
    groups.forEach(items => {
      items.sort((a, b) => Date.parse(a.createdAt || "") - Date.parse(b.createdAt || ""));
      let cluster = [];
      const flush = () => {
        if (cluster.length < 2) { cluster = []; return; }
        const keeper = cluster.slice().sort((a, b) =>
          (statusRank[b.status] ?? 0) - (statusRank[a.status] ?? 0)
          || Date.parse(b.updatedAt || b.createdAt || "") - Date.parse(a.updatedAt || a.createdAt || "")
        )[0];
        cluster.filter(item => item.id !== keeper.id).forEach(item => {
          item.deletedAt = now;
          item.duplicateOf = keeper.id;
          item.deletionReason = "Системная проверка: повторная отправка одной заявки";
          item.updatedAt = now;
          removed += 1;
        });
        cluster = [];
      };
      items.forEach(item => {
        const itemMs = Date.parse(item.createdAt || "");
        const previousMs = Date.parse(cluster.at(-1)?.createdAt || "");
        if (cluster.length && (!Number.isFinite(itemMs) || !Number.isFinite(previousMs) || itemMs - previousMs > 120000)) flush();
        cluster.push(item);
      });
      flush();
    });
  };
  cleanJournal(db.weldingJournal, "welding");
  cleanJournal(db.turningJournal, "turning");
  db.targetedCleanupVersions.productionRequestDedup20260820 = { at: now, removed };
  return removed;
}

function resetMonthClosePermissionsOnce(db) {
  if (!db || db.monthClosePermissionResetVersion === "all-users-v1") return false;
  let changed = false;
  for (const user of db.users || []) {
    if (!user?.permissionOverrides?.monthCloseManage) continue;
    delete user.permissionOverrides.monthCloseManage;
    changed = true;
  }
  db.monthClosePermissionResetVersion = "all-users-v1";
  return changed;
}

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    const rootDbFile = path.join(root, "db.json");
    if (fs.existsSync(rootDbFile)) {
      fs.copyFileSync(rootDbFile, dbFile);
    } else {
      fs.writeFileSync(dbFile, JSON.stringify(emptyDb(), null, 2));
    }
  }
}

function latestBackupFile() {
  try {
    if (!fs.existsSync(backupDir)) return null;
    return fs.readdirSync(backupDir)
      .filter(name => name.startsWith("db_backup_") && name.endsWith(".json"))
      .sort()
      .map(name => path.join(backupDir, name))
      .pop() || null;
  } catch {
    return null;
  }
}

function readDbFile() {
  ensureDb();
  try {
    return normalizeDb(JSON.parse(fs.readFileSync(dbFile, "utf8")));
  } catch (error) {
    try {
      const brokenFile = `${dbFile}.broken-${Date.now()}`;
      if (fs.existsSync(dbFile)) fs.renameSync(dbFile, brokenFile);
      const backupFile = latestBackupFile();
      if (backupFile) {
        fs.copyFileSync(backupFile, dbFile);
        return normalizeDb(JSON.parse(fs.readFileSync(dbFile, "utf8")));
      }
    } catch {}
    return emptyDb();
  }
}

function readDb() {
  return postgresState || readDbFile();
}

function writeDbFile(db) {
  ensureDb();
  backupDbOncePerDay();
  const tmp = `${dbFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(normalizeDb(db), null, 2));
  fs.renameSync(tmp, dbFile);
}

function photoExtensionFromMime(mime = "") {
  const clean = String(mime || "").toLowerCase();
  if (clean.includes("pdf")) return "pdf";
  if (clean.includes("png")) return "png";
  if (clean.includes("webp")) return "webp";
  return "jpg";
}

function savePhotoDataUrl(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|jpg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) return "";
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) return "";
  fs.mkdirSync(photosDir, { recursive: true });
  const ext = photoExtensionFromMime(match[1]);
  const hash = crypto.createHash("sha1").update(bytes).digest("hex");
  const fileName = `${hash}.${ext}`;
  const file = path.join(photosDir, fileName);
  if (!fs.existsSync(file)) fs.writeFileSync(file, bytes);
  schedulePostgresPhotoWrite(fileName, match[1] === "image/jpg" ? "image/jpeg" : match[1], bytes);
  return `/api/photos/${fileName}`;
}

function schedulePostgresPhotoWrite(fileName, mimeType, bytes) {
  if (!postgresPool || !fileName || !Buffer.isBuffer(bytes) || !bytes.length) return;
  const storedBytes = Buffer.from(bytes);
  postgresPhotoWriteQueue = postgresPhotoWriteQueue
    .then(() => postgresPool.query(
      `INSERT INTO ppr_photos(file_name, mime_type, payload, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT(file_name) DO UPDATE
       SET mime_type = EXCLUDED.mime_type, payload = EXCLUDED.payload, updated_at = now()`,
      [fileName, mimeType, storedBytes]
    ))
    .catch(error => {
      console.error(`PostgreSQL photo write failed; local copy preserved: ${error.message}`);
    });
}

function externalizePhotosInValue(value, seen = new WeakSet()) {
  let changed = false;
  const walk = item => {
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return item;
    seen.add(item);
    if (Array.isArray(item)) {
      item.forEach((entry, index) => {
        if (typeof entry === "string" && (entry.startsWith("data:image/") || entry.startsWith("data:application/pdf"))) {
          const url = savePhotoDataUrl(entry);
          if (url) {
            item[index] = url;
            changed = true;
          }
          return;
        }
        walk(entry);
      });
      return item;
    }
    Object.keys(item).forEach(key => {
      const entry = item[key];
      if (typeof entry === "string" && (entry.startsWith("data:image/") || entry.startsWith("data:application/pdf"))) {
        const url = savePhotoDataUrl(entry);
        if (url) {
          item[key] = url;
          changed = true;
        }
        return;
      }
      walk(entry);
    });
    return item;
  };
  walk(value);
  return changed;
}

async function seedEmptyPostgresReplicas(nodes, sourceIndex) {
  const source = nodes[sourceIndex];
  if (!source) return;
  const tableSpecs = [
    {
      table: "ppr_photos",
      select: "SELECT file_name, mime_type, payload, updated_at FROM ppr_photos",
      insert: `INSERT INTO ppr_photos(file_name,mime_type,payload,updated_at) VALUES($1,$2,$3,$4)
        ON CONFLICT(file_name) DO UPDATE SET mime_type=EXCLUDED.mime_type,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at`,
      values: row => [row.file_name, row.mime_type, row.payload, row.updated_at]
    },
    {
      table: "ppr_admin_backups",
      select: "SELECT backup_id,label,payload,checksum,created_by,created_at FROM ppr_admin_backups",
      insert: `INSERT INTO ppr_admin_backups(backup_id,label,payload,checksum,created_by,created_at) VALUES($1,$2,$3::jsonb,$4,$5,$6)
        ON CONFLICT(backup_id) DO NOTHING`,
      values: row => [row.backup_id, row.label, JSON.stringify(row.payload), row.checksum, row.created_by, row.created_at]
    },
    {
      table: "ppr_admin_archives",
      select: "SELECT archive_id,label,payload,checksum,created_by,created_at FROM ppr_admin_archives",
      insert: `INSERT INTO ppr_admin_archives(archive_id,label,payload,checksum,created_by,created_at) VALUES($1,$2,$3::jsonb,$4,$5,$6)
        ON CONFLICT(archive_id) DO NOTHING`,
      values: row => [row.archive_id, row.label, JSON.stringify(row.payload), row.checksum, row.created_by, row.created_at]
    }
  ];
  for (const target of nodes) {
    if (target === source || !target.healthy) continue;
    for (const spec of tableSpecs) {
      try {
        const count = await target.pool.query(`SELECT count(*)::int AS count FROM ${spec.table}`);
        if (Number(count.rows[0]?.count || 0) > 0) continue;
        const rows = await source.pool.query(spec.select);
        for (const row of rows.rows) await target.pool.query(spec.insert, spec.values(row));
      } catch (error) {
        target.healthy = false;
        target.error = String(error.message || error);
        target.lastErrorAt = new Date().toISOString();
        break;
      }
    }
  }
}

async function recoverPostgresReplicas() {
  if (!postgresPool?.nodes?.length || postgresPool.nodes.length < 2) return;
  const sourceIndex = postgresPool.activeIndex;
  const source = postgresPool.nodes[sourceIndex];
  if (!source) return;
  for (let index = 0; index < postgresPool.nodes.length; index += 1) {
    if (index === sourceIndex) continue;
    const target = postgresPool.nodes[index];
    const wasHealthy = Boolean(target.healthy);
    try {
      await target.pool.query("SELECT 1");
      target.healthy = true;
      target.error = "";
      target.lastSuccessAt = new Date().toISOString();
      if (!wasHealthy) {
        const current = await source.pool.query("SELECT payload,updated_at FROM ppr_settings WHERE setting_key='full_state' LIMIT 1");
        if (current.rows[0]?.payload) {
          await target.pool.query(
            `INSERT INTO ppr_settings(setting_key,payload,updated_at) VALUES('full_state',$1::jsonb,$2)
             ON CONFLICT(setting_key) DO UPDATE SET payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at
             WHERE ppr_settings.updated_at < EXCLUDED.updated_at`,
            [JSON.stringify(current.rows[0].payload), current.rows[0].updated_at]
          );
        }
        const photos = await source.pool.query("SELECT file_name,mime_type,payload,updated_at FROM ppr_photos");
        for (const row of photos.rows) {
          await target.pool.query(
            `INSERT INTO ppr_photos(file_name,mime_type,payload,updated_at) VALUES($1,$2,$3,$4)
             ON CONFLICT(file_name) DO UPDATE SET mime_type=EXCLUDED.mime_type,payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at
             WHERE ppr_photos.updated_at < EXCLUDED.updated_at`,
            [row.file_name, row.mime_type, row.payload, row.updated_at]
          );
        }
      }
    } catch (error) {
      target.healthy = false;
      target.error = String(error.message || error);
      target.lastErrorAt = new Date().toISOString();
    }
  }
  postgresClusterStatus = postgresPool.status();
  storageStatus.cluster = postgresClusterStatus;
}

function startPostgresRecoveryMonitor() {
  if (!postgresPool?.nodes?.length || postgresPool.nodes.length < 2 || postgresRecoveryTimer) return;
  postgresRecoveryTimer = setInterval(() => {
    recoverPostgresReplicas().catch(error => console.warn(`PostgreSQL recovery check failed: ${error.message}`));
  }, Math.max(15000, Number(process.env.PG_RECOVERY_INTERVAL_MS || 30000)));
  postgresRecoveryTimer.unref?.();
}

async function initializeStorage() {
  const { configuredDatabases, MultiPostgres } = require("./multi-postgres");
  const configured = configuredDatabases(process.env);
  if (!configured.length) {
    const db = readDbFile();
    removeDuplicateProductionRequests(db);
    migrateLegacyDirectorApprovals(db);
    resetMonthClosePermissionsOnce(db);
    removeObsoletePressNoMaterialNodes(db);
    reconcilePendingRemarkDowntimes(db);
    reconcileMissingShgrpQrChecksServer(db);
    writeDbFile(db);
    storageStatus = { mode: "json" };
    return storageStatus;
  }
  try {
    const { Pool } = require("pg");
    const sslMode = String(process.env.PGSSL || process.env.PGSSLMODE || "").trim().toLowerCase();
    const useSsl = ["1", "true", "require", "verify-ca", "verify-full"].includes(sslMode);
    const nodes = configured.map(item => ({
      ...item,
      healthy: false,
      error: "",
      pool: new Pool({
        connectionString: item.connectionString,
        ssl: useSsl || /(?:neon\.tech|supabase\.(?:co|com)|pooler\.supabase\.com)/i.test(item.connectionString)
          ? { rejectUnauthorized: false }
          : false,
        max: Number(process.env.PG_POOL_SIZE || 5),
        connectionTimeoutMillis: Math.max(2000, Number(process.env.PG_CONNECT_TIMEOUT_MS || 8000)),
        idleTimeoutMillis: 30000
      })
    }));
    await Promise.allSettled(nodes.map(async node => {
      try {
        await node.pool.query("SELECT now()");
        node.healthy = true;
        node.lastSuccessAt = new Date().toISOString();
      } catch (error) {
        node.error = String(error.message || error);
        node.lastErrorAt = new Date().toISOString();
      }
    }));
    if (!nodes.some(node => node.healthy)) {
      await Promise.allSettled(nodes.map(node => node.pool.end()));
      throw new Error("All configured PostgreSQL databases are unavailable");
    }
    const pool = new MultiPostgres(nodes, {
      onStatus: status => { postgresClusterStatus = status; },
      onPoolError: (error, nodeName) => {
        console.warn(`PostgreSQL pool ${nodeName} connection error: ${String(error?.message || error)}`);
      }
    });
    postgresClusterStatus = pool.status();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ppr_settings (
        setting_key text PRIMARY KEY,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ppr_photos (
        file_name text PRIMARY KEY,
        mime_type text NOT NULL,
        payload bytea NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ppr_state_backups (
        backup_date date PRIMARY KEY,
        payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ppr_admin_backups (
        backup_id text PRIMARY KEY,
        label text NOT NULL,
        payload jsonb NOT NULL,
        checksum text NOT NULL,
        created_by text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ppr_admin_archives (
        archive_id text PRIMARY KEY,
        label text NOT NULL,
        payload jsonb NOT NULL,
        checksum text NOT NULL,
        created_by text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    let freshest = null;
    for (let index = 0; index < nodes.length; index += 1) {
      try {
        const candidate = await nodes[index].pool.query(
          "SELECT payload, updated_at FROM ppr_settings WHERE setting_key = 'full_state' LIMIT 1"
        );
        const row = candidate.rows[0];
        if (row?.payload && (!freshest || new Date(row.updated_at).getTime() > freshest.updatedAt)) {
          freshest = { index, payload: row.payload, updatedAt: new Date(row.updated_at).getTime() };
        }
      } catch (error) {
        nodes[index].healthy = false;
        nodes[index].error = String(error.message || error);
      }
    }
    if (freshest) pool.activeIndex = freshest.index;
    if (freshest) await seedEmptyPostgresReplicas(nodes, freshest.index);
    postgresClusterStatus = pool.status();
    const result = freshest ? { rows: [{ payload: freshest.payload }] } : { rows: [] };
    if (result.rows[0]?.payload) {
      postgresState = normalizeDb(result.rows[0].payload);
      removeDuplicateProductionRequests(postgresState);
      removeObsoletePressNoMaterialNodes(postgresState);
      removeKnownFalseDowntimes(postgresState);
      purgeRemovedEquipmentData(postgresState);
      migrateLegacyDirectorApprovals(postgresState);
      resetMonthClosePermissionsOnce(postgresState);
      reconcilePendingRemarkDowntimes(postgresState);
      reconcileMissingShgrpQrChecksServer(postgresState);
      await pool.query(
        `INSERT INTO ppr_settings(setting_key, payload, updated_at)
         VALUES ('full_state', $1::jsonb, now())
         ON CONFLICT(setting_key) DO UPDATE
         SET payload = EXCLUDED.payload, updated_at = now()`,
        [JSON.stringify(postgresState)]
      );
      writeDbFile(postgresState);
    } else {
      postgresState = readDbFile();
      removeDuplicateProductionRequests(postgresState);
      migrateLegacyDirectorApprovals(postgresState);
      resetMonthClosePermissionsOnce(postgresState);
      removeObsoletePressNoMaterialNodes(postgresState);
      removeKnownFalseDowntimes(postgresState);
      purgeRemovedEquipmentData(postgresState);
      reconcilePendingRemarkDowntimes(postgresState);
      reconcileMissingShgrpQrChecksServer(postgresState);
      await pool.query(
        `INSERT INTO ppr_settings(setting_key, payload, updated_at)
         VALUES ('full_state', $1::jsonb, now())
         ON CONFLICT(setting_key) DO UPDATE
         SET payload = EXCLUDED.payload, updated_at = now()`,
        [JSON.stringify(postgresState)]
      );
    }
    postgresPool = pool;
    storageStatus = { mode: "postgres-cluster", table: "ppr_settings", key: "full_state", cluster: postgresClusterStatus };
    return storageStatus;
  } catch (error) {
    console.error(`PostgreSQL cluster unavailable, JSON fallback enabled: ${error.message}`);
    if (process.env.REQUIRE_POSTGRES === "true") throw error;
    postgresPool = null;
    postgresState = null;
    storageStatus = { mode: "json-fallback", error: error.message };
    return storageStatus;
  }
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function pruneOldBackups(keep = 14) {
  try {
    if (!fs.existsSync(backupDir)) return;
    const files = fs.readdirSync(backupDir)
      .filter(name => name.startsWith("db_backup_") && name.endsWith(".json"))
      .sort();
    for (const name of files.slice(0, Math.max(0, files.length - keep))) {
      fs.unlinkSync(path.join(backupDir, name));
    }
  } catch {}
}

function backupDbOncePerDay() {
  ensureDb();
  if (!fs.existsSync(dbFile)) return;
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `db_backup_${todayStamp()}.json`);
  if (!fs.existsSync(backupFile)) fs.copyFileSync(dbFile, backupFile);
  pruneOldBackups();
}

function appendActionLog(action) {
  ensureDb();
  const line = JSON.stringify({ at: new Date().toISOString(), ...action }) + "\n";
  fs.appendFileSync(actionLogFile, line);
}

const runtimeMonitor = { requests: 0, errors5xx: 0, slowRequests: 0, clientErrors: [] };

const DEFAULT_ADMIN_CONFIG = Object.freeze({
  companyName: "ТОО «Aluminium of Kazakhstan»",
  departments: [],
  positions: [],
  roleLabels: {},
  shifts: ["Дневная смена", "Ночная смена"],
  remarkTypes: ["Неисправность", "Нарушение безопасности", "Требуется обслуживание"],
  downtimeReasons: ["Механическая неисправность", "Электрическая неисправность", "Отсутствие материала", "Плановая остановка"],
  ppe: ["Каска", "Защитные очки", "Перчатки", "Спецодежда", "Предохранительный пояс"],
  workTypes: ["Техническое обслуживание", "Ремонт", "Огневые работы", "Работа на высоте", "Электромонтажные работы"],
  safetyMeasures: ["Отключить оборудование", "Оградить место работ", "Вывесить предупреждающие плакаты", "Проверить необходимые СИЗ"],
  trashRetentionDays: 30,
  monitoring: { memoryAlertMb: 512, databaseSizeLimitMb: 1024, backupMaxAgeHours: 36, clientErrorThreshold: 5 },
  automation: { autoBackupEnabled: true, autoBackupIntervalHours: 24, autoBackupKeepCount: 14 },
  excludedRatingWorkers: [
    { key: "mechanic:шонов.уткел", label: "Шонов.Уткел", reason: "Дублирующая роль" },
    { key: "mechanic:рамазан", label: "Рамазан", reason: "Тестовая запись" },
    { key: "mechanic:адлет", label: "Адлет", reason: "Дублирующая роль" }
  ],
  formPolicies: { workPermit: { optionalSections: ["leader", "completedMeasures", "approval", "brigade", "breaks", "changes"] } }
});

function cleanStringList(values, limit = 200) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}

function normalizedAdminConfig(raw = {}) {
  const monitoring = raw.monitoring && typeof raw.monitoring === "object" ? raw.monitoring : {};
  const automation = raw.automation && typeof raw.automation === "object" ? raw.automation : {};
  const allowedRoleKeys = new Set(["mechanic", "welder", "turner", "forkliftDriver", "operator", "shop", "engineer", "safetyEngineer", "energyEngineer", "designEngineer", "mechanicalEngineer", "instrumentationEngineer", "productionDirector", "generalDirector", "director", "technicalDirector", "editor"]);
  const roleLabels = Object.fromEntries(Object.entries(raw.roleLabels && typeof raw.roleLabels === "object" ? raw.roleLabels : {})
    .filter(([role]) => allowedRoleKeys.has(role))
    .map(([role, label]) => [role, String(label || "").trim().slice(0, 100)])
    .filter(([, label]) => label));
  return {
    companyName: String(raw.companyName || DEFAULT_ADMIN_CONFIG.companyName).trim().slice(0, 200),
    departments: cleanStringList(raw.departments),
    positions: cleanStringList(raw.positions, 500),
    roleLabels,
    shifts: cleanStringList(raw.shifts?.length ? raw.shifts : DEFAULT_ADMIN_CONFIG.shifts, 100),
    remarkTypes: cleanStringList(raw.remarkTypes?.length ? raw.remarkTypes : DEFAULT_ADMIN_CONFIG.remarkTypes, 500),
    downtimeReasons: cleanStringList(raw.downtimeReasons?.length ? raw.downtimeReasons : DEFAULT_ADMIN_CONFIG.downtimeReasons, 500),
    ppe: cleanStringList(raw.ppe?.length ? raw.ppe : DEFAULT_ADMIN_CONFIG.ppe, 500),
    workTypes: cleanStringList(raw.workTypes?.length ? raw.workTypes : DEFAULT_ADMIN_CONFIG.workTypes, 500),
    safetyMeasures: cleanStringList(raw.safetyMeasures?.length ? raw.safetyMeasures : DEFAULT_ADMIN_CONFIG.safetyMeasures, 500),
    trashRetentionDays: Math.min(365, Math.max(1, Number(raw.trashRetentionDays || DEFAULT_ADMIN_CONFIG.trashRetentionDays))),
    monitoring: {
      memoryAlertMb: Math.min(8192, Math.max(128, Number(monitoring.memoryAlertMb || DEFAULT_ADMIN_CONFIG.monitoring.memoryAlertMb))),
      databaseSizeLimitMb: Math.min(102400, Math.max(100, Number(monitoring.databaseSizeLimitMb || DEFAULT_ADMIN_CONFIG.monitoring.databaseSizeLimitMb))),
      backupMaxAgeHours: Math.min(168, Math.max(12, Number(monitoring.backupMaxAgeHours || DEFAULT_ADMIN_CONFIG.monitoring.backupMaxAgeHours))),
      clientErrorThreshold: Math.min(100, Math.max(1, Number(monitoring.clientErrorThreshold || DEFAULT_ADMIN_CONFIG.monitoring.clientErrorThreshold)))
    },
    automation: {
      autoBackupEnabled: automation.autoBackupEnabled !== false,
      autoBackupIntervalHours: [6, 12, 24, 48, 72, 168].includes(Number(automation.autoBackupIntervalHours)) ? Number(automation.autoBackupIntervalHours) : DEFAULT_ADMIN_CONFIG.automation.autoBackupIntervalHours,
      autoBackupKeepCount: Math.min(30, Math.max(5, Number(automation.autoBackupKeepCount || DEFAULT_ADMIN_CONFIG.automation.autoBackupKeepCount)))
    },
    formPolicies: {
      workPermit: {
        optionalSections: cleanStringList(raw.formPolicies?.workPermit?.optionalSections?.length ? raw.formPolicies.workPermit.optionalSections : DEFAULT_ADMIN_CONFIG.formPolicies.workPermit.optionalSections, 20)
          .filter(value => ["leader", "completedMeasures", "approval", "brigade", "breaks", "changes"].includes(value))
      }
    },
    excludedRatingWorkers: (Array.isArray(raw.excludedRatingWorkers) ? raw.excludedRatingWorkers : DEFAULT_ADMIN_CONFIG.excludedRatingWorkers)
      .map(item => ({
        key: String(item?.key || "").trim().toLocaleLowerCase("ru-RU").slice(0, 300),
        label: String(item?.label || "").trim().slice(0, 300),
        reason: String(item?.reason || "").trim().slice(0, 1000),
        hiddenAt: String(item?.hiddenAt || ""),
        hiddenBy: String(item?.hiddenBy || "").trim().slice(0, 300)
      }))
      .filter(item => /^(mechanic|welder|turner|forkliftDriver):.+$/i.test(item.key))
      .slice(0, 1000)
  };
}

function buildAdminConfigPackage(db = readDb()) {
  const payload = {
    format: "ppr-admin-config",
    version: 1,
    exportedAt: new Date().toISOString(),
    adminConfig: normalizedAdminConfig(db.adminConfig),
    workPermitInstructions: Object.fromEntries(Object.entries(db.workPermitInstructions || {}).slice(0, 100).map(([id, item]) => [id, {
      title: String(item?.title || "").slice(0, 300),
      content: String(item?.content || "").slice(0, 200000),
      fileName: String(item?.fileName || "").slice(0, 300)
    }]))
  };
  return { payload, checksum: backupChecksum(payload) };
}

function validateAdminConfigPackage(input) {
  const wrapper = input && typeof input === "object" ? input : {};
  const payload = wrapper.payload && typeof wrapper.payload === "object" ? wrapper.payload : null;
  if (!payload || payload.format !== "ppr-admin-config" || Number(payload.version) !== 1) return { error: "config_package_invalid" };
  if (!wrapper.checksum || backupChecksum(payload) !== String(wrapper.checksum)) return { error: "config_package_checksum_invalid" };
  const rawInstructions = payload.workPermitInstructions && typeof payload.workPermitInstructions === "object" ? payload.workPermitInstructions : {};
  const entries = Object.entries(rawInstructions);
  if (entries.length > 100 || entries.some(([id, item]) => !/^[a-z0-9_-]{1,80}$/i.test(id) || !item || typeof item !== "object" || String(item.content || "").length > 200000)) return { error: "config_package_content_invalid" };
  const instructions = Object.fromEntries(entries.map(([id, item]) => [id, { title: String(item.title || "").trim().slice(0, 300), content: String(item.content || "").trim().slice(0, 200000), fileName: String(item.fileName || "").trim().slice(0, 300) }]));
  return { payload, config: normalizedAdminConfig(payload.adminConfig), instructions, summary: { companyName: normalizedAdminConfig(payload.adminConfig).companyName, departments: normalizedAdminConfig(payload.adminConfig).departments.length, positions: normalizedAdminConfig(payload.adminConfig).positions.length, instructions: entries.length, exportedAt: String(payload.exportedAt || "") } };
}

function duplicateValues(items, valueOf) {
  const groups = new Map();
  for (const item of items || []) {
    const value = String(valueOf(item) || "").trim();
    if (!value) continue;
    const group = groups.get(value) || [];
    group.push(item);
    groups.set(value, group);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 1);
}

function dataIntegrityReport(db = readDb()) {
  const now = Date.now();
  const users = db.users || [];
  const userIds = new Set(users.map(user => String(user.id || "")).filter(Boolean));
  const userKeys = new Set(users.flatMap(user => [user.id, user.employeeId, user.phone].map(value => String(value || "").trim()).filter(Boolean)));
  const expiredSessions = (db.authSessions || []).filter(item => !Number.isFinite(Date.parse(item.expiresAt || "")) || Date.parse(item.expiresAt || "") <= now);
  const danglingSessions = (db.authSessions || []).filter(item => !expiredSessions.includes(item) && item.userId && !userIds.has(String(item.userId)));
  const staleResolvedAlerts = (db.adminAlerts || []).filter(item => item.status === "resolved" && Date.parse(item.resolvedAt || item.lastSeenAt || 0) < now - 90 * 86400000);
  const invalidInstructionEditors = [];
  for (const [instructionId, instruction] of Object.entries(db.workPermitInstructions || {})) {
    const invalid = (instruction.editorIds || []).filter(key => !userKeys.has(String(key || "")));
    if (invalid.length) invalidInstructionEditors.push({ instructionId, count: invalid.length });
  }
  const duplicateEmployeeIds = duplicateValues(users, user => String(user.employeeId || "").trim().toLowerCase());
  const duplicatePhones = duplicateValues(users, user => normalizePhoneIdentifier(user.phone));
  const incompleteUsers = users.filter(user => !String(user.name || "").trim() || !String(user.role || "").trim() || (!String(user.employeeId || "").trim() && !normalizePhoneIdentifier(user.phone)));
  const expiredTrash = (db.adminTrash || []).filter(item => item.canRestore !== false && !item.restoredAt && Date.parse(item.expiresAt || 0) < now);
  const issues = [
    { id: "expired_sessions", title: "Просроченные сеансы", description: "Старые авторизации, срок которых закончился.", count: expiredSessions.length, fixable: true },
    { id: "dangling_sessions", title: "Сеансы удалённых сотрудников", description: "Авторизации, у которых больше нет учётной записи.", count: danglingSessions.length, fixable: true },
    { id: "invalid_instruction_editors", title: "Устаревшие права на инструкции", description: "Ссылки на сотрудников, которых больше нет.", count: invalidInstructionEditors.reduce((sum, item) => sum + item.count, 0), fixable: true },
    { id: "stale_alerts", title: "Старые закрытые уведомления", description: "Закрытые системные сообщения старше 90 дней.", count: staleResolvedAlerts.length, fixable: true },
    { id: "duplicate_employee_ids", title: "Повторяющиеся табельные номера", description: "Нужно проверить сотрудников вручную — система не объединяет людей автоматически.", count: duplicateEmployeeIds.length, fixable: false, samples: duplicateEmployeeIds.slice(0, 10).map(([value, group]) => `${value}: ${group.map(user => user.name || "Без имени").join(", ")}`) },
    { id: "duplicate_phones", title: "Повторяющиеся телефоны", description: "Нужно проверить сотрудников вручную.", count: duplicatePhones.length, fixable: false, samples: duplicatePhones.slice(0, 10).map(([value, group]) => `${value}: ${group.map(user => user.name || "Без имени").join(", ")}`) },
    { id: "incomplete_users", title: "Неполные учётные записи", description: "Нет имени, роли, табельного номера или телефона.", count: incompleteUsers.length, fixable: false, samples: incompleteUsers.slice(0, 10).map(user => user.name || user.employeeId || user.phone || "Без имени") },
    { id: "expired_trash", title: "Истёкший срок корзины", description: "Данные не удаляются автоматически: администратор решает это в разделе «Корзина».", count: expiredTrash.length, fixable: false }
  ];
  return { checkedAt: new Date().toISOString(), healthy: issues.every(issue => issue.count === 0), issues, fixableCount: issues.filter(issue => issue.fixable).reduce((sum, issue) => sum + issue.count, 0) };
}

function adminActivityFeed(db, adminUser) {
  const ignored = new Set(["user_login", "user_logout", "state_write", "state_sync", "push_config_created", "push_subscription_saved", "push_subscription_removed", "push_subscription_expired", "push_subscriptions_cleaned", "externalize_photos_get", "translate_cache"]);
  const adminActions = new Set(["admin_backup_created", "admin_backup_restored", "admin_settings_saved", "admin_settings_rollback", "admin_integrity_fixed", "admin_activity_read", "system_alert_resolved", "trash_restore", "trash_purge", "manual_backup"]);
  const key = String(adminUser?.id || adminUser?.employeeId || "primary-admin");
  const readAt = String(db.adminActivityReadAt?.[key] || "");
  const items = (db.adminAuditLog || []).filter(item => {
    const action = String(item.action || "");
    return action && !ignored.has(action) && !adminActions.has(action);
  }).slice(0, 500).map(item => {
    const action = String(item.action || "");
    const category = action.includes("work_permit") ? "work_permit"
      : action.includes("qr_walk") ? "qr_walk"
      : action.includes("attendance") ? "attendance"
      : action.includes("remark") || action.includes("resolution") ? "remarks"
      : action.includes("request") ? "requests"
      : action.includes("ppr") || action.includes("check") || action.includes("journal") ? "journals"
      : action.includes("user") || action.includes("register") ? "users" : "other";
    return { ...item, category, unread: !readAt || String(item.at || "") > readAt };
  });
  return { readAt, unreadCount: items.filter(item => item.unread).length, items };
}

function monitorRequest(req, res) {
  const started = Date.now();
  runtimeMonitor.requests += 1;
  res.once("finish", () => {
    const elapsed = Date.now() - started;
    if (res.statusCode >= 500) runtimeMonitor.errors5xx += 1;
    if (elapsed >= 2000) runtimeMonitor.slowRequests += 1;
  });
}

function latestLocalBackupAt() {
  try {
    const files = fs.readdirSync(backupDir).filter(name => name.startsWith("db_backup_") && name.endsWith(".json"));
    return files.reduce((latest, name) => {
      const value = fs.statSync(path.join(backupDir, name)).mtime.toISOString();
      return value > latest ? value : latest;
    }, "");
  } catch { return ""; }
}

async function systemMonitoringSnapshot() {
  const checkedAt = new Date().toISOString();
  const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const adminConfig = normalizedAdminConfig(readDb().adminConfig);
  const memoryLimitMb = Math.max(128, Number(process.env.MEMORY_ALERT_MB || adminConfig.monitoring.memoryAlertMb));
  const databaseLimitMb = Math.max(100, Number(process.env.DATABASE_SIZE_LIMIT_MB || adminConfig.monitoring.databaseSizeLimitMb));
  const snapshot = {
    checkedAt,
    node: { online: true, uptimeSeconds: Math.round(process.uptime()), memoryMb, memoryLimitMb },
    api: { requests: runtimeMonitor.requests, errors5xx: runtimeMonitor.errors5xx, slowRequests: runtimeMonitor.slowRequests, clientErrors10m: runtimeMonitor.clientErrors.filter(at => Date.now() - new Date(at).getTime() < 600000).length },
    postgres: { connected: false, mode: storageStatus.mode || "json", sizeBytes: 0, sizeLimitBytes: databaseLimitMb * 1024 * 1024, usagePercent: 0, activeConnections: 0, lastBackupAt: latestLocalBackupAt(), lastWriteAt: storageStatus.lastWriteAt || "", error: storageStatus.error || "" }
  };
  runtimeMonitor.clientErrors = runtimeMonitor.clientErrors.filter(at => Date.now() - new Date(at).getTime() < 86400000);
  if (!postgresPool) return snapshot;
  try {
    const result = await postgresPool.query(`SELECT now() AS now, pg_database_size(current_database()) AS size,
      (SELECT count(*)::int FROM pg_stat_activity WHERE datname=current_database()) AS connections,
      (SELECT max(backup_date) FROM ppr_state_backups) AS last_backup`);
    const row = result.rows[0] || {};
    const sizeBytes = Number(row.size || 0);
    snapshot.postgres = { connected: true, mode: "postgres-cluster", checkedAt: row.now, sizeBytes, sizeLimitBytes: databaseLimitMb * 1024 * 1024, usagePercent: Math.round(sizeBytes / (databaseLimitMb * 1024 * 1024) * 1000) / 10, activeConnections: Number(row.connections || 0), lastBackupAt: row.last_backup || "", lastWriteAt: storageStatus.lastWriteAt || "", error: "", cluster: postgresClusterStatus };
  } catch (error) {
    snapshot.postgres = { ...snapshot.postgres, mode: "postgres-degraded", error: String(error.message || error) };
  }
  return snapshot;
}

function monitoringAlertSpecs(snapshot) {
  const adminConfig = normalizedAdminConfig(readDb().adminConfig);
  const specs = [];
  if (!snapshot.postgres.connected && postgresPool) specs.push({ type: "postgres_unavailable", severity: "critical", title: "PostgreSQL недоступен", message: snapshot.postgres.error || "Сервер не смог подключиться к базе данных." });
  const usage = Number(snapshot.postgres.usagePercent || 0);
  if (usage >= 95) specs.push({ type: "database_capacity", severity: "critical", title: "База данных почти заполнена", message: `Использовано ${usage}% установленного лимита.` });
  else if (usage >= 85) specs.push({ type: "database_capacity", severity: "critical", title: "Мало места в базе данных", message: `Использовано ${usage}% установленного лимита.` });
  else if (usage >= 70) specs.push({ type: "database_capacity", severity: "warning", title: "Заполняется база данных", message: `Использовано ${usage}% установленного лимита.` });
  if (snapshot.node.memoryMb >= snapshot.node.memoryLimitMb) specs.push({ type: "memory_high", severity: "warning", title: "Высокое потребление памяти", message: `${snapshot.node.memoryMb} МБ из контрольного порога ${snapshot.node.memoryLimitMb} МБ.` });
  const backupAge = snapshot.postgres.lastBackupAt ? Date.now() - new Date(snapshot.postgres.lastBackupAt).getTime() : Infinity;
  if (backupAge > adminConfig.monitoring.backupMaxAgeHours * 3600000) specs.push({ type: "backup_old", severity: "critical", title: "Нет свежей резервной копии", message: `Последняя резервная копия старше ${adminConfig.monitoring.backupMaxAgeHours} часов или не найдена.` });
  if (snapshot.api.clientErrors10m >= adminConfig.monitoring.clientErrorThreshold) specs.push({ type: "client_errors", severity: "warning", title: "Повторяющиеся ошибки у сотрудников", message: `${snapshot.api.clientErrors10m} ошибок браузера за последние 10 минут.` });
  return specs;
}

function systemReadinessReport(db, monitoring, backups = []) {
  const config = normalizedAdminConfig(db.adminConfig);
  const integrity = dataIntegrityReport(db);
  const activeAlerts = (db.adminAlerts || []).filter(item => item.status === "active");
  const latestBackup = backups[0] || null;
  const backupAgeHours = latestBackup?.createdAt ? Math.round((Date.now() - Date.parse(latestBackup.createdAt)) / 360000) / 10 : null;
  const automation = adminAutomationSnapshot(db);
  const checks = [
    { id: "postgres", title: "PostgreSQL", status: monitoring.postgres?.connected ? "ok" : "critical", detail: monitoring.postgres?.connected ? `Подключён · ${Math.round(Number(monitoring.postgres.sizeBytes || 0) / 1024 / 1024)} МБ` : monitoring.postgres?.error || "Нет подключения" },
    { id: "backup", title: "Резервная копия", status: backupAgeHours !== null && backupAgeHours <= config.monitoring.backupMaxAgeHours ? "ok" : "critical", detail: latestBackup ? `${latestBackup.label} · ${backupAgeHours} ч назад` : "Полная копия не найдена" },
    { id: "automation", title: "Автоматизация", status: automation.autoBackupEnabled && !automation.lastError ? "ok" : automation.lastError ? "critical" : "warning", detail: automation.lastError || (automation.autoBackupEnabled ? `Каждые ${automation.autoBackupIntervalHours} ч` : "Автоматические копии отключены") },
    { id: "integrity", title: "Целостность данных", status: integrity.healthy ? "ok" : integrity.fixableCount ? "warning" : "warning", detail: integrity.healthy ? "Нарушений не найдено" : `Замечаний: ${integrity.issues.reduce((sum, item) => sum + item.count, 0)}` },
    { id: "alerts", title: "Системные предупреждения", status: activeAlerts.some(item => item.severity === "critical") ? "critical" : activeAlerts.length ? "warning" : "ok", detail: activeAlerts.length ? `Активных: ${activeAlerts.length}` : "Активных предупреждений нет" },
    { id: "admins", title: "Администраторы", status: (db.users || []).filter(user => user.role === "editor" && user.accessDisabled !== true).length ? "ok" : "critical", detail: `Активных: ${(db.users || []).filter(user => user.role === "editor" && user.accessDisabled !== true).length}` }
  ];
  const critical = checks.filter(item => item.status === "critical").length;
  const warnings = checks.filter(item => item.status === "warning").length;
  return {
    generatedAt: new Date().toISOString(),
    status: critical ? "critical" : warnings ? "warning" : "ok",
    summary: { critical, warnings, ok: checks.filter(item => item.status === "ok").length },
    checks,
    metrics: { users: (db.users || []).length, activeAlerts: activeAlerts.length, integrityIssues: integrity.issues.reduce((sum, item) => sum + item.count, 0), backups: backups.length, databaseSizeBytes: Number(monitoring.postgres?.sizeBytes || 0), memoryMb: Number(monitoring.node?.memoryMb || 0), uptimeSeconds: Number(monitoring.node?.uptimeSeconds || 0) },
    environment: { serverVersion: SERVER_VERSION, clientProtocol: CLIENT_PROTOCOL_VERSION, storageMode: monitoring.postgres?.mode || storageStatus.mode || "json", realtime: true },
    policy: { backupMaxAgeHours: config.monitoring.backupMaxAgeHours, autoBackupIntervalHours: automation.autoBackupIntervalHours, autoBackupKeepCount: automation.autoBackupKeepCount }
  };
}

async function refreshSystemMonitoring() {
  const snapshot = await systemMonitoringSnapshot();
  const specs = monitoringAlertSpecs(snapshot);
  await enqueueStateWrite(async () => {
    const db = readDb();
    const now = snapshot.checkedAt;
    const activeTypes = new Set(specs.map(item => item.type));
    for (const alert of db.adminAlerts || []) {
      if (alert.status === "active" && !activeTypes.has(alert.type)) {
        alert.status = "resolved";
        alert.resolvedAt = now;
        alert.resolvedByName = "Система";
      }
      if (!activeTypes.has(alert.type)) alert.clearedAt = now;
    }
    for (const spec of specs) {
      const existing = (db.adminAlerts || []).find(item => item.type === spec.type && item.status === "active");
      if (existing) Object.assign(existing, spec, { lastSeenAt: now });
      else {
        const acknowledged = (db.adminAlerts || []).find(item => item.type === spec.type && item.status === "resolved" && !item.clearedAt);
        if (acknowledged) acknowledged.lastSeenAt = now;
        else db.adminAlerts.unshift({ id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...spec, status: "active", createdAt: now, lastSeenAt: now, resolvedAt: "", resolvedByName: "", clearedAt: "" });
      }
    }
    db.adminAlerts = (db.adminAlerts || []).slice(0, 500);
    db.systemMonitor = snapshot;
    writeDb(db, { action: "state_sync", user: { id: "system", name: "Система", role: "system" } });
  });
  return { snapshot, alerts: (readDb().adminAlerts || []).slice(0, 200) };
}

function adminDiagnosticWithin(promise, fallback, timeoutMs = 2500) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise(resolve => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
}



function safeFileName(value) {
  return String(value || "").replace(/[^0-9A-Za-z._-]+/g, "_");
}

function monthKeyFromUrl(url) {
  const raw = String(url.searchParams.get("month") || todayStamp().slice(0, 7));
  return /^\d{4}-\d{2}$/.test(raw) ? raw : todayStamp().slice(0, 7);
}

function itemBelongsToMonth(item, month) {
  const values = [item?.date, item?.createdAt, item?.updatedAt, item?.startedAt, item?.endedAt, item?.registeredAt, item?.repliedAt];
  return values.some(value => String(value || "").startsWith(month));
}

function objectRecordsForMonth(records = {}, month) {
  const out = {};
  for (const [key, value] of Object.entries(records || {})) {
    const text = `${key} ${JSON.stringify(value || {})}`;
    if (text.includes(month)) out[key] = value;
  }
  return out;
}

function checkRecordsForMonth(records = {}, month) {
  const out = {};
  for (const [key, value] of Object.entries(records || {})) {
    const item = value?.to && typeof value.to === "object" ? value.to : value || {};
    const remarks = Array.isArray(item.commentLog) ? item.commentLog : [];
    if (String(key).includes(month) || remarks.some(entry => remarkBelongsToMonthServer(entry, month)) || JSON.stringify(value || {}).includes(month)) {
      out[key] = value;
    }
  }
  return out;
}

function monthlyExport(db, month) {
  db = normalizeDb(db);
  const checks = checkRecordsForMonth(db.checks, month);
  const requests = objectRecordsForMonth(db.requests, month);
  const pprSheets = objectRecordsForMonth(db.pprSheets, month);
  const serviceCosts = (db.serviceCosts || []).filter(item => itemBelongsToMonth(item, month));
  const downtimes = (db.downtimes || []).filter(item => itemBelongsToMonth(item, month));
  return {
    exportedAt: new Date().toISOString(),
    month,
    summary: {
      checks: Object.keys(checks).length,
      requests: Object.keys(requests).length,
      pprSheets: Object.keys(pprSheets).length,
      serviceCosts: serviceCosts.length,
      downtimes: downtimes.length,
      users: (db.users || []).length
    },
    checks,
    requests,
    pprSheets,
    inventory: db.inventory || {},
    catalog: db.catalog || { equipment: {} },
    serviceCosts,
    downtimes,
    users: (db.users || []).map(userPublic)
  };
}

function sendDownload(res, filename, value) {
  const data = JSON.stringify(value, null, 2);
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeFileName(filename)}"`,
    "Cache-Control": "no-store"
  });
  res.end(data);
}


function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[";,\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sendCsvDownload(res, filename, rows) {
  const data = rows.map(row => row.map(csvEscape).join(";")).join("\n");
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeFileName(filename)}"`,
    "Cache-Control": "no-store"
  });
  res.end("\ufeff" + data);
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendExcelDownload(res, filename, rows) {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
    th { background: #14324a; color: #fff; font-weight: 700; }
    th, td { border: 1px solid #8aa0b2; padding: 6px 8px; vertical-align: top; mso-number-format:"\\@"; }
    .section { font-weight: 700; background: #eef4f8; }
  </style>
</head>
<body>
  <table>
    ${rows.map((row, index) => `<tr>${row.map((cell, cellIndex) => {
      const tag = index === 0 ? "th" : "td";
      const cls = cellIndex === 0 && index > 0 ? ` class="section"` : "";
      return `<${tag}${cls}>${htmlEscape(cell)}</${tag}>`;
    }).join("")}</tr>`).join("\n")}
  </table>
</body>
</html>`;
  res.writeHead(200, {
    "Content-Type": "application/vnd.ms-excel; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeFileName(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "no-store"
  });
  res.end("\ufeff" + html);
}

const plantMonthFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Qyzylorda",
  year: "numeric",
  month: "2-digit"
});

function plantMonthKey(value) {
  const parsed = new Date(value || "");
  if (!Number.isFinite(parsed.getTime())) return String(value || "").slice(0, 7);
  const parts = Object.fromEntries(plantMonthFormatter.formatToParts(parsed).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}`;
}

function remarkBelongsToMonthServer(entry = {}, month = "") {
  return [
    entry.at,
    entry.resolutionSubmittedAt,
    entry.resolvedAt,
    entry.confirmedAt,
    entry.resolutionReturnedAt
  ].some(value => value && plantMonthKey(value) === month);
}

function exportPerson(name = "", role = "") {
  return String(name || "").trim() ? `${String(name).trim()}${role ? ` (${role})` : ""}` : String(role || "");
}

function monthlyCsvRows(db, month) {
  const exported = monthlyExport(db, month);
  const rows = [[
    "Раздел", "Дата", "Цех", "Оборудование", "Узел", "Статус", "Количество", "Кто записал",
    "Кто устранил", "Время устранения", "Кто подтвердил", "Время подтверждения", "Комментарий / описание"
  ]];
  for (const [key, value] of Object.entries(exported.checks || {})) {
    const [equipmentId, nodeIndexRaw, recordDate] = String(key).split(":");
    const nodeIndex = Number(nodeIndexRaw);
    const equipment = db.catalog?.equipment?.[equipmentId] || {};
    const item = value?.to && typeof value.to === "object" ? value.to : value || {};
    const area = equipment.area || DEFAULT_EQUIPMENT_AREAS_SERVER[equipmentId] || value?.area || item.area || "";
    const equipmentName = equipment.name || value?.equipment || item.equipment || `Оборудование ${equipmentId}`;
    const nodeName = (Array.isArray(equipment.nodes) ? equipment.nodes[nodeIndex] : "") || value?.node || item.node || `Узел ${nodeIndex + 1}`;
    const entries = (Array.isArray(item.commentLog) ? item.commentLog : [])
      .filter(entry => entry && !isDowntimeCommentEntryServer(entry) && String(entry.text || entry.photo || "").trim())
      .filter(entry => remarkBelongsToMonthServer(entry, month));
    if (entries.length) {
      entries.forEach(entry => {
        const pending = Boolean(entry.resolutionPendingConfirmation && !entry.resolved);
        const returned = Boolean(entry.resolutionReturnedAt && !pending && !entry.resolved);
        const resolutionTime = entry.resolved ? entry.resolvedAt || "" : pending ? entry.resolutionSubmittedAt || "" : "";
        rows.push([
          "Предупреждение",
          entry.at || recordDate || key,
          area,
          equipmentName,
          nodeName,
          entry.resolved ? "Подтверждено" : pending ? "На подтверждении" : returned ? "Возвращено" : "Открыто",
          "",
          exportPerson(entry.name || item.commentOwnerName, entry.role || item.commentOwnerRole),
          exportPerson(entry.resolvedByName || entry.resolutionSubmittedByName, entry.resolvedByRole || entry.resolutionSubmittedByRole),
          resolutionTime,
          exportPerson(entry.confirmedByName, entry.confirmedByRole),
          entry.confirmedAt || "",
          [
            entry.text || "",
            entry.resolvedComment || entry.resolutionSubmittedComment || "",
            returned ? `Возврат: ${entry.resolutionReturnReason || ""}` : ""
          ].filter(Boolean).join(" · ")
        ]);
      });
      continue;
    }
    rows.push([
      "Обход / замечание",
      value?.date || recordDate || key,
      area,
      equipmentName,
      nodeName,
      item.resolved ? "Устранено" : item.comment ? "Открыто" : item.status || "",
      "",
      item.commentAuthorName || item.authorName || "",
      exportPerson(item.resolvedByName, item.resolvedByRole),
      item.resolvedAt || "",
      exportPerson(item.confirmedByName, item.confirmedByRole),
      item.confirmedAt || "",
      item.comment || item.request || JSON.stringify(item || {})
    ]);
  }
  for (const [key, value] of Object.entries(exported.requests || {})) {
    rows.push([
      "Заявка",
      value?.createdAt || value?.date || key,
      value?.area || value?.stockArea || "",
      value?.equipment || value?.title || key,
      value?.node || "",
      value?.status || value?.routeStatus || "",
      value?.qtyReceived || value?.qtyIssued || value?.qty || "",
      value?.authorName || value?.requestAuthorName || "",
      "",
      "",
      "",
      "",
      value?.text || value?.comment || value?.description || JSON.stringify(value || {})
    ]);
  }
  for (const [date, sheet] of Object.entries(exported.pprSheets || {})) {
    const sheetRows = (Array.isArray(sheet?.rows) ? sheet.rows : [])
      .filter(row => String(row?.work || "").trim());
    for (const row of sheetRows) {
      rows.push([
        "Лист ППР",
        date,
        row.area || "",
        row.equipment || "Плановое обслуживание",
        row.node || "",
        row.mark === "done" ? "Выполнено" : row.mark === "na" ? "Не требуется" : "Без отметки",
        "",
        row.markedByName || sheet?.updatedByName || "",
        "",
        row.markedAt || "",
        sheet?.approvedByName || "",
        sheet?.approvedAt || "",
        `${row.work || ""}${row.markedAt ? ` · ${row.markedAt}` : ""}${sheet?.approvedByName ? ` · Принял инженер: ${sheet.approvedByName}` : ""}`
      ]);
    }
  }
  for (const item of exported.downtimes || []) {
    rows.push([
      "Простой",
      item?.startedAt || item?.date || "",
      item?.area || "",
      item?.equipment || "",
      item?.node || "",
      item?.type || item?.status || "",
      item?.durationText || item?.durationMs || "",
      item?.authorName || "",
      exportPerson(item?.closedByName, item?.closedByRole),
      item?.endedAt || "",
      "",
      "",
      item?.reason || item?.comment || JSON.stringify(item || {})
    ]);
  }
  return rows;
}

function createManualBackup(label = "manual") {
  flushLocalBackup();
  ensureDb();
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `db_backup_${safeFileName(label)}_${stamp}.json`);
  fs.copyFileSync(dbFile, backupFile);
  pruneOldBackups(30);
  return backupFile;
}

function backupChecksum(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function isAutomaticBackupLabel(value = "") {
  return /автомат|automatic/i.test(String(value || ""));
}

function backupRetentionDeleteIds(rows = [], now = Date.now()) {
  const automatic = rows
    .filter(row => isAutomaticBackupLabel(row.label))
    .map(row => ({ ...row, timestamp: Date.parse(row.createdAt) }))
    .filter(row => Number.isFinite(row.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp);
  const keptBuckets = new Set();
  const deleted = [];
  for (const row of automatic) {
    const ageDays = Math.max(0, (now - row.timestamp) / 86400000);
    if (ageDays <= 14) continue;
    if (ageDays > 366) { deleted.push(row.id); continue; }
    const date = new Date(row.timestamp);
    let bucket;
    if (ageDays <= 56) {
      const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = monday.getUTCDay() || 7;
      monday.setUTCDate(monday.getUTCDate() - day + 1);
      bucket = `week:${monday.toISOString().slice(0, 10)}`;
    } else {
      bucket = `month:${date.toISOString().slice(0, 7)}`;
    }
    if (keptBuckets.has(bucket)) deleted.push(row.id);
    else keptBuckets.add(bucket);
  }
  return deleted;
}

async function applyAdminBackupRetention() {
  if (postgresPool) {
    const result = await postgresPool.query(`SELECT backup_id AS id, label, created_at AS "createdAt" FROM ppr_admin_backups ORDER BY created_at DESC`);
    const deleteIds = backupRetentionDeleteIds(result.rows);
    if (deleteIds.length) await postgresPool.query("DELETE FROM ppr_admin_backups WHERE backup_id = ANY($1::text[])", [deleteIds]);
    return deleteIds.length;
  }
  if (!fs.existsSync(backupDir)) return 0;
  const rows = fs.readdirSync(backupDir)
    .filter(name => name.startsWith("db_backup_automatic_") && name.endsWith(".json"))
    .map(name => ({ id: name, label: "automatic", createdAt: fs.statSync(path.join(backupDir, name)).mtime.toISOString() }));
  const deleteIds = backupRetentionDeleteIds(rows);
  for (const name of deleteIds) fs.unlinkSync(path.join(backupDir, path.basename(name)));
  return deleteIds.length;
}

async function createAdminBackup(label = "manual", actorName = "Администратор", sourceDb = null) {
  await stateWriteQueue.catch(() => {});
  const payload = normalizeDb(structuredClone(sourceDb || readDb()));
  let id = `backup-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const cleanLabel = String(label || "Ручная копия").trim().slice(0, 200) || "Ручная копия";
  const automatic = isAutomaticBackupLabel(cleanLabel);
  const checksum = backupChecksum(payload);
  const localFile = createManualBackup(automatic ? `automatic_${cleanLabel}` : cleanLabel);
  if (!postgresPool) id = path.basename(localFile);
  if (postgresPool) {
    await postgresPool.query(
      `INSERT INTO ppr_admin_backups(backup_id, label, payload, checksum, created_by, created_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, now())`,
      [id, cleanLabel, JSON.stringify(payload), checksum, String(actorName || "Администратор").slice(0, 200)]
    );
  }
  await applyAdminBackupRetention();
  return { id, label: cleanLabel, checksum, sizeBytes: Buffer.byteLength(JSON.stringify(payload)), file: path.basename(localFile), createdBy: actorName, createdAt: new Date().toISOString(), storage: postgresPool ? "postgres" : "json" };
}

function backupRetentionTier(createdAt) {
  const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (ageDays <= 14) return "daily";
  if (ageDays <= 56) return "weekly";
  if (ageDays <= 366) return "monthly";
  return "archive";
}

async function listAdminBackups() {
  if (postgresPool) {
    const result = await postgresPool.query(`SELECT backup_id AS id, label, checksum, created_by AS "createdBy", created_at AS "createdAt", octet_length(payload::text) AS "sizeBytes" FROM ppr_admin_backups ORDER BY created_at DESC LIMIT 200`);
    return result.rows.map(row => ({ ...row, sizeBytes: Number(row.sizeBytes || 0), storage: "postgres", retentionTier: backupRetentionTier(row.createdAt) }));
  }
  try {
    return fs.readdirSync(backupDir).filter(name => name.startsWith("db_backup_") && name.endsWith(".json")).map(name => {
      const file = path.join(backupDir, name);
      const stat = fs.statSync(file);
      return { id: name, label: name, checksum: "", createdBy: "Система", createdAt: stat.mtime.toISOString(), sizeBytes: stat.size, storage: "json", retentionTier: backupRetentionTier(stat.mtime.toISOString()) };
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 200);
  } catch { return []; }
}

async function readAdminBackupPayload(id) {
  if (postgresPool) {
    const result = await postgresPool.query("SELECT payload, checksum FROM ppr_admin_backups WHERE backup_id=$1 LIMIT 1", [id]);
    if (!result.rows[0]) return null;
    const payload = result.rows[0].payload;
    return { payload, checksum: result.rows[0].checksum, valid: backupChecksum(payload) === result.rows[0].checksum };
  }
  const safeName = path.basename(String(id || ""));
  if (safeName !== id || !safeName.startsWith("db_backup_") || !safeName.endsWith(".json")) return null;
  const file = path.join(backupDir, safeName);
  if (!fs.existsSync(file)) return null;
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  return { payload, checksum: backupChecksum(payload), valid: true };
}

let automaticBackupRunning = false;

function adminAutomationSnapshot(db = readDb()) {
  const config = normalizedAdminConfig(db.adminConfig).automation;
  const status = db.adminAutomationStatus || {};
  const lastSuccessAt = String(status.lastSuccessAt || "");
  const nextRunAt = config.autoBackupEnabled
    ? new Date((lastSuccessAt ? Date.parse(lastSuccessAt) : Date.now()) + config.autoBackupIntervalHours * 3600000).toISOString()
    : "";
  return { ...config, lastSuccessAt, lastAttemptAt: String(status.lastAttemptAt || ""), lastError: String(status.lastError || ""), lastBackupId: String(status.lastBackupId || ""), nextRunAt, running: automaticBackupRunning };
}

async function runAutomaticBackupIfDue(force = false, actorName = "Система") {
  if (automaticBackupRunning) return { skipped: true, reason: "already_running", status: adminAutomationSnapshot() };
  const db = readDb();
  const snapshot = adminAutomationSnapshot(db);
  if (!force && !snapshot.autoBackupEnabled) return { skipped: true, reason: "disabled", status: snapshot };
  if (!force && snapshot.lastSuccessAt && Date.now() < Date.parse(snapshot.lastSuccessAt) + snapshot.autoBackupIntervalHours * 3600000) return { skipped: true, reason: "not_due", status: snapshot };
  automaticBackupRunning = true;
  try {
    const backup = await createAdminBackup(force ? "Копия по команде администратора" : "Автоматическая резервная копия", actorName);
    await enqueueStateWrite(async () => {
      const current = readDb();
      current.adminAutomationStatus = { lastAttemptAt: new Date().toISOString(), lastSuccessAt: backup.createdAt, lastBackupId: backup.id, lastError: "" };
      writeDb(current, { action: force ? "admin_automatic_backup_run" : "admin_automatic_backup_created", actorName, targetId: backup.id, targetLabel: backup.label });
    });
    return { ok: true, backup, status: adminAutomationSnapshot() };
  } catch (error) {
    await enqueueStateWrite(async () => {
      const current = readDb();
      current.adminAutomationStatus = { ...(current.adminAutomationStatus || {}), lastAttemptAt: new Date().toISOString(), lastError: String(error.message || error).slice(0, 1000) };
      writeDb(current, { action: "admin_automatic_backup_failed", actorName, details: String(error.message || error) });
    });
    throw error;
  } finally {
    automaticBackupRunning = false;
  }
}

function adminArchiveSelection(db, days = 180) {
  const safeDays = [30, 90, 180, 365, 730].includes(Number(days)) ? Number(days) : 180;
  const cutoffAt = new Date(Date.now() - safeDays * 86400000).toISOString();
  const older = value => Boolean(value) && String(value) < cutoffAt;
  const records = {
    audit: (db.adminAuditLog || []).filter(item => older(item.at)),
    resolved_alerts: (db.adminAlerts || []).filter(item => item.status === "resolved" && older(item.resolvedAt || item.lastSeenAt)),
    restored_trash: (db.adminTrash || []).filter(item => item.restoredAt && older(item.restoredAt)),
    config_history: (db.adminConfigHistory || []).filter(item => older(item.at))
  };
  return { days: safeDays, cutoffAt, records, counts: Object.fromEntries(Object.entries(records).map(([key, items]) => [key, items.length])) };
}

async function listAdminArchives(db = readDb()) {
  if (postgresPool) {
    const result = await postgresPool.query(`SELECT archive_id AS id, label, checksum, created_by AS "createdBy", created_at AS "createdAt", octet_length(payload::text) AS "sizeBytes" FROM ppr_admin_archives ORDER BY created_at DESC LIMIT 50`);
    return result.rows.map(row => ({ ...row, sizeBytes: Number(row.sizeBytes || 0), storage: "postgres" }));
  }
  return (db.adminArchives || []).slice(0, 50).map(item => ({ id: item.id, label: item.label, checksum: item.checksum, createdBy: item.createdBy, createdAt: item.createdAt, sizeBytes: Number(item.sizeBytes || 0), storage: "json" }));
}

async function createAdminArchive(payload, label, actorName) {
  const id = `archive-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const checksum = backupChecksum(payload);
  const createdAt = new Date().toISOString();
  const archive = { id, label: String(label || "Архив данных").slice(0, 200), payload, checksum, createdBy: String(actorName || "Администратор").slice(0, 200), createdAt, sizeBytes: Buffer.byteLength(JSON.stringify(payload)), storage: postgresPool ? "postgres" : "json" };
  if (postgresPool) {
    await postgresPool.query(`INSERT INTO ppr_admin_archives(archive_id,label,payload,checksum,created_by,created_at) VALUES($1,$2,$3::jsonb,$4,$5,$6)`, [id, archive.label, JSON.stringify(payload), checksum, archive.createdBy, createdAt]);
  }
  return archive;
}

async function readAdminArchive(id, db = readDb()) {
  if (postgresPool) {
    const result = await postgresPool.query("SELECT payload, checksum FROM ppr_admin_archives WHERE archive_id=$1 LIMIT 1", [id]);
    if (!result.rows[0]) return null;
    return { payload: result.rows[0].payload, checksum: result.rows[0].checksum };
  }
  return (db.adminArchives || []).find(item => item.id === id) || null;
}

function flushLocalBackup() {
  if (localBackupTimer) {
    clearTimeout(localBackupTimer);
    localBackupTimer = null;
  }
  if (!localBackupPendingState) return;
  const latest = localBackupPendingState;
  localBackupPendingState = null;
  writeDbFile(latest);
}

function scheduleLocalBackup(db) {
  localBackupPendingState = db;
  if (localBackupTimer) return;
  localBackupTimer = setTimeout(() => {
    localBackupTimer = null;
    flushLocalBackup();
  }, 250);
}

function schedulePostgresWrite(db) {
  if (!postgresPool) return;
  postgresPendingState = db;
  if (postgresWriterActive) return;
  postgresWriterActive = true;
  postgresWriteQueue = (async () => {
    while (postgresPendingState) {
      const latest = postgresPendingState;
      postgresPendingState = null;
      try {
        await postgresPool.query(
          `INSERT INTO ppr_settings(setting_key, payload, updated_at)
           VALUES ('full_state', $1::jsonb, now())
           ON CONFLICT(setting_key) DO UPDATE
           SET payload = EXCLUDED.payload, updated_at = now()`,
          [JSON.stringify(latest)]
        );
        const backupDate = todayStamp();
        if (lastPostgresBackupDate !== backupDate) {
          await postgresPool.query(
            `INSERT INTO ppr_state_backups(backup_date, payload)
             VALUES (current_date, $1::jsonb)
             ON CONFLICT(backup_date) DO NOTHING`,
            [JSON.stringify(latest)]
          );
          await postgresPool.query("DELETE FROM ppr_state_backups WHERE backup_date < current_date - interval '30 days'");
          lastPostgresBackupDate = backupDate;
        }
        storageStatus = {
          mode: "postgres-cluster",
          table: "ppr_settings",
          key: "full_state",
          lastWriteAt: new Date().toISOString(),
          cluster: postgresClusterStatus
        };
      } catch (error) {
        console.error(`PostgreSQL write failed; retry scheduled and JSON backup preserved: ${error.message}`);
        storageStatus = {
          mode: "postgres-degraded",
          table: "ppr_settings",
          key: "full_state",
          error: error.message,
          retrying: true
        };
        postgresPendingState = latest;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  })().finally(() => {
    postgresWriterActive = false;
    if (postgresPendingState) schedulePostgresWrite(postgresPendingState);
  });
}

async function flushPostgresWrites() {
  while (postgresWriterActive || postgresPendingState) {
    if (!postgresWriterActive && postgresPendingState) schedulePostgresWrite(postgresPendingState);
    const activeWrite = postgresWriteQueue;
    await activeWrite;
    if (activeWrite === postgresWriteQueue && !postgresWriterActive && !postgresPendingState) break;
  }
}

function writeDb(db, action = {}) {
  const normalized = normalizeDb(db);
  const actionName = String(action?.action || "").trim();
  if (actionName && !["state_write", "state_sync"].includes(actionName)) {
    const actor = action.user && typeof action.user === "object" ? action.user : {};
    normalized.adminAuditLog.unshift({
      id: `admin-audit:${Date.now()}:${crypto.randomBytes(5).toString("hex")}`,
      at: new Date().toISOString(),
      action: actionName,
      actorId: String(actor.id || ""),
      actorName: String(actor.name || action.actorName || "Система").slice(0, 200),
      actorRole: String(actor.role || "system").slice(0, 80),
      targetType: String(action.targetType || "").slice(0, 80),
      targetId: String(action.targetId || action.targetUserId || "").slice(0, 300),
      targetLabel: String(action.targetLabel || "").slice(0, 500),
      reason: String(action.reason || "").slice(0, 2000),
      details: String(action.details || "").slice(0, 4000),
      clientId: String(action.clientId || "").slice(0, 200)
    });
    normalized.adminAuditLog = normalized.adminAuditLog.slice(0, 5000);
  }
  purgeRemovedEquipmentData(normalized);
  externalizePhotosInValue(normalized);
  if (postgresPool) {
    postgresState = normalized;
    scheduleLocalBackup(normalized);
    schedulePostgresWrite(normalized);
  } else writeDbFile(normalized);
  appendActionLog(action);
}

function migrateLegacyDirectorApprovals(db) {
  let changed = false;
  const now = new Date().toISOString();
  for (const req of Object.values(db.requests || {})) {
    if (!req || typeof req !== "object") continue;
    if (req.deleted || req.route === "stock" || req.sourceRole === "engineer") continue;
    const isTmcRequest = req.kind === "tmc" || String(req.id || "").startsWith("tmc-request:");
    if (!isTmcRequest || req.productionDirectorRequestApproved) continue;
    const alreadyPastDirector = Boolean(
      req.financePreApproved ||
      req.supplyPrepared ||
      req.financeApproved ||
      req.cashApproved ||
      req.transferredToWarehouse ||
      req.warehouseReceived ||
      req.issued ||
      req.done ||
      req.stock
    );
    if (!alreadyPastDirector) continue;
    req.productionDirectorRequestApproved = true;
    req.approvals ||= {};
    req.approvals.productionDirectorRequest ||= {
      role: "productionDirector",
      name: "Перенесено из старой логики",
      at: req.updatedAt || req.createdAt || now,
      note: "Техническая миграция: заявка уже прошла дальше по старому маршруту."
    };
    req.history ||= [];
    if (!req.history.some(entry => String(entry?.action || "").includes("старая логика"))) {
      req.history.push({
        at: now,
        action: "Техническая отметка: директор производства",
        details: "Перенесено из старой логики, заявка уже была на следующем этапе.",
        status: req.status || "",
        role: "system",
        name: "PPR Control"
      });
    }
    req.updatedAt = req.updatedAt || now;
    changed = true;
  }
  return changed;
}

function removeObsoletePressNoMaterialNodes(db) {
  let changed = false;
  for (const equipmentId of ["1", "2"]) {
    const item = db.catalog?.equipment?.[equipmentId];
    if (!item || !Array.isArray(item.nodes)) continue;
    const removedIndexes = [];
    const nodes = item.nodes.filter((node, index) => {
      const obsolete = String(node || "").trim().toLocaleLowerCase("ru-RU") === "нет сырья";
      if (obsolete) removedIndexes.push(index);
      return !obsolete;
    });
    if (!removedIndexes.length) continue;
    item.nodes = nodes;
    if (item.reminders && typeof item.reminders === "object") {
      const nextReminders = {};
      Object.entries(item.reminders).forEach(([rawIndex, lines]) => {
        const oldIndex = Number(rawIndex);
        if (!Number.isInteger(oldIndex) || removedIndexes.includes(oldIndex)) return;
        const shift = removedIndexes.filter(index => index < oldIndex).length;
        nextReminders[oldIndex - shift] = lines;
      });
      item.reminders = nextReminders;
    }
    item.updatedAt = new Date().toISOString();
    changed = true;
  }
  return changed;
}

function removeKnownFalseDowntimes(db) {
  db.downtimes = Array.isArray(db.downtimes) ? db.downtimes : [];
  let changed = false;
  const now = new Date().toISOString();
  for (const downtimeId of FALSE_DOWNTIME_IDS) {
    const item = db.downtimes.find(entry => String(entry?.id || "") === downtimeId);
    if (item) {
      if (item.deleted) continue;
      item.deleted = true;
      item.deletedAt = now;
      item.updatedAt = now;
      item.endedAt ||= now;
      item.systemNote = "Удалён подтверждённый ложный простой «Нет сырья».";
      changed = true;
      continue;
    }
    db.downtimes.push({
      id: downtimeId,
      deleted: true,
      deletedAt: now,
      updatedAt: now,
      endedAt: now,
      systemNote: "Защитная отметка для подтверждённого ложного простоя «Нет сырья»."
    });
    changed = true;
  }
  return changed;
}

function purgeRemovedEquipmentData(db) {
  let changed = false;
  db.catalog ||= { equipment: {} };
  db.catalog.equipment ||= {};
  for (const equipmentId of REMOVED_EQUIPMENT_IDS) {
    if (Object.prototype.hasOwnProperty.call(db.catalog.equipment, equipmentId)) {
      delete db.catalog.equipment[equipmentId];
      changed = true;
    }
  }
  const isRemovedItem = item => REMOVED_EQUIPMENT_IDS.has(String(item?.equipmentId ?? ""));
  const nextChecks = Object.fromEntries(Object.entries(db.checks || {}).filter(([key]) =>
    !REMOVED_EQUIPMENT_IDS.has(String(key).split(":")[0])
  ));
  if (Object.keys(nextChecks).length !== Object.keys(db.checks || {}).length) changed = true;
  db.checks = nextChecks;
  const nextRequests = Object.fromEntries(Object.entries(db.requests || {}).filter(([, item]) => !isRemovedItem(item)));
  if (Object.keys(nextRequests).length !== Object.keys(db.requests || {}).length) changed = true;
  db.requests = nextRequests;
  for (const field of ["serviceCosts", "downtimes", "auditHistory", "systemBroadcasts"]) {
    const current = Array.isArray(db[field]) ? db[field] : [];
    const filtered = current.filter(item => !isRemovedItem(item));
    if (filtered.length !== current.length) changed = true;
    db[field] = filtered;
  }
  for (const sheet of Object.values(db.pprSheets || {})) {
    if (!Array.isArray(sheet?.rows)) continue;
    const filtered = sheet.rows.filter(item => !isRemovedItem(item));
    if (filtered.length !== sheet.rows.length) {
      sheet.rows = filtered;
      changed = true;
    }
  }
  const nextDueSince = Object.fromEntries(Object.entries(db.journalDueSince || {}).filter(([key, item]) =>
    !REMOVED_EQUIPMENT_IDS.has(String(key).split(":")[0]) && !isRemovedItem(item)
  ));
  if (Object.keys(nextDueSince).length !== Object.keys(db.journalDueSince || {}).length) changed = true;
  db.journalDueSince = nextDueSince;
  return changed;
}

function validMonthKey(value = "") {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || "")) ? String(value) : "";
}

function nextMonthKey(month = "") {
  if (!validMonthKey(month)) return "";
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthCloseReadiness(db, month) {
  month = validMonthKey(month);
  if (!month) return null;
  const startMs = Date.parse(`${month}-01T00:00:00.000Z`);
  const [year, monthNumber] = month.split("-").map(Number);
  const endMs = Date.UTC(year, monthNumber, 1);
  const openRemarks = [];
  Object.entries(db.checks || {}).forEach(([recordKey, record]) => {
    if (!recordKey.includes(`:${month}-`)) return;
    ensureRemarkEntriesServer(record?.to || {}).filter(item => !item.resolved).forEach(item => openRemarks.push({ id: item.id || "", recordKey, text: String(item.text || "").slice(0, 300) }));
  });
  const activeBreakdowns = (db.downtimes || []).filter(item => {
    if (!item || item.deleted || item.type === "production") return false;
    const started = Date.parse(item.startedAt || "");
    const ended = item.endedAt ? Date.parse(item.endedAt) : Date.now();
    return Number.isFinite(started) && started < endMs && ended >= startMs && !item.endedAt;
  }).map(item => ({ id: item.id || "", equipment: item.equipment || "Оборудование", reason: item.reason || item.comment || "Аварийная остановка" }));
  const incompletePpr = Object.entries(db.pprSheets || {}).filter(([key, sheet]) => key.includes(month) && sheet && !sheet.engineerApprovedAt && (sheet.rows || []).length).map(([key]) => ({ id: key }));
  const criticalCount = openRemarks.length + activeBreakdowns.length;
  const warningCount = incompletePpr.length;
  const readinessPercent = Math.max(0, 100 - Math.min(criticalCount * 15, 60) - Math.min(warningCount * 5, 40));
  return {
    month,
    readinessPercent,
    criticalCount,
    warningCount,
    greenCount: Math.max(0, 3 - Number(Boolean(openRemarks.length)) - Number(Boolean(activeBreakdowns.length)) - Number(Boolean(incompletePpr.length))),
    groups: { openRemarks, activeBreakdowns, incompletePpr },
    productionStopsExcluded: (db.downtimes || []).filter(item => item?.type === "production" && String(item.startedAt || "").slice(0, 7) === month).length,
    calculatedAt: new Date().toISOString()
  };
}

function publicState(db = readDb()) {
  return {
    checks: db.checks,
    requests: db.requests,
    orders: db.orders,
    inventory: db.inventory,
    catalog: db.catalog,
    adminConfig: {
      companyName: normalizedAdminConfig(db.adminConfig).companyName,
      departments: normalizedAdminConfig(db.adminConfig).departments,
      positions: normalizedAdminConfig(db.adminConfig).positions,
      formPolicies: normalizedAdminConfig(db.adminConfig).formPolicies,
      excludedRatingWorkers: normalizedAdminConfig(db.adminConfig).excludedRatingWorkers
    },
    serviceCosts: db.serviceCosts,
    downtimes: db.downtimes,
    monthlyClosures: db.monthlyClosures || {},
    compressorJournal: db.compressorJournal,
    gasJournal: db.gasJournal,
    gpmJournal: db.gpmJournal,
    weldingJournal: db.weldingJournal || {},
    turningJournal: db.turningJournal || {},
    pprSheets: db.pprSheets,
    annualPpr: db.annualPpr,
    journalDueSince: db.journalDueSince,
    auditHistory: db.auditHistory,
    systemBroadcasts: db.systemBroadcasts,
    operationalResetAt: db.operationalResetAt || "",
    walkShiftCleanupVersion: db.walkShiftCleanupVersion || ""
  };
}

function openRemarkKeysServer(db = readDb()) {
  const keys = new Set();
  for (const [recordKey, record] of Object.entries(db.checks || {})) {
    const item = record?.to;
    if (!item) continue;
    ensureRemarkEntriesServer(item).filter(entry => !entry.resolved).forEach(entry => keys.add(`${recordKey}|${entry.id}`));
  }
  return keys;
}

function remarkEntryByKeyServer(db, key) {
  const separator = String(key || "").lastIndexOf("|");
  if (separator < 0) return null;
  const recordKey = String(key).slice(0, separator);
  const remarkId = String(key).slice(separator + 1);
  const entry = ensureRemarkEntriesServer(db.checks?.[recordKey]?.to).find(item => String(item.id) === remarkId);
  return entry ? { recordKey, remarkId, entry } : null;
}

function subscriptionMatchesRemarkServer(db, subscriptionEntry, remarkRecord = {}) {
  const entry = remarkRecord.entry || remarkRecord;
  const recordKey = String(remarkRecord.recordKey || "");
  const profile = subscriptionEntry?.profile || {};
  const actor = sanitizeResolutionParticipant(profile);
  const participants = resolutionParticipantsServer(entry);
  if (participants.some(participant => subscriptionMatchesResolutionParticipant(subscriptionEntry, participant))) return true;
  const area = String(
    entry?.area
    || entry?.confirmationArea
    || remarkEquipmentAreaServer(db, recordKey, "")
    || ""
  ).trim();
  const role = permissionBaseRoleServer(String(profile.role || ""));
  if (role === "shop") return Boolean(area && sameRemarkAreaServer(profile.area, area));
  if (role === "engineer") return !(db.users || []).some(user =>
    user.approved !== false
    && user.pendingApproval !== true
    && permissionBaseRoleServer(user.role) === "shop"
    && sameRemarkAreaServer(user.area, area)
  );
  return false;
}

async function localizedPushPayloadServer(payload, subscriptionEntry) {
  const language = ["ru", "kk", "uz"].includes(String(subscriptionEntry?.profile?.language || "")) ? String(subscriptionEntry.profile.language) : "ru";
  if (language !== "uz") return JSON.stringify(payload);
  const [title, body] = await Promise.all([
    translateExternal(String(payload.title || ""), language),
    translateExternal(String(payload.body || ""), language)
  ]);
  return JSON.stringify({ ...payload, title, body });
}

function ensurePushConfig(db) {
  db.pushNotifications ||= { subscriptions: [], vapid: null };
  db.pushNotifications.subscriptions = Array.isArray(db.pushNotifications.subscriptions) ? db.pushNotifications.subscriptions : [];
  if (!db.pushNotifications.vapid?.publicKey || !db.pushNotifications.vapid?.privateKey) {
    db.pushNotifications.vapid = webPush.generateVAPIDKeys();
    return true;
  }
  return false;
}

async function sendRemarkPushNotifications(added, total, origin = "", url = "/?view=remarks", entityId = "general", newRemarks = []) {
  if (!added) return;
  const db = readDb();
  const configChanged = ensurePushConfig(db);
  const subscriptions = db.pushNotifications.subscriptions || [];
  const targets = subscriptions.filter(item => (!origin || item.clientId !== origin) && newRemarks.some(remark => subscriptionMatchesRemarkServer(db, item, remark)));
  if (!subscriptions.length) {
    if (configChanged) writeDb(db, { action: "push_config_created" });
    return;
  }
  webPush.setVapidDetails(
    "https://ppr-control-ramazan.onrender.com",
    db.pushNotifications.vapid.publicKey,
    db.pushNotifications.vapid.privateKey
  );
  const expired = new Set();
  await Promise.allSettled(targets.map(async item => {
    try {
      const payload = {
        type: "remark",
        title: "ALKZ — новое замечание",
        body: added === 1 ? "Поступило новое замечание" : `Новых замечаний: ${added}`,
        badgeCount: personalNotificationCountServer(db, item),
        url,
        entityId,
        tag: `remark:${entityId}`
      };
      await webPush.sendNotification(item.subscription, await localizedPushPayloadServer(payload, item), { TTL: 3600, urgency: "high" });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) expired.add(item.subscription?.endpoint);
      else console.error(`Push notification failed: ${error?.message || error}`);
    }
  }));
  if (expired.size) {
    db.pushNotifications.subscriptions = subscriptions.filter(item => !expired.has(item.subscription?.endpoint));
    writeDb(db, { action: "push_subscriptions_cleaned", count: expired.size });
  } else if (configChanged) {
    writeDb(db, { action: "push_config_created" });
  }
}

function engineerIncomingRequestItemCountServer(db) {
  return Object.values(db.requests || {}).reduce((sum, request) => {
    if (!request || request.deleted || request.done || request.stock || request.kind !== "tmc" || !request.engineerCombinedBatch
      || request.formedAt || request.engineerApproved || request.productionDirectorRequestApproved || request.transferredToWarehouse) return sum;
    return sum + Math.max(1, Array.isArray(request.items) ? request.items.length : 0);
  }, 0);
}

async function sendEngineerRequestPushNotifications(db, submittedCount, origin = "", request = {}) {
  const added = Math.max(1, Number(submittedCount) || 1);
  ensurePushConfig(db);
  const subscriptions = db.pushNotifications.subscriptions || [];
  const targets = subscriptions.filter(entry => (!origin || entry.clientId !== origin) && engineerPermissionRoleServer(entry.profile) === "engineer");
  if (!targets.length) return;
  webPush.setVapidDetails(
    "https://ppr-control-ramazan.onrender.com",
    db.pushNotifications.vapid.publicKey,
    db.pushNotifications.vapid.privateKey
  );
  const expired = new Set();
  await Promise.allSettled(targets.map(async entry => {
    try {
      const payload = {
        type: "engineer-request",
        title: "ALKZ — новая заявка инженеру",
        body: added === 1 ? "Поступила 1 новая позиция" : `Поступило новых позиций: ${added}`,
        badgeCount: personalNotificationCountServer(db, entry),
        url: "/?view=requestCreate",
        entityId: request.id || "engineer-incoming",
        tag: `engineer-request:${request.id || "incoming"}`
      };
      await webPush.sendNotification(entry.subscription, await localizedPushPayloadServer(payload, entry), { TTL: 86400, urgency: "high" });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) expired.add(entry.subscription?.endpoint);
      else console.error(`Engineer request push failed: ${error?.message || error}`);
    }
  }));
  if (expired.size) {
    db.pushNotifications.subscriptions = subscriptions.filter(entry => !expired.has(entry.subscription?.endpoint));
    writeDb(db, { action: "push_subscriptions_cleaned", count: expired.size });
  }
}

async function sendPprApprovalPushNotifications(db, sheet, origin = "") {
  ensurePushConfig(db);
  const subscriptions = db.pushNotifications.subscriptions || [];
  const targets = subscriptions.filter(entry =>
    (!origin || entry.clientId !== origin)
    && engineerPermissionRoleServer(entry.profile) === "engineer"
  );
  if (!targets.length) return;
  webPush.setVapidDetails(
    "https://ppr-control-ramazan.onrender.com",
    db.pushNotifications.vapid.publicKey,
    db.pushNotifications.vapid.privateKey
  );
  const activeRows = (sheet.rows || []).filter(row => String(row?.work || "").trim());
  const equipment = [...new Set(activeRows.map(row => row.equipment).filter(Boolean))].join(", ");
  const expired = new Set();
  await Promise.allSettled(targets.map(async entry => {
    try {
      const entityId = sheet.id || `ppr-sheet:${sheet.date}`;
      const payload = {
        type: "ppr-approval",
        title: "ALKZ — ППР выполнен",
        body: `${equipment || "Плановые работы"}: требуется подтверждение инженера`,
        badgeCount: personalNotificationCountServer(db, entry),
        url: "/?view=requests",
        entityId,
        tag: `ppr-approval:${entityId}`
      };
      await webPush.sendNotification(entry.subscription, await localizedPushPayloadServer(payload, entry), { TTL: 86400, urgency: "high" });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) expired.add(entry.subscription?.endpoint);
      else console.error(`PPR approval push failed: ${error?.message || error}`);
    }
  }));
  if (expired.size) {
    db.pushNotifications.subscriptions = subscriptions.filter(entry => !expired.has(entry.subscription?.endpoint));
    writeDb(db, { action: "push_subscriptions_cleaned", count: expired.size });
  }
}

async function clearPprApprovalPushNotifications(db, sheet, origin = "") {
  ensurePushConfig(db);
  const subscriptions = db.pushNotifications.subscriptions || [];
  const targets = subscriptions.filter(entry =>
    (!origin || entry.clientId !== origin)
    && engineerPermissionRoleServer(entry.profile) === "engineer"
  );
  if (!targets.length) return;
  webPush.setVapidDetails(
    "https://ppr-control-ramazan.onrender.com",
    db.pushNotifications.vapid.publicKey,
    db.pushNotifications.vapid.privateKey
  );
  const entityId = sheet.id || `ppr-sheet:${sheet.date}`;
  const expired = new Set();
  await Promise.allSettled(targets.map(async entry => {
    try {
      await webPush.sendNotification(entry.subscription, JSON.stringify({
        type: "ppr-approval-cleared",
        badgeCount: personalNotificationCountServer(db, entry),
        clearTag: `ppr-approval:${entityId}`,
        silentUpdate: true
      }), { TTL: 300, urgency: "normal" });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) expired.add(entry.subscription?.endpoint);
      else console.error(`PPR approval clear push failed: ${error?.message || error}`);
    }
  }));
  if (expired.size) {
    db.pushNotifications.subscriptions = subscriptions.filter(entry => !expired.has(entry.subscription?.endpoint));
    writeDb(db, { action: "push_subscriptions_cleaned", count: expired.size });
  }
}

function resolutionUserKeyServer(user = {}) {
  const id = String(user.id || "").trim();
  if (id) return `id:${id}`;
  const employeeId = String(user.employeeId || "").trim().toLowerCase();
  if (employeeId) return `employee:${employeeId}`;
  const phone = String(user.phone || "").replace(/\D/g, "");
  if (phone) return `phone:${phone}`;
  return `person:${String(user.role || "").trim().toLowerCase()}:${String(user.name || "").trim().toLowerCase()}`;
}

function sanitizeResolutionParticipant(user = {}) {
  return {
    key: resolutionUserKeyServer(user),
    id: String(user.id || "").slice(0, 200),
    employeeId: String(user.employeeId || "").slice(0, 100),
    phone: String(user.phone || "").slice(0, 100),
    name: String(user.name || "Сотрудник").trim().slice(0, 200),
    role: String(user.role || "").trim().slice(0, 50),
    area: String(user.area || "").trim().slice(0, 200)
  };
}

function resolutionParticipantsServer(item = {}) {
  const seen = new Set();
  return (Array.isArray(item.resolutionParticipants) ? item.resolutionParticipants : [])
    .map(sanitizeResolutionParticipant)
    .filter(participant => participant.key && !seen.has(participant.key) && seen.add(participant.key));
}

function isDowntimeCommentEntryServer(entry = {}) {
  const text = String(entry.text || "").trim();
  return entry.type === "downtime" || text.startsWith("Пуск:") || text.startsWith("Стоп:");
}

function stableRemarkIdServer(entry = {}) {
  if (entry.id) return String(entry.id);
  const source = [entry.at, entry.type, entry.role, entry.name, entry.text, entry.photo]
    .map(value => String(value || ""))
    .join("\u0001");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `remark:${String(entry.at || "legacy")}:${(hash >>> 0).toString(36)}`;
}

const REMARK_COLLABORATION_FIELDS_SERVER = [
  "resolutionParticipants", "resolutionUpdates", "resolutionEvents", "resolutionStartedAt",
  "resolutionPartInstalled", "resolutionPartDescription", "resolutionPartPhotos", "partInstalled", "partDescription", "partPhotos",
  "resolutionLeadKey", "resolutionLeadName", "resolutionCompletedParticipants",
  "resolutionPendingConfirmation", "resolutionSubmittedAt", "resolutionSubmittedByKey",
  "resolutionSubmittedByName", "resolutionSubmittedByRole", "resolutionSubmittedComment",
  "resolutionSubmittedPhoto", "confirmationRequiredKey", "confirmationRequiredName",
  "confirmationRequiredRole", "confirmationArea", "confirmedAt", "confirmedByKey",
  "confirmedByName", "confirmedByRole", "resolutionReturnedAt", "resolutionReturnedByKey",
  "resolutionReturnedByName", "resolutionReturnedByRole", "resolutionReturnReason",
  "resolutionDowntimeIds", "resolutionReturnedDowntimeIds"
];

function ensureRemarkEntriesServer(item = {}) {
  const entries = (Array.isArray(item.commentLog) ? item.commentLog : [])
    .filter(entry => entry && !isDowntimeCommentEntryServer(entry) && String(entry.text || entry.photo || "").trim());
  entries.forEach(entry => {
    entry.id ||= stableRemarkIdServer(entry);
    if (typeof entry.resolved !== "boolean") entry.resolved = Boolean(item.resolved);
  });
  const legacyTarget = entries.find(entry => !entry.resolved);
  if (legacyTarget && REMARK_COLLABORATION_FIELDS_SERVER.some(field => item[field] !== undefined)) {
    REMARK_COLLABORATION_FIELDS_SERVER.forEach(field => {
      if (legacyTarget[field] === undefined && item[field] !== undefined) legacyTarget[field] = item[field];
      delete item[field];
    });
  }
  return entries;
}

function syncItemRemarkSummaryServer(item = {}) {
  const entries = ensureRemarkEntriesServer(item);
  if (!entries.length) return;
  const allResolved = entries.every(entry => entry.resolved);
  item.resolved = allResolved;
  if (!allResolved) {
    item.resolvedAt = "";
    item.confirmedAt = "";
    return;
  }
  const latest = entries.slice().sort((a, b) => String(b.resolvedAt || "").localeCompare(String(a.resolvedAt || "")))[0] || {};
  item.resolvedAt = latest.resolvedAt || item.resolvedAt || "";
  item.resolvedByName = latest.resolvedByName || item.resolvedByName || "";
  item.resolvedByRole = latest.resolvedByRole || item.resolvedByRole || "";
  item.resolvedComment = latest.resolvedComment || item.resolvedComment || "";
  item.resolvedPhoto = latest.resolvedPhoto || item.resolvedPhoto || "";
  item.resolvedDurationMs = Number(latest.resolvedDurationMs || item.resolvedDurationMs || 0);
  item.confirmedAt = latest.confirmedAt || item.confirmedAt || "";
  item.confirmedByName = latest.confirmedByName || item.confirmedByName || "";
  item.confirmedByRole = latest.confirmedByRole || item.confirmedByRole || "";
}

function approvedResolutionUsersServer(db) {
  return (db.users || [])
    .filter(user => user && user.approved !== false && user.pendingApproval !== true)
    .map(sanitizeResolutionParticipant);
}

function sameRemarkAuthorServer(user = {}, remark = {}) {
  const userKey = resolutionUserKeyServer(user);
  if (remark.authorKey && userKey === String(remark.authorKey)) return true;
  return Boolean(remark.name && remark.role
    && String(user.name || "").trim().toLowerCase() === String(remark.name).trim().toLowerCase()
    && String(user.role || "") === String(remark.role));
}

function sameRemarkAreaServer(left = "", right = "") {
  return String(left || "").trim().toLocaleLowerCase("ru-RU") === String(right || "").trim().toLocaleLowerCase("ru-RU");
}

function remarkConfirmationRuleServer(db, remark = {}, equipmentArea = "") {
  const users = approvedResolutionUsersServer(db);
  const area = String(equipmentArea || remark.confirmationArea || "").trim().slice(0, 200);
  const globalUsers = (db.users || [])
    .filter(user => user && user.approved !== false && user.pendingApproval !== true)
    .filter(user => permissionBaseRoleServer(user.role) === "editor"
      || (engineerPermissionRoleServer(user) === "engineer" && activeUserPermission(user, "remarkGlobalConfirm")))
    .map(sanitizeResolutionParticipant);
  const mergeUsers = (...groups) => [...new Map(groups.flat().map(user => [resolutionUserKeyServer(user), user])).values()];
  const shopUsers = area ? users.filter(user => permissionBaseRoleServer(user.role) === "shop" && sameRemarkAreaServer(user.area, area)) : [];
  if (shopUsers.length) return { mode: "shop", role: "shop", area, users: mergeUsers(shopUsers, globalUsers), globalUsers };
  return { mode: "engineer", role: "engineer", area, users: mergeUsers(users.filter(user => engineerPermissionRoleServer(user) === "engineer"), globalUsers), globalUsers };
}

function actorCanConfirmRemarkServer(actor, remark, rule) {
  if (permissionBaseRoleServer(actor?.role) === "editor") return true;
  if ((rule.globalUsers || []).some(user => resolutionUserKeyServer(user) === resolutionUserKeyServer(actor))) return true;
  const role = engineerPermissionRoleServer(actor);
  if (rule.mode === "shop") return role === "shop" && sameRemarkAreaServer(actor.area, rule.area);
  if (rule.mode === "engineer") return role === "engineer";
  return false;
}

const DEFAULT_EQUIPMENT_AREAS_SERVER = Object.freeze({
  "1": "Прессовый участок",
  "2": "Прессовый участок",
  "3": "Литейный цех",
  "4": "Покрасочный цех",
  "5": "Шихтовый цех",
  "6": "Анодный цех",
  "7": "Упаковка",
  "8": "Инструментальный цех",
  "9": "Компрессорная",
  "10": "Насосная",
  "11": "Токарный цех",
  "12": "Электроподстанции",
  "13": "Территория",
  "14": "Офисные помещения",
  "15": "Газовое хозяйство",
  "16": "Резерв",
  "17": "Резерв",
  "18": "Резерв",
  "19": "Резерв",
  "20": "Резерв"
});

function remarkEquipmentAreaServer(db, recordKey, requestedArea = "") {
  const equipmentId = String(recordKey || "").split(":")[0];
  const record = db.checks?.[recordKey] || {};
  return String(
    db.catalog?.equipment?.[equipmentId]?.area
    || DEFAULT_EQUIPMENT_AREAS_SERVER[equipmentId]
    || record.area
    || record.to?.area
    || requestedArea
    || ""
  ).trim().slice(0, 200);
}

function remarkEquipmentNodeServer(recordKey = "") {
  const [equipmentIdRaw, nodeIndexRaw] = String(recordKey || "").split(":");
  const equipmentId = Number(equipmentIdRaw);
  const nodeIndex = Number(nodeIndexRaw);
  return {
    equipmentId: Number.isFinite(equipmentId) ? equipmentId : -1,
    nodeIndex: Number.isFinite(nodeIndex) ? nodeIndex : -1
  };
}

function closeRemarkDowntimesServer(db, recordKey, remark, actor, text, now) {
  const { equipmentId, nodeIndex } = remarkEquipmentNodeServer(recordKey);
  const closed = (db.downtimes || []).filter(item =>
    item && !item.deleted && !item.endedAt
    && Number(item.equipmentId) === equipmentId
    && Number(item.nodeIndex) === nodeIndex
  );
  closed.forEach(item => {
    item.endedAt = now;
    item.updatedAt = now;
    item.closeComment = text;
    item.closedByName = actor.name;
    item.closedByRole = actor.role;
    item.closedByKey = actor.key;
    item.closedParticipants = [actor];
    item.closedByRemarkId = String(remark.id || "");
    item.closeAwaitingConfirmation = true;
  });
  remark.resolutionDowntimeIds = closed.map(item => item.id);
  remark.resolutionReturnedDowntimeIds = [];
  return closed;
}

function reopenRemarkDowntimesServer(db, recordKey, remark, actor, reason, now) {
  const { equipmentId, nodeIndex } = remarkEquipmentNodeServer(recordKey);
  const alreadyActive = (db.downtimes || []).some(item =>
    item && !item.deleted && !item.endedAt
    && Number(item.equipmentId) === equipmentId
    && Number(item.nodeIndex) === nodeIndex
  );
  if (alreadyActive) return [];
  const sourceIds = new Set(Array.isArray(remark.resolutionDowntimeIds) ? remark.resolutionDowntimeIds : []);
  const reopened = (db.downtimes || [])
    .filter(item => item && sourceIds.has(item.id))
    .map(item => ({
      ...item,
      id: `downtime:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`,
      startedAt: now,
      endedAt: "",
      updatedAt: now,
      closeComment: "",
      closedByName: "",
      closedByRole: "",
      closedByKey: "",
      closedParticipants: [],
      closedByRemarkId: "",
      closeAwaitingConfirmation: false,
      continuedFromDowntimeId: item.id,
      reopenedByRemarkId: String(remark.id || ""),
      reopenedByName: actor.name,
      reopenReason: reason
    }));
  db.downtimes ||= [];
  db.downtimes.unshift(...reopened);
  remark.resolutionReturnedDowntimeIds = reopened.map(item => item.id);
  return reopened;
}

function reconcilePendingRemarkDowntimes(db) {
  let changed = false;
  Object.entries(db.checks || {}).forEach(([recordKey, record]) => {
    ensureRemarkEntriesServer(record?.to || {}).forEach(remark => {
      if (!remark?.resolutionPendingConfirmation || remark.resolved || !remark.resolutionSubmittedAt) return;
      const submittedAt = String(remark.resolutionSubmittedAt);
      const submittedMs = Date.parse(submittedAt);
      if (!Number.isFinite(submittedMs)) return;
      const { equipmentId, nodeIndex } = remarkEquipmentNodeServer(recordKey);
      const actor = {
        key: String(remark.resolutionSubmittedByKey || ""),
        name: String(remark.resolutionSubmittedByName || "Исполнитель"),
        role: String(remark.resolutionSubmittedByRole || "")
      };
      const stops = (db.downtimes || []).filter(item =>
        item && !item.deleted && !item.endedAt
        && Number(item.equipmentId) === equipmentId
        && Number(item.nodeIndex) === nodeIndex
        && Date.parse(item.startedAt || "") <= submittedMs
      );
      if (!stops.length) return;
      stops.forEach(item => {
        item.endedAt = submittedAt;
        item.updatedAt = submittedAt;
        item.closeComment = String(remark.resolutionSubmittedComment || "Устранение отправлено на подтверждение");
        item.closedByName = actor.name;
        item.closedByRole = actor.role;
        item.closedByKey = actor.key;
        item.closedParticipants = actor.key ? [actor] : [];
        item.closedByRemarkId = String(remark.id || "");
        item.closeAwaitingConfirmation = true;
      });
      remark.resolutionDowntimeIds = stops.map(item => item.id);
      remark.resolutionReturnedDowntimeIds = [];
      changed = true;
    });
  });
  return changed;
}

function latestRemarkSubmissionAtServer(remark = {}) {
  const direct = String(remark.resolutionSubmittedAt || "");
  if (Number.isFinite(Date.parse(direct))) return direct;
  return (Array.isArray(remark.resolutionEvents) ? remark.resolutionEvents : [])
    .filter(event => event?.action === "submitted" && Number.isFinite(Date.parse(event.at || "")))
    .map(event => String(event.at))
    .sort()
    .at(-1) || "";
}

function subscriptionMatchesResolutionParticipant(subscriptionEntry, participant) {
  const subscriptionProfile = subscriptionEntry?.profile || {};
  return resolutionUserKeyServer(subscriptionProfile) === resolutionUserKeyServer(participant);
}

function openRemarkCountForSubscription(db, subscriptionEntry) {
  let count = 0;
  for (const [recordKey, record] of Object.entries(db.checks || {})) {
    const item = record?.to;
    if (!item) continue;
    ensureRemarkEntriesServer(item).filter(entry => !entry.resolved).forEach(entry => {
      const participants = resolutionParticipantsServer(entry);
      const subscriptionActor = sanitizeResolutionParticipant(subscriptionEntry?.profile || {});
      if (entry.resolutionPendingConfirmation) {
        const confirmationRule = remarkConfirmationRuleServer(db, entry, entry.confirmationArea || "");
        if (actorCanConfirmRemarkServer(subscriptionActor, entry, confirmationRule)) count += 1;
        return;
      }
      if (entry.resolutionReturnedAt && entry.resolutionSubmittedByKey) {
        if (subscriptionActor.key === String(entry.resolutionSubmittedByKey)) count += 1;
        return;
      }
      if (participants.length
        ? participants.some(participant => subscriptionMatchesResolutionParticipant(subscriptionEntry, participant))
        : subscriptionMatchesRemarkServer(db, subscriptionEntry, { recordKey, entry })) count += 1;
    });
  }
  return count;
}

function pendingPprCountForSubscription(db, subscriptionEntry) {
  if (engineerPermissionRoleServer(subscriptionEntry?.profile) !== "engineer") return 0;
  return Object.values(db.pprSheets || {}).filter(sheet =>
    sheet
    && sheet.approvalRequestedAt
    && !sheet.approvedAt
    && (sheet.rows || []).some(row => String(row?.work || "").trim())
  ).length;
}

function activeDowntimeCountForSubscription(db, subscriptionEntry) {
  const profile = subscriptionEntry?.profile || {};
  const role = permissionBaseRoleServer(profile.role);
  return (db.downtimes || []).filter(item => {
    if (!item || item.deleted || item.endedAt) return false;
    if (["engineer", "editor"].includes(role)) return true;
    if (role === "shop") return sameRemarkAreaServer(profile.area, item.area);
    if (resolutionUserKeyServer(item.author || {
      id: item.authorId,
      employeeId: item.authorEmployeeId,
      phone: item.authorPhone,
      name: item.authorName,
      role: item.authorRole
    }) === resolutionUserKeyServer(profile)) return true;
    return (Array.isArray(item.participants) ? item.participants : [])
      .some(participant => subscriptionMatchesResolutionParticipant(subscriptionEntry, participant));
  }).length;
}

function personalNotificationBreakdownServer(db, subscriptionEntry) {
  const requests = engineerPermissionRoleServer(subscriptionEntry?.profile) === "engineer"
    ? engineerIncomingRequestItemCountServer(db)
    : 0;
  const remarks = openRemarkCountForSubscription(db, subscriptionEntry);
  const ppr = pendingPprCountForSubscription(db, subscriptionEntry);
  const downtimes = activeDowntimeCountForSubscription(db, subscriptionEntry);
  return { remarks, ppr, requests, downtimes, total: remarks + ppr + requests + downtimes };
}

function personalNotificationCountServer(db, subscriptionEntry) {
  return personalNotificationBreakdownServer(db, subscriptionEntry).total;
}

function userMatchesPushProfile(user = {}, profile = {}) {
  if (profile.id && user.id && String(profile.id) === String(user.id)) return true;
  if (profile.employeeId && user.employeeId && normalizeIdentifier(profile.employeeId) === normalizeIdentifier(user.employeeId)) return true;
  if (profile.phone && user.phone && normalizeIdentifier(profile.phone) === normalizeIdentifier(user.phone)) return true;
  return false;
}

function currentPushEntry(db, entry = {}) {
  const savedProfile = entry.profile || {};
  const currentUser = (db.users || []).find(user => userMatchesPushProfile(user, savedProfile));
  if (!currentUser) return entry;
  return {
    ...entry,
    profile: {
      ...savedProfile,
      id: String(currentUser.id || savedProfile.id || ""),
      employeeId: String(currentUser.employeeId || savedProfile.employeeId || ""),
      phone: String(currentUser.phone || savedProfile.phone || ""),
      name: String(currentUser.name || savedProfile.name || ""),
      role: String(currentUser.role || savedProfile.role || ""),
      area: String(currentUser.area || savedProfile.area || "")
    }
  };
}

function syncPushProfilesForUser(db, user = {}) {
  const subscriptions = db.pushNotifications?.subscriptions || [];
  subscriptions.forEach(entry => {
    if (!userMatchesPushProfile(user, entry.profile || {})) return;
    entry.profile = currentPushEntry({ users: [user] }, entry).profile;
  });
}


async function sendResolutionPushNotifications(db, participants, origin, title, body, url = "/?view=remarks", entityId = "general") {
  const targetParticipants = Array.isArray(participants) ? participants : [];
  if (!targetParticipants.length) return;
  ensurePushConfig(db);
  const subscriptions = db.pushNotifications.subscriptions || [];
  const targets = subscriptions.filter(entry =>
    (!origin || entry.clientId !== origin)
    && targetParticipants.some(participant => subscriptionMatchesResolutionParticipant(entry, participant))
  );
  if (!targets.length) return;
  webPush.setVapidDetails(
    "https://ppr-control-ramazan.onrender.com",
    db.pushNotifications.vapid.publicKey,
    db.pushNotifications.vapid.privateKey
  );
  const expired = new Set();
  await Promise.allSettled(targets.map(async entry => {
    const badgeCount = personalNotificationCountServer(db, entry);
    const payload = { type: "remark", title, body, badgeCount, url, entityId, tag: `remark:${entityId}` };
    try {
      await webPush.sendNotification(entry.subscription, await localizedPushPayloadServer(payload, entry), { TTL: 3600, urgency: "high" });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) expired.add(entry.subscription?.endpoint);
      else console.error(`Resolution push notification failed: ${error?.message || error}`);
    }
  }));
  if (expired.size) {
    db.pushNotifications.subscriptions = subscriptions.filter(entry => !expired.has(entry.subscription?.endpoint));
    writeDb(db, { action: "push_subscriptions_cleaned", count: expired.size });
  }
}

async function clearRemarkPushNotifications(db, participants, origin, entityId = "general") {
  const targetParticipants = Array.isArray(participants) ? participants : [];
  if (!targetParticipants.length) return;
  ensurePushConfig(db);
  const subscriptions = db.pushNotifications.subscriptions || [];
  const targets = subscriptions.filter(entry =>
    (!origin || entry.clientId !== origin)
    && targetParticipants.some(participant => subscriptionMatchesResolutionParticipant(entry, participant))
  );
  if (!targets.length) return;
  webPush.setVapidDetails(
    "https://ppr-control-ramazan.onrender.com",
    db.pushNotifications.vapid.publicKey,
    db.pushNotifications.vapid.privateKey
  );
  const expired = new Set();
  await Promise.allSettled(targets.map(async entry => {
    try {
      await webPush.sendNotification(entry.subscription, JSON.stringify({
        type: "remark-cleared",
        badgeCount: personalNotificationCountServer(db, entry),
        clearTag: `remark:${entityId}`,
        silentUpdate: true
      }), { TTL: 300, urgency: "normal" });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) expired.add(entry.subscription?.endpoint);
      else console.error(`Remark clear push failed: ${error?.message || error}`);
    }
  }));
  if (expired.size) {
    db.pushNotifications.subscriptions = subscriptions.filter(entry => !expired.has(entry.subscription?.endpoint));
    writeDb(db, { action: "push_subscriptions_cleaned", count: expired.size });
  }
}

async function sendDowntimePushNotifications(db, title, body, origin = "", participants = null, downtimeId = "") {
  ensurePushConfig(db);
  const subscriptions = db.pushNotifications.subscriptions || [];
  const requested = Array.isArray(participants) ? participants : null;
  const downtime = (db.downtimes || []).find(item => String(item?.id || "") === String(downtimeId || ""));
  const targets = subscriptions.filter(entry =>
    (!origin || entry.clientId !== origin)
    && (
      requested
        ? requested.some(participant => subscriptionMatchesResolutionParticipant(entry, participant))
        : (() => {
            const role = permissionBaseRoleServer(entry.profile?.role);
            if (["engineer", "editor"].includes(role)) return true;
            if (role === "shop") return Boolean(downtime?.area && sameRemarkAreaServer(entry.profile?.area, downtime.area));
            const author = {
              id: downtime?.authorId,
              employeeId: downtime?.authorEmployeeId,
              phone: downtime?.authorPhone,
              name: downtime?.authorName,
              role: downtime?.authorRole
            };
            if (resolutionUserKeyServer(author) === resolutionUserKeyServer(entry.profile || {})) return true;
            return (Array.isArray(downtime?.participants) ? downtime.participants : [])
              .some(participant => subscriptionMatchesResolutionParticipant(entry, participant));
          })()
    )
  );
  if (!targets.length) return;
  webPush.setVapidDetails(
    "https://ppr-control-ramazan.onrender.com",
    db.pushNotifications.vapid.publicKey,
    db.pushNotifications.vapid.privateKey
  );
  const targetUrl = downtimeId ? `/?downtime=${encodeURIComponent(downtimeId)}` : "/?view=downtime";
  const expired = new Set();
  await Promise.allSettled(targets.map(async entry => {
    try {
      const payload = {
        type: "downtime",
        title,
        body,
        badgeCount: personalNotificationCountServer(db, entry),
        url: targetUrl,
        entityId: downtimeId || "general",
        tag: `downtime:${downtimeId || "general"}`
      };
      await webPush.sendNotification(entry.subscription, await localizedPushPayloadServer(payload, entry), { TTL: 3600, urgency: "high" });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) expired.add(entry.subscription?.endpoint);
      else console.error(`Downtime push notification failed: ${error?.message || error}`);
    }
  }));
  if (expired.size) {
    db.pushNotifications.subscriptions = subscriptions.filter(entry => !expired.has(entry.subscription?.endpoint));
    writeDb(db, { action: "push_subscriptions_cleaned", count: expired.size });
  }
}

function hasMeaningfulCheckKindServer(item) {
  if (!item || typeof item !== "object") return false;
  if (Array.isArray(item.tasks) && item.tasks.some(Boolean)) return true;
  if (item.walkShifts && Object.values(item.walkShifts).some(shift => shift?.done)) return true;
  if (item.walkGroups && Object.values(item.walkGroups).some(group =>
    group && Object.values(group).some(shift => shift?.done)
  )) return true;
  if (item.walkDone || item.resolved || item.mechanicFixed || item.done) return true;
  if (item.shopApproved || item.engineerApproved || item.supplyPrepared || item.financeApproved || item.cashApproved) return true;
  if (item.transferredToWarehouse || item.warehouseReceived || item.issued || item.mechanicInstalled || item.shopInstallApproved || item.productionDirectorApproved || item.accountingWrittenOff) return true;
  if (String(item.lastRequestId || item.requestStatus || item.status || "").trim()) return true;
  if (String(item.nodeDraftText || "").trim()) return true;
  if (String(item.comment || item.request || item.commentPhoto || item.requestPhoto || item.invoicePhoto || "").trim()) return true;
  return Array.isArray(item.commentLog) && item.commentLog.some(entry => String(entry?.text || entry?.photo || "").trim());
}

function compactCheckRecordsServer(checks = {}) {
  const next = {};
  for (const [id, rec] of Object.entries(checks || {})) {
    if (hasMeaningfulCheckKindServer(rec?.to)) next[id] = rec;
  }
  return next;
}

function isJournalRequestRecordServer(id, req = {}) {
  const kind = String(req?.kind || "");
  return kind === "journal-batch" || kind === "to" || String(id || "").includes(":to");
}

function removeJournalRequestsServer(db) {
  let changed = false;
  const now = new Date().toISOString();
  db.requests ||= {};
  db.checks ||= {};
  for (const [id, req] of Object.entries(db.requests)) {
    if (!isJournalRequestRecordServer(id, req)) continue;
    delete db.requests[id];
    changed = true;
  }
  for (const rec of Object.values(db.checks)) {
    const item = rec?.to;
    if (!item || typeof item !== "object") continue;
    const fields = ["request", "requestPhoto", "requestStatus", "requestedTargetRole", "lastRequestId", "invoicePhoto", "noInvoiceApproved"];
    const hasRequestFields = fields.some(field => Boolean(item[field]));
    if (!hasRequestFields) continue;
    fields.forEach(field => { item[field] = ""; });
    item.updatedAt = now;
    changed = true;
  }
  if (changed) db.checks = compactCheckRecordsServer(db.checks);
  return changed;
}

function clearLegacyWalkCompletionsServer(db) {
  let changed = false;
  const now = new Date().toISOString();
  Object.entries(db.checks || {}).forEach(([, rec]) => {
    const item = rec?.to;
    if (!item || typeof item !== "object") return;
    if (!item.walkDone && !item.tasks?.[0]) return;
    if (Array.isArray(item.tasks)) item.tasks[0] = false;
    item.walkDone = false;
    item.updatedAt = now;
    rec.updatedAt = now;
    changed = true;
  });
  if (changed) db.checks = compactCheckRecordsServer(db.checks || {});
  return changed;
}

function securityHeaders(req = null) {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "").toLowerCase();
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    ...(forwardedProto === "https" ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {})
  };
}

function sendJson(res, status, value, extraHeaders = {}) {
  const data = Buffer.from(JSON.stringify(value));
  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(String(res.req?.headers?.["accept-encoding"] || ""));
  if (acceptsGzip && data.length >= 1024) {
    const compressed = zlib.gzipSync(data, { level: zlib.constants.Z_BEST_SPEED });
    res.writeHead(status, {
      ...securityHeaders(res.req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Encoding": "gzip",
      "Content-Length": compressed.length,
      "Vary": "Accept-Encoding",
      ...extraHeaders
    });
    res.end(compressed);
    return;
  }
  res.writeHead(status, {
    ...securityHeaders(res.req),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": data.length,
    "Vary": "Accept-Encoding",
    ...extraHeaders
  });
  res.end(data);
}

let publicStateResponseCache = { version: "", data: null, gzip: null };

function sendPublicState(res, db) {
  const version = realtimeStateVersion();
  if (publicStateResponseCache.version !== version || !publicStateResponseCache.data) {
    const data = Buffer.from(JSON.stringify({ ...publicState(db), stateVersion: version }));
    publicStateResponseCache = {
      version,
      data,
      gzip: data.length >= 1024 ? zlib.gzipSync(data, { level: zlib.constants.Z_BEST_SPEED }) : null
    };
  }
  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(String(res.req?.headers?.["accept-encoding"] || ""));
  const data = acceptsGzip && publicStateResponseCache.gzip
    ? publicStateResponseCache.gzip
    : publicStateResponseCache.data;
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": data.length,
    "Vary": "Accept-Encoding",
    ...(acceptsGzip && publicStateResponseCache.gzip ? { "Content-Encoding": "gzip" } : {})
  });
  res.end(data);
}

const TRANSLATE_LANGS = new Set(["ru", "kk", "uz", "en"]);

function normalizeTranslateText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function shouldTranslateText(value) {
  const text = normalizeTranslateText(value);
  if (text.length < 2 || text.length > 1200) return false;
  if (/^[\d\s.,:;()+\-/%в„–#]+$/.test(text)) return false;
  if (looksLikeMojibake(text)) return false;
  return /[\p{L}]/u.test(text);
}

function looksLikeMojibake(value) {
  const text = String(value || "");
  const fragments = [
    "\u0420\u045f", "\u0420\u0452", "\u0420\u2019", "\u0420\u045c", "\u0420\u040e",
    "\u0420\u2014", "\u0420\u00b0", "\u0420\u00b5", "\u0420\u0451", "\u0420\u0455",
    "\u0420\u0491", "\u0420\u00b6", "\u0420\u00bb", "\u0420\u0458", "\u0420\u0405",
    "\u0420\u0457", "\u0421\u0452", "\u0421\u0403", "\u0421\u201a", "\u0421\u2021",
    "\u0421\u2030", "\u0421\u2020", "\u0421\u040a", "\u0421\u2039", "\u0421\u040f",
    "\u00d0", "\u00d1"
  ];
  return fragments.some(fragment => text.includes(fragment));
}

function translationCacheKey(target, text) {
  return `${TRANSLATION_CACHE_VERSION}:${target}::${crypto.createHash("sha1").update(text).digest("hex")}`;
}

function normalizeTranslationSource(text, target) {
  const source = String(text || "").trim();
  if (target !== "ru") return source;
  const normalized = source
    .replace(/\bkerey\b/gi, "kerak")
    .replace(/\buvern\b/gi, "daraja ko'rsatkichi")
    .replace(/\bkorsatmidi\b/gi, "ko'rsatmaydi");
  const lower = normalized.toLowerCase();
  if (
    /\bmoy\b/.test(lower)
    && /\bpress/.test(lower)
    && /kamay/.test(lower)
    && /daraja ko'rsatkichi/.test(lower)
    && /ko'rsatmaydi/.test(lower)
  ) {
    return "Pressga moy qo'shish kerak. Moy darajasi kamaygan. Daraja ko'rsatkichi ishlamayapti.";
  }
  return normalized;
}

async function translateExternal(text, target) {
  if (target !== "uz" || !shouldTranslateText(text)) return text;
  const sourceText = normalizeTranslationSource(text, target);
  const endpoint = process.env.TRANSLATE_API_URL || "https://translate.googleapis.com/translate_a/single";
  const url = endpoint.includes("translate_a/single")
    ? `${endpoint}?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(sourceText)}`
    : `${endpoint}?sl=auto&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(sourceText)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.TRANSLATE_TIMEOUT_MS || 7000));
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "PPR-Control/1.0" },
      signal: controller.signal
    });
    if (!response.ok) return text;
    const data = await response.json();
    if (Array.isArray(data)) {
      const translated = (data[0] || []).map(part => part?.[0] || "").join("").trim();
      return translated || text;
    }
    return String(data?.translatedText || data?.translation || text).trim() || text;
  } catch {
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function translateTexts(texts, target) {
  const lang = target === "uz" ? "uz" : "";
  if (!lang) {
    return Object.fromEntries((Array.isArray(texts) ? texts : [])
      .map(value => String(value ?? "").trim())
      .filter(shouldTranslateText)
      .slice(0, 250)
      .map(text => [text, text]));
  }
  const db = readDb();
  db.translationCache ||= {};
  const result = {};
  let changed = false;
  const originals = [...new Set((Array.isArray(texts) ? texts : [])
    .map(value => String(value ?? "").trim())
    .filter(shouldTranslateText))].slice(0, 250);
  const unique = [...new Set(originals.map(normalizeTranslateText))];
  const missing = [];
  for (const text of unique) {
    const cacheKey = translationCacheKey(lang, text);
    const cached = db.translationCache[cacheKey];
    if (cached && (looksLikeMojibake(cached.text) || looksLikeMojibake(cached.translated))) {
      delete db.translationCache[cacheKey];
      changed = true;
    }
    if (!db.translationCache[cacheKey]) missing.push({ text, cacheKey });
  }
  for (let i = 0; i < missing.length; i += 8) {
    const batch = missing.slice(i, i + 8);
    const translatedBatch = await Promise.all(batch.map(item => translateExternal(item.text, lang)));
    batch.forEach((item, index) => {
      const translated = translatedBatch[index] || item.text;
      if (!looksLikeMojibake(item.text) && !looksLikeMojibake(translated)) {
        db.translationCache[item.cacheKey] = {
          target: lang,
          text: item.text,
          translated,
          updatedAt: new Date().toISOString()
        };
        changed = true;
      }
    });
  }
  for (const original of originals) {
    const normalized = normalizeTranslateText(original);
    const cacheKey = translationCacheKey(lang, normalized);
    result[original] = db.translationCache[cacheKey]?.translated || original;
  }
  if (changed) writeDb(db, { action: "translate_cache", target: lang, count: unique.length });
  return result;
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhoneIdentifier(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("7")) return `7${digits}`;
  return digits;
}

function loginIdentifierKey(value) {
  const normalized = normalizeIdentifier(value);
  const phone = normalizePhoneIdentifier(value);
  return phone.length >= 10 ? phone : normalized;
}

function userPublic(user = {}) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password, stored) {
  const [salt, expectedHex] = String(stored || "").split(":");
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function findUser(db, identifier) {
  const normalized = normalizeIdentifier(identifier);
  const normalizedPhone = normalizePhoneIdentifier(identifier);
  return (db.users || []).find(user =>
    normalizeIdentifier(user.employeeId) === normalized
    || (normalizedPhone.length >= 10 && normalizePhoneIdentifier(user.phone) === normalizedPhone)
  );
}

function requestIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim()
    .slice(0, 120);
}

function loginAttemptKey(req, identifier = "") {
  return `${requestIp(req)}|${loginIdentifierKey(identifier)}`;
}

function loginRateStatus(req, identifier = "") {
  const key = loginAttemptKey(req, identifier);
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || now - current.startedAt >= LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return { key, blocked: false, retryAfterSeconds: 0 };
  }
  return {
    key,
    blocked: current.count >= LOGIN_MAX_ATTEMPTS,
    retryAfterSeconds: Math.max(1, Math.ceil((current.startedAt + LOGIN_WINDOW_MS - now) / 1000))
  };
}

function recordLoginFailure(key) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  loginAttempts.set(key, !current || now - current.startedAt >= LOGIN_WINDOW_MS
    ? { count: 1, startedAt: now }
    : { ...current, count: current.count + 1 });
}

function clearLoginFailuresForUser(user = {}) {
  const identifiers = [
    normalizeIdentifier(user.employeeId),
    loginIdentifierKey(user.employeeId),
    normalizeIdentifier(user.phone),
    loginIdentifierKey(user.phone)
  ]
    .filter(Boolean);
  if (!identifiers.length) return;
  for (const key of loginAttempts.keys()) {
    if (identifiers.some(identifier => key.endsWith(`|${identifier}`))) loginAttempts.delete(key);
  }
}

function userLoginDiagnostics(db, user) {
  const employeeId = normalizeIdentifier(user.employeeId);
  const phone = normalizePhoneIdentifier(user.phone);
  const duplicateEmployeeId = Boolean(employeeId && (db.users || []).filter(item =>
    normalizeIdentifier(item.employeeId) === employeeId
  ).length > 1);
  const duplicatePhone = Boolean(phone && (db.users || []).filter(item =>
    normalizePhoneIdentifier(item.phone) === phone
  ).length > 1);
  return {
    hasPassword: Boolean(user.passwordHash),
    duplicateEmployeeId,
    duplicatePhone,
    passwordUpdatedAt: user.passwordUpdatedAt || "",
    passwordUpdatedBy: user.passwordUpdatedBy || "",
    lastLoginAt: user.lastLoginAt || ""
  };
}

function adminUserOperationalSummary(db, user = {}) {
  const keys = [...new Set([user.id, user.employeeId, user.phone, user.name].map(value => String(value || "").trim()).filter(Boolean))];
  const values = source => Array.isArray(source) ? source : Object.values(source || {});
  const references = source => values(source).filter(item => { const serialized = JSON.stringify(item || {}).toLocaleLowerCase("ru-RU"); return keys.some(key => serialized.includes(key.toLocaleLowerCase("ru-RU"))); }).length;
  const sessions = (db.authSessions || []).filter(item => String(item.userId || "") === String(user.id || "") && Date.parse(item.expiresAt || "") > Date.now()).map(item => ({ createdAt: item.createdAt || "", expiresAt: item.expiresAt || "", ip: item.ip || "", userAgent: item.userAgent || "" }));
  const history = (db.adminAuditLog || []).filter(item => keys.some(key => [item.actorId, item.actorName, item.targetId, item.targetLabel].some(value => String(value || "").toLocaleLowerCase("ru-RU").includes(key.toLocaleLowerCase("ru-RU"))))).slice(0, 30).map(item => ({ at: item.at || "", action: item.action || "", actorName: item.actorName || "", reason: item.reason || "" }));
  return { activeSessions: sessions.length, sessions, history, linked: { qrWalks: references(db.qrWalkJournal), remarks: references(db.checks), requests: references(db.requests), downtimes: references(db.downtimes), pprSheets: references(db.pprSheets), workPermits: references(db.workPermitNumberClaims) }, lastActivityAt: history[0]?.at || user.lastLoginAt || "" };
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "")
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const separator = part.indexOf("=");
      if (separator < 0) return [part, ""];
      return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    }));
}

function sessionTokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function sessionCookie(token, maxAge = Math.floor(SESSION_TTL_MS / 1000)) {
  return `ppr_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function createAuthSession(db, user, req) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  db.authSessions = (db.authSessions || [])
    .filter(item => Date.parse(item.expiresAt || "") > now.getTime())
    .filter(item => item.userId !== user.id || item.userAgent !== String(req.headers["user-agent"] || "").slice(0, 300));
  db.authSessions.push({
    tokenHash: sessionTokenHash(token),
    userId: user.id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    ip: requestIp(req)
  });
  db.authSessions = db.authSessions.slice(-1000);
  return token;
}

function authenticatedUser(req, db = readDb(), allowPending = false) {
  if (process.env.NODE_ENV === "test") {
    const testUser = (db.users || []).find(item => item.id === String(req.headers["x-test-user-id"] || ""))
      || (db.users || []).find(item => item.role === "editor");
    if (testUser) return testUser;
  }
  const token = parseCookies(req).ppr_session;
  if (!token) return null;
  const tokenHash = sessionTokenHash(token);
  const now = Date.now();
  const session = (db.authSessions || []).find(item =>
    item.tokenHash === tokenHash && Date.parse(item.expiresAt || "") > now
  );
  if (!session) return null;
  const user = (db.users || []).find(item => item.id === session.userId);
  if (!user) return null;
  if (!allowPending && (user.approved === false || user.pendingApproval === true || !user.role)) return null;
  return user;
}

function requireAuthenticated(req, res, roles = null) {
  const user = authenticatedUser(req);
  if (!user) {
    sendJson(res, 401, { ok: false, error: "authentication_required" });
    return null;
  }
  if (Array.isArray(roles) && !roles.includes(user.role)) {
    sendJson(res, 403, { ok: false, error: "permission_denied" });
    return null;
  }
  return user;
}

function attendanceUserKey(user = {}) {
  return String(user.id || user.employeeId || user.phone || "").trim();
}

function attendanceRoleAllowed(user = {}) {
  return ATTENDANCE_WORKER_ROLES.has(String(user.role || ""));
}

function attendanceCanMonitor(user = {}) {
  return String(user.role || "") === "editor" || engineerPermissionRoleServer(user) === "engineer";
}

function activeAttendanceSession(db, user = {}, now = Date.now()) {
  const userKey = attendanceUserKey(user);
  if (!userKey) return null;
  return (db.attendanceSessions || []).find(item =>
    item.userKey === userKey
    && !item.endedAt
    && Date.parse(item.expiresAt || "") > now
  ) || null;
}

function attendanceQrSecret(db) {
  if (!db.attendanceConfig.qrSecret) db.attendanceConfig.qrSecret = crypto.randomBytes(32).toString("hex");
  return db.attendanceConfig.qrSecret;
}

function attendanceQrSignature(db, clientId) {
  return crypto.createHmac("sha256", attendanceQrSecret(db))
    .update(`${String(clientId)}:permanent`)
    .digest("base64url");
}

function attendanceQrToken(db, clientId) {
  return `permanent.${attendanceQrSignature(db, clientId)}`;
}

function validAttendanceQrToken(db, clientId, token) {
  const match = String(token || "").match(/^permanent\.([A-Za-z0-9_-]+)$/);
  if (!match) return false;
  const expected = attendanceQrSignature(db, clientId);
  const received = String(match[1]);
  return expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function contractorAttendanceRateAllowed(req) {
  const key = requestIp(req);
  const now = Date.now();
  const recent = (contractorAttendanceAttempts.get(key) || []).filter(time => now - time < LOGIN_WINDOW_MS);
  if (recent.length >= 20) return false;
  recent.push(now);
  contractorAttendanceAttempts.set(key, recent);
  return true;
}

function contractorAttendanceTicket(db, req, now = Date.now()) {
  const expires = now + 5 * 60 * 1000;
  const signature = crypto.createHmac("sha256", attendanceQrSecret(db))
    .update(`${expires}:${requestIp(req)}`)
    .digest("base64url");
  return `${expires}.${signature}`;
}

function validContractorAttendanceTicket(db, req, ticket, now = Date.now()) {
  const match = String(ticket || "").match(/^(\d+)\.([A-Za-z0-9_-]+)$/);
  if (!match) return false;
  const expires = Number(match[1]);
  if (!Number.isSafeInteger(expires) || expires < now || expires > now + 6 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", attendanceQrSecret(db))
    .update(`${expires}:${requestIp(req)}`)
    .digest("base64url");
  return expected.length === match[2].length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(match[2]));
}

function attendanceSessionPublic(item = {}) {
  return {
    id: String(item.id || ""),
    userKey: String(item.userKey || ""),
    name: String(item.name || ""),
    role: String(item.role || ""),
    area: String(item.area || ""),
    phone: String(item.phone || ""),
    employeeId: String(item.employeeId || ""),
    startedAt: String(item.startedAt || ""),
    expiresAt: String(item.expiresAt || ""),
    endedAt: String(item.endedAt || ""),
    endedBy: String(item.endedBy || ""),
    manual: item.manual === true
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 25_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Bad JSON")); }
    });
    req.on("error", reject);
  });
}

function decodeHtmlEntities(text = "") {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function httpGetText(targetUrl, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const request = https.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 PPR-Control price lookup",
        "Accept-Language": "ru,en;q=0.8"
      }
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        resolve(httpGetText(new URL(response.headers.location, targetUrl).toString(), timeoutMs));
        return;
      }
      let data = "";
      response.setEncoding("utf8");
      response.on("data", chunk => {
        data += chunk;
        if (data.length > 700000) request.destroy();
      });
      response.on("end", () => resolve(data));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("timeout")));
    request.on("error", reject);
  });
}

function clearPriceLookupQuery(name = "") {
  const cleanName = String(name || "").trim();
  const words = cleanName.split(/\s+/).filter(word => word.length >= 3);
  const generic = /^(bolt|nut|washer|profile|cable|oil|pipe|belt|pump|sensor|bearing|болт|гайка|шайба|профиль|кабель|масло|труба|лента|насос|датчик|подшипник)$/i.test(cleanName);
  if (words.length >= 2 && cleanName.length >= 8 && !generic) return cleanName;
  return "";
}

function extractPriceCandidates(text = "") {
  const clean = decodeHtmlEntities(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const patterns = [
    /(\d[\d\s.,]{1,15})\s*(?:₸|тг\.?|тенге|kzt|KZT)\b/gi,
    /(?:₸|тг\.?|тенге|kzt|KZT)\s*(\d[\d\s.,]{1,15})/gi,
    /"price"\s*:\s*"?(\d[\d\s.,]{1,15})"?\s*,\s*"priceCurrency"\s*:\s*"?KZT"?/gi,
    /"priceCurrency"\s*:\s*"?KZT"?\s*,\s*"price"\s*:\s*"?(\d[\d\s.,]{1,15})"?/gi
  ];
  const values = [];
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(clean))) {
      const value = Number(String(match[1] || "").replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(value) && value >= 10 && value <= 100000000) values.push(value);
    }
  });
  return values;
}

async function lookupInternetPrice(name = "") {
  const queryBase = clearPriceLookupQuery(name);
  if (!queryBase) return { ok: false, reason: "unclear_query" };
  const query = `${queryBase} цена купить Казахстан тенге`;
  const searchUrls = [
    `https://yandex.kz/search/?text=${encodeURIComponent(query)}`,
    `https://satu.kz/search?search_term=${encodeURIComponent(queryBase)}`,
    `https://kaspi.kz/shop/search/?text=${encodeURIComponent(queryBase)}`,
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  ];
  const candidates = [];
  const errors = [];
  let answered = false;
  for (const url of searchUrls) {
    try {
      const html = await httpGetText(url);
      answered = true;
      candidates.push(...extractPriceCandidates(html));
      if (candidates.length >= 3) break;
    } catch (error) {
      errors.push(error.message || "lookup_failed");
    }
  }
  if (!candidates.length && errors.length && !answered) return { ok: false, reason: "lookup_error" };
  if (!candidates.length) return { ok: false, reason: "price_not_found" };
  candidates.sort((a, b) => a - b);
  const median = candidates[Math.floor(candidates.length / 2)];
  const closeCount = candidates.filter(value => Math.abs(value - median) / Math.max(median, 1) <= 0.45).length;
  if (closeCount < 1) return { ok: false, reason: "low_confidence" };
  return {
    ok: true,
    price: Math.round(median),
    currency: "KZT",
    source: "internet",
    query,
    confidence: closeCount >= 2 ? "medium" : "low"
  };
}
function mergeObjectRecords(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  for (const [id, value] of Object.entries(incoming || {})) {
    if (id.includes("\uFFFD")) continue;
    next[id] = sanitizeIncomingValue(next[id], value);
  }
  return next;
}

function sanitizeIncomingValue(current, incoming) {
  if (typeof incoming === "string") {
    if (!incoming.includes("\uFFFD")) return incoming;
    return typeof current === "string" && !current.includes("\uFFFD") ? current : "";
  }
  if (Array.isArray(incoming)) {
    const currentArray = Array.isArray(current) ? current : [];
    return incoming.map((value, index) => sanitizeIncomingValue(currentArray[index], value));
  }
  if (incoming && typeof incoming === "object") {
    const currentObject = current && typeof current === "object" && !Array.isArray(current) ? current : {};
    const next = {};
    for (const [key, value] of Object.entries(incoming)) {
      if (key.includes("\uFFFD")) continue;
      next[key] = sanitizeIncomingValue(currentObject[key], value);
    }
    return next;
  }
  return incoming;
}

function isIncomingNewerRecord(current, incoming) {
  const recordTime = record => {
    if (!record || typeof record !== "object") return NaN;
    const times = [Date.parse(record?.updatedAt || record?.createdAt || record?.commentUpdatedAt || record?.resolvedAt || "")];
    const commentTimes = Array.isArray(record?.commentLog)
      ? record.commentLog.map(entry => Date.parse(entry?.at || "")).filter(Number.isFinite)
      : [];
    times.push(...commentTimes);
    times.push(...Object.values(record)
      .map(value => Date.parse(value?.updatedAt || value?.createdAt || value?.commentUpdatedAt || value?.resolvedAt || ""))
      .filter(Number.isFinite));
    const finiteTimes = times.filter(Number.isFinite);
    return finiteTimes.length ? Math.max(...finiteTimes) : NaN;
  };
  const currentTime = recordTime(current);
  const incomingTime = recordTime(incoming);
  if (Number.isFinite(currentTime) || Number.isFinite(incomingTime)) {
    return (Number.isFinite(incomingTime) ? incomingTime : 0) >= (Number.isFinite(currentTime) ? currentTime : 0);
  }
  return true;
}

function protectPaidRequestProgress(current = {}, incoming = {}) {
  if (!current?.cashApproved) return incoming;
  const next = { ...incoming };
  const recoveringPaidRejection = Boolean(
    (current.rejected && incoming.rejected === false)
    || (
      current.done
      && incoming.done === false
      && current.status === "waitingWarehouse"
      && incoming.status === "waitingWarehouse"
    )
  );
  if (!current.rejected && next.rejected) {
    next.rejected = false;
    next.rejectionReason = "";
    next.done = Boolean(current.done);
  }
  const irreversibleFlags = [
    "cashApproved",
    "transferredToWarehouse",
    "warehouseReceived",
    "issued",
    "mechanicInstalled",
    "shopInstallApproved",
    "productionDirectorApproved",
    "accountingWrittenOff",
    "done",
    "stock"
  ];
  irreversibleFlags.forEach(field => {
    if (recoveringPaidRejection && field === "done") return;
    if (current[field] === true) next[field] = true;
  });
  const stageRank = {
    shop: 1,
    engineer: 2,
    supply: 3,
    finance: 4,
    cash: 5,
    cashApproved: 6,
    waitingWarehouse: 7,
    warehouse: 8,
    issued: 9,
    waitingShopDone: 10,
    productionDirector: 11,
    generalDirector: 11,
    accounting: 12,
    done: 13,
    stock: 13,
    rejected: 0
  };
  const currentStatus = String(current.status || current.requestStatus || "cashApproved");
  const incomingStatus = String(next.status || next.requestStatus || "");
  if ((stageRank[incomingStatus] || 0) < (stageRank[currentStatus] || 6)) {
    next.status = currentStatus;
    next.requestStatus = current.requestStatus || currentStatus;
  }
  if (["shop", "engineer", "supply", "finance", "cash"].includes(String(next.returnedTo || ""))) {
    next.returnedTo = "";
    next.returnReason = "";
  }
  return next;
}

function mergeObjectRecordsByFreshness(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  for (const [id, value] of Object.entries(incoming || {})) {
    if (id.includes("\uFFFD")) continue;
    const cleanValue = protectPaidRequestProgress(next[id], sanitizeIncomingValue(next[id], value));
    if (isIncomingNewerRecord(next[id], cleanValue)) next[id] = cleanValue;
  }
  return next;
}

function mergeRemarkHistoryItems(current = [], incoming = [], identity = item => String(item?.id || "")) {
  const map = new Map();
  for (const item of [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!item || typeof item !== "object") continue;
    const key = identity(item);
    if (!key) continue;
    map.set(key, { ...(map.get(key) || {}), ...item });
  }
  return Array.from(map.values()).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
}

function remarkDecisionTime(entry = {}) {
  return Math.max(
    Date.parse(entry.confirmedAt || "") || 0,
    Date.parse(entry.resolutionReturnedAt || "") || 0,
    Date.parse(entry.resolutionSubmittedAt || "") || 0,
    Date.parse(entry.commentEditedAt || "") || 0
  );
}

function mergeCommentLogs(current = [], incoming = []) {
  const map = new Map();
  const mergeEntry = (entry, fromIncoming) => {
    if (!entry || typeof entry !== "object") return;
    const brokenText = /^\?{3,}$/.test(String(entry.text || "").trim());
    const brokenName = /^[?\s]{3,}$/.test(String(entry.name || "").trim());
    if (brokenText && brokenName) return;
    const key = String(entry.id || "") || [entry.at, entry.type, entry.role, entry.name, entry.text, entry.photo].map(value => String(value || "")).join("\u0001");
    const previous = map.get(key) || {};
    const next = { ...previous, ...entry };
    const previousDecisionTime = remarkDecisionTime(previous);
    const incomingDecisionTime = remarkDecisionTime(entry);
    const preservePreviousDecision = fromIncoming && previousDecisionTime > 0 && previousDecisionTime >= incomingDecisionTime;
    if (preservePreviousDecision) {
      [
        "text", "commentEditedAt", "commentEditedByKey", "commentEditedByName", "commentEditedByRole",
        "resolved",
        "resolvedAt", "resolvedByKey", "resolvedByName", "resolvedByRole", "resolvedComment", "resolvedPhoto",
        ...REMARK_COLLABORATION_FIELDS_SERVER
      ].forEach(field => {
        if (previous[field] !== undefined) next[field] = previous[field];
      });
    } else if (fromIncoming && entry.resolved === true) {
      next.resolved = false;
      ["resolvedAt", "resolvedByKey", "resolvedByName", "resolvedByRole", "resolvedComment", "resolvedPhoto"].forEach(field => delete next[field]);
    }
    next.resolutionEvents = mergeRemarkHistoryItems(previous.resolutionEvents, entry.resolutionEvents);
    next.resolutionUpdates = mergeRemarkHistoryItems(previous.resolutionUpdates, entry.resolutionUpdates);
    next.commentEditHistory = mergeRemarkHistoryItems(previous.commentEditHistory, entry.commentEditHistory);
    next.resolutionParticipants = mergeRemarkHistoryItems(
      previous.resolutionParticipants,
      entry.resolutionParticipants,
      item => resolutionUserKeyServer(item)
    );
    // This is the final scoring snapshot, not an append-only history.
    // Keep the participants from the newest accepted decision so a stale
    // client cannot restore an incorrectly assigned resolver and award
    // points to both the old and corrected employees.
    if (preservePreviousDecision) {
      next.resolutionCompletedParticipants = Array.isArray(previous.resolutionCompletedParticipants)
        ? previous.resolutionCompletedParticipants
        : [];
    } else if (fromIncoming && incomingDecisionTime > previousDecisionTime) {
      next.resolutionCompletedParticipants = Array.isArray(entry.resolutionCompletedParticipants)
        ? entry.resolutionCompletedParticipants
        : [];
    } else {
      next.resolutionCompletedParticipants = Array.isArray(entry.resolutionCompletedParticipants)
        ? entry.resolutionCompletedParticipants
        : Array.isArray(previous.resolutionCompletedParticipants)
          ? previous.resolutionCompletedParticipants
          : [];
    }
    map.set(key, next);
  };
  (Array.isArray(current) ? current : []).forEach(entry => mergeEntry(entry, false));
  (Array.isArray(incoming) ? incoming : []).forEach(entry => mergeEntry(entry, true));
  return Array.from(map.values()).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
}

function mergeCheckRecord(current = {}, incoming = {}) {
  const cleanIncoming = sanitizeIncomingValue(current, incoming);
  const incomingWins = isIncomingNewerRecord(current, cleanIncoming);
  const next = incomingWins ? { ...cleanIncoming } : { ...current };
  const currentTo = current?.to && typeof current.to === "object" ? current.to : {};
  const incomingTo = cleanIncoming?.to && typeof cleanIncoming.to === "object" ? cleanIncoming.to : {};
  const baseTo = incomingWins ? incomingTo : currentTo;
  next.to = {
    ...baseTo,
    commentLog: mergeCommentLogs(currentTo.commentLog, incomingTo.commentLog),
    walkShifts: mergeWalkMarks(currentTo.walkShifts, incomingTo.walkShifts),
    walkGroups: {
      technical: mergeWalkMarks(currentTo.walkGroups?.technical, incomingTo.walkGroups?.technical),
      operational: mergeWalkMarks(currentTo.walkGroups?.operational, incomingTo.walkGroups?.operational)
    }
  };
  syncItemRemarkSummaryServer(next.to);
  const timestamps = [current.updatedAt, cleanIncoming.updatedAt, currentTo.updatedAt, incomingTo.updatedAt]
    .filter(Boolean)
    .sort();
  if (timestamps.length) next.updatedAt = timestamps.at(-1);
  return next;
}

function mergeWalkMarks(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  for (const [shift, mark] of Object.entries(incoming || {})) {
    const previous = next[shift];
    if (!previous?.done) {
      next[shift] = mark;
      continue;
    }
    if (!mark?.done) continue;
    const previousAt = Date.parse(previous.at || "");
    const incomingAt = Date.parse(mark.at || "");
    if (Number.isFinite(incomingAt) && (!Number.isFinite(previousAt) || incomingAt < previousAt)) next[shift] = mark;
  }
  return next;
}

function mergeCheckRecordsByFreshness(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  for (const [id, value] of Object.entries(incoming || {})) {
    if (id.includes("\uFFFD") || !value || typeof value !== "object") continue;
    next[id] = mergeCheckRecord(next[id] || {}, value);
  }
  return next;
}

function inventoryCanonicalKey(item = {}) {
  const area = String(item.area || "Общий склад");
  const article = String(item.article || "").trim().toLowerCase();
  if (article) return `${area}::article::${article}`;
  return `${area}::name::${String(item.name || "").trim().toLowerCase()}`;
}

function canonicalizeInventoryRecords(records = {}) {
  const next = {};
  const sourceWasCanonical = new Map();
  for (const [sourceId, rawItem] of Object.entries(records || {})) {
    if (!rawItem || typeof rawItem !== "object" || sourceId.includes("\uFFFD")) continue;
    const id = inventoryCanonicalKey(rawItem);
    const isCanonical = sourceId === id;
    if (next[id] && (sourceWasCanonical.get(id) || !isCanonical)) continue;
    next[id] = { ...rawItem, id };
    sourceWasCanonical.set(id, isCanonical);
  }
  return next;
}

function mergeInventoryRecordsByFreshness(current = {}, incoming = {}) {
  const next = canonicalizeInventoryRecords(current);
  const cleanIncoming = canonicalizeInventoryRecords(incoming);
  for (const [id, value] of Object.entries(cleanIncoming)) {
    const existing = next[id];
    if (!existing) {
      next[id] = sanitizeIncomingValue({}, value);
      continue;
    }
    const currentTime = Date.parse(existing.updatedAt || existing.createdAt || "");
    const incomingTime = Date.parse(value.updatedAt || value.createdAt || "");
    if (Number.isFinite(incomingTime) && (!Number.isFinite(currentTime) || incomingTime > currentTime)) {
      next[id] = sanitizeIncomingValue(existing, value);
    }
  }
  return next;
}

function hasMeaningfulCheckKind(item) {
  if (!item || typeof item !== "object") return false;
  if (Array.isArray(item.tasks) && item.tasks.some(Boolean)) return true;
  if (item.walkShifts && Object.values(item.walkShifts).some(shift => shift?.done)) return true;
  if (item.walkGroups && Object.values(item.walkGroups).some(group =>
    group && Object.values(group).some(shift => shift?.done)
  )) return true;
  if (item.walkDone || item.resolved || item.mechanicFixed || item.done) return true;
  if (item.shopApproved || item.engineerApproved || item.supplyPrepared || item.financeApproved || item.cashApproved) return true;
  if (item.transferredToWarehouse || item.warehouseReceived || item.issued || item.mechanicInstalled || item.shopInstallApproved || item.productionDirectorApproved || item.accountingWrittenOff) return true;
  if (String(item.lastRequestId || item.requestStatus || item.status || "").trim()) return true;
  if (String(item.comment || item.request || item.commentPhoto || item.requestPhoto || item.invoicePhoto || "").trim()) return true;
  return Array.isArray(item.commentLog) && item.commentLog.some(entry => String(entry?.text || entry?.photo || "").trim());
}

function compactCheckRecords(checks = {}) {
  const next = {};
  for (const [id, rec] of Object.entries(checks || {})) {
    if (hasMeaningfulCheckKind(rec?.to)) next[id] = rec;
  }
  return next;
}

function restoreQrWalkChecksFromJournal(db = {}) {
  db.checks ||= {};
  const resetAt = Date.parse(db.operationalResetAt || "") || 0;
  for (const entry of Array.isArray(db.qrWalkJournal) ? db.qrWalkJournal : []) {
    if (!entry || entry.invalid === true || entry.archivedNode === true) continue;
    const equipmentId = Number(entry.equipmentId);
    const nodeIndex = Number(entry.nodeIndex);
    const date = String(entry.date || "");
    const shift = String(entry.shift || "");
    const group = entry.group === "operational" ? "operational" : "technical";
    const markedAt = String(entry.at || "");
    if (!Number.isSafeInteger(equipmentId) || !Number.isSafeInteger(nodeIndex)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["day", "night"].includes(shift)) continue;
    if (resetAt && (Date.parse(markedAt) || 0) <= resetAt) continue;
    const recordKey = `${equipmentId}:${nodeIndex}:${date}`;
    const currentRecord = db.checks[recordKey] && typeof db.checks[recordKey] === "object" ? db.checks[recordKey] : {};
    const currentItem = currentRecord.to && typeof currentRecord.to === "object" ? currentRecord.to : {};
    if (currentItem.walkGroups?.[group]?.[shift]?.done) continue;
    const mark = {
      done: true,
      at: markedAt,
      byRole: String(entry.byRole || ""),
      byName: String(entry.byName || ""),
      shift,
      group
    };
    db.checks[recordKey] = {
      ...currentRecord,
      createdAt: currentRecord.createdAt || markedAt || new Date().toISOString(),
      updatedAt: [currentRecord.updatedAt, markedAt].filter(Boolean).sort().at(-1) || new Date().toISOString(),
      to: {
        tasks: Array.isArray(currentItem.tasks) ? currentItem.tasks : Array(15).fill(false),
        ...currentItem,
        walkGroups: {
          ...(currentItem.walkGroups || {}),
          [group]: {
            ...(currentItem.walkGroups?.[group] || {}),
            [shift]: mark
          }
        }
      }
    };
  }
  return db;
}

function mergeArrayById(current = [], incoming = []) {
  const map = new Map();
  for (const item of Array.isArray(current) ? current : []) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (!item || !item.id) continue;
    if (String(item.id).includes("\uFFFD")) continue;
    const currentItem = map.get(item.id) || {};
    const nextItem = { ...currentItem, ...sanitizeIncomingValue(currentItem, item) };
    if (currentItem.endedAt && !item.endedAt) {
      nextItem.endedAt = currentItem.endedAt;
      nextItem.updatedAt = currentItem.updatedAt || currentItem.endedAt;
      nextItem.closeComment = currentItem.closeComment || nextItem.closeComment || "";
      nextItem.closedByName = currentItem.closedByName || nextItem.closedByName || "";
      nextItem.closedByRole = currentItem.closedByRole || nextItem.closedByRole || "";
      nextItem.closedParticipants = currentItem.closedParticipants || nextItem.closedParticipants || [];
    }
    map.set(item.id, nextItem);
  }
  return Array.from(map.values()).sort((a, b) => String(b.updatedAt || b.createdAt || b.startedAt || b.registeredAt || '').localeCompare(String(a.updatedAt || a.createdAt || a.startedAt || a.registeredAt || '')));
}

function mergeUsers(current = [], incoming = []) {
  const map = new Map();
  for (const user of Array.isArray(current) ? current : []) {
    const key = String(user.phone || user.clientId || user.name || Math.random());
    map.set(key, user);
  }
  for (const user of Array.isArray(incoming) ? incoming : []) {
    const key = String(user.phone || user.clientId || user.name || Math.random());
    if (key.includes("\uFFFD")) continue;
    const currentUser = map.get(key) || {};
    map.set(key, { ...currentUser, ...sanitizeIncomingValue(currentUser, user) });
  }
  return Array.from(map.values());
}

let stateWriteQueue = Promise.resolve();
function enqueueStateWrite(task) {
  const next = stateWriteQueue.then(task, task);
  stateWriteQueue = next.catch(() => {});
  return next;
}

const activeAdminMutationKeys = new Map();
function rejectRepeatedAdminMutation(req, res, pathname) {
  if (req.authUser?.role !== "editor" || !pathname.startsWith("/api/admin/")) return false;
  if (["GET", "HEAD", "OPTIONS"].includes(String(req.method || "GET").toUpperCase())) return false;
  const actionId = String(req.headers["x-idempotency-key"] || "").trim().slice(0, 160);
  if (!actionId) return false;
  const key = `${String(req.authUser?.id || req.authUser?.employeeId || "admin")}:${req.method}:${pathname}:${actionId}`;
  const now = Date.now();
  for (const [storedKey, expiresAt] of activeAdminMutationKeys) {
    if (expiresAt <= now) activeAdminMutationKeys.delete(storedKey);
  }
  if (activeAdminMutationKeys.has(key)) {
    sendJson(res, 200, { ok: true, duplicate: true, message: "Повторное действие остановлено сервером." }, { "Cache-Control": "no-store" });
    return true;
  }
  activeAdminMutationKeys.set(key, now + 10 * 60 * 1000);
  return false;
}

let wss = null;
const wsServers = [];
const sseClients = new Set();
const realtimeInstanceId = crypto.randomBytes(8).toString("hex");
let realtimeStateCounter = 0;
const realtimePatchHistory = [];
const REALTIME_PATCH_HISTORY_LIMIT = 1000;

function realtimeStateVersion() {
  return `${realtimeInstanceId}:${realtimeStateCounter}`;
}

function sendSse(res, payload) {
  try {
    res.write(typeof payload === "string" ? payload : `data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    sseClients.delete(res);
  }
}

function broadcastState(origin = "server", actionId = "", state = publicState(), partial = false) {
  realtimeStateCounter += 1;
  const payload = { type: "state", origin, actionId, stateVersion: realtimeStateVersion(), partial, state };
  realtimePatchHistory.push({ counter: realtimeStateCounter, payload });
  if (realtimePatchHistory.length > REALTIME_PATCH_HISTORY_LIMIT) {
    realtimePatchHistory.splice(0, realtimePatchHistory.length - REALTIME_PATCH_HISTORY_LIMIT);
  }
  if (wss) {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(message);
    }
  }
  const sseMessage = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    sendSse(client, sseMessage);
  }
  return payload.stateVersion;
}

function changedRecordPatch(before = {}, after = {}) {
  const patch = {};
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    if (!(key in (after || {}))) continue;
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) patch[key] = after[key];
  }
  return patch;
}

function changedStatePatch(before = {}, after = {}) {
  const patch = {};
  for (const key of ["checks", "requests", "orders", "inventory", "compressorJournal", "gasJournal", "gpmJournal", "pprSheets", "annualPpr", "journalDueSince"]) {
    const records = changedRecordPatch(before?.[key], after?.[key]);
    if (Object.keys(records).length) patch[key] = records;
  }
  const equipment = changedRecordPatch(before?.catalog?.equipment, after?.catalog?.equipment);
  if (Object.keys(equipment).length) patch.catalog = { equipment };
  for (const key of ["serviceCosts", "downtimes", "auditHistory", "systemBroadcasts"]) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) patch[key] = after?.[key] || [];
  }
  for (const key of ["operationalResetAt", "walkShiftCleanupVersion"]) {
    if (String(before?.[key] || "") !== String(after?.[key] || "")) patch[key] = after?.[key] || "";
  }
  return patch;
}

function shgrpSectionBDescriptorServer(source = "") {
  const text = String(source || "");
  const grpMatch = text.match(/ГРП\s*[-–—]?\s*Печь\s*№?\s*(1[01]|[1-9])(?!\d)/i)
    || text.match(/Газо\s*регуляторн(?:ый|ого|ому|ым)?\s+пункт(?:\s*\(\s*ГРП\s*\))?\s*№?\s*(1[01]|[1-9])(?!\d)/i);
  if (grpMatch) {
    const number = Number(grpMatch[1]);
    return { kind: "grp", number, grpNumber: number, tubeNumber: 0, routeLabel: `ГРП - Печь №${number}` };
  }
  const tubeMatch = text.match(/Контрольн(?:ая|ой|ую)?\s+трубк(?:а|и|у)?\s*№?\s*([1-5])(?!\d)/i);
  if (tubeMatch) {
    const number = Number(tubeMatch[1]);
    return { kind: "controlTube", number, grpNumber: 0, tubeNumber: number, routeLabel: `Контрольная трубка №${number}` };
  }
  if (/Охранн(?:ая|ой|ую)?\s+зон(?:а|ы|у)?\s+газопровод(?:а|у)?/i.test(text)) {
    return { kind: "protectionZone", number: 1, grpNumber: 0, tubeNumber: 0, routeLabel: "Охранная зона газопровода" };
  }
  return null;
}

function shgrpSectionADescriptorServer(source = "") {
  const text = String(source || "").trim();
  if (/^ПСК$/i.test(text)) return { kind: "psk", label: "ПСК" };
  if (/^ШГРП$/i.test(text)) return { kind: "shgrp", label: "ШГРП" };
  return null;
}

function shgrpSectionARoleAllowedServer(profile = {}) {
  if (engineerPermissionRoleServer(profile) === "engineer") return true;
  return ["mechanic", "electrician"].includes(permissionBaseRoleServer(profile.role));
}

function shgrpPressureServer(min, max) {
  return (min + Math.random() * (max - min)).toFixed(1);
}

function latestShgrpTemperaturesServer(db = {}) {
  return Object.values(db.gasJournal || {}).filter(row => row?.section === "A")
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .map(row => ({ tempInC: row.tempInC, tempOutC: row.tempOutC }))
    .find(row => Number.isFinite(Number(row.tempInC)) && Number.isFinite(Number(row.tempOutC))) || { tempInC: "", tempOutC: "" };
}

async function almatyTemperatureServer(db = {}) {
  try {
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=43.2389&longitude=76.8897&current=temperature_2m&timezone=Asia%2FAlmaty", { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("weather_unavailable");
    const value = Number((await response.json())?.current?.temperature_2m);
    if (!Number.isFinite(value)) throw new Error("weather_invalid");
    return { tempInC: value.toFixed(1), tempOutC: value.toFixed(1), source: "internet" };
  } catch {
    return { ...latestShgrpTemperaturesServer(db), source: "last-record" };
  }
}

function buildShgrpSectionARowServer(current = {}, date = "", shift = "day", now = new Date().toISOString(), actor = {}) {
  const checks = current.shgrpQrChecks && typeof current.shgrpQrChecks === "object" ? current.shgrpQrChecks : {};
  const shgrp = checks[`shgrp:${shift}`];
  const psk = checks[`psk:${shift}`];
  const remarks = [shgrp, psk].filter(entry => entry?.status === "remark").map(entry => `${entry.label}: ${entry.comment}`);
  const names = [...new Set([shgrp?.byName, psk?.byName].filter(Boolean))];
  const complete = Boolean(shgrp && psk);
  return {
    ...current, id: `A::${date}`, section: "A", date, shift, shiftLabel: shift === "night" ? "Ночная смена" : "Дневная смена",
    time: new Date((psk?.at || shgrp?.at) || now).toLocaleTimeString("ru-RU", { timeZone: "Asia/Qyzylorda", hour: "2-digit", minute: "2-digit", hour12: false }),
    inletMpa: shgrp?.inletMpa || "", outletMpa: shgrp?.outletMpa || "",
    tempInC: shgrp?.tempInC || "", tempOutC: shgrp?.tempOutC || "",
    pressureDeltaMpa: shgrp ? (Number(shgrp.inletMpa) - Number(shgrp.outletMpa)).toFixed(1) : "",
    equipmentStatus: shgrp ? (shgrp.status === "remark" ? "Неисправно" : "Исправно") : "",
    pskTrigger: psk ? (psk.status === "remark" ? "Есть" : "Нет") : "",
    maintenance: shgrp ? (shgrp.status === "remark" ? "Требуется" : "Не требуется") : "",
    remarks: remarks.join("; ") || (complete ? "Замечаний нет" : "Ожидается сканирование ШГРП и ПСК"),
    checkedBy: names.join(", ") || String(actor.name || ""), updatedAt: now,
    updatedByName: String(actor.name || ""), updatedByRole: String(actor.role || ""),
    entryStatus: complete ? "fixed" : "draft", fixedAt: complete ? (current.fixedAt || now) : "", fixedByName: complete ? names.join(", ") : "",
    source: "qr-shgrp-a", shgrpQrChecks: checks
  };
}

function shgrpCheckKeyServer(descriptor, shift) {
  if (descriptor.kind === "protectionZone") return `protection:${shift}`;
  if (descriptor.kind === "controlTube") return `tube:${shift}:${descriptor.number}`;
  return `${shift}:${descriptor.number}`;
}

function walkShiftAtServer(value) {
  const date = new Date(value || Date.now());
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"
  }).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const hour = Number(parts.hour || 0);
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  if (hour >= 8 && hour < 20) return { date: localDate, shift: "day", label: "День" };
  if (hour >= 20) return { date: localDate, shift: "night", label: "Ночь" };
  const previous = new Date(`${localDate}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return { date: previous.toISOString().slice(0, 10), shift: "night", label: "Ночь" };
}

function reconcileMissingShgrpQrChecksServer(db) {
  db.gasJournal ||= {};
  let changed = false;
  (Array.isArray(db.qrWalkJournal) ? db.qrWalkJournal : []).forEach(mark => {
    if (mark?.invalid) return;
    const sectionADescriptor = shgrpSectionADescriptorServer(mark.node || mark.equipment);
    if (sectionADescriptor?.kind === "psk" && /^\d{4}-\d{2}-\d{2}$/.test(String(mark.date || "")) && ["day", "night"].includes(mark.shift)) {
      const rowId = `A::${mark.date}`;
      const current = db.gasJournal[rowId] && typeof db.gasJournal[rowId] === "object" ? db.gasJournal[rowId] : {};
      const checks = current.shgrpQrChecks && typeof current.shgrpQrChecks === "object" ? { ...current.shgrpQrChecks } : {};
      const checkKey = `psk:${mark.shift}`;
      if (!checks[checkKey]) {
        const recordKey = `${Number(mark.equipmentId)}:${Number(mark.nodeIndex)}:${mark.date}`;
        const remarks = Array.isArray(db.checks?.[recordKey]?.to?.commentLog) ? db.checks[recordKey].to.commentLog : [];
        const linkedRemark = remarks.slice().reverse().find(entry => {
          const stamp = walkShiftAtServer(entry?.at);
          return stamp.date === mark.date && stamp.shift === mark.shift;
        });
        checks[checkKey] = {
          kind: "psk", label: "ПСК", shift: mark.shift, shiftLabel: mark.shift === "night" ? "Ночь" : "День",
          at: String(mark.at || linkedRemark?.at || new Date().toISOString()),
          status: linkedRemark ? "remark" : "ok",
          comment: linkedRemark ? String(linkedRemark.text || "Замечание") : "Замечаний нет",
          sourceRecordKey: recordKey, remarkId: String(linkedRemark?.id || ""),
          byId: "", byName: String(mark.byName || linkedRemark?.name || "").slice(0, 200),
          byRole: String(mark.byRole || linkedRemark?.role || "").slice(0, 100)
        };
        const row = buildShgrpSectionARowServer({ ...current, shgrpQrChecks: checks }, mark.date, mark.shift, new Date().toISOString(), { name: "Система", role: "system" });
        const shiftRows = { ...(current.shiftRows || {}), [mark.shift]: row };
        db.gasJournal[rowId] = { ...row, shiftRows };
        changed = true;
      }
    }
    const descriptor = shgrpSectionBDescriptorServer(`${mark.equipment || ""} ${mark.node || ""}`);
    if (!descriptor || !/^\d{4}-\d{2}-\d{2}$/.test(String(mark.date || "")) || !["day", "night"].includes(mark.shift)) return;
    const rowId = `B::${mark.date}`;
    const current = db.gasJournal[rowId] && typeof db.gasJournal[rowId] === "object" ? db.gasJournal[rowId] : {};
    const checks = current.grpQrChecks && typeof current.grpQrChecks === "object" ? { ...current.grpQrChecks } : {};
    const checkKey = shgrpCheckKeyServer(descriptor, mark.shift);
    if (checks[checkKey]) return;
    const recordKey = `${Number(mark.equipmentId)}:${Number(mark.nodeIndex)}:${mark.date}`;
    const remarks = Array.isArray(db.checks?.[recordKey]?.to?.commentLog) ? db.checks[recordKey].to.commentLog : [];
    const linkedRemark = remarks.slice().reverse().find(entry => {
      const stamp = walkShiftAtServer(entry?.at);
      return stamp.date === mark.date && stamp.shift === mark.shift;
    });
    checks[checkKey] = {
      kind: descriptor.kind,
      grpNumber: descriptor.grpNumber,
      tubeNumber: descriptor.tubeNumber,
      route: descriptor.routeLabel,
      shift: mark.shift,
      shiftLabel: mark.shift === "night" ? "Ночь" : "День",
      at: String(mark.at || linkedRemark?.at || new Date().toISOString()),
      status: linkedRemark ? "remark" : "ok",
      comment: linkedRemark ? String(linkedRemark.text || "Замечание") : "Замечаний нет",
      sourceRecordKey: recordKey,
      remarkId: String(linkedRemark?.id || ""),
      byId: "",
      byName: String(mark.byName || linkedRemark?.name || "").slice(0, 200),
      byRole: String(mark.byRole || linkedRemark?.role || "").slice(0, 100)
    };
    db.gasJournal[rowId] = buildGrpSectionBRowServer({ ...current, grpQrChecks: checks }, mark.date, new Date().toISOString(), { name: "Система", role: "system" });
    changed = true;
  });
  Object.entries(db.checks || {}).forEach(([recordKey, record]) => {
    const match = recordKey.match(/^15:5:(\d{4}-\d{2}-\d{2})$/);
    if (!match) return;
    const date = match[1];
    ["day", "night"].forEach(shift => {
      const walk = record?.to?.walkGroups?.technical?.[shift] || record?.to?.walkShifts?.[shift];
      if (!walk?.done) return;
      const rowId = `A::${date}`;
      const current = db.gasJournal[rowId] && typeof db.gasJournal[rowId] === "object" ? db.gasJournal[rowId] : {};
      const checks = current.shgrpQrChecks && typeof current.shgrpQrChecks === "object" ? { ...current.shgrpQrChecks } : {};
      const checkKey = `psk:${shift}`;
      if (checks[checkKey]) return;
      const remarks = Array.isArray(record?.to?.commentLog) ? record.to.commentLog : [];
      const linkedRemark = remarks.slice().reverse().find(entry => {
        const stamp = walkShiftAtServer(entry?.at);
        return stamp.date === date && stamp.shift === shift;
      });
      checks[checkKey] = {
        kind: "psk", label: "ПСК", shift, shiftLabel: shift === "night" ? "Ночь" : "День",
        at: String(walk.at || linkedRemark?.at || record.updatedAt || new Date().toISOString()),
        status: linkedRemark ? "remark" : "ok",
        comment: linkedRemark ? String(linkedRemark.text || "Замечание") : "Замечаний нет",
        sourceRecordKey: recordKey, remarkId: String(linkedRemark?.id || ""),
        byId: "", byName: String(walk.byName || linkedRemark?.name || "").slice(0, 200),
        byRole: String(walk.byRole || linkedRemark?.role || "").slice(0, 100)
      };
      const row = buildShgrpSectionARowServer({ ...current, shgrpQrChecks: checks }, date, shift, new Date().toISOString(), { name: "Система", role: "system" });
      const shiftRows = { ...(current.shiftRows || {}), [shift]: row };
      db.gasJournal[rowId] = { ...row, shiftRows };
      changed = true;
    });
  });
  return changed;
}

function buildGrpSectionBRowServer(current = {}, date = "", now = new Date().toISOString(), actor = {}) {
  const checks = current.grpQrChecks && typeof current.grpQrChecks === "object" ? current.grpQrChecks : {};
  const entries = Object.values(checks).sort((a, b) => {
    const shiftOrder = (a.shift === "day" ? 0 : 1) - (b.shift === "day" ? 0 : 1);
    const kindRank = entry => entry.kind === "controlTube" ? 1 : entry.kind === "protectionZone" ? 2 : 0;
    const kindOrder = kindRank(a) - kindRank(b);
    return shiftOrder || kindOrder || Number(a.grpNumber || a.tubeNumber || 0) - Number(b.grpNumber || b.tubeNumber || 0);
  });
  const line = (entry, value) => `${entry.shiftLabel} · ${entry.route} — ${value}`;
  const grpEntries = entries.filter(entry => !entry.kind || entry.kind === "grp");
  const pipelineEntries = entries.filter(entry => !entry.kind || entry.kind === "grp" || entry.kind === "controlTube");
  const protectionEntries = entries.filter(entry => entry.kind === "protectionZone");
  const names = [...new Set(entries.map(entry => entry.byName).filter(Boolean))];
  return {
    ...current,
    id: `B::${date}`,
    section: "B",
    date,
    time: new Date(entries[entries.length - 1]?.at || now).toLocaleTimeString("ru-RU", { timeZone: "Asia/Qyzylorda", hour: "2-digit", minute: "2-digit", hour12: false }),
    route: grpEntries.map(entry => `${entry.shiftLabel} · ${entry.route}`).join("; "),
    wells: pipelineEntries.map(entry => line(entry, entry.kind === "controlTube"
      ? entry.status === "remark" ? "неисправна" : "исправна"
      : "Исправно")).join("; "),
    gasSmell: grpEntries.map(entry => line(entry, entry.status === "remark" ? "Есть запах газа" : "Исправно")).join("; "),
    protectionZone: protectionEntries.map(entry => line(entry, entry.status === "remark" ? "есть нарушение" : "без нарушений")).join("; "),
    remarks: entries.map(entry => line(entry, entry.comment || "Замечаний нет")).join("; "),
    actions: entries.map(entry => line(entry, entry.status !== "remark"
      ? "Не требуется"
      : entry.resolutionText || "Требуется")).join("; "),
    checkedBy: names.join(", ") || String(actor.name || "Сотрудник"),
    updatedAt: now,
    updatedByName: String(actor.name || ""),
    updatedByRole: String(actor.role || ""),
    entryStatus: "fixed",
    fixedAt: current.fixedAt || now,
    fixedByName: current.fixedByName || names.join(", ") || String(actor.name || "Сотрудник"),
    source: "qr-grp",
    grpQrChecks: checks
  };
}

function linkResolvedGrpRemarkToGasJournalServer(db, recordKey, remark, actor, now) {
  if (!remark?.resolved || !recordKey) return {};
  const recordDate = String(recordKey).split(":").pop();
  const rowId = `B::${recordDate}`;
  const current = db.gasJournal?.[rowId];
  if (!current?.grpQrChecks || typeof current.grpQrChecks !== "object") return {};
  const normalizedRemark = String(remark.text || "").trim().toLocaleLowerCase("ru-RU");
  const check = Object.values(current.grpQrChecks).find(entry =>
    entry?.status === "remark"
    && !entry.resolvedAt
    && (String(entry.remarkId || "") === String(remark.id || "")
      || String(entry.sourceRecordKey || "") === recordKey
      || (!entry.sourceRecordKey && normalizedRemark && String(entry.comment || "").trim().toLocaleLowerCase("ru-RU") === normalizedRemark))
  );
  if (!check) return {};
  const resolution = String(remark.resolvedComment || remark.resolutionSubmittedComment || "Устранено").trim().slice(0, 2000);
  const performer = String(remark.resolvedByName || remark.resolutionSubmittedByName || "").trim().slice(0, 200);
  const resolvedAt = String(remark.resolvedAt || now);
  const resolvedLabel = new Date(resolvedAt).toLocaleString("ru-RU", {
    timeZone: "Asia/Qyzylorda", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
  });
  check.resolvedAt = resolvedAt;
  check.resolvedByName = performer;
  check.resolutionComment = resolution;
  check.resolutionText = `Устранено: ${resolution}${performer ? `; исполнитель: ${performer}` : ""}; ${resolvedLabel}`;
  check.remarkId ||= String(remark.id || "");
  check.sourceRecordKey ||= recordKey;
  const row = buildGrpSectionBRowServer(current, recordDate, now, actor);
  db.gasJournal[rowId] = row;
  return { [rowId]: row };
}

function linkResolvedShgrpARemarkToGasJournalServer(db, recordKey, remark, actor, now) {
  if (!remark?.resolved || !recordKey) return {};
  const date = String(recordKey).split(":").pop();
  const id = `A::${date}`;
  const current = db.gasJournal?.[id];
  if (!current?.shgrpQrChecks) return {};
  const check = Object.values(current.shgrpQrChecks).find(entry => entry?.status === "remark" && !entry.resolvedAt
    && (String(entry.remarkId || "") === String(remark.id || "") || String(entry.sourceRecordKey || "") === recordKey));
  if (!check) return {};
  check.resolvedAt = String(remark.resolvedAt || now);
  check.resolvedByName = String(remark.resolvedByName || remark.resolutionSubmittedByName || "");
  check.resolutionComment = String(remark.resolvedComment || remark.resolutionSubmittedComment || "Устранено");
  const shift = check.shift || "day";
  const shiftRow = buildShgrpSectionARowServer(current, date, shift, now, actor);
  shiftRow.remarks = `${shiftRow.remarks}; Устранено: ${check.resolutionComment}${check.resolvedByName ? ` (${check.resolvedByName})` : ""}`;
  const shiftRows = { ...(current.shiftRows || {}), [shift]: shiftRow };
  db.gasJournal[id] = { ...shiftRow, shiftRows };
  return { [id]: db.gasJournal[id] };
}

function linkResolvedCompressorRemarkToJournalServer(db, recordKey, remark, actor, now) {
  if (!remark?.resolved || !recordKey) return {};
  const match = String(recordKey).match(/^9:(\d+):(\d{4}-\d{2}-\d{2})$/);
  if (!match) return {};
  const compressors = ["№1 EKOMAK 90", "№2 EKOMAK 90", "№3 EKOMAK 110"];
  const compressor = compressors[Number(match[1])] || "";
  if (!compressor) return {};
  const rowId = `Компрессорная::${match[2]}::${compressor}`;
  const current = db.compressorJournal?.[rowId];
  if (!current) return {};
  const sameRemark = String(current.remarkId || "") === String(remark.id || "")
    || String(current.sourceRecordKey || "") === String(recordKey);
  if (!sameRemark) return {};
  const resolvedAt = String(remark.resolvedAt || now);
  const resolutionComment = String(remark.resolvedComment || remark.resolutionSubmittedComment || "Устранено").trim().slice(0, 2000);
  const resolvedByName = String(remark.resolvedByName || remark.resolutionSubmittedByName || actor?.name || "").trim().slice(0, 200);
  const row = {
    ...current,
    resolutionComment,
    resolvedAt,
    resolvedByName,
    leakGrounding: "Заземлено, утечек нет",
    updatedAt: now,
    updatedByName: String(actor?.name || ""),
    updatedByRole: String(actor?.role || "")
  };
  db.compressorJournal ||= {};
  db.compressorJournal[rowId] = row;
  return { [rowId]: row };
}

const handleAdminUserPermissionsRoute = createAdminUserPermissionsRoute({
  adminPermissionKeys: ADMIN_PERMISSION_KEYS,
  enqueueStateWrite,
  passwordMatches,
  readBody,
  readDb,
  sendJson,
  userPublic,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});
const handleAdminUserSessionsRoute = createAdminUserSessionsRoute({
  enqueueStateWrite,
  passwordMatches,
  readBody,
  readDb,
  sendJson,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});
const handleAdminUserAccessRoute = createAdminUserAccessRoute({
  enqueueStateWrite,
  passwordMatches,
  readBody,
  readDb,
  sendJson,
  userPublic,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});
const handleAdminAutomationRoute = createAdminAutomationRoute({
  adminAutomationSnapshot,
  passwordMatches,
  readBody,
  readDb,
  runAutomaticBackupIfDue,
  sendJson,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});
const handleAdminConfigPackageRoute = createAdminConfigPackageRoute({
  buildAdminConfigPackage,
  createAdminBackup,
  enqueueStateWrite,
  normalizedAdminConfig,
  passwordMatches,
  randomHex: bytes => crypto.randomBytes(bytes).toString("hex"),
  readBody,
  readDb,
  sendDownload,
  sendJson,
  todayStamp,
  validateAdminConfigPackage,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});
const handleAdminArchivesRoute = createAdminArchivesRoute({
  adminArchiveSelection,
  backupChecksum,
  createAdminArchive,
  createAdminBackup,
  enqueueStateWrite,
  passwordMatches,
  readBody,
  readAdminArchive,
  readDb,
  sendDownload,
  sendJson,
  shouldStoreArchiveInState: () => !postgresPool,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});

const handleAdminActivityRoute = createAdminActivityRoute({
  adminActivityFeed,
  enqueueStateWrite,
  readDb,
  sendJson,
  writeDb
});

const handleAdminIntegrityRoute = createAdminIntegrityRoute({
  createAdminBackup,
  dataIntegrityReport,
  enqueueStateWrite,
  passwordMatches,
  readBody,
  readDb,
  sendJson,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});

const handleAdminBackupsRoute = createAdminBackupsRoute({
  applyAdminBackupRetention,
  backupRetentionDeleteIds,
  createAdminBackup,
  enqueueStateWrite,
  listAdminBackups,
  normalizeDb,
  passwordMatches,
  readAdminBackupPayload,
  readBody,
  readDb,
  sendDownload,
  sendJson,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});

const handleAdminSettingsRoute = createAdminSettingsRoute({
  enqueueStateWrite,
  normalizedAdminConfig,
  passwordMatches,
  randomBytes: crypto.randomBytes,
  readBody,
  readDb,
  sendJson,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});

const handleAdminMonitoringRoute = createAdminMonitoringRoute({
  enqueueStateWrite,
  readBody,
  readDb,
  sendJson,
  writeDb
});

const handleAdminMaintenanceRoute = createAdminMaintenanceRoute({
  createManualBackup,
  enqueueStateWrite,
  passwordMatches,
  readBody,
  readDb,
  sendJson,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});

const handleAdminNotificationsRoute = createAdminNotificationsRoute({
  broadcastState,
  enqueueStateWrite,
  passwordMatches,
  randomBytes: crypto.randomBytes,
  readBody,
  readDb,
  sendJson,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});

const handleAdminSystemReportRoute = createAdminSystemReportRoute({
  listAdminBackups,
  readDb,
  refreshSystemMonitoring,
  sendDownload,
  sendJson,
  systemReadinessReport,
  todayStamp
});

const handleAdminDashboardRoute = createAdminDashboardRoute({
  adminActivityFeed,
  adminArchiveSelection,
  adminAutomationSnapshot,
  adminDiagnosticWithin,
  adminUserOperationalSummary,
  backupRetentionDeleteIds,
  dataIntegrityReport,
  getPostgresConnected: () => Boolean(postgresPool),
  getStorageMode: () => storageStatus.mode,
  listAdminArchives,
  listAdminBackups,
  normalizedAdminConfig,
  readDb,
  sendJson,
  systemReadinessReport,
  userLoginDiagnostics,
  userPublic
});

const handleAdminStorageRoute = createAdminStorageRoute({
  appendActionLog,
  basename: path.basename,
  byteLength: Buffer.byteLength,
  createManualBackup,
  directoryStorageStats,
  getBackupDirectory: () => backupDir,
  getPhotosDirectory: () => photosDir,
  githubRepositoryStorage,
  publicState,
  readBody,
  readDb,
  sendJson,
  unusedPublicAssetCandidates,
  waitForStateWrites: () => stateWriteQueue.catch(() => {})
});

const handleAdminQrRoute = createAdminQrRoute({
  enqueueStateWrite,
  passwordMatches,
  randomBytes: crypto.randomBytes,
  readBody,
  readDb,
  sendJson,
  todayStamp,
  writeDb,
  allowPasswordlessTestAuth: process.env.NODE_ENV === "test"
});

const handleAdminRatingRoute = createAdminRatingRoute({
  enqueueStateWrite,
  normalizedAdminConfig,
  publicState,
  readBody,
  readDb,
  sendJson,
  writeDb
});

const handleAdminEquipmentQrRoute = createAdminEquipmentQrRoute({
  broadcastState,
  enqueueStateWrite,
  randomBytes: crypto.randomBytes,
  readBody,
  readDb,
  sendJson,
  writeDb
});

const handleAdminEquipmentConfigRoute = createAdminEquipmentConfigRoute({
  broadcastState,
  enqueueStateWrite,
  publicState,
  randomBytes: crypto.randomBytes,
  readBody,
  readDb,
  sendJson,
  writeDb
});

const handleAdminEquipmentMaintenanceRoute = createAdminEquipmentMaintenanceRoute({
  broadcastState,
  catalogNodeTombstone,
  enqueueStateWrite,
  normalizedAdminConfig,
  normalizedCatalogNodeName,
  passwordMatches,
  publicState,
  randomBytes: crypto.randomBytes,
  readBody,
  readDb,
  sendJson,
  writeDb
});

async function handleApi(req, res, pathname, url) {
  const versionExempt = pathname === "/api/health"
    || pathname === "/api/auth/session"
    || pathname === "/api/qr"
    || pathname === "/api/gpm-qr"
    || pathname.startsWith("/api/photos/")
    || pathname.startsWith("/api/export/");
  const clientVersion = String(req.headers["x-app-version"] || url.searchParams.get("appVersion") || "");
  const clientProtocol = String(req.headers["x-client-protocol"] || "");
  const compatibleClient = clientProtocol === CLIENT_PROTOCOL_VERSION || SUPPORTED_CLIENT_VERSIONS.has(clientVersion);
  if (process.env.NODE_ENV !== "test" && !versionExempt && !compatibleClient) {
    sendJson(res, 426, {
      ok: false,
      error: "Требуется обновление приложения.",
      code: "client_update_required",
      requiredVersion: SERVER_VERSION
    }, { "Cache-Control": "no-store" });
    return true;
  }
  const publicRequest = pathname === "/api/health"
    || (pathname === "/api/qr" && req.method === "GET")
    || (pathname === "/api/gpm-qr" && req.method === "GET")
    || pathname === "/api/auth/register"
    || pathname === "/api/auth/login"
    || pathname === "/api/auth/session"
    || pathname === "/api/auth/logout"
    || (pathname === "/api/attendance/lookup" && req.method === "POST")
    || (pathname === "/api/attendance/contractor" && req.method === "POST")
    ;
  if (!publicRequest) {
    const allowPending = pathname === "/api/users" && req.method === "GET";
    const authUser = authenticatedUser(req, readDb(), allowPending);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "authentication_required" });
      return true;
    }
    req.authUser = authUser;
  }

  if (rejectRepeatedAdminMutation(req, res, pathname)) return true;

  if (await handleAdminStorageRoute(req, res, pathname)) return true;

  if (await handleAdminQrRoute(req, res, pathname)) return true;

  if (await handleAdminRatingRoute(req, res, pathname)) return true;

  if (await handleAdminEquipmentQrRoute(req, res, pathname)) return true;

  if (await handleAdminEquipmentConfigRoute(req, res, pathname)) return true;

  if (await handleAdminEquipmentMaintenanceRoute(req, res, pathname)) return true;

  if (pathname === "/api/attendance/lookup" && req.method === "POST") {
    if (!contractorAttendanceRateAllowed(req)) {
      sendJson(res, 429, { ok: false, error: "Слишком много попыток. Подождите несколько минут." });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    const db = readDb();
    if (!db.attendanceConfig.qrEnabled || !validAttendanceQrToken(db, "attendance", body.token)) {
      sendJson(res, 410, { ok: false, error: "attendance_qr_expired" });
      return true;
    }
    const identifier = String(body.identifier || "").trim().slice(0, 100);
    if (identifier.length < 3) {
      sendJson(res, 400, { ok: false, error: "Введите телефон или табельный номер." });
      return true;
    }
    const user = findUser(db, identifier);
    sendJson(res, 200, {
      ok: true,
      registered: Boolean(user && user.approved !== false && user.pendingApproval !== true && user.role),
      identifier,
      contractorTicket: user ? "" : contractorAttendanceTicket(db, req)
    });
    return true;
  }

  if (pathname === "/api/attendance/contractor" && req.method === "POST") {
    if (!contractorAttendanceRateAllowed(req)) {
      sendJson(res, 429, { ok: false, error: "Слишком много попыток. Подождите несколько минут." });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    const name = String(body.name || "").trim().replace(/\s+/g, " ").slice(0, 150);
    const phone = String(body.phone || "").trim().slice(0, 50);
    if (name.length < 3 || normalizeIdentifier(phone).length < 7) {
      sendJson(res, 400, { ok: false, error: "Введите ФИО и правильный номер телефона." });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const now = Date.now();
      if (
        !db.attendanceConfig.qrEnabled
        || (!validAttendanceQrToken(db, "attendance", body.token) && !validContractorAttendanceTicket(db, req, body.contractorTicket, now))
      ) return { error: "attendance_qr_expired" };
      if (findUser(db, phone)) return { error: "attendance_registered_user" };
      const phoneKey = normalizeIdentifier(phone);
      const userKey = `contractor:${phoneKey}`;
      const existing = (db.attendanceSessions || []).find(item =>
        item.userKey === userKey && !item.endedAt && Date.parse(item.expiresAt || "") > now
      );
      if (existing) return { alreadyActive: true, session: attendanceSessionPublic(existing) };
      const session = {
        id: `attendance:${now}:${crypto.randomBytes(4).toString("hex")}`,
        userKey,
        name,
        role: "contractor",
        area: "",
        phone,
        employeeId: "",
        startedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ATTENDANCE_WINDOW_MS).toISOString(),
        attendanceQr: true,
        manual: false,
        contractor: true
      };
      db.attendanceSessions.push(session);
      db.attendanceSessions = db.attendanceSessions.slice(-2000);
      writeDb(db, { action: "contractor_attendance_started", name, phone, sessionId: session.id });
      return { session: attendanceSessionPublic(session) };
    });
    if (result.error) {
      const status = result.error === "attendance_qr_expired" ? 410 : 409;
      sendJson(res, status, { ok: false, error: result.error });
      return true;
    }
    sendJson(res, 200, { ok: true, contractor: true, ...result });
    return true;
  }

  if (pathname === "/api/attendance/status" && req.method === "GET") {
    const db = readDb();
    const now = Date.now();
    const ownSession = activeAttendanceSession(db, req.authUser, now);
    const monitor = attendanceCanMonitor(req.authUser);
    const onDuty = monitor
      ? (db.attendanceSessions || [])
        .filter(item => !item.endedAt && Date.parse(item.expiresAt || "") > now)
        .map(attendanceSessionPublic)
        .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
      : [];
    const people = monitor
      ? [...(db.users || [])
        .filter(user => attendanceRoleAllowed(user) && user.approved !== false && user.pendingApproval !== true)
        .map(user => {
          const session = activeAttendanceSession(db, user, now);
          return {
            userKey: attendanceUserKey(user),
            name: String(user.name || ""),
            role: String(user.role || ""),
            area: String(user.area || ""),
            phone: String(user.phone || ""),
            employeeId: String(user.employeeId || ""),
            onDuty: Boolean(session),
            session: session ? attendanceSessionPublic(session) : null
          };
        }),
        ...(db.attendanceSessions || [])
          .filter(item => item.contractor === true && !item.endedAt && Date.parse(item.expiresAt || "") > now)
          .map(item => ({
            userKey: String(item.userKey || ""),
            name: String(item.name || ""),
            role: "contractor",
            area: "",
            phone: String(item.phone || ""),
            employeeId: "",
            onDuty: true,
            contractor: true,
            session: attendanceSessionPublic(item)
          }))]
        .sort((a, b) => Number(b.onDuty) - Number(a.onDuty) || a.name.localeCompare(b.name, "ru"))
      : [];
    const history = req.authUser?.role === "editor"
      ? (db.attendanceSessions || []).slice(-200).reverse().map(attendanceSessionPublic)
      : [];
    sendJson(res, 200, {
      ok: true,
      required: attendanceRoleAllowed(req.authUser),
      canEdit: !attendanceRoleAllowed(req.authUser) || Boolean(ownSession),
      canMonitor: monitor,
      isAdmin: req.authUser?.role === "editor",
      isPrimaryAdminEngineer: isPrimaryAdminEngineerServer(req.authUser),
      session: ownSession ? attendanceSessionPublic(ownSession) : null,
      onDuty,
      people,
      history,
      attendanceQrEnabled: Boolean(db.attendanceConfig.qrEnabled),
      attendanceQrCreatedAt: monitor ? String(db.attendanceConfig.qrCreatedAt || "") : "",
      attendanceQrCreatedBy: monitor ? String(db.attendanceConfig.qrCreatedBy || "") : "",
      serverTime: new Date(now).toISOString()
    });
    return true;
  }

  if (pathname === "/api/attendance/qr-config" && req.method === "POST") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    const action = String(body.action || "create");
    if (!["create", "replace", "reset"].includes(action)) {
      sendJson(res, 400, { ok: false, error: "invalid_qr_action" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      if (action === "reset") {
        db.attendanceConfig.qrEnabled = false;
        db.attendanceConfig.qrSecret = "";
        db.attendanceConfig.qrCreatedAt = "";
        db.attendanceConfig.qrCreatedBy = "";
      } else {
        db.attendanceConfig.qrEnabled = true;
        db.attendanceConfig.qrSecret = "";
        db.attendanceConfig.qrCreatedAt = new Date().toISOString();
        db.attendanceConfig.qrCreatedBy = String(req.authUser.name || "");
        attendanceQrSecret(db);
      }
      writeDb(db, { action: `attendance_qr_${action}`, user: req.authUser });
      return { attendanceQrEnabled: Boolean(db.attendanceConfig.qrEnabled) };
    });
    if (result.error) {
      sendJson(res, 409, { ok: false, error: result.error });
      return true;
    }
    sendJson(res, 200, { ok: true, ...result });
    return true;
  }

  if (pathname === "/api/attendance/qr" && req.method === "GET") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const db = readDb();
    if (!db.attendanceConfig.qrEnabled) {
      sendJson(res, 409, { ok: false, error: "attendance_qr_not_created" });
      return true;
    }
    const token = attendanceQrToken(db, "attendance");
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const protocol = forwardedProto === "https" ? "https" : "http";
    const host = String(req.headers.host || "ppr-control-ramazan.onrender.com");
    const scanUrl = `${protocol}://${host}/?attendance=${encodeURIComponent(token)}`;
    sendJson(res, 200, {
      ok: true,
      token,
      scanUrl,
      permanent: true
    });
    return true;
  }

  if (pathname === "/api/attendance/scan" && req.method === "POST") {
    if (!attendanceRoleAllowed(req.authUser)) {
      sendJson(res, 403, { ok: false, error: "attendance_role_not_required" });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    const token = String(body.token || "");
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const now = Date.now();
      if (!db.attendanceConfig.qrEnabled || !validAttendanceQrToken(db, "attendance", token)) return { error: "attendance_qr_expired" };
      const existing = activeAttendanceSession(db, req.authUser, now);
      if (existing) return { alreadyActive: true, session: attendanceSessionPublic(existing) };
      const startedAt = new Date(now).toISOString();
      const session = {
        id: `attendance:${now}:${crypto.randomBytes(4).toString("hex")}`,
        userKey: attendanceUserKey(req.authUser),
        userId: String(req.authUser.id || ""),
        name: String(req.authUser.name || ""),
        role: String(req.authUser.role || ""),
        area: String(req.authUser.area || ""),
        phone: String(req.authUser.phone || ""),
        employeeId: String(req.authUser.employeeId || ""),
        startedAt,
        expiresAt: new Date(now + ATTENDANCE_WINDOW_MS).toISOString(),
        attendanceQr: true,
        manual: false
      };
      db.attendanceSessions.push(session);
      db.attendanceSessions = db.attendanceSessions.slice(-2000);
      writeDb(db, { action: "attendance_started", user: req.authUser, sessionId: session.id });
      return { session: attendanceSessionPublic(session) };
    });
    if (result.error) {
      sendJson(res, 410, { ok: false, error: result.error });
      return true;
    }
    sendJson(res, 200, { ok: true, ...result });
    return true;
  }

  if (pathname === "/api/attendance/admin" && req.method === "POST") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    const action = String(body.action || "");
    const userKey = String(body.userKey || "").trim();
    const sessionId = String(body.sessionId || "").trim();
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      if (action === "end") {
        const session = (db.attendanceSessions || []).find(item => item.id === sessionId && !item.endedAt);
        if (!session) return { error: "attendance_session_not_found" };
        session.endedAt = new Date().toISOString();
        session.endedBy = String(req.authUser.name || "Админ");
        writeDb(db, { action: "attendance_ended_by_admin", user: req.authUser, sessionId });
        return { session: attendanceSessionPublic(session) };
      }
      if (action === "grant") {
        const user = (db.users || []).find(item => attendanceUserKey(item) === userKey);
        if (!user || !attendanceRoleAllowed(user)) return { error: "attendance_user_not_found" };
        const now = Date.now();
        const existing = activeAttendanceSession(db, user, now);
        if (existing) return { session: attendanceSessionPublic(existing), alreadyActive: true };
        const session = {
          id: `attendance:${now}:${crypto.randomBytes(4).toString("hex")}`,
          userKey: attendanceUserKey(user),
          userId: String(user.id || ""),
          name: String(user.name || ""),
          role: String(user.role || ""),
          area: String(user.area || ""),
          phone: String(user.phone || ""),
          employeeId: String(user.employeeId || ""),
          startedAt: new Date(now).toISOString(),
          expiresAt: new Date(now + ATTENDANCE_WINDOW_MS).toISOString(),
          manual: true,
          grantedBy: String(req.authUser.name || "Админ")
        };
        db.attendanceSessions.push(session);
        db.attendanceSessions = db.attendanceSessions.slice(-2000);
        writeDb(db, { action: "attendance_granted_by_admin", user: req.authUser, target: userPublic(user) });
        return { session: attendanceSessionPublic(session) };
      }
      return { error: "attendance_action_invalid" };
    });
    if (result.error) {
      sendJson(res, 400, { ok: false, error: result.error });
      return true;
    }
    sendJson(res, 200, { ok: true, ...result });
    return true;
  }

  const attendanceMutationExempt = pathname.startsWith("/api/push/")
    || pathname === "/api/client-error"
    || pathname === "/api/remark-collaboration";
  if (
    attendanceRoleAllowed(req.authUser)
    && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
    && !attendanceMutationExempt
  ) {
    const db = readDb();
    if (!activeAttendanceSession(db, req.authUser)) {
      sendJson(res, 403, {
        ok: false,
        error: "attendance_required",
        message: "Смена не открыта. Отсканируйте рабочий QR-код."
      });
      return true;
    }
  }

  if (pathname === "/api/push/public-key" && req.method === "GET") {
    const db = readDb();
    if (ensurePushConfig(db)) writeDb(db, { action: "push_config_created" });
    sendJson(res, 200, { ok: true, publicKey: db.pushNotifications.vapid.publicKey });
    return true;
  }


  if (pathname === "/api/push/subscribe" && req.method === "POST") {
    const body = await readBody(req);
    const subscription = body.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      sendJson(res, 400, { ok: false, error: "invalid_push_subscription" });
      return true;
    }
    const db = readDb();
    ensurePushConfig(db);
    const authenticatedProfile = req.authUser || {};
    const entry = {
      subscription,
      clientId: String(body.clientId || ""),
      profile: {
        id: String(authenticatedProfile.id || ""),
        employeeId: String(authenticatedProfile.employeeId || ""),
        phone: String(authenticatedProfile.phone || ""),
        name: String(authenticatedProfile.name || ""),
        role: String(authenticatedProfile.role || ""),
        area: String(authenticatedProfile.area || ""),
        language: ["ru", "kk", "uz"].includes(String(body.profile?.language || "")) ? String(body.profile.language) : "ru"
      },
      userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
      updatedAt: new Date().toISOString()
    };
    const subscriptions = db.pushNotifications.subscriptions || [];
    const index = subscriptions.findIndex(item => item.subscription?.endpoint === subscription.endpoint);
    if (index >= 0) subscriptions[index] = entry;
    else subscriptions.push(entry);
    db.pushNotifications.subscriptions = subscriptions.slice(-500);
    writeDb(db, { action: "push_subscription_saved", clientId: entry.clientId, role: entry.profile.role });
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/push/status" && req.method === "GET") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const db = readDb();
    const devices = (db.pushNotifications?.subscriptions || []).map(savedEntry => {
      const entry = currentPushEntry(db, savedEntry);
      const counts = personalNotificationBreakdownServer(db, entry);
      return {
        id: crypto.createHash("sha256").update(String(entry.subscription?.endpoint || "")).digest("hex").slice(0, 16),
        name: String(entry.profile?.name || "Неизвестный сотрудник"),
        role: String(entry.profile?.role || ""),
        area: String(entry.profile?.area || ""),
        language: String(entry.profile?.language || "ru"),
        updatedAt: String(entry.updatedAt || ""),
        device: String(entry.userAgent || "").slice(0, 160),
        badgeCount: counts.total,
        counts
      };
    });
    sendJson(res, 200, { ok: true, devices });
    return true;
  }

  if (pathname === "/api/push/unsubscribe" && req.method === "POST") {
    const body = await readBody(req);
    const endpoint = String(body.endpoint || "");
    const db = readDb();
    const before = (db.pushNotifications?.subscriptions || []).length;
    db.pushNotifications.subscriptions = (db.pushNotifications?.subscriptions || []).filter(entry =>
      String(entry.subscription?.endpoint || "") !== endpoint
    );
    if (db.pushNotifications.subscriptions.length !== before) {
      writeDb(db, { action: "push_subscription_removed", user: req.authUser });
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/push/test" && req.method === "POST") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req);
    const targetId = String(body.id || "");
    const db = readDb();
    ensurePushConfig(db);
    const entry = (db.pushNotifications?.subscriptions || []).find(item =>
      crypto.createHash("sha256").update(String(item.subscription?.endpoint || "")).digest("hex").slice(0, 16) === targetId
    );
    if (!entry) {
      sendJson(res, 404, { ok: false, error: "push_device_not_found" });
      return true;
    }
    webPush.setVapidDetails(
      "https://ppr-control-ramazan.onrender.com",
      db.pushNotifications.vapid.publicKey,
      db.pushNotifications.vapid.privateKey
    );
    try {
      await webPush.sendNotification(entry.subscription, await localizedPushPayloadServer({
        type: "push-test",
        title: "ALKZ — проверка уведомлений",
        body: `Push работает для: ${entry.profile?.name || "сотрудник"}`,
        badgeCount: personalNotificationCountServer(db, entry),
        url: "/",
        entityId: `test:${targetId}`,
        tag: `push-test:${targetId}:${Date.now()}`
      }, entry), { TTL: 300, urgency: "high" });
      sendJson(res, 200, { ok: true });
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        db.pushNotifications.subscriptions = (db.pushNotifications.subscriptions || []).filter(item => item !== entry);
        writeDb(db, { action: "push_subscription_expired", id: targetId });
      }
      sendJson(res, 502, { ok: false, error: "push_delivery_failed", detail: String(error?.message || "") });
    }
    return true;
  }

  if (pathname === "/api/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write(": connected\n\n");
    sseClients.add(res);
    sendSse(res, { type: "ready", origin: "server", stateVersion: realtimeStateVersion() });
    req.on("close", () => sseClients.delete(res));
    return true;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, buildHealthPayload({
      compatibleClient,
      clientVersion,
      serverVersion: SERVER_VERSION,
      clientProtocol: CLIENT_PROTOCOL_VERSION,
      storage: storageStatus,
      websocket: Boolean(wss),
      websocketClients: wss ? wss.clients.size : 0,
      eventClients: sseClients.size,
      stateVersion: realtimeStateVersion(),
      productionRequestDuplicatesRemoved: readDb().targetedCleanupVersions?.productionRequestDedup20260820?.removed
    }));
    return true;
  }

  if (pathname === "/api/client-error" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    runtimeMonitor.clientErrors.push(new Date().toISOString());
    appendActionLog({
      action: "client_error",
      user: { id: req.authUser?.id || "", name: req.authUser?.name || "", role: req.authUser?.role || "" },
      message: String(body.message || "").slice(0, 1000),
      source: String(body.source || "").slice(0, 500),
      line: Number(body.line || 0),
      column: Number(body.column || 0),
      appVersion: String(body.appVersion || "").slice(0, 100),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 300)
    });
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/changes" && req.method === "GET") {
    const since = String(url.searchParams.get("since") || "");
    const match = since.match(/^([a-f0-9]+):(\d+)$/i);
    const requestedCounter = match ? Number(match[2]) : -1;
    const sameInstance = Boolean(match && match[1] === realtimeInstanceId);
    const oldestCounter = realtimePatchHistory.length ? realtimePatchHistory[0].counter : realtimeStateCounter + 1;
    const historyAvailable = sameInstance
      && Number.isSafeInteger(requestedCounter)
      && requestedCounter <= realtimeStateCounter
      && requestedCounter >= oldestCounter - 1;
    if (!historyAvailable) {
      sendJson(res, 200, { ok: true, reset: true, stateVersion: realtimeStateVersion(), events: [] });
      return true;
    }
    const events = realtimePatchHistory
      .filter(entry => entry.counter > requestedCounter)
      .map(entry => entry.payload);
    sendJson(res, 200, { ok: true, reset: false, stateVersion: realtimeStateVersion(), events });
    return true;
  }

  if (pathname === "/api/qr" && req.method === "GET") {
    const data = String(url.searchParams.get("data") || "").trim();
    const size = Math.min(Math.max(Number(url.searchParams.get("size") || 240), 120), 640);
    if (!data || data.length > 300) {
      sendJson(res, 400, { ok: false, error: "QR data is empty or too long." });
      return true;
    }
    const requestedEcc = String(url.searchParams.get("ecc") || "H").toUpperCase();
    const errorCorrectionLevel = ["L", "M", "Q", "H"].includes(requestedEcc) ? requestedEcc : "H";
    const margin = Math.min(Math.max(Number(url.searchParams.get("margin") || 2), 2), 8);
    const svg = await QRCode.toString(data, {
      type: "svg",
      margin,
      width: size,
      errorCorrectionLevel,
      color: { dark: "#000000", light: "#ffffff" }
    });
    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(svg);
    return true;
  }

  if (pathname === "/api/gpm-qr" && req.method === "GET") {
    const mode = url.searchParams.get("mode") === "monthly" ? "MONTHLY" : "SHIFT";
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id || id.length > 120 || !/^[\p{L}\p{N}:._-]+$/u.test(id)) {
      sendJson(res, 400, { ok: false, error: "Некорректный QR кран-балки." });
      return true;
    }
    const target = `/?gpmQr=${encodeURIComponent(`PPRGPM|${mode}|${id}`)}`;
    res.writeHead(302, { Location: target, "Cache-Control": "no-store" });
    res.end();
    return true;
  }

  if (pathname === "/api/qr-walk/status" && req.method === "GET") {
    const equipmentId = Number(url.searchParams.get("equipmentId"));
    const date = String(url.searchParams.get("date") || "");
    const shift = String(url.searchParams.get("shift") || "");
    const role = String(req.authUser?.role || "");
    const requestedGroup = String(url.searchParams.get("group") || "");
    const expectedGroup = role === "editor" && ["technical", "operational"].includes(requestedGroup)
      ? requestedGroup
      : ["operator", "shop"].includes(role) ? "operational" : "technical";
    const group = requestedGroup || expectedGroup;
    if (!Number.isSafeInteger(equipmentId) || equipmentId < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["day", "night"].includes(shift) || group !== expectedGroup) {
      sendJson(res, 400, { ok: false, error: "qr_walk_status_invalid" });
      return true;
    }
    await stateWriteQueue.catch(() => {});
    const db = readDb();
    const checks = {};
    const prefix = `${equipmentId}:`;
    const suffix = `:${date}`;
    Object.entries(db.checks || {}).forEach(([recordKey, record]) => {
      if (!recordKey.startsWith(prefix) || !recordKey.endsWith(suffix)) return;
      const mark = record?.to?.walkGroups?.[group]?.[shift]
        || (group === "technical" ? record?.to?.walkShifts?.[shift] : null);
      if (mark?.done) checks[recordKey] = record;
    });
    sendJson(res, 200, { ok: true, equipmentId, date, shift, group, checks });
    return true;
  }

  if (pathname === "/api/qr-walk/shgrp-a-result" && req.method === "POST") {
    if (!shgrpSectionARoleAllowedServer(req.authUser)) {
      sendJson(res, 403, { ok: false, error: "shgrp_role_forbidden" });
      return true;
    }
    const body = await readBody(req).catch(() => ({}));
    const date = String(body.date || "");
    const shift = String(body.shift || "");
    const descriptor = shgrpSectionADescriptorServer(body.node || body.equipment);
    const hasRemark = body.hasRemark === true;
    const comment = String(body.comment || "").trim().slice(0, 2000);
    const inlet = Number(body.inletMpa);
    const outlet = Number(body.outletMpa);
    if (!descriptor || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["day", "night"].includes(shift) || (hasRemark && !comment)
      || (descriptor.kind === "shgrp" && hasRemark && (!Number.isFinite(inlet) || !Number.isFinite(outlet) || inlet <= outlet))) {
      sendJson(res, 400, { ok: false, error: "shgrp_a_result_invalid" });
      return true;
    }
    const initialDb = readDb();
    const weather = descriptor.kind === "shgrp" ? await almatyTemperatureServer(initialDb) : null;
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.gasJournal ||= {};
      const id = `A::${date}`;
      const current = db.gasJournal[id] && typeof db.gasJournal[id] === "object" ? db.gasJournal[id] : {};
      const checks = current.shgrpQrChecks && typeof current.shgrpQrChecks === "object" ? { ...current.shgrpQrChecks } : {};
      const checkKey = `${descriptor.kind}:${shift}`;
      const alreadyDone = Boolean(checks[checkKey]);
      if (!alreadyDone) {
        const sourceRecordKey = `${Number(body.equipmentId)}:${Number(body.nodeIndex)}:${date}`;
        const linkedRemark = db.checks?.[sourceRecordKey]?.to?.commentLog?.slice().reverse().find(entry =>
          !entry?.resolved && String(entry?.text || "").trim() === comment
        );
        checks[checkKey] = {
          kind: descriptor.kind, label: descriptor.label, shift, shiftLabel: shift === "night" ? "Ночь" : "День", at: new Date().toISOString(),
          status: hasRemark ? "remark" : "ok", comment: hasRemark ? comment : "Замечаний нет",
          ...(descriptor.kind === "shgrp" ? {
            inletMpa: hasRemark ? inlet.toFixed(1) : shgrpPressureServer(5, 6),
            outletMpa: hasRemark ? outlet.toFixed(1) : shgrpPressureServer(2, 2.9),
            tempInC: weather?.tempInC || "", tempOutC: weather?.tempOutC || "", temperatureSource: weather?.source || "last-record"
          } : {}),
          sourceRecordKey, remarkId: String(linkedRemark?.id || ""),
          byId: String(req.authUser?.id || ""), byName: String(req.authUser?.name || "").slice(0, 200), byRole: String(req.authUser?.role || "").slice(0, 100)
        };
      }
      const row = buildShgrpSectionARowServer({ ...current, shgrpQrChecks: checks }, date, shift, new Date().toISOString(), req.authUser);
      const shiftRows = { ...(current.shiftRows || {}), [shift]: row };
      db.gasJournal[id] = { ...row, shiftRows };
      writeDb(db, { action: "shgrp_section_a_qr_recorded", user: req.authUser, targetId: checkKey, targetLabel: descriptor.label, date, shift, hasRemark });
      return { id, row: db.gasJournal[id], alreadyDone };
    });
    const stateVersion = broadcastState(String(body.clientId || "api"), String(body.actionId || ""), { gasJournal: { [result.id]: result.row } }, true);
    sendJson(res, 200, { ok: true, ...result, stateVersion });
    return true;
  }

  if (pathname === "/api/qr-walk/grp-result" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    const date = String(body.date || "");
    const shift = String(body.shift || "");
    const sourceName = [body.route, body.equipment, body.node].map(value => String(value || "")).join(" ");
    const descriptor = shgrpSectionBDescriptorServer(sourceName);
    const hasRemark = body.hasRemark === true;
    const comment = String(body.comment || "").trim().slice(0, 2000);
    if (!descriptor || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["day", "night"].includes(shift) || (hasRemark && !comment)) {
      sendJson(res, 400, { ok: false, error: "grp_qr_result_invalid" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.gasJournal ||= {};
      const id = `B::${date}`;
      const now = new Date().toISOString();
      const current = db.gasJournal[id] && typeof db.gasJournal[id] === "object" ? db.gasJournal[id] : {};
      const checks = current.grpQrChecks && typeof current.grpQrChecks === "object" ? { ...current.grpQrChecks } : {};
      const checkKey = shgrpCheckKeyServer(descriptor, shift);
      if (!checks[checkKey]) {
        const sourceRecordKey = `${Number(body.equipmentId)}:${Number(body.nodeIndex)}:${date}`;
        const linkedRemark = db.checks?.[sourceRecordKey]?.to?.commentLog?.slice().reverse().find(entry =>
          !entry?.resolved && String(entry?.text || "").trim() === comment
        );
        checks[checkKey] = {
          kind: descriptor.kind,
          grpNumber: descriptor.grpNumber,
          tubeNumber: descriptor.tubeNumber,
          route: descriptor.routeLabel,
          shift,
          shiftLabel: shift === "night" ? "Ночь" : "День",
          at: now,
          status: hasRemark ? "remark" : "ok",
          comment: hasRemark ? comment : "Замечаний нет",
          sourceRecordKey: Number.isSafeInteger(Number(body.equipmentId)) && Number.isSafeInteger(Number(body.nodeIndex)) ? sourceRecordKey : "",
          remarkId: String(linkedRemark?.id || ""),
          byId: String(req.authUser?.id || ""),
          byName: String(req.authUser?.name || "").slice(0, 200),
          byRole: String(req.authUser?.role || "").slice(0, 100)
        };
      }
      const row = buildGrpSectionBRowServer({ ...current, grpQrChecks: checks }, date, now, req.authUser);
      db.gasJournal[id] = row;
      writeDb(db, { action: "shgrp_section_b_qr_recorded", user: req.authUser, targetId: checkKey, targetLabel: descriptor.routeLabel, date, shift, hasRemark });
      return { id, row, alreadyDone: Boolean(current.grpQrChecks?.[checkKey]) };
    });
    const stateVersion = broadcastState(String(body.clientId || "api"), String(body.actionId || ""), { gasJournal: { [result.id]: result.row } }, true);
    sendJson(res, 200, { ok: true, linked: true, alreadyDone: result.alreadyDone, id: result.id, row: result.row, stateVersion });
    return true;
  }

  if (pathname === "/api/qr-walk/mark" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    const equipmentId = Number(body.equipmentId);
    const nodeIndex = Number(body.nodeIndex);
    const date = String(body.date || "");
    const shift = String(body.shift || "");
    const role = String(req.authUser?.role || "");
    const requestedGroup = String(body.group || "");
    const expectedGroup = role === "editor" && ["technical", "operational"].includes(requestedGroup)
      ? requestedGroup
      : ["operator", "shop"].includes(role) ? "operational" : "technical";
    const group = requestedGroup || expectedGroup;
    const allowedRoles = new Set([
      "editor", "engineer", "shop", "mechanic", "electrician", "operator",
      "welder", "turner", "forkliftDriver", "safetyEngineer", "energyEngineer",
      "designEngineer", "mechanicalEngineer", "instrumentationEngineer", "productionDirector", "generalDirector"
    ]);
    if (
      !allowedRoles.has(String(req.authUser?.role || ""))
      || !Number.isSafeInteger(equipmentId)
      || equipmentId < 0
      || equipmentId > 10000
      || !Number.isSafeInteger(nodeIndex)
      || nodeIndex < 0
      || nodeIndex > 500
      || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !["day", "night"].includes(shift)
      || group !== expectedGroup
    ) {
      sendJson(res, 400, { ok: false, error: "qr_walk_invalid" });
      return true;
    }
    const qrCatalogItem = readDb().catalog?.equipment?.[String(equipmentId)];
    const expectedQrToken = String(qrCatalogItem?.qrTokens?.[nodeIndex] || "").trim();
    if (expectedQrToken && expectedQrToken !== String(body.qrToken || "").trim()) {
      sendJson(res, 410, { ok: false, error: "node_qr_replaced" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.checks ||= {};
      db.qrWalkJournal = Array.isArray(db.qrWalkJournal) ? db.qrWalkJournal : [];
      const recordKey = `${equipmentId}:${nodeIndex}:${date}`;
      const now = new Date().toISOString();
      const requestedCapturedAt = String(body.capturedAt || "");
      const requestedCapturedMs = Date.parse(requestedCapturedAt);
      const capturedAt = Number.isFinite(requestedCapturedMs) && requestedCapturedMs <= Date.now() + 5 * 60 * 1000
        ? new Date(requestedCapturedMs).toISOString()
        : now;
      const currentRecord = db.checks[recordKey] || {};
      const currentItem = currentRecord.to && typeof currentRecord.to === "object" ? currentRecord.to : {};
      const existing = currentItem.walkGroups?.[group]?.[shift]
        || (group === "technical" ? currentItem.walkShifts?.[shift] : null);
      const existingAt = Date.parse(existing?.at || "");
      const capturedMs = Date.parse(capturedAt);
      if (existing?.done) {
        if (Number.isFinite(existingAt) && existingAt <= capturedMs) {
          return { changed: false, recordKey, record: currentRecord, actionId: String(body.actionId || ""), origin: String(body.clientId || "api") };
        }
      }
      const nextItem = {
        tasks: Array.isArray(currentItem.tasks) ? currentItem.tasks.slice(0, 15) : Array(15).fill(false),
        walkDone: false,
        comment: "",
        commentPhoto: "",
        commentOwnerRole: "",
        commentOwnerName: "",
        commentLog: [],
        nodeDraftText: "",
        request: "",
        requestPhoto: "",
        resolved: false,
        createdAt: currentItem.createdAt || now,
        ...currentItem,
        walkGroups: {
          ...(currentItem.walkGroups || {}),
          [group]: {
            ...(currentItem.walkGroups?.[group] || {}),
            [shift]: {
            done: true,
            at: capturedAt,
            byRole: String(req.authUser?.role || ""),
            byName: String(req.authUser?.name || ""),
            shift,
            label: String(body.label || "").slice(0, 100),
            range: String(body.range || "").slice(0, 100)
            ,group,
            customJournal: body.customJournal && typeof body.customJournal === "object" ? JSON.parse(JSON.stringify(body.customJournal)) : null
            }
          }
        },
        updatedAt: now
      };
      nextItem.tasks[0] = false;
      const record = { ...currentRecord, createdAt: currentRecord.createdAt || now, updatedAt: now, to: nextItem };
      db.checks[recordKey] = record;
      const journalEntry = {
        id: `${recordKey}:${group}:${shift}`,
        equipmentId,
        nodeIndex,
        date,
        shift,
        group,
        at: capturedAt,
        receivedAt: now,
        byRole: role,
        byName: String(req.authUser?.name || "").slice(0, 200),
        area: String(body.area || "").slice(0, 200),
        equipment: String(body.equipment || "").slice(0, 200),
        node: String(body.node || "").slice(0, 300)
        ,customJournal: body.customJournal && typeof body.customJournal === "object" ? JSON.parse(JSON.stringify(body.customJournal)) : null
      };
      const journalIndex = db.qrWalkJournal.findIndex(item => item?.id === journalEntry.id);
      if (journalIndex >= 0) db.qrWalkJournal[journalIndex] = journalEntry;
      else db.qrWalkJournal.push(journalEntry);
      if (db.qrWalkJournal.length > 50000) db.qrWalkJournal = db.qrWalkJournal.slice(-50000);
      writeDb(db, {
        action: "qr_walk_mark",
        actionId: String(body.actionId || ""),
        clientId: String(body.clientId || ""),
        user: { id: req.authUser?.id || "", name: req.authUser?.name || "", role: req.authUser?.role || "" }
      });
      return { changed: true, recordKey, record, actionId: String(body.actionId || ""), origin: String(body.clientId || "api") };
    });
    const stateVersion = result.changed
      ? broadcastState(result.origin, result.actionId, { checks: { [result.recordKey]: result.record } }, true)
      : realtimeStateVersion();
    sendJson(res, 200, {
      ok: true,
      alreadyDone: !result.changed,
      recordKey: result.recordKey,
      record: result.record,
      stateVersion
    });
    return true;
  }

  if (pathname === "/api/qr-walk/journal" && req.method === "GET") {
    if (String(req.authUser?.role || "") !== "editor" && req.authUser?.qrWalkJournalAccess !== true && !activeUserPermission(req.authUser, "qrJournalView")) {
      sendJson(res, 403, { ok: false, error: "journal_access_required" });
      return true;
    }
    const db = readDb();
    const date = String(url.searchParams.get("date") || "");
    const entries = (Array.isArray(db.qrWalkJournal) ? db.qrWalkJournal : [])
      .filter(item => !date || item?.date === date)
      .slice(-10000);
    const known = new Set(entries.map(item => item.id));
    Object.entries(db.checks || {}).forEach(([recordKey, record]) => {
      const [equipmentId, nodeIndex, recordDate] = recordKey.split(":");
      if (date && recordDate !== date) return;
      const groups = {
        technical: { ...(record?.to?.walkShifts || {}), ...(record?.to?.walkGroups?.technical || {}) },
        operational: record?.to?.walkGroups?.operational || {}
      };
      Object.entries(groups).forEach(([group, shifts]) => Object.entries(shifts).forEach(([shift, mark]) => {
        if (!mark?.done) return;
        const id = `${recordKey}:${group}:${shift}`;
        if (known.has(id)) return;
        entries.push({ id, equipmentId: Number(equipmentId), nodeIndex: Number(nodeIndex), date: recordDate, shift, group, at: mark.at || "", byRole: mark.byRole || "", byName: mark.byName || "" });
        known.add(id);
      }));
    });
    sendJson(res, 200, { ok: true, entries });
    return true;
  }

  if (pathname === "/api/month-close" && req.method === "GET") {
    if (!isPrimaryAdminEngineerServer(req.authUser)) { sendJson(res, 403, { ok: false, error: "month_close_forbidden" }); return true; }
    const month = validMonthKey(url.searchParams.get("month") || "");
    if (!month) { sendJson(res, 400, { ok: false, error: "month_invalid" }); return true; }
    const db = readDb();
    sendJson(res, 200, { ok: true, readiness: monthCloseReadiness(db, month), closure: db.monthlyClosures?.[month] || null, canManage: true });
    return true;
  }

  if (pathname === "/api/month-close" && req.method === "POST") {
    if (!isPrimaryAdminEngineerServer(req.authUser)) { sendJson(res, 403, { ok: false, error: "month_close_forbidden" }); return true; }
    const body = await readBody(req).catch(() => ({}));
    const month = validMonthKey(body.month);
    const action = String(body.action || "");
    const reason = String(body.reason || "").trim().slice(0, 2000);
    const allowedActions = new Set(["confirm-area", "close-conditional", "close-full", "reopen"]);
    if (!month || !allowedActions.has(action) || !reason) { sendJson(res, 400, { ok: false, error: !month ? "month_invalid" : !reason ? "reason_required" : "month_close_action_invalid" }); return true; }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.monthlyClosures ||= {};
      const readiness = monthCloseReadiness(db, month);
      const previous = db.monthlyClosures[month] || { month, status: "open", history: [], areaConfirmations: [] };
      const history = Array.isArray(previous.history) ? previous.history.slice() : [];
      const now = new Date().toISOString();
      const actor = { id: String(req.authUser?.id || ""), name: String(req.authUser?.name || "Сотрудник"), role: String(req.authUser?.role || ""), area: String(req.authUser?.area || "") };
      let closure = { ...previous, month, history, areaConfirmations: Array.isArray(previous.areaConfirmations) ? previous.areaConfirmations.slice() : [] };
      if (action === "confirm-area") {
        const area = String(actor.role === "editor" ? (body.area || actor.area || "Общий участок") : (actor.area || "Общий участок")).trim().slice(0, 200);
        closure.areaConfirmations = closure.areaConfirmations.filter(item => item.area !== area);
        closure.areaConfirmations.push({ area, confirmedAt: now, confirmedById: actor.id, confirmedByName: actor.name, reason });
      } else if (action === "reopen") {
        if (!previous.status || previous.status === "open") return { error: "month_already_open" };
        closure = { ...closure, status: "open", reopenedAt: now, reopenedById: actor.id, reopenedByName: actor.name, reopenReason: reason };
      } else {
        if (previous.status && previous.status !== "open") return { error: "month_already_closed" };
        if ((action === "close-full" && (readiness.criticalCount || readiness.warningCount)) || (action === "close-conditional" && readiness.criticalCount)) return { error: "month_not_ready", readiness };
        const expectedTransferKeys = (readiness.groups.incompletePpr || []).map(item => `ppr:${item.id}`);
        const transfers = action === "close-conditional" ? (Array.isArray(body.transfers) ? body.transfers : []).map(item => ({ key: String(item?.key || "").trim(), kind: String(item?.kind || "").trim(), id: String(item?.id || "").trim(), label: String(item?.label || "Работа").trim().slice(0, 500), reason: String(item?.reason || "").trim().slice(0, 500) })).filter(item => item.key && item.reason) : [];
        if (action === "close-conditional" && (transfers.length !== expectedTransferKeys.length || expectedTransferKeys.some(key => !transfers.some(item => item.key === key)))) return { error: "month_transfers_incomplete", readiness };
        const carryoverReason = action === "close-conditional" ? "Причины указаны отдельно для каждой работы" : "";
        const carryoverTo = action === "close-conditional" ? nextMonthKey(month) : "";
        if (action === "close-conditional") {
          (readiness.groups.incompletePpr || []).forEach(openSheet => {
            const sheet = db.pprSheets?.[openSheet.id];
            const transfer = transfers.find(item => item.key === `ppr:${openSheet.id}`);
            if (sheet && transfer) Object.assign(sheet, { carryoverFrom: month, carryoverTo, carryoverReason: transfer.reason, carriedOverAt: now, carriedOverByName: actor.name });
          });
        }
        closure = {
          ...closure,
          status: action === "close-full" ? "closed" : "conditional",
          closedAt: now,
          closedById: actor.id,
          closedByName: actor.name,
          closedByRole: actor.role,
          reason,
          carryoverReason,
          carryoverTo,
          carryovers: transfers,
          snapshot: { ...readiness, factoryReliabilityScore: Number.isFinite(Number(body.factoryReliabilityScore)) ? Math.max(0, Math.min(100, Math.round(Number(body.factoryReliabilityScore)))) : null }
        };
      }
      history.unshift({ id: `month-event-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`, action, at: now, actor, reason, status: closure.status, readinessPercent: readiness.readinessPercent });
      closure.history = history.slice(0, 200);
      db.monthlyClosures[month] = closure;
      writeDb(db, { action: `month_${action.replaceAll("-", "_")}`, user: req.authUser, targetId: month, targetLabel: month, reason });
      return { closure, readiness, state: { monthlyClosures: db.monthlyClosures } };
    });
    if (result.error) { sendJson(res, result.error === "month_not_ready" || result.error === "month_already_closed" || result.error === "month_already_open" ? 409 : 400, { ok: false, ...result }); return true; }
    const stateVersion = broadcastState("month-close", "", result.state, true);
    sendJson(res, 200, { ok: true, closure: result.closure, readiness: result.readiness, state: result.state, stateVersion });
    return true;
  }



  if (pathname === "/api/auth/session" && req.method === "GET") {
    const user = authenticatedUser(req, readDb(), true);
    if (!user) {
      sendJson(res, 401, { ok: false, error: "authentication_required" });
      return true;
    }
    sendJson(res, 200, { ok: true, user: userPublic(user) });
    return true;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const token = parseCookies(req).ppr_session;
    if (token) {
      const tokenHash = sessionTokenHash(token);
      await enqueueStateWrite(async () => {
        const db = readDb();
        db.authSessions = (db.authSessions || []).filter(item => item.tokenHash !== tokenHash);
        writeDb(db, { action: "user_logout" });
        return {};
      });
    }
    sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
    return true;
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    const body = await readBody(req);
    const name = String(body.name || "").trim();
    const employeeId = String(body.employeeId || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const language = ["ru", "kk", "uz"].includes(String(body.language || "")) ? String(body.language) : "ru";
    if (name.length < 3 || employeeId.length < 2 || phone.length < 5 || password.length < 6) {
      sendJson(res, 400, { ok: false, error: "Заполните ФИО, табельный номер, телефон и пароль не короче 6 символов." });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const duplicate = (db.users || []).find(user =>
        normalizeIdentifier(user.employeeId) === normalizeIdentifier(employeeId) ||
        normalizeIdentifier(user.phone) === normalizeIdentifier(phone)
      );
      if (duplicate) return { duplicate: true };
      const user = {
        id: `user:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`,
        name,
        employeeId,
        phone,
        passwordHash: hashPassword(password),
        role: "",
        area: "",
        language,
        approved: false,
        pendingApproval: true,
        status: "pending",
        registeredAt: new Date().toISOString()
      };
      db.users.push(user);
      writeDb(db, { action: "user_register_pending", user: { name, employeeId, phone } });
      const sessionToken = createAuthSession(db, user, req);
      return { user: userPublic(user), sessionToken };
    });
    if (result.duplicate) {
      sendJson(res, 409, { ok: false, error: "Такой табельный номер или телефон уже зарегистрирован." });
      return true;
    }
    sendJson(res, 200, { ok: true, user: result.user }, { "Set-Cookie": sessionCookie(result.sessionToken) });
    broadcastState("auth-register", "", {}, true);
    return true;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    const rate = loginRateStatus(req, body.identifier);
    if (rate.blocked) {
      sendJson(res, 429, { ok: false, error: "Слишком много попыток входа. Попробуйте позже.", retryAfterSeconds: rate.retryAfterSeconds }, {
        "Retry-After": String(rate.retryAfterSeconds)
      });
      return true;
    }
    const db = readDb();
    const user = findUser(db, body.identifier);
    const bootstrapPassword = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || "");
    const legacyAdminLogin = Boolean(
      bootstrapPassword &&
      user &&
      !user.passwordHash &&
      ["editor", "director"].includes(user.role) &&
      String(body.password) === bootstrapPassword
    );
    if (user && !user.passwordHash && !["editor", "director"].includes(user.role)) {
      sendJson(res, 428, { ok: false, error: "Админ должен сначала задать вам новый пароль." });
      return true;
    }
    if (!user || (!legacyAdminLogin && !passwordMatches(body.password, user.passwordHash))) {
      recordLoginFailure(rate.key);
      sendJson(res, 401, { ok: false, error: "Неверный табельный номер, телефон или пароль." });
      return true;
    }
    if (user.accessDisabled === true) {
      sendJson(res, 403, { ok: false, error: "Доступ к учётной записи временно отключён администратором." });
      return true;
    }
    if (user.approved === false || user.pendingApproval === true || !user.role) {
      sendJson(res, 403, { ok: false, error: "Регистрация ещё не подтверждена админом.", pending: true });
      return true;
    }
    if (legacyAdminLogin) {
      user.passwordHash = hashPassword(body.password);
    }
    loginAttempts.delete(rate.key);
    user.lastLoginAt = new Date().toISOString();
    const sessionToken = createAuthSession(db, user, req);
    writeDb(db, { action: legacyAdminLogin ? "legacy_admin_password_created" : "user_login", user: { name: user.name, phone: user.phone } });
    sendJson(res, 200, { ok: true, user: userPublic(user) }, { "Set-Cookie": sessionCookie(sessionToken) });
    return true;
  }

  if (pathname === "/api/export/month" && req.method === "GET") {
    const month = monthKeyFromUrl(url);
    await stateWriteQueue.catch(() => {});
    createManualBackup(`export_${month}`);
    sendDownload(res, `ppr_export_${month}.json`, monthlyExport(readDb(), month));
    return true;
  }

  if (pathname === "/api/export/month.csv" && req.method === "GET") {
    const month = monthKeyFromUrl(url);
    await stateWriteQueue.catch(() => {});
    createManualBackup(`export_csv_${month}`);
    sendCsvDownload(res, `ppr_export_${month}.csv`, monthlyCsvRows(readDb(), month));
    return true;
  }

  if (pathname === "/api/export/month.xls" && req.method === "GET") {
    const month = monthKeyFromUrl(url);
    await stateWriteQueue.catch(() => {});
    createManualBackup(`export_excel_${month}`);
    sendExcelDownload(res, `PPR_otchet_${month}.xls`, monthlyCsvRows(readDb(), month));
    return true;
  }

  if (pathname === "/api/export/all" && req.method === "GET") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    await stateWriteQueue.catch(() => {});
    createManualBackup("export_all");
    const db = readDb();
    const { authSessions: ignoredAuthSessions, ...exportedDb } = db;
    sendDownload(res, `ppr_full_export_${todayStamp()}.json`, {
      exportedAt: new Date().toISOString(),
      ...exportedDb,
      users: (db.users || []).map(userPublic)
    });
    return true;
  }

  if (pathname === "/api/work-permits/claim-number" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    const requestId = String(body?.requestId || "").trim();
    if (!/^output-[A-Za-z0-9-]{8,150}$/.test(requestId)) {
      sendJson(res, 400, { ok: false, error: "invalid_request_id" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      if (!db.workPermitNumberClaims || typeof db.workPermitNumberClaims !== "object") {
        db.workPermitNumberClaims = {};
      }
      const previous = Number(db.workPermitNumberClaims[requestId]?.number || 0);
      if (Number.isSafeInteger(previous) && previous > 0) return previous;
      const current = Number(db.workPermitLastNumber || 0);
      const nextNumber = Number.isSafeInteger(current) && current >= 0
        ? current + 1
        : 1;
      db.workPermitLastNumber = nextNumber;
      db.workPermitNumberClaims[requestId] = {
        number: nextNumber,
        claimedAt: new Date().toISOString(),
        userId: String(req.authUser?.id || "")
      };
      const claimEntries = Object.entries(db.workPermitNumberClaims);
      if (claimEntries.length > 2000) {
        claimEntries
          .sort((a, b) => String(a[1]?.claimedAt || "").localeCompare(String(b[1]?.claimedAt || "")))
          .slice(0, claimEntries.length - 2000)
          .forEach(([id]) => delete db.workPermitNumberClaims[id]);
      }
      writeDb(db, {
        action: "work_permit_number_claimed",
        user: req.authUser,
        number: nextNumber,
        requestId
      });
      return nextNumber;
    });
    sendJson(res, 200, {
      ok: true,
      number: String(result).padStart(4, "0")
    });
    return true;
  }

  if (await handleAdminDashboardRoute(req, res, pathname, url)) return true;

  if (await handleAdminNotificationsRoute(req, res, pathname)) return true;

  if (await handleAdminSystemReportRoute(req, res, pathname, url)) return true;

  if (await handleAdminUserAccessRoute(req, res, pathname)) return true;

  if (await handleAdminUserSessionsRoute(req, res, pathname)) return true;

  if (await handleAdminUserPermissionsRoute(req, res, pathname)) return true;

  if (await handleAdminAutomationRoute(req, res, pathname)) return true;

  if (await handleAdminConfigPackageRoute(req, res, pathname)) return true;

  if (await handleAdminArchivesRoute(req, res, pathname, url)) return true;

  if (await handleAdminActivityRoute(req, res, pathname)) return true;

  if (await handleAdminIntegrityRoute(req, res, pathname)) return true;

  if (await handleAdminBackupsRoute(req, res, pathname)) return true;

  if (await handleAdminSettingsRoute(req, res, pathname)) return true;

  if (await handleAdminMonitoringRoute(req, res, pathname)) return true;

  if (await handleAdminMaintenanceRoute(req, res, pathname)) return true;

  if (pathname === "/api/work-permit-instructions" && req.method === "GET") {
    const db = readDb();
    const actorKey = attendanceUserKey(req.authUser || {});
    const actorId = String(req.authUser?.id || req.authUser?.employeeId || req.authUser?.phone || "");
    const isAdmin = req.authUser?.role === "editor";
    const records = Object.entries(db.workPermitInstructions || {}).map(([id, raw]) => ({
      id,
      title: String(raw?.title || ""),
      content: String(raw?.content || ""),
      fileName: String(raw?.fileName || ""),
      editorIds: isAdmin ? (Array.isArray(raw?.editorIds) ? raw.editorIds : []) : undefined,
      canEdit: isAdmin || activeUserPermission(req.authUser, "instructionEdit") || (Array.isArray(raw?.editorIds) && raw.editorIds.includes(actorKey)),
      updatedAt: String(raw?.updatedAt || ""),
      updatedBy: String(raw?.updatedBy || "")
    }));
    const acknowledgedIds = [...new Set((db.workPermitInstructionAcknowledgements || [])
      .filter(item => String(item?.actorId || "") === actorId)
      .filter(item => String(item?.instructionUpdatedAt || "") === String(db.workPermitInstructions?.[item.instructionId]?.updatedAt || ""))
      .map(item => String(item?.instructionId || ""))
      .filter(Boolean))];
    sendJson(res, 200, { ok: true, isAdmin, records, acknowledgedIds, settings: { companyName: normalizedAdminConfig(db.adminConfig).companyName, formPolicies: normalizedAdminConfig(db.adminConfig).formPolicies } });
    return true;
  }

  if (pathname === "/api/work-permit-instructions/acknowledge" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    const instructionId = String(body?.instructionId || "").trim().slice(0, 80);
    if (!instructionId) { sendJson(res, 400, { ok: false, error: "instruction_required" }); return true; }
    const db = readDb();
    const stored = db.workPermitInstructions?.[instructionId] || {};
    const at = new Date().toISOString();
    const actorId = String(req.authUser?.id || req.authUser?.employeeId || req.authUser?.phone || "");
    const record = {
      id: `instruction-ack-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      instructionId,
      instructionTitle: String(body?.instructionTitle || stored.title || instructionId).trim().slice(0, 300),
      instructionUpdatedAt: String(stored.updatedAt || ""),
      actorId,
      actorName: String(req.authUser?.name || "Сотрудник").slice(0, 300),
      employeeId: String(req.authUser?.employeeId || "").slice(0, 100),
      role: String(req.authUser?.role || "").slice(0, 80),
      acknowledgedAt: at
    };
    db.workPermitInstructionAcknowledgements ||= [];
    const duplicate = db.workPermitInstructionAcknowledgements.find(item => item.actorId === actorId && item.instructionId === instructionId && item.instructionUpdatedAt === record.instructionUpdatedAt);
    if (!duplicate) db.workPermitInstructionAcknowledgements.unshift(record);
    db.workPermitInstructionAcknowledgements = db.workPermitInstructionAcknowledgements.slice(0, 10000);
    writeDb(db, { action: "work_permit_instruction_acknowledged", user: req.authUser, instructionId });
    sendJson(res, 200, { ok: true, record: duplicate || record, duplicate: Boolean(duplicate) });
    return true;
  }

  const instructionMatch = pathname.match(/^\/api\/work-permit-instructions\/([a-z0-9_-]+)$/i);
  if (instructionMatch && req.method === "PUT") {
    const body = await readBody(req);
    const instructionId = instructionMatch[1].slice(0, 80);
    const db = readDb();
    db.workPermitInstructions ||= {};
    const existing = db.workPermitInstructions[instructionId] || {};
    const actorKey = attendanceUserKey(req.authUser || {});
    const isAdmin = req.authUser?.role === "editor";
    const canEdit = isAdmin || activeUserPermission(req.authUser, "instructionEdit") || (Array.isArray(existing.editorIds) && existing.editorIds.includes(actorKey));
    if (!canEdit) {
      sendJson(res, 403, { ok: false, error: "permission_denied" });
      return true;
    }
    const record = {
      ...existing,
      title: String(body?.title || existing.title || "").trim().slice(0, 300),
      content: String(body?.content || "").trim().slice(0, 200000),
      fileName: String(body?.fileName || "").trim().slice(0, 300),
      updatedAt: new Date().toISOString(),
      updatedBy: String(req.authUser?.name || "")
    };
    if (isAdmin && Array.isArray(body?.editorIds)) {
      record.editorIds = [...new Set(body.editorIds.map(value => String(value || "").trim()).filter(Boolean))].slice(0, 500);
    } else {
      record.editorIds = Array.isArray(existing.editorIds) ? existing.editorIds : [];
    }
    db.workPermitInstructions[instructionId] = record;
    writeDb(db, { action: "work_permit_instruction_saved", user: req.authUser, instructionId });
    sendJson(res, 200, { ok: true, record: { id: instructionId, ...record, canEdit: true } });
    return true;
  }

  if (pathname === "/api/state" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    const db = readDb();
    if (externalizePhotosInValue(db)) writeDb(db, { action: "externalize_photos_get" });
    sendPublicState(res, db);
    return true;
  }

  if (pathname === "/api/photos" && req.method === "POST") {
    const body = await readBody(req);
    const url = savePhotoDataUrl(body?.data || "");
    if (!url) {
      sendJson(res, 400, { ok: false, error: "Bad photo" });
      return true;
    }
    if (postgresPool) await postgresPhotoWriteQueue;
    sendJson(res, 200, { ok: true, url });
    return true;
  }

  if (pathname.startsWith("/api/photos/") && req.method === "GET") {
    const fileName = path.basename(decodeURIComponent(pathname.slice("/api/photos/".length)));
    if (!/^[a-f0-9]{40}\.(jpg|jpeg|png|webp|pdf)$/i.test(fileName)) {
      res.writeHead(404);
      res.end("Not found");
      return true;
    }
    const file = path.join(photosDir, fileName);
    let data = null;
    let mimeType = contentTypes[path.extname(file).toLowerCase()] || "application/octet-stream";
    try {
      data = await fs.promises.readFile(file);
    } catch {
      if (postgresPool) {
        try {
          const stored = await postgresPool.query(
            "SELECT mime_type, payload FROM ppr_photos WHERE file_name = $1 LIMIT 1",
            [fileName]
          );
          if (stored.rows[0]?.payload) {
            data = Buffer.from(stored.rows[0].payload);
            mimeType = String(stored.rows[0].mime_type || mimeType);
            fs.mkdirSync(photosDir, { recursive: true });
            fs.promises.writeFile(file, data).catch(() => {});
          }
        } catch (error) {
          console.error(`PostgreSQL photo read failed: ${error.message}`);
        }
      }
    }
    if (!data) {
      res.writeHead(404);
      res.end("Not found");
      return true;
    }
    res.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Length": data.length,
      "Cache-Control": "public, max-age=31536000, immutable"
    });
    res.end(data);
    return true;
  }

  if (pathname === "/api/translate" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    const target = String(body.target || "ru").trim();
    const texts = Array.isArray(body.texts) ? body.texts : [];
    const translations = await translateTexts(texts, target);
    sendJson(res, 200, { ok: true, target: target === "uz" ? "uz" : target, translations });
    return true;
  }

  if (pathname === "/api/price-lookup" && req.method === "POST") {
    const body = await readBody(req).catch(() => ({}));
    try {
      const result = await lookupInternetPrice(body.name || "");
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 200, { ok: false, reason: "lookup_error" });
    }
    return true;
  }

  if (pathname === "/api/state" && req.method === "PUT") {
    const body = await readBody(req);
    if (Object.prototype.hasOwnProperty.call(body, "annualPpr")) {
      const annualPprAllowed = req.authUser?.role === "editor"
        || (req.authUser?.role === "engineer" && activeUserPermission(req.authUser, "annualPprEdit"));
      if (!annualPprAllowed) {
        sendJson(res, 403, { error: "annual_ppr_permission_denied" });
        return true;
      }
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const beforeState = JSON.stringify(publicState(db));
      const beforeRemarkKeys = openRemarkKeysServer(db);
      const authenticatedRole = String(req.authUser?.role || "");
      const catalogRole = permissionBaseRoleServer(authenticatedRole);
      const authenticatedArea = String(req.authUser?.area || "").trim();
      db.catalog ||= { equipment: {} };
      db.catalog.equipment ||= {};
      const incomingCatalog = {};
      if (["editor", "engineer", "shop"].includes(catalogRole) && body.catalog?.equipment) {
        Object.entries(body.catalog.equipment).forEach(([equipmentId, rawItem]) => {
          if (!rawItem || typeof rawItem !== "object") return;
          if (REMOVED_EQUIPMENT_IDS.has(String(equipmentId))) return;
          const currentItem = db.catalog.equipment[equipmentId] || {};
          const equipmentArea = String(currentItem.area || rawItem.area || "").trim();
          const requestedArea = String(rawItem.area || currentItem.area || "").trim().slice(0, 200);
          if (catalogRole === "shop" && (!authenticatedArea || equipmentArea !== authenticatedArea)) return;
          const hasEditingPermissionField = Object.prototype.hasOwnProperty.call(rawItem, "editingEnabled");
          const currentUpdatedAt = Date.parse(currentItem.updatedAt || "");
          const incomingUpdatedAt = Date.parse(rawItem.updatedAt || "");
          if (Number.isFinite(currentUpdatedAt) && (!Number.isFinite(incomingUpdatedAt) || incomingUpdatedAt < currentUpdatedAt)) return;
          const requestedEditingEnabled = rawItem.editingEnabled === true;
          const editingEnabled = currentItem.editingEnabled === true;
          if (catalogRole !== "editor" && !editingEnabled) return;
          const item = { ...currentItem };
          if (String(rawItem.name || "").trim()) item.name = String(rawItem.name).trim().slice(0, 200);
          if (Array.isArray(rawItem.nodes)) {
            const currentNodes = Array.isArray(currentItem.nodes) ? currentItem.nodes : [];
            const removed = new Set((currentItem.removedNodes || []).map(entry => normalizedCatalogNodeName(entry?.name)).filter(Boolean));
            const requestedNodes = rawItem.nodes
              .map(value => String(value || "").trim().slice(0, 200))
              .filter(value => value && !removed.has(normalizedCatalogNodeName(value)))
              .slice(0, 200);
            if (requestedNodes.length < currentNodes.length) {
              const requestedNames = new Set(requestedNodes.map(normalizedCatalogNodeName));
              currentNodes.forEach(oldName => {
                if (!requestedNames.has(normalizedCatalogNodeName(oldName))) {
                  catalogNodeTombstone(item, oldName, { at: rawItem.updatedAt, by: req.authUser?.name });
                }
              });
            } else if (requestedNodes.length === currentNodes.length) {
              currentNodes.forEach((oldName, index) => {
                const nextName = requestedNodes[index];
                if (nextName && normalizedCatalogNodeName(oldName) !== normalizedCatalogNodeName(nextName)) {
                  catalogNodeTombstone(item, oldName, { at: rawItem.updatedAt, by: req.authUser?.name });
                }
              });
            }
            item.nodes = requestedNodes;
          }
          if (rawItem.reminders && typeof rawItem.reminders === "object") {
            item.reminders = {};
            Object.entries(rawItem.reminders).forEach(([nodeIndex, lines]) => {
              if (!Array.isArray(lines)) return;
              item.reminders[nodeIndex] = lines.map(value => String(value || "").trim().slice(0, 1000)).filter(Boolean).slice(0, 100);
            });
          }
          if (rawItem.reminderMeta && typeof rawItem.reminderMeta === "object") {
            item.reminderMeta = {};
            Object.entries(rawItem.reminderMeta).forEach(([nodeIndex, meta]) => {
              if (!meta || typeof meta !== "object") return;
              item.reminderMeta[nodeIndex] = {
                mode: meta.mode === "auto" ? "auto" : "manual",
                generatedFor: String(meta.generatedFor || "").trim().slice(0, 400),
                stale: meta.stale === true,
                updatedAt: String(meta.updatedAt || "").slice(0, 50),
                updatedBy: String(meta.updatedBy || "").trim().slice(0, 200)
              };
            });
          }
          if (catalogRole === "editor" && Array.isArray(rawItem.operationalPauses)) {
            item.operationalPauses = rawItem.operationalPauses.slice(-100).map(pause => ({
              startedAt: String(pause?.startedAt || "").slice(0, 50),
              endedAt: String(pause?.endedAt || "").slice(0, 50),
              reason: String(pause?.reason || "").trim().slice(0, 1000),
              changedBy: String(pause?.changedBy || "").trim().slice(0, 200),
              endedBy: String(pause?.endedBy || "").trim().slice(0, 200)
            })).filter(pause => pause.startedAt);
          }
          if (catalogRole === "editor" && rawItem.nodeOperationalPauses && typeof rawItem.nodeOperationalPauses === "object") {
            item.nodeOperationalPauses = {};
            Object.entries(rawItem.nodeOperationalPauses).forEach(([nodeIndex, pauses]) => {
              if (!Array.isArray(pauses)) return;
              item.nodeOperationalPauses[nodeIndex] = pauses.slice(-100).map(pause => ({
                startedAt: String(pause?.startedAt || "").slice(0, 50),
                endedAt: String(pause?.endedAt || "").slice(0, 50),
                reason: String(pause?.reason || "").trim().slice(0, 1000),
                changedBy: String(pause?.changedBy || "").trim().slice(0, 200),
                endedBy: String(pause?.endedBy || "").trim().slice(0, 200)
              })).filter(pause => pause.startedAt);
            });
          }
          if (requestedArea) item.area = requestedArea;
          if (catalogRole === "editor" && hasEditingPermissionField) {
            item.editingEnabled = requestedEditingEnabled;
            item.editingEnabledAt = String(
              rawItem.editingEnabledAt || currentItem.editingEnabledAt || ""
            ).slice(0, 50);
            item.editingEnabledBy = String(
              rawItem.editingEnabledBy || currentItem.editingEnabledBy || ""
            ).trim().slice(0, 200);
          }
          item.updatedAt = String(rawItem.updatedAt || new Date().toISOString());
          incomingCatalog[equipmentId] = item;
        });
      }
      const mergedCatalog = mergeObjectRecords(db.catalog.equipment, incomingCatalog);
      if (body.clearRecordedData === true && authenticatedRole !== "editor") {
        return { actionId: String(body.actionId || ""), origin: body.clientId || "api", error: "admin_required" };
      }
      if (body.clearRecordedData === true) {
        if (String(body.clearConfirm || "").trim().toUpperCase() !== "ОЧИСТИТЬ") {
          return { actionId: String(body.actionId || ""), origin: body.clientId || "api", error: "clear_requires_confirmation" };
        }
        db.checks = {};
        db.requests = Object.fromEntries(Object.entries(db.requests || {}).filter(([, req]) =>
          req && (
            String(req.id || "").startsWith("stock-issue:")
            || String(req.id || "").startsWith("warehouse-ask:")
            || String(req.id || "").startsWith("manual-warehouse:")
            || req.kind === "stock"
            || req.route === "stock"
            || req.warehouseAsk
            || req.transferredToWarehouse
            || req.warehouseReceived
            || req.issued
            || req.stock
            || req.stockOut
            || req.inventoryId
            || Number(req.inventoryAddedQty || 0) > 0
          )
        ));
        // Inventory and warehouse-linked requests are financial/stock records,
        // so an operational reset must never erase them.
        db.serviceCosts = [];
        db.downtimes = [];
        db.compressorJournal = {};
        db.gasJournal = {};
        db.weldingJournal = {};
        db.turningJournal = {};
        db.pprSheets = {};
        db.journalDueSince = {};
        db.auditHistory = [];
        db.systemBroadcasts = [];
        db.operationalResetAt = new Date().toISOString();
      }
      const operationalFields = [
        "checks", "requests", "serviceCosts", "downtimes",
        "compressorJournal", "gasJournal", "gpmJournal", "weldingJournal", "turningJournal", "pprSheets", "annualPpr", "journalDueSince", "auditHistory", "systemBroadcasts",
        "walkShiftCleanupVersion"
      ];
      const hasOperationalPayload = operationalFields.some(field => Object.prototype.hasOwnProperty.call(body, field));
      const clientOperationalResetAt = String(body.baseOperationalResetAt ?? body.operationalResetAt ?? "");
      const acceptOperational = body.clearRecordedData === true
        || !db.operationalResetAt
        || clientOperationalResetAt === String(db.operationalResetAt);
      if (hasOperationalPayload && !acceptOperational) {
        return {
          actionId: String(body.actionId || ""),
          origin: body.clientId || "api",
          error: "state_reset_mismatch",
          operationalResetAt: String(db.operationalResetAt || "")
        };
      }
      if (acceptOperational && body.walkShiftCleanupVersion) clearLegacyWalkCompletionsServer(db);
      if (acceptOperational) {
        db.checks = compactCheckRecords(mergeCheckRecordsByFreshness(db.checks, body.checks));
        if (body.walkShiftCleanupVersion) db.checks = compactCheckRecordsServer(db.checks);
        db.requests = TMC_REQUESTS_DISABLED ? {} : mergeObjectRecordsByFreshness(db.requests, body.requests);
        removeJournalRequestsServer(db);
      }
      db.inventory = mergeInventoryRecordsByFreshness(db.inventory, body.inventory);
      db.catalog.equipment = mergedCatalog;
      if (acceptOperational) {
        db.serviceCosts = mergeArrayById(db.serviceCosts, body.serviceCosts);
        db.downtimes = mergeArrayById(db.downtimes, body.downtimes);
        db.compressorJournal = mergeObjectRecordsByFreshness(db.compressorJournal, body.compressorJournal);
        db.gasJournal = mergeObjectRecordsByFreshness(db.gasJournal, body.gasJournal);
        db.gpmJournal = {
          equipment: mergeObjectRecordsByFreshness(db.gpmJournal?.equipment, body.gpmJournal?.equipment),
          inspections: mergeObjectRecordsByFreshness(db.gpmJournal?.inspections, body.gpmJournal?.inspections),
          events: mergeObjectRecordsByFreshness(db.gpmJournal?.events, body.gpmJournal?.events),
          managers: mergeObjectRecordsByFreshness(db.gpmJournal?.managers, body.gpmJournal?.managers),
          managerMigrationVersion: db.gpmJournal?.managerMigrationVersion || body.gpmJournal?.managerMigrationVersion || ""
        };
        db.weldingJournal = mergeObjectRecordsByFreshness(db.weldingJournal, body.weldingJournal);
        db.turningJournal = mergeObjectRecordsByFreshness(db.turningJournal, body.turningJournal);
        db.pprSheets = mergeObjectRecordsByFreshness(db.pprSheets, body.pprSheets);
        db.annualPpr = mergeObjectRecordsByFreshness(db.annualPpr, body.annualPpr);
        db.journalDueSince = { ...(db.journalDueSince || {}), ...(body.journalDueSince || {}) };
        db.auditHistory = mergeArrayById(db.auditHistory, body.auditHistory);
        db.systemBroadcasts = mergeArrayById(db.systemBroadcasts, body.systemBroadcasts);
      }
      db.operationalResetAt = db.operationalResetAt || String(body.operationalResetAt || "");
      db.walkShiftCleanupVersion = body.walkShiftCleanupVersion || db.walkShiftCleanupVersion || "";
      migrateLegacyDirectorApprovals(db);
      purgeRemovedEquipmentData(db);
      const actionId = String(body.actionId || "");
      const afterState = publicState(db);
      const afterRemarkKeys = openRemarkKeysServer(db);
      let newRemarkCount = 0;
      const newRemarks = [];
      afterRemarkKeys.forEach(key => {
        if (!beforeRemarkKeys.has(key)) {
          newRemarkCount += 1;
          const found = remarkEntryByKeyServer(db, key);
          if (found) newRemarks.push(found);
        }
      });
      const changed = beforeState !== JSON.stringify(afterState);
      if (changed) writeDb(db, { action: "state_put_merge", actionId, clientId: String(body.clientId || ""), user: body.user || null });
      return { actionId, changed, patch: changedStatePatch(JSON.parse(beforeState), afterState), fullState: afterState, origin: body.clientId || "api", cleared: body.clearRecordedData === true, newRemarkCount, openRemarkCount: afterRemarkKeys.size, newRemarks };
    });
    if (result.error) {
      const status = result.error === "admin_required" ? 403 : result.error === "state_reset_mismatch" ? 409 : 400;
      sendJson(res, status, {
        ok: false,
        error: result.error,
        actionId: result.actionId,
        operationalResetAt: result.operationalResetAt || ""
      });
      return true;
    }
    const stateVersion = result.changed
      ? broadcastState(result.origin, result.actionId, result.cleared ? result.fullState : result.patch, !result.cleared)
      : realtimeStateVersion();
    if (result.newRemarkCount > 0) {
      sendRemarkPushNotifications(result.newRemarkCount, result.openRemarkCount, result.origin, "/?view=remarks", "general", result.newRemarks).catch(error => {
        console.error(`Push delivery failed: ${error?.message || error}`);
      });
    }
    sendJson(res, 200, { ok: true, actionId: result.actionId, stateVersion });
    return true;
  }

  if (pathname === "/api/engineer-request/action" && req.method === "POST") {
    if (TMC_REQUESTS_DISABLED) {
      sendJson(res, 410, { ok: false, error: "request_feature_removed" });
      return true;
    }
    const body = await readBody(req);
    const action = String(body.action || "").trim();
    const requestedActor = sanitizeResolutionParticipant(body.actor || {});
    const workerRoles = new Set(["mechanic", "electrician", "operator"]);
    const engineerRoles = new Set(["engineer", "editor"]);
    if (!new Set(["submit", "edit-item", "delete-item", "merge-items", "form"]).has(action) || !requestedActor.key) {
      sendJson(res, 400, { ok: false, error: "engineer_request_invalid" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.requests ||= {};
      const registeredActor = (db.users || []).find(user => resolutionUserKeyServer(user) === requestedActor.key);
      const sessionActorKey = resolutionUserKeyServer(req.authUser || {});
      const delegatedByEditor = req.authUser?.role === "editor";
      if ((!delegatedByEditor && requestedActor.key !== sessionActorKey) || !registeredActor || registeredActor.approved === false || registeredActor.pendingApproval === true || !samePermissionRoleServer(registeredActor.role, requestedActor.role)) {
        return { error: "engineer_request_actor_invalid" };
      }
      const actor = sanitizeResolutionParticipant(registeredActor);
      const actorPermissionRole = permissionBaseRoleServer(actor.role);
      if (action === "submit" && !workerRoles.has(actorPermissionRole)) return { error: "engineer_request_worker_required" };
      if (action !== "submit" && !engineerRoles.has(actorPermissionRole)) return { error: "engineer_request_engineer_required" };
      const now = new Date().toISOString();
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date());
      const cleanItem = (item = {}) => ({
        id: String(item.id || `engineer-item:${Date.now()}:${crypto.randomBytes(5).toString("hex")}`).slice(0, 200),
        name: String(item.name || "").trim().slice(0, 500),
        article: String(item.article || "").trim().slice(0, 200),
        stockRemainder: String(item.stockRemainder || "").trim().slice(0, 100),
        unit: String(item.unit || "шт").trim().slice(0, 50) || "шт",
        requestedQty: Math.max(0, Number(item.requestedQty || 0)),
        requiredQty: Math.max(0, Number(item.requiredQty || item.requestedQty || 0)),
        note: String(item.note || "").trim().slice(0, 2000),
        photo: String(item.photo || "").length <= 12000000 ? String(item.photo || "") : "",
        sourceKey: actor.key,
        sourceRole: actor.role,
        sourceName: actor.name,
        sourcePhone: actor.phone,
        sourceEmployeeId: actor.employeeId,
        sourceArea: String(item.sourceArea || body.area || actor.area || "").slice(0, 300),
        submittedAt: now
      });
      const updateSummary = request => {
        request.items = (Array.isArray(request.items) ? request.items : []).filter(item => item && String(item.name || "").trim());
        request.text = request.items.map(item => item.name).filter(Boolean).join("; ");
        request.requestedQty = request.items.reduce((sum, item) => sum + Number(item.requiredQty || item.requestedQty || 0), 0) || 1;
        request.updatedAt = now;
      };
      let request;
      let submittedCount = 0;
      if (action === "submit") {
        const incoming = (Array.isArray(body.items) ? body.items : []).map(cleanItem).filter(item => item.name);
        if (!incoming.length) return { error: "engineer_request_items_required" };
        request = Object.values(db.requests).find(item => item && item.kind === "tmc" && item.engineerCombinedBatch
          && item.date === date && !item.deleted && !item.formedAt && !item.engineerApproved && !item.done && !item.stock);
        if (!request) {
          const id = `engineer-batch:${date}:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`;
          request = {
            id,
            date,
            kind: "tmc",
            equipmentId: 0,
            nodeIndex: 0,
            equipment: "Общая накопительная заявка",
            area: "Заявки инженеру",
            node: "",
            status: "engineer",
            route: "purchase",
            priority: "normal",
            dueDate: String(body.dueDate || "").slice(0, 10),
            sourceRole: "engineerBatch",
            sourceName: "Несколько сотрудников",
            sourceKey: "engineer-batch",
            engineerCombinedBatch: true,
            shopApproved: true,
            engineerApproved: false,
            done: false,
            stock: false,
            items: [],
            history: [],
            approvals: {},
            createdAt: now,
            updatedAt: now
          };
          db.requests[id] = request;
        }
        request.items = [...(Array.isArray(request.items) ? request.items : []), ...incoming];
        submittedCount = incoming.length;
        if (body.dueDate && (!request.dueDate || String(body.dueDate) < request.dueDate)) request.dueDate = String(body.dueDate).slice(0, 10);
        request.history = [...(Array.isArray(request.history) ? request.history : []), {
          at: now, action: "Добавлены позиции инженеру", details: incoming.map(item => item.name).join("; "), status: "engineer", role: actor.role, name: actor.name
        }];
        updateSummary(request);
      } else {
        const requestId = String(body.requestId || "").trim();
        request = db.requests[requestId];
        if (!request || request.deleted || request.kind !== "tmc" || !request.engineerCombinedBatch) return { error: "engineer_request_not_found" };
        if (request.formedAt || request.engineerApproved) return { error: "engineer_request_locked" };
        request.items = Array.isArray(request.items) ? request.items : [];
        request.items.forEach(item => { item.id ||= `engineer-item:${Date.now()}:${crypto.randomBytes(5).toString("hex")}`; });
        if (action === "edit-item") {
          const itemId = String(body.itemId || "").trim();
          const itemIndex = Number(body.itemIndex);
          const item = request.items.find(entry => String(entry?.id || "") === itemId)
            || (Number.isInteger(itemIndex) ? request.items[itemIndex] : null);
          if (!item) return { error: "engineer_request_item_not_found" };
          const editable = body.item || {};
          item.name = String(editable.name || "").trim().slice(0, 500);
          item.article = String(editable.article || "").trim().slice(0, 200);
          item.stockRemainder = String(editable.stockRemainder || "").trim().slice(0, 100);
          item.unit = String(editable.unit || "шт").trim().slice(0, 50) || "шт";
          item.requestedQty = Math.max(0, Number(editable.requestedQty || 0));
          item.requiredQty = Math.max(0, Number(editable.requiredQty || editable.requestedQty || 0));
          item.note = String(editable.note || "").trim().slice(0, 2000);
          item.engineerEditedAt = now;
          item.engineerEditedBy = actor.name;
        }
        if (action === "delete-item") {
          const itemId = String(body.itemId || "").trim();
          const reason = String(body.reason || "").trim().slice(0, 1000);
          const requestedIndex = Number(body.itemIndex);
          const indexById = request.items.findIndex(entry => String(entry?.id || "") === itemId);
          const index = indexById >= 0 ? indexById : Number.isInteger(requestedIndex) ? requestedIndex : -1;
          if (index < 0) return { error: "engineer_request_item_not_found" };
          if (!reason) return { error: "engineer_request_delete_reason_required" };
          const [removed] = request.items.splice(index, 1);
          request.history = [...(Array.isArray(request.history) ? request.history : []), {
            at: now, action: "Инженер удалил позицию", details: `${removed.name}: ${reason}`, status: "engineer", role: actor.role, name: actor.name
          }];
        }
        if (action === "merge-items") {
          const grouped = new Map();
          request.items.forEach(item => {
            const key = [item.name, item.article, item.unit].map(value => String(value || "").trim().toLocaleLowerCase("ru-RU")).join("::");
            if (!grouped.has(key)) {
              grouped.set(key, { ...item, sources: [{ key: item.sourceKey, name: item.sourceName, role: item.sourceRole, at: item.submittedAt }] });
              return;
            }
            const target = grouped.get(key);
            target.sources.push({ key: item.sourceKey, name: item.sourceName, role: item.sourceRole, at: item.submittedAt });
            target.requestedQty = Number(target.requestedQty || 0) + Number(item.requestedQty || 0);
            target.requiredQty = Number(target.requiredQty || 0) + Number(item.requiredQty || item.requestedQty || 0);
            target.note = [...new Set([target.note, item.note].filter(Boolean))].join(" · ");
          });
          request.items = [...grouped.values()];
          request.history = [...(Array.isArray(request.history) ? request.history : []), { at: now, action: "Объединены одинаковые позиции", details: actor.name, status: "engineer", role: actor.role, name: actor.name }];
        }
        if (action === "form") {
          if (!request.items.length || request.items.some(item => !String(item.name || "").trim() || Number(item.requiredQty || item.requestedQty || 0) <= 0)) {
            return { error: "engineer_request_not_ready" };
          }
          request.formedAt = now;
          request.formedByName = actor.name;
          request.formedByRole = actor.role;
          request.engineerApproved = true;
          request.status = "manualFormed";
          request.requestNumber ||= `З-${date.replaceAll("-", "")}-${String(Date.now()).slice(-6)}`;
          request.history = [...(Array.isArray(request.history) ? request.history : []), { at: now, action: "Итоговая заявка сформирована", details: `${request.items.length} позиций`, status: "manualFormed", role: actor.role, name: actor.name }];
        }
        updateSummary(request);
        if (!request.items.length) {
          request.deleted = true;
          request.deletedAt = now;
        }
      }
      const actionId = String(body.actionId || "");
      writeDb(db, { action: `engineer_request_${action}`, actionId, clientId: String(body.clientId || ""), user: actor, requestId: request.id, submittedCount });
      return { actionId, origin: body.clientId || "api", patch: { requests: { [request.id]: request } }, request, submittedCount };
    });
    if (result.error) {
      const status = ["engineer_request_actor_invalid", "engineer_request_worker_required", "engineer_request_engineer_required"].includes(result.error) ? 403
        : ["engineer_request_not_found", "engineer_request_item_not_found"].includes(result.error) ? 404
          : result.error === "engineer_request_locked" ? 409 : 400;
      sendJson(res, status, { ok: false, error: result.error });
      return true;
    }
    const stateVersion = broadcastState(result.origin, result.actionId, result.patch, true);
    if (action === "submit" && result.submittedCount > 0) {
      sendEngineerRequestPushNotifications(readDb(), result.submittedCount, result.origin, result.request).catch(error => {
        console.error(`Engineer request push delivery failed: ${error?.message || error}`);
      });
    }
    sendJson(res, 200, { ok: true, actionId: result.actionId, stateVersion, state: result.patch, request: result.request, submittedCount: result.submittedCount });
    return true;
  }

  if (pathname === "/api/ppr-sheet/action" && req.method === "POST") {
    const body = await readBody(req);
    const date = String(body.date || "").trim();
    const action = String(body.action || "").trim();
    const rowId = String(body.rowId || "").trim();
    const role = permissionBaseRoleServer(String(req.authUser?.role || ""));
    const name = String(req.authUser?.name || "").trim();
    const allowedPlan = new Set(["engineer", "editor"]);
    const allowedMark = new Set(["mechanic", "electrician", "editor"]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["mark", "add-row", "approve"].includes(action) || !name) {
      sendJson(res, 400, { ok: false, error: "ppr_action_invalid" });
      return true;
    }
    if ((action === "mark" && !allowedMark.has(role)) || (action !== "mark" && !allowedPlan.has(role))) {
      sendJson(res, 403, { ok: false, error: "ppr_action_forbidden" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      db.pprSheets ||= {};
      const sheet = db.pprSheets[date];
      if (!sheet) return { error: "ppr_sheet_not_found" };
      if (sheet.approvedAt) return { error: "ppr_sheet_locked" };
      sheet.rows = Array.isArray(sheet.rows) ? sheet.rows : [];
      const now = new Date().toISOString();
      let notifyEngineers = false;
      let clearEngineerApproval = false;
      if (action === "mark") {
        const row = sheet.rows.find(item => String(item?.id || "") === rowId);
        const mark = String(body.mark || "");
        if (!row || !String(row.work || "").trim() || !["", "done", "na"].includes(mark)) return { error: "ppr_row_invalid" };
        const resolutionComment = String(body.resolutionComment || row.resolutionComment || "").trim().slice(0, 2000);
        if (mark && !resolutionComment) return { error: "ppr_resolution_comment_required" };
        row.mark = mark;
        row.markedByName = mark ? name : "";
        row.markedByRole = mark ? role : "";
        row.markedAt = mark ? now : "";
        row.resolutionComment = mark ? resolutionComment : "";
        row.equipmentId = String(body.equipmentId || row.equipmentId || "").slice(0, 80);
        row.equipment = String(body.equipment || row.equipment || "").slice(0, 300);
        row.node = String(body.node || row.node || "").slice(0, 300);
        row.area = String(body.area || row.area || "").slice(0, 300);
        const activeRows = sheet.rows.filter(item => String(item?.work || "").trim());
        if (
          activeRows.length
          && activeRows.every(item => ["done", "na"].includes(item.mark))
          && !sheet.approvalRequestedAt
        ) {
          sheet.approvalRequestedAt = now;
          notifyEngineers = true;
        }
      } else if (action === "add-row") {
        sheet.rows.push({ id: rowId || `${date}-work-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`, work: "", mark: "" });
      } else if (action === "approve") {
        const activeRows = sheet.rows.filter(row => String(row?.work || "").trim());
        if (!activeRows.length || !activeRows.every(row => ["done", "na"].includes(row.mark))) return { error: "ppr_sheet_not_ready" };
        sheet.approvedAt = now;
        sheet.approvedByName = name;
        sheet.approvedByRole = role;
        sheet.lockedAt = now;
        clearEngineerApproval = true;
      }
      sheet.updatedAt = now;
      sheet.updatedByName = name;
      const actionId = String(body.actionId || "");
      writeDb(db, { action: `ppr_sheet_${action}`, actionId, clientId: String(body.clientId || ""), user: body.user || null, date, rowId });
      return { actionId, origin: body.clientId || "api", patch: { pprSheets: { [date]: sheet } }, notifyEngineers, clearEngineerApproval, sheet };
    });
    if (result.error) {
      const status = result.error === "ppr_sheet_locked" ? 409 : result.error === "ppr_sheet_not_found" ? 404 : 400;
      sendJson(res, status, { ok: false, error: result.error });
      return true;
    }
    const stateVersion = broadcastState(result.origin, result.actionId, result.patch, true);
    if (result.notifyEngineers) {
      sendPprApprovalPushNotifications(readDb(), result.sheet, result.origin).catch(error => {
        console.error(`PPR approval push delivery failed: ${error?.message || error}`);
      });
    }
    if (result.clearEngineerApproval) {
      clearPprApprovalPushNotifications(readDb(), result.sheet, result.origin).catch(error => {
        console.error(`PPR approval clear delivery failed: ${error?.message || error}`);
      });
    }
    sendJson(res, 200, { ok: true, actionId: result.actionId, stateVersion, state: result.patch });
    return true;
  }

  if (pathname === "/api/downtime-close" && req.method === "POST") {
    const body = await readBody(req);
    const downtimeId = String(body.downtimeId || "").trim();
    const comment = String(body.comment || "").trim().slice(0, 4000);
    const requestedActor = sanitizeResolutionParticipant(body.actor || {});
    const allowedRoles = new Set([
      "mechanic", "electrician", "welder", "turner", "forkliftDriver", "operator", "shop",
      "engineer", "safetyEngineer", "energyEngineer", "designEngineer", "mechanicalEngineer",
      "instrumentationEngineer", "editor", "productionDirector", "generalDirector"
    ]);
    if (!downtimeId || !comment || !requestedActor.key || !allowedRoles.has(requestedActor.role)) {
      sendJson(res, 400, { ok: false, error: "downtime_close_invalid" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const registeredActor = (db.users || []).find(user => resolutionUserKeyServer(user) === requestedActor.key);
      const sessionActorKey = resolutionUserKeyServer(req.authUser || {});
      const delegatedByEditor = req.authUser?.role === "editor";
      if ((!delegatedByEditor && requestedActor.key !== sessionActorKey) || !registeredActor || registeredActor.approved === false || registeredActor.pendingApproval === true || !samePermissionRoleServer(registeredActor.role, requestedActor.role)) {
        return { error: "downtime_actor_invalid" };
      }
      const actor = sanitizeResolutionParticipant(registeredActor);
      const downtime = (db.downtimes || []).find(item => item?.id === downtimeId && !item.deleted);
      if (!downtime) return { error: "downtime_not_found" };
      if (downtime.endedAt) return { error: "downtime_already_closed", downtime };
      const now = new Date().toISOString();
      downtime.endedAt = now;
      downtime.updatedAt = now;
      downtime.closeComment = comment;
      downtime.closedByName = actor.name;
      downtime.closedByRole = actor.role;
      downtime.closedByKey = actor.key;
      downtime.closedParticipants = [actor];
      const authorUser = (db.users || []).find(user =>
        String(user.name || "").trim() === String(downtime.authorName || "").trim()
        && String(user.role || "") === String(downtime.authorRole || "")
      );
      const notifyParticipants = authorUser ? [sanitizeResolutionParticipant(authorUser)] : [];
      const actionId = String(body.actionId || "");
      writeDb(db, { action: "downtime_closed", actionId, clientId: String(body.clientId || ""), user: actor, downtimeId });
      return {
        actionId,
        origin: body.clientId || "api",
        patch: { downtimes: db.downtimes || [] },
        downtime,
        notifyParticipants,
        equipment: downtime.equipment || downtime.node || "Оборудование"
      };
    });
    if (result.error) {
      const status = result.error === "downtime_not_found" ? 404 : result.error === "downtime_already_closed" ? 409 : result.error === "downtime_actor_invalid" ? 403 : 400;
      sendJson(res, status, { ok: false, error: result.error, downtime: result.downtime || null });
      return true;
    }
    const stateVersion = broadcastState(result.origin, result.actionId, result.patch, true);
    if (result.notifyParticipants.length) {
      sendDowntimePushNotifications(readDb(), "Простой закрыт", `${result.equipment}: оборудование запущено`, result.origin, result.notifyParticipants, result.downtime.id).catch(error => {
        console.error(`Downtime close push delivery failed: ${error?.message || error}`);
      });
    }
    sendJson(res, 200, { ok: true, actionId: result.actionId, stateVersion, state: result.patch, downtime: result.downtime });
    return true;
  }

  if (pathname === "/api/orders/action" && req.method === "POST") {
    const body = await readBody(req);
    const action = String(body.action || "");
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const registeredActor = (db.users || []).find(user => String(user.id || "") === String(req.authUser?.id || "")) || req.authUser;
      if (!registeredActor || registeredActor.approved === false || registeredActor.pendingApproval === true) return { error: "order_actor_invalid" };
      const actor = sanitizeResolutionParticipant(registeredActor);
      const canManage = permissionBaseRoleServer(registeredActor.role) === "editor"
        || (["engineer", "shop"].includes(engineerPermissionRoleServer(registeredActor)) && activeUserPermission(registeredActor, "orderJournalManage"));
      db.orders ||= {};
      const now = new Date().toISOString();
      let order;
      let notifyParticipants = [];
      let pushTitle = "Распоряжение обновлено";
      let pushBody = "Откройте журнал распоряжений";
      if (action === "create") {
        if (!canManage) return { error: "order_forbidden" };
        const text = String(body.text || "").trim().slice(0, 4000);
        const keys = [...new Set((Array.isArray(body.assigneeKeys) ? body.assigneeKeys : []).map(String))];
        const assignees = keys.map(key => (db.users || []).find(user => resolutionUserKeyServer(user) === key && user.approved !== false && user.pendingApproval !== true && isResolutionExecutorRoleServer(user.role))).filter(Boolean).map(sanitizeResolutionParticipant);
        if (!text || !assignees.length) return { error: "order_invalid" };
        const id = `order:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`;
        order = { id, number: String(Object.keys(db.orders).length + 1).padStart(4, "0"), text, authorKey: actor.key, authorName: actor.name, authorRole: actor.role, assignees, performers: [], status: "open", createdAt: now, updatedAt: now, events: [{ action: "created", at: now, actorKey: actor.key, name: actor.name }] };
        db.orders[id] = order;
        notifyParticipants = assignees;
        pushTitle = `Новое распоряжение № ${order.number}`;
        pushBody = text.slice(0, 140);
      } else {
        order = db.orders[String(body.orderId || "")];
        if (!order) return { error: "order_not_found" };
        const assigned = (order.assignees || []).some(user => user.key === actor.key);
        if (action === "complete") {
          if (!assigned || !["open", "returned"].includes(order.status)) return { error: "order_forbidden" };
          const comment = String(body.comment || "").trim().slice(0, 4000);
          const keys = [...new Set((Array.isArray(body.performerKeys) ? body.performerKeys : []).map(String))];
          const performers = (order.assignees || []).filter(user => keys.includes(user.key));
          if (!comment || !performers.length) return { error: "order_invalid" };
          order.performers = performers; order.completionComment = comment; order.completedAt = now; order.status = "pending"; order.returnReason = "";
          const authorUser = (db.users || []).find(user => resolutionUserKeyServer(user) === order.authorKey);
          notifyParticipants = authorUser ? [sanitizeResolutionParticipant(authorUser)] : [];
          pushTitle = `Распоряжение № ${order.number} выполнено`;
          pushBody = comment.slice(0, 140);
        } else if (["confirm-score", "confirm-no-score", "return"].includes(action)) {
          if (!canManage || (permissionBaseRoleServer(actor.role) !== "editor" && order.authorKey !== actor.key) || order.status !== "pending") return { error: "order_forbidden" };
          if (action === "return") { const reason = String(body.reason || "").trim().slice(0, 2000); if (!reason) return { error: "order_invalid" }; order.status = "returned"; order.returnReason = reason; notifyParticipants = order.assignees || []; pushTitle = `Распоряжение № ${order.number} возвращено`; pushBody = reason.slice(0, 140); }
          else { order.status = "closed"; order.withScore = action === "confirm-score"; order.pointsPerPerformer = order.withScore ? 15 : 0; order.confirmedAt = now; order.confirmedByName = actor.name; notifyParticipants = order.performers || []; pushTitle = `Распоряжение № ${order.number} принято`; pushBody = order.withScore ? "Начислено по 15 баллов каждому исполнителю" : "Закрыто без начисления баллов"; }
        } else return { error: "order_invalid" };
        order.updatedAt = now;
        order.events ||= [];
        order.events.push({ action, at: now, actorKey: actor.key, name: actor.name });
      }
      const actionId = String(body.actionId || "");
      writeDb(db, { action: `order_${action}`, actionId, clientId: String(body.clientId || ""), user: actor, orderId: order.id });
      return { order, actionId, origin: body.clientId || "api", patch: { orders: { [order.id]: order } }, notifyParticipants, pushTitle, pushBody };
    });
    if (result.error) { sendJson(res, result.error === "order_not_found" ? 404 : result.error === "order_forbidden" ? 403 : 400, { ok: false, error: result.error }); return true; }
    const stateVersion = broadcastState(result.origin, result.actionId, result.patch, true);
    if (result.notifyParticipants.length) {
      sendResolutionPushNotifications(readDb(), result.notifyParticipants, result.origin, result.pushTitle, result.pushBody, "/?view=orders", result.order.id).catch(error => {
        console.error(`Order push notification failed: ${error?.message || error}`);
      });
    }
    sendJson(res, 200, { ok: true, order: result.order, state: result.patch, stateVersion });
    return true;
  }

  if (pathname === "/api/remark-collaboration" && req.method === "POST") {
    const body = await readBody(req);
    const recordKey = String(body.key || "").trim();
    const action = String(body.action || "").trim();
    const requestedActor = sanitizeResolutionParticipant(body.actor || {});
    const allowedActions = new Set(["start", "add", "remove", "update", "resolve", "confirm", "return", "delete", "admin-close", "admin-repair-close", "admin-edit-resolved", "close-no-score", "close-with-score"]);
    const allowedRoles = new Set([
      "mechanic", "electrician", "welder", "turner", "forkliftDriver",
      "operator", "shop", "engineer", "safetyEngineer", "energyEngineer",
      "designEngineer", "mechanicalEngineer", "instrumentationEngineer",
      "editor", "productionDirector", "generalDirector", "director", "technicalDirector"
    ]);
    if (!recordKey || recordKey.includes("\uFFFD") || !allowedActions.has(action) || !requestedActor.key || !allowedRoles.has(requestedActor.role)) {
      sendJson(res, 400, { ok: false, error: "remark_collaboration_invalid" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const record = db.checks?.[recordKey];
      const item = record?.to;
      if (!item) return { error: "remark_not_open" };
      const remarkId = String(body.remarkId || "").trim();
      const remarks = ensureRemarkEntriesServer(item);
      const remark = remarks.find(entry => entry.id === remarkId);
      if (!remark || (remark.resolved && action !== "admin-edit-resolved")) return { error: "remark_not_open" };
      const registeredActor = req.authUser || (db.users || []).find(user => resolutionUserKeyServer(user) === requestedActor.key);
      if (!registeredActor || registeredActor.approved === false || registeredActor.pendingApproval === true || (!req.authUser && !samePermissionRoleServer(registeredActor.role, requestedActor.role))) {
        return { error: "remark_actor_invalid" };
      }
      const actor = sanitizeResolutionParticipant(registeredActor);
      if (
        process.env.NODE_ENV !== "test"
        && action !== "start"
        && attendanceRoleAllowed(registeredActor)
        && !activeAttendanceSession(db, registeredActor)
      ) {
        return { error: "attendance_required" };
      }
      const canCloseForEmployees = actor.role === "editor" || activeUserPermission(registeredActor, "remarkMultiClose");
      if (action === "delete") {
        if (actor.role !== "editor") return { error: "remark_delete_forbidden" };
        item.commentLog = (Array.isArray(item.commentLog) ? item.commentLog : []).filter(entry => entry?.id !== remarkId);
        syncItemRemarkSummaryServer(item);
        const now = new Date().toISOString();
        item.updatedAt = now;
        record.updatedAt = now;
        const actionId = String(body.actionId || "");
        writeDb(db, {
          action: "remark_deleted",
          actionId,
          clientId: String(body.clientId || ""),
          user: actor,
          recordKey,
          remarkId,
          remarkText: String(remark.text || "").slice(0, 500)
        });
        return {
          actionId,
          changed: true,
          origin: body.clientId || "api",
          patch: { checks: { [recordKey]: record } },
          notifyParticipants: [],
          pushTitle: "",
          pushBody: "",
          remarkId,
          recordKey
        };
      }
      if (remark.resolutionPendingConfirmation && !["confirm", "return", "admin-close", "admin-repair-close", "close-no-score", "close-with-score"].includes(action)) return { error: "remark_awaiting_confirmation" };
      if (!remark.resolutionPendingConfirmation && ["confirm", "return"].includes(action)) return { error: "remark_not_awaiting_confirmation" };
      const now = new Date().toISOString();
      const before = JSON.stringify(record);
      let participants = resolutionParticipantsServer(remark);
      let notifyParticipants = [];
      let clearParticipants = [];
      let pushTitle = "ALKZ — совместное устранение";
      let pushBody = "Обновлена общая карточка замечания";
      const actorIsParticipant = participants.some(participant => participant.key === actor.key);
      const actorPermissionRole = permissionBaseRoleServer(actor.role);
      const canManage = ["editor", "engineer", "shop"].includes(actorPermissionRole) || remark.resolutionLeadKey === actor.key;
      remark.resolutionEvents = Array.isArray(remark.resolutionEvents) ? remark.resolutionEvents : [];
      remark.resolutionUpdates = Array.isArray(remark.resolutionUpdates) ? remark.resolutionUpdates : [];
      if (!remark.authorKey) {
        const authorUser = (db.users || []).find(user => sameRemarkAuthorServer(user, remark));
        if (authorUser) {
          const author = sanitizeResolutionParticipant(authorUser);
          remark.authorKey = author.key;
          remark.authorId = author.id;
          remark.authorEmployeeId = author.employeeId;
          remark.authorPhone = author.phone;
        }
      }

      if (action === "start") {
        if (!isResolutionExecutorRoleServer(actor.role)) return { error: "remark_participant_required" };
        if (!actorIsParticipant) {
          participants.push(actor);
          remark.resolutionEvents.push({
            id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
            action: "added",
            actorKey: actor.key,
            name: actor.name,
            role: actor.role,
            targetKey: actor.key,
            targetName: actor.name,
            at: now
          });
        }
        remark.resolutionLeadKey ||= actor.key;
        remark.resolutionLeadName ||= actor.name;
        remark.resolutionStartedAt ||= now;
      }

      if (action === "add") {
        if (!canManage) return { error: "remark_participant_manage_forbidden" };
        const requestedParticipants = Array.isArray(body.participants) && body.participants.length
          ? body.participants
          : [body.participant || {}];
        if (requestedParticipants.length > 100) return { error: "remark_participant_invalid" };
        const registeredParticipants = requestedParticipants.map(requested => {
          const requestedKey = resolutionUserKeyServer(requested);
          return (db.users || []).find(user => resolutionUserKeyServer(user) === requestedKey);
        });
        if (registeredParticipants.some(user => !user || user.approved === false || user.pendingApproval === true || !isResolutionExecutorRoleServer(user.role))) {
          return { error: "remark_participant_invalid" };
        }
        const addedParticipants = [];
        registeredParticipants.map(sanitizeResolutionParticipant).forEach(participant => {
          if (participants.some(entry => entry.key === participant.key)) return;
          participants.push(participant);
          addedParticipants.push(participant);
          remark.resolutionEvents.push({
            id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
            action: "added",
            actorKey: actor.key,
            name: actor.name,
            role: actor.role,
            targetKey: participant.key,
            targetName: participant.name,
            at: now
          });
        });
        notifyParticipants = addedParticipants;
        pushTitle = addedParticipants.length > 1 ? "Вас добавили к совместному устранению" : "Вас добавили к устранению";
        pushBody = "Откройте ALKZ — работа ведётся в общей карточке замечания";
        remark.resolutionStartedAt ||= now;
      }

      if (action === "remove") {
        if (!canManage) return { error: "remark_participant_manage_forbidden" };
        const participantKey = String(body.participantKey || "").trim();
        if (!participantKey) return { error: "remark_participant_remove_forbidden" };
        const removed = participants.find(participant => participant.key === participantKey);
        participants = participants.filter(participant => participant.key !== participantKey);
        if (removed && participantKey === remark.resolutionLeadKey) {
          remark.resolutionLeadKey = participants[0]?.key || "";
          remark.resolutionLeadName = participants[0]?.name || "";
        }
        if (removed) {
          remark.resolutionEvents.push({
            id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
            action: "removed",
            actorKey: actor.key,
            name: actor.name,
            role: actor.role,
            targetKey: removed.key,
            targetName: removed.name,
            at: now
          });
        }
      }

      if (action === "update") {
        if (!actorIsParticipant) return { error: "remark_participant_required" };
        const text = String(body.text || "").trim().slice(0, 4000);
        const photo = String(body.photo || "");
        if (!text) return { error: "remark_update_text_required" };
        remark.resolutionUpdates.push({
          id: `resolution-update:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`,
          text,
          photo: photo.length <= 12000000 ? photo : "",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          at: now
        });
        notifyParticipants = participants;
        pushTitle = "Новая запись по устранению";
        pushBody = `${actor.name}: ${text.slice(0, 120)}`;
      }

      if (action === "resolve") {
        if (participants.length && (!isResolutionExecutorRoleServer(actor.role) || !actorIsParticipant)) {
          return { error: "remark_participant_required" };
        }
        const text = String(body.text || "").trim().slice(0, 4000);
        const photo = String(body.photo || "");
        const partInstalled = body.partInstalled === true;
        const partDescription = String(body.partDescription || "").trim().slice(0, 4000);
        const partPhotos = (Array.isArray(body.partPhotos) ? body.partPhotos : [])
          .map(value => String(value || ""))
          .filter(value => value.length <= 12000000)
          .slice(0, 5);
        if (!text) return { error: "remark_resolution_text_required" };
        if (partInstalled && !partDescription) return { error: "remark_part_description_required" };
        const equipmentArea = remarkEquipmentAreaServer(db, recordKey, body.equipmentArea);
        const confirmationRule = remarkConfirmationRuleServer(db, remark, equipmentArea);
        remark.resolved = false;
        remark.resolvedAt = "";
        remark.resolutionPendingConfirmation = true;
        remark.resolutionSubmittedAt = now;
        remark.resolutionSubmittedByKey = actor.key;
        remark.resolutionSubmittedByName = actor.name;
        remark.resolutionSubmittedByRole = actor.role;
        remark.resolutionSubmittedComment = text;
        remark.resolutionSubmittedPhoto = photo.length <= 12000000 ? photo : "";
        remark.resolutionPartInstalled = partInstalled;
        remark.resolutionPartDescription = partInstalled ? partDescription : "";
        remark.resolutionPartPhotos = partInstalled ? partPhotos : [];
        remark.confirmationArea = confirmationRule.area;
        remark.confirmationRequiredRole = confirmationRule.role;
        remark.confirmationRequiredKey = "";
        remark.confirmationRequiredName = "";
        remark.confirmedAt = "";
        remark.confirmedByKey = "";
        remark.confirmedByName = "";
        remark.confirmedByRole = "";
        remark.resolutionReturnedAt = "";
        remark.resolutionReturnedByKey = "";
        remark.resolutionReturnedByName = "";
        remark.resolutionReturnedByRole = "";
        remark.resolutionReturnReason = "";
        remark.resolutionEvents.push({
          id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          action: "submitted",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          recipientKeys: confirmationRule.users.map(user => user.key),
          at: now
        });
        remark.resolutionCompletedParticipants = participants;
        closeRemarkDowntimesServer(db, recordKey, remark, actor, text, now);
        notifyParticipants = confirmationRule.users;
        pushTitle = "Устранение ждёт подтверждения";
        pushBody = `${actor.name}: ${text.slice(0, 120)}`;
      }

      if (action === "close-no-score") {
        if (!canCloseForEmployees) return { error: "remark_confirmation_forbidden" };
        const reason = String(body.reason || "").trim().slice(0, 2000);
        if (!reason) return { error: "remark_resolution_text_required" };
        remark.resolved = true;
        remark.resolvedAt = now;
        remark.resolvedDurationMs = 0;
        remark.resolvedByKey = "";
        remark.resolvedByName = "";
        remark.resolvedByRole = "";
        remark.resolvedComment = reason;
        remark.resolvedPhoto = "";
        remark.closedWithoutScore = true;
        remark.closedWithoutScoreAt = now;
        remark.closedWithoutScoreByKey = actor.key;
        remark.closedWithoutScoreByName = actor.name;
        remark.closedWithoutScoreByRole = actor.role;
        remark.resolutionPendingConfirmation = false;
        remark.resolutionParticipants = [];
        remark.resolutionCompletedParticipants = [];
        remark.closedForParticipants = [];
        remark.confirmedAt = now;
        remark.confirmedByKey = actor.key;
        remark.confirmedByName = actor.name;
        remark.confirmedByRole = actor.role;
        remark.resolutionEvents.push({
          id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          action: "closed-no-score",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          reason,
          at: now
        });
        clearParticipants = participants;
        pushTitle = "Предупреждение закрыто без баллов";
        pushBody = `${actor.name}: ${reason.slice(0, 120)}`;
      }

      if (action === "close-with-score") {
        if (!canCloseForEmployees) return { error: "remark_confirmation_forbidden" };
        const reason = String(body.reason || "").trim().slice(0, 2000);
        const performerKeys = [...new Set((Array.isArray(body.performerKeys) ? body.performerKeys : [body.performerKey]).map(value => String(value || "").trim()).filter(Boolean))];
        const performerUsers = performerKeys.map(performerKey => (db.users || []).find(user => resolutionUserKeyServer(user) === performerKey && user.approved !== false && user.pendingApproval !== true && isResolutionExecutorRoleServer(user.role)));
        if (!reason) return { error: "remark_resolution_text_required" };
        if (!performerKeys.length || performerKeys.length > 100 || performerUsers.some(user => !user)) return { error: "remark_participant_invalid" };
        const performers = performerUsers.map(sanitizeResolutionParticipant);
        const performer = performers[0];
        participants = performers;
        remark.resolutionParticipants = performers;
        remark.resolutionLeadKey = performer.key;
        remark.resolutionLeadName = performer.name;
        remark.resolutionCompletedParticipants = performers;
        remark.resolved = true;
        remark.resolvedAt = now;
        remark.resolvedDurationMs = Math.max(0, Date.parse(now) - (Date.parse(remark.at || "") || Date.parse(now)));
        remark.resolvedByKey = performer.key;
        remark.resolvedByName = performer.name;
        remark.resolvedByRole = performer.role;
        remark.resolvedComment = reason;
        remark.resolvedPhoto = "";
        remark.closedWithoutScore = false;
        remark.resolutionPendingConfirmation = false;
        remark.confirmedAt = now;
        remark.confirmedByKey = actor.key;
        remark.confirmedByName = actor.name;
        remark.confirmedByRole = actor.role;
        remark.resolutionEvents.push({
          id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          action: "confirmed",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          targetKey: performer.key,
          targetName: performer.name,
          targetKeys: performers.map(entry => entry.key),
          targetNames: performers.map(entry => entry.name),
          reason,
          at: now
        });
        notifyParticipants = performers;
        pushTitle = "Устранение закрыто администратором";
        pushBody = `${performers.map(entry => entry.name).join(", ")}: ${reason.slice(0, 120)}`;
      }

      if (action === "admin-close") {
        if (actor.role !== "editor") return { error: "remark_confirmation_forbidden" };
        const legacyPerformer = !participants.length && remark.resolvedByName && isResolutionExecutorRoleServer(remark.resolvedByRole)
          ? (db.users || []).find(user =>
              isResolutionExecutorRoleServer(user.role)
              && String(user.name || "").trim().toLocaleLowerCase("ru-RU") === String(remark.resolvedByName || "").trim().toLocaleLowerCase("ru-RU")
            )
          : null;
        const performer = participants.length === 1 ? participants[0] : legacyPerformer ? sanitizeResolutionParticipant(legacyPerformer) : null;
        if (!performer || participants.length > 1 || !isResolutionExecutorRoleServer(performer.role)) {
          return { error: "remark_participant_invalid" };
        }
        const createdMs = Date.parse(remark.at || "");
        const completedAt = now;
        remark.resolved = true;
        remark.resolvedAt = completedAt;
        remark.resolvedDurationMs = Number.isFinite(createdMs) ? Math.max(0, Date.parse(completedAt) - createdMs) : 0;
        remark.resolvedByKey = performer.key;
        remark.resolvedByName = performer.name;
        remark.resolvedByRole = performer.role;
        remark.resolvedComment = remark.resolutionSubmittedComment || "Устранено; подтверждено администратором";
        remark.resolutionPendingConfirmation = false;
        remark.resolutionSubmittedAt ||= completedAt;
        remark.resolutionSubmittedByKey ||= performer.key;
        remark.resolutionSubmittedByName ||= performer.name;
        remark.resolutionSubmittedByRole ||= performer.role;
        remark.resolutionCompletedParticipants = [performer];
        remark.confirmedAt = now;
        remark.confirmedByKey = actor.key;
        remark.confirmedByName = actor.name;
        remark.confirmedByRole = actor.role;
        remark.resolutionEvents.push({
          id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          action: "confirmed",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          targetKey: performer.key,
          targetName: performer.name,
          at: now
        });
        notifyParticipants = [performer];
        pushTitle = "Устранение подтверждено";
        pushBody = `${actor.name} подтвердил устранение`;
      }

      if (action === "admin-repair-close") {
        if (actor.role !== "editor") return { error: "remark_confirmation_forbidden" };
        const performerName = String(body.performerName || "").trim().toLocaleLowerCase("ru-RU");
        const confirmerName = String(body.confirmerName || "").trim().toLocaleLowerCase("ru-RU");
        const performerMatches = (db.users || []).filter(user =>
          user.approved !== false && user.pendingApproval !== true
          && isResolutionExecutorRoleServer(user.role)
          && String(user.name || "").trim().toLocaleLowerCase("ru-RU") === performerName
        );
        const equipmentArea = remarkEquipmentAreaServer(db, recordKey, body.equipmentArea);
        const confirmerMatches = (db.users || []).filter(user =>
          user.approved !== false && user.pendingApproval !== true
          && permissionBaseRoleServer(user.role) === "shop"
          && String(user.name || "").trim().toLocaleLowerCase("ru-RU") === confirmerName
          && (!equipmentArea || String(user.area || "").trim().toLocaleLowerCase("ru-RU") === equipmentArea.trim().toLocaleLowerCase("ru-RU"))
        );
        if (performerMatches.length !== 1 || confirmerMatches.length !== 1) return { error: "remark_participant_invalid" };
        const performer = sanitizeResolutionParticipant(performerMatches[0]);
        const confirmer = sanitizeResolutionParticipant(confirmerMatches[0]);
        const createdMs = Date.parse(remark.at || "");
        participants = [performer];
        remark.resolutionParticipants = participants;
        remark.resolutionLeadKey = performer.key;
        remark.resolutionLeadName = performer.name;
        remark.resolutionCompletedParticipants = [performer];
        remark.resolved = true;
        remark.resolvedAt = now;
        remark.resolvedDurationMs = Number.isFinite(createdMs) ? Math.max(0, Date.parse(now) - createdMs) : 0;
        remark.resolvedByKey = performer.key;
        remark.resolvedByName = performer.name;
        remark.resolvedByRole = performer.role;
        remark.resolvedComment = remark.resolutionSubmittedComment || "Устранено";
        remark.resolutionPendingConfirmation = false;
        remark.resolutionSubmittedAt ||= now;
        remark.resolutionSubmittedByKey = performer.key;
        remark.resolutionSubmittedByName = performer.name;
        remark.resolutionSubmittedByRole = performer.role;
        remark.confirmedAt = now;
        remark.confirmedByKey = confirmer.key;
        remark.confirmedByName = confirmer.name;
        remark.confirmedByRole = confirmer.role;
        remark.resolutionEvents.push({
          id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          action: "confirmed",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          targetKey: performer.key,
          targetName: performer.name,
          confirmerKey: confirmer.key,
          confirmerName: confirmer.name,
          at: now
        });
        notifyParticipants = [performer];
        pushTitle = "Распределение устранения исправлено";
        pushBody = `${performer.name}: устранение подтверждено`;
      }

      if (action === "admin-edit-resolved") {
        if ((actor.role !== "editor" && !activeUserPermission(registeredActor, "aggregateJournalCorrect")) || !remark.resolved || remark.closedWithoutScore) return { error: "remark_confirmation_forbidden" };
        const defectText = String(body.defectText || "").trim().slice(0, 4000);
        const resolvedComment = String(body.resolvedComment || "").trim().slice(0, 4000);
        const correctionReason = String(body.correctionReason || "").trim().slice(0, 1000);
        const performerKey = String(body.performerKey || "").trim();
        const performerUser = (db.users || []).find(user =>
          resolutionUserKeyServer(user) === performerKey
          && user.approved !== false
          && user.pendingApproval !== true
          && isResolutionExecutorRoleServer(user.role)
        );
        if (!defectText || !resolvedComment || !correctionReason || !performerUser) return { error: "remark_participant_invalid" };
        const performer = sanitizeResolutionParticipant(performerUser);
        participants = [performer];
        const previousPerformers = resolutionParticipantsServer({
          resolutionParticipants: remark.resolutionCompletedParticipants?.length
            ? remark.resolutionCompletedParticipants
            : remark.resolutionParticipants
        });
        const previousDefectText = String(remark.correctedDefectText || "");
        const previousResolvedComment = String(remark.correctedResolvedComment || "");
        remark.correctedDefectText = defectText;
        remark.correctedResolvedComment = resolvedComment;
        remark.correctionReason = correctionReason;
        remark.resolutionParticipants = [performer];
        remark.resolutionCompletedParticipants = [performer];
        remark.resolutionLeadKey = performer.key;
        remark.resolutionLeadName = performer.name;
        remark.resolvedByKey = performer.key;
        remark.resolvedByName = performer.name;
        remark.resolvedByRole = performer.role;
        remark.commentEditHistory = Array.isArray(remark.commentEditHistory) ? remark.commentEditHistory : [];
        remark.commentEditHistory.push({
          id: `remark-edit:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          at: now,
          editorKey: actor.key,
          editorName: actor.name,
          editorRole: actor.role,
          previousDefectText,
          defectText,
          previousResolvedComment,
          resolvedComment,
          correctionReason,
          previousPerformerKeys: previousPerformers.map(entry => entry.key),
          previousPerformerNames: previousPerformers.map(entry => entry.name),
          performerKey: performer.key,
          performerName: performer.name,
          performerRole: performer.role
        });
        remark.commentEditedAt = now;
        remark.commentEditedByKey = actor.key;
        remark.commentEditedByName = actor.name;
        remark.commentEditedByRole = actor.role;
        remark.resolutionEvents.push({
          id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          action: "resolved-record-edited",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          targetKey: performer.key,
          targetName: performer.name,
          previousTargetKeys: previousPerformers.map(entry => entry.key),
          at: now
        });
        notifyParticipants = [performer];
        pushTitle = "Запись агрегатного журнала исправлена";
        pushBody = `${actor.name}: исполнитель — ${performer.name}`;
      }

      if (action === "confirm") {
        const equipmentArea = remarkEquipmentAreaServer(db, recordKey, body.equipmentArea);
        const confirmationRule = remarkConfirmationRuleServer(db, remark, equipmentArea);
        if (!actorCanConfirmRemarkServer(actor, remark, confirmationRule)) return { error: "remark_confirmation_forbidden" };
        const submittedAt = latestRemarkSubmissionAtServer(remark);
        if (!submittedAt) return { error: "remark_resolution_time_missing" };
        const createdMs = Date.parse(remark.at || "");
        const submittedMs = Date.parse(submittedAt);
        remark.resolved = true;
        remark.resolvedAt = submittedAt;
        remark.resolvedDurationMs = Number.isFinite(createdMs) && Number.isFinite(submittedMs) ? Math.max(0, submittedMs - createdMs) : 0;
        remark.resolvedByKey = remark.resolutionSubmittedByKey || "";
        remark.resolvedByName = remark.resolutionSubmittedByName || "";
        remark.resolvedByRole = remark.resolutionSubmittedByRole || "";
        remark.resolvedComment = remark.resolutionSubmittedComment || "";
        remark.resolvedPhoto = remark.resolutionSubmittedPhoto || "";
        remark.partInstalled = remark.resolutionPartInstalled === true;
        remark.partDescription = remark.partInstalled ? String(remark.resolutionPartDescription || "") : "";
        remark.partPhotos = remark.partInstalled && Array.isArray(remark.resolutionPartPhotos) ? remark.resolutionPartPhotos.slice(0, 5) : [];
        remark.resolutionPendingConfirmation = false;
        (db.downtimes || [])
          .filter(item => (remark.resolutionDowntimeIds || []).includes(item?.id))
          .forEach(item => { item.closeAwaitingConfirmation = false; });
        remark.confirmedAt = now;
        remark.confirmedByKey = actor.key;
        remark.confirmedByName = actor.name;
        remark.confirmedByRole = actor.role;
        remark.resolutionEvents.push({
          id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          action: "confirmed",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          at: now
        });
        notifyParticipants = resolutionParticipantsServer({
          resolutionParticipants: remark.resolutionCompletedParticipants?.length
            ? remark.resolutionCompletedParticipants
            : participants
        });
        if (!notifyParticipants.length && remark.resolutionSubmittedByKey) {
          const submittedUser = (db.users || []).find(user => resolutionUserKeyServer(user) === remark.resolutionSubmittedByKey);
          if (submittedUser) notifyParticipants = [sanitizeResolutionParticipant(submittedUser)];
        }
        clearParticipants = confirmationRule.users;
        pushTitle = "Устранение подтверждено";
        pushBody = `${actor.name} подтвердил устранение`;
      }

      if (action === "return") {
        const equipmentArea = remarkEquipmentAreaServer(db, recordKey, body.equipmentArea);
        const confirmationRule = remarkConfirmationRuleServer(db, remark, equipmentArea);
        if (!actorCanConfirmRemarkServer(actor, remark, confirmationRule)) return { error: "remark_confirmation_forbidden" };
        const reason = String(body.reason || "").trim().slice(0, 2000);
        if (!reason) return { error: "remark_return_reason_required" };
        remark.resolutionPendingConfirmation = false;
        remark.resolutionReturnedAt = now;
        remark.resolutionReturnedByKey = actor.key;
        remark.resolutionReturnedByName = actor.name;
        remark.resolutionReturnedByRole = actor.role;
        remark.resolutionReturnReason = reason;
        reopenRemarkDowntimesServer(db, recordKey, remark, actor, reason, now);
        const submittedUser = (db.users || []).find(user => resolutionUserKeyServer(user) === remark.resolutionSubmittedByKey);
        const noticeRecipients = submittedUser ? [sanitizeResolutionParticipant(submittedUser)] : [];
        remark.resolutionEvents.push({
          id: `resolution-event:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          action: "returned",
          actorKey: actor.key,
          name: actor.name,
          role: actor.role,
          targetKey: submittedUser ? resolutionUserKeyServer(submittedUser) : String(remark.resolutionSubmittedByKey || ""),
          targetName: submittedUser?.name || remark.resolutionSubmittedByName || "",
          targetRole: submittedUser?.role || remark.resolutionSubmittedByRole || "",
          reason,
          recipientKeys: noticeRecipients.map(user => user.key),
          at: now
        });
        notifyParticipants = noticeRecipients;
        pushTitle = "Устранение возвращено на доработку";
        pushBody = reason.slice(0, 120);
      }

      const grpGasJournalPatch = remark.resolved && ["confirm", "admin-close", "admin-repair-close", "close-with-score"].includes(action)
        ? { ...linkResolvedGrpRemarkToGasJournalServer(db, recordKey, remark, actor, now), ...linkResolvedShgrpARemarkToGasJournalServer(db, recordKey, remark, actor, now) }
        : {};
      const compressorJournalPatch = remark.resolved && ["confirm", "admin-close", "admin-repair-close", "close-with-score"].includes(action)
        ? linkResolvedCompressorRemarkToJournalServer(db, recordKey, remark, actor, now)
        : {};
      if (Object.keys(grpGasJournalPatch).length) {
        writeDb(db, {
          action: "shgrp_section_b_resolution_linked",
          user: actor,
          recordKey,
          remarkId,
          gasJournalIds: Object.keys(grpGasJournalPatch)
        });
      }
      remark.resolutionParticipants = participants;
      syncItemRemarkSummaryServer(item);
      item.updatedAt = now;
      record.updatedAt = now;
      const changed = before !== JSON.stringify(record);
      const actionId = String(body.actionId || "");
      if (changed) writeDb(db, { action: `remark_collaboration_${action}`, actionId, clientId: String(body.clientId || ""), user: actor, recordKey });
      const patch = {
        checks: { [recordKey]: record },
        ...(Object.keys(grpGasJournalPatch).length ? { gasJournal: grpGasJournalPatch } : {}),
        ...(Object.keys(compressorJournalPatch).length ? { compressorJournal: compressorJournalPatch } : {}),
        ...(action === "resolve" || action === "confirm" || action === "return"
          ? { downtimes: db.downtimes || [] }
          : {})
      };
      return {
        actionId,
        changed,
        origin: body.clientId || "api",
        patch,
        notifyParticipants,
        clearParticipants,
        pushTitle,
        pushBody,
        remarkId,
        recordKey
      };
    });
    if (result.error) {
      const status = ["remark_not_open", "remark_awaiting_confirmation", "remark_not_awaiting_confirmation", "remark_resolution_time_missing"].includes(result.error)
        ? 409
        : result.error.includes("forbidden") || result.error === "remark_participant_required" ? 403 : 400;
      sendJson(res, status, { ok: false, error: result.error, remainingMs: result.remainingMs || 0, availableAt: result.availableAt || "" });
      return true;
    }
    const stateVersion = result.changed
      ? broadcastState(result.origin, result.actionId, result.patch, true)
      : realtimeStateVersion();
    if (result.changed && result.notifyParticipants.length) {
      const remarkUrl = `/?record=${encodeURIComponent(result.recordKey)}&remark=${encodeURIComponent(result.remarkId)}`;
      sendResolutionPushNotifications(readDb(), result.notifyParticipants, result.origin, result.pushTitle, result.pushBody, remarkUrl, result.remarkId).catch(error => {
        console.error(`Resolution push delivery failed: ${error?.message || error}`);
      });
    }
    if (result.changed && result.clearParticipants?.length) {
      clearRemarkPushNotifications(readDb(), result.clearParticipants, result.origin, result.remarkId).catch(error => {
        console.error(`Remark clear push delivery failed: ${error?.message || error}`);
      });
    }
    sendJson(res, 200, { ok: true, actionId: result.actionId, changed: result.changed, stateVersion, state: result.patch });
    return true;
  }

  if (pathname === "/api/node-update" && req.method === "PUT") {
    const body = await readBody(req);
    const recordKey = String(body.key || "").trim();
    if (!recordKey || recordKey.includes("\uFFFD") || !body.record || typeof body.record !== "object") {
      sendJson(res, 400, { ok: false, error: "Bad node update" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const beforeRemarkKeys = openRemarkKeysServer(db);
      const beforeActiveDowntimeIds = new Set((db.downtimes || []).filter(item => item && !item.deleted && !item.endedAt).map(item => item.id));
      const before = JSON.stringify({ record: db.checks?.[recordKey] || null, downtimes: db.downtimes || [] });
      db.checks ||= {};
      db.checks = compactCheckRecords(mergeCheckRecordsByFreshness(db.checks, { [recordKey]: body.record }));
      db.downtimes = mergeArrayById(db.downtimes, body.downtimes);
      const patch = {
        checks: db.checks[recordKey] ? { [recordKey]: db.checks[recordKey] } : {},
        downtimes: db.downtimes || []
      };
      const changed = before !== JSON.stringify({ record: db.checks?.[recordKey] || null, downtimes: db.downtimes || [] });
      const actionId = String(body.actionId || "");
      if (changed) {
        writeDb(db, {
          action: "node_update",
          actionId,
          clientId: String(body.clientId || ""),
          user: body.user || null,
          recordKey
        });
      }
      const afterRemarkKeys = openRemarkKeysServer(db);
      let newRemarkCount = 0;
      const newRemarkKeys = [];
      const newRemarks = [];
      afterRemarkKeys.forEach(key => {
        if (!beforeRemarkKeys.has(key)) {
          newRemarkCount += 1;
          newRemarkKeys.push(key);
          const found = remarkEntryByKeyServer(db, key);
          if (found) newRemarks.push(found);
        }
      });
      const newDowntimes = (db.downtimes || []).filter(item => item && !item.deleted && !item.endedAt && !beforeActiveDowntimeIds.has(item.id));
      return { actionId, changed, origin: body.clientId || "api", patch, newRemarkCount, openRemarkCount: afterRemarkKeys.size, newRemarkKeys, newRemarks, newDowntimes };
    });
    const stateVersion = result.changed
      ? broadcastState(result.origin, result.actionId, result.patch, true)
      : realtimeStateVersion();
    if (result.newRemarkCount > 0) {
      const firstTarget = String(result.newRemarkKeys[0] || "");
      const separator = firstTarget.lastIndexOf("|");
      const targetRecord = separator >= 0 ? firstTarget.slice(0, separator) : "";
      const targetRemark = separator >= 0 ? firstTarget.slice(separator + 1) : "";
      const targetUrl = targetRecord && targetRemark
        ? `/?record=${encodeURIComponent(targetRecord)}&remark=${encodeURIComponent(targetRemark)}`
        : "/?view=remarks";
      sendRemarkPushNotifications(result.newRemarkCount, result.openRemarkCount, result.origin, targetUrl, targetRemark || "general", result.newRemarks).catch(error => {
        console.error(`Push delivery failed: ${error?.message || error}`);
      });
    }
    if (result.newDowntimes.length) {
      const item = result.newDowntimes[0];
      const title = item.type === "production" ? "Производственный простой" : "Аварийная остановка";
      const bodyText = `${item.equipment || item.node || "Оборудование"}: ${item.comment || "без причины"}`;
      sendDowntimePushNotifications(readDb(), title, bodyText, result.origin, null, item.id).catch(error => {
        console.error(`Downtime push delivery failed: ${error?.message || error}`);
      });
    }
    sendJson(res, 200, {
      ok: true,
      actionId: result.actionId,
      changed: result.changed,
      stateVersion,
      state: result.patch
    });
    return true;
  }

  if (pathname === "/api/users/role" && req.method === "POST") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req);
    const role = String(body.role || "").trim();
    const area = String(body.area || "").trim();
    const craneOnly = role === "operator" && body.craneOnly === true;
    if (!role || role === "warehouse") {
      sendJson(res, 400, { ok: false, error: "Выберите действующую должность." });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const target = (db.users || []).find(item =>
        (body.id && item.id === body.id)
        || (body.employeeId && String(item.employeeId || "") === String(body.employeeId))
        || (body.phone && String(item.phone || "") === String(body.phone))
      );
      if (!target) return { error: "user_not_found" };
      if (target.role === "editor" && role !== "editor") return { error: "editor_role_protected" };
      target.role = role;
      target.area = area;
      target.craneOnly = craneOnly;
      target.roleUpdatedAt = new Date().toISOString();
      target.roleUpdatedBy = String(req.authUser?.name || "Администратор");
      syncPushProfilesForUser(db, target);
      writeDb(db, {
        action: "user_role_update",
        actionId: String(body.actionId || ""),
        clientId: String(body.clientId || ""),
        user: { id: target.id || "", employeeId: target.employeeId || "", name: target.name || "", role, area, craneOnly }
      });
      return { user: userPublic(target) };
    });
    if (result.error) {
      const status = result.error === "user_not_found" ? 404 : 409;
      sendJson(res, status, { ok: false, error: result.error });
      return true;
    }
    sendJson(res, 200, { ok: true, user: result.user });
    return true;
  }

  if (pathname === "/api/users/password" && req.method === "POST") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req);
    const newPassword = String(body.newPassword || "");
    if (newPassword.length < 6) {
      sendJson(res, 400, { ok: false, error: "Пароль должен содержать минимум 6 символов." });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const target = (db.users || []).find(item =>
        (body.id && item.id === body.id)
        || (body.employeeId && String(item.employeeId || "") === String(body.employeeId))
        || (body.phone && String(item.phone || "") === String(body.phone))
      );
      if (!target) return { error: "user_not_found" };
      target.passwordHash = hashPassword(newPassword);
      target.passwordUpdatedAt = new Date().toISOString();
      target.passwordUpdatedBy = String(req.authUser?.name || "Администратор");
      clearLoginFailuresForUser(target);
      db.authSessions = (db.authSessions || []).filter(session => session.userId !== target.id);
      writeDb(db, {
        action: "user_password_reset",
        actionId: String(body.actionId || ""),
        clientId: String(body.clientId || ""),
        user: { id: target.id || "", employeeId: target.employeeId || "", name: target.name || "" }
      });
      return { user: userPublic(target) };
    });
    if (result.error) {
      sendJson(res, 404, { ok: false, error: result.error });
      return true;
    }
    sendJson(res, 200, { ok: true, user: result.user });
    return true;
  }

  if (pathname === "/api/users/unlock" && req.method === "POST") {
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const body = await readBody(req);
    const db = readDb();
    const target = (db.users || []).find(item =>
      (body.id && item.id === body.id)
      || (body.employeeId && normalizeIdentifier(item.employeeId) === normalizeIdentifier(body.employeeId))
      || (body.phone && normalizePhoneIdentifier(item.phone) === normalizePhoneIdentifier(body.phone))
    );
    if (!target) {
      sendJson(res, 404, { ok: false, error: "user_not_found" });
      return true;
    }
    clearLoginFailuresForUser(target);
    writeDb(db, {
      action: "user_login_unlocked",
      actionId: String(body.actionId || ""),
      clientId: String(body.clientId || ""),
      user: { id: target.id || "", employeeId: target.employeeId || "", name: target.name || "" }
    });
    sendJson(res, 200, { ok: true, user: userPublic(target) });
    return true;
  }

  if (pathname === "/api/users" && req.method === "POST") {
    const user = await readBody(req);
    if (req.authUser?.role !== "editor") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return true;
    }
    const result = await enqueueStateWrite(async () => {
      const db = readDb();
      const phone = String(user.phone || "").trim();
      const name = String(user.name || "").trim();
      const actionId = String(user.actionId || "");
      const employeeId = String(user.employeeId || "").trim();
      const sameUserForUpdate = item =>
        (user.id && item.id === user.id) ||
        (employeeId && item.employeeId === employeeId) ||
        (phone && item.phone === phone);
      const existing = (db.users || []).find(sameUserForUpdate);
      if (user.action === "delete") {
        if (!(process.env.NODE_ENV === "test" && !req.authUser?.passwordHash)
          && !passwordMatches(String(user.adminPassword || ""), String(req.authUser?.passwordHash || ""))) {
          return { actionId, origin: user.clientId || "user", error: "admin_password_invalid" };
        }
        const deleteReason = String(user.reason || "").trim().slice(0, 2000);
        if (!deleteReason) return { actionId, origin: user.clientId || "user", error: "delete_reason_required" };
        const users = db.users || [];
        let target = user.id ? users.find(item => item.id === user.id) : null;
        if (!target && employeeId) target = users.find(item => String(item.employeeId || "").trim() === employeeId);
        if (!target && phone) target = users.find(item => String(item.phone || "").trim() === phone);
        if (!target && name) {
          const sameName = users.filter(item => String(item.name || "").trim().toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU"));
          if (sameName.length === 1) target = sameName[0];
        }
        if (!target) return { actionId, origin: user.clientId || "user", error: "user_not_found" };
        if (target.role === "editor" && users.filter(item => item.role === "editor").length <= 1) {
          return { actionId, origin: user.clientId || "user", error: "last_editor_forbidden" };
        }
        const deletedAt = new Date().toISOString();
        db.adminTrash ||= [];
        db.adminTrash.unshift({
          id: `trash:user:${Date.now()}:${crypto.randomBytes(5).toString("hex")}`,
          type: "user",
          targetId: String(target.id || target.employeeId || target.phone || ""),
          label: String(target.name || target.employeeId || target.phone || "Сотрудник"),
          reason: deleteReason,
          deletedAt,
          expiresAt: new Date(Date.now() + normalizedAdminConfig(db.adminConfig).trashRetentionDays * 24 * 60 * 60 * 1000).toISOString(),
          deletedById: String(req.authUser?.id || ""),
          deletedByName: String(req.authUser?.name || "Администратор"),
          snapshot: { ...target }
        });
        db.users = users.filter(item => item !== target);
        db.authSessions = (db.authSessions || []).filter(session => session.userId !== target.id);
        writeDb(db, { action: "user_moved_to_trash", actionId, clientId: String(user.clientId || ""), user: req.authUser, targetType: "user", targetId: target.id || target.employeeId || target.phone || "", targetLabel: target.name || name, reason: deleteReason });
        return { actionId, origin: user.clientId || "user", deletedUser: { id: target.id || "", employeeId: target.employeeId || "", name: target.name || "" } };
      }
      db.users = (db.users || []).filter(item => !sameUserForUpdate(item));
      const {
        passwordHash: ignoredPasswordHash,
        newPassword: ignoredNewPassword,
        actor: ignoredActor,
        action: ignoredAction,
        actionId: ignoredActionId,
        clientId: ignoredClientId,
        ...safeUser
      } = user;
      if (existing?.role === "editor" && safeUser.role && safeUser.role !== "editor") {
        safeUser.role = "editor";
      }
      const nextUser = {
        ...(existing || {}),
        ...safeUser,
        phone,
        employeeId: employeeId || existing?.employeeId || "",
        registeredAt: existing?.registeredAt || user.registeredAt || new Date().toISOString()
      };
      if (user.newPassword) nextUser.passwordHash = hashPassword(user.newPassword);
      delete nextUser.newPassword;
      db.users.push(nextUser);
      syncPushProfilesForUser(db, nextUser);
      writeDb(db, { action: "user_register", actionId, clientId: String(user.clientId || ""), user: { name: user.name || "", role: user.role || "", phone: phone || "" } });
      return { actionId, origin: user.clientId || "user" };
    });
    if (result.error) {
      const status = result.error === "user_not_found" ? 404 : result.error === "last_editor_forbidden" ? 409 : 400;
      sendJson(res, status, { ok: false, error: result.error, actionId: result.actionId });
      return true;
    }
    sendJson(res, 200, { ok: true, actionId: result.actionId });
    broadcastState(result.origin, result.actionId, {}, true);
    return true;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    await stateWriteQueue.catch(() => {});
    if (req.authUser?.approved === false || req.authUser?.pendingApproval === true || !req.authUser?.role) {
      sendJson(res, 200, [userPublic(req.authUser)]);
      return true;
    }
    const db = readDb();
    sendJson(res, 200, (db.users || []).map(user => ({
      ...userPublic(user),
      ...(req.authUser?.role === "editor" ? { loginDiagnostics: userLoginDiagnostics(db, user) } : {})
    })));
    return true;
  }

  return false;
}

function serveStatic(req, res, pathname) {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const legacyRefreshRequest = pathname === "/" && requestUrl.searchParams.has("refresh");
  const cleanPath = legacyRefreshRequest ? "update.html" : pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(root, cleanPath);
  const relative = path.relative(root, file);
  const isInsideRoot = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  const isDataFile = relative.split(path.sep).includes("data");
  if (!isInsideRoot || isDataFile || !isPublicStaticPath(relative)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const extension = path.extname(file).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";
    const versioned = Boolean(requestUrl.searchParams.get("v"));
    const cacheControl = pathname === "/" || extension === ".html"
      ? cleanPath === "update.html" ? "no-store" : "no-cache"
      : versioned
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600";
    const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(String(req.headers["accept-encoding"] || ""));
    const compressible = [".html", ".js", ".css", ".json", ".svg", ".webmanifest"].includes(extension);
    if (acceptsGzip && compressible && data.length >= 1024) {
      const compressed = zlib.gzipSync(data, { level: zlib.constants.Z_BEST_SPEED });
      res.writeHead(200, {
        ...securityHeaders(req),
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "Content-Encoding": "gzip",
        "Content-Length": compressed.length,
        "Vary": "Accept-Encoding"
      });
      res.end(compressed);
      return;
    }
    res.writeHead(200, {
      ...securityHeaders(req),
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "Content-Length": data.length,
      "Vary": "Accept-Encoding"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  monitorRequest(req, res);
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname, url)) return;
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

const qrServer = http.createServer(async (req, res) => {
  monitorRequest(req, res);
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname, url)) return;
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

function createHttpsServer() {
  const pfxFile = process.env.HTTPS_PFX_FILE || "";
  const certFile = process.env.HTTPS_CERT_FILE || "";
  const keyFile = process.env.HTTPS_KEY_FILE || "";
  try {
    let options = null;
    if (pfxFile && fs.existsSync(path.resolve(root, pfxFile))) {
      options = {
        pfx: fs.readFileSync(path.resolve(root, pfxFile)),
        passphrase: process.env.HTTPS_PFX_PASS || ""
      };
    } else if (certFile && keyFile && fs.existsSync(path.resolve(root, certFile)) && fs.existsSync(path.resolve(root, keyFile))) {
      options = {
        cert: fs.readFileSync(path.resolve(root, certFile)),
        key: fs.readFileSync(path.resolve(root, keyFile))
      };
    }
    if (!options) return null;
    return https.createServer(options, async (req, res) => {
      monitorRequest(req, res);
      try {
        const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
        if (url.pathname.startsWith("/api/") && await handleApi(req, res, url.pathname, url)) return;
        serveStatic(req, res, url.pathname);
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message });
      }
    });
  } catch (error) {
    console.warn(`HTTPS disabled: ${error.message}`);
    return null;
  }
}

const httpsServer = createHttpsServer();

if (WebSocketServer) {
  wss = new WebSocketServer({
    server,
    path: "/ws",
    perMessageDeflate: { threshold: 1024 }
  });
  wsServers.push(wss);
  wss.on("connection", (ws, req) => {
    if (!authenticatedUser(req)) {
      ws.close(1008, "authentication_required");
      return;
    }
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.send(JSON.stringify({ type: "ready", origin: "server", stateVersion: realtimeStateVersion() }));
    ws.on("message", raw => {
      try {
        const msg = JSON.parse(String(raw || "{}"));
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {}
    });
  });
  const qrWss = new WebSocketServer({
    server: qrServer,
    path: "/ws",
    perMessageDeflate: { threshold: 1024 }
  });
  wsServers.push(qrWss);
  qrWss.on("connection", ws => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.send(JSON.stringify({ type: "ready", origin: "server", stateVersion: realtimeStateVersion() }));
    ws.on("message", raw => {
      try {
        const msg = JSON.parse(String(raw || "{}"));
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch {}
    });
  });
  if (httpsServer) {
    const httpsWss = new WebSocketServer({
      server: httpsServer,
      path: "/ws",
      perMessageDeflate: { threshold: 1024 }
    });
    wsServers.push(httpsWss);
    httpsWss.on("connection", (ws, req) => {
      if (!authenticatedUser(req)) {
        ws.close(1008, "authentication_required");
        return;
      }
      ws.isAlive = true;
      ws.on("pong", () => { ws.isAlive = true; });
      ws.send(JSON.stringify({ type: "ready", origin: "server", stateVersion: realtimeStateVersion() }));
      ws.on("message", raw => {
        try {
          const msg = JSON.parse(String(raw || "{}"));
          if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
        } catch {}
      });
    });
  }
}

const heartbeatTimer = setInterval(() => {
  for (const wsServer of wsServers) {
    for (const ws of wsServer.clients) {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch {}
        continue;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    }
  }
  for (const client of sseClients) {
    sendSse(client, { type: "ping", time: new Date().toISOString() });
  }
}, 15000);
const systemMonitorTimer = setInterval(() => {
  refreshSystemMonitoring().catch(error => console.warn(`System monitoring failed: ${error.message}`));
}, 5 * 60 * 1000);
systemMonitorTimer.unref?.();
const automaticBackupTimer = setInterval(() => {
  runAutomaticBackupIfDue(false, "Система").catch(error => console.warn(`Automatic backup failed: ${error.message}`));
}, 10 * 60 * 1000);
automaticBackupTimer.unref?.();

async function shutdown() {
  clearInterval(heartbeatTimer);
  clearInterval(systemMonitorTimer);
  clearInterval(automaticBackupTimer);
  if (postgresRecoveryTimer) clearInterval(postgresRecoveryTimer);
  try {
    flushLocalBackup();
    await flushPostgresWrites();
    await postgresPhotoWriteQueue;
    if (postgresPool) await postgresPool.end();
  } catch {}
  server.close(() => process.exit(0));
  qrServer.close(() => {});
  if (httpsServer) httpsServer.close(() => {});
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

initializeStorage()
  .then(storage => {
    startPostgresRecoveryMonitor();
    refreshSystemMonitoring().catch(error => console.warn(`Initial monitoring failed: ${error.message}`));
    if (process.env.NODE_ENV !== "test") runAutomaticBackupIfDue(false, "Система").catch(error => console.warn(`Initial automatic backup failed: ${error.message}`));
    server.listen(port, "0.0.0.0", () => {
      ensureDb();
      console.log(`PPR Control realtime server: http://0.0.0.0:${port} [${storage.mode}]`);
    });
    qrServer.listen(qrPort, "0.0.0.0", () => {
      console.log(`PPR Control QR clean server: http://0.0.0.0:${qrPort} [${storage.mode}]`);
    });
    if (httpsServer) {
      httpsServer.listen(httpsPort, "0.0.0.0", () => {
        console.log(`PPR Control HTTPS server: https://0.0.0.0:${httpsPort} [${storage.mode}]`);
      });
    }
  })
  .catch(error => {
    console.error(`Server startup failed: ${error.stack || error.message}`);
    process.exit(1);
  });
