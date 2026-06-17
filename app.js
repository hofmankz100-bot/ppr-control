const TASKS = {
  to: [
    "Внешний осмотр оборудования и рабочей зоны.",
    "Проверить отсутствие постороннего шума, вибрации и перегрева.",
    "Проверить отсутствие утечек масла, воздуха, воды или газа.",
    "Проверить показания давления, температуры и индикации.",
    "Проверить защитные кожухи, ограждения и аварийную остановку.",
    "Проверить состояние кабелей, шлангов, трубопроводов и соединений.",
    "Проверить чистоту оборудования и отсутствие загрязнений.",
    "Проверить отсутствие посторонних предметов на движущихся частях.",
    "Проверить исправность кнопок управления и панели оператора.",
    "Проверить доступность проходов и зоны обслуживания.",
    "Проверить состояние маркировки и предупреждающих табличек.",
    "Проверить освещение рабочей зоны.",
    "Проверить замечания предыдущего обхода.",
    "Зафиксировать выявленные замечания в комментарии.",
    "Записать результат ежедневного ТО."
  ]
};

const PRESS_NODES = [
  "Главный цилиндр пресса", "Гидравлическая станция пресса", "Масляный бак и фильтрация масла", "Клапанная плита и гидрораспределители",
  "Штемпель / пресс-шток", "Пресс-шайба / dummy block", "Контейнер заготовки", "Нагрев контейнера",
  "Матрицедержатель / die holder", "Матрица и комплект оснастки", "Передняя плита и колонны пресса", "Станина и направляющие пресса",
  "Печь нагрева заготовок", "Стол загрузки заготовок", "Система подачи заготовок", "Пилотина / нож резки заготовки",
  "Пуллер / тянущее устройство профиля", "Выходной транспортер и охлаждающий стол", "Система охлаждения масла и профиля", "Шкаф управления, PLC, датчики и блокировки"
];

const DEFAULT_NODES = [
  "Основное оборудование", "Привод и механическая часть", "Электрическая часть", "Панель управления и автоматика",
  "Система безопасности", "Смазка и обслуживание", "Рабочая зона", "Освещение", "Шкаф управления", "Журнал замечаний"
];

const EQUIPMENT = [
  { id: 1, name: "пресс 2400 EGE", area: "Прессовый участок", nodes: [
    "Главный цилиндр пресса", "Гидравлическая станция пресса", "Масляный бак и фильтрация масла", "Клапанная плита и гидрораспределители",
    "Штемпель / пресс-шток", "Пресс-шайба / dummy block", "Контейнер заготовки", "Нагрев контейнера",
    "Матрицедержатель / die holder", "Матрица и комплект оснастки", "Передняя плита и колонны пресса", "Станина и направляющие пресса",
    "Печь нагрева заготовок", "Стол загрузки заготовок", "Система подачи заготовок", "Пилотина / нож резки заготовки",
    "Пуллер / тянущее устройство профиля", "Выходной транспортер и охлаждающий стол", "Система охлаждения масла и профиля", "Шкаф управления, PLC, датчики и блокировки"
  ]},
  { id: 2, name: "пресс 1540 EGE", area: "Прессовый участок", nodes: [
    "Главный цилиндр", "Гидравлическая станция", "Масляная система", "Гидрораспределители", "Пресс-шток", "Dummy block", "Контейнер", "Нагрев контейнера",
    "Матрицедержатель", "Оснастка", "Колонны пресса", "Станина", "Печь нагрева", "Стол загрузки", "Подача заготовок", "Нож резки", "Пуллер", "Охлаждающий стол", "Охлаждение масла", "Шкаф управления"
  ]},
  { id: 3, name: "литейный цех", area: "Литейный цех", nodes: [
    "Литейная печь", "Стол заливки слитков", "Пила резки алюминиевых слитков", "Транспортер загрузки", "Освещение", "ШГРП литейного цеха", "Кран-балка 6,2 тонны"
  ]},
  { id: 4, name: "покрасочный цех", area: "Покрасочный цех", nodes: DEFAULT_NODES },
  { id: 5, name: "шихтовый цех", area: "Шихтовый цех", nodes: ["Ножницы 1", "Ножницы 2", "Пресс брикетировочный 1", "Пресс брикетировочный 2", "Освещение", "ШГРП"] },
  { id: 6, name: "анодный цех", area: "Анодный цех", nodes: DEFAULT_NODES },
  { id: 7, name: "упаковка", area: "Упаковка", nodes: DEFAULT_NODES },
  { id: 8, name: "инструментальный цех", area: "Инструментальный цех", nodes: DEFAULT_NODES },
  { id: 9, name: "компрессорная", area: "Компрессорная", nodes: [
    "Компрессор EKOMAK 90 кВт №1", "Компрессор EKOMAK 90 кВт №2", "Компрессор EKOMAK 110 кВт №3", "Ресивер сжатого воздуха №1",
    "Ресивер сжатого воздуха №2", "Осушитель AirPIK", "Осушитель COMPRAG RDX", "ГРШ компрессорной", "Освещение здания компрессорной"
  ]},
  { id: 10, name: "насосная", area: "Насосная", nodes: DEFAULT_NODES },
  { id: 11, name: "токарный цех", area: "Токарный цех", nodes: ["Токарный станок", "Сверлильный станок"] },
  { id: 12, name: "эл подстанций", area: "Электроподстанции", nodes: DEFAULT_NODES },
  { id: 13, name: "уличное освещение", area: "Территория", nodes: ["Линии освещения", "Опоры освещения", "Светильники", "Щиты управления освещением", "Кабельные линии"] },
  { id: 14, name: "офисные помещение", area: "Офисные помещения", nodes: ["Освещение", "Электрощиты", "Розеточные группы", "Вентиляция", "Пожарная сигнализация"] },
  { id: 15, name: "ШГРП / ГРП / ГРУ", area: "Газовое хозяйство", nodes: [
    "ШГРП", "ГРП", "ГРУ", "Регулятор давления газа", "ПЗК", "ПСК", "Фильтр газа", "Подземный газопровод", "Контрольные трубки и колодцы", "Охранная зона газопровода"
  ]},
  { id: 16, name: "оборудование 16", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 17, name: "оборудование 17", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 18, name: "оборудование 18", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 19, name: "оборудование 19", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 20, name: "оборудование 20", area: "Резерв", nodes: DEFAULT_NODES }
];

const STORE_KEY = "ppr-pwa-state-v2";
const PROFILE_KEY = "ppr-pwa-profile-v1";
const USERS_KEY = "ppr-pwa-users-v1";
const APP_VERSION = "v163-gas-journal-equipment15";
const AGGREGATE_JOURNAL_ROWS_PER_SHEET = 18;
const DOWNTIME_COLORS = [
  "#8e3ee8", "#2563eb", "#06b6d4", "#f59e0b", "#10b981", "#ef4444",
  "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#f97316", "#0f766e",
  "#7c3aed", "#0284c7", "#ca8a04", "#16a34a", "#dc2626", "#be185d",
  "#0891b2", "#4f46e5", "#65a30d", "#ea580c", "#0d9488", "#9333ea"
];
const EDITOR_CODE = "kazak18117011";
const DIRECTOR_CODE = "kazak18117011";
const AREAS = [...new Set(EQUIPMENT.map(item => item.area))].sort((a, b) => a.localeCompare(b, "ru"));
const COMMON_WAREHOUSE = "Склад общего пользования";
const WAREHOUSE_AREAS = [COMMON_WAREHOUSE, ...AREAS];
const DOWNTIME_MONTH_LIMIT_MS = 125 * 60 * 60 * 1000;
const ROLE_ACCESS = {
  mechanic: { label: "Механик", requestRoles: ["warehouse", "cash", "mechanic"], equipment: "all", checklist: true },
  shop: { label: "Начальник цеха", requestRoles: ["warehouse", "cash", "shop"], equipment: "area", checklist: true },
  engineer: { label: "Инженер", requestRoles: ["all", "shop", "engineer", "supply", "finance", "cash", "warehouse", "mechanic", "productionDirector", "accounting"], equipment: "all", checklist: true },
  finance: { label: "Экономист", requestRoles: ["warehouse", "cash", "finance"], equipment: "none", checklist: false },
  cash: { label: "Касса", requestRoles: ["warehouse", "cash"], equipment: "none", checklist: false },
  accounting: { label: "Бухгалтерия", requestRoles: ["warehouse", "cash", "accounting"], equipment: "none", checklist: false },
  supply: { label: "Снабженец", requestRoles: ["warehouse", "cash", "supply"], equipment: "none", checklist: false },
  warehouse: { label: "Складовщик", requestRoles: ["warehouse", "cash"], equipment: "none", checklist: false },
  productionDirector: { label: "Директор производства", requestRoles: ["warehouse", "cash", "productionDirector"], equipment: "none", checklist: false },
  director: { label: "Директор", requestRoles: [], equipment: "none", checklist: false },
  editor: { label: "Редактор", requestRoles: ["all", "shop", "engineer", "supply", "finance", "cash", "warehouse", "mechanic", "productionDirector", "accounting"], equipment: "all", checklist: true }
};
const state = loadState();
const profile = loadProfile();
applyWorkCleanFromUrl();
const nav = [];
let remoteSaveTimer = null;
let remoteSaveInFlight = false;
let remoteSavePending = false;
let remoteSavePromise = null;
let remoteRetryTimer = null;
let realtimeSocket = null;
let realtimeEventSource = null;
let realtimeReconnectTimer = null;
let realtimePollTimer = null;
let lastRealtimeMessageAt = 0;
const CLIENT_ID_KEY = "ppr-client-id-v1";
const CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);
const ui = {
  subtitle: document.querySelector("#screenSubtitle"),
  back: document.querySelector("#backButton"),
  today: document.querySelector("#todayButton"),
  loginOverlay: document.querySelector("#loginOverlay"),
  loginForm: document.querySelector("#loginForm"),
  loginName: document.querySelector("#loginName"),
  loginPhone: document.querySelector("#loginPhone"),
  loginRole: document.querySelector("#loginRole"),
  loginArea: document.querySelector("#loginArea"),
  loginAreaRow: document.querySelector("#loginAreaRow"),
  loginEditorCode: document.querySelector("#loginEditorCode"),
  loginEditorCodeRow: document.querySelector("#loginEditorCodeRow"),
  loginError: document.querySelector("#loginError"),
  profileBar: document.querySelector("#profileBar"),
  equipmentSearch: document.querySelector("#equipmentSearch"),
  equipmentList: document.querySelector("#equipmentList"),
  alertCounter: document.querySelector("#alertCounter"),
  equipmentTitle: document.querySelector("#equipmentTitle"),
  equipmentMeta: document.querySelector("#equipmentMeta"),
  equipmentAlertBadge: document.querySelector("#equipmentAlertBadge"),
  nodeList: document.querySelector("#nodeList"),
  nodeTitle: document.querySelector("#nodeTitle"),
  nodeMeta: document.querySelector("#nodeMeta"),
  monthLabel: document.querySelector("#monthLabel"),
  scheduleGrid: document.querySelector("#scheduleGrid"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  checklistTitle: document.querySelector("#checklistTitle"),
  checklistMeta: document.querySelector("#checklistMeta"),
  dayStatus: document.querySelector("#dayStatus"),
  taskList: document.querySelector("#taskList"),
  commentPanel: document.querySelector(".comment-panel"),
  commentLabel: document.querySelector("#commentLabel"),
  commentInput: document.querySelector("#commentInput"),
  commentPhotoInput: document.querySelector("#commentPhotoInput"),
  commentPhotoPreview: document.querySelector("#commentPhotoPreview"),
  requestInput: document.querySelector("#requestInput"),
  requestPhotoInput: document.querySelector("#requestPhotoInput"),
  requestPhotoPreview: document.querySelector("#requestPhotoPreview"),
  requestInlineStatus: document.querySelector("#requestInlineStatus"),
  createRequestButton: document.querySelector("#createRequestButton"),
  openRequestsButton: document.querySelector("#openRequestsButton"),
  directorOpenButton: document.querySelector("#directorOpenButton"),
  directorBadge: document.querySelector("#directorBadge"),
  downtimeOpenButton: document.querySelector("#downtimeOpenButton"),
  downtimeBadge: document.querySelector("#downtimeBadge"),
  downtimeMeta: document.querySelector("#downtimeMeta"),
  downtimeChart: document.querySelector("#downtimeChart"),
  downtimeDetails: document.querySelector("#downtimeDetails"),
  downtimeMonthLabel: document.querySelector("#downtimeMonthLabel"),
  prevDowntimeMonth: document.querySelector("#prevDowntimeMonth"),
  nextDowntimeMonth: document.querySelector("#nextDowntimeMonth"),
  aggregateJournalMeta: document.querySelector("#aggregateJournalMeta"),
  aggregateJournalTitle: document.querySelector("#aggregateJournalTitle"),
  aggregateJournalList: document.querySelector("#aggregateJournalList"),
  directorMeta: document.querySelector("#directorMeta"),
  directorPanel: document.querySelector("#directorPanel"),
  requestsMeta: document.querySelector("#requestsMeta"),
  warehousePanel: document.querySelector("#warehousePanel"),
  resolvedInput: document.querySelector("#resolvedInput")
};

let current = {
  view: "equipment",
  equipmentId: null,
  nodeIndex: null,
  date: todayISO(),
  kind: "to",
  requestRole: defaultRequestRole(profile?.role),
  warehouseSearch: "",
  selectedStockArea: "",
  selectedWarehouseFolder: "",
  scrollToCommentNode: null,
  scrollToDowntimeNode: null,
  scrollToMainComment: false,
  downtimeMonth: new Date().getMonth(),
  downtimeYear: new Date().getFullYear(),
  selectedDowntimeArea: "",
  selectedAggregateArea: "",
  compressorSheetIndex: 0,
  month: new Date().getMonth(),
  year: new Date().getFullYear()
};

function ensureDowntimeUi() {
  if (!ui.downtimeOpenButton) {
    const quickNav = document.querySelector(".quick-nav");
    if (quickNav) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "downtimeOpenButton";
      button.innerHTML = `Простои <strong id="downtimeBadge">0</strong>`;
      const directorButton = document.querySelector("#directorOpenButton");
      quickNav.insertBefore(button, directorButton || null);
      ui.downtimeOpenButton = button;
      ui.downtimeBadge = button.querySelector("#downtimeBadge");
    }
  }
  if (!document.querySelector("#downtimeScreen")) {
    const main = document.querySelector(".screen");
    const section = document.createElement("section");
    section.id = "downtimeScreen";
    section.className = "view";
    section.innerHTML = `
      <div class="panel-head compact">
        <div>
          <h1>Простои по цехам</h1>
          <p id="downtimeMeta">Процент простоя за месяц и причины по участкам</p>
        </div>
        <div class="segmented" role="tablist" aria-label="Месяц простоев">
          <button id="prevDowntimeMonth" type="button">‹</button>
          <strong id="downtimeMonthLabel"></strong>
          <button id="nextDowntimeMonth" type="button">›</button>
        </div>
      </div>
      <div id="downtimeChart" class="downtime-chart"></div>
      <div id="downtimeDetails" class="downtime-details"></div>
    `;
    main?.append(section);
  }
  ui.downtimeMeta = document.querySelector("#downtimeMeta");
  ui.downtimeChart = document.querySelector("#downtimeChart");
  ui.downtimeDetails = document.querySelector("#downtimeDetails");
  ui.downtimeMonthLabel = document.querySelector("#downtimeMonthLabel");
  ui.prevDowntimeMonth = document.querySelector("#prevDowntimeMonth");
  ui.nextDowntimeMonth = document.querySelector("#nextDowntimeMonth");
}

ensureDowntimeUi();

function ensureAggregateJournalUi() {
  if (!document.querySelector("#aggregateJournalScreen")) {
    const main = document.querySelector(".screen");
    const section = document.createElement("section");
    section.id = "aggregateJournalScreen";
    section.className = "view";
    section.innerHTML = `
      <div class="panel-head compact">
        <div>
          <h1 id="aggregateJournalTitle">Агрегатный журнал</h1>
          <p id="aggregateJournalMeta">Замечания и поломки выбранного цеха</p>
        </div>
      </div>
      <div id="aggregateJournalList" class="aggregate-journal-list"></div>
    `;
    main?.append(section);
  }
  ui.aggregateJournalMeta = document.querySelector("#aggregateJournalMeta");
  ui.aggregateJournalTitle = document.querySelector("#aggregateJournalTitle");
  ui.aggregateJournalList = document.querySelector("#aggregateJournalList");
}

ensureAggregateJournalUi();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : { checks: {}, requests: {} };
    parsed.checks ||= {};
    parsed.checks = compactCheckRecords(parsed.checks);
    parsed.requests ||= {};
    parsed.inventory ||= {};
    parsed.catalog ||= { equipment: {} };
    parsed.catalog.equipment ||= {};
    parsed.directorMessages ||= [];
    parsed.downtimes ||= [];
    parsed.compressorJournal ||= {};
    parsed.gasJournal ||= {};
    return parsed;
  } catch {
    return { checks: {}, requests: {}, inventory: {}, catalog: { equipment: {} }, directorMessages: [], downtimes: [], compressorJournal: {}, gasJournal: {} };
  }
}

function saveState() {
  state.checks = compactCheckRecords(state.checks);
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  localStorage.setItem(`${STORE_KEY}-pending`, "1");
  queueRemoteStateSave();
}

async function publishStateNow() {
  clearTimeout(remoteSaveTimer);
  await saveRemoteState();
}

function setButtonBusy(button, busy, text = "Публикуется...") {
  if (!button) return;
  if (busy) {
    button.dataset.oldText = button.textContent;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    if (button.dataset.oldText) button.textContent = button.dataset.oldText;
    delete button.dataset.oldText;
  }
}

async function runButtonOperation(button, handler, text = "Публикуется...") {
  if (!button || button.disabled) return;
  setButtonBusy(button, true, text);
  try {
    await Promise.resolve(handler());
    await publishStateNow();
  } finally {
    if (button.isConnected) setButtonBusy(button, false);
  }
}

async function clearRecordedDataEverywhere() {
  state.checks = {};
  state.requests = {};
  state.inventory = {};
  state.downtimes = [];
  state.compressorJournal = {};
  state.gasJournal = {};
  state.directorMessages = [];
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  localStorage.setItem(`${STORE_KEY}-pending`, "1");
  localStorage.setItem(`${STORE_KEY}-clear-recorded`, "1");
  await publishStateNow();
}

function applyWorkCleanFromUrl() {
  const cleanMode = new URLSearchParams(window.location.search).get("clean");
  if (cleanMode === "logs") {
    state.checks = {};
    state.requests = {};
    state.downtimes = [];
    state.compressorJournal = {};
  state.gasJournal = {};
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return;
  }
  if (cleanMode !== "work") return;
  state.checks = {};
  state.requests = {};
  state.inventory = {};
  state.downtimes = [];
  state.compressorJournal = {};
  state.gasJournal = {};
  state.directorMessages = [];
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

async function apiJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = Number(options.timeout || 15000);
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
      signal: options.signal || controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timer);
  }
}


function nextActionId() {
  return `${CLIENT_ID}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeArrayByIdLocal(current = [], incoming = []) {
  const map = new Map();
  for (const item of Array.isArray(current) ? current : []) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (!item || !item.id) continue;
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
  }
  return Array.from(map.values()).sort((a, b) => String(b.updatedAt || b.createdAt || b.startedAt || b.registeredAt || '').localeCompare(String(a.updatedAt || a.createdAt || a.startedAt || a.registeredAt || '')));
}

function isIncomingNewerRecord(current, incoming) {
  const recordTime = record => {
    const direct = Date.parse(record?.updatedAt || record?.createdAt || record?.commentUpdatedAt || record?.resolvedAt || "");
    if (Number.isFinite(direct)) return direct;
    const commentTimes = Array.isArray(record?.commentLog)
      ? record.commentLog.map(entry => Date.parse(entry?.at || "")).filter(Number.isFinite)
      : [];
    if (commentTimes.length) return Math.max(...commentTimes);
    if (!record || typeof record !== "object") return NaN;
    return Math.max(
      ...Object.values(record)
        .map(value => Date.parse(value?.updatedAt || value?.createdAt || value?.commentUpdatedAt || value?.resolvedAt || ""))
        .filter(Number.isFinite),
      NaN
    );
  };
  const currentTime = recordTime(current);
  const incomingTime = recordTime(incoming);
  if (Number.isFinite(currentTime) || Number.isFinite(incomingTime)) {
    return (Number.isFinite(incomingTime) ? incomingTime : 0) >= (Number.isFinite(currentTime) ? currentTime : 0);
  }
  return true;
}

function mergeObjectByFreshnessLocal(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  Object.entries(incoming || {}).forEach(([id, value]) => {
    if (isIncomingNewerRecord(next[id], value)) next[id] = value;
  });
  return next;
}

function mergeRemoteState(remote = {}, options = {}) {
  const preferRemote = options.preferRemote === true && localStorage.getItem(`${STORE_KEY}-pending`) !== "1";
  state.checks = preferRemote
    ? compactCheckRecords(remote.checks || {})
    : compactCheckRecords(mergeObjectByFreshnessLocal(state.checks, remote.checks));
  state.requests = preferRemote
    ? { ...(remote.requests || {}) }
    : mergeObjectByFreshnessLocal(state.requests, remote.requests);
  Object.assign(state.inventory, remote.inventory || {});
  state.catalog ||= { equipment: {} };
  Object.assign(state.catalog.equipment, remote.catalog?.equipment || {});
  state.directorMessages = mergeArrayByIdLocal(state.directorMessages, remote.directorMessages);
  state.downtimes = mergeArrayByIdLocal(state.downtimes, remote.downtimes);
  state.compressorJournal = preferRemote
    ? { ...(remote.compressorJournal || {}) }
    : mergeObjectByFreshnessLocal(state.compressorJournal || {}, remote.compressorJournal || {});
  state.gasJournal = preferRemote
    ? { ...(remote.gasJournal || {}) }
    : mergeObjectByFreshnessLocal(state.gasJournal || {}, remote.gasJournal || {});
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function scheduleRemoteRetry() {
  if (remoteRetryTimer) return;
  remoteRetryTimer = window.setTimeout(() => {
    remoteRetryTimer = null;
    if (localStorage.getItem(`${STORE_KEY}-pending`) === "1") saveRemoteState();
  }, 1500);
}

function handleRealtimeMessage(data) {
  lastRealtimeMessageAt = Date.now();
  try {
    const msg = typeof data === "string" ? JSON.parse(data || "{}") : data || {};
    if (msg.type === "pong" || msg.type === "ping") return;
    if (msg.type !== "state" || msg.origin === CLIENT_ID) return;
    mergeRemoteState(msg.state || {}, { preferRemote: true });
    loadRemoteUsers();
    render();
  } catch {}
}

function connectRealtimeEvents() {
  if (!("EventSource" in window)) return false;
  if (realtimeEventSource && realtimeEventSource.readyState !== EventSource.CLOSED) return true;
  realtimeEventSource = new EventSource("/api/events");
  realtimeEventSource.onmessage = event => handleRealtimeMessage(event.data);
  realtimeEventSource.onopen = () => {
    lastRealtimeMessageAt = Date.now();
    if (localStorage.getItem(`${STORE_KEY}-pending`) === "1") saveRemoteState();
  };
  realtimeEventSource.onerror = () => {
    if (realtimeEventSource?.readyState === EventSource.CLOSED) {
      clearTimeout(realtimeReconnectTimer);
      realtimeReconnectTimer = window.setTimeout(connectRealtime, 1500);
    }
  };
  return true;
}

function connectRealtime() {
  connectRealtimeEvents();
  if (!("WebSocket" in window)) return;
  if (realtimeSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(realtimeSocket.readyState)) return;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  realtimeSocket = new WebSocket(`${protocol}://${window.location.host}/ws`);
  realtimeSocket.onmessage = event => handleRealtimeMessage(event.data);
  realtimeSocket.onopen = () => {
    lastRealtimeMessageAt = Date.now();
    if (localStorage.getItem(`${STORE_KEY}-pending`) === "1") saveRemoteState();
  };
  realtimeSocket.onclose = () => {
    clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = window.setTimeout(connectRealtime, 1500);
  };
  realtimeSocket.onerror = () => {
    try { realtimeSocket.close(); } catch {}
  };
}

function startRealtimePoll() {
  clearInterval(realtimePollTimer);
  realtimePollTimer = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    const socketAlive = realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN;
    const eventsAlive = realtimeEventSource && realtimeEventSource.readyState === EventSource.OPEN;
    if (socketAlive || eventsAlive) {
      try { realtimeSocket.send(JSON.stringify({ type: "ping" })); } catch {}
      if (lastRealtimeMessageAt && Date.now() - lastRealtimeMessageAt < 45000) return;
    }
    loadRemoteState();
    if (profile?.role === "editor" || isProfileWaitingApproval()) loadRemoteUsers();
  }, 2000);
}

async function loadRemoteState() {
  try {
    const remote = await apiJson("/api/state");
    mergeRemoteState(remote, { preferRemote: true });
    render();
  } catch {
    // Static/offline mode keeps using localStorage.
  }
}

async function loadRemoteUsers() {
  try {
    const users = await apiJson("/api/users");
    if (Array.isArray(users)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      if (isProfileWaitingApproval()) {
        const fresh = users.find(user => user.phone && user.phone === profile.phone);
        if (fresh?.approved === true && fresh?.pendingApproval !== true) {
          localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, ...fresh, approved: true, pendingApproval: false }));
          location.reload();
          return;
        }
      }
    }
    if (current.view === "director") renderDirector();
  } catch {
    // Static/offline mode keeps using local registered users.
  }
}

function flushPendingWork() {
  connectRealtime();
  startRealtimePoll();
  if (localStorage.getItem(`${STORE_KEY}-pending`) === "1") saveRemoteState();
}

function queueRemoteStateSave() {
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(saveRemoteState, 300);
}

async function saveRemoteState() {
  if (remoteSaveInFlight) {
    remoteSavePending = true;
    return remoteSavePromise;
  }
  remoteSaveInFlight = true;
  remoteSavePending = false;
  remoteSavePromise = (async () => {
  try {
    const result = await apiJson("/api/state", {
      method: "PUT",
      body: JSON.stringify({
        actionId: nextActionId(),
        clientId: CLIENT_ID,
        clearRecordedData: localStorage.getItem(`${STORE_KEY}-clear-recorded`) === "1",
        user: profile ? { name: profile.name || "", role: profile.role || "", phone: profile.phone || "" } : null,
        checks: state.checks,
        requests: state.requests,
        inventory: state.inventory,
        catalog: state.catalog,
        directorMessages: state.directorMessages,
        downtimes: state.downtimes || [],
        compressorJournal: state.compressorJournal || {},
        gasJournal: state.gasJournal || {}
      })
    });
    const hasNewLocalChanges = remoteSavePending;
    if (!hasNewLocalChanges) localStorage.removeItem(`${STORE_KEY}-pending`);
    localStorage.removeItem(`${STORE_KEY}-clear-recorded`);
    if (result?.state) mergeRemoteState(result.state, { preferRemote: !hasNewLocalChanges });
  } catch {
    // If the backend is unavailable, local work remains saved and will be resent.
    scheduleRemoteRetry();
  } finally {
    remoteSaveInFlight = false;
    if (remoteSavePending) queueRemoteStateSave();
  }
  })();
  return remoteSavePromise;
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRegisteredUser(nextProfile) {
  const users = loadUsers();
  const sameUser = user => user.phone && user.phone === nextProfile.phone;
  const nextUsers = users.filter(user => !sameUser(user));
  const approved = nextProfile.role === "editor" || nextProfile.role === "director";
  const savedProfile = { ...nextProfile, approved, pendingApproval: !approved };
  nextUsers.push({ ...savedProfile, registeredAt: new Date().toISOString() });
  localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(savedProfile));
  await apiJson("/api/users", {
    method: "POST",
    body: JSON.stringify({ ...savedProfile, actionId: nextActionId(), clientId: CLIENT_ID })
  });
  return savedProfile;
}

