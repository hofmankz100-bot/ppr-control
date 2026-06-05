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
  ],
  to2: [
    "Проверить крепления основных узлов и отсутствие ослабленных болтов.",
    "Проверить состояние подвижных частей, направляющих, роликов и валов.",
    "Проверить смазку узлов и необходимость дозаправки.",
    "Проверить фильтры, сетки, вентиляционные каналы и охлаждение.",
    "Проверить датчики, концевики, блокировки и сигнальные цепи.",
    "Проверить рабочие давления, температуру, токи и отклонения от нормы.",
    "Проверить электрошкаф, клеммы и разъемы визуально.",
    "Проверить состояние защитных кожухов, дверей и замков.",
    "Проверить отсутствие люфтов, биения, перекосов и неравномерного хода.",
    "Проверить чистоту труднодоступных зон.",
    "Проверить состояние расходных материалов и запасных деталей.",
    "Проверить журнал предыдущих замечаний по данному узлу.",
    "Выполнить пробный запуск и проверить работу без отклонений.",
    "Зафиксировать дефекты, требующие ремонта или закупки материалов.",
    "Подтвердить результат ТО-2."
  ],
  to3: [
    "Проверить узел по месячному регламенту ППР.",
    "Проверить износ, трещины, деформации и повреждения деталей.",
    "Проверить состояние несущих элементов и крепежа.",
    "Проверить состояние приводов, редукторов, передач и муфт.",
    "Проверить состояние подшипников и уплотнений.",
    "Проверить электрическую часть, защиту, заземление и автоматику.",
    "Проверить систему смазки, охлаждения или пневматики.",
    "Проверить состояние рабочих поверхностей и технологических зон.",
    "Проверить настройку датчиков, блокировок и аварийных цепей.",
    "Провести очистку, регулировку и профилактические работы.",
    "Проверить комплектность защит и предупреждающих табличек.",
    "Сверить выявленные замечания с журналом ремонта.",
    "Определить необходимость ремонта, замены или заказа запасных частей.",
    "Провести контрольный запуск после обслуживания.",
    "Подписать результат месячного ППР."
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

const STORE_KEY = "ppr-pwa-state-v1";
const PROFILE_KEY = "ppr-pwa-profile-v1";
const USERS_KEY = "ppr-pwa-users-v1";
const APP_VERSION = "v31";
const EDITOR_CODE = "kazak18117011";
const AREAS = [...new Set(EQUIPMENT.map(item => item.area))].sort((a, b) => a.localeCompare(b, "ru"));
const ROLE_ACCESS = {
  mechanic: { label: "Механик", requestRoles: ["warehouse", "mechanic"], equipment: "all", checklist: true },
  shop: { label: "Начальник цеха", requestRoles: ["shop"], equipment: "area", checklist: false },
  engineer: { label: "Инженер", requestRoles: ["all", "shop", "engineer", "supply", "finance", "warehouse", "mechanic"], equipment: "all", checklist: true },
  finance: { label: "Экономист", requestRoles: ["finance"], equipment: "none", checklist: false },
  supply: { label: "Снабженец", requestRoles: ["supply"], equipment: "area", checklist: false },
  warehouse: { label: "Складовщик", requestRoles: ["warehouse"], equipment: "none", checklist: false },
  editor: { label: "Редактор", requestRoles: ["all", "shop", "engineer", "supply", "finance", "warehouse", "mechanic"], equipment: "all", checklist: true }
};
const state = loadState();
const profile = loadProfile();
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
  commentLabel: document.querySelector("#commentLabel"),
  commentInput: document.querySelector("#commentInput"),
  requestInput: document.querySelector("#requestInput"),
  requestInlineStatus: document.querySelector("#requestInlineStatus"),
  createRequestButton: document.querySelector("#createRequestButton"),
  openRequestsButton: document.querySelector("#openRequestsButton"),
  requestsMeta: document.querySelector("#requestsMeta"),
  resolvedInput: document.querySelector("#resolvedInput")
};

