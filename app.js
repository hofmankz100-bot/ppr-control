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
  { id: 15, name: "оборудование 15", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 16, name: "оборудование 16", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 17, name: "оборудование 17", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 18, name: "оборудование 18", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 19, name: "оборудование 19", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 20, name: "оборудование 20", area: "Резерв", nodes: DEFAULT_NODES }
];

const STORE_KEY = "ppr-pwa-state-v2";
const PROFILE_KEY = "ppr-pwa-profile-v1";
const USERS_KEY = "ppr-pwa-users-v1";
const APP_VERSION = "v81";
const EDITOR_CODE = "kazak18117011";
const DIRECTOR_CODE = "kazak18117011";
const AREAS = [...new Set(EQUIPMENT.map(item => item.area))].sort((a, b) => a.localeCompare(b, "ru"));
const COMMON_WAREHOUSE = "Склад общего пользования";
const WAREHOUSE_AREAS = [COMMON_WAREHOUSE, ...AREAS];
const ROLE_ACCESS = {
  mechanic: { label: "Механик", requestRoles: ["warehouse", "mechanic"], equipment: "all", checklist: true },
  shop: { label: "Начальник цеха", requestRoles: ["shop"], equipment: "area", checklist: true },
  engineer: { label: "Инженер", requestRoles: ["all", "shop", "engineer", "supply", "finance", "cash", "warehouse", "mechanic", "accounting"], equipment: "all", checklist: true },
  finance: { label: "Экономист", requestRoles: ["finance"], equipment: "none", checklist: false },
  cash: { label: "Касса", requestRoles: ["cash"], equipment: "none", checklist: false },
  accounting: { label: "Бухгалтерия", requestRoles: ["accounting"], equipment: "none", checklist: false },
  supply: { label: "Снабженец", requestRoles: ["supply"], equipment: "area", checklist: false },
  warehouse: { label: "Складовщик", requestRoles: ["warehouse"], equipment: "none", checklist: false },
  director: { label: "Директор", requestRoles: [], equipment: "none", checklist: false },
  editor: { label: "Редактор", requestRoles: ["all", "shop", "engineer", "supply", "finance", "cash", "warehouse", "mechanic", "accounting"], equipment: "all", checklist: true }
};
const state = loadState();
const profile = loadProfile();
applyWorkCleanFromUrl();
const nav = [];
let remoteSaveTimer = null;
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

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : { checks: {}, requests: {} };
    parsed.checks ||= {};
    parsed.requests ||= {};
    parsed.inventory ||= {};
    parsed.catalog ||= { equipment: {} };
    parsed.catalog.equipment ||= {};
    parsed.directorMessages ||= [];
    parsed.downtimes ||= [];
    return parsed;
  } catch {
    return { checks: {}, requests: {}, inventory: {}, catalog: { equipment: {} }, directorMessages: [], downtimes: [] };
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  queueRemoteStateSave();
}