function defaultRequestRole(role = profile?.role) {
  const access = ROLE_ACCESS[role] || ROLE_ACCESS.mechanic;
  return access.requestRoles.find(item => item !== "all") || "mechanic";
}

function roleAccess() {
  return ROLE_ACCESS[profile?.role] || ROLE_ACCESS.mechanic;
}

function isProfileReady() {
  if (!profile?.name || !profile?.role) return false;
  return profile.approved !== false && profile.pendingApproval !== true;
}

function isProfileWaitingApproval() {
  return Boolean(profile?.name && profile?.role && (profile.approved === false || profile.pendingApproval === true));
}

function needsArea(role = profile?.role) {
  return role === "shop";
}

function canOpenRequestRole(role) {
  return roleAccess().requestRoles.includes(role);
}

function canActAsRole(role) {
  return profile?.role === "editor" || profile?.role === role;
}

function canConfirmInstallation() {
  return profile?.role === "editor" || profile?.role === "shop" || profile?.role === "engineer";
}

function canEditChecklist() {
  return Boolean(roleAccess().checklist);
}

function canEditCatalog() {
  return profile?.role === "editor";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function equipmentOverride(id) {
  state.catalog ||= { equipment: {} };
  state.catalog.equipment ||= {};
  state.catalog.equipment[id] ||= {};
  return state.catalog.equipment[id];
}

function allEquipment() {
  state.catalog ||= { equipment: {} };
  state.catalog.equipment ||= {};
  return EQUIPMENT.map(eq => {
    const override = state.catalog.equipment[eq.id] || {};
    return {
      ...eq,
      name: override.name || eq.name,
      area: override.area || eq.area,
      nodes: Array.isArray(override.nodes) ? override.nodes : eq.nodes,
      reminders: override.reminders || {}
    };
  });
}

function saveEquipmentCatalog(equipmentId, patch) {
  const item = equipmentOverride(equipmentId);
  Object.assign(item, patch);
  saveState();
}

function saveNodeName(equipmentId, nodeIndex, value) {
  const eq = equipmentById(equipmentId);
  const item = equipmentOverride(equipmentId);
  item.nodes = [...eq.nodes];
  item.nodes[nodeIndex] = value.trim() || eq.nodes[nodeIndex];
  saveState();
}

function reminderItemsForNode(equipmentId, nodeIndex, nodeName) {
  const saved = equipmentOverride(equipmentId).reminders?.[nodeIndex];
  return Array.isArray(saved) && saved.length ? saved : nodeReminderItems(nodeName);
}

function saveNodeReminder(equipmentId, nodeIndex, text) {
  const item = equipmentOverride(equipmentId);
  item.reminders ||= {};
  item.reminders[nodeIndex] = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  saveState();
}

function areaAllowed(area) {
  return !needsArea() || !profile?.area || area === profile.area;
}

function visibleEquipment() {
  const mode = roleAccess().equipment;
  if (mode === "none") return [];
  const equipment = allEquipment();
  if (mode === "area") return equipment.filter(eq => areaAllowed(eq.area));
  return equipment;
}

function requestAllowedByUser(req) {
  if (profile?.role === "editor") return true;
  if (profile?.role === "shop" || profile?.role === "supply") return areaAllowed(req.area);
  return true;
}

function warehouseIssueTargetRole(req) {
  return req.issueTargetRole || "mechanic";
}

function canReceiveWarehouseIssue(role) {
  return Boolean(role && ROLE_ACCESS[role] && !["all", "warehouse", "editor", "director"].includes(role));
}

function canConfirmIssuedInstall(req, role = current.requestRole) {
  return req.issued && !req.mechanicInstalled && !req.done && !req.stock && warehouseIssueTargetRole(req) === role;
}

function warehouseIssueRoleOptions(selectedRole = "mechanic") {
  return Object.keys(ROLE_ACCESS)
    .filter(canReceiveWarehouseIssue)
    .map(role => `<option value="${role}" ${role === selectedRole ? "selected" : ""}>${ROLE_ACCESS[role].label}</option>`)
    .join("");
}

function profileKey(user = profile) {
  return String(user?.phone || user?.name || "").trim() || "unknown";
}

function directorMessages() {
  state.directorMessages ||= [];
  return state.directorMessages;
}

function pendingUserApprovalCount() {
  if (profile?.role !== "editor") return 0;
  return loadUsers().filter(user => user.approved === false || user.pendingApproval === true).length;
}

function directorUnreadCount() {
  const pendingUsers = pendingUserApprovalCount();
  if (directorCanAnswer()) return directorMessages().filter(msg => !msg.directorRead).length + pendingUsers;
  return directorMessages().filter(msg => directorMessageVisibleForProfile(msg) && msg.reply && !msg.userRead).length;
}

function updateDirectorBadge() {
  if (!ui.directorOpenButton || !ui.directorBadge) return;
  const count = directorUnreadCount();
  ui.directorBadge.textContent = count;
  ui.directorOpenButton.classList.toggle("request-alert", count > 0);
}

function directorCanAnswer() {
  return profile?.role === "director" || profile?.role === "editor";
}

function directorMessageRoleId(msg) {
  if (msg.fromRoleId) return msg.fromRoleId;
  const label = String(msg.fromRole || "").trim();
  return Object.keys(ROLE_ACCESS).find(role => ROLE_ACCESS[role].label === label) || "";
}

function directorMessageVisibleForProfile(msg) {
  if (directorCanAnswer()) return true;
  const roleId = directorMessageRoleId(msg);
  if (roleId) return roleId === profile?.role;
  return msg.fromKey === profileKey();
}

function createDirectorMessage(data) {
  const text = typeof data === "string" ? data.trim() : String(data?.body || "").trim();
  const writtenName = typeof data === "string" ? "" : String(data?.fromName || "").trim();
  const message = {
    id: `director:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    fromKey: profileKey(),
    fromName: writtenName || profile?.name || "",
    fromPhone: profile?.phone || "",
    fromRoleId: profile?.role || "",
    fromRole: ROLE_ACCESS[profile?.role]?.label || profile?.role || "",
    fromArea: profile?.area || "",
    memoFullText: typeof data === "string" ? text : String(data?.memoFullText || text).trim(),
    memoNumber: typeof data === "string" ? "" : String(data?.memoNumber || "").trim(),
    memoDate: typeof data === "string" ? todayISO() : String(data?.memoDate || todayISO()),
    memoDay: typeof data === "string" ? "" : String(data?.memoDay || "").trim(),
    memoMonth: typeof data === "string" ? "" : String(data?.memoMonth || "").trim(),
    memoYear: typeof data === "string" ? "" : String(data?.memoYear || "").trim(),
    position: typeof data === "string" ? "" : String(data?.position || "").trim(),
    department: typeof data === "string" ? "" : String(data?.department || "").trim(),
    topic: typeof data === "string" ? "" : String(data?.topic || "").trim(),
    text,
    reply: "",
    directorRead: false,
    userRead: false,
    createdAt: new Date().toISOString(),
    repliedAt: ""
  };
  directorMessages().unshift(message);
  saveState();
  return message;
}

function directorMemoText(data) {
  return `Г-ну Азизову Б.
Директору ТОО «Aluminium of Kazakhstan»

от ${String(data?.fromName || "__________________________").trim()}
должность ${String(data?.position || "___________________").trim()}
подразделение ${String(data?.department || "_______________").trim()}

СЛУЖЕБНАЯ ЗАПИСКА

№ ${String(data?.memoNumber || "_________").trim()}                           «${String(data?.memoDay || "").trim()}» ${String(data?.memoMonth || "__________").trim()} ${String(data?.memoYear || "20__").trim()} г.

Тема: ${String(data?.topic || "___________________________________________").trim()}

Уважаемый Азизов Б.!

${String(data?.body || "").trim()}`;
}

function requestVisibleForRole(req, role) {
  if (!canOpenRequestRole(role) || !requestAllowedByUser(req)) return false;
  if (profile?.role === "mechanic" && role === "warehouse") {
    return req.transferredToWarehouse || req.warehouseReceived || req.stock || req.issued;
  }
  return requestMatchesRole(req, role);
}

function renderProfile() {
  if (!ui.profileBar) return;
  if (!isProfileReady()) {
    ui.profileBar.innerHTML = "";
    return;
  }
  const area = profile.area ? ` · ${profile.area}` : "";
  const phone = profile.phone ? ` · ${profile.phone}` : "";
  ui.profileBar.innerHTML = `
    <div><strong>${profile.name}</strong><span>${ROLE_ACCESS[profile.role]?.label || profile.role}${area}${phone}</span></div>
    ${profile.role === "editor" ? `<button type="button" id="monthlyExportButton">Экспорт JSON</button><button type="button" id="monthlyCsvExportButton">Скачать Excel</button>` : ""}
    ${profile.role === "editor" ? `<button type="button" id="clearRecordedDataButton">Очистить записи</button>` : ""}
    ${profile.role === "editor" ? `<button type="button" id="changeUserButton">Сменить</button>` : ""}
  `;
  ui.profileBar.querySelector("#monthlyExportButton")?.addEventListener("click", event => {
    createManualBackupAndExport(event.currentTarget, "json");
  });
  ui.profileBar.querySelector("#monthlyCsvExportButton")?.addEventListener("click", event => {
    createManualBackupAndExport(event.currentTarget, "csv");
  });
  ui.profileBar.querySelector("#clearRecordedDataButton")?.addEventListener("click", event => {
    if (!window.confirm("Очистить все записанные данные: комментарии, заявки, складские остатки, простои и директорскую? Памятки и оборудование останутся.")) return;
    runButtonOperation(event.currentTarget, async () => {
      await clearRecordedDataEverywhere();
      render();
    }, "Очищается...");
  });
  ui.profileBar.querySelector("#changeUserButton")?.addEventListener("click", () => {
    localStorage.removeItem(PROFILE_KEY);
    location.reload();
  });
}



function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function downloadServerFile(url) {
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  document.body.append(link);
  link.click();
  link.remove();
}

async function createManualBackupAndExport(button, format = "json") {
  setButtonBusy(button, true, "Готовится...");
  try {
    await publishStateNow();
    await apiJson("/api/backup/manual", {
      method: "POST",
      body: JSON.stringify({ label: currentMonthKey(), clientId: CLIENT_ID })
    });
    downloadServerFile(format === "csv" ? `/api/export/month.xls?month=${currentMonthKey()}` : `/api/export/month?month=${currentMonthKey()}`);
  } catch (error) {
    alert("Не удалось сделать экспорт. Проверь интернет и сервер, затем попробуй ещё раз.");
  } finally {
    setButtonBusy(button, false);
  }
}

function setupLogin() {
  if (!ui.loginOverlay || !ui.loginForm) return;
  ui.loginArea.innerHTML = AREAS.map(area => `<option value="${area}">${area}</option>`).join("");
  const syncArea = () => {
    const role = ui.loginRole.value;
    ui.loginAreaRow.hidden = !needsArea(role);
    ui.loginEditorCodeRow.hidden = role !== "editor" && role !== "director";
    ui.loginEditorCode.required = role === "editor" || role === "director";
    ui.loginError.textContent = "";
  };
  ui.loginRole.addEventListener("change", syncArea);
  ui.loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const submitButton = ui.loginForm.querySelector("button[type='submit']");
    const role = ui.loginRole.value;
    if (role === "editor" && ui.loginEditorCode.value.trim() !== EDITOR_CODE) {
      ui.loginError.textContent = "Неверный код редактора";
      return;
    }
    if (role === "director" && ui.loginEditorCode.value.trim() !== DIRECTOR_CODE) {
      ui.loginError.textContent = "Неверный код директора";
      return;
    }
    const nextProfile = {
      name: ui.loginName.value.trim(),
      phone: ui.loginPhone.value.trim(),
      role,
      area: needsArea(role) ? ui.loginArea.value : ""
    };
    setButtonBusy(submitButton, true, "Сохраняем...");
    try {
      await saveRegisteredUser(nextProfile);
      location.reload();
    } catch {
      ui.loginError.textContent = "Не удалось отправить регистрацию на сервер. Проверьте связь и попробуйте еще раз.";
      setButtonBusy(submitButton, false);
    }
  });
  syncArea();
  if (isProfileWaitingApproval()) {
    ui.loginOverlay.hidden = false;
    ui.loginForm.hidden = true;
    ui.loginError.textContent = "Регистрация отправлена редактору. Дождитесь подтверждения.";
    window.setInterval(loadRemoteUsers, 5000);
    return;
  }
  ui.loginOverlay.hidden = isProfileReady();
  if (isProfileReady()) renderProfile();
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function key(equipmentId, nodeIndex, date) {
  return `${equipmentId}:${nodeIndex}:${date}`;
}

function getRecord(equipmentId = current.equipmentId, nodeIndex = current.nodeIndex, date = current.date) {
  return state.checks[key(equipmentId, nodeIndex, date)] || null;
}

function record(equipmentId = current.equipmentId, nodeIndex = current.nodeIndex, date = current.date) {
  const k = key(equipmentId, nodeIndex, date);
  if (!state.checks[k]) {
    const now = new Date().toISOString();
    state.checks[k] = {
      createdAt: now,
      updatedAt: now,
      to: blankKind(now)
    };
  }
  return state.checks[k];
}

function blankKind(now = new Date().toISOString()) {
  return { tasks: Array(15).fill(false), walkDone: false, comment: "", commentPhoto: "", commentOwnerRole: "", commentOwnerName: "", commentLog: [], request: "", requestPhoto: "", resolved: false, createdAt: now, updatedAt: now };
}

function hasMeaningfulCheckKind(item) {
  if (!item || typeof item !== "object") return false;
  if (Array.isArray(item.tasks) && item.tasks.some(Boolean)) return true;
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

function isNodeChecked(rec) {
  return Boolean(rec?.to?.walkDone || rec?.to?.tasks?.[0]);
}

function currentRoleId() {
  return profile?.role || "";
}

function canEditComment(item) {
  if (!canEditChecklist()) return false;
  if (profile?.role === "editor" || profile?.role === "director") return true;
  return true;
}

function setCommentOwner(item) {
  if (!item.commentOwnerRole && (String(item.comment || "").trim() || item.commentPhoto)) {
    item.commentOwnerRole = currentRoleId();
    item.commentOwnerName = profile?.name || "";
  }
}

function sameCommentAuthor(item) {
  return !item.commentOwnerRole || item.commentOwnerRole === currentRoleId() || profile?.role === "editor" || profile?.role === "director";
}

function commentEntryAuthor(entry) {
  const role = ROLE_ACCESS[entry.role]?.label || entry.role || "";
  return entry.name ? `${entry.name}${role ? ` (${role})` : ""}` : role || "Сотрудник";
}

function currentCommentEntry(item) {
  if (!String(item.comment || "").trim()) return null;
  return {
    text: item.comment,
    photo: item.commentPhoto || "",
    role: item.commentOwnerRole || "",
    name: item.commentOwnerName || "",
    at: item.commentUpdatedAt || ""
  };
}

function appendCommentEntry(item, text, photo = "", meta = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;
  const now = new Date().toISOString();
  const entry = {
    text: cleanText,
    photo: photo || item.commentPhoto || "",
    role: currentRoleId(),
    name: profile?.name || "",
    at: now,
    type: meta.type || "remark"
  };
  item.commentLog = [...(Array.isArray(item.commentLog) ? item.commentLog : []), entry];
  item.comment = "";
  item.commentPhoto = "";
  item.commentOwnerRole = "";
  item.commentOwnerName = "";
  item.commentUpdatedAt = "";
  item.updatedAt = now;
  return entry;
}

function appendDowntimeCommentToNode(equipmentId, nodeIndex, date, label, comment) {
  const text = String(comment || "").trim();
  if (!text) return null;
  const rec = record(equipmentId, nodeIndex, date);
  const item = rec.to;
  rec.updatedAt = new Date().toISOString();
  return appendCommentEntry(item, `${label}: ${text}`, "", { type: "downtime" });
}

function firstCommentTime(item) {
  const entries = visibleCommentEntries(item);
  const times = entries
    .filter(entry => !isDowntimeCommentEntry(entry))
    .map(entry => new Date(entry.at || "").getTime())
    .filter(Number.isFinite);
  if (times.length) return new Date(Math.min(...times)).toISOString();
  return item?.commentUpdatedAt || "";
}

function firstRemarkEntry(item) {
  return visibleCommentEntries(item).find(entry => !isDowntimeCommentEntry(entry) && String(entry?.text || "").trim()) || null;
}

function visibleCommentEntries(item, includeEditable = true) {
  const log = Array.isArray(item.commentLog) ? item.commentLog : [];
  const current = currentCommentEntry(item);
  if (!current) return log;
  if (includeEditable || !sameCommentAuthor(item)) return [...log, current];
  return log;
}

function commentInputValue(item) {
  return sameCommentAuthor(item) ? item.comment || "" : "";
}

function isDowntimeCommentEntry(entry) {
  const text = String(entry?.text || "").trim();
  return entry?.type === "downtime" || text.startsWith("Пуск:") || text.startsWith("Стоп:");
}

function hasAnyComment(item) {
  if (!item) return false;
  return Boolean(String(item.comment || "").trim() || (Array.isArray(item.commentLog) && item.commentLog.some(entry => !isDowntimeCommentEntry(entry) && String(entry?.text || "").trim())));
}

function beginCommentEdit(item, nextText) {
  const now = new Date().toISOString();
  if (!sameCommentAuthor(item) && String(item.comment || "").trim()) {
    item.commentLog = [...(Array.isArray(item.commentLog) ? item.commentLog : []), currentCommentEntry(item)].filter(Boolean);
    item.comment = "";
    item.commentPhoto = "";
    item.commentOwnerRole = "";
    item.commentOwnerName = "";
    item.commentUpdatedAt = "";
  }
  item.comment = nextText;
  setCommentOwner(item);
  item.commentUpdatedAt = now;
  item.updatedAt = now;
}

function saveCommentDraft(item, nextText) {
  const text = String(nextText || "");
  if (!sameCommentAuthor(item) && !text.trim()) return;
  beginCommentEdit(item, text);
}

function saveCommentResolution(item, text = "", photo = "", options = {}) {
  const now = new Date().toISOString();
  if (options.preserveExisting && item.resolvedAt) return;
  const startedAt = firstCommentTime(item);
  const startedMs = Date.parse(startedAt || "");
  const endedMs = Date.parse(now);
  item.resolvedAt = now;
  item.resolvedStartedAt = startedAt || item.resolvedStartedAt || "";
  item.resolvedDurationMs = Number.isFinite(startedMs) && Number.isFinite(endedMs) ? Math.max(endedMs - startedMs, 0) : 0;
  item.resolvedByName = profile?.name || "";
  item.resolvedByRole = profile?.role || "";
  item.resolvedComment = String(text || "").trim();
  item.resolvedPhoto = photo || "";
  const hasSavedRemark = Array.isArray(item.commentLog) && item.commentLog.some(entry => !isDowntimeCommentEntry(entry) && String(entry?.text || "").trim());
  if (hasSavedRemark && String(item.comment || "").trim() === item.resolvedComment && item.commentOwnerRole === currentRoleId()) {
    item.comment = "";
    item.commentOwnerRole = "";
    item.commentOwnerName = "";
    item.commentUpdatedAt = "";
  }
  item.commentPhoto = "";
  item.updatedAt = now;
}

function markCommentResolved(item, text = "", photo = "", options = {}) {
  saveCommentResolution(item, text, photo, options);
  item.resolved = true;
}

function commentResolutionText(item) {
  if (!item?.resolved) return "";
  const durationMs = Number(item.resolvedDurationMs || 0);
  const startedAt = item.resolvedStartedAt || firstCommentTime(item);
  const endedAt = item.resolvedAt || "";
  if (durationMs > 0) return `Устранено за ${durationText(durationMs)}`;
  const startMs = Date.parse(startedAt || "");
  const endMs = Date.parse(endedAt || "");
  if (Number.isFinite(startMs) && Number.isFinite(endMs)) return `Устранено за ${durationText(Math.max(endMs - startMs, 0))}`;
  return "";
}

function commentsSummary(item) {
  return visibleCommentEntries(item)
    .map(entry => `${commentEntryAuthor(entry)}: ${entry.text}`)
    .join("\n");
}

function commentOwnerText(item) {
  if (!item.commentOwnerRole) return "";
  const role = ROLE_ACCESS[item.commentOwnerRole]?.label || item.commentOwnerRole;
  return item.commentOwnerName ? `Записал: ${item.commentOwnerName} (${role})` : `Записал: ${role}`;
}

function requestId(equipmentId = current.equipmentId, nodeIndex = current.nodeIndex, date = current.date, kind = current.kind) {
  return `${equipmentId}:${nodeIndex}:${date}:${kind}`;
}

function remarkLinkKey(equipmentId, nodeIndex, date) {
  return `${equipmentId}:${nodeIndex}:${date}`;
}

function newRequestId(equipmentId = current.equipmentId, nodeIndex = current.nodeIndex, date = current.date, kind = current.kind) {
  return `${requestId(equipmentId, nodeIndex, date, kind)}:req:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function requestFromRecord(id, recKind, equipmentId, nodeIndex, date, kind) {
  const requestText = String(recKind?.request || "").trim();
  if (!requestText) return null;
  if (!recKind.requestStatus) setRequestStatus(recKind);
  const eq = equipmentById(equipmentId);
  return {
    id,
    equipmentId,
    nodeIndex,
    date,
    kind,
    equipment: eq?.name || "",
    area: eq?.area || "",
    node: eq?.nodes[nodeIndex] || "",
    comment: commentsSummary(recKind) || recKind.comment,
    commentPhoto: recKind.commentPhoto || "",
    text: requestText,
    requestPhoto: recKind.requestPhoto || "",
    invoicePhoto: recKind.invoicePhoto || "",
    noInvoiceApproved: Boolean(recKind.noInvoiceApproved),
    price: recKind.price || "",
    supplier: recKind.supplier || "",
    status: recKind.requestStatus || "created",
    shopApproved: Boolean(recKind.shopApproved),
    engineerApproved: Boolean(recKind.engineerApproved),
    supplyPrepared: Boolean(recKind.supplyPrepared),
    financeApproved: Boolean(recKind.financeApproved),
    cashApproved: Boolean(recKind.cashApproved),
    transferredToWarehouse: Boolean(recKind.transferredToWarehouse),
    warehouseReceived: Boolean(recKind.warehouseReceived),
    issued: Boolean(recKind.issued),
    issueTargetRole: recKind.issueTargetRole || "",
    issueTargetName: recKind.issueTargetName || "",
    issueTargetPhone: recKind.issueTargetPhone || "",
    installComment: recKind.installComment || "",
    aggregateRemarkKey: recKind.aggregateRemarkKey || "",
    mechanicInstalled: Boolean(recKind.mechanicInstalled),
    shopInstallApproved: Boolean(recKind.shopInstallApproved),
    productionDirectorApproved: Boolean(recKind.productionDirectorApproved),
    accountingWrittenOff: Boolean(recKind.accountingWrittenOff),
    done: Boolean(recKind.done),
    stock: Boolean(recKind.stock),
    qtyReceived: Number(recKind.qtyReceived || 0),
    qtyIssued: Number(recKind.qtyIssued || 0),
    aggregateInstalledQty: Number(recKind.aggregateInstalledQty || 0),
    stockArea: recKind.stockArea || "",
    inventoryAddedQty: Number(recKind.inventoryAddedQty || 0)
  };
}

function upsertRequestFromCurrent() {
  const rec = record();
  const item = rec[current.kind];
  const text = (item.request || "").trim();
  const id = requestId();
  if (!text) {
    delete state.requests[id];
    saveState();
    return null;
  }
  if (!item.requestStatus) item.requestStatus = "shop";
  setRequestStatus(item);
  const eq = equipmentById(current.equipmentId);
  const req = state.requests[id] || {};
  state.requests[id] = {
    ...req,
    id,
    equipmentId: current.equipmentId,
    nodeIndex: current.nodeIndex,
    date: current.date,
    kind: current.kind,
    equipment: eq?.name || "",
    area: eq?.area || "",
    node: eq?.nodes[current.nodeIndex] || "",
    comment: commentsSummary(item) || item.comment || "",
    commentPhoto: item.commentPhoto || req.commentPhoto || "",
    text,
    requestPhoto: item.requestPhoto || req.requestPhoto || "",
    invoicePhoto: item.invoicePhoto || req.invoicePhoto || "",
    noInvoiceApproved: Boolean(item.noInvoiceApproved || req.noInvoiceApproved),
    price: item.price || req.price || "",
    supplier: item.supplier || req.supplier || "",
    status: item.requestStatus || req.status || "shop",
    shopApproved: Boolean(item.shopApproved || req.shopApproved),
    engineerApproved: Boolean(item.engineerApproved || req.engineerApproved),
    supplyPrepared: Boolean(item.supplyPrepared || req.supplyPrepared),
    financeApproved: Boolean(item.financeApproved || req.financeApproved),
    cashApproved: Boolean(item.cashApproved || req.cashApproved),
    transferredToWarehouse: Boolean(item.transferredToWarehouse || req.transferredToWarehouse),
    warehouseReceived: Boolean(item.warehouseReceived || req.warehouseReceived),
    issued: Boolean(item.issued || req.issued),
    issueTargetRole: item.issueTargetRole || req.issueTargetRole || "",
    issueTargetName: item.issueTargetName || req.issueTargetName || "",
    issueTargetPhone: item.issueTargetPhone || req.issueTargetPhone || "",
    installComment: item.installComment || req.installComment || "",
    aggregateRemarkKey: item.aggregateRemarkKey || req.aggregateRemarkKey || "",
    mechanicInstalled: Boolean(item.mechanicInstalled || req.mechanicInstalled),
    shopInstallApproved: Boolean(item.shopInstallApproved || req.shopInstallApproved),
    productionDirectorApproved: Boolean(item.productionDirectorApproved || req.productionDirectorApproved),
    accountingWrittenOff: Boolean(item.accountingWrittenOff || req.accountingWrittenOff),
    done: Boolean(item.done || req.done),
    stock: Boolean(item.stock || req.stock),
    qtyReceived: Number(item.qtyReceived || req.qtyReceived || 0),
    qtyIssued: Number(item.qtyIssued || req.qtyIssued || 0),
    aggregateInstalledQty: Number(item.aggregateInstalledQty || req.aggregateInstalledQty || 0),
    stockArea: item.stockArea || req.stockArea || "",
    inventoryAddedQty: Number(item.inventoryAddedQty || req.inventoryAddedQty || 0),
    updatedAt: new Date().toISOString()
  };
  saveState();
  return state.requests[id];
}

function createDirectRequestFromCurrent() {
  state.requests ||= {};
  const rec = record();
  const item = rec[current.kind];
  const text = (ui.requestInput.value || item.request || "").trim();
  if (!text) return null;

  const id = requestId();
  const eq = equipmentById(current.equipmentId);
  const old = state.requests[id] || {};
  item.request = text;
  if (canEditComment(item)) {
    saveCommentDraft(item, ui.commentInput.value || item.comment || "");
  }
  item.commentPhoto ||= old.commentPhoto || "";
  item.requestPhoto ||= old.requestPhoto || "";
  item.requestStatus ||= old.status || "shop";
  setRequestStatus(item);

  state.requests[id] = {
    id,
    equipmentId: current.equipmentId,
    nodeIndex: current.nodeIndex,
    date: current.date,
    kind: current.kind,
    equipment: eq?.name || "",
    area: eq?.area || "",
    node: eq?.nodes[current.nodeIndex] || "",
    comment: commentsSummary(item) || item.comment || "",
    commentPhoto: old.commentPhoto || item.commentPhoto || "",
    text,
    requestPhoto: old.requestPhoto || item.requestPhoto || "",
    invoicePhoto: old.invoicePhoto || item.invoicePhoto || "",
    noInvoiceApproved: Boolean(old.noInvoiceApproved || item.noInvoiceApproved),
    price: old.price || item.price || "",
    supplier: old.supplier || item.supplier || "",
    status: old.status || item.requestStatus || "shop",
    shopApproved: Boolean(old.shopApproved || item.shopApproved),
    engineerApproved: Boolean(old.engineerApproved || item.engineerApproved),
    financeApproved: Boolean(old.financeApproved || item.financeApproved),
    transferredToWarehouse: Boolean(old.transferredToWarehouse || item.transferredToWarehouse),
    warehouseReceived: Boolean(old.warehouseReceived || item.warehouseReceived),
    issued: Boolean(old.issued || item.issued),
    issueTargetRole: old.issueTargetRole || item.issueTargetRole || "",
    issueTargetName: old.issueTargetName || item.issueTargetName || "",
    issueTargetPhone: old.issueTargetPhone || item.issueTargetPhone || "",
    installComment: old.installComment || item.installComment || "",
    aggregateRemarkKey: old.aggregateRemarkKey || item.aggregateRemarkKey || "",
    mechanicInstalled: Boolean(old.mechanicInstalled || item.mechanicInstalled),
    shopInstallApproved: Boolean(old.shopInstallApproved || item.shopInstallApproved),
    productionDirectorApproved: Boolean(old.productionDirectorApproved || item.productionDirectorApproved),
    accountingWrittenOff: Boolean(old.accountingWrittenOff || item.accountingWrittenOff),
    done: Boolean(old.done || item.done),
    stock: Boolean(old.stock || item.stock),
    qtyReceived: Number(old.qtyReceived || item.qtyReceived || 0),
    qtyIssued: Number(old.qtyIssued || item.qtyIssued || 0),
    aggregateInstalledQty: Number(old.aggregateInstalledQty || item.aggregateInstalledQty || 0),
    stockArea: old.stockArea || item.stockArea || "",
    inventoryAddedQty: Number(old.inventoryAddedQty || item.inventoryAddedQty || 0),
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveState();
  return state.requests[id];
}

function createNodeWalkRequestSubmission(equipmentId, nodeIndex, date, item, text, requestPhoto = "") {
  state.requests ||= {};
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;
  const id = newRequestId(equipmentId, nodeIndex, date, "to");
  const eq = equipmentById(equipmentId);
  const now = new Date().toISOString();
  state.requests[id] = {
    id,
    equipmentId,
    nodeIndex,
    date,
    kind: "to",
    equipment: eq?.name || "",
    area: eq?.area || "",
    node: eq?.nodes[nodeIndex] || "",
    comment: commentsSummary(item) || item.comment || "",
    commentPhoto: item.commentPhoto || "",
    text: cleanText,
    requestPhoto: requestPhoto || item.requestPhoto || "",
    invoicePhoto: "",
    noInvoiceApproved: false,
    price: "",
    supplier: "",
    status: "shop",
    shopApproved: false,
    engineerApproved: false,
    supplyPrepared: false,
    financeApproved: false,
    cashApproved: false,
    transferredToWarehouse: false,
    warehouseReceived: false,
    issued: false,
    issueTargetRole: "",
    issueTargetName: "",
    issueTargetPhone: "",
    installComment: "",
    aggregateRemarkKey: "",
    mechanicInstalled: false,
    shopInstallApproved: false,
    productionDirectorApproved: false,
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: 0,
    qtyIssued: 0,
    aggregateInstalledQty: 0,
    stockArea: "",
    inventoryAddedQty: 0,
    createdAt: now,
    updatedAt: now
  };
  item.lastRequestId = id;
  item.request = "";
  item.requestPhoto = "";
  item.requestStatus = "shop";
  item.updatedAt = now;
  saveState();
  return state.requests[id];
}

function upsertNodeWalkRequest(equipmentId, nodeIndex, date, item) {
  state.requests ||= {};
  const text = String(item.request || "").trim();
  const id = requestId(equipmentId, nodeIndex, date, "to");
  if (!text) {
    delete state.requests[id];
    saveState();
    return null;
  }
  const eq = equipmentById(equipmentId);
  const old = state.requests[id] || {};
  item.requestStatus ||= old.status || "shop";
  setRequestStatus(item);
  state.requests[id] = {
    ...old,
    id,
    equipmentId,
    nodeIndex,
    date,
    kind: "to",
    equipment: eq?.name || "",
    area: eq?.area || "",
    node: eq?.nodes[nodeIndex] || "",
    comment: commentsSummary(item) || item.comment || "",
    commentPhoto: item.commentPhoto || old.commentPhoto || "",
    text,
    requestPhoto: item.requestPhoto || old.requestPhoto || "",
    invoicePhoto: old.invoicePhoto || item.invoicePhoto || "",
    noInvoiceApproved: Boolean(old.noInvoiceApproved || item.noInvoiceApproved),
    price: old.price || item.price || "",
    supplier: old.supplier || item.supplier || "",
    status: old.status || item.requestStatus || "shop",
    shopApproved: Boolean(old.shopApproved || item.shopApproved),
    engineerApproved: Boolean(old.engineerApproved || item.engineerApproved),
    supplyPrepared: Boolean(old.supplyPrepared || item.supplyPrepared),
    financeApproved: Boolean(old.financeApproved || item.financeApproved),
    cashApproved: Boolean(old.cashApproved || item.cashApproved),
    transferredToWarehouse: Boolean(old.transferredToWarehouse || item.transferredToWarehouse),
    warehouseReceived: Boolean(old.warehouseReceived || item.warehouseReceived),
    issued: Boolean(old.issued || item.issued),
    issueTargetRole: old.issueTargetRole || item.issueTargetRole || "",
    issueTargetName: old.issueTargetName || item.issueTargetName || "",
    issueTargetPhone: old.issueTargetPhone || item.issueTargetPhone || "",
    installComment: old.installComment || item.installComment || "",
    aggregateRemarkKey: old.aggregateRemarkKey || item.aggregateRemarkKey || "",
    mechanicInstalled: Boolean(old.mechanicInstalled || item.mechanicInstalled),
    shopInstallApproved: Boolean(old.shopInstallApproved || item.shopInstallApproved),
    productionDirectorApproved: Boolean(old.productionDirectorApproved || item.productionDirectorApproved),
    accountingWrittenOff: Boolean(old.accountingWrittenOff || item.accountingWrittenOff),
    done: Boolean(old.done || item.done),
    stock: Boolean(old.stock || item.stock),
    qtyReceived: Number(old.qtyReceived || item.qtyReceived || 0),
    qtyIssued: Number(old.qtyIssued || item.qtyIssued || 0),
    aggregateInstalledQty: Number(old.aggregateInstalledQty || item.aggregateInstalledQty || 0),
    stockArea: old.stockArea || item.stockArea || "",
    inventoryAddedQty: Number(old.inventoryAddedQty || item.inventoryAddedQty || 0),
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveState();
  return state.requests[id];
}

function allRequests() {
  state.requests ||= {};
  const map = { ...(state.requests || {}) };
  Object.entries(state.checks).forEach(([baseKey, rec]) => {
    const [equipmentId, nodeIndex, date] = baseKey.split(":");
    ["to"].forEach(kind => {
      if (!rec || !rec[kind]) return;
      const req = requestFromRecord(`${baseKey}:${kind}`, rec[kind], Number(equipmentId), Number(nodeIndex), date, kind);
      if (req) map[req.id] = { ...req, ...(map[req.id] || {}) };
    });
  });
  state.requests = map;
  return Object.values(map)
    .filter(req => req && req.text && req.id)
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
}

function relatedIssuedRequestForNode(equipmentId, nodeIndex, date, item) {
  const candidates = Object.values(state.requests || {}).filter(req =>
    Number(req.equipmentId) === Number(equipmentId)
    && Number(req.nodeIndex) === Number(nodeIndex)
    && req.date === date
    && req.issued
    && !req.stock
    && !req.done
    && !req.accountingWrittenOff
  );
  if (item?.lastRequestId) {
    const exact = candidates.find(req => req.id === item.lastRequestId);
    if (exact) return exact;
  }
  return candidates.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))[0] || null;
}

function askCommentOrRequest() {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "send-kind-overlay";
    const close = value => {
      overlay.remove();
      resolve(value);
    };
    const showConfirm = kind => {
      const label = kind === "request" ? "заявку" : "замечание";
      overlay.innerHTML = `
        <div class="send-kind-dialog" role="dialog" aria-modal="true">
          <strong>Точно отправить ${label}?</strong>
          <div class="send-kind-actions">
            <button type="button" data-send-confirm>Отправить</button>
            <button type="button" data-send-cancel>Отмена</button>
          </div>
        </div>
      `;
      overlay.querySelector("[data-send-confirm]").addEventListener("click", () => close(kind));
      overlay.querySelector("[data-send-cancel]").addEventListener("click", () => close(null));
    };
    overlay.innerHTML = `
      <div class="send-kind-dialog" role="dialog" aria-modal="true">
        <strong>Что отправить?</strong>
        <div class="send-kind-actions">
          <button type="button" data-send-comment>Замечание</button>
          <button type="button" data-send-request>Заявка</button>
          <button type="button" data-send-cancel>Отмена</button>
        </div>
      </div>
    `;
    overlay.querySelector("[data-send-comment]").addEventListener("click", () => showConfirm("comment"));
    overlay.querySelector("[data-send-request]").addEventListener("click", () => showConfirm("request"));
    overlay.querySelector("[data-send-cancel]").addEventListener("click", () => close(null));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close(null);
    });
    document.body.append(overlay);
  });
}