let current = {
  view: "equipment",
  equipmentId: null,
  nodeIndex: null,
  date: todayISO(),
  kind: "to",
  requestRole: defaultRequestRole(profile?.role),
  month: new Date().getMonth(),
  year: new Date().getFullYear()
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : { checks: {}, requests: {} };
    parsed.checks ||= {};
    parsed.requests ||= {};
    return parsed;
  } catch {
    return { checks: {}, requests: {} };
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  queueRemoteStateSave();
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
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    render();
  } catch {
    // Static/offline mode keeps using localStorage.
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
      body: JSON.stringify({ checks: state.checks, requests: state.requests })
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

function canEditChecklist() {
  return Boolean(roleAccess().checklist);
}

function areaAllowed(area) {
  return !needsArea() || !profile?.area || area === profile.area;
}

function visibleEquipment() {
  const mode = roleAccess().equipment;
  if (mode === "none") return [];
  if (mode === "area") return EQUIPMENT.filter(eq => areaAllowed(eq.area));
  return EQUIPMENT;
}

function requestAllowedByUser(req) {
  if (profile?.role === "editor") return true;
  if (profile?.role === "shop" || profile?.role === "supply") return areaAllowed(req.area);
  return true;
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
    ui.loginEditorCodeRow.hidden = role !== "editor";
    ui.loginEditorCode.required = role === "editor";
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
      to: blankKind(),
      to2: blankKind(),
      to3: blankKind()
    };
  }
  return state.checks[k];
}

function blankKind() {
  return { tasks: Array(15).fill(false), comment: "", request: "", resolved: false };
}