function applyWorkCleanFromUrl() {
  const cleanMode = new URLSearchParams(window.location.search).get("clean");
  if (cleanMode !== "work") return;
  state.checks = {};
  state.requests = {};
  state.inventory = {};
  state.downtimes = [];
  state.directorMessages = [];
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadRemoteState() {
  try {
    const remote = await apiJson("/api/state");
    Object.assign(state.checks, remote.checks || {});
    Object.assign(state.requests, remote.requests || {});
    Object.assign(state.inventory, remote.inventory || {});
    state.catalog ||= { equipment: {} };
    Object.assign(state.catalog.equipment, remote.catalog?.equipment || {});
    state.directorMessages = remote.directorMessages || state.directorMessages || [];
    state.downtimes = remote.downtimes || state.downtimes || [];
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    render();
  } catch {
    // Static/offline mode keeps using localStorage.
  }
}

async function loadRemoteUsers() {
  try {
    const users = await apiJson("/api/users");
    if (Array.isArray(users)) localStorage.setItem(USERS_KEY, JSON.stringify(users));
    if (current.view === "director") renderDirector();
  } catch {
    // Static/offline mode keeps using local registered users.
  }
}

function queueRemoteStateSave() {
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(saveRemoteState, 250);
}

async function saveRemoteState() {
  try {
    await apiJson("/api/state", {
      method: "PUT",
      body: JSON.stringify({ checks: state.checks, requests: state.requests, inventory: state.inventory, catalog: state.catalog, directorMessages: state.directorMessages, downtimes: state.downtimes || [] })
    });
  } catch {
    // If the internet backend is unavailable, local work remains saved on this device.
  }
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

function saveRegisteredUser(nextProfile) {
  const users = loadUsers();
  const sameUser = user => user.phone && user.phone === nextProfile.phone;
  const nextUsers = users.filter(user => !sameUser(user));
  nextUsers.push({ ...nextProfile, registeredAt: new Date().toISOString() });
  localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
  apiJson("/api/users", {
    method: "POST",
    body: JSON.stringify(nextProfile)
  }).catch(() => {});
}

function defaultRequestRole(role = profile?.role) {
  const access = ROLE_ACCESS[role] || ROLE_ACCESS.mechanic;
  return access.requestRoles[0] || "mechanic";
}

function roleAccess() {
  return ROLE_ACCESS[profile?.role] || ROLE_ACCESS.mechanic;
}

function isProfileReady() {
  return Boolean(profile?.name && profile?.role);
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

function profileKey(user = profile) {
  return String(user?.phone || user?.name || "").trim() || "unknown";
}

function directorMessages() {
  state.directorMessages ||= [];
  return state.directorMessages;
}

function directorUnreadCount() {
  if (directorCanAnswer()) return directorMessages().filter(msg => !msg.directorRead).length;
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
    <button type="button" id="changeUserButton">Сменить</button>
  `;
  ui.profileBar.querySelector("#changeUserButton").addEventListener("click", () => {
    localStorage.removeItem(PROFILE_KEY);
    location.reload();
  });
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
  ui.loginForm.addEventListener("submit", event => {
    event.preventDefault();
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
    saveRegisteredUser(nextProfile);
    location.reload();
  });
  syncArea();
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

function record(equipmentId = current.equipmentId, nodeIndex = current.nodeIndex, date = current.date) {
  const k = key(equipmentId, nodeIndex, date);
  if (!state.checks[k]) {
    state.checks[k] = {
      to: blankKind()
    };
  }
  return state.checks[k];
}

function blankKind() {
  return { tasks: Array(15).fill(false), comment: "", commentPhoto: "", commentOwnerRole: "", commentOwnerName: "", commentLog: [], request: "", requestPhoto: "", resolved: false };
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

function visibleCommentEntries(item, includeEditable = true) {
  const log = Array.isArray(item.commentLog) ? item.commentLog : [];
  const current = currentCommentEntry(item);
  const all = current ? [...log, current] : [...log];
  return all.filter(Boolean);
}

function commentInputValue(item) {
  return sameCommentAuthor(item) ? item.comment || "" : "";
}

function hasAnyComment(item) {
  return Boolean(String(item.comment || "").trim() || (Array.isArray(item.commentLog) && item.commentLog.some(entry => String(entry?.text || "").trim())));
}

function beginCommentEdit(item, nextText) {
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
  item.commentUpdatedAt = new Date().toISOString();
}

function saveCommentDraft(item, nextText) {
  const text = String(nextText || "");
  if (!sameCommentAuthor(item) && !text.trim()) return;
  beginCommentEdit(item, text);
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
    mechanicInstalled: Boolean(recKind.mechanicInstalled),
    shopInstallApproved: Boolean(recKind.shopInstallApproved),
    accountingWrittenOff: Boolean(recKind.accountingWrittenOff),
    done: Boolean(recKind.done),
    stock: Boolean(recKind.stock),
    qtyReceived: Number(recKind.qtyReceived || 0),
    qtyIssued: Number(recKind.qtyIssued || 0),
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
    mechanicInstalled: Boolean(item.mechanicInstalled || req.mechanicInstalled),
    shopInstallApproved: Boolean(item.shopInstallApproved || req.shopInstallApproved),
    accountingWrittenOff: Boolean(item.accountingWrittenOff || req.accountingWrittenOff),
    done: Boolean(item.done || req.done),
    stock: Boolean(item.stock || req.stock),
    qtyReceived: Number(item.qtyReceived || req.qtyReceived || 0),
    qtyIssued: Number(item.qtyIssued || req.qtyIssued || 0),
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
    price: old.price || item.price || "",
    supplier: old.supplier || item.supplier || "",
    status: old.status || item.requestStatus || "shop",
    shopApproved: Boolean(old.shopApproved || item.shopApproved),
    engineerApproved: Boolean(old.engineerApproved || item.engineerApproved),
    financeApproved: Boolean(old.financeApproved || item.financeApproved),
    transferredToWarehouse: Boolean(old.transferredToWarehouse || item.transferredToWarehouse),
    warehouseReceived: Boolean(old.warehouseReceived || item.warehouseReceived),
    issued: Boolean(old.issued || item.issued),
    mechanicInstalled: Boolean(old.mechanicInstalled || item.mechanicInstalled),
    shopInstallApproved: Boolean(old.shopInstallApproved || item.shopInstallApproved),
    accountingWrittenOff: Boolean(old.accountingWrittenOff || item.accountingWrittenOff),
    done: Boolean(old.done || item.done),
    stock: Boolean(old.stock || item.stock),
    qtyReceived: Number(old.qtyReceived || item.qtyReceived || 0),
    qtyIssued: Number(old.qtyIssued || item.qtyIssued || 0),
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
    mechanicInstalled: false,
    shopInstallApproved: false,
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: 0,
    qtyIssued: 0,
    stockArea: "",
    inventoryAddedQty: 0,
    createdAt: now,
    updatedAt: now
  };
  item.lastRequestId = id;
  item.request = "";
  item.requestPhoto = "";
  item.requestStatus = "";
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
    mechanicInstalled: Boolean(old.mechanicInstalled || item.mechanicInstalled),
    shopInstallApproved: Boolean(old.shopInstallApproved || item.shopInstallApproved),
    accountingWrittenOff: Boolean(old.accountingWrittenOff || item.accountingWrittenOff),
    done: Boolean(old.done || item.done),
    stock: Boolean(old.stock || item.stock),
    qtyReceived: Number(old.qtyReceived || item.qtyReceived || 0),
    qtyIssued: Number(old.qtyIssued || item.qtyIssued || 0),
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
  saveState();
  return Object.values(map)
    .filter(req => req && req.text && req.id)
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
}

function requestMatchesRole(req, role) {
  if (role === "all") return true;
  if (role === "shop") return (!req.issued && !req.shopApproved) || (req.mechanicInstalled && !req.shopInstallApproved && !req.done);
  if (role === "engineer") return (req.mechanicInstalled && !req.shopInstallApproved && !req.done) || (req.shopApproved && !req.engineerApproved);
  if (role === "supply") return (req.engineerApproved && !req.supplyPrepared) || (req.cashApproved && !req.transferredToWarehouse);
  if (role === "finance") return req.supplyPrepared && !req.financeApproved;
  if (role === "cash") return req.financeApproved && !req.cashApproved;
  if (role === "warehouse") return req.transferredToWarehouse && !req.issued && !req.stock && !req.done;
  if (role === "mechanic") return req.issued && !req.mechanicInstalled && !req.done && !req.stock;
  if (role === "accounting") return req.shopInstallApproved && !req.accountingWrittenOff && !req.stock;
  return false;
}

function requestNeedsRole(req, role) {
  if (role === "all") return true;
  if (role === "shop") return (!req.issued && !req.shopApproved) || (req.mechanicInstalled && !req.shopInstallApproved && !req.done);
  if (role === "warehouse") return req.transferredToWarehouse && !req.warehouseReceived && !req.issued && !req.stock && !req.done;
  if (role === "accounting") return req.shopInstallApproved && !req.accountingWrittenOff && !req.stock;
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
    accounting: "Бухгалтерия",
    warehouse: "Склад",
    mechanic: "Механик"
  }[role] || role;
}

function waitingRole(req) {
  if (req.stock || req.done) return "done";
  if (req.shopInstallApproved && !req.accountingWrittenOff) return "accounting";
  if (req.mechanicInstalled && !req.shopInstallApproved && !req.done) return "confirmInstall";
  if (req.issued && !req.mechanicInstalled) return "mechanic";
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
      img.onerror = reject;
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
  return downtimes()
    .map(item => ({ ...item, monthMs: downtimeOverlapMs(item, year, month) }))
    .filter(item => item.monthMs > 0 && (!area || item.area === area));
}

function downtimeAreaStats(area) {
  const { start, end } = monthRange(current.downtimeYear, current.downtimeMonth);
  const monthMs = end.getTime() - start.getTime();
  const items = downtimeMonthItems(area);
  const totalMs = items.reduce((sum, item) => sum + item.monthMs, 0);
  return {
    area,
    items,
    totalMs,
    percent: monthMs ? (totalMs / monthMs) * 100 : 0
  };
}

function openDowntime(equipmentId, nodeIndex, comment) {
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
    comment: String(comment || "").trim(),
    authorName: profile?.name || "",
    authorRole: profile?.role || "",
    closedByName: "",
    closedByRole: ""
  };
  state.downtimes.unshift(item);
  saveState();
}

function closeDowntime(item) {
  if (!item || item.endedAt) return;
  item.endedAt = new Date().toISOString();
  item.closedByName = profile?.name || "";
  item.closedByRole = profile?.role || "";
  saveState();
}

function toggleDowntime(equipmentId, nodeIndex) {
  const active = activeDowntime(equipmentId, nodeIndex);
  if (active) {
    closeDowntime(active);
    renderChecklist();
    return;
  }
  const comment = window.prompt("Причина простоя. Без комментария остановку не сохраняем.");
  if (!String(comment || "").trim()) return;
  openDowntime(equipmentId, nodeIndex, comment);
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
    .sort((a, b) => `${a.area} ${a.name}`.localeCompare(`${b.area} ${b.name}`, "ru"));
}

function warehouseFolderArea() {
  return current.selectedWarehouseFolder || current.selectedStockArea || COMMON_WAREHOUSE;
}

function inventoryItemsByArea(area) {
  return inventoryItems().filter(item => item.area === area);
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

function renderWarehouseInventory(area = warehouseFolderArea()) {
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
          </div>
          <strong>${Number(item.qty || 0)} шт</strong>
          <div class="stock-row-actions">
            <input data-stock-qty="${escapeHtml(item.id)}" type="number" min="1" max="${Number(item.qty || 0)}" value="1">
            <select data-stock-target="${escapeHtml(item.id)}">${warehouseOptions(item.area)}</select>
            <button type="button" data-stock-move="${escapeHtml(item.id)}">Перенести</button>
            <button type="button" data-stock-issue="${escapeHtml(item.id)}">Выдать механику</button>
          </div>
        </div>
      `).join("") : `<div class="empty-state">На этом складе пока нет остатков</div>`}
    </div>
  `;
}

function addInventory(area, name, qty, source = "") {
  state.inventory ||= {};
  const cleanArea = area || "Общий склад";
  const cleanName = String(name || "").trim();
  const amount = Number(qty || 0);
  if (!cleanName || amount <= 0) return null;
  const id = inventoryKey(cleanArea, cleanName);
  const old = state.inventory[id] || { id, area: cleanArea, name: cleanName, qty: 0, source: "" };
  state.inventory[id] = {
    ...old,
    area: cleanArea,
    name: cleanName,
    qty: Number(old.qty || 0) + amount,
    source: source || old.source || "",
    updatedAt: new Date().toISOString()
  };
  return state.inventory[id];
}

function removeInventory(area, name, qty) {
  state.inventory ||= {};
  const id = inventoryKey(area || "Общий склад", name);
  const item = state.inventory[id];
  const amount = Number(qty || 0);
  if (!item || amount <= 0) return false;
  item.qty = Math.max(Number(item.qty || 0) - amount, 0);
  item.updatedAt = new Date().toISOString();
  if (item.qty <= 0) delete state.inventory[id];
  return true;
}

function createMechanicIssueFromInventory(item, qty) {
  const amount = Number(qty || 0);
  if (!item || amount <= 0) return false;
  const removed = removeInventory(item.area, item.name, amount);
  if (!removed) return false;
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
    mechanicInstalled: false,
    shopInstallApproved: false,
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: amount,
    qtyIssued: amount,
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
    mechanicInstalled: false,
    shopInstallApproved: false,
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: amount,
    qtyIssued: 0,
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
  const roles = ["shop", "engineer", "supply", "finance", "cash", "warehouse", "mechanic", "accounting"];
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
  state.requests[req.id] = req;
  if (String(req.id || "").startsWith("stock-issue:") || String(req.id || "").startsWith("manual-warehouse:") || String(req.id || "").includes(":req:")) return;
  const kind = getRequestKindById(req.id);
  kind.request = req.text;
  kind.comment = req.comment;
  kind.commentPhoto = req.commentPhoto || "";
  kind.requestPhoto = req.requestPhoto || "";
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
  kind.mechanicInstalled = req.mechanicInstalled;
  kind.shopInstallApproved = req.shopInstallApproved;
  kind.accountingWrittenOff = req.accountingWrittenOff;
  kind.done = req.done;
  kind.stock = req.stock;
  kind.qtyReceived = Number(req.qtyReceived || 0);
  kind.qtyIssued = Number(req.qtyIssued || 0);
  kind.stockArea = req.stockArea || "";
  kind.inventoryAddedQty = Number(req.inventoryAddedQty || 0);
  if (req.done || req.stock) kind.resolved = true;
}

function setRequestStatus(reqKind) {
  if (reqKind.stock) reqKind.requestStatus = "stock";
  else if (reqKind.done) reqKind.requestStatus = "done";
  else if (reqKind.accountingWrittenOff) reqKind.requestStatus = "done";
  else if (reqKind.shopInstallApproved) reqKind.requestStatus = "accounting";
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
    issued: "Выдано механику",
    waitingShopDone: "Ждет подтверждения начальника/инженера",
    accounting: "Ждет списания бухгалтерией",
    done: "Выполнено"
  }[status] || status;
}

function equipmentById(id) {
  return allEquipment().find(item => item.id === id);
}

function statusForRecord(rec) {
  if (rec.to.tasks[0]) return "ТО";
  return "";
}

function plannedStatus(day) {
  return "ТО";
}

function isPlannedDone(rec, planned) {
  if (planned === "ТО") return Boolean(rec.to.tasks[0]);
  return true;
}

function isDueOrPast(date) {
  return date <= todayISO();
}

function hasOpenCommentRecord(rec) {
  return ["to"].some(kind => String(rec?.[kind]?.comment || "").trim() && !rec[kind].resolved);
}

function hasActiveRequestRecord(rec) {
  return ["to"].some(kind => {
    const item = rec?.[kind];
    return String(item?.request || "").trim() && item.requestStatus && !["done", "stock"].includes(item.requestStatus);
  });
}

function hasActiveRequestForNodeDate(equipmentId, nodeIndex, date) {
  state.requests ||= {};
  return Object.values(state.requests).some(req =>
    Number(req.equipmentId) === Number(equipmentId)
    && Number(req.nodeIndex) === Number(nodeIndex)
    && req.date === date
    && req.text
    && !["done", "stock"].includes(req.status || "")
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
        .filter(kind => String(rec?.[kind]?.comment || "").trim() && !rec[kind].resolved)
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
        <th>Участок</th>
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
      tr.innerHTML = `
        <th class="node-name equipment-name">
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
        <td class="equipment-area">${eq.area}</td>
      `;
      for (let day = 1; day <= days; day++) {
        const date = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const summary = equipmentDaySummary(eq, date);
        const stoppedNodeIndex = eq.nodes.findIndex((_, nodeIndex) => activeDowntime(eq.id, nodeIndex));
        const downtimeOpen = stoppedNodeIndex >= 0;
        const td = document.createElement("td");
        const signalClass = downtimeOpen ? "downtime-cell" : summary.requestOpen ? "request-cell" : summary.open ? "comment-cell" : "";
        td.className = `to ${summary.overdue ? "planned-overdue" : ""} ${summary.open || summary.requestOpen || downtimeOpen ? "open-comment blink-cell" : ""} ${signalClass} ${date === todayISO() ? "today-cell" : ""}`;
        td.textContent = summary.done === summary.total ? "✓" : `${summary.done}/${summary.total}`;
        td.title = downtimeOpen ? `${eq.name} · идет простой` : summary.requestOpen ? `${eq.name} · заявка в работе` : summary.open ? `${eq.name} · есть комментарий` : `${eq.name} · ${dateHuman(date)} · выполнено ${summary.done} из ${summary.total}`;
        td.addEventListener("click", () => {
          current.equipmentId = eq.id;
          current.nodeIndex = downtimeOpen ? stoppedNodeIndex : 0;
          current.date = date;
          current.kind = "to";
          current.scrollToDowntimeNode = downtimeOpen ? stoppedNodeIndex : null;
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
  const rows = eq.nodes.map((_, index) => record(eq.id, index, date));
  const done = rows.filter(rec => rec.to.tasks[0]).length;
  const open = rows.some(rec => hasOpenCommentRecord(rec));
  const requestOpen = rows.some((rec, index) => hasActiveRequestRecord(rec) || hasActiveRequestForNodeDate(eq.id, index, date));
  return {
    done,
    total: eq.nodes.length,
    open,
    requestOpen,
    overdue: isDueOrPast(date) && done < eq.nodes.length
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
      const rec = record(current.equipmentId, nodeIndex, date);
      const factStatus = statusForRecord(rec);
      const plan = plannedStatus(day);
      const status = factStatus || plan;
      const open = hasOpenCommentRecord(rec);
      const requestOpen = hasActiveRequestRecord(rec) || hasActiveRequestForNodeDate(current.equipmentId, nodeIndex, date);
      const downtimeOpen = Boolean(activeDowntime(current.equipmentId, nodeIndex));
      const overdue = plan && isDueOrPast(date) && !isPlannedDone(rec, plan);
      const td = document.createElement("td");
      const signalClass = downtimeOpen ? "downtime-cell" : requestOpen ? "request-cell" : open ? "comment-cell" : "";
      td.className = `${statusClass(status)} ${overdue ? "planned-overdue" : ""} ${open || requestOpen || downtimeOpen ? "open-comment blink-cell" : ""} ${signalClass} ${date === todayISO() ? "today-cell" : ""}`;
      td.textContent = status;
      td.title = downtimeOpen ? "Идет простой по этому узлу" : requestOpen ? "Заявка по узлу в работе" : open ? "Есть комментарий по узлу" : overdue ? `${plan} по утверждённому графику не выполнено` : `${status} выполнено или без замечаний`;
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
      kind.tasks[index] = event.target.checked;
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

  const doneCount = eq.nodes.filter((_, index) => record(eq.id, index, current.date).to.tasks[0]).length;
  ui.dayStatus.textContent = `${doneCount}/${eq.nodes.length}`;
  ui.dayStatus.style.background = doneCount === eq.nodes.length ? "var(--to)" : "var(--nav-soft)";

  const list = document.createElement("div");
  list.className = "node-walk-list";
  eq.nodes.forEach((nodeName, index) => {
    const item = record(eq.id, index, current.date).to;
    const activeStop = activeDowntime(eq.id, index);
    const reminderItems = reminderItemsForNode(eq.id, index, nodeName);
    const waitingShopFix = Boolean(item.mechanicFixed && !item.resolved);
    const canEditThisComment = canEditComment(item);
    const ownerText = commentOwnerText(item);
    const commentEntries = visibleCommentEntries(item, !sameCommentAuthor(item));
    const currentAuthorText = profile?.name
      ? `${profile.name} (${ROLE_ACCESS[profile?.role]?.label || profile?.role || "Сотрудник"})`
      : ROLE_ACCESS[profile?.role]?.label || "Сотрудник";
    const commentHistory = commentEntries.length ? `
      <div class="comment-history">
        ${commentEntries.map(entry => `
          <div class="comment-entry">
            <strong>${escapeHtml(commentEntryAuthor(entry))}</strong>
            <p>${escapeHtml(entry.text)}</p>
            ${entry.photo ? `<img src="${entry.photo}" alt="Фото комментария">` : ""}
          </div>
        `).join("")}
      </div>
    ` : "";
    const fixedButtonLabel = waitingShopFix && canConfirmInstallation() ? "Подтвердить устранение" : "Устранено";
    const fixedButtonDisabled = !canEditChecklist() || !String(item.comment || "").trim() || (waitingShopFix && !canConfirmInstallation());
    const downtimeActiveBlock = activeStop ? `
      <div class="downtime-active" data-node-downtime="${index}" tabindex="-1">
        <strong>Простой идет: ${durationText(downtimeDurationMs(activeStop))}</strong>
        <span>Причина: ${escapeHtml(activeStop.comment || "без комментария")}</span>
        <span>Записал: ${escapeHtml(activeStop.authorName || "сотрудник")}</span>
      </div>
    ` : "";
    const row = document.createElement("div");
    row.className = `node-walk-row ${item.comment?.trim() && !item.resolved ? "open-comment" : ""}`;
    row.dataset.nodeWalkIndex = String(index);
    row.innerHTML = `
      <label class="node-walk-check">
        <input type="checkbox" ${item.tasks[0] ? "checked" : ""} ${canEditChecklist() ? "" : "disabled"}>
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
        <span>Комментарий</span>
        ${commentHistory}
        <small class="comment-owner">${escapeHtml(sameCommentAuthor(item) && ownerText ? ownerText : `Новый комментарий: ${currentAuthorText}`)}</small>
        <textarea data-node-comment="${index}" rows="2" placeholder="${sameCommentAuthor(item) ? "Комментарий по узлу" : "Новый комментарий по узлу"}" ${canEditThisComment ? "" : "disabled"}>${escapeHtml(commentInputValue(item))}</textarea>
        <input data-node-comment-photo="${index}" type="file" accept="image/*" capture="environment" ${canEditThisComment ? "" : "disabled"}>
        <div class="photo-preview node-photo-preview" data-node-comment-preview="${index}">
          ${item.commentPhoto && sameCommentAuthor(item) ? `<img src="${item.commentPhoto}" alt="Фото комментария">${canEditThisComment ? `<button type="button" data-clear-node-photo="comment" data-node-index="${index}">Удалить фото</button>` : ""}` : ""}
        </div>
        <div class="node-walk-actions node-comment-actions">
          <button type="button" data-node-fixed="${index}" ${fixedButtonDisabled ? "disabled" : ""}>${fixedButtonLabel}</button>
        </div>
      </div>
      <div class="node-walk-field">
        <span>Заявка</span>
        <textarea data-node-request="${index}" rows="2" placeholder="Заявка по узлу" ${canEditChecklist() ? "" : "disabled"}>${item.request || ""}</textarea>
        <input data-node-request-photo="${index}" type="file" accept="image/*" capture="environment" ${canEditChecklist() ? "" : "disabled"}>
        <div class="photo-preview node-photo-preview" data-node-request-preview="${index}">
          ${item.requestPhoto ? `<img src="${item.requestPhoto}" alt="Фото заявки"><button type="button" data-clear-node-photo="request" data-node-index="${index}">Удалить фото</button>` : ""}
        </div>
        <div class="node-walk-status">${nodeWalkStatusText(item)}</div>
        <div class="node-walk-actions">
          <button type="button" data-node-submit-request="${index}" ${canEditChecklist() ? "" : "disabled"}>Подать заявку</button>
          <button type="button" data-node-open-request="${index}" ${item.request?.trim() ? "" : "disabled"}>К заявке</button>
        </div>
      </div>
    `;
    row.querySelector("input").addEventListener("change", event => {
      if (!canEditChecklist()) return;
      item.tasks[0] = event.target.checked;
      saveState();
      const nextDone = eq.nodes.filter((_, nodeIndex) => record(eq.id, nodeIndex, current.date).to.tasks[0]).length;
      ui.dayStatus.textContent = `${nextDone}/${eq.nodes.length}`;
      ui.dayStatus.style.background = nextDone === eq.nodes.length ? "var(--to)" : "var(--nav-soft)";
    });
    row.querySelector("[data-node-stop]")?.addEventListener("click", () => {
      if (!canEditChecklist()) return;
      toggleDowntime(eq.id, index);
    });
    row.querySelector("[data-node-name]")?.addEventListener("change", event => {
      if (!canEditCatalog()) return;
      saveNodeName(eq.id, index, event.target.value);
      renderNodeWalkthrough(equipmentById(eq.id));
    });
    row.querySelector("[data-save-reminder]")?.addEventListener("click", () => {
      if (!canEditCatalog()) return;
      saveNodeReminder(eq.id, index, row.querySelector(`[data-node-reminder="${index}"]`)?.value || "");
      renderNodeWalkthrough(equipmentById(eq.id));
    });
    row.querySelector("[data-node-comment]").addEventListener("input", event => {
      if (!canEditComment(item)) return;
      saveCommentDraft(item, event.target.value);
      if (item.comment.trim()) item.resolved = false;
      saveState();
      if (item.request?.trim()) upsertNodeWalkRequest(eq.id, index, current.date, item);
    });
    row.querySelector("[data-node-request]").addEventListener("change", event => {
      if (!canEditChecklist()) return;
      item.request = event.target.value;
      item.requestStatus = "";
      saveState();
      row.querySelector(".node-walk-status").textContent = nodeWalkStatusText(item);
      row.querySelector("[data-node-open-request]").disabled = !item.request.trim();
    });
    row.querySelector("[data-node-submit-request]").addEventListener("click", () => {
      if (!canEditChecklist()) return;
      if (canEditComment(item)) {
        saveCommentDraft(item, row.querySelector("[data-node-comment]").value);
      }
      item.request = row.querySelector("[data-node-request]").value;
      if (!item.request.trim()) {
        row.querySelector(".node-walk-status").textContent = "Сначала заполните поле заявки";
        return;
      }
      const req = createNodeWalkRequestSubmission(eq.id, index, current.date, item, item.request, item.requestPhoto);
      row.querySelector(".node-walk-status").textContent = `Заявка подана: ${statusText(req.status || "shop")}`;
      row.querySelector("[data-node-request]").value = "";
      row.querySelector("[data-node-request-preview]").innerHTML = "";
      row.querySelector("[data-node-open-request]").disabled = false;
      renderNodeWalkthrough(equipmentById(eq.id));
    });
    row.querySelector("[data-node-open-request]").addEventListener("click", () => {
      if (canEditChecklist() && row.querySelector("[data-node-request]").value.trim()) {
        if (canEditComment(item)) {
          saveCommentDraft(item, row.querySelector("[data-node-comment]").value);
        }
        item.request = row.querySelector("[data-node-request]").value;
        upsertNodeWalkRequest(eq.id, index, current.date, item);
      }
      current.requestRole = canOpenRequestRole("all") ? "all" : defaultRequestRole();
      show("requests");
    });
    row.querySelector("[data-node-fixed]").addEventListener("click", () => {
      if (!canEditChecklist()) return;
      if (canEditComment(item)) {
        saveCommentDraft(item, row.querySelector("[data-node-comment]").value);
      }
      if (!hasAnyComment(item)) {
        row.querySelector(".node-walk-status").textContent = "Сначала заполните комментарий";
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      item.request = row.querySelector("[data-node-request]").value;
      if (!item.request.trim()) {
        item.resolved = true;
        item.mechanicFixed = false;
        item.shopInstallApproved = false;
        item.accountingWrittenOff = false;
        item.requestStatus = "";
        saveState();
        row.querySelector(".node-walk-status").textContent = "Замечание закрыто";
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      if (item.mechanicFixed && !item.resolved && canConfirmInstallation()) {
        item.resolved = true;
        item.mechanicFixed = false;
        if (item.request.trim()) {
          const req = upsertNodeWalkRequest(eq.id, index, current.date, item);
          req.shopInstallApproved = true;
          req.done = false;
          req.status = "accounting";
          syncRequestToRecord(req);
        } else {
          item.shopInstallApproved = true;
          saveState();
        }
        row.querySelector(".node-walk-status").textContent = "Установка подтверждена. Ждет бухгалтерию";
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      if (profile?.role === "shop" || profile?.role === "engineer" || profile?.role === "editor") {
        item.resolved = true;
        item.mechanicFixed = false;
        item.shopInstallApproved = true;
        item.accountingWrittenOff = false;
        if (item.request.trim()) {
          const req = upsertNodeWalkRequest(eq.id, index, current.date, item);
          req.mechanicInstalled = true;
          req.shopInstallApproved = true;
          req.done = false;
          req.stock = false;
          req.status = "accounting";
          syncRequestToRecord(req);
        } else {
          saveState();
        }
        row.querySelector(".node-walk-status").textContent = item.request.trim() ? "Устранено. Ждет бухгалтерию" : "Замечание закрыто";
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      item.mechanicFixed = true;
      item.resolved = false;
      item.shopInstallApproved = false;
      item.accountingWrittenOff = false;
      if (item.request.trim()) {
        const req = upsertNodeWalkRequest(eq.id, index, current.date, item);
        req.mechanicInstalled = true;
        req.done = false;
        req.stock = false;
        req.shopInstallApproved = false;
        req.accountingWrittenOff = false;
        req.status = "waitingShopDone";
        syncRequestToRecord(req);
      } else {
        saveState();
      }
      row.querySelector(".node-walk-status").textContent = "Устранено. Ждет подтверждения начальника/инженера";
      renderNodeWalkthrough(equipmentById(eq.id));
    });
    row.querySelector("[data-node-comment-photo]").addEventListener("change", async event => {
      if (!canEditComment(item)) return;
      if (!sameCommentAuthor(item) && String(item.comment || "").trim()) {
        beginCommentEdit(item, "");
      }
      item.commentPhoto = await readPhotoFile(event.target.files?.[0]);
      setCommentOwner(item);
      item.commentUpdatedAt = new Date().toISOString();
      event.target.value = "";
      saveState();
      if (item.request?.trim()) upsertNodeWalkRequest(eq.id, index, current.date, item);
      renderNodeWalkthrough(eq);
    });
    row.querySelector("[data-node-request-photo]").addEventListener("change", async event => {
      if (!canEditChecklist()) return;
      item.requestPhoto = await readPhotoFile(event.target.files?.[0]);
      event.target.value = "";
      saveState();
      if (item.request?.trim()) upsertNodeWalkRequest(eq.id, index, current.date, item);
      renderNodeWalkthrough(eq);
    });
    row.querySelectorAll("[data-clear-node-photo]").forEach(button => {
      button.addEventListener("click", event => {
        if (!canEditChecklist()) return;
        const type = event.currentTarget.dataset.clearNodePhoto;
        if (type === "comment" && !canEditComment(item)) return;
        if (type === "comment") item.commentPhoto = "";
        if (type === "request") item.requestPhoto = "";
        saveState();
        if (item.request?.trim()) upsertNodeWalkRequest(eq.id, index, current.date, item);
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
      const target = list.querySelector(`[data-node-walk-index="${targetIndex}"] [data-node-comment]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("focus-comment");
      if (!target?.disabled) target?.focus();
      window.setTimeout(() => target?.classList.remove("focus-comment"), 1600);
    }, 80);
  }
}