function requestMatchesRole(req, role) {
  if (role === "all") return true;
  if (canConfirmIssuedInstall(req, role)) return true;
  if (role === "shop") return (!req.issued && !req.shopApproved) || (req.mechanicInstalled && !req.shopInstallApproved && !req.done);
  if (role === "engineer") return (req.mechanicInstalled && !req.shopInstallApproved && !req.done) || (req.shopApproved && !req.engineerApproved);
  if (role === "supply") return (req.engineerApproved && !req.supplyPrepared) || (req.cashApproved && !req.transferredToWarehouse);
  if (role === "finance") return req.supplyPrepared && !req.financeApproved;
  if (role === "cash") return req.financeApproved && !req.cashApproved;
  if (role === "warehouse") return ((req.transferredToWarehouse || req.warehouseAsk) && !req.issued && !req.stock && !req.done)
    || (req.cashApproved && !req.transferredToWarehouse && !req.invoicePhoto && !req.noInvoiceApproved);
  if (role === "productionDirector") return req.shopInstallApproved && !req.productionDirectorApproved && !req.stock && !req.done;
  if (role === "accounting") return req.productionDirectorApproved && !req.accountingWrittenOff && !req.stock;
  return false;
}

function requestNeedsRole(req, role) {
  if (role === "all") return true;
  if (canConfirmIssuedInstall(req, role)) return true;
  if (role === "shop") return (!req.issued && !req.shopApproved) || (req.mechanicInstalled && !req.shopInstallApproved && !req.done);
  if (role === "warehouse") return ((req.transferredToWarehouse || req.warehouseAsk) && !req.issued && !req.stock && !req.done)
    || (req.cashApproved && !req.transferredToWarehouse && !req.invoicePhoto && !req.noInvoiceApproved);
  if (role === "productionDirector") return req.shopInstallApproved && !req.productionDirectorApproved && !req.stock && !req.done;
  if (role === "accounting") return req.productionDirectorApproved && !req.accountingWrittenOff && !req.stock;
  return requestMatchesRole(req, role);
}

function requestRoleLabel(role) {
  return {
    all: "Все",
    shop: "Начальник",
    confirmInstall: "Начальник/Инженер",
    engineer: "Инженер",
    supply: "Снабжение",
    finance: "Экономист",
    cash: "Касса",
    productionDirector: "Директор производства",
    accounting: "Бухгалтерия",
    warehouse: "Склад",
    mechanic: "Механик"
  }[role] || role;
}

function waitingRole(req) {
  if (req.stock || req.done) return "done";
  if (req.productionDirectorApproved && !req.accountingWrittenOff) return "accounting";
  if (req.shopInstallApproved && !req.productionDirectorApproved) return "productionDirector";
  if (req.mechanicInstalled && !req.shopInstallApproved && !req.done) return "confirmInstall";
  if (req.issued && !req.mechanicInstalled) return warehouseIssueTargetRole(req);
  if (req.transferredToWarehouse && !req.warehouseReceived) return "warehouse";
  if (req.warehouseReceived && !req.issued) return "warehouse";
  if (!req.shopApproved) return "shop";
  if (!req.engineerApproved) return "engineer";
  if (req.engineerApproved && !req.supplyPrepared) return "supply";
  if (req.supplyPrepared && !req.financeApproved) return "finance";
  if (req.financeApproved && !req.cashApproved) return "cash";
  if (req.cashApproved && !req.transferredToWarehouse) return "supply";
  return "done";
}

function quantityText(req) {
  const received = Number(req.qtyReceived || 0);
  const issued = Number(req.qtyIssued || 0);
  if (!received && !issued) return "";
  const left = Math.max(received - issued, 0);
  return `Получено: ${received} шт. · Выдано: ${issued} шт. · Осталось: ${left} шт.`;
}

function financeInfoText(req) {
  const price = String(req.price || "").trim();
  const supplier = String(req.supplier || "").trim();
  if (!price && !supplier) return "";
  return [
    price ? `Цена: ${price}` : "",
    supplier ? `Поставщик: ${supplier}` : ""
  ].filter(Boolean).join(" · ");
}

function renderPhotoPreview(container, src, label) {
  if (!container) return;
  container.innerHTML = src ? `
    <img src="${src}" alt="${label}">
    <button type="button" data-clear-photo="${label}">Удалить фото</button>
  ` : "";
}

function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ""));
      img.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function downtimes() {
  state.downtimes ||= [];
  return state.downtimes;
}

function downtimeKey(equipmentId, nodeIndex) {
  return `${equipmentId}:${nodeIndex}`;
}

function activeDowntime(equipmentId, nodeIndex) {
  const keyValue = downtimeKey(equipmentId, nodeIndex);
  return downtimes().find(item => item.key === keyValue && !item.endedAt) || null;
}

function downtimeDurationMs(item, endTime = Date.now()) {
  const start = new Date(item.startedAt).getTime();
  const end = item.endedAt ? new Date(item.endedAt).getTime() : endTime;
  return Math.max(end - start, 0);
}

function durationText(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours} ч ${minutes} мин`;
  if (hours) return `${hours} ч`;
  return `${minutes} мин`;
}

function downtimeTypeLabel(type) {
  if (type === "remark") return "Замечание";
  return type === "production" ? "Производство" : "Поломка";
}

function chooseDowntimeType() {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "downtime-type-overlay";
    overlay.innerHTML = `
      <div class="downtime-type-dialog" role="dialog" aria-modal="true">
        <strong>Тип остановки</strong>
        <p>Выберите, почему остановлен узел.</p>
        <button type="button" data-downtime-type="production">Производство</button>
        <button type="button" data-downtime-type="breakdown">Поломка</button>
        <button type="button" data-downtime-type="">Отмена</button>
      </div>
    `;
    overlay.addEventListener("click", event => {
      const button = event.target.closest("[data-downtime-type]");
      if (!button) return;
      const type = button.dataset.downtimeType || "";
      overlay.remove();
      resolve(type);
    });
    document.body.append(overlay);
    overlay.querySelector("[data-downtime-type='production']")?.focus();
  });
}

function monthRange(year, month) {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

function downtimeOverlapMs(item, year = current.downtimeYear, month = current.downtimeMonth) {
  const { start, end } = monthRange(year, month);
  const itemStart = new Date(item.startedAt).getTime();
  const itemEnd = item.endedAt ? new Date(item.endedAt).getTime() : Date.now();
  const from = Math.max(itemStart, start.getTime());
  const to = Math.min(itemEnd, end.getTime());
  return Math.max(to - from, 0);
}

function downtimeMonthItems(area = "", year = current.downtimeYear, month = current.downtimeMonth) {
  const stoppedItems = downtimes()
    .map(item => ({ ...item, monthMs: downtimeOverlapMs(item, year, month) }))
    .filter(item => item.monthMs > 0 && (!area || item.area === area));
  return stoppedItems;
}

function downtimeChartAreas() {
  return [...new Set([
    ...AREAS,
    ...allEquipment().map(item => item.area),
    ...downtimeMonthItems().map(item => item.area)
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
}

function downtimeAreaStats(area) {
  const { start, end } = monthRange(current.downtimeYear, current.downtimeMonth);
  const monthMs = end.getTime() - start.getTime();
  const items = downtimeMonthItems(area);
  const totalMs = items.reduce((sum, item) => sum + item.monthMs, 0);
  const productionMs = items
    .filter(item => item.type === "production")
    .reduce((sum, item) => sum + item.monthMs, 0);
  const breakdownMs = items
    .filter(item => item.type !== "production" && item.type !== "remark")
    .reduce((sum, item) => sum + item.monthMs, 0);
  const remarkMs = items
    .filter(item => item.type === "remark")
    .reduce((sum, item) => sum + item.monthMs, 0);
  return {
    area,
    items,
    totalMs,
    productionMs,
    breakdownMs,
    remarkMs,
    percent: monthMs ? (totalMs / monthMs) * 100 : 0,
    productionPercent: monthMs ? (productionMs / monthMs) * 100 : 0,
    breakdownPercent: monthMs ? (breakdownMs / monthMs) * 100 : 0,
    remarkPercent: monthMs ? (remarkMs / monthMs) * 100 : 0
  };
}

function downtimeAreaColor(area) {
  const index = downtimeChartAreas().indexOf(area);
  return index >= 0 ? DOWNTIME_COLORS[index % DOWNTIME_COLORS.length] : "";
}

function equipmentRowColor(eq) {
  const sameAreaCount = allEquipment().filter(item => item.area === eq.area).length;
  const isReserveEquipment = sameAreaCount > 1 && /^оборудование\s+\d+$/i.test(String(eq.name || "").trim());
  if (!isReserveEquipment) return downtimeAreaColor(eq.area);
  const index = allEquipment()
    .filter(item => item.area === eq.area)
    .sort((a, b) => a.id - b.id)
    .findIndex(item => item.id === eq.id);
  return index >= 0 ? DOWNTIME_COLORS[(downtimeChartAreas().length + index) % DOWNTIME_COLORS.length] : downtimeAreaColor(eq.area);
}

function downtimePieSlicePath(cx, cy, radius, startAngle, endAngle) {
  const start = polarPoint(cx, cy, radius, endAngle);
  const end = polarPoint(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function polarPoint(cx, cy, radius, angle) {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  };
}

function downtimePieChart(stats) {
  const activeStats = stats.filter(item => item.totalMs > 0);
  const { start, end } = monthRange(current.downtimeYear, current.downtimeMonth);
  const monthMs = end.getTime() - start.getTime();
  if (!monthMs || !activeStats.length) {
    return `<div class="empty-state">За выбранный месяц простоев нет</div>`;
  }
  const colors = DOWNTIME_COLORS;
  let angle = 0;
  let usedMonthMs = 0;
  const slices = activeStats.map((item, index) => {
    const sliceMs = Math.min(item.totalMs, Math.max(monthMs - usedMonthMs, 0));
    usedMonthMs += sliceMs;
    const portion = sliceMs / monthMs;
    const start = angle;
    const end = angle + portion * 360;
    angle = end;
    const mid = start + (end - start) / 2;
    const labelPoint = polarPoint(120, 120, 62, mid);
    const percent = Math.round((item.totalMs / monthMs) * 100);
    const selected = current.selectedDowntimeArea === item.area;
    const overLimit = item.totalMs > DOWNTIME_MONTH_LIMIT_MS;
    return `
      <g class="downtime-pie-slice ${selected ? "active" : ""} ${overLimit ? "limit-exceeded" : ""}" data-downtime-area="${escapeHtml(item.area)}">
        <path d="${downtimePieSlicePath(120, 120, 96, start, end)}" fill="${colors[index % colors.length]}"></path>
        ${percent >= 3 ? `<text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle" dominant-baseline="middle">${percent} %</text>` : ""}
      </g>
    `;
  }).join("");
  const restMs = Math.max(monthMs - usedMonthMs, 0);
  const restSlice = restMs > 0 ? `
    <g class="downtime-pie-rest">
      <path d="${downtimePieSlicePath(120, 120, 96, angle, 360)}" fill="#e5e7eb"></path>
    </g>
  ` : "";
  const legend = activeStats.map((item, index) => {
    const percent = Math.round((item.totalMs / monthMs) * 100);
    const overLimit = item.totalMs > DOWNTIME_MONTH_LIMIT_MS;
    return `
      <button type="button" class="downtime-legend-item ${current.selectedDowntimeArea === item.area ? "active" : ""} ${overLimit ? "limit-exceeded" : ""}" data-downtime-area="${escapeHtml(item.area)}">
        <i style="background:${colors[index % colors.length]}"></i>
        <span>${escapeHtml(item.area)}</span>
        <strong>${percent}% · ${durationText(item.totalMs)}${overLimit ? " · превышен лимит 125 ч" : ""}</strong>
      </button>
    `;
  }).join("");
  return `
    <div class="downtime-pie-wrap">
      <div class="downtime-pie-note">Весь круг - выбранный месяц. Цветной сектор цеха показывает его простой за месяц. Лимит: 125 часов на цех; превышение мигает.</div>
      <svg class="downtime-pie" viewBox="0 0 240 240" role="img" aria-label="Проценты простоев по цехам">
        ${slices}
        ${restSlice}
      </svg>
      <div class="downtime-pie-legend">${legend}</div>
    </div>
  `;
}

function openDowntime(equipmentId, nodeIndex, comment, type = "breakdown") {
  const eq = equipmentById(equipmentId);
  if (!eq) return;
  state.downtimes ||= [];
  const item = {
    id: `downtime:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    key: downtimeKey(equipmentId, nodeIndex),
    equipmentId,
    nodeIndex,
    area: eq.area || "",
    equipment: eq.name || "",
    node: eq.nodes[nodeIndex] || "",
    startedAt: new Date().toISOString(),
    endedAt: "",
    type: type === "production" ? "production" : "breakdown",
    comment: String(comment || "").trim(),
    authorName: profile?.name || "",
    authorRole: profile?.role || "",
    closedByName: "",
    closedByRole: ""
  };
  state.downtimes.unshift(item);
  saveState();
}

function closeDowntime(item, comment = "") {
  if (!item || item.endedAt) return;
  item.endedAt = new Date().toISOString();
  item.closeComment = String(comment || "").trim();
  item.closedByName = profile?.name || "";
  item.closedByRole = profile?.role || "";
  saveState();
}

async function toggleDowntime(equipmentId, nodeIndex) {
  const active = activeDowntime(equipmentId, nodeIndex);
  if (active) {
    const comment = window.prompt("Комментарий к пуску. Без комментария пуск не сохраняем.");
    if (!String(comment || "").trim()) return;
    closeDowntime(active, comment);
    appendDowntimeCommentToNode(equipmentId, nodeIndex, current.date, "Пуск", comment);
    saveState();
    renderChecklist();
    return;
  }
  const type = await chooseDowntimeType();
  if (!type) return;
  const comment = window.prompt("Причина простоя. Без комментария остановку не сохраняем.");
  if (!String(comment || "").trim()) return;
  openDowntime(equipmentId, nodeIndex, comment, type);
  appendDowntimeCommentToNode(equipmentId, nodeIndex, current.date, "Стоп", comment);
  saveState();
  renderChecklist();
}

function updateDowntimeBadge() {
  if (!ui.downtimeBadge || !ui.downtimeOpenButton) return;
  const count = downtimes().filter(item => !item.endedAt).length;
  ui.downtimeBadge.textContent = count;
  ui.downtimeOpenButton.classList.toggle("request-alert", count > 0);
}

function inventoryKey(area, name) {
  return `${area}::${String(name || "").trim().toLowerCase()}`;
}

function partNameFromRequest(req) {
  return String(req.text || "").trim() || "Запчасть без названия";
}

function inventoryItems() {
  state.inventory ||= {};
  return Object.values(state.inventory)
    .filter(item => item && item.name && Number(item.qty || 0) > 0)
    .sort((a, b) => String(b.lastReceivedAt || b.updatedAt || "").localeCompare(String(a.lastReceivedAt || a.updatedAt || "")) || `${a.area} ${a.name}`.localeCompare(`${b.area} ${b.name}`, "ru"));
}

function warehouseFolderArea() {
  return current.selectedWarehouseFolder || current.selectedStockArea || COMMON_WAREHOUSE;
}

function inventoryItemsByArea(area) {
  return inventoryItems().filter(item => item.area === area && Number(item.qty || 0) > 0);
}

function warehouseFolderStats(area) {
  const items = inventoryItemsByArea(area);
  const pending = Object.values(state.requests || {}).filter(req =>
    req.transferredToWarehouse && !req.warehouseReceived && (req.stockArea || req.area || COMMON_WAREHOUSE) === area
  ).length;
  return {
    positions: items.length,
    qty: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    pending
  };
}