function requestId(equipmentId = current.equipmentId, nodeIndex = current.nodeIndex, date = current.date, kind = current.kind) {
  return `${equipmentId}:${nodeIndex}:${date}:${kind}`;
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
    comment: recKind.comment,
    text: requestText,
    price: recKind.price || "",
    supplier: recKind.supplier || "",
    status: recKind.requestStatus || "created",
    shopApproved: Boolean(recKind.shopApproved),
    engineerApproved: Boolean(recKind.engineerApproved),
    financeApproved: Boolean(recKind.financeApproved),
    transferredToWarehouse: Boolean(recKind.transferredToWarehouse),
    warehouseReceived: Boolean(recKind.warehouseReceived),
    issued: Boolean(recKind.issued),
    done: Boolean(recKind.done),
    stock: Boolean(recKind.stock),
    qtyReceived: Number(recKind.qtyReceived || 0),
    qtyIssued: Number(recKind.qtyIssued || 0)
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
    comment: item.comment || "",
    text,
    price: item.price || req.price || "",
    supplier: item.supplier || req.supplier || "",
    status: item.requestStatus || req.status || "shop",
    shopApproved: Boolean(item.shopApproved || req.shopApproved),
    engineerApproved: Boolean(item.engineerApproved || req.engineerApproved),
    financeApproved: Boolean(item.financeApproved || req.financeApproved),
    transferredToWarehouse: Boolean(item.transferredToWarehouse || req.transferredToWarehouse),
    warehouseReceived: Boolean(item.warehouseReceived || req.warehouseReceived),
    issued: Boolean(item.issued || req.issued),
    done: Boolean(item.done || req.done),
    stock: Boolean(item.stock || req.stock),
    qtyReceived: Number(item.qtyReceived || req.qtyReceived || 0),
    qtyIssued: Number(item.qtyIssued || req.qtyIssued || 0),
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
  item.comment = ui.commentInput.value || item.comment || "";
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
    comment: item.comment || "",
    text,
    price: old.price || item.price || "",
    supplier: old.supplier || item.supplier || "",
    status: old.status || item.requestStatus || "shop",
    shopApproved: Boolean(old.shopApproved || item.shopApproved),
    engineerApproved: Boolean(old.engineerApproved || item.engineerApproved),
    financeApproved: Boolean(old.financeApproved || item.financeApproved),
    transferredToWarehouse: Boolean(old.transferredToWarehouse || item.transferredToWarehouse),
    warehouseReceived: Boolean(old.warehouseReceived || item.warehouseReceived),
    issued: Boolean(old.issued || item.issued),
    done: Boolean(old.done || item.done),
    stock: Boolean(old.stock || item.stock),
    qtyReceived: Number(old.qtyReceived || item.qtyReceived || 0),
    qtyIssued: Number(old.qtyIssued || item.qtyIssued || 0),
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
    ["to", "to2", "to3"].forEach(kind => {
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
  if (role === "shop") return !req.shopApproved;
  if (role === "engineer") return req.shopApproved && !req.engineerApproved;
  if (role === "supply") return req.engineerApproved && !req.transferredToWarehouse && (!req.price || req.financeApproved);
  if (role === "finance") return req.price && !req.financeApproved;
  if (role === "warehouse") return req.transferredToWarehouse;
  if (role === "mechanic") return req.issued && !req.done && !req.stock;
  return false;
}

function requestNeedsRole(req, role) {
  if (role === "all") return true;
  if (role === "warehouse") return req.transferredToWarehouse && !req.warehouseReceived;
  return requestMatchesRole(req, role);
}

function requestRoleLabel(role) {
  return {
    all: "Все",
    shop: "Начальник",
    engineer: "Инженер",
    supply: "Снабжение",
    finance: "Экономист",
    warehouse: "Склад",
    mechanic: "Механик"
  }[role] || role;
}

function waitingRole(req) {
  if (!req.shopApproved) return "shop";
  if (!req.engineerApproved) return "engineer";
  if (req.engineerApproved && !req.price) return "supply";
  if (req.price && !req.financeApproved) return "finance";
  if (req.financeApproved && !req.transferredToWarehouse) return "supply";
  if (req.transferredToWarehouse && !req.warehouseReceived) return "warehouse";
  if (req.stock || req.done) return "done";
  if (req.warehouseReceived && !req.issued) return "warehouse";
  if (req.issued && !req.done) return "mechanic";
  return "done";
}

function quantityText(req) {
  const received = Number(req.qtyReceived || 0);
  const issued = Number(req.qtyIssued || 0);
  if (!received && !issued) return "";
  const left = Math.max(received - issued, 0);
  return `Получено: ${received} шт. · Выдано: ${issued} шт. · Осталось: ${left} шт.`;
}

function requestRoleCounts() {
  const all = allRequests();
  const roles = ["shop", "engineer", "supply", "finance", "warehouse", "mechanic"];
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
  const kind = getRequestKindById(req.id);
  kind.request = req.text;
  kind.comment = req.comment;
  kind.price = req.price;
  kind.supplier = req.supplier;
  kind.requestStatus = req.status;
  kind.shopApproved = req.shopApproved;
  kind.engineerApproved = req.engineerApproved;
  kind.financeApproved = req.financeApproved;
  kind.transferredToWarehouse = req.transferredToWarehouse;
  kind.warehouseReceived = req.warehouseReceived;
  kind.issued = req.issued;
  kind.done = req.done;
  kind.stock = req.stock;
  kind.qtyReceived = Number(req.qtyReceived || 0);
  kind.qtyIssued = Number(req.qtyIssued || 0);
  if (req.done || req.stock) kind.resolved = true;
}

function setRequestStatus(reqKind) {
  if (reqKind.stock) reqKind.requestStatus = "stock";
  else if (reqKind.done) reqKind.requestStatus = "done";
  else if (reqKind.issued) reqKind.requestStatus = "issued";
  else if (reqKind.warehouseReceived) reqKind.requestStatus = "warehouse";
  else if (reqKind.transferredToWarehouse) reqKind.requestStatus = "waitingWarehouse";
  else if (reqKind.financeApproved) reqKind.requestStatus = "financeApproved";
  else if (reqKind.price) reqKind.requestStatus = "finance";
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
    waitingWarehouse: "Передано на склад",
    warehouse: "На складе",
    issued: "Выдано механику",
    done: "Выполнено"
  }[status] || status;
}

function equipmentById(id) {
  return EQUIPMENT.find(item => item.id === id);
}

function statusForRecord(rec) {
  if (rec.to3.tasks.every(Boolean)) return "ТО-3";
  if (rec.to2.tasks.every(Boolean)) return "ТО-2";
  if (rec.to.tasks.every(Boolean)) return "ТО";
  return "";
}

function plannedStatus(day) {
  if (day === 30) return "ТО-3";
  if (day === 10 || day === 20) return "ТО-2";
  return "ТО";
}

function isPlannedDone(rec, planned) {
  if (planned === "ТО-3") return rec.to3.tasks.every(Boolean);
  if (planned === "ТО-2") return rec.to2.tasks.every(Boolean);
  if (planned === "ТО") return rec.to.tasks.every(Boolean);
  return true;
}

function isDueOrPast(date) {
  return date <= todayISO();
}

function hasOpenCommentRecord(rec) {
  return ["to", "to2", "to3"].some(kind => String(rec?.[kind]?.comment || "").trim() && !rec[kind].resolved);
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

function show(view, push = true) {
  if (push && current.view !== view) nav.push(current.view);
  current.view = view;
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  document.querySelector(`#${view}Screen`).classList.add("active");
  ui.back.disabled = view === "equipment";
  render();
}

function render() {
  if (current.view === "equipment") renderEquipment();
  if (current.view === "node") renderNodes();
  if (current.view === "schedule") renderSchedule();
  if (current.view === "checklist") renderChecklist();
  if (current.view === "requests") renderRequests();
}

function renderEquipment() {
  ui.subtitle.textContent = "Оборудование";
  const q = ui.equipmentSearch.value.trim().toLowerCase();
  const count = openCommentCount();
  updateRoleBadges();
  ui.alertCounter.textContent = `${count} замечаний`;
  ui.alertCounter.classList.toggle("alert", count > 0);
  ui.equipmentList.innerHTML = "";
  const table = document.createElement("div");
  table.className = "excel-table equipment-table";
  table.innerHTML = `
    <div class="excel-row excel-header">
      <div>Оборудование</div>
      <div>Участок</div>
      <div>Узлы</div>
      <div>Статус</div>
    </div>
  `;
  const equipment = visibleEquipment();
  if (!equipment.length) {
    ui.equipmentList.innerHTML = `<div class="empty-state">Для вашей роли список оборудования закрыт. Откройте раздел заявок.</div>`;
    return;
  }
  equipment
    .filter(eq => `${eq.name} ${eq.area}`.toLowerCase().includes(q))
    .forEach(eq => {
      const alert = hasOpenCommentEquipment(eq.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `excel-row excel-button ${alert ? "alert" : ""}`;
      button.innerHTML = `
        <div>${eq.name}</div>
        <div>${eq.area}</div>
        <div>${eq.nodes.length}</div>
        <div><span class="small-status ${alert ? "alert" : ""}">${alert ? "Замечание" : "Норма"}</span></div>
      `;
      button.addEventListener("click", () => {
        current.equipmentId = eq.id;
        current.nodeIndex = 0;
        show("schedule");
      });
      table.append(button);
    });
  ui.equipmentList.append(table);
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
  ui.nodeMeta.textContent = `${eq.area} · нажмите на день напротив узла`;
  ui.monthLabel.textContent = new Date(current.year, current.month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  ui.scheduleGrid.innerHTML = "";
  const days = 31;
  const hint = document.createElement("div");
  hint.className = "schedule-hint";
  hint.innerHTML = `
    <span>Утверждённый график: ТО каждый день, ТО-2 10/20 числа, ТО-3 30 числа.</span>
    <span class="legend overdue">Мигает = дата наступила, план не выполнен</span>
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
      const overdue = plan && isDueOrPast(date) && !isPlannedDone(rec, plan);
      const td = document.createElement("td");
      td.className = `${statusClass(status)} ${overdue ? "planned-overdue" : ""} ${open ? "open-comment blink-cell" : ""} ${date === todayISO() ? "today-cell" : ""}`;
      td.textContent = status;
      td.title = overdue ? `${plan} по утверждённому графику не выполнено` : `${status} выполнено или без замечаний`;
      td.addEventListener("click", () => {
        current.nodeIndex = nodeIndex;
        current.date = date;
        current.kind = plan === "ТО-3" ? "to3" : plan === "ТО-2" ? "to2" : "to";
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
  if (status === "ТО-2") return "to2";
  if (status === "ТО-3") return "to3";
  return "";
}

function renderChecklist() {
  const eq = equipmentById(current.equipmentId);
  const node = eq.nodes[current.nodeIndex];
  const rec = record();
  const kind = rec[current.kind];
  ui.subtitle.textContent = "Чек-лист";
  ui.checklistTitle.textContent = node;
  ui.checklistMeta.textContent = `${eq.name} · ${dateHuman(current.date)}`;
  const status = statusForRecord(rec);
  ui.dayStatus.textContent = status || "Пусто";
  ui.dayStatus.style.background = status === "ТО" ? "var(--to)" : status === "ТО-2" ? "var(--to2)" : status === "ТО-3" ? "var(--to3)" : "var(--nav-soft)";
  document.querySelectorAll(".tab[data-kind]").forEach(tab => tab.classList.toggle("active", tab.dataset.kind === current.kind));
  ui.taskList.innerHTML = "";
  const table = document.createElement("table");
  table.className = `checklist-table ${current.kind}`;
  const title = current.kind === "to" ? "Ежедневный осмотр (ТО)" : current.kind === "to2" ? "Периодический осмотр (ТО-2)" : "Ежемесячный ППР (ТО-3)";
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
  statusRow.innerHTML = `<td></td><td>Статус ${current.kind === "to" ? "ТО" : current.kind === "to2" ? "ТО-2" : "ТО-3"}:</td><td>${done ? "Выполнено" : ""}</td>`;
  tbody.append(statusRow);
  table.append(tbody);
  ui.taskList.append(table);
  ui.commentLabel.textContent = current.kind === "to" ? "Комментарий ТО" : current.kind === "to2" ? "Комментарий ТО-2" : "Комментарий ТО-3";
  ui.commentInput.value = kind.comment;
  ui.requestInput.value = kind.request || "";
  ui.requestInlineStatus.textContent = kind.request?.trim() ? `Заявка: ${statusText(kind.requestStatus || "shop")}` : "Заявка не создана";
  ui.resolvedInput.checked = Boolean(kind.resolved);
  ui.commentInput.disabled = !canEditChecklist();
  ui.requestInput.disabled = !canEditChecklist();
  ui.createRequestButton.disabled = !canEditChecklist();
  ui.resolvedInput.disabled = !canEditChecklist();
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
  const rows = all.filter(req => requestVisibleForRole(req, current.requestRole));
  list.innerHTML = rows.length ? "" : `<div class="empty-state">Нет заявок для этого раздела</div>`;
  rows.forEach(req => list.append(requestCard(req)));
}

function requestCard(req) {
  const card = document.createElement("div");
  card.className = "request-card";
  card.innerHTML = `
    <div class="request-main">
      <strong>${req.equipment}</strong>
      <span>${req.node} · ${dateHuman(req.date)}</span>
      <p>${req.comment || "Без комментария"}</p>
      <p class="request-text">${req.text}</p>
      <div class="request-status">${statusText(req.status)}</div>
      <div class="request-waiting">Ждёт: ${requestRoleLabel(waitingRole(req))}</div>
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
    actions.append(actionButton("Подтвердить начальником", () => {
      req.shopApproved = true;
      req.status = "engineer";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "engineer" && canAct) {
    actions.append(actionButton("Подтвердить инженером", () => {
      req.engineerApproved = true;
      req.status = "supply";
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
      req.status = req.price ? "finance" : "supply";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
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
    if (req.financeApproved) {
      actions.append(actionButton("Передать на склад", () => {
        req.transferredToWarehouse = true;
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
      req.status = "financeApproved";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "warehouse" && canAct) {
    const qtyReceived = document.createElement("input");
    qtyReceived.type = "number";
    qtyReceived.min = "0";
    qtyReceived.placeholder = "Получено, шт";
    qtyReceived.value = req.qtyReceived || "";
    qtyReceived.addEventListener("change", () => {
      req.qtyReceived = Number(qtyReceived.value || 0);
      if (req.qtyReceived > 0) req.warehouseReceived = true;
      if (req.qtyReceived > 0 && !String(req.status || "").includes("stock")) req.status = "warehouse";
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
        req.warehouseReceived = true;
        req.issued = true;
        req.status = "issued";
      }
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    });
    actions.append(qtyIssued);

    actions.append(actionButton("Склад получил", () => {
      req.warehouseReceived = true;
      if (!req.qtyReceived) req.qtyReceived = 1;
      req.status = "warehouse";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
    actions.append(actionButton("Выдать механику", () => {
      req.warehouseReceived = true;
      req.issued = true;
      req.stock = false;
      req.done = false;
      if (!req.qtyReceived) req.qtyReceived = 1;
      if (!req.qtyIssued) req.qtyIssued = 1;
      req.status = "issued";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
    actions.append(actionButton("В запас", () => {
      req.warehouseReceived = true;
      req.stock = true;
      req.done = true;
      if (!req.qtyReceived) req.qtyReceived = 1;
      req.status = "stock";
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (current.requestRole === "mechanic" && canAct) {
    actions.append(actionButton("Установлено / выполнено", () => {
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
  button.addEventListener("click", handler);
  return button;
}

function dateHuman(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

ui.back.addEventListener("click", () => {
  const previous = nav.pop() || "equipment";
  show(previous, false);
});

ui.today.addEventListener("click", () => {
  show("requests");
});

ui.equipmentSearch.addEventListener("input", renderEquipment);

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

document.querySelectorAll(".tab[data-kind]").forEach(tab => {
  tab.addEventListener("click", () => {
    current.kind = tab.dataset.kind;
    renderChecklist();
  });
});

ui.commentInput.addEventListener("input", () => {
  if (!canEditChecklist()) return;
  const rec = record();
  const item = rec[current.kind];
  const nextComment = ui.commentInput.value;
  if (nextComment !== item.comment) item.resolved = false;
  item.comment = nextComment;
  ui.resolvedInput.checked = false;
  saveState();
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