function nodeWalkStatusText(item) {
  if (item.shopInstallApproved && !item.accountingWrittenOff && !item.done) return "Установка подтверждена. Ждет бухгалтерию";
  if (item.mechanicFixed && !item.resolved) return "Устранено. Ждет подтверждения начальника/инженера";
  if (item.resolved) return "Замечание закрыто";
  if (item.request?.trim()) return `Заявка: ${statusText(item.requestStatus || "shop")}`;
  if (item.comment?.trim()) return "Есть замечание";
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
    rows = rows.filter(req => (req.stockArea || req.area || "") === folderArea);
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
  list.innerHTML = rows.length ? "" : `<div class="empty-state">${current.requestRole === "warehouse" ? `В складе "${escapeHtml(warehouseFolderArea())}" нет заявок` : "Нет заявок для этого раздела"}</div>`;
  rows.forEach(req => list.append(requestCard(req)));
  if (current.requestRole === "warehouse" && current.warehouseSearch.trim()) {
    window.setTimeout(() => {
      const stockHit = ui.warehousePanel.querySelector(".warehouse-stock-row.search-hit");
      const requestHit = list.querySelector(".request-card.search-hit");
      (stockHit || requestHit)?.scrollIntoView({ behavior: "smooth", block: "center" });
      (stockHit || requestHit)?.classList.add("focus-comment");
    }, 50);
  }
}