function renderWarehouseFolders(selectedArea = warehouseFolderArea()) {
  return `
    <div class="warehouse-folders">
      ${WAREHOUSE_AREAS.map(area => {
        const stats = warehouseFolderStats(area);
        return `
          <button type="button" data-warehouse-folder="${escapeHtml(area)}" class="${area === selectedArea ? "active" : ""} ${stats.pending ? "request-alert" : ""}">
            <span>${escapeHtml(area)}</span>
            <strong>${stats.positions} поз. · ${stats.qty} шт${stats.pending ? ` · приход ${stats.pending}` : ""}</strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderWarehouseInventory(area = warehouseFolderArea(), canManageWarehouse = false) {
  const items = inventoryItemsByArea(area);
  const q = String(current.warehouseSearch || "").trim().toLowerCase();
  return `
    <div class="warehouse-stock-folder">
      <div class="warehouse-stock-head">
        <strong>Склад: ${escapeHtml(area)}</strong>
        <span>${items.length ? `${items.length} позиций` : "Пока пусто"}</span>
      </div>
      ${items.length ? items.map(item => `
        <div class="warehouse-stock-row ${q && `${item.name} ${item.source || ""}`.toLowerCase().includes(q) ? "search-hit" : ""}" data-stock-row="${escapeHtml(item.id)}">
          <div>
            <span>${escapeHtml(item.name)}</span>
            <small>${escapeHtml(item.source || "")}</small>
            <small>Приход: ${escapeHtml(dateTimeHuman(item.lastReceivedAt || item.updatedAt || ""))}${item.lastStockAt ? ` · В запас: ${escapeHtml(dateTimeHuman(item.lastStockAt))}` : ""}</small>
            <small>Получено: ${Number(item.receivedQty || (Number(item.qty || 0) + Number(item.issuedQty || 0)))} шт · Выдано: ${Number(item.issuedQty || 0)} шт · Осталось: ${Number(item.qty || 0)} шт</small>
          </div>
          <strong>${Number(item.qty || 0)} шт</strong>
          <div class="stock-row-actions">
            <input data-stock-qty="${escapeHtml(item.id)}" type="number" min="1" max="${Number(item.qty || 0)}" value="1">
            ${canManageWarehouse ? `
              <select data-stock-target="${escapeHtml(item.id)}">${warehouseOptions(item.area)}</select>
              <button type="button" data-stock-move="${escapeHtml(item.id)}">Перенести</button>
              <select data-stock-role="${escapeHtml(item.id)}">${warehouseIssueRoleOptions("mechanic")}</select>
              <button type="button" data-stock-issue="${escapeHtml(item.id)}">Выдать роли</button>
            ` : `<button type="button" data-stock-ask="${escapeHtml(item.id)}">Спросить</button>`}
          </div>
        </div>
      `).join("") : `<div class="empty-state">На этом складе пока нет остатков</div>`}
    </div>
  `;
}

function pendingWarehouseReceipts(area = warehouseFolderArea()) {
  const q = String(current.warehouseSearch || "").trim();
  return allRequests()
    .filter(req => requestVisibleForRole(req, "warehouse"))
    .filter(req => ((req.transferredToWarehouse && !req.warehouseReceived) || req.warehouseAsk) && !req.issued && !req.stock && !req.done)
    .filter(req => (req.stockArea || req.area || COMMON_WAREHOUSE) === area)
    .filter(req => requestMatchesWarehouseSearch(req, q))
    .sort((a, b) => String(b.updatedAt || b.createdAt || b.date).localeCompare(String(a.updatedAt || a.createdAt || a.date)));
}

function needsWarehouseNoInvoiceConfirmation(req) {
  return Boolean(req.cashApproved && !req.transferredToWarehouse && !req.invoicePhoto && !req.noInvoiceApproved);
}

function pendingWarehouseConfirmations() {
  const q = String(current.warehouseSearch || "").trim();
  return allRequests()
    .filter(req => requestVisibleForRole(req, "warehouse"))
    .filter(req => needsWarehouseNoInvoiceConfirmation(req))
    .filter(req => requestMatchesWarehouseSearch(req, q))
    .sort((a, b) => String(b.updatedAt || b.createdAt || b.date).localeCompare(String(a.updatedAt || a.createdAt || a.date)));
}

function addInventory(area, name, qty, source = "", meta = {}) {
  state.inventory ||= {};
  const cleanArea = area || "Общий склад";
  const cleanName = String(name || "").trim();
  const amount = Number(qty || 0);
  if (!cleanName || amount <= 0) return null;
  const id = inventoryKey(cleanArea, cleanName);
  const now = new Date().toISOString();
  const old = state.inventory[id] || { id, area: cleanArea, name: cleanName, qty: 0, source: "" };
  state.inventory[id] = {
    ...old,
    area: cleanArea,
    name: cleanName,
    qty: Number(old.qty || 0) + amount,
    receivedQty: Number(old.receivedQty || (Number(old.qty || 0) + Number(old.issuedQty || 0))) + amount,
    issuedQty: Number(old.issuedQty || 0),
    source: source || old.source || "",
    firstReceivedAt: old.firstReceivedAt || now,
    lastReceivedAt: now,
    lastStockAt: meta.stockAt || old.lastStockAt || "",
    updatedAt: now
  };
  return state.inventory[id];
}

function removeInventory(area, name, qty, countIssued = false) {
  state.inventory ||= {};
  const id = inventoryKey(area || "Общий склад", name);
  const item = state.inventory[id];
  const amount = Number(qty || 0);
  if (!item || amount <= 0) return false;
  const removed = Math.min(amount, Number(item.qty || 0));
  if (removed <= 0) return false;
  item.qty = Math.max(Number(item.qty || 0) - removed, 0);
  if (countIssued) {
    item.issuedQty = Number(item.issuedQty || 0) + removed;
    item.lastIssuedAt = new Date().toISOString();
  }
  item.updatedAt = new Date().toISOString();
  if (item.qty <= 0) item.qty = 0;
  return removed;
}

function createMechanicIssueFromInventory(item, qty, targetRole = "mechanic") {
  const amount = Number(qty || 0);
  if (!item || amount <= 0) return false;
  const cleanTargetRole = canReceiveWarehouseIssue(targetRole) ? targetRole : "mechanic";
  const removed = removeInventory(item.area, item.name, amount, true);
  if (!removed) return false;
  const issuedAmount = Number(removed || 0);
  const id = `stock-issue:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  state.requests ||= {};
  state.requests[id] = {
    id,
    equipmentId: "",
    nodeIndex: "",
    date: todayISO(),
    kind: "stock",
    equipment: `Склад: ${item.area}`,
    area: item.area,
    node: item.source || "Ручная выдача со склада",
    comment: "Выдано из складского остатка",
    text: item.name,
    status: "issued",
    shopApproved: true,
    engineerApproved: true,
    supplyPrepared: true,
    financeApproved: true,
    cashApproved: true,
    transferredToWarehouse: true,
    warehouseReceived: true,
    issued: true,
    issueTargetRole: cleanTargetRole,
    issueTargetName: "",
    issueTargetPhone: "",
    installComment: "",
    aggregateRemarkKey: "",
    mechanicInstalled: false,
    shopInstallApproved: false,
    productionDirectorApproved: false,
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: issuedAmount,
    qtyIssued: issuedAmount,
    aggregateInstalledQty: 0,
    stockArea: item.area,
    inventoryAddedQty: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return true;
}

function createWarehouseAskFromInventory(item, qty) {
  const amount = Number(qty || 0);
  if (!item || amount <= 0 || !canReceiveWarehouseIssue(profile?.role)) return false;
  const askedAmount = Math.min(amount, Number(item.qty || 0));
  if (askedAmount <= 0) return false;
  const id = `warehouse-ask:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  state.requests ||= {};
  state.requests[id] = {
    id,
    equipmentId: "",
    nodeIndex: "",
    date: todayISO(),
    kind: "stock",
    equipment: `Склад: ${item.area}`,
    area: item.area,
    node: item.source || "Запрос со склада",
    comment: `${ROLE_ACCESS[profile.role]?.label || profile.role}: ${profile.name || ""}`,
    text: item.name,
    status: "warehouse",
    shopApproved: true,
    engineerApproved: true,
    supplyPrepared: true,
    financeApproved: true,
    cashApproved: true,
    transferredToWarehouse: true,
    warehouseReceived: true,
    warehouseAsk: true,
    issued: false,
    issueTargetRole: profile.role,
    issueTargetName: profile.name || "",
    issueTargetPhone: profile.phone || "",
    installComment: "",
    aggregateRemarkKey: "",
    mechanicInstalled: false,
    shopInstallApproved: false,
    productionDirectorApproved: false,
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: askedAmount,
    qtyIssued: askedAmount,
    aggregateInstalledQty: 0,
    stockArea: item.area,
    inventoryAddedQty: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return true;
}

function createManualWarehouseRequest(area, name, qty, note) {
  const cleanName = String(name || "").trim();
  const amount = Number(qty || 0);
  if (!cleanName || amount <= 0) return null;
  const id = `manual-warehouse:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  state.requests ||= {};
  state.requests[id] = {
    id,
    equipmentId: "",
    nodeIndex: "",
    date: todayISO(),
    kind: "manual",
    equipment: "Ручной приход на склад",
    area: area || COMMON_WAREHOUSE,
    node: note || "Добавлено складовщиком вручную",
    comment: note || "Ручное добавление",
    text: cleanName,
    price: "",
    supplier: "Ручное добавление",
    status: "waitingWarehouse",
    shopApproved: true,
    engineerApproved: true,
    supplyPrepared: true,
    financeApproved: true,
    cashApproved: true,
    transferredToWarehouse: true,
    warehouseReceived: false,
    issued: false,
    issueTargetRole: "",
    issueTargetName: "",
    issueTargetPhone: "",
    installComment: "",
    aggregateRemarkKey: "",
    mechanicInstalled: false,
    shopInstallApproved: false,
    productionDirectorApproved: false,
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: amount,
    qtyIssued: 0,
    aggregateInstalledQty: 0,
    stockArea: area || COMMON_WAREHOUSE,
    inventoryAddedQty: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return state.requests[id];
}

function warehouseOptions(selectedArea = "") {
  return WAREHOUSE_AREAS.map(area => `<option value="${area}" ${area === selectedArea ? "selected" : ""}>${area}</option>`).join("");
}

function requestMatchesWarehouseSearch(req, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const text = [
    req.text,
    req.equipment,
    req.node,
    req.comment,
    req.area,
    req.stockArea,
    req.supplier
  ].join(" ").toLowerCase();
  return text.includes(q);
}

function requestRoleCounts() {
  const all = allRequests();
  const roles = ["shop", "engineer", "supply", "finance", "cash", "warehouse", "mechanic", "productionDirector", "accounting"];
  const counts = { all: all.filter(req => requestVisibleForRole(req, "all")).length };
  roles.forEach(role => {
    counts[role] = all.filter(req => requestVisibleForRole(req, role) && requestNeedsRole(req, role)).length;
  });
  return counts;
}

function updateRoleBadges() {
  const counts = requestRoleCounts();
  document.querySelectorAll("[data-open-role], .request-tabs .tab[data-role]").forEach(button => {
    const role = button.dataset.openRole || button.dataset.role;
    button.hidden = !canOpenRequestRole(role);
    const waiting = counts[role] || 0;
    const label = requestRoleLabel(role);
    button.innerHTML = `<span>${label}</span><strong>${waiting}</strong>`;
    button.classList.toggle("request-alert", waiting > 0 && role !== "all");
    button.classList.toggle("has-count", waiting > 0);
  });
}

function getRequestKindById(id) {
  const [equipmentId, nodeIndex, date, kind] = id.split(":");
  return record(Number(equipmentId), Number(nodeIndex), date)[kind];
}

function syncRequestToRecord(req) {
  state.requests ||= {};
  setRequestStatus(req);
  req.status = req.requestStatus || req.status || "shop";
  req.updatedAt = new Date().toISOString();
  state.requests[req.id] = req;
  if (String(req.id || "").startsWith("stock-issue:") || String(req.id || "").startsWith("manual-warehouse:") || String(req.id || "").includes(":req:")) return;
  const kind = getRequestKindById(req.id);
  kind.request = req.text;
  kind.comment = req.comment;
  kind.commentPhoto = req.commentPhoto || "";
  kind.requestPhoto = req.requestPhoto || "";
  kind.invoicePhoto = req.invoicePhoto || "";
  kind.noInvoiceApproved = Boolean(req.noInvoiceApproved);
  kind.price = req.price;
  kind.supplier = req.supplier;
  kind.requestStatus = req.status;
  kind.shopApproved = req.shopApproved;
  kind.engineerApproved = req.engineerApproved;
  kind.supplyPrepared = req.supplyPrepared;
  kind.financeApproved = req.financeApproved;
  kind.cashApproved = req.cashApproved;
  kind.transferredToWarehouse = req.transferredToWarehouse;
  kind.warehouseReceived = req.warehouseReceived;
  kind.issued = req.issued;
  kind.issueTargetRole = req.issueTargetRole || (req.issued ? "mechanic" : "");
  kind.issueTargetName = req.issueTargetName || "";
  kind.issueTargetPhone = req.issueTargetPhone || "";
  kind.installComment = req.installComment || "";
  kind.aggregateRemarkKey = req.aggregateRemarkKey || "";
  kind.mechanicInstalled = req.mechanicInstalled;
  kind.shopInstallApproved = req.shopInstallApproved;
  kind.productionDirectorApproved = req.productionDirectorApproved;
  kind.accountingWrittenOff = req.accountingWrittenOff;
  kind.done = req.done;
  kind.stock = req.stock;
  kind.qtyReceived = Number(req.qtyReceived || 0);
  kind.qtyIssued = Number(req.qtyIssued || 0);
  kind.aggregateInstalledQty = Number(req.aggregateInstalledQty || 0);
  kind.stockArea = req.stockArea || "";
  kind.inventoryAddedQty = Number(req.inventoryAddedQty || 0);
  if (req.done || req.stock) kind.resolved = true;
}

function setRequestStatus(reqKind) {
  if (reqKind.stock) reqKind.requestStatus = "stock";
  else if (reqKind.done) reqKind.requestStatus = "done";
  else if (reqKind.accountingWrittenOff) reqKind.requestStatus = "done";
  else if (reqKind.productionDirectorApproved) reqKind.requestStatus = "accounting";
  else if (reqKind.shopInstallApproved) reqKind.requestStatus = "productionDirector";
  else if (reqKind.mechanicInstalled) reqKind.requestStatus = "waitingShopDone";
  else if (reqKind.issued) reqKind.requestStatus = "issued";
  else if (reqKind.warehouseReceived) reqKind.requestStatus = "warehouse";
  else if (reqKind.transferredToWarehouse) reqKind.requestStatus = "waitingWarehouse";
  else if (reqKind.cashApproved) reqKind.requestStatus = "cashApproved";
  else if (reqKind.financeApproved) reqKind.requestStatus = "cash";
  else if (reqKind.supplyPrepared) reqKind.requestStatus = "finance";
  else if (reqKind.engineerApproved) reqKind.requestStatus = "supply";
  else if (reqKind.shopApproved) reqKind.requestStatus = "engineer";
  else reqKind.requestStatus = "shop";
}

function requestWaitingForShopInitial(req) {
  return !req.issued && !req.shopApproved && !req.done && !req.stock;
}

function requestWaitingForInstallApproval(req) {
  return req.mechanicInstalled && !req.shopInstallApproved && !req.done && !req.stock;
}

function requestWaitingForEngineerInitial(req) {
  return req.shopApproved && !req.engineerApproved && !req.done && !req.stock;
}

function requestWaitingForSupplyPrepare(req) {
  return req.engineerApproved && !req.supplyPrepared && !req.done && !req.stock;
}

function requestWaitingForSupplyWarehouse(req) {
  return req.cashApproved && !req.transferredToWarehouse && !req.done && !req.stock;
}

function requestWaitingForWarehouse(req) {
  return req.transferredToWarehouse && !req.issued && !req.stock && !req.done;
}

function statusText(status) {
  if (status === "stock") return "В запасе";
  return {
    created: "Создана",
    shop: "Ожидает начальника",
    engineer: "Ожидает инженера",
    supply: "В снабжении",
    finance: "Ожидает экономиста",
    financeApproved: "Подписана экономистом",
    cash: "Ожидает кассу",
    cashApproved: "Оплачено кассой",
    waitingWarehouse: "Передано на склад",
    warehouse: "На складе",
    issued: "Выдано сотруднику",
    waitingShopDone: "Ждет подтверждения установки",
    productionDirector: "Ждет директора производства",
    accounting: "Ждет списания бухгалтерией",
    done: "Выполнено"
  }[status] || status;
}

function equipmentById(id) {
  return allEquipment().find(item => item.id === id);
}

function statusForRecord(rec) {
  if (isNodeChecked(rec)) return "ТО";
  return "";
}

function plannedStatus(day) {
  return "ТО";
}

function isPlannedDone(rec, planned) {
  if (planned === "ТО") return isNodeChecked(rec);
  return true;
}

function isDueOrPast(date) {
  return date <= todayISO();
}

function isTodayDate(date) {
  return date === todayISO();
}

function hasOpenCommentRecord(rec) {
  return ["to"].some(kind => hasAnyComment(rec?.[kind]) && !rec[kind].resolved);
}

function isActiveRequestSignal(req) {
  const activeStatuses = new Set([
    "shop",
    "engineer",
    "supply",
    "finance",
    "cash",
    "cashApproved",
    "waitingWarehouse",
    "warehouse",
    "issued",
    "waitingShopDone",
    "productionDirector",
    "accounting"
  ]);
  const status = String(req?.status || req?.requestStatus || "");
  return Boolean(
    String(req?.text || req?.request || "").trim()
    && activeStatuses.has(status)
    && !req.done
    && !req.stock
    && !req.accountingWrittenOff
  );
}

function hasActiveRequestRecord(rec) {
  return ["to"].some(kind => {
    const item = rec?.[kind];
    return isActiveRequestSignal(item);
  });
}

function hasActiveRequestForNodeDate(equipmentId, nodeIndex, date) {
  state.requests ||= {};
  return Object.values(state.requests).some(req =>
    Number(req.equipmentId) === Number(equipmentId)
    && Number(req.nodeIndex) === Number(nodeIndex)
    && req.date === date
    && isActiveRequestSignal(req)
  );
}

function hasOpenCommentEquipment(equipmentId) {
  return Object.entries(state.checks).some(([k, rec]) => {
    const [eq] = k.split(":").map(Number);
    return eq === equipmentId && hasOpenCommentRecord(rec);
  });
}

function openCommentCount() {
  return visibleEquipment().filter(eq => hasOpenCommentEquipment(eq.id)).length;
}

function firstOpenCommentTarget() {
  const visibleIds = new Set(visibleEquipment().map(eq => String(eq.id)));
  return Object.entries(state.checks)
    .flatMap(([k, rec]) => {
      const [equipmentId, nodeIndex, date] = k.split(":");
      if (!visibleIds.has(String(equipmentId))) return [];
      return ["to"]
        .filter(kind => hasOpenCommentRecord({ [kind]: rec?.[kind] }))
        .map(kind => ({
          equipmentId: Number(equipmentId),
          nodeIndex: Number(nodeIndex),
          date,
          kind
        }));
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.equipmentId - b.equipmentId || a.nodeIndex - b.nodeIndex)[0] || null;
}

function openFirstComment() {
  const target = firstOpenCommentTarget();
  if (!target) return;
  current.equipmentId = target.equipmentId;
  current.nodeIndex = target.nodeIndex;
  current.date = target.date;
  current.kind = target.kind;
  current.scrollToCommentNode = target.kind === "to" ? target.nodeIndex : null;
  current.scrollToMainComment = target.kind !== "to";
  show("checklist");
}

function show(view, push = true) {
  if (push && current.view !== view) nav.push(current.view);
  current.view = view;
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  document.querySelector(`#${view}Screen`).classList.add("active");
  ui.back.disabled = view === "equipment";
  render();
}

function render() {
  updateDirectorBadge();
  updateDowntimeBadge();
  if (current.view === "equipment") renderEquipment();
  if (current.view === "node") renderNodes();
  if (current.view === "schedule") renderSchedule();
  if (current.view === "checklist") renderChecklist();
  if (current.view === "requests") renderRequests();
  if (current.view === "director") renderDirector();
  if (current.view === "downtime") renderDowntime();
  if (current.view === "aggregateJournal") renderAggregateJournal();
}

function aggregateJournalAreas(equipment = visibleEquipment()) {
  return [...new Set(equipment.map(eq => eq.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
}

function aggregateJournalItems(area) {
  const items = [];
  Object.entries(state.checks || {}).forEach(([recordKey, rec]) => {
    const [equipmentIdRaw, nodeIndexRaw, date] = recordKey.split(":");
    const equipmentId = Number(equipmentIdRaw);
    const nodeIndex = Number(nodeIndexRaw);
    const eq = equipmentById(equipmentId);
    if (!eq || eq.area !== area) return;
    const item = rec?.to;
    if (!item) return;
    visibleCommentEntries(item).forEach((entry, entryIndex) => {
      if (isDowntimeCommentEntry(entry) || !String(entry?.text || "").trim()) return;
      items.push({
        id: `remark:${recordKey}:${entryIndex}`,
        kind: "Замечание",
        equipmentId,
        nodeIndex,
        date,
        equipment: eq.name || "",
        node: eq.nodes[nodeIndex] || "",
        at: entry.at || item.commentUpdatedAt || `${date}T00:00:00.000Z`,
        authorName: entry.name || item.commentOwnerName || "",
        authorRole: entry.role || item.commentOwnerRole || "",
        text: entry.text || "",
        resolved: Boolean(item.resolved || item.resolvedAt),
        resolvedAt: item.resolvedAt || "",
        resolvedByName: item.resolvedByName || "",
        resolvedByRole: item.resolvedByRole || "",
        resolvedComment: item.resolvedComment || "",
        durationMs: Number(item.resolvedDurationMs || 0)
      });
    });
  });
  downtimes().forEach(item => {
    if (item.area !== area || item.type === "production") return;
    items.push({
      id: item.id,
      kind: "Поломка",
      equipmentId: item.equipmentId,
      nodeIndex: item.nodeIndex,
      date: String(item.startedAt || "").slice(0, 10),
      equipment: item.equipment || "",
      node: item.node || "",
      at: item.startedAt || "",
      authorName: item.authorName || "",
      authorRole: item.authorRole || "",
      text: item.comment || "",
      resolved: Boolean(item.endedAt),
      resolvedAt: item.endedAt || "",
      resolvedByName: item.closedByName || "",
      resolvedByRole: item.closedByRole || "",
      resolvedComment: item.closeComment || "",
      durationMs: downtimeDurationMs(item)
    });
  });
  return items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function aggregateRemarkOptions(area = "") {
  return Object.entries(state.checks || {})
    .map(([recordKey, rec]) => {
      const [equipmentIdRaw, nodeIndexRaw, date] = recordKey.split(":");
      const equipmentId = Number(equipmentIdRaw);
      const nodeIndex = Number(nodeIndexRaw);
      const eq = equipmentById(equipmentId);
      const item = rec?.to;
      if (!eq || !item || item.resolved || item.mechanicFixed || !hasAnyComment(item)) return null;
      if (area && eq.area !== area) return null;
      const entries = visibleCommentEntries(item)
        .filter(entry => !isDowntimeCommentEntry(entry) && String(entry?.text || "").trim())
        .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      const latestEntry = entries[0];
      if (!latestEntry) return null;
      return {
        key: remarkLinkKey(equipmentId, nodeIndex, date),
        equipmentId,
        nodeIndex,
        date,
        area: eq.area || "",
        equipment: eq.name || "",
        node: eq.nodes[nodeIndex] || "",
        text: latestEntry.text || item.comment || "",
        at: latestEntry.at || item.commentUpdatedAt || `${date}T00:00:00.000Z`
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function requestAggregateLinkKey(req) {
  if (req.aggregateRemarkKey) return req.aggregateRemarkKey;
  if (req.equipmentId !== "" && req.nodeIndex !== "" && req.date) return remarkLinkKey(req.equipmentId, req.nodeIndex, req.date);
  return "";
}

function requestInstalledQty(req) {
  return Number(req.aggregateInstalledQty || req.qtyIssued || req.qtyReceived || 0);
}

function lockRequestInstalledQty(req) {
  if (!req || Number(req.aggregateInstalledQty || 0) > 0) return;
  req.aggregateInstalledQty = Number(req.qtyIssued || req.qtyReceived || 0);
}

function installedPartsForRemark(linkKey) {
  if (!linkKey) return [];
  return allRequests()
    .filter(req => requestAggregateLinkKey(req) === linkKey)
    .filter(req => req.mechanicInstalled || req.shopInstallApproved || req.productionDirectorApproved || req.accountingWrittenOff || req.done)
    .map(req => ({
      name: partNameFromRequest(req),
      qty: requestInstalledQty(req),
      comment: req.installComment || ""
    }))
    .filter(item => item.name && item.qty > 0);
}

function aggregateJournalCount(area) {
  if (area === "\u041a\u043e\u043c\u043f\u0440\u0435\u0441\u0441\u043e\u0440\u043d\u0430\u044f") return compressorJournalFilledRows(area).length;
  return aggregateJournalItems(area).length;
}

const COMPRESSOR_JOURNAL_AREA = "\u041a\u043e\u043c\u043f\u0440\u0435\u0441\u0441\u043e\u0440\u043d\u0430\u044f";
const COMPRESSOR_JOURNAL_COMPRESSORS = ["\u21161 EKOMAK 90", "\u21162 EKOMAK 90", "\u21163 EKOMAK 110"];
const COMPRESSOR_JOURNAL_DAYS_PER_SHEET = 7;

function compressorJournalKey(area, date, compressor) {
  return `${area}::${date}::${compressor}`;
}

function compressorJournalRows(area = COMPRESSOR_JOURNAL_AREA) {
  state.compressorJournal ||= {};
  const days = new Date(current.year, current.month + 1, 0).getDate();
  const rows = [];
  for (let day = 1; day <= days; day++) {
    const date = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    COMPRESSOR_JOURNAL_COMPRESSORS.forEach(compressor => {
      const id = compressorJournalKey(area, date, compressor);
      rows.push({
        id,
        date,
        compressor,
        ...(state.compressorJournal[id] || {})
      });
    });
  }
  return rows;
}

function compressorJournalFilledRows(area = COMPRESSOR_JOURNAL_AREA) {
  return Object.values(state.compressorJournal || {})
    .filter(row => row?.area === area)
    .filter(row => ["shiftTime", "airPressure", "airTemp", "oilPressureTemp", "leakGrounding", "blowTime", "checkedBy"].some(field => String(row[field] || "").trim()));
}

function compressorJournalRowComplete(row) {
  return ["shiftTime", "airPressure", "airTemp", "oilPressureTemp", "leakGrounding", "blowTime", "checkedBy"]
    .every(field => String(row?.[field] || "").trim());
}

function compressorJournalSheetComplete(rows) {
  return rows.length > 0 && rows.every(compressorJournalRowComplete);
}

function compressorJournalDateComplete(area = COMPRESSOR_JOURNAL_AREA, date = todayISO()) {
  const rows = COMPRESSOR_JOURNAL_COMPRESSORS.map(compressor => {
    const id = compressorJournalKey(area, date, compressor);
    return { id, date, compressor, ...(state.compressorJournal?.[id] || {}) };
  });
  return rows.every(compressorJournalRowComplete);
}

function compressorJournalTodayNeedsAttention(area = COMPRESSOR_JOURNAL_AREA) {
  return area === COMPRESSOR_JOURNAL_AREA && !compressorJournalDateComplete(area, todayISO());
}

function localTimeNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function shiftForDate(date = new Date()) {
  const hour = date.getHours();
  return hour >= 8 && hour < 20 ? "\u0434\u0435\u043d\u044c" : "\u043d\u043e\u0447\u044c";
}

function updateCompressorJournalRow(rowId, field, value) {
  state.compressorJournal ||= {};
  const [area, date, compressor] = rowId.split("::");
  const now = new Date();
  const old = state.compressorJournal[rowId] || {};
  const shiftTime = old.shiftTime || `${shiftForDate(now)} ${localTimeNow()}`;
  const checkedBy = old.checkedBy || profile?.name || "";
  const nextRow = {
    ...old,
    id: rowId,
    area,
    date,
    compressor,
    shiftTime,
    checkedBy,
    [field]: value,
    blowTime: localTimeNow(),
    updatedAt: now.toISOString(),
    updatedByName: profile?.name || "",
    updatedByRole: profile?.role || ""
  };
  const hasManualValue = ["airPressure", "airTemp", "oilPressureTemp", "leakGrounding"]
    .some(name => String(nextRow[name] || "").trim());
  if (!hasManualValue) {
    state.compressorJournal[rowId] = {
      id: rowId,
      area,
      date,
      compressor,
      shiftTime: "",
      airPressure: "",
      airTemp: "",
      oilPressureTemp: "",
      leakGrounding: "",
      blowTime: "",
      checkedBy: "",
      updatedAt: now.toISOString(),
      updatedByName: profile?.name || "",
      updatedByRole: profile?.role || ""
    };
    saveState();
    return state.compressorJournal[rowId];
  }
  state.compressorJournal[rowId] = nextRow;
  saveState();
  return state.compressorJournal[rowId];
}


const GAS_JOURNAL_AREA = "Газовое хозяйство";
const GAS_ROUTE_LIST = ["ГРП - Печь №1", "ГРП - Печь №2", "ГРП - Печь №3", "ГРП - Печь №4", "ГРП - Печь №5", "ГРП - Печь №6", "ГРП - Печь №7", "ГРП - Печь №8", "ГРП - Печь №9", "ГРП - Печь №10", "ГРП - Печь №11"];

function gasJournalKey(section, date) {
  return `${section}::${date}`;
}

function gasJournalDate(section) {
  const key = section === "A" ? "gasSheetDateA" : "gasSheetDateB";
  if (!current[key]) current[key] = todayISO();
  return current[key];
}

function shiftGasJournalDate(section, deltaDays) {
  const key = section === "A" ? "gasSheetDateA" : "gasSheetDateB";
  const date = new Date(gasJournalDate(section));
  date.setDate(date.getDate() + deltaDays);
  current[key] = date.toISOString().slice(0, 10);
  renderGasJournal();
}

function gasJournalRecord(section, date = gasJournalDate(section)) {
  state.gasJournal ||= {};
  const id = gasJournalKey(section, date);
  return { id, section, date, ...(state.gasJournal[id] || {}) };
}

function gasJournalCompleteA(date = todayISO()) {
  const row = gasJournalRecord("A", date);
  return ["inletMpa", "outletMpa", "tempC", "filterDelta", "regulator", "pzk", "psk", "result", "checkedBy"].every(field => String(row?.[field] || "").trim());
}

function gasJournalCompleteB(date = todayISO()) {
  const row = gasJournalRecord("B", date);
  return ["wells", "gasSmell", "protectionZone", "remarks", "actions", "checkedBy"].every(field => String(row?.[field] || "").trim());
}

function gasJournalTodayNeedsAttention() {
  return !gasJournalCompleteA(todayISO()) || !gasJournalCompleteB(todayISO());
}

function gasJournalFilledCount() {
  return Object.values(state.gasJournal || {}).filter(row => row?.section === "A" || row?.section === "B").length;
}

function updateGasJournalRow(section, date, field, value) {
  state.gasJournal ||= {};
  const id = gasJournalKey(section, date);
  const old = state.gasJournal[id] || {};
  const now = new Date();
  const next = {
    ...old,
    id,
    section,
    date,
    time: localTimeNow(),
    checkedBy: profile?.name || old.checkedBy || "",
    updatedAt: now.toISOString(),
    updatedByName: profile?.name || "",
    updatedByRole: profile?.role || "",
    [field]: value
  };
  if (section === "B") next.route = GAS_ROUTE_LIST.join("\n");
  state.gasJournal[id] = next;
  saveState();
  return next;
}

function clearGasJournalSheet(section, date = gasJournalDate(section)) {
  state.gasJournal ||= {};
  delete state.gasJournal[gasJournalKey(section, date)];
  saveState();
  renderGasJournal();
  renderEquipment();
}

function printGasJournalSheet(section) {
  document.body.classList.remove("print-gas-A", "print-gas-B");
  document.body.classList.add(`print-gas-${section}`);
  window.print();
  setTimeout(() => document.body.classList.remove("print-gas-A", "print-gas-B"), 500);
}

function gasSelectHtml(section, date, field, value, options) {
  return `<select data-gas-section="${section}" data-gas-date="${date}" data-gas-field="${field}">
    <option value=""></option>
    ${options.map(option => `<option value="${escapeHtml(option)}" ${String(value || "") === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
  </select>`;
}

function gasInputHtml(section, date, field, value) {
  return `<input data-gas-section="${section}" data-gas-date="${date}" data-gas-field="${field}" type="text" value="${escapeHtml(value || "")}">`;
}

function gasSheetActionsHtml(section, date, complete) {
  const label = section === "A" ? "А" : "Б";
  return `<div class="gas-sheet-actions">
    <button type="button" data-gas-date-prev="${section}">‹ Предыдущий лист</button>
    <button type="button" data-gas-date-today="${section}">Сегодня</button>
    <button type="button" data-gas-date-next="${section}">Следующий лист ›</button>
    ${complete ? `<button type="button" data-gas-print="${section}">🖨 Печать листа ${label}</button><button type="button" class="danger" data-gas-clear="${section}">🗑 Удалить лист ${label}</button>` : `<span class="gas-sheet-note">Печать и удаление появятся после полного заполнения листа.</span>`}
  </div>`;
}

function renderGasJournal() {
  state.gasJournal ||= {};
  ui.aggregateJournalTitle.textContent = "Агрегатный журнал ШГРП / ГРП / ГРУ";
  ui.aggregateJournalMeta.textContent = `${gasJournalFilledCount()} заполненных листов. Дата, время и подпись заполняются автоматически. Если сегодня нет записи — кнопка журнала мигает.`;
  const dateA = gasJournalDate("A");
  const dateB = gasJournalDate("B");
  const rowA = gasJournalRecord("A", dateA);
  const rowB = gasJournalRecord("B", dateB);
  const completeA = gasJournalCompleteA(dateA);
  const completeB = gasJournalCompleteB(dateB);
  const route = rowB.route || GAS_ROUTE_LIST.join("\n");
  ui.aggregateJournalList.innerHTML = `
    <div class="aggregate-journal-sheet gas-journal-sheet gas-a4-sheet ${dateA === todayISO() && !completeA ? "gas-missing-today" : ""}" data-print-section="A">
      <div class="aggregate-sheet-head"><strong>Раздел А. Эксплуатация и ТО ГРП (ГРУ)</strong><span>Лист раздела А № ${dateHuman(dateA)}</span></div>
      <div class="aggregate-journal-table-wrap gas-a4-wrap">
        <table class="aggregate-journal-table gas-journal-table gas-single-sheet-table">
          <thead><tr><th>Дата</th><th>Время</th><th>Вход МПа</th><th>Выход МПа</th><th>Темп. °C</th><th>ΔP фильтра</th><th>Регулятор</th><th>ПЗК</th><th>ПСК</th><th>Результаты ТО</th><th>Подпись</th></tr></thead>
          <tbody><tr>
            <td>${dateHuman(dateA)}</td>
            <td>${escapeHtml(rowA.time || "")}</td>
            <td>${gasInputHtml("A", dateA, "inletMpa", rowA.inletMpa)}</td>
            <td>${gasInputHtml("A", dateA, "outletMpa", rowA.outletMpa)}</td>
            <td>${gasInputHtml("A", dateA, "tempC", rowA.tempC)}</td>
            <td>${gasInputHtml("A", dateA, "filterDelta", rowA.filterDelta)}</td>
            <td>${gasSelectHtml("A", dateA, "regulator", rowA.regulator, ["Исправно", "Неисправно"])}</td>
            <td>${gasSelectHtml("A", dateA, "pzk", rowA.pzk, ["Исправно", "Неисправно"])}</td>
            <td>${gasSelectHtml("A", dateA, "psk", rowA.psk, ["Исправно", "Неисправно"])}</td>
            <td>${gasInputHtml("A", dateA, "result", rowA.result)}</td>
            <td>${escapeHtml(rowA.checkedBy || "")}</td>
          </tr></tbody>
        </table>
      </div>
      ${gasSheetActionsHtml("A", dateA, completeA)}
    </div>
    <div class="aggregate-journal-sheet gas-journal-sheet gas-a4-sheet ${dateB === todayISO() && !completeB ? "gas-missing-today" : ""}" data-print-section="B">
      <div class="aggregate-sheet-head"><strong>Раздел Б. Обход подземного газопровода</strong><span>Лист раздела Б № ${dateHuman(dateB)}</span></div>
      <div class="aggregate-journal-table-wrap gas-a4-wrap">
        <table class="aggregate-journal-table gas-journal-table gas-route-table gas-single-sheet-table">
          <thead><tr><th>Дата</th><th>Время</th><th>Участок</th><th>Контрольные трубки и колодцы</th><th>Запах газа</th><th>Охранная зона</th><th>Замечания</th><th>Принятые меры</th><th>Подпись</th></tr></thead>
          <tbody><tr>
            <td>${dateHuman(dateB)}</td>
            <td>${escapeHtml(rowB.time || "")}</td>
            <td class="gas-route-cell">${escapeHtml(route).replace(/\n/g, "<br>")}</td>
            <td>${gasSelectHtml("B", dateB, "wells", rowB.wells, ["Исправны", "Неисправны"])}</td>
            <td>${gasSelectHtml("B", dateB, "gasSmell", rowB.gasSmell, ["Нет", "Есть"])}</td>
            <td>${gasSelectHtml("B", dateB, "protectionZone", rowB.protectionZone, ["Без нарушений", "Нарушение"])}</td>
            <td>${gasInputHtml("B", dateB, "remarks", rowB.remarks)}</td>
            <td>${gasSelectHtml("B", dateB, "actions", rowB.actions, ["Не требуется", "Требуется"])}</td>
            <td>${escapeHtml(rowB.checkedBy || "")}</td>
          </tr></tbody>
        </table>
      </div>
      ${gasSheetActionsHtml("B", dateB, completeB)}
    </div>
  `;
  ui.aggregateJournalList.querySelectorAll("[data-gas-section]").forEach(el => {
    el.addEventListener("change", () => {
      updateGasJournalRow(el.dataset.gasSection, el.dataset.gasDate, el.dataset.gasField, el.value);
      renderGasJournal();
      renderEquipment();
    });
  });
  ui.aggregateJournalList.querySelectorAll("[data-gas-date-prev]").forEach(btn => btn.addEventListener("click", () => shiftGasJournalDate(btn.dataset.gasDatePrev, -1)));
  ui.aggregateJournalList.querySelectorAll("[data-gas-date-next]").forEach(btn => btn.addEventListener("click", () => shiftGasJournalDate(btn.dataset.gasDateNext, 1)));
  ui.aggregateJournalList.querySelectorAll("[data-gas-date-today]").forEach(btn => btn.addEventListener("click", () => { current[btn.dataset.gasDateToday === "A" ? "gasSheetDateA" : "gasSheetDateB"] = todayISO(); renderGasJournal(); }));
  ui.aggregateJournalList.querySelectorAll("[data-gas-print]").forEach(btn => btn.addEventListener("click", () => printGasJournalSheet(btn.dataset.gasPrint)));
  ui.aggregateJournalList.querySelectorAll("[data-gas-clear]").forEach(btn => btn.addEventListener("click", () => {
    const section = btn.dataset.gasClear;
    const date = gasJournalDate(section);
    if (confirm(`Удалить лист раздела ${section} за ${dateHuman(date)}?`)) clearGasJournalSheet(section, date);
  }));
}

function renderCompressorJournal(area = COMPRESSOR_JOURNAL_AREA) {
  const rows = compressorJournalRows(area);
  const rowsPerSheet = COMPRESSOR_JOURNAL_DAYS_PER_SHEET * COMPRESSOR_JOURNAL_COMPRESSORS.length;
  const sheets = [];
  for (let i = 0; i < rows.length; i += rowsPerSheet) sheets.push(rows.slice(i, i + rowsPerSheet));
  const firstIncompleteSheet = sheets.findIndex(sheetRows => !compressorJournalSheetComplete(sheetRows));
  if (!Number.isInteger(current.compressorSheetIndex) || current.compressorSheetIndex < 0 || current.compressorSheetIndex >= sheets.length) {
    current.compressorSheetIndex = firstIncompleteSheet >= 0 ? firstIncompleteSheet : Math.max(0, sheets.length - 1);
  }
  const currentSheetRows = sheets[current.compressorSheetIndex] || [];
  const currentSheetComplete = compressorJournalSheetComplete(currentSheetRows);
  const filled = compressorJournalFilledRows(area).length;
  ui.aggregateJournalTitle.textContent = `\u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043d\u044b\u0439 \u0436\u0443\u0440\u043d\u0430\u043b: ${area}`;
  ui.aggregateJournalMeta.textContent = `${filled} \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u0445 \u0441\u0442\u0440\u043e\u043a. \u0416\u0443\u0440\u043d\u0430\u043b \u0437\u0430\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f \u0432\u0440\u0443\u0447\u043d\u0443\u044e; \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u044f \u0441\u044e\u0434\u0430 \u043d\u0435 \u043f\u043e\u043f\u0430\u0434\u0430\u044e\u0442.`;
  ui.aggregateJournalList.innerHTML = `
    <div class="aggregate-print-actions compressor-journal-actions">
      <div class="segmented">
        <button type="button" data-compressor-month="prev">\u2039</button>
        <strong>${new Date(current.year, current.month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</strong>
        <button type="button" data-compressor-month="next">\u203a</button>
      </div>
      ${currentSheetComplete && current.compressorSheetIndex < sheets.length - 1 ? `<button type="button" data-compressor-next-sheet>\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u043b\u0438\u0441\u0442</button>` : ""}
    </div>
    ${sheets.map((sheetRows, sheetIndex) => `
    <div class="aggregate-journal-sheet compressor-journal-sheet ${sheetIndex === current.compressorSheetIndex ? "" : "compressor-sheet-hidden"}" data-compressor-sheet="${sheetIndex}">
      <div class="aggregate-sheet-head">
        <strong>\u041a\u043e\u043c\u043f\u0440\u0435\u0441\u0441\u043e\u0440\u043d\u0430\u044f</strong>
        <span>${new Date(current.year, current.month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })} · \u041b\u0438\u0441\u0442 ${sheetIndex + 1}</span>
        <button class="compressor-sheet-print" type="button" data-print-compressor-sheet="${sheetIndex}" ${compressorJournalSheetComplete(sheetRows) ? "" : "disabled"}>\u041f\u0435\u0447\u0430\u0442\u044c \u043b\u0438\u0441\u0442\u0430 \u2116${sheetIndex + 1}</button>
      </div>
      <div class="aggregate-journal-table-wrap">
        <table class="aggregate-journal-table compressor-journal-table">
          <thead>
            <tr>
              <th>\u0414\u0430\u0442\u0430</th>
              <th>\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u044e\u0449\u0438\u0439</th>
              <th>\u041a\u043e\u043c\u043f\u0440\u0435\u0441\u0441\u043e\u0440</th>
              <th>\u0421\u043c\u0435\u043d\u0430 / \u0412\u0440\u0435\u043c\u044f</th>
              <th>\u0414\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0432\u043e\u0437\u0434\u0443\u0445\u0430 (\u041c\u041f\u0430/\u0431\u0430\u0440)</th>
              <th>\u0422\u0435\u043c\u043f\u0435\u0440\u0430\u0442\u0443\u0440\u0430 \u0432\u043e\u0437\u0434\u0443\u0445\u0430 (\u00b0C)</th>
              <th>\u0414\u0430\u0432\u043b\u0435\u043d\u0438\u0435 / \u0422\u0435\u043c\u043f\u0435\u0440\u0430\u0442\u0443\u0440\u0430 \u043c\u0430\u0441\u043b\u0430</th>
              <th>\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0443\u0442\u0435\u0447\u0435\u043a \u0438 \u0437\u0430\u0437\u0435\u043c\u043b\u0435\u043d\u0438\u044f</th>
              <th>\u0412\u0440\u0435\u043c\u044f \u043f\u0440\u043e\u0434\u0443\u0432\u043a\u0438 \u0432\u043b\u0430\u0433\u043e\u043e\u0442\u0434\u0435\u043b\u0438\u0442\u0435\u043b\u044f</th>
            </tr>
          </thead>
          <tbody>
            ${sheetRows.map((row, index) => `
              <tr>
                ${index % COMPRESSOR_JOURNAL_COMPRESSORS.length === 0 ? `<td rowspan="${COMPRESSOR_JOURNAL_COMPRESSORS.length}">${dateHuman(row.date)}</td>` : ""}
                <td data-compressor-checked="${escapeHtml(row.id)}">${escapeHtml(row.checkedBy || "")}</td>
                <td>${escapeHtml(row.compressor)}</td>
                <td data-compressor-shift="${escapeHtml(row.id)}">${escapeHtml(row.shiftTime || "")}</td>
                <td><input data-compressor-row="${escapeHtml(row.id)}" data-compressor-field="airPressure" value="${escapeHtml(row.airPressure || "")}" inputmode="decimal"></td>
                <td><input data-compressor-row="${escapeHtml(row.id)}" data-compressor-field="airTemp" value="${escapeHtml(row.airTemp || "")}" inputmode="decimal"></td>
                <td><input data-compressor-row="${escapeHtml(row.id)}" data-compressor-field="oilPressureTemp" value="${escapeHtml(row.oilPressureTemp || "")}"></td>
                <td>
                  <select data-compressor-row="${escapeHtml(row.id)}" data-compressor-field="leakGrounding">
                    <option value=""></option>
                    <option value="\u0438\u0441\u043f\u0440\u0430\u0432\u043d\u043e" ${row.leakGrounding === "\u0438\u0441\u043f\u0440\u0430\u0432\u043d\u043e" ? "selected" : ""}>\u0438\u0441\u043f\u0440\u0430\u0432\u043d\u043e</option>
                    <option value="\u043d\u0435\u0442" ${row.leakGrounding === "\u043d\u0435\u0442" ? "selected" : ""}>\u043d\u0435\u0442</option>
                  </select>
                </td>
                <td data-compressor-blow="${escapeHtml(row.id)}">${escapeHtml(row.blowTime || "")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    `).join("")}
  `;
  ui.aggregateJournalList.querySelector("[data-print-compressor-journal]")?.addEventListener("click", () => window.print());
  ui.aggregateJournalList.querySelector("[data-compressor-next-sheet]")?.addEventListener("click", () => {
    current.compressorSheetIndex = Math.min(current.compressorSheetIndex + 1, sheets.length - 1);
    renderAggregateJournal();
  });
  ui.aggregateJournalList.querySelectorAll("[data-print-compressor-sheet]").forEach(button => {
    button.addEventListener("click", () => {
      const sheetIndex = button.dataset.printCompressorSheet || "";
      const sheet = ui.aggregateJournalList.querySelector(`[data-compressor-sheet="${CSS.escape(sheetIndex)}"]`);
      if (!sheet) return;
      const cleanup = () => {
        document.body.classList.remove("print-compressor-single");
        sheet.classList.remove("print-selected");
        window.removeEventListener("afterprint", cleanup);
      };
      document.body.classList.add("print-compressor-single");
      sheet.classList.add("print-selected");
      window.addEventListener("afterprint", cleanup);
      window.print();
      window.setTimeout(cleanup, 1000);
    });
  });
  ui.aggregateJournalList.querySelector("[data-compressor-month='prev']")?.addEventListener("click", () => {
    current.month -= 1;
    if (current.month < 0) {
      current.month = 11;
      current.year -= 1;
    }
    current.compressorSheetIndex = 0;
    renderAggregateJournal();
  });
  ui.aggregateJournalList.querySelector("[data-compressor-month='next']")?.addEventListener("click", () => {
    current.month += 1;
    if (current.month > 11) {
      current.month = 0;
      current.year += 1;
    }
    current.compressorSheetIndex = 0;
    renderAggregateJournal();
  });
  ui.aggregateJournalList.querySelectorAll("[data-compressor-row]").forEach(input => {
    const commitCompressorValue = event => {
      const control = event.currentTarget;
      const rowId = control.dataset.compressorRow;
      const savedRow = updateCompressorJournalRow(rowId, control.dataset.compressorField, control.value.trim());
      const shiftCell = ui.aggregateJournalList.querySelector(`[data-compressor-shift="${CSS.escape(rowId)}"]`);
      const blowCell = ui.aggregateJournalList.querySelector(`[data-compressor-blow="${CSS.escape(rowId)}"]`);
      const checkedCell = ui.aggregateJournalList.querySelector(`[data-compressor-checked="${CSS.escape(rowId)}"]`);
      if (shiftCell) shiftCell.textContent = savedRow.shiftTime || "";
      if (blowCell) blowCell.textContent = savedRow.blowTime || "";
      if (checkedCell) checkedCell.textContent = savedRow.checkedBy || "";
    };
    input.addEventListener("input", commitCompressorValue);
    input.addEventListener("change", event => {
      commitCompressorValue(event);
      renderAggregateJournal();
    });
    input.addEventListener("blur", () => renderAggregateJournal());
  });
}

function renderEquipment() {
  ui.subtitle.textContent = "Оборудование";
  const q = ui.equipmentSearch.value.trim().toLowerCase();
  const count = openCommentCount();
  updateRoleBadges();
  ui.alertCounter.textContent = `${count} замечаний`;
  ui.alertCounter.classList.toggle("alert", count > 0);
  ui.alertCounter.classList.toggle("clickable", count > 0);
  ui.alertCounter.title = count > 0 ? "Открыть первое замечание" : "Открытых замечаний нет";
  ui.equipmentList.innerHTML = "";
  const equipment = visibleEquipment();
  if (!equipment.length) {
    ui.equipmentList.innerHTML = `<div class="empty-state">Для вашей роли список оборудования закрыт. Откройте раздел заявок.</div>`;
    return;
  }
  const monthBar = document.createElement("div");
  monthBar.className = "equipment-month-bar";
  monthBar.innerHTML = `
    <div>
      <strong>График оборудования</strong>
      <span>Нажмите день напротив оборудования</span>
    </div>
    <div class="segmented">
      <button type="button" data-equipment-month="prev">‹</button>
      <strong>${new Date(current.year, current.month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</strong>
      <button type="button" data-equipment-month="next">›</button>
    </div>
  `;
  monthBar.querySelector("[data-equipment-month='prev']").addEventListener("click", () => {
    current.month -= 1;
    if (current.month < 0) {
      current.month = 11;
      current.year -= 1;
    }
    renderEquipment();
  });
  monthBar.querySelector("[data-equipment-month='next']").addEventListener("click", () => {
    current.month += 1;
    if (current.month > 11) {
      current.month = 0;
      current.year += 1;
    }
    renderEquipment();
  });
  ui.equipmentList.append(monthBar);

  const days = 31;
  const wrap = document.createElement("div");
  wrap.className = "schedule-wrap equipment-schedule-wrap";
  const table = document.createElement("table");
  table.className = "schedule-table equipment-schedule-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th class="node-head equipment-head">Оборудование</th>
        <th>Агрегатный журнал</th>
        ${Array.from({ length: days }, (_, i) => `<th>${i + 1}</th>`).join("")}
        <th>Статус</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  equipment
    .filter(eq => `${eq.name} ${eq.area}`.toLowerCase().includes(q))
    .forEach(eq => {
      const tr = document.createElement("tr");
      const alert = hasOpenCommentEquipment(eq.id);
      const stoppedNodeIndex = eq.nodes.findIndex((_, nodeIndex) => activeDowntime(eq.id, nodeIndex));
      const equipmentDowntimeOpen = stoppedNodeIndex >= 0;
      const downtimeColor = equipmentRowColor(eq);
      const downtimeStyle = downtimeColor ? ` style="--downtime-area-color:${downtimeColor}"` : "";
      const compressorJournalMissingToday = compressorJournalTodayNeedsAttention(eq.area);
      const gasJournalMissingToday = eq.area === GAS_JOURNAL_AREA && gasJournalTodayNeedsAttention();
      tr.innerHTML = `
        <th class="node-name equipment-name area-color-cell"${downtimeStyle}>
          <strong>${eq.name}</strong>
          <span>${eq.nodes.length} узлов</span>
          ${canEditCatalog() ? `
            <details class="catalog-editor">
              <summary>Редактировать</summary>
              <label>
                <span>Оборудование</span>
                <input data-equipment-name="${eq.id}" type="text" value="${escapeHtml(eq.name)}">
              </label>
              <label>
                <span>Участок</span>
                <input data-equipment-area="${eq.id}" type="text" value="${escapeHtml(eq.area)}">
              </label>
              <button type="button" data-save-equipment="${eq.id}">Сохранить</button>
            </details>
          ` : ""}
        </th>
        <td class="equipment-journal-cell area-color-cell"${downtimeStyle}>
          <button type="button" data-aggregate-area="${escapeHtml(eq.area)}" class="${(compressorJournalMissingToday || gasJournalMissingToday) ? "compressor-journal-alert" : ""}">
            <span>Агрегатный журнал</span>
            <strong>${escapeHtml(eq.area)}</strong>
            <small>${eq.area === GAS_JOURNAL_AREA ? (gasJournalMissingToday ? "сегодня не заполнено" : "сегодня заполнено") : eq.area === COMPRESSOR_JOURNAL_AREA ? (compressorJournalMissingToday ? "сегодня не заполнено" : "сегодня заполнено") : `${aggregateJournalCount(eq.area)} записей`}</small>
          </button>
        </td>
      `;
      tr.querySelector("[data-aggregate-area]")?.addEventListener("click", () => {
        current.selectedAggregateArea = eq.area || "";
        show("aggregateJournal");
      });
      for (let day = 1; day <= days; day++) {
        const date = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const summary = equipmentDaySummary(eq, date);
        const firstOpenCommentIndex = eq.nodes.findIndex((_, nodeIndex) => hasOpenCommentRecord(getRecord(eq.id, nodeIndex, date)));
        const downtimeOpen = equipmentDowntimeOpen;
        const td = document.createElement("td");
        const signalClass = downtimeOpen ? "downtime-cell" : summary.open ? "comment-cell" : "";
        const baseClass = summary.done === summary.total ? "completed-day" : "to";
        td.className = `${baseClass} ${summary.overdue ? "planned-overdue" : ""} ${summary.blinkToday ? "overdue-line-blink" : ""} ${summary.open || downtimeOpen ? "blink-cell" : ""} ${summary.open ? "open-comment" : ""} ${signalClass} ${isTodayDate(date) ? "today-cell" : ""}`;
        td.textContent = summary.done === summary.total ? "✓" : `${summary.done}/${summary.total}`;
        td.title = downtimeOpen ? `${eq.name} · идет простой` : summary.open ? `${eq.name} · есть комментарий` : `${eq.name} · ${dateHuman(date)} · выполнено ${summary.done} из ${summary.total}`;
        td.addEventListener("click", () => {
          current.equipmentId = eq.id;
          current.nodeIndex = downtimeOpen ? stoppedNodeIndex : firstOpenCommentIndex >= 0 ? firstOpenCommentIndex : 0;
          current.date = date;
          current.kind = "to";
          current.scrollToDowntimeNode = downtimeOpen ? stoppedNodeIndex : null;
          current.scrollToCommentNode = !downtimeOpen && firstOpenCommentIndex >= 0 ? firstOpenCommentIndex : null;
          show("checklist");
        });
        tr.append(td);
      }
      const status = document.createElement("td");
      status.innerHTML = `<span class="small-status ${alert ? "alert" : ""}">${alert ? "Замечание" : "Норма"}</span>`;
      tr.append(status);
      tr.querySelector("[data-save-equipment]")?.addEventListener("click", () => {
        saveEquipmentCatalog(eq.id, {
          name: tr.querySelector(`[data-equipment-name="${eq.id}"]`)?.value.trim() || eq.name,
          area: tr.querySelector(`[data-equipment-area="${eq.id}"]`)?.value.trim() || eq.area
        });
        renderEquipment();
      });
      tbody.append(tr);
    });
  wrap.append(table);
  ui.equipmentList.append(wrap);
}

function equipmentDaySummary(eq, date) {
  const rows = eq.nodes.map((_, index) => getRecord(eq.id, index, date));
  const done = rows.filter(rec => isNodeChecked(rec)).length;
  const open = rows.some(rec => hasOpenCommentRecord(rec));
  const requestOpen = rows.some((rec, index) => hasActiveRequestRecord(rec) || hasActiveRequestForNodeDate(eq.id, index, date));
  return {
    done,
    total: eq.nodes.length,
    open,
    requestOpen,
    overdue: isDueOrPast(date) && done < eq.nodes.length,
    blinkToday: isTodayDate(date) && done < eq.nodes.length
  };
}

function renderNodes() {
  const eq = equipmentById(current.equipmentId);
  ui.subtitle.textContent = eq.name;
  ui.equipmentTitle.textContent = eq.name;
  ui.equipmentMeta.textContent = `${eq.area} · ${eq.nodes.length} узлов`;
  const alert = hasOpenCommentEquipment(eq.id);
  ui.equipmentAlertBadge.textContent = alert ? "Есть замечания" : "Норма";
  ui.equipmentAlertBadge.classList.toggle("alert", alert);
  ui.nodeList.innerHTML = "";
  eq.nodes.forEach((node, index) => {
    const nodeAlert = Object.entries(state.checks).some(([k, rec]) => {
      const [eqId, nodeIdx] = k.split(":").map(Number);
      return eqId === eq.id && nodeIdx === index && hasOpenCommentRecord(rec);
    });
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node-card";
    button.innerHTML = `
      <div><strong>${node}</strong><span>График и чек-листы</span></div>
      <div class="small-status ${nodeAlert ? "alert" : ""}">${nodeAlert ? "Замечание" : "Открыть"}</div>
    `;
    button.addEventListener("click", () => {
      current.nodeIndex = index;
      show("schedule");
    });
    ui.nodeList.append(button);
  });
}

function renderSchedule() {
  const eq = equipmentById(current.equipmentId);
  ui.subtitle.textContent = "График ППР";
  ui.nodeTitle.textContent = `ГРАФИК ППР - ${eq.name}`;
  ui.nodeMeta.textContent = `${eq.area} · нажмите на день, откроется обход по узлам`;
  ui.monthLabel.textContent = new Date(current.year, current.month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  ui.scheduleGrid.innerHTML = "";
  const days = 31;
  const hint = document.createElement("div");
  hint.className = "schedule-hint";
  hint.innerHTML = `
    <span>График обхода: каждый день по узлам оборудования.</span>
    <span class="legend overdue">Мигает = дата наступила, обход узла не выполнен</span>
  `;
  ui.scheduleGrid.append(hint);
  const wrap = document.createElement("div");
  wrap.className = "schedule-wrap";
  const table = document.createElement("table");
  table.className = "schedule-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML = `<th class="node-head">Узлы</th>${Array.from({ length: days }, (_, i) => `<th>${i + 1}</th>`).join("")}`;
  thead.append(headRow);
  table.append(thead);
  const tbody = document.createElement("tbody");
  eq.nodes.forEach((node, nodeIndex) => {
    const tr = document.createElement("tr");
    const nodeCell = document.createElement("th");
    nodeCell.className = "node-name";
    nodeCell.textContent = node;
    tr.append(nodeCell);
    for (let day = 1; day <= days; day++) {
      const date = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const rec = getRecord(current.equipmentId, nodeIndex, date);
      const factStatus = statusForRecord(rec);
      const plan = plannedStatus(day);
      const status = factStatus || plan;
      const open = hasOpenCommentRecord(rec);
      const requestOpen = hasActiveRequestRecord(rec) || hasActiveRequestForNodeDate(current.equipmentId, nodeIndex, date);
      const downtimeOpen = Boolean(activeDowntime(current.equipmentId, nodeIndex));
      const overdue = plan && isDueOrPast(date) && !isPlannedDone(rec, plan);
      const blinkToday = plan && isTodayDate(date) && !isPlannedDone(rec, plan);
      const td = document.createElement("td");
      const signalClass = downtimeOpen ? "downtime-cell" : open ? "comment-cell" : "";
      const baseClass = isPlannedDone(rec, plan) ? "completed-day" : statusClass(status);
      td.className = `${baseClass} ${overdue ? "planned-overdue" : ""} ${blinkToday ? "overdue-line-blink" : ""} ${open || downtimeOpen ? "blink-cell" : ""} ${open ? "open-comment" : ""} ${signalClass} ${isTodayDate(date) ? "today-cell" : ""}`;
      td.textContent = status;
      td.title = downtimeOpen ? "Идет простой по этому узлу" : open ? "Есть комментарий по узлу" : overdue ? `${plan} по утверждённому графику не выполнено` : `${status} выполнено или без замечаний`;
      td.addEventListener("click", () => {
        current.nodeIndex = nodeIndex;
        current.date = date;
        current.kind = "to";
        current.scrollToDowntimeNode = downtimeOpen ? nodeIndex : null;
        current.scrollToCommentNode = !downtimeOpen && open ? nodeIndex : null;
        show("checklist");
      });
      tr.append(td);
    }
    tbody.append(tr);
  });
  table.append(tbody);
  wrap.append(table);
  ui.scheduleGrid.append(wrap);
}

function statusClass(status) {
  if (status === "ТО") return "to";
  return "";
}

function renderChecklist() {
  current.kind = "to";
  const eq = equipmentById(current.equipmentId);
  const node = eq.nodes[current.nodeIndex];
  const rec = record();
  const kind = rec[current.kind];
  ui.subtitle.textContent = "Чек-лист";
  if (current.kind === "to") {
    renderNodeWalkthrough(eq);
    return;
  }
  document.querySelector(".tabs[role='tablist']")?.removeAttribute("hidden");
  ui.commentPanel.hidden = false;
  ui.checklistTitle.textContent = node;
  ui.checklistMeta.textContent = `${eq.name} · ${dateHuman(current.date)}`;
  const status = statusForRecord(rec);
  ui.dayStatus.textContent = status || "Пусто";
  ui.dayStatus.style.background = status === "ТО" ? "var(--to)" : "var(--nav-soft)";
  document.querySelectorAll(".tab[data-kind]").forEach(tab => tab.classList.toggle("active", tab.dataset.kind === current.kind));
  ui.taskList.innerHTML = "";
  const table = document.createElement("table");
  table.className = `checklist-table ${current.kind}`;
  const title = "Ежедневный осмотр (ТО)";
  table.innerHTML = `
    <thead>
      <tr class="section-title">
        <th class="num-col"></th>
        <th>${title}</th>
        <th class="mark-col"></th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");
  TASKS[current.kind].forEach((task, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="num-col">${index + 1}</td>
      <td>${task}</td>
      <td class="mark-col"><input type="checkbox" ${kind.tasks[index] ? "checked" : ""}></td>
    `;
    const input = tr.querySelector("input");
    input.disabled = !canEditChecklist();
    input.addEventListener("change", event => {
      if (!canEditChecklist()) return;
      const now = new Date().toISOString();
      kind.tasks[index] = event.target.checked;
      kind.updatedAt = now;
      record().updatedAt = now;
      saveState();
      renderChecklist();
    });
    tbody.append(tr);
  });
  const done = kind.tasks.every(Boolean);
  const statusRow = document.createElement("tr");
  statusRow.className = "status-row";
  statusRow.innerHTML = `<td></td><td>Статус ТО:</td><td>${done ? "Выполнено" : ""}</td>`;
  tbody.append(statusRow);
  table.append(tbody);
  ui.taskList.append(table);
  ui.commentLabel.textContent = "Комментарий ТО";
  const canEditThisComment = canEditComment(kind);
  ui.commentInput.value = kind.comment;
  renderPhotoPreview(ui.commentPhotoPreview, kind.commentPhoto, "comment");
  ui.requestInput.value = kind.request || "";
  renderPhotoPreview(ui.requestPhotoPreview, kind.requestPhoto, "request");
  ui.requestInlineStatus.textContent = kind.request?.trim() ? `Заявка: ${statusText(kind.requestStatus || "shop")}` : "Заявка не создана";
  ui.resolvedInput.checked = Boolean(kind.resolved);
  ui.commentInput.disabled = !canEditThisComment;
  ui.commentPhotoInput.disabled = !canEditThisComment;
  ui.requestInput.disabled = !canEditChecklist();
  ui.requestPhotoInput.disabled = !canEditChecklist();
  ui.createRequestButton.disabled = !canEditChecklist();
  ui.resolvedInput.disabled = !canEditChecklist();
  if (current.scrollToMainComment) {
    current.scrollToMainComment = false;
    window.setTimeout(() => {
      ui.commentInput?.scrollIntoView({ behavior: "smooth", block: "center" });
      ui.commentInput?.classList.add("focus-comment");
      if (!ui.commentInput?.disabled) ui.commentInput?.focus();
      window.setTimeout(() => ui.commentInput?.classList.remove("focus-comment"), 1600);
    }, 80);
  }
}

function renderNodeWalkthrough(eq) {
  ui.subtitle.textContent = "Обход по узлам";
  ui.checklistTitle.textContent = `Обход по узлам - ${eq.name}`;
  ui.checklistMeta.textContent = `${eq.area} · ${dateHuman(current.date)}`;
  document.querySelector(".tabs[role='tablist']")?.setAttribute("hidden", "");
  ui.commentPanel.hidden = true;
  ui.taskList.innerHTML = "";

  const doneCount = eq.nodes.filter((_, index) => isNodeChecked(getRecord(eq.id, index, current.date))).length;
  ui.dayStatus.textContent = `${doneCount}/${eq.nodes.length}`;
  ui.dayStatus.style.background = doneCount === eq.nodes.length ? "var(--to)" : "var(--nav-soft)";

  const list = document.createElement("div");
  list.className = "node-walk-list";
  eq.nodes.forEach((nodeName, index) => {
    const item = getRecord(eq.id, index, current.date)?.to || blankKind();
    const activeStop = activeDowntime(eq.id, index);
    const reminderItems = reminderItemsForNode(eq.id, index, nodeName);
    const waitingShopFix = Boolean(item.mechanicFixed && !item.resolved);
    const canEditThisComment = canEditComment(item);
    const ownerText = commentOwnerText(item);
    const allCommentEntries = visibleCommentEntries(item, !sameCommentAuthor(item));
    const commentEntries = allCommentEntries.filter(entry => !isDowntimeCommentEntry(entry));
    const downtimeCommentEntries = allCommentEntries.filter(isDowntimeCommentEntry);
    const resolutionText = commentResolutionText(item);
    const resolvedRole = ROLE_ACCESS[item.resolvedByRole]?.label || item.resolvedByRole || "";
    const resolvedByText = item.resolvedByName ? `${item.resolvedByName}${resolvedRole ? ` (${resolvedRole})` : ""}` : resolvedRole;
    const resolutionBlock = item.resolvedAt ? `
      <div class="comment-resolution-detail">
        <strong>Устранил: ${escapeHtml(resolvedByText || "Сотрудник")}</strong>
        ${resolutionText ? `<span>${escapeHtml(resolutionText)}</span>` : ""}
        ${item.resolvedComment ? `<p>${escapeHtml(item.resolvedComment)}</p>` : ""}
        ${item.resolvedPhoto ? `<img src="${item.resolvedPhoto}" alt="Фото устранения">` : ""}
      </div>
    ` : "";
    const currentAuthorText = profile?.name
      ? `${profile.name} (${ROLE_ACCESS[profile?.role]?.label || profile?.role || "Сотрудник"})`
      : ROLE_ACCESS[profile?.role]?.label || "Сотрудник";
    const commentHistory = commentEntries.length ? `
      <div class="comment-history">
        <strong class="comment-history-title">Устранение замечаний</strong>
        ${commentEntries.map((entry, entryIndex) => `
          <div class="comment-entry" ${entryIndex === 0 ? `data-node-first-comment="${index}" tabindex="-1"` : ""}>
            <strong>${escapeHtml(commentEntryAuthor(entry))}</strong>
            <p>${escapeHtml(entry.text)}</p>
            ${entry.photo ? `<img src="${entry.photo}" alt="Фото комментария">` : ""}
          </div>
        `).join("")}
      </div>
    ` : "";
    const downtimeCommentHistory = downtimeCommentEntries.length ? `
      <div class="comment-history downtime-comment-history">
        <strong class="comment-history-title">Пуск / Стоп</strong>
        ${downtimeCommentEntries.map(entry => `
          <div class="comment-entry downtime-comment-entry">
            <strong>${escapeHtml(commentEntryAuthor(entry))}</strong>
            <p>${escapeHtml(entry.text)}</p>
          </div>
        `).join("")}
      </div>
    ` : "";
    const hasUnresolvedRemark = hasAnyComment(item) && !item.resolved;
    const fixedButtonLabel = waitingShopFix && canConfirmInstallation() ? "Подтвердить устранение" : "Устранено";
    const fixedButtonDisabled = !canEditChecklist() || !hasUnresolvedRemark || (waitingShopFix && !canConfirmInstallation());
    const downtimeActiveBlock = activeStop ? `
      <div class="downtime-active" data-node-downtime="${index}" tabindex="-1">
        <strong>Простой идет: ${durationText(downtimeDurationMs(activeStop))}</strong>
        <span>Тип: ${escapeHtml(downtimeTypeLabel(activeStop.type))}</span>
        <span>Причина: ${escapeHtml(activeStop.comment || "без комментария")}</span>
        <span>Записал: ${escapeHtml(activeStop.authorName || "сотрудник")}</span>
      </div>
    ` : "";
    const row = document.createElement("div");
    row.className = `node-walk-row ${hasUnresolvedRemark ? "open-comment" : ""}`;
    row.dataset.nodeWalkIndex = String(index);
    row.innerHTML = `
      <label class="node-walk-check">
        <input type="checkbox" data-node-check="${index}" ${isNodeChecked(getRecord(eq.id, index, current.date)) ? "checked" : ""} ${canEditChecklist() ? "" : "disabled"}>
        ${canEditCatalog() ? `<input class="node-name-editor" data-node-name="${index}" type="text" value="${escapeHtml(nodeName)}">` : `<span>${nodeName}</span>`}
        <button type="button" class="node-stop-button ${activeStop ? "active" : ""}" data-node-stop="${index}" ${canEditChecklist() ? "" : "disabled"}>${activeStop ? "Пуск" : "Стоп"}</button>
        ${downtimeActiveBlock}
        <details class="node-reminder">
          <summary>Памятка</summary>
          ${canEditCatalog() ? `
            <textarea data-node-reminder="${index}" rows="6">${escapeHtml(reminderItems.join("\n"))}</textarea>
            <button type="button" data-save-reminder="${index}">Сохранить памятку</button>
          ` : `
            <ol>
              ${reminderItems.map(text => `<li>${escapeHtml(text)}</li>`).join("")}
            </ol>
          `}
        </details>
      </label>
      <div class="node-walk-field">
        <span>Комментарий / заявка</span>
        ${commentHistory}
        ${downtimeCommentHistory}
        ${resolutionBlock}
        <small class="comment-owner">${escapeHtml(sameCommentAuthor(item) && ownerText ? ownerText : `Новый комментарий: ${currentAuthorText}`)}</small>
        <textarea data-node-comment="${index}" rows="2" placeholder="${sameCommentAuthor(item) ? "Напишите замечание или заявку по узлу" : "Новое замечание или заявка по узлу"}" ${canEditThisComment ? "" : "disabled"}>${escapeHtml(commentInputValue(item))}</textarea>
        <input data-node-comment-photo="${index}" type="file" accept="image/*" capture="environment" ${canEditThisComment ? "" : "disabled"}>
        <div class="photo-preview node-photo-preview" data-node-comment-preview="${index}">
          ${item.commentPhoto && sameCommentAuthor(item) ? `<img src="${item.commentPhoto}" alt="Фото комментария">${canEditThisComment ? `<button type="button" data-clear-node-photo="comment" data-node-index="${index}">Удалить фото</button>` : ""}` : ""}
        </div>
        <div class="node-walk-status">${nodeWalkStatusText(item)}</div>
        <div class="node-walk-actions node-comment-actions">
          <button type="button" data-node-submit-comment="${index}" ${canEditThisComment ? "" : "disabled"}>Отправить</button>
          <button type="button" data-node-fixed="${index}" ${fixedButtonDisabled ? "disabled" : ""}>${fixedButtonLabel}</button>
        </div>
      </div>
    `;
    row.querySelector("[data-node-check]").addEventListener("change", () => {
      if (!canEditChecklist()) return;
      const now = new Date().toISOString();
      let nextDone = 0;
      list.querySelectorAll("[data-node-check]").forEach(input => {
        const nodeIndex = Number(input.dataset.nodeCheck);
        const rec = record(eq.id, nodeIndex, current.date);
        const liveItem = rec.to;
        liveItem.tasks[0] = input.checked;
        liveItem.walkDone = input.checked;
        liveItem.updatedAt = now;
        rec.updatedAt = now;
        if (input.checked) nextDone += 1;
      });
      saveState();
      ui.dayStatus.textContent = `${nextDone}/${eq.nodes.length}`;
      ui.dayStatus.style.background = nextDone === eq.nodes.length ? "var(--to)" : "var(--nav-soft)";
    });
    row.querySelector("[data-node-stop]")?.addEventListener("click", async event => {
      if (!canEditChecklist()) return;
      const button = event.currentTarget;
      if (button.disabled) return;
      setButtonBusy(button, true, activeStop ? "Публикуется..." : "Выбор...");
      try {
        await toggleDowntime(eq.id, index);
        await publishStateNow();
      } finally {
        if (button.isConnected) setButtonBusy(button, false);
      }
    });
    row.querySelector("[data-node-name]")?.addEventListener("change", event => {
      if (!canEditCatalog()) return;
      saveNodeName(eq.id, index, event.target.value);
      renderNodeWalkthrough(equipmentById(eq.id));
    });
    row.querySelector("[data-save-reminder]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
      if (!canEditCatalog()) return;
      saveNodeReminder(eq.id, index, row.querySelector(`[data-node-reminder="${index}"]`)?.value || "");
      renderNodeWalkthrough(equipmentById(eq.id));
    }));
    row.querySelector("[data-node-comment]").addEventListener("input", event => {
      if (!canEditComment(item)) return;
      if (event.target.value.trim()) event.target.classList.remove("comment-required-blink");
      row.querySelector(".node-walk-status").textContent = event.target.value.trim()
        ? "Текст готов к отправке"
        : nodeWalkStatusText(item);
    });
    const submitNodeText = async (button, sendKind) => {
      const liveItem = record(eq.id, index, current.date).to;
      if (!canEditComment(liveItem)) return;
      const text = row.querySelector("[data-node-comment]").value;
      if (!text.trim()) {
        row.querySelector(".node-walk-status").textContent = "Сначала заполните поле";
        return;
      }
      if (!sendKind) {
        row.querySelector(".node-walk-status").textContent = "Отправка отменена. Можно редактировать.";
        return;
      }
      const isRequestSend = sendKind === "request";
      if (button.disabled) return;
      setButtonBusy(button, true, "Отправка...");
      try {
        if (isRequestSend) {
          const req = createNodeWalkRequestSubmission(eq.id, index, current.date, liveItem, text, liveItem.commentPhoto);
          liveItem.commentPhoto = "";
          row.querySelector(".node-walk-status").textContent = `Заявка подана: ${statusText(req.status || "shop")}`;
        } else {
          appendCommentEntry(liveItem, text, liveItem.commentPhoto);
          liveItem.resolved = false;
          row.querySelector(".node-walk-status").textContent = "Замечание отправлено";
        }
        saveState();
        row.querySelector("[data-node-comment]").value = "";
        row.querySelector("[data-node-comment-preview]").innerHTML = "";
        await publishStateNow();
        renderNodeWalkthrough(equipmentById(eq.id));
      } catch (error) {
        row.querySelector(".node-walk-status").textContent = "Сохранено на этом устройстве. Сервер недоступен, отправится автоматически.";
        scheduleRemoteRetry();
      } finally {
        if (button.isConnected) setButtonBusy(button, false);
      }
    };
    row.querySelector("[data-node-submit-comment]").addEventListener("click", async event => {
      const button = event.currentTarget;
      const sendKind = await askCommentOrRequest();
      await submitNodeText(button, sendKind);
    });
    row.querySelector("[data-node-fixed]").addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
      if (!canEditChecklist()) return;
      const liveItem = record(eq.id, index, current.date).to;
      const commentBox = row.querySelector("[data-node-comment]");
      const fixText = commentBox.value.trim();
      if (!fixText) {
        row.querySelector(".node-walk-status").textContent = "Перед устранением заполните комментарий";
        commentBox.classList.remove("comment-required-blink");
        void commentBox.offsetWidth;
        commentBox.classList.add("comment-required-blink");
        commentBox.scrollIntoView({ behavior: "smooth", block: "center" });
        commentBox.focus();
        return;
      }
      if (!hasAnyComment(liveItem)) {
        row.querySelector(".node-walk-status").textContent = "Сначала заполните комментарий";
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      const relatedReq = relatedIssuedRequestForNode(eq.id, index, current.date, liveItem);
      if (liveItem.mechanicFixed && !liveItem.resolved && canConfirmInstallation()) {
        markCommentResolved(liveItem, fixText, liveItem.commentPhoto, { preserveExisting: true });
        liveItem.mechanicFixed = false;
        if (relatedReq) {
          relatedReq.shopInstallApproved = true;
          relatedReq.productionDirectorApproved = false;
          relatedReq.done = false;
          relatedReq.status = "productionDirector";
          syncRequestToRecord(relatedReq);
        } else {
          liveItem.shopInstallApproved = true;
          saveState();
        }
        row.querySelector(".node-walk-status").textContent = relatedReq ? "Установка подтверждена. Ждет директора производства" : "Замечание закрыто";
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      if (profile?.role === "shop" || profile?.role === "engineer" || profile?.role === "editor") {
        markCommentResolved(liveItem, fixText, liveItem.commentPhoto);
        liveItem.mechanicFixed = false;
        liveItem.shopInstallApproved = true;
        liveItem.productionDirectorApproved = false;
        liveItem.accountingWrittenOff = false;
        if (relatedReq) {
          lockRequestInstalledQty(relatedReq);
          relatedReq.mechanicInstalled = true;
          relatedReq.shopInstallApproved = true;
          relatedReq.productionDirectorApproved = false;
          relatedReq.done = false;
          relatedReq.stock = false;
          relatedReq.status = "productionDirector";
          syncRequestToRecord(relatedReq);
        } else {
          saveState();
        }
        row.querySelector(".node-walk-status").textContent = relatedReq ? "Устранено. Ждет директора производства" : "Замечание закрыто";
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      liveItem.mechanicFixed = true;
      liveItem.resolved = false;
      liveItem.shopInstallApproved = false;
      liveItem.productionDirectorApproved = false;
      liveItem.accountingWrittenOff = false;
      saveCommentResolution(liveItem, fixText, liveItem.commentPhoto);
      if (relatedReq) {
        lockRequestInstalledQty(relatedReq);
        relatedReq.mechanicInstalled = true;
        relatedReq.done = false;
        relatedReq.stock = false;
        relatedReq.shopInstallApproved = false;
        relatedReq.productionDirectorApproved = false;
        relatedReq.accountingWrittenOff = false;
        relatedReq.status = "waitingShopDone";
        syncRequestToRecord(relatedReq);
      } else {
        markCommentResolved(liveItem, "", "", { preserveExisting: true });
        liveItem.mechanicFixed = false;
        saveState();
      }
      row.querySelector(".node-walk-status").textContent = relatedReq ? "Устранено. Ждет подтверждения начальника/инженера" : "Замечание закрыто";
      renderNodeWalkthrough(equipmentById(eq.id));
    }, "Публикуется..."));
    row.querySelector("[data-node-comment-photo]").addEventListener("change", async event => {
      const liveItem = record(eq.id, index, current.date).to;
      if (!canEditComment(liveItem)) return;
      if (!sameCommentAuthor(liveItem) && String(liveItem.comment || "").trim()) {
        beginCommentEdit(liveItem, "");
      }
      liveItem.commentPhoto = await readPhotoFile(event.target.files?.[0]);
      setCommentOwner(liveItem);
      liveItem.commentUpdatedAt = new Date().toISOString();
      liveItem.updatedAt = liveItem.commentUpdatedAt;
      event.target.value = "";
      saveState();
      renderNodeWalkthrough(eq);
    });
    row.querySelectorAll("[data-clear-node-photo]").forEach(button => {
      button.addEventListener("click", event => {
        if (!canEditChecklist()) return;
        const type = event.currentTarget.dataset.clearNodePhoto;
        const liveItem = record(eq.id, index, current.date).to;
        if (type === "comment" && !canEditComment(liveItem)) return;
        if (type === "comment") liveItem.commentPhoto = "";
        if (type === "request") liveItem.requestPhoto = "";
        saveState();
        // Удаление фото заявки тоже не должно создавать/обновлять заявку.
        renderNodeWalkthrough(eq);
      });
    });
    list.append(row);
  });
  ui.taskList.append(list);
  if (current.scrollToDowntimeNode !== null && current.scrollToDowntimeNode !== undefined) {
    const targetIndex = current.scrollToDowntimeNode;
    current.scrollToDowntimeNode = null;
    window.setTimeout(() => {
      const target = list.querySelector(`[data-node-walk-index="${targetIndex}"] [data-node-downtime]`)
        || list.querySelector(`[data-node-walk-index="${targetIndex}"] [data-node-stop]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("focus-comment");
      target?.focus();
      window.setTimeout(() => target?.classList.remove("focus-comment"), 1600);
    }, 80);
  }
  if (current.scrollToCommentNode !== null && current.scrollToCommentNode !== undefined) {
    const targetIndex = current.scrollToCommentNode;
    current.scrollToCommentNode = null;
    window.setTimeout(() => {
      const row = list.querySelector(`[data-node-walk-index="${targetIndex}"]`);
      const target = row?.querySelector("[data-node-first-comment]") || row?.querySelector("[data-node-comment]");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("focus-comment");
      if (!target?.disabled) target?.focus();
      window.setTimeout(() => target?.classList.remove("focus-comment"), 1600);
    }, 80);
  }
}

function nodeWalkStatusText(item) {
  if (item.productionDirectorApproved && !item.accountingWrittenOff && !item.done) return "Подтверждено директором производства. Ждет бухгалтерию";
  if (item.shopInstallApproved && !item.productionDirectorApproved && !item.done) return "Установка подтверждена. Ждет директора производства";
  if (item.mechanicFixed && !item.resolved) return "Устранено. Ждет подтверждения начальника/инженера";
  if (item.resolved) return commentResolutionText(item) || "Замечание закрыто";
  if (item.request?.trim()) return `Заявка: ${statusText(item.requestStatus || "shop")}`;
  if (hasAnyComment(item)) return "Есть замечание";
  return "Заявка не создана";
}

function nodeReminderItems(nodeName) {
  const name = String(nodeName || "").toLowerCase();
  if (/гидр|масл|клапан|цилиндр|бак|фильтр|пневм|воздух|компресс|насос/.test(name)) {
    return [
      "Осмотреть корпус, соединения, шланги и трубки на утечки.",
      "Проверить уровень масла, состояние фильтров и загрязнение вокруг узла.",
      "Послушать работу: нет ли шума, вибрации, рывков, перегрева.",
      "Проверить давление/индикацию, если на узле есть манометр или датчик.",
      "Смазать только предусмотренные точки, если они есть на этом узле."
    ];
  }
  if (/элект|шкаф|plc|датчик|кабель|клемм|освещ|щит|розет|сигнал/.test(name)) {
    return [
      "Осмотреть шкаф, кабели, разъемы, датчики и крепления.",
      "Проверить индикацию, кнопки, концевики, блокировки и аварийную остановку.",
      "Убедиться, что нет запаха гари, нагрева, искрения и повреждения изоляции.",
      "Проверить чистоту шкафа и отсутствие открытых/болтающихся проводов.",
      "Смазку не выполнять, если для этого узла нет отдельной точки смазки."
    ];
  }
  if (/стан|направ|вал|ролик|пуллер|трансп|стол|нож|пила|привод|редуктор|подшип|колонн|плита|шток/.test(name)) {
    return [
      "Осмотреть крепления, болты, направляющие, валы, ролики и рабочие поверхности.",
      "Проверить люфт, биение, перекос, посторонний шум и вибрацию.",
      "Проверить чистоту зоны: нет ли стружки, грязи, посторонних предметов.",
      "Смазать точки смазки, направляющие или подшипники, если они есть по месту.",
      "После осмотра убедиться, что защитные кожухи и ограждения на месте."
    ];
  }
  if (/печ|нагрев|охлажд|вентил|температ/.test(name)) {
    return [
      "Проверить температуру, индикацию, нагреватели, вентиляторы и охлаждение.",
      "Осмотреть корпус, теплоизоляцию, кабели и крепления.",
      "Проверить посторонний запах, перегрев, шум и неравномерную работу.",
      "Очистить видимые загрязнения вокруг узла, если это безопасно.",
      "Смазку выполнять только по предусмотренным точкам, если они есть."
    ];
  }
  return [
    "Осмотреть узел снаружи: чистота, крепления, повреждения, посторонние предметы.",
    "Проверить шум, вибрацию, перегрев, запах, утечки и видимые отклонения.",
    "Проверить защиту, ограждения, доступность прохода и безопасность зоны.",
    "Смазать предусмотренные точки смазки, если они есть на этом узле.",
    "Если есть замечание, записать комментарий, сделать фото и подать заявку."
  ];
}

function renderRequests() {
  ui.subtitle.textContent = "Заявки";
  if (!canOpenRequestRole(current.requestRole)) current.requestRole = defaultRequestRole();
  updateRoleBadges();
  document.querySelectorAll(".request-tabs .tab").forEach(tab => tab.classList.toggle("active", tab.dataset.role === current.requestRole));
  const list = document.querySelector("#requestList");
  const all = allRequests();
  const visible = all.filter(req => requestAllowedByUser(req));
  ui.requestsMeta.textContent = `Доступно заявок: ${visible.length}. Версия ${APP_VERSION}. Роль: ${ROLE_ACCESS[profile?.role]?.label || "не выбрана"}`;
  renderWarehousePanel();
  let rows = all.filter(req => requestVisibleForRole(req, current.requestRole));
  if (current.requestRole === "warehouse") {
    const folderArea = warehouseFolderArea();
    rows = rows.filter(req => needsWarehouseNoInvoiceConfirmation(req) || (req.stockArea || req.area || "") === folderArea);
    rows = rows.filter(req => !(req.transferredToWarehouse && !req.warehouseReceived && !req.issued && !req.stock && !req.done));
    rows = rows.filter(req => !needsWarehouseNoInvoiceConfirmation(req));
  }
  if (current.requestRole === "warehouse" && current.warehouseSearch.trim()) {
    rows = rows.filter(req => requestMatchesWarehouseSearch(req, current.warehouseSearch));
  }
  if (current.requestRole === "warehouse") {
    rows.sort((a, b) => {
      const aNew = a.transferredToWarehouse && !a.warehouseReceived ? 1 : 0;
      const bNew = b.transferredToWarehouse && !b.warehouseReceived ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return String(b.updatedAt || b.createdAt || b.date).localeCompare(String(a.updatedAt || a.createdAt || a.date));
    });
  }
  list.innerHTML = "";
  if (!rows.length) list.insertAdjacentHTML("beforeend", `<div class="empty-state">${current.requestRole === "warehouse" ? `В складе "${escapeHtml(warehouseFolderArea())}" нет заявок` : "Нет заявок для этого раздела"}</div>`);
  rows.forEach(req => list.append(requestCard(req)));
  if (current.requestRole === "accounting") list.insertAdjacentHTML("beforeend", renderAccountingWrittenOffList());
  if (current.requestRole === "warehouse" && current.warehouseSearch.trim()) {
    window.setTimeout(() => {
      const stockHit = ui.warehousePanel.querySelector(".warehouse-stock-row.search-hit");
      const confirmHit = ui.warehousePanel.querySelector(".warehouse-confirm-list .request-card.search-hit");
      const pendingHit = ui.warehousePanel.querySelector(".warehouse-pending-list .request-card.search-hit");
      const requestHit = list.querySelector(".request-card.search-hit");
      (confirmHit || pendingHit || stockHit || requestHit)?.scrollIntoView({ behavior: "smooth", block: "center" });
      (confirmHit || pendingHit || stockHit || requestHit)?.classList.add("focus-comment");
    }, 50);
  }
}

function renderDirector() {
  ui.subtitle.textContent = "Директорская";
  if (!ui.directorPanel) return;
  state.directorMessages ||= [];
  const isDirector = directorCanAnswer();
  const messages = directorMessages().filter(msg => directorMessageVisibleForProfile(msg));
  let readChanged = false;
  if (isDirector) {
    directorMessages().forEach(msg => {
      if (!msg.directorRead) {
        msg.directorRead = true;
        readChanged = true;
      }
    });
  } else {
    messages.forEach(msg => {
      if (msg.reply && !msg.userRead) {
        msg.userRead = true;
        readChanged = true;
      }
    });
  }
  if (readChanged) saveState();
  updateDirectorBadge();

  ui.directorMeta.textContent = isDirector
    ? `Обращений: ${messages.length}. Зарегистрировано сотрудников: ${loadUsers().length}`
    : "Ваши сообщения видите только вы и директор";

  ui.directorPanel.innerHTML = `
    ${isDirector ? renderDirectorUsers() : renderDirectorSendForm()}
    <div class="director-messages">
      ${messages.length ? "" : `<div class="empty-state">${isDirector ? "Новых обращений нет" : "Вы еще не писали директору"}</div>`}
    </div>
  `;

  const sendForm = ui.directorPanel.querySelector("#directorSendForm");
  if (sendForm) {
    sendForm.addEventListener("submit", async event => {
      event.preventDefault();
      const memo = ui.directorPanel.querySelector("#directorMemoFullText");
      const button = sendForm.querySelector("button[type='submit']");
      if (!memo.value.trim()) return;
      setButtonBusy(button, true);
      createDirectorMessage({
        memoFullText: memo.value,
        body: memo.value
      });
      await publishStateNow();
      sendForm.reset();
      renderDirector();
    });
  }

  ui.directorPanel.querySelectorAll("[data-whatsapp-user]").forEach(link => {
    link.addEventListener("click", event => {
      if (!window.confirm("Открыть WhatsApp этому сотруднику?")) event.preventDefault();
    });
  });
  ui.directorPanel.querySelector("[data-refresh-users]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
    await loadRemoteUsers();
    renderDirector();
  }, "Обновляем..."));
  ui.directorPanel.querySelectorAll("[data-approve-user]").forEach(button => {
    button.addEventListener("click", event => {
      const userKey = event.currentTarget.dataset.approveUser || "";
      const users = loadUsers();
      const user = users.find(item => (item.phone || item.name || "") === userKey);
      if (!user || !window.confirm(`Подтвердить регистрацию: ${user.name || user.phone || ""}?`)) return;
      user.approved = true;
      user.pendingApproval = false;
      user.approvedAt = new Date().toISOString();
      user.approvedBy = profile?.name || "";
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      apiJson("/api/users", {
        method: "POST",
        body: JSON.stringify({ ...user, actionId: nextActionId(), clientId: CLIENT_ID })
      }).then(loadRemoteUsers).catch(() => {});
      renderDirector();
    });
  });
  ui.directorPanel.querySelectorAll("[data-delete-user]").forEach(button => {
    button.addEventListener("click", event => {
      const userKey = event.currentTarget.dataset.deleteUser || "";
      const users = loadUsers();
      const user = users.find(item => (item.phone || item.name || "") === userKey);
      if (!user || !window.confirm(`Удалить сотрудника: ${user.name || user.phone || ""}?`)) return;
      const nextUsers = users.filter(item => (item.phone || item.name || "") !== userKey);
      localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
      apiJson("/api/users", {
        method: "POST",
        body: JSON.stringify({ action: "delete", phone: user.phone || "", name: user.name || "", actionId: nextActionId(), clientId: CLIENT_ID })
      }).then(loadRemoteUsers).catch(() => {});
      renderDirector();
    });
  });

  const list = ui.directorPanel.querySelector(".director-messages");
  messages.forEach(msg => {
    const card = document.createElement("div");
    card.className = `director-card ${msg.reply && !msg.userRead && !isDirector ? "request-alert" : ""}`;
    card.innerHTML = `
      <div class="director-card-main">
        <strong>${msg.fromName || "Сотрудник"}</strong>
        <span>${msg.fromRole || ""}${msg.fromArea ? ` · ${msg.fromArea}` : ""}${msg.fromPhone ? ` · ${msg.fromPhone}` : ""}</span>
        <pre class="director-memo-view full-memo-view">${escapeHtml(msg.memoFullText || msg.text)}</pre>
        ${msg.reply ? `<div class="director-reply"><b>Ответ директора:</b><p>${escapeHtml(msg.reply)}</p></div>` : `<div class="readonly-note">Ответа директора пока нет</div>`}
      </div>
      ${isDirector ? `
        <div class="director-reply-form">
          <textarea data-director-reply="${msg.id}" rows="3" placeholder="Ответ сотруднику">${escapeHtml(msg.reply || "")}</textarea>
          <div class="director-reply-actions">
            <button type="button" data-save-director-reply="${msg.id}">Ответить</button>
            <button type="button" data-print-director-memo="${msg.id}">Печать</button>
          </div>
        </div>
      ` : `<div class="director-reply-form"><div class="director-reply-actions"><button type="button" data-print-director-memo="${msg.id}">Печать</button></div></div>`}
    `;
    card.querySelector("[data-save-director-reply]")?.addEventListener("click", async event => {
      const text = card.querySelector(`[data-director-reply="${msg.id}"]`)?.value.trim() || "";
      setButtonBusy(event.currentTarget, true);
      msg.reply = text;
      msg.userRead = false;
      msg.repliedAt = new Date().toISOString();
      saveState();
      await publishStateNow();
      renderDirector();
    });
    card.querySelector("[data-print-director-memo]")?.addEventListener("click", () => {
      printDirectorMemo(msg);
    });
    list.append(card);
  });
}

function renderDowntime() {
  ui.subtitle.textContent = "Простои";
  if (!ui.downtimeChart || !ui.downtimeDetails) return;
  const monthDate = new Date(current.downtimeYear, current.downtimeMonth, 1);
  ui.downtimeMonthLabel.textContent = monthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const stats = downtimeChartAreas().map(area => downtimeAreaStats(area));
  const activeCount = downtimes().filter(item => !item.endedAt).length;
  const monthCount = downtimeMonthItems().length;
  ui.downtimeMeta.textContent = `Простоев за месяц: ${monthCount}. Активных остановок: ${activeCount}. Лимит простоя: 125 часов на цех за месяц.`;
  ui.downtimeChart.innerHTML = downtimePieChart(stats);
  ui.downtimeChart.querySelectorAll("[data-downtime-area]").forEach(button => {
    button.addEventListener("click", () => {
      current.selectedDowntimeArea = button.dataset.downtimeArea || "";
      renderDowntime();
      ui.downtimeDetails.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  const selectedArea = current.selectedDowntimeArea || stats.find(item => item.items.length)?.area || AREAS[0];
  if (!current.selectedDowntimeArea) current.selectedDowntimeArea = selectedArea;
  const selectedItems = downtimeMonthItems(selectedArea)
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  ui.downtimeDetails.innerHTML = `
    <div class="downtime-detail-head">
      <strong>${escapeHtml(selectedArea)}</strong>
      <span>${selectedItems.length ? `${selectedItems.length} записей простоя` : "За месяц простоев нет"}</span>
    </div>
    ${selectedItems.length ? selectedItems.map(item => `
      <div class="downtime-entry">
        <strong>${escapeHtml(item.equipment)} · ${escapeHtml(item.node)}</strong>
        <span>${downtimeTypeLabel(item.type)} · ${dateTimeHuman(item.startedAt)} - ${item.endedAt ? dateTimeHuman(item.endedAt) : "идет сейчас"} · ${durationText(downtimeDurationMs(item))}</span>
        <p>${escapeHtml(item.comment || "Без комментария")}</p>
        ${item.closeComment ? `<p>Пуск: ${escapeHtml(item.closeComment)}</p>` : ""}
        <small>${escapeHtml(item.authorName || "Сотрудник")} ${item.authorRole ? `(${escapeHtml(ROLE_ACCESS[item.authorRole]?.label || item.authorRole)})` : ""}</small>
      </div>
    `).join("") : `<div class="empty-state">По этому цеху за выбранный месяц нет комментариев простоев</div>`}
  `;
}

function renderAggregateJournal() {
  const areas = aggregateJournalAreas();
  const selectedArea = current.selectedAggregateArea || areas[0] || "";
  current.selectedAggregateArea = selectedArea;
  ui.subtitle.textContent = "Агрегатный журнал";
  if (!ui.aggregateJournalList) return;
  if (selectedArea === GAS_JOURNAL_AREA) {
    renderGasJournal();
    return;
  }
  if (selectedArea === COMPRESSOR_JOURNAL_AREA) {
    renderCompressorJournal(selectedArea);
    return;
  }
  ui.aggregateJournalTitle.textContent = selectedArea ? `Агрегатный журнал: ${selectedArea}` : "Агрегатный журнал";
  const items = selectedArea ? aggregateJournalItems(selectedArea) : [];
  const openCount = items.filter(item => !item.resolved).length;
  ui.aggregateJournalMeta.textContent = `${items.length} записей. Открытых: ${openCount}. Здесь хранятся замечания и поломки цеха отдельно от графика простоя.`;
  const sheets = [];
  for (let i = 0; i < Math.max(items.length, 1); i += AGGREGATE_JOURNAL_ROWS_PER_SHEET) {
    sheets.push(items.slice(i, i + AGGREGATE_JOURNAL_ROWS_PER_SHEET));
    if (!items.length) break;
  }
  ui.aggregateJournalList.innerHTML = `
    <div class="aggregate-print-actions">
      <button type="button" data-print-aggregate-journal>Печать в альбомном виде</button>
    </div>
    ${sheets.map((sheetItems, sheetIndex) => `
      <div class="aggregate-journal-sheet">
        <div class="aggregate-sheet-head">
          <strong>Агрегатный журнал: ${escapeHtml(selectedArea)}</strong>
          <span>Лист № ${sheetIndex + 1}</span>
        </div>
        <div class="aggregate-journal-table-wrap">
          <table class="aggregate-journal-table">
        <thead>
          <tr>
            <th rowspan="2">№ п/п</th>
            <th rowspan="2">Наименование узла, в котором обнаружен дефект</th>
            <th rowspan="2">Дата осмотра или ревизии</th>
            <th rowspan="2">Краткая характеристика дефекта</th>
            <th rowspan="2">Подпись лица, производившего осмотр</th>
            <th rowspan="2">Дата ремонта</th>
            <th rowspan="2">Перечень работ, выполненных для устранения дефектов</th>
            <th colspan="4">Узлы и детали, замененные при ремонте</th>
          </tr>
          <tr>
            <th>Наименование</th>
            <th>Количество, шт.</th>
            <th>Время устранения замечания</th>
            <th>Ф.И.О. и подпись механика цеха</th>
          </tr>
        </thead>
        <tbody>
          ${sheetItems.length ? sheetItems.map((item, index) => {
            const rowNumber = sheetIndex * AGGREGATE_JOURNAL_ROWS_PER_SHEET + index + 1;
            const author = commentEntryAuthor({ name: item.authorName, role: item.authorRole });
            const resolverRole = ROLE_ACCESS[item.resolvedByRole]?.label || item.resolvedByRole || "";
            const resolver = item.resolvedByName ? `${item.resolvedByName}${resolverRole ? ` (${resolverRole})` : ""}` : resolverRole;
            const parts = item.kind === "Замечание" ? installedPartsForRemark(remarkLinkKey(item.equipmentId, item.nodeIndex, item.date)) : [];
            const partNames = parts.map(part => part.name).join("\n");
            const partQty = parts.map(part => `${part.qty}`).join("\n");
            const partComments = parts.map(part => part.comment).filter(Boolean).join("\n");
            return `
              <tr class="${item.resolved ? "" : "open"}">
                <td>${rowNumber}</td>
                <td>${escapeHtml(item.equipment)}<br>${escapeHtml(item.node)}</td>
                <td>${dateTimeHuman(item.at)}</td>
                <td>${escapeHtml(`${item.kind}: ${item.text || "Без комментария"}`)}</td>
                <td>${escapeHtml(author)}</td>
                <td>${item.resolvedAt ? dateTimeHuman(item.resolvedAt) : ""}</td>
                <td>${escapeHtml(partComments || item.resolvedComment || (item.resolved ? "Устранено" : ""))}</td>
                <td>${escapeHtml(partNames || "")}</td>
                <td>${escapeHtml(partQty || "")}</td>
                <td>${item.durationMs ? durationText(item.durationMs) : ""}</td>
                <td>${escapeHtml(resolver || "")}</td>
              </tr>
            `;
          }).join("") : `
            <tr>
              <td colspan="11">В этом цехе пока нет записей агрегатного журнала</td>
            </tr>
          `}
        </tbody>
      </table>
        </div>
      </div>
    `).join("")}
  `;
  ui.aggregateJournalList.querySelector("[data-print-aggregate-journal]")?.addEventListener("click", () => window.print());
}

function printDirectorMemo(msg) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8">
        <title>Служебная записка</title>
        <style>
          body { font-family: "Times New Roman", serif; padding: 28mm 20mm; color: #111; }
          pre { white-space: pre-wrap; font: inherit; font-size: 14pt; line-height: 1.45; margin: 0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body><pre>${escapeHtml(msg.memoFullText || msg.text)}</pre></body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function renderDirectorSendForm() {
  const now = new Date();
  const memoNumber = String(directorMessages().length + 1).padStart(3, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleDateString("ru-RU", { month: "long" });
  const year = String(now.getFullYear());
  const name = profile?.name || "";
  const position = ROLE_ACCESS[profile?.role]?.label || "";
  const department = profile?.area || "";
  const template = `УТВЕРЖДАЮ
____________________

                                                                        Г-ну Азизову Б.
                                                                        Директору ТОО «Aluminium of Kazakhstan»

                                                                        от ${name}
                                                                        должность ${position}
                                                                        подразделение ${department}

                         СЛУЖЕБНАЯ ЗАПИСКА

№ ${memoNumber}                           «${day}» ${month} ${year} г.

Тема: 

Уважаемый Азизов Б.!






С уважением        ${name}`;
  return `
    <form class="director-send director-memo-form" id="directorSendForm">
      <div class="memo-paper">
        <textarea id="directorMemoFullText" class="memo-full-editor" rows="18">${escapeHtml(template)}</textarea>
      </div>
      <button type="submit">Отправить директору</button>
    </form>
  `;
}

function renderDirectorUsers() {
  const users = loadUsers().slice().sort((a, b) => Number(Boolean(b.approved === false || b.pendingApproval)) - Number(Boolean(a.approved === false || a.pendingApproval)));
  const pendingCount = users.filter(user => user.approved === false || user.pendingApproval).length;
  const cleanPhone = phone => String(phone || "").replace(/\D/g, "");
  const whatsappHref = phone => {
    const digits = cleanPhone(phone);
    return digits ? `https://wa.me/${digits}` : "";
  };
  return `
    <div class="director-users">
      <div class="director-users-head">
        <strong>Зарегистрированные сотрудники</strong>
        <button type="button" class="mini-action" data-refresh-users>Обновить список</button>
      </div>
      ${profile?.role === "editor" && pendingCount ? `<div class="empty-state request-alert">Новые регистрации ждут подтверждения: ${pendingCount}</div>` : ""}
      ${users.length ? users.map(user => `
        <div class="director-user-row ${user.approved === false || user.pendingApproval ? "pending-user" : ""}">
          <span>${escapeHtml(user.name || "")}</span>
          <span>${escapeHtml(ROLE_ACCESS[user.role]?.label || user.role || "")}</span>
          <span>${escapeHtml(user.area || "")}</span>
          <span>${escapeHtml(user.phone || "")}</span>
          <span class="user-approval-status">${user.approved === false || user.pendingApproval ? "Ждет подтверждения" : "Подтвержден"}</span>
          ${whatsappHref(user.phone) ? `<a class="mini-action" href="${whatsappHref(user.phone)}" target="_blank" rel="noopener" data-whatsapp-user="${escapeHtml(user.phone)}">WhatsApp</a>` : ""}
          ${profile?.role === "editor" && (user.approved === false || user.pendingApproval) ? `<button type="button" class="mini-action" data-approve-user="${escapeHtml(user.phone || user.name || "")}">Подтвердить</button>` : ""}
          ${profile?.role === "editor" ? `<button type="button" class="mini-action" data-delete-user="${escapeHtml(user.phone || user.name || "")}">Удалить</button>` : ""}
        </div>
      `).join("") : `<div class="empty-state">Список сотрудников пока пуст</div>`}
    </div>
  `;
}

function renderWarehousePanel() {
  if (!ui.warehousePanel) return;
  if (current.requestRole !== "warehouse") {
    ui.warehousePanel.innerHTML = "";
    ui.warehousePanel.hidden = true;
    return;
  }
  const canManageWarehouse = canActAsRole("warehouse");
  const query = current.warehouseSearch.trim().toLowerCase();
  const warehouseRequests = allRequests().filter(req => requestVisibleForRole(req, "warehouse"));
  const foundRequests = warehouseRequests.filter(req => requestMatchesWarehouseSearch(req, query));
  const folderArea = warehouseFolderArea();
  const pendingConfirmations = pendingWarehouseConfirmations();
  const pendingReceipts = pendingWarehouseReceipts(folderArea);
  current.selectedStockArea = folderArea;
  ui.warehousePanel.hidden = false;
  ui.warehousePanel.innerHTML = `
    <div class="warehouse-head">
      <div>
        <strong>Склады по цехам</strong>
        <span>${query ? `Найдено заявок: ${foundRequests.length}` : "Выберите папку склада или найдите запчасть"}</span>
      </div>
    </div>
    ${renderWarehouseFolders(folderArea)}
    <form class="warehouse-search" id="warehouseSearchForm">
      <span>Поиск по складу</span>
      <div class="warehouse-search-row">
        <input id="warehouseSearchInput" type="search" placeholder="Запчасть, цех, полка" value="${current.warehouseSearch}">
        <button type="submit">Искать</button>
        <button type="button" id="warehouseSearchClear">Сброс</button>
      </div>
    </form>
    ${canManageWarehouse ? `
      <form class="warehouse-form" id="manualInventoryForm">
        <select id="manualInventoryArea">${warehouseOptions(folderArea)}</select>
        <input id="manualInventoryName" type="text" placeholder="Наименование запчасти">
        <input id="manualInventoryQty" type="number" min="1" placeholder="Кол-во">
        <input id="manualInventoryNote" type="text" placeholder="Место / полка / примечание">
        <button type="submit">Создать приход</button>
      </form>
    ` : `<div class="readonly-note">Остатки доступны только для просмотра. Добавляет и распределяет складовщик.</div>`}
    <div class="warehouse-pending warehouse-confirm">
      <div class="warehouse-stock-head">
        <strong>Подтверждение без накладной</strong>
        <span>${pendingConfirmations.length ? `${pendingConfirmations.length} ждёт подтверждения склада` : "Подтверждений нет"}</span>
      </div>
      <div class="warehouse-confirm-list" id="warehouseConfirmList"></div>
    </div>
    <div class="warehouse-pending">
      <div class="warehouse-stock-head">
        <strong>Новый приход</strong>
        <span>${pendingReceipts.length ? `${pendingReceipts.length} ждёт распределения` : "Новых приходов нет"}</span>
      </div>
      <div class="warehouse-pending-list" id="warehousePendingList"></div>
    </div>
    ${renderWarehouseInventory(folderArea, canManageWarehouse)}
    ${query ? `<div class="empty-state">${foundRequests.length ? "Ниже показаны найденные заявки. Первая заявка подсвечена." : "Поиск ничего не нашел"}</div>` : ""}
  `;
  const form = ui.warehousePanel.querySelector("#manualInventoryForm");
  const searchForm = ui.warehousePanel.querySelector("#warehouseSearchForm");
  const confirmList = ui.warehousePanel.querySelector("#warehouseConfirmList");
  if (confirmList) {
    confirmList.innerHTML = pendingConfirmations.length ? "" : `<div class="empty-state">Нет приходов без накладной на подтверждение</div>`;
    pendingConfirmations.forEach(req => confirmList.append(requestCard(req)));
  }
  const pendingList = ui.warehousePanel.querySelector("#warehousePendingList");
  if (pendingList) {
    pendingList.innerHTML = pendingReceipts.length ? "" : `<div class="empty-state">Новый приход по этому складу отсутствует</div>`;
    pendingReceipts.forEach(req => pendingList.append(requestCard(req)));
  }
  ui.warehousePanel.querySelectorAll("[data-warehouse-folder]").forEach(button => {
    button.addEventListener("click", () => {
      current.selectedWarehouseFolder = button.dataset.warehouseFolder || COMMON_WAREHOUSE;
      current.selectedStockArea = current.selectedWarehouseFolder;
      renderRequests();
    });
  });
  if (searchForm) {
    searchForm.addEventListener("submit", event => {
      event.preventDefault();
      current.warehouseSearch = ui.warehousePanel.querySelector("#warehouseSearchInput").value;
      renderRequests();
    });
  }
  const clearSearch = ui.warehousePanel.querySelector("#warehouseSearchClear");
  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      current.warehouseSearch = "";
      renderRequests();
    });
  }
  const manualArea = ui.warehousePanel.querySelector("#manualInventoryArea");
  if (manualArea) {
    manualArea.addEventListener("change", () => {
      current.selectedStockArea = manualArea.value;
      current.selectedWarehouseFolder = manualArea.value;
      renderRequests();
    });
  }
  ui.warehousePanel.querySelectorAll("[data-stock-move]").forEach(button => {
    button.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
      if (!canManageWarehouse) return;
      const id = button.dataset.stockMove;
      const item = state.inventory?.[id];
      const qty = Number(ui.warehousePanel.querySelector(`[data-stock-qty="${CSS.escape(id)}"]`)?.value || 0);
      const targetArea = ui.warehousePanel.querySelector(`[data-stock-target="${CSS.escape(id)}"]`)?.value || item?.area || COMMON_WAREHOUSE;
      if (!item || qty <= 0 || targetArea === item.area) return;
      const moved = Math.min(qty, Number(item.qty || 0));
      if (removeInventory(item.area, item.name, moved)) {
        addInventory(targetArea, item.name, moved, item.source || `Перенос со склада ${item.area}`);
        current.selectedWarehouseFolder = targetArea;
        current.selectedStockArea = targetArea;
        saveState();
        renderRequests();
      }
    }));
  });
  ui.warehousePanel.querySelectorAll("[data-stock-issue]").forEach(button => {
    button.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
      if (!canManageWarehouse) return;
      const id = button.dataset.stockIssue;
      const item = state.inventory?.[id];
      const qty = Number(ui.warehousePanel.querySelector(`[data-stock-qty="${CSS.escape(id)}"]`)?.value || 0);
      const targetRole = ui.warehousePanel.querySelector(`[data-stock-role="${CSS.escape(id)}"]`)?.value || "mechanic";
      if (!item || qty <= 0) return;
      if (createMechanicIssueFromInventory(item, qty, targetRole)) {
        saveState();
        current.requestRole = targetRole;
        renderRequests();
      }
    }));
  });
  ui.warehousePanel.querySelectorAll("[data-stock-ask]").forEach(button => {
    button.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
      const id = button.dataset.stockAsk;
      const item = state.inventory?.[id];
      const qty = Number(ui.warehousePanel.querySelector(`[data-stock-qty="${CSS.escape(id)}"]`)?.value || 0);
      if (!item || qty <= 0) return;
      if (createWarehouseAskFromInventory(item, qty)) {
        saveState();
        renderRequests();
      }
    }));
  });
  if (form) {
    form.addEventListener("submit", event => {
      event.preventDefault();
      runButtonOperation(form.querySelector("button[type='submit']"), () => {
        const area = ui.warehousePanel.querySelector("#manualInventoryArea").value;
        const name = ui.warehousePanel.querySelector("#manualInventoryName").value;
        const qty = ui.warehousePanel.querySelector("#manualInventoryQty").value;
        const note = ui.warehousePanel.querySelector("#manualInventoryNote").value;
        if (!createManualWarehouseRequest(area, name, qty, note)) return;
        current.selectedStockArea = area;
        current.selectedWarehouseFolder = area;
        current.warehouseSearch = "";
        saveState();
        renderRequests();
      });
    });
  }
}

function inventoryRemainderForRequest(req) {
  const id = inventoryKey(req.stockArea || req.area || COMMON_WAREHOUSE, partNameFromRequest(req));
  return Number(state.inventory?.[id]?.qty || 0);
}

function renderAccountingWrittenOffList() {
  const items = allRequests()
    .filter(req => req.accountingWrittenOff && !req.stock)
    .sort((a, b) => String(b.updatedAt || b.createdAt || b.date).localeCompare(String(a.updatedAt || a.createdAt || a.date)));
  return `
    <div class="warehouse-pending">
      <div class="warehouse-stock-head">
        <strong>Списанные запасы</strong>
        <span>${items.length ? `${items.length} записей` : "Списаний нет"}</span>
      </div>
      ${items.length ? items.map(req => `
        <div class="request-card">
          <div class="request-main">
            <strong>${escapeHtml(partNameFromRequest(req))}</strong>
            <span>${escapeHtml(req.equipment || "")} · ${escapeHtml(req.node || "")}</span>
            <div class="request-quantity">Получено: ${Number(req.qtyReceived || 0)} шт. · Установлено: ${Number(req.qtyIssued || 0)} шт. · Остаток на складе: ${inventoryRemainderForRequest(req)} шт.</div>
            <div class="request-waiting">Кто взял: ${requestRoleLabel(warehouseIssueTargetRole(req))}${req.issueTargetName ? ` · ${escapeHtml(req.issueTargetName)}` : ""}</div>
            <div class="request-waiting">Куда установил: ${escapeHtml(req.equipment || "")}${req.node ? ` · ${escapeHtml(req.node)}` : ""}</div>
            ${req.installComment ? `<div class="request-no-invoice">Комментарий установки: ${escapeHtml(req.installComment)}</div>` : ""}
            <div class="request-status">Списано бухгалтерией</div>
          </div>
        </div>
      `).join("") : `<div class="empty-state">Списанных запасов пока нет</div>`}
    </div>
  `;
}

function requestCard(req) {
  const card = document.createElement("div");
  card.className = "request-card";
  if ((req.transferredToWarehouse && !req.warehouseReceived) || needsWarehouseNoInvoiceConfirmation(req)) {
    card.classList.add("request-alert");
  }
  if (current.requestRole === "warehouse" && current.warehouseSearch.trim() && requestMatchesWarehouseSearch(req, current.warehouseSearch)) {
    card.classList.add("search-hit");
  }
  card.innerHTML = `
    <div class="request-main">
      <strong>${req.equipment}</strong>
      <span>${req.node} · ${dateHuman(req.date)}</span>
      <p>${req.comment || "Без комментария"}</p>
      ${req.commentPhoto ? `<img class="request-photo" src="${req.commentPhoto}" alt="Фото замечания">` : ""}
      <p class="request-text">${req.text}</p>
      ${req.requestPhoto ? `<img class="request-photo" src="${req.requestPhoto}" alt="Фото заявки">` : ""}
      ${req.invoicePhoto ? `<img class="request-photo" src="${req.invoicePhoto}" alt="Фото накладной">` : ""}
      ${req.noInvoiceApproved && !req.accountingWrittenOff ? `<div class="request-no-invoice">Без накладной: подтверждено складом</div>` : ""}
      <div class="request-status">${statusText(req.status)}</div>
      <div class="request-waiting">Ждёт: ${requestRoleLabel(waitingRole(req))}</div>
      ${req.issueTargetRole ? `<div class="request-waiting">Выдать: ${requestRoleLabel(req.issueTargetRole)}${req.issueTargetName ? ` · ${escapeHtml(req.issueTargetName)}` : ""}</div>` : ""}
      <div class="request-finance">${financeInfoText(req)}</div>
      <div class="request-quantity">${quantityText(req)}</div>
      ${req.installComment ? `<div class="request-no-invoice">Комментарий установки: ${escapeHtml(req.installComment)}</div>` : ""}
    </div>
    <div class="request-actions"></div>
  `;
  const actions = card.querySelector(".request-actions");
  const canAct = canActAsRole(current.requestRole);

  if (!canAct) {
    actions.innerHTML = `<div class="readonly-note">Только просмотр. Выдачу подтверждает складовщик.</div>`;
  }

  if (canAct && canConfirmIssuedInstall(req, current.requestRole)) {
    let remarkSelect = null;
    const needsRemarkLink = !requestAggregateLinkKey(req);
    if (needsRemarkLink) {
      const options = aggregateRemarkOptions();
      remarkSelect = document.createElement("select");
      remarkSelect.innerHTML = `
        <option value="">Выберите замечание для установки</option>
        ${options.map(option => `
          <option value="${escapeHtml(option.key)}">
            ${escapeHtml(`${option.area} · ${option.equipment} · ${option.node} · ${dateHuman(option.date)} · ${option.text}`)}
          </option>
        `).join("")}
      `;
      remarkSelect.addEventListener("change", () => {
        const option = options.find(item => item.key === remarkSelect.value);
        if (!option) return;
        req.aggregateRemarkKey = option.key;
        req.equipmentId = option.equipmentId;
        req.nodeIndex = option.nodeIndex;
        req.date = option.date;
        req.area = option.area;
        req.equipment = option.equipment;
        req.node = option.node;
        saveState();
      });
      actions.append(remarkSelect);
    }
    const installComment = document.createElement("textarea");
    installComment.rows = 3;
    installComment.placeholder = "Комментарий установки";
    installComment.value = req.installComment || "";
    installComment.addEventListener("change", () => {
      req.installComment = installComment.value.trim();
      syncRequestToRecord(req);
      saveState();
    });
    actions.append(installComment);
    actions.append(actionButton("Подтвердить установку", () => {
      if (remarkSelect?.value) {
        const option = aggregateRemarkOptions().find(item => item.key === remarkSelect.value);
        if (option) {
          req.aggregateRemarkKey = option.key;
          req.equipmentId = option.equipmentId;
          req.nodeIndex = option.nodeIndex;
          req.date = option.date;
          req.area = option.area;
          req.equipment = option.equipment;
          req.node = option.node;
        }
      }
      req.installComment = installComment.value.trim();
      req.issueTargetName ||= profile?.name || "";
      req.issueTargetPhone ||= profile?.phone || "";
      lockRequestInstalledQty(req);
      req.mechanicInstalled = true;
      req.shopInstallApproved = true;
      req.productionDirectorApproved = false;
      req.done = false;
      req.stock = false;
      req.accountingWrittenOff = false;
      req.status = "productionDirector";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }

  if (current.requestRole === "shop" && canAct && (requestWaitingForShopInitial(req) || requestWaitingForInstallApproval(req))) {
    const isFinalApproval = requestWaitingForInstallApproval(req);
    actions.append(actionButton(isFinalApproval ? "Подтвердить установку" : "Подтвердить начальником", () => {
      if (isFinalApproval) {
        req.shopInstallApproved = true;
        req.productionDirectorApproved = false;
        req.done = false;
        req.status = "productionDirector";
      } else {
        req.shopApproved = true;
        req.status = "engineer";
      }
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "engineer" && canAct && (requestWaitingForEngineerInitial(req) || requestWaitingForInstallApproval(req))) {
    const isInstallApproval = requestWaitingForInstallApproval(req);
    actions.append(actionButton(isInstallApproval ? "Подтвердить установку" : "Подтвердить инженером", () => {
      if (isInstallApproval) {
        req.shopInstallApproved = true;
        req.productionDirectorApproved = false;
        req.done = false;
        req.status = "productionDirector";
      } else {
        req.engineerApproved = true;
        req.status = "supply";
      }
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "supply" && canAct && (requestWaitingForSupplyPrepare(req) || requestWaitingForSupplyWarehouse(req))) {
    const price = document.createElement("input");
    price.placeholder = "Цена";
    price.value = req.price || "";
    price.addEventListener("change", () => {
      req.price = price.value.trim();
      syncRequestToRecord(req);
      saveState();
    });
    actions.append(price);
    const supplier = document.createElement("input");
    supplier.placeholder = "Поставщик / примечание";
    supplier.value = req.supplier || "";
    supplier.addEventListener("change", () => {
      req.supplier = supplier.value.trim();
      syncRequestToRecord(req);
      saveState();
    });
    actions.append(supplier);
    const supplyQty = document.createElement("input");
    supplyQty.type = "number";
    supplyQty.min = "0";
    supplyQty.placeholder = "Передано, шт";
    supplyQty.value = req.qtyReceived || "";
    supplyQty.addEventListener("change", () => {
      req.qtyReceived = Number(supplyQty.value || 0);
      syncRequestToRecord(req);
      saveState();
    });
    actions.append(supplyQty);
    const invoiceLabel = document.createElement("label");
    invoiceLabel.className = "request-file-row";
    invoiceLabel.innerHTML = `
      <span>Фото накладной</span>
      <input type="file" accept="image/*" capture="environment">
    `;
    const invoiceInput = invoiceLabel.querySelector("input");
    invoiceInput.addEventListener("change", async () => {
      req.invoicePhoto = await readPhotoFile(invoiceInput.files?.[0]);
      invoiceInput.value = "";
      req.noInvoiceApproved = false;
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    });
    actions.append(invoiceLabel);
    const invoiceNote = document.createElement("div");
    invoiceNote.className = "readonly-note";
    invoiceNote.textContent = req.invoicePhoto
      ? "Накладная прикреплена."
      : req.noInvoiceApproved
        ? "Склад подтвердил приход без накладной."
        : "Перед складом прикрепите фото накладной. Без накладной нужно подтверждение складовщика.";
    actions.append(invoiceNote);
    if (requestWaitingForSupplyPrepare(req)) {
      const statusNote = document.createElement("div");
      statusNote.className = "readonly-note";
      statusNote.textContent = "Заполните цену, поставщика/примечание и количество, потом отправьте экономисту.";
      actions.append(statusNote);
      actions.append(actionButton("Отправить экономисту", () => {
        req.price = price.value.trim();
        req.supplier = supplier.value.trim();
        req.qtyReceived = Number(supplyQty.value || 0);
        if (!req.price || !req.supplier || req.qtyReceived <= 0) {
          statusNote.textContent = "Нужно заполнить все строки: цена, поставщик/примечание, количество.";
          return;
        }
        req.supplyPrepared = true;
        req.status = "finance";
        syncRequestToRecord(req);
        saveState();
        renderRequests();
      }));
    }
    if (requestWaitingForSupplyWarehouse(req)) {
      actions.append(actionButton("Передать на склад", () => {
        if (!req.invoicePhoto && !req.noInvoiceApproved) {
          invoiceNote.textContent = "Нельзя передать на склад: прикрепите фото накладной или дождитесь подтверждения складовщика, что приход без накладной.";
          return;
        }
        req.transferredToWarehouse = true;
        req.stockArea = req.area || req.stockArea || COMMON_WAREHOUSE;
        req.qtyReceived = Number(supplyQty.value || req.qtyReceived || 0);
        req.warehouseReceived = false;
        req.status = "waitingWarehouse";
        syncRequestToRecord(req);
        saveState();
        renderRequests();
      }));
    }
  }
  if (current.requestRole === "finance" && canAct && req.supplyPrepared && !req.financeApproved && !req.done && !req.stock) {
    actions.append(actionButton("Подписать экономистом", () => {
      req.financeApproved = true;
      req.status = "cash";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "cash" && canAct && req.financeApproved && !req.cashApproved && !req.done && !req.stock) {
    actions.append(actionButton("Оплатить", () => {
      req.cashApproved = true;
      req.status = "cashApproved";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "warehouse" && canAct && (requestWaitingForWarehouse(req) || (req.cashApproved && !req.transferredToWarehouse && !req.invoicePhoto && !req.noInvoiceApproved))) {
    if (req.cashApproved && !req.transferredToWarehouse && !req.invoicePhoto && !req.noInvoiceApproved) {
      actions.append(actionButton("Подтвердить приход без накладной", () => {
        req.noInvoiceApproved = true;
        req.updatedAt = new Date().toISOString();
        syncRequestToRecord(req);
        saveState();
        renderRequests();
      }));
      return card;
    }
    const stockArea = document.createElement("select");
    const requestWarehouseArea = req.stockArea || req.area || current.selectedStockArea || COMMON_WAREHOUSE;
    stockArea.innerHTML = warehouseOptions(requestWarehouseArea);
    stockArea.addEventListener("change", () => {
      req.stockArea = stockArea.value;
      syncRequestToRecord(req);
      saveState();
    });
    actions.append(stockArea);

    const targetRole = document.createElement("select");
    targetRole.innerHTML = warehouseIssueRoleOptions(warehouseIssueTargetRole(req));
    targetRole.addEventListener("change", () => {
      req.issueTargetRole = targetRole.value;
      syncRequestToRecord(req);
      saveState();
    });
    actions.append(targetRole);

    const qtyReceived = document.createElement("input");
    qtyReceived.type = "number";
    qtyReceived.min = "0";
    qtyReceived.placeholder = "Получено, шт";
    qtyReceived.value = req.qtyReceived || "";
    qtyReceived.addEventListener("change", () => {
      req.qtyReceived = Number(qtyReceived.value || 0);
      if (!req.warehouseReceived) req.status = "waitingWarehouse";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    });
    actions.append(qtyReceived);

    const qtyIssued = document.createElement("input");
    qtyIssued.type = "number";
    qtyIssued.min = "0";
    qtyIssued.placeholder = "Выдано, шт";
    qtyIssued.value = req.qtyIssued || "";
    qtyIssued.addEventListener("change", () => {
      req.qtyIssued = Number(qtyIssued.value || 0);
      if (req.qtyIssued > 0) {
        req.shopApproved = true;
        req.engineerApproved = true;
        req.supplyPrepared = true;
        req.financeApproved = true;
        req.cashApproved = true;
        req.transferredToWarehouse = true;
        req.warehouseReceived = true;
        req.issued = true;
        req.issueTargetRole = targetRole.value || warehouseIssueTargetRole(req);
        req.issueTargetName ||= "";
        req.issueTargetPhone ||= "";
        req.shopInstallApproved = false;
        req.productionDirectorApproved = false;
        req.accountingWrittenOff = false;
        req.status = "issued";
      }
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    });
    actions.append(qtyIssued);

    actions.append(actionButton("Выдать роли", () => {
      const targetArea = stockArea.value || req.stockArea || req.area || COMMON_WAREHOUSE;
      const issued = Number(req.qtyIssued || qtyIssued.value || 1);
      const removed = removeInventory(targetArea, partNameFromRequest(req), issued, true);
      if (!removed) return;
      const issuedAmount = Number(removed || 0);
      req.shopApproved = true;
      req.engineerApproved = true;
      req.supplyPrepared = true;
      req.financeApproved = true;
      req.cashApproved = true;
      req.transferredToWarehouse = true;
      req.warehouseReceived = true;
      req.warehouseReceivedAt = req.warehouseReceivedAt || new Date().toISOString();
      req.issued = true;
      req.issueTargetRole = targetRole.value || warehouseIssueTargetRole(req);
      req.issueTargetName ||= "";
      req.issueTargetPhone ||= "";
      req.stock = false;
      req.done = false;
      req.shopInstallApproved = false;
      req.productionDirectorApproved = false;
      req.accountingWrittenOff = false;
      if (!req.qtyReceived) req.qtyReceived = issuedAmount;
      req.stockArea = targetArea;
      req.qtyIssued = issuedAmount;
      req.status = "issued";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
    actions.append(actionButton("В запас", () => {
      const targetArea = stockArea.value || req.area || COMMON_WAREHOUSE;
      const received = Number(req.qtyReceived || qtyReceived.value || 1);
      const alreadyAdded = Number(req.inventoryAddedQty || 0);
      const delta = Math.max(received - alreadyAdded, 0);
      req.warehouseReceived = true;
      req.stock = true;
      req.done = true;
      req.warehouseReceivedAt = req.warehouseReceivedAt || new Date().toISOString();
      req.stockAt = new Date().toISOString();
      req.stockArea = targetArea;
      req.qtyReceived = received;
      if (delta > 0) {
        addInventory(targetArea, partNameFromRequest(req), delta, `Запас: ${req.equipment}`, { stockAt: req.stockAt });
        req.inventoryAddedQty = alreadyAdded + delta;
      }
      req.status = "stock";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "productionDirector" && canAct && req.shopInstallApproved && !req.productionDirectorApproved && !req.stock && !req.done) {
    actions.append(actionButton("Подтвердить списание", () => {
      req.productionDirectorApproved = true;
      req.done = false;
      req.status = "accounting";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "accounting" && canAct && req.productionDirectorApproved && !req.accountingWrittenOff && !req.stock && !req.done) {
    actions.append(actionButton("Списать деталь", () => {
      req.accountingWrittenOff = true;
      req.done = true;
      req.status = "done";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  return card;
}

function actionButton(label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-button";
  button.textContent = label;
  button.addEventListener("click", () => runButtonOperation(button, () => handler(button)));
  return button;
}

function dateHuman(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function dateTimeHuman(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

ui.back.addEventListener("click", () => {
  const previous = nav.pop() || "equipment";
  show(previous, false);
});

ui.today.addEventListener("click", () => {
  show("requests");
});

ui.directorOpenButton?.addEventListener("click", () => {
  show("director");
});

ui.downtimeOpenButton?.addEventListener("click", () => {
  show("downtime");
});

ui.equipmentSearch.addEventListener("input", renderEquipment);

ui.alertCounter?.addEventListener("click", openFirstComment);

ui.prevMonth.addEventListener("click", () => {
  current.month -= 1;
  if (current.month < 0) {
    current.month = 11;
    current.year -= 1;
  }
  renderSchedule();
});

ui.nextMonth.addEventListener("click", () => {
  current.month += 1;
  if (current.month > 11) {
    current.month = 0;
    current.year += 1;
  }
  renderSchedule();
});

ui.prevDowntimeMonth?.addEventListener("click", () => {
  current.downtimeMonth -= 1;
  if (current.downtimeMonth < 0) {
    current.downtimeMonth = 11;
    current.downtimeYear -= 1;
  }
  renderDowntime();
});

ui.nextDowntimeMonth?.addEventListener("click", () => {
  current.downtimeMonth += 1;
  if (current.downtimeMonth > 11) {
    current.downtimeMonth = 0;
    current.downtimeYear += 1;
  }
  renderDowntime();
});

document.querySelectorAll(".tab[data-kind]").forEach(tab => {
  tab.addEventListener("click", () => {
    current.kind = tab.dataset.kind;
    renderChecklist();
  });
});

ui.commentInput.addEventListener("input", () => {
  const rec = record();
  const item = rec[current.kind];
  if (!canEditComment(item)) return;
  const nextComment = ui.commentInput.value;
  if (nextComment !== item.comment) item.resolved = false;
  saveCommentDraft(item, nextComment);
  ui.resolvedInput.checked = false;
  saveState();
});

ui.commentPhotoInput.addEventListener("change", async () => {
  const rec = record();
  const item = rec[current.kind];
  if (!canEditComment(item)) return;
  if (!sameCommentAuthor(item) && String(item.comment || "").trim()) {
    beginCommentEdit(item, "");
  }
  item.commentPhoto = await readPhotoFile(ui.commentPhotoInput.files?.[0]);
  setCommentOwner(item);
  item.commentUpdatedAt = new Date().toISOString();
  item.updatedAt = item.commentUpdatedAt;
  ui.commentPhotoInput.value = "";
  saveState();
  renderChecklist();
});

ui.requestPhotoInput.addEventListener("change", async () => {
  if (!canEditChecklist()) return;
  const rec = record();
  const item = rec[current.kind];
  item.requestPhoto = await readPhotoFile(ui.requestPhotoInput.files?.[0]);
  ui.requestPhotoInput.value = "";
  saveState();
  renderChecklist();
});

ui.commentPhotoPreview.addEventListener("click", event => {
  if (!canEditChecklist() || !event.target.matches("[data-clear-photo]")) return;
  const rec = record();
  if (!canEditComment(rec[current.kind])) return;
  rec[current.kind].commentPhoto = "";
  saveState();
  renderChecklist();
});

ui.requestPhotoPreview.addEventListener("click", event => {
  if (!canEditChecklist() || !event.target.matches("[data-clear-photo]")) return;
  const rec = record();
  rec[current.kind].requestPhoto = "";
  saveState();
  renderChecklist();
});

function saveCurrentRequest() {
  if (!canEditChecklist()) return;
  const rec = record();
  const item = rec[current.kind];
  item.request = ui.requestInput.value;
  if (item.request.trim()) {
    if (!item.requestStatus) item.requestStatus = "shop";
    setRequestStatus(item);
  } else {
    item.requestStatus = "";
  }
  saveState();
  ui.requestInlineStatus.textContent = item.request.trim() ? `Заявка: ${statusText(item.requestStatus || "shop")}` : "Заявка не создана";
}

ui.requestInput.addEventListener("input", saveCurrentRequest);
ui.requestInput.addEventListener("change", saveCurrentRequest);

ui.createRequestButton.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
  if (!canEditChecklist()) return;
  saveCurrentRequest();
  const req = createDirectRequestFromCurrent();
  if (!req) {
    ui.requestInlineStatus.textContent = "Заполните поле заявки";
    return;
  }
  ui.requestInlineStatus.textContent = `Заявка создана: ${statusText(req.status || "shop")}`;
  renderChecklist();
}));

ui.openRequestsButton.addEventListener("click", () => {
  current.requestRole = defaultRequestRole();
  show("requests");
});

ui.resolvedInput.addEventListener("change", () => {
  if (!canEditChecklist()) return;
  const rec = record();
  if (ui.resolvedInput.checked) {
    markCommentResolved(rec[current.kind]);
  } else {
    rec[current.kind].resolved = false;
    rec[current.kind].resolvedAt = "";
    rec[current.kind].resolvedDurationMs = 0;
    rec[current.kind].updatedAt = new Date().toISOString();
  }
  saveState();
  render();
});

document.querySelectorAll(".request-tabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    if (!canOpenRequestRole(tab.dataset.role)) return;
    current.requestRole = tab.dataset.role;
    renderRequests();
  });
});

document.querySelectorAll("[data-open-role]").forEach(button => {
  button.addEventListener("click", () => {
    if (!canOpenRequestRole(button.dataset.openRole)) return;
    current.requestRole = button.dataset.openRole;
    show("requests");
  });
});

window.addEventListener("online", () => {
  flushPendingWork();
  loadRemoteState();
  loadRemoteUsers();
});

window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    flushPendingWork();
    loadRemoteState();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

setupLogin();
render();
loadRemoteState();
loadRemoteUsers();
connectRealtime();
startRealtimePoll();