function renderDirector() {
  ui.subtitle.textContent = "Директорская";
  if (!ui.directorPanel) return;
  state.directorMessages ||= [];
  const isDirector = directorCanAnswer();
  const messages = directorMessages().filter(msg => directorMessageVisibleForProfile(msg));
  if (isDirector) {
    directorMessages().forEach(msg => {
      msg.directorRead = true;
    });
  } else {
    messages.forEach(msg => {
      if (msg.reply) msg.userRead = true;
    });
  }
  saveState();
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
    sendForm.addEventListener("submit", event => {
      event.preventDefault();
      const memo = ui.directorPanel.querySelector("#directorMemoFullText");
      if (!memo.value.trim()) return;
      createDirectorMessage({
        memoFullText: memo.value,
        body: memo.value
      });
      sendForm.reset();
      renderDirector();
    });
  }

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
          <button type="button" data-save-director-reply="${msg.id}">Ответить</button>
          <button type="button" data-print-director-memo="${msg.id}">Печать служебки</button>
        </div>
      ` : `<div class="director-reply-form"><button type="button" data-print-director-memo="${msg.id}">Печать служебки</button></div>`}
    `;
    card.querySelector("[data-save-director-reply]")?.addEventListener("click", () => {
      const text = card.querySelector(`[data-director-reply="${msg.id}"]`)?.value.trim() || "";
      msg.reply = text;
      msg.userRead = false;
      msg.repliedAt = new Date().toISOString();
      saveState();
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
  const stats = AREAS.map(area => downtimeAreaStats(area));
  const activeCount = downtimes().filter(item => !item.endedAt).length;
  const monthCount = downtimeMonthItems().length;
  ui.downtimeMeta.textContent = `Простоев за месяц: ${monthCount}. Активных остановок: ${activeCount}. Нажмите цех, чтобы увидеть комментарии.`;
  ui.downtimeChart.innerHTML = stats.map(item => {
    const width = Math.min(item.percent, 100);
    return `
      <button type="button" class="downtime-bar ${current.selectedDowntimeArea === item.area ? "active" : ""}" data-downtime-area="${escapeHtml(item.area)}">
        <span>${escapeHtml(item.area)}</span>
        <strong>${item.percent.toFixed(2)}%</strong>
        <em>${durationText(item.totalMs)}</em>
        <i style="width: ${width}%"></i>
      </button>
    `;
  }).join("");
  ui.downtimeChart.querySelectorAll("[data-downtime-area]").forEach(button => {
    button.addEventListener("click", () => {
      current.selectedDowntimeArea = button.dataset.downtimeArea || "";
      renderDowntime();
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
        <span>${dateTimeHuman(item.startedAt)} - ${item.endedAt ? dateTimeHuman(item.endedAt) : "идет сейчас"} · ${durationText(downtimeDurationMs(item))}</span>
        <p>${escapeHtml(item.comment || "Без комментария")}</p>
        <small>${escapeHtml(item.authorName || "Сотрудник")} ${item.authorRole ? `(${escapeHtml(ROLE_ACCESS[item.authorRole]?.label || item.authorRole)})` : ""}</small>
      </div>
    `).join("") : `<div class="empty-state">По этому цеху за выбранный месяц нет комментариев простоев</div>`}
  `;
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
  const users = loadUsers();
  return `
    <div class="director-users">
      <strong>Зарегистрированные сотрудники</strong>
      ${users.length ? users.map(user => `
        <div class="director-user-row">
          <span>${escapeHtml(user.name || "")}</span>
          <span>${escapeHtml(ROLE_ACCESS[user.role]?.label || user.role || "")}</span>
          <span>${escapeHtml(user.area || "")}</span>
          <span>${escapeHtml(user.phone || "")}</span>
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
    ${renderWarehouseInventory(folderArea)}
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
    ${query ? `<div class="empty-state">${foundRequests.length ? "Ниже показаны найденные заявки. Первая заявка подсвечена." : "Поиск ничего не нашел"}</div>` : ""}
  `;
  const form = ui.warehousePanel.querySelector("#manualInventoryForm");
  const searchForm = ui.warehousePanel.querySelector("#warehouseSearchForm");
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
    button.addEventListener("click", () => {
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
    });
  });
  ui.warehousePanel.querySelectorAll("[data-stock-issue]").forEach(button => {
    button.addEventListener("click", () => {
      if (!canManageWarehouse) return;
      const id = button.dataset.stockIssue;
      const item = state.inventory?.[id];
      const qty = Number(ui.warehousePanel.querySelector(`[data-stock-qty="${CSS.escape(id)}"]`)?.value || 0);
      if (!item || qty <= 0) return;
      if (createMechanicIssueFromInventory(item, qty)) {
        saveState();
        current.requestRole = "mechanic";
        renderRequests();
      }
    });
  });
  if (form) {
    form.addEventListener("submit", event => {
      event.preventDefault();
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
  }
}

function requestCard(req) {
  const card = document.createElement("div");
  card.className = "request-card";
  if (req.transferredToWarehouse && !req.warehouseReceived) {
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
      <div class="request-status">${statusText(req.status)}</div>
      <div class="request-waiting">Ждёт: ${requestRoleLabel(waitingRole(req))}</div>
      <div class="request-finance">${financeInfoText(req)}</div>
      <div class="request-quantity">${quantityText(req)}</div>
    </div>
    <div class="request-actions"></div>
  `;
  const actions = card.querySelector(".request-actions");
  const canAct = canActAsRole(current.requestRole);

  if (!canAct) {
    actions.innerHTML = `<div class="readonly-note">Только просмотр. Выдачу подтверждает складовщик.</div>`;
  }

  if (current.requestRole === "shop" && canAct) {
    const isFinalApproval = req.mechanicInstalled && !req.shopInstallApproved && !req.done;
    actions.append(actionButton(isFinalApproval ? "Подтвердить установку" : "Подтвердить начальником", () => {
      if (isFinalApproval) {
        req.shopInstallApproved = true;
        req.done = false;
        req.status = "accounting";
      } else {
        req.shopApproved = true;
        req.status = "engineer";
      }
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "engineer" && canAct) {
    const isInstallApproval = req.mechanicInstalled && !req.shopInstallApproved && !req.done;
    actions.append(actionButton(isInstallApproval ? "Подтвердить установку" : "Подтвердить инженером", () => {
      if (isInstallApproval) {
        req.shopInstallApproved = true;
        req.done = false;
        req.status = "accounting";
      } else {
        req.engineerApproved = true;
        req.status = "supply";
      }
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "supply" && canAct) {
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
    if (!req.supplyPrepared) {
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
    if (req.cashApproved) {
      actions.append(actionButton("Передать на склад", () => {
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
  if (current.requestRole === "finance" && canAct) {
    actions.append(actionButton("Подписать экономистом", () => {
      req.financeApproved = true;
      req.status = "cash";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "cash" && canAct) {
    actions.append(actionButton("Оплатить", () => {
      req.cashApproved = true;
      req.status = "cashApproved";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "warehouse" && canAct) {
    const stockArea = document.createElement("select");
    const requestWarehouseArea = req.stockArea || req.area || current.selectedStockArea || COMMON_WAREHOUSE;
    stockArea.innerHTML = warehouseOptions(requestWarehouseArea);
    stockArea.addEventListener("change", () => {
      req.stockArea = stockArea.value;
      syncRequestToRecord(req);
      saveState();
    });
    actions.append(stockArea);

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
        req.shopInstallApproved = false;
        req.accountingWrittenOff = false;
        req.status = "issued";
      }
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    });
    actions.append(qtyIssued);

    actions.append(actionButton("Распределить на склад", () => {
      const targetArea = stockArea.value || req.area || COMMON_WAREHOUSE;
      const received = Number(req.qtyReceived || qtyReceived.value || 1);
      const alreadyAdded = Number(req.inventoryAddedQty || 0);
      const delta = Math.max(received - alreadyAdded, 0);
      req.warehouseReceived = true;
      req.stockArea = targetArea;
      req.qtyReceived = received;
      if (delta > 0) {
        addInventory(targetArea, partNameFromRequest(req), delta, `Заявка ${req.equipment}`);
        req.inventoryAddedQty = alreadyAdded + delta;
      }
      req.status = "warehouse";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
    actions.append(actionButton("Выдать механику", () => {
      const targetArea = stockArea.value || req.stockArea || req.area || COMMON_WAREHOUSE;
      const issued = Number(req.qtyIssued || qtyIssued.value || 1);
      removeInventory(targetArea, partNameFromRequest(req), issued);
      req.shopApproved = true;
      req.engineerApproved = true;
      req.supplyPrepared = true;
      req.financeApproved = true;
      req.cashApproved = true;
      req.transferredToWarehouse = true;
      req.warehouseReceived = true;
      req.issued = true;
      req.stock = false;
      req.done = false;
      req.shopInstallApproved = false;
      req.accountingWrittenOff = false;
      if (!req.qtyReceived) req.qtyReceived = 1;
      req.stockArea = targetArea;
      req.qtyIssued = issued;
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
      req.stockArea = targetArea;
      req.qtyReceived = received;
      if (delta > 0) {
        addInventory(targetArea, partNameFromRequest(req), delta, `Запас: ${req.equipment}`);
        req.inventoryAddedQty = alreadyAdded + delta;
      }
      req.status = "stock";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "accounting" && canAct) {
    actions.append(actionButton("Списать деталь", () => {
      req.accountingWrittenOff = true;
      req.done = true;
      req.status = "done";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "mechanic" && canAct) {
    actions.append(actionButton("Установлено, передать начальнику", () => {
      req.mechanicInstalled = true;
      req.done = false;
      req.shopInstallApproved = false;
      req.accountingWrittenOff = false;
      req.status = "waitingShopDone";
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
  button.addEventListener("click", handler);
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
  if (item.request?.trim()) createDirectRequestFromCurrent();
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
  if (rec[current.kind].request?.trim()) createDirectRequestFromCurrent();
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
  if (item.request.trim()) createDirectRequestFromCurrent();
  ui.requestInlineStatus.textContent = item.request.trim() ? `Заявка: ${statusText(item.requestStatus || "shop")}` : "Заявка не создана";
}

ui.requestInput.addEventListener("input", saveCurrentRequest);
ui.requestInput.addEventListener("change", saveCurrentRequest);

ui.createRequestButton.addEventListener("click", () => {
  if (!canEditChecklist()) return;
  saveCurrentRequest();
  const req = createDirectRequestFromCurrent();
  if (!req) {
    ui.requestInlineStatus.textContent = "Заполните поле заявки";
    return;
  }
  ui.requestInlineStatus.textContent = `Заявка создана: ${statusText(req.status || "shop")}`;
  renderChecklist();
});

ui.openRequestsButton.addEventListener("click", () => {
  if (canEditChecklist() && current.view === "checklist" && ui.requestInput.value.trim()) createDirectRequestFromCurrent();
  current.requestRole = defaultRequestRole();
  show("requests");
});

ui.resolvedInput.addEventListener("change", () => {
  if (!canEditChecklist()) return;
  const rec = record();
  rec[current.kind].resolved = ui.resolvedInput.checked;
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
    if (canEditChecklist() && current.view === "checklist" && ui.requestInput.value.trim()) createDirectRequestFromCurrent();
    current.requestRole = button.dataset.openRole;
    show("requests");
  });
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
