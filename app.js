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
  { id: 3, name: "Литейный цех", area: "Литейный цех", nodes: [
    "Литейная печь", "Стол заливки слитков", "Пила резки алюминиевых слитков", "Транспортер загрузки", "Освещение", "ШГРП литейного цеха", "Кран-балка 6,2 тонны"
  ]},
  { id: 4, name: "Покрасочный цех", area: "Покрасочный цех", nodes: DEFAULT_NODES },
  { id: 5, name: "Шихтовый цех", area: "Шихтовый цех", nodes: ["Ножницы 1", "Ножницы 2", "Пресс брикетировочный 1", "Пресс брикетировочный 2", "Освещение", "ШГРП"] },
  { id: 6, name: "Анодный цех", area: "Анодный цех", nodes: DEFAULT_NODES },
  { id: 7, name: "Упаковка", area: "Упаковка", nodes: DEFAULT_NODES },
  { id: 8, name: "инструментальный цех", area: "Инструментальный цех", nodes: DEFAULT_NODES },
  { id: 9, name: "Компрессорная", area: "Компрессорная", nodes: [
    "Компрессор EKOMAK 90 кВт №1", "Компрессор EKOMAK 90 кВт №2", "Компрессор EKOMAK 110 кВт №3", "Ресивер сжатого воздуха №1",
    "Ресивер сжатого воздуха №2", "Осушитель AirPIK", "Осушитель COMPRAG RDX", "ГРШ компрессорной", "Освещение здания компрессорной"
  ]},
  { id: 10, name: "Насосная", area: "Насосная", nodes: DEFAULT_NODES },
  { id: 11, name: "Токарный цех", area: "Токарный цех", nodes: ["Токарный станок", "Сверлильный станок"] },
  { id: 12, name: "Электроподстанции", area: "Электроподстанции", nodes: DEFAULT_NODES },
  { id: 13, name: "уличное освещение", area: "Территория", nodes: ["Линии освещения", "Опоры освещения", "Светильники", "Щиты управления освещением", "Кабельные линии"] },
  { id: 14, name: "Офисные помещения", area: "Офисные помещения", nodes: ["Освещение", "Электрощиты", "Розеточные группы", "Вентиляция", "Пожарная сигнализация"] },
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
const EDITOR_PREVIEW_ROLE_KEY = "ppr-editor-preview-role-v1";
const EDITOR_PREVIEW_AREA_KEY = "ppr-editor-preview-area-v1";
const APP_VERSION = "v180";
const PUBLIC_APP_URL = "https://ppr-control-ramazan.onrender.com";
const APP_BADGE_KEY = "ppr-app-open-remarks-badge-v2";
const PUSH_SUBSCRIPTION_KEY = "ppr-push-subscription-v1";
const DEVICE_DB_NAME = "ppr-control-device";
const DEVICE_DB_STORE = "state";
const DEVICE_DB_KEY = "full-state";
const MANUAL_REQUEST_WORKFLOW = true;
const REMOVED_REQUEST_ROLES = new Set(["finance", "cash", "accounting", "supply"]);
const WALK_SHIFT_CLEANUP_VERSION = "walk-shift-clean-v1";
const PPR_RECOMMENDED_START_DATE = "2026-06-22";
const ASSET_CACHE_VERSION_KEY = "ppr-asset-cache-version";
const AGGREGATE_JOURNAL_ROWS_PER_SHEET = 18;
const LANGUAGE_KEY = "ppr-user-language-v1";
const TRANSLATION_CACHE_KEY = "ppr-translation-cache-v1";
const TRANSLATION_SOURCE_LANG = "ru";
const translatedNodeOriginals = new WeakMap();
const translatedTextNodes = new Set();
const translatedAttributeTargets = new Set();
const translationMemoryCache = new Map(loadTranslationCacheEntries());
const warehousePriceLookupQueue = [];
const warehousePriceLookupProcessed = new Set();
let warehousePriceLookupRunning = false;
let translationTimer = null;
let translationRunId = 0;
let translationCacheSaveTimer = null;
const LANGUAGES = {
  ru: "Русский",
  kk: "Қазақша"
};
const I18N = {
  ru: {
    appTitle: "ППР Контроль",
    equipment: "Оборудование",
    home: "Главная",
    requests: "Заявки",
    downtime: "Простои",
    profile: "Профиль",
    reminders: "Напоминания и календарь ППР",
    todayControl: "Контроль на сегодня",
    close: "Закрыть",
    back: "Назад",
    loginTitle: "Вход сотрудника",
    registerTitle: "Регистрация сотрудника",
    loginTab: "Вход",
    registerTab: "Регистрация",
    fullName: "ФИО",
    fullNamePlaceholder: "Введите полное имя",
    identifier: "Табельный номер или телефон",
    employeeId: "Табельный номер",
    employeeIdPlaceholder: "Введите табельный номер",
    phone: "Телефон",
    password: "Пароль",
    passwordPlaceholder: "Не менее 6 символов",
    loginButton: "Войти",
    registerButton: "Отправить регистрацию",
    loginHint: "Введите табельный номер или телефон и пароль.",
    registerHint: "Роль и участок назначит админ после проверки.",
    loginFailed: "Не удалось войти.",
    registerFailed: "Не удалось отправить регистрацию.",
    pendingApproval: "Регистрация отправлена админу. После подтверждения войдите по табельному номеру или телефону и паролю.",
    language: "Язык",
    changeRole: "Сменить роль",
    viewMode: "Режим просмотра",
    commonControl: "Общий контроль",
    clearRecords: "Очистить записи",
    logout: "Выйти",
    createRequest: "Создать заявку",
    remarks: "Предупреждения",
    director: "Директорская",
    aggregateJournal: "Агрегатный журнал"
  },
  kk: {
    appTitle: "ППР бақылау",
    equipment: "Жабдық",
    home: "Басты бет",
    requests: "Өтінімдер",
    downtime: "Тоқтап тұру",
    profile: "Профиль",
    reminders: "ППР еске салғыштары мен күнтізбесі",
    todayControl: "Бүгінгі бақылау",
    close: "Жабу",
    back: "Артқа",
    loginTitle: "Қызметкер кіруі",
    registerTitle: "Қызметкерді тіркеу",
    loginTab: "Кіру",
    registerTab: "Тіркелу",
    fullName: "Аты-жөні",
    fullNamePlaceholder: "Толық атын енгізіңіз",
    identifier: "Табель нөмірі немесе телефон",
    employeeId: "Табель нөмірі",
    employeeIdPlaceholder: "Табель нөмірін енгізіңіз",
    phone: "Телефон",
    password: "Құпиясөз",
    passwordPlaceholder: "Кемінде 6 таңба",
    loginButton: "Кіру",
    registerButton: "Тіркеуге жіберу",
    loginHint: "Табель нөмірін немесе телефонды және құпиясөзді енгізіңіз.",
    registerHint: "Рөл мен учаскені тексерістен кейін админ тағайындайды.",
    loginFailed: "Кіру мүмкін болмады.",
    registerFailed: "Тіркеуді жіберу мүмкін болмады.",
    pendingApproval: "Тіркеу админге жіберілді. Расталғаннан кейін табель нөмірі немесе телефон және құпиясөз арқылы кіріңіз.",
    language: "Тіл",
    changeRole: "Рөлді ауыстыру",
    viewMode: "Көру режимі",
    commonControl: "Жалпы бақылау",
    clearRecords: "Жазбаларды тазалау",
    logout: "Шығу",
    createRequest: "Өтінім жасау",
    remarks: "Ескертулер",
    director: "Директорлық",
    aggregateJournal: "Агрегат журналы"
  }
};
const DOWNTIME_COLORS = [
  "#8e3ee8", "#2563eb", "#06b6d4", "#f59e0b", "#10b981", "#ef4444",
  "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#f97316", "#0f766e",
  "#7c3aed", "#0284c7", "#ca8a04", "#16a34a", "#dc2626", "#be185d",
  "#0891b2", "#4f46e5", "#65a30d", "#ea580c", "#0d9488", "#9333ea"
];
const AREAS = [...new Set(EQUIPMENT.map(item => item.area))].sort((a, b) => a.localeCompare(b, "ru"));
const COMMON_WAREHOUSE = "Склад общего пользования";
const WAREHOUSE_AREAS = [COMMON_WAREHOUSE, ...AREAS];
const WAREHOUSE_RENDER_LIMIT = 80;
const DOWNTIME_MONTH_LIMIT_MS = 125 * 60 * 60 * 1000;
const remarkResolutionPhotoDrafts = new Map();
const WALK_SHIFT_DAY_START = 8;
const WALK_SHIFT_NIGHT_START = 20;
const WALK_SHIFT_LABELS = {
  day: "Дневная смена",
  night: "Ночная смена"
};
const ROLE_ACCESS = {
  mechanic: { label: "Механик", requestRoles: ["warehouse", "mechanic"], equipment: "all", checklist: true },
  electrician: { label: "Электрик", requestRoles: ["warehouse", "electrician"], equipment: "all", checklist: true },
  operator: { label: "Оператор", requestRoles: ["warehouse", "operator"], equipment: "area", checklist: true },
  shop: { label: "Начальник цеха", requestRoles: ["all", "shop", "warehouse"], equipment: "area", checklist: true },
  engineer: { label: "Инженер", requestRoles: ["all", "shop", "engineer", "warehouse", "mechanic", "electrician", "operator", "productionDirector"], equipment: "all", checklist: true },
  warehouse: { label: "Складовщик", requestRoles: ["warehouse"], equipment: "none", checklist: false },
  productionDirector: { label: "Директор производства", requestRoles: ["all", "warehouse", "productionDirector"], equipment: "all", checklist: true },
  director: { label: "Директор", requestRoles: [], equipment: "none", checklist: false },
  editor: { label: "Админ", requestRoles: ["all", "shop", "engineer", "warehouse", "mechanic", "electrician", "operator", "productionDirector"], equipment: "all", checklist: true }
};
const state = loadState();
let stateDataVersion = 0;
let allRequestsCacheVersion = -1;
let allRequestsCache = [];
let inventoryItemsCacheVersion = -1;
let inventoryItemsCache = [];
let authenticatedProfile = loadProfile();
let profile = activeProfileFromSession(authenticatedProfile);
applyWorkCleanFromUrl();
const nav = [];
let remoteSaveTimer = null;
let remoteSaveInFlight = false;
let remoteSavePending = false;
let remoteSavePromise = null;
const REMOTE_STATE_FIELDS = [
  "checks", "requests", "inventory", "catalog", "directorMessages", "serviceCosts",
  "downtimes", "compressorJournal", "gasJournal", "pprSheets", "journalDueSince",
  "auditHistory", "operationalResetAt", "walkShiftCleanupVersion"
];
const remoteSectionFingerprints = new Map();
let remoteRetryTimer = null;
let realtimeSocket = null;
let realtimeEventSource = null;
let realtimeReconnectTimer = null;
let realtimePollTimer = null;
let lastRealtimeMessageAt = 0;
let lastRemoteUsersPollAt = 0;
const REALTIME_VERSION_KEY = "ppr-realtime-state-version-v1";
let realtimeStateVersion = localStorage.getItem(REALTIME_VERSION_KEY) || "";
let realtimeVersionPollInFlight = false;
let realtimeChangesLoadPromise = null;
let remoteStateLoadPromise = null;
let appNotificationKeys = new Set();
let appNotificationTrackingReady = false;
let notificationAudioContext = null;
let pushPublicKeyPromise = null;
let requestSearchTimer = null;
let renderTimer = null;
let backgroundRenderPending = false;
let serviceWorkerUpdateReady = false;
const userApprovalDrafts = new Map();
let warehouseReconcileVersion = -1;
let tmcRequestSubmitting = false;
const pendingRequestIds = new Set();
const CLIENT_ID_KEY = "ppr-client-id-v1";
const THEME_KEY = "ppr-theme-v1";
const CLIENT_ID = localStorage.getItem(CLIENT_ID_KEY) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
localStorage.setItem(CLIENT_ID_KEY, CLIENT_ID);

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#08141f" : "#14324a");
  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    button.textContent = next === "dark" ? "☀" : "☾";
    button.setAttribute("aria-label", next === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
    button.setAttribute("title", next === "dark" ? "Светлая тема" : "Тёмная тема");
  });
}

function setupTheme() {
  applyTheme("light");
}
const ui = {
  subtitle: document.querySelector("#screenSubtitle"),
  back: document.querySelector("#backButton"),
  globalReminderButton: document.querySelector("#globalReminderButton"),
  qrWalkButton: document.querySelector("#qrWalkButton"),
  factoryStatusButton: document.querySelector("#factoryStatusButton"),
  globalReminderBadge: document.querySelector("#globalReminderBadge"),
  globalReminderOverlay: document.querySelector("#globalReminderOverlay"),
  globalReminderContent: document.querySelector("#globalReminderContent"),
  globalReminderClose: document.querySelector("#globalReminderClose"),
  loginOverlay: document.querySelector("#loginOverlay"),
  loginForm: document.querySelector("#loginForm"),
  authTitle: document.querySelector("#authTitle"),
  authSubmitButton: document.querySelector("#authSubmitButton"),
  authHint: document.querySelector("#authHint"),
  loginName: document.querySelector("#loginName"),
  loginNameRow: document.querySelector("#loginNameRow"),
  loginEmployeeId: document.querySelector("#loginEmployeeId"),
  loginPhone: document.querySelector("#loginPhone"),
  loginPhoneRow: document.querySelector("#loginPhoneRow"),
  loginPassword: document.querySelector("#loginPassword"),
  toggleLoginPassword: document.querySelector("#toggleLoginPassword"),
  loginIdentifierLabel: document.querySelector("#loginIdentifierLabel"),
  loginError: document.querySelector("#loginError"),
  profileBar: document.querySelector("#profileBar"),
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
  engineerIncomingBanner: document.querySelector("#engineerIncomingBanner"),
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
  createTmcRequestButton: document.querySelector("#createTmcRequestButton"),
  tmcRequestForm: document.querySelector("#tmcRequestForm"),
  tmcRequestArea: document.querySelector("#tmcRequestArea"),
  tmcRequestEquipment: document.querySelector("#tmcRequestEquipment"),
  tmcRequestNode: document.querySelector("#tmcRequestNode"),
  tmcRequestDue: document.querySelector("#tmcRequestDue"),
  tmcRequestRows: document.querySelector("#tmcRequestRows"),
  engineerIncomingTmcPanel: document.querySelector("#engineerIncomingTmcPanel"),
  tmcRequestArchivePanel: document.querySelector("#tmcRequestArchivePanel"),
  addTmcRequestRow: document.querySelector("#addTmcRequestRow"),
  submitTmcRequest: document.querySelector("#submitTmcRequest"),
  tmcRequestStatus: document.querySelector("#tmcRequestStatus"),
  directorOpenButton: document.querySelector("#directorOpenButton"),
  directorOpenLabel: document.querySelector("#directorOpenLabel"),
  directorBadge: document.querySelector("#directorBadge"),
  directorTitle: document.querySelector("#directorTitle"),
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
  directorControlPanel: document.querySelector("#directorControlPanel"),
  requestsMeta: document.querySelector("#requestsMeta"),
  requestSearchInput: document.querySelector("#requestSearchInput"),
  warehousePanel: document.querySelector("#warehousePanel"),
  resolvedInput: document.querySelector("#resolvedInput")
};

let current = {
  view: homeViewForProfile(profile?.role),
  equipmentId: null,
  nodeIndex: null,
  date: todayISO(),
  kind: "to",
  nodeDetailIndex: null,
  requestRole: defaultRequestRole(profile?.role),
  requestSearch: "",
  requestPriority: "",
  requestRoute: "",
  requestDue: "",
  warehouseSearch: "",
  selectedStockArea: "",
  selectedWarehouseFolder: "",
  warehouseInstalledArchiveOpen: false,
  warehouseInstalledArchivePage: 1,
  warehouseZeroArchiveOpen: false,
  warehouseZeroArchivePage: 1,
  scrollToCommentNode: null,
  scrollToRemarkId: "",
  returnToRemarkListAfterResolve: false,
  scrollToDowntimeNode: null,
  scrollToMainComment: false,
  downtimeMonth: new Date().getMonth(),
  downtimeYear: new Date().getFullYear(),
  engineerReportMonth: todayISO().slice(0, 7),
  ratingYear: new Date().getFullYear(),
  serviceCostArea: "",
  serviceCostEquipmentId: "",
  serviceCostNodeIndex: "",
  selectedDowntimeArea: "",
  selectedAggregateArea: "",
  directorControlEquipmentId: null,
  directorProgressOpen: false,
  directorKpiOpen: "",
  directorArchiveOpen: "",
  directorAuditOpen: false,
  pprCalendarMonth: new Date().getMonth(),
  pprCalendarYear: new Date().getFullYear(),
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

function ensureEngineerReportUi() {
  if (!ui.engineerReportButton) {
    const topbarActions = document.querySelector(".topbar-actions");
    if (topbarActions) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "engineerReportButton";
      button.className = "topbar-overview-button topbar-factory-button";
      button.innerHTML = `<span>Состояние завода</span><strong>🏭</strong>`;
      topbarActions.append(button);
      ui.engineerReportButton = button;
    }
  }
  if (!document.querySelector("#engineerReportScreen")) {
    const main = document.querySelector(".screen");
    const section = document.createElement("section");
    section.id = "engineerReportScreen";
    section.className = "view";
    section.innerHTML = `
      <div class="panel-head compact">
        <div>
          <h1>Отчёт инженера</h1>
          <p>Месячный отчёт для печати и объяснения директору</p>
        </div>
        <div class="segmented engineer-report-controls" role="group" aria-label="Месяц отчёта">
          <input id="engineerReportMonth" type="month">
          <button id="engineerReportPrint" type="button">Печать</button>
        </div>
      </div>
      <div id="engineerReportPanel" class="engineer-report-panel"></div>
    `;
    main?.append(section);
  }
  ui.engineerReportButton = document.querySelector("#engineerReportButton");
  ui.engineerReportMonth = document.querySelector("#engineerReportMonth");
  ui.engineerReportPrint = document.querySelector("#engineerReportPrint");
  ui.engineerReportPanel = document.querySelector("#engineerReportPanel");
}

ensureEngineerReportUi();

function ensureWorkerRatingUi() {
  if (!ui.workerRatingButton) {
    const quickNav = document.querySelector(".quick-nav");
    const topbarActions = document.querySelector(".topbar-actions");
    if (quickNav && topbarActions) {
      if (ui.factoryStatusButton) {
        ui.factoryStatusButton.classList.add("topbar-overview-button", "topbar-factory-button");
        topbarActions.append(ui.factoryStatusButton);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.id = "workerRatingButton";
      button.className = "topbar-overview-button topbar-rating-button";
      button.innerHTML = `<span>Рейтинг</span><strong aria-hidden="true">★</strong>`;
      const firstFactoryButton = topbarActions.querySelector(".topbar-factory-button");
      topbarActions.insertBefore(button, firstFactoryButton || null);
      const createButton = document.querySelector("#createTmcRequestButton");
      if (ui.globalReminderButton) quickNav.insertBefore(ui.globalReminderButton, createButton || null);
      ui.workerRatingButton = button;
    }
  }
  if (!document.querySelector("#workerRatingScreen")) {
    const main = document.querySelector(".screen");
    const section = document.createElement("section");
    section.id = "workerRatingScreen";
    section.className = "view";
    section.innerHTML = `
      <div class="panel-head compact">
        <div>
          <h1>Рейтинг электриков и механиков</h1>
          <p>Баллы, КПД, скорость ремонта, аварии, ППР и лучший сотрудник месяца</p>
        </div>
        <div class="segmented worker-rating-controls" role="group" aria-label="Год рейтинга">
          <button id="prevRatingYear" type="button">‹</button>
          <strong id="workerRatingYearLabel"></strong>
          <button id="nextRatingYear" type="button">›</button>
        </div>
      </div>
      <div id="workerRatingPanel" class="worker-rating-panel"></div>
    `;
    main?.append(section);
  }
  ui.workerRatingButton = document.querySelector("#workerRatingButton");
  ui.workerRatingYearLabel = document.querySelector("#workerRatingYearLabel");
  ui.workerRatingPanel = document.querySelector("#workerRatingPanel");
  ui.prevRatingYear = document.querySelector("#prevRatingYear");
  ui.nextRatingYear = document.querySelector("#nextRatingYear");
}

ensureWorkerRatingUi();

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

function isOpenLegacyJournalRequest(req) {
  if (!req || typeof req !== "object") return false;
  if (req.kind === "journal-batch" || req.kind === "tmc") return false;
  if (req.deleted || req.stock || req.done || req.shopApproved) return false;
  if (req.supplyPrepared || req.financeApproved || req.cashApproved || req.transferredToWarehouse || req.warehouseReceived || req.issued) return false;
  const status = String(req.status || req.requestStatus || "shop");
  if (!["shop", "created"].includes(status)) return false;
  if (req.kind && req.kind !== "to") return false;
  if (!req.equipmentId || req.nodeIndex === undefined || !req.date) return false;
  return Boolean(String(req.text || req.request || "").trim());
}

function mergeLegacyOpenJournalRequests(targetState) {
  targetState.requests ||= {};
  targetState.checks ||= {};
  return { changed: false, merged: 0 };
}

function isJournalRequestRecord(id, req = {}) {
  const kind = String(req?.kind || "");
  return kind === "journal-batch" || kind === "to" || String(id || "").includes(":to");
}

function normalizeArticle(value) {
  return String(value || "").trim().toUpperCase();
}

function inventoryKey(area, name, article = "") {
  const cleanArea = area || "Общий склад";
  const cleanArticle = normalizeArticle(article);
  if (cleanArticle) return `${cleanArea}::article::${cleanArticle.toLowerCase()}`;
  return `${cleanArea}::name::${String(name || "").trim().toLowerCase()}`;
}

function nextInventoryArticle(targetState = state, reserved = new Set()) {
  const used = new Set(reserved);
  Object.values(targetState?.inventory || {}).forEach(item => {
    const article = normalizeArticle(item?.article);
    if (article) used.add(article);
  });
  Object.values(targetState?.requests || {}).forEach(req => {
    requestItems(req).forEach(item => {
      const article = normalizeArticle(item?.article);
      if (article) used.add(article);
    });
  });
  let max = 0;
  used.forEach(article => {
    const match = /^ART-(\d+)$/.exec(article);
    if (match) max = Math.max(max, Number(match[1] || 0));
  });
  let next = max + 1;
  let article = "";
  do {
    article = `ART-${String(next).padStart(6, "0")}`;
    next += 1;
  } while (used.has(article));
  reserved.add(article);
  return article;
}

function findInventoryArticleByName(area, name, targetState = state) {
  const cleanArea = area || "Общий склад";
  const cleanName = String(name || "").trim().toLowerCase();
  if (!cleanName) return "";
  const existing = Object.values(targetState?.inventory || {}).find(item =>
    (item?.area || "Общий склад") === cleanArea
    && String(item?.name || "").trim().toLowerCase() === cleanName
    && normalizeArticle(item?.article)
  );
  return normalizeArticle(existing?.article);
}

function ensureInventoryArticle(area, name, article = "", targetState = state, reserved = new Set()) {
  return normalizeArticle(article)
    || findInventoryArticleByName(area, name, targetState)
    || nextInventoryArticle(targetState, reserved);
}

function migrateInventoryArticles(targetState = state) {
  targetState.inventory ||= {};
  const next = {};
  const reserved = new Set();
  let changed = false;
  Object.values(targetState.inventory).forEach(item => {
    if (!item || typeof item !== "object") return;
    const article = ensureInventoryArticle(item.area, item.name, item.article, targetState, reserved);
    const id = inventoryKey(item.area, item.name, article);
    const old = next[id];
    if (old) {
      old.qty = Number(old.qty || 0) + Number(item.qty || 0);
      old.receivedQty = Number(old.receivedQty || 0) + Number(item.receivedQty || item.qty || 0);
      old.issuedQty = Number(old.issuedQty || 0) + Number(item.issuedQty || 0);
      old.updatedAt = [old.updatedAt, item.updatedAt].filter(Boolean).sort().at(-1) || new Date().toISOString();
      changed = true;
    } else {
      next[id] = { ...item, id, article };
      if (item.id !== id || normalizeArticle(item.article) !== article) changed = true;
    }
  });
  if (changed) targetState.inventory = next;
  return { changed };
}

function removeJournalRequestsLocal(targetState) {
  targetState.requests ||= {};
  targetState.checks ||= {};
  let changed = false;
  const now = new Date().toISOString();
  Object.entries(targetState.requests).forEach(([id, req]) => {
    if (!isJournalRequestRecord(id, req)) return;
    delete targetState.requests[id];
    changed = true;
  });
  Object.values(targetState.checks).forEach(rec => {
    const item = rec?.to;
    if (!item || typeof item !== "object") return;
    const fields = ["request", "requestPhoto", "requestStatus", "requestedTargetRole", "lastRequestId", "invoicePhoto", "noInvoiceApproved"];
    const hadRequestFields = fields.some(field => Boolean(item[field]));
    if (!hadRequestFields) return;
    fields.forEach(field => { item[field] = ""; });
    item.updatedAt = now;
    changed = true;
  });
  return { changed };
}

function clearLegacyWalkCompletions(parsed) {
  if (parsed.walkShiftCleanupVersion === WALK_SHIFT_CLEANUP_VERSION) return { changed: false };
  let changed = false;
  const now = new Date().toISOString();
  Object.values(parsed.checks || {}).forEach(rec => {
    const item = rec?.to;
    if (!item || typeof item !== "object") return;
    const hadLegacyWalk = Boolean(item.walkDone || item.tasks?.[0]);
    if (!hadLegacyWalk) return;
    if (Array.isArray(item.tasks)) item.tasks[0] = false;
    item.walkDone = false;
    item.updatedAt = now;
    rec.updatedAt = now;
    changed = true;
  });
  parsed.checks = compactCheckRecords(parsed.checks || {});
  parsed.walkShiftCleanupVersion = WALK_SHIFT_CLEANUP_VERSION;
  return { changed };
}

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
    parsed.serviceCosts ||= [];
    parsed.downtimes ||= [];
    parsed.compressorJournal ||= {};
    parsed.gasJournal ||= {};
    parsed.pprSheets ||= {};
    parsed.journalDueSince ||= {};
    parsed.auditHistory ||= [];
    parsed.operationalResetAt ||= "";
    const walkCleanup = clearLegacyWalkCompletions(parsed);
    const migration = mergeLegacyOpenJournalRequests(parsed);
    const journalCleanup = removeJournalRequestsLocal(parsed);
    const articleMigration = migrateInventoryArticles(parsed);
    const remoteMigrationChanged = migration.changed || walkCleanup.changed || journalCleanup.changed;
    if (remoteMigrationChanged || articleMigration.changed) {
      parsed.journalRequestCleanupVersion = APP_VERSION;
      persistStateLocally(parsed);
    }
    if (remoteMigrationChanged) {
      localStorage.setItem(`${STORE_KEY}-pending`, "1");
    }
    return parsed;
  } catch {
    return { checks: {}, requests: {}, inventory: {}, catalog: { equipment: {} }, directorMessages: [], serviceCosts: [], downtimes: [], compressorJournal: {}, gasJournal: {}, pprSheets: {}, journalDueSince: {}, auditHistory: [], operationalResetAt: "", walkShiftCleanupVersion: WALK_SHIFT_CLEANUP_VERSION };
  }
}

function persistStateLocally(snapshot = state) {
  scheduleDeviceStatePersist(snapshot);
  const lightweight = {
    ...snapshot,
    inventory: {},
    auditHistory: Array.isArray(snapshot?.auditHistory) ? snapshot.auditHistory.slice(-100) : []
  };
  try {
    // Large warehouse catalogs belong in IndexedDB. Keeping them out of synchronous
    // localStorage prevents visible freezes on every comment or button press.
    localStorage.setItem(STORE_KEY, JSON.stringify(lightweight));
    return true;
  } catch (error) {
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.setItem(STORE_KEY, JSON.stringify({
        checks: lightweight.checks || {},
        requests: lightweight.requests || {},
        catalog: lightweight.catalog || { equipment: {} },
        operationalResetAt: lightweight.operationalResetAt || "",
        walkShiftCleanupVersion: lightweight.walkShiftCleanupVersion || ""
      }));
    } catch {}
    console.warn("Local fallback state was reduced because browser storage is full", error);
    return false;
  }
}

let devicePersistTimer = null;
let pendingDeviceSnapshot = null;

function scheduleDeviceStatePersist(snapshot = state) {
  pendingDeviceSnapshot = snapshot;
  clearTimeout(devicePersistTimer);
  devicePersistTimer = window.setTimeout(() => {
    devicePersistTimer = null;
    const nextSnapshot = pendingDeviceSnapshot;
    pendingDeviceSnapshot = null;
    persistStateToDevice(nextSnapshot).catch(error => console.warn("Device database save failed", error));
  }, 180);
}

function openDeviceDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = indexedDB.open(DEVICE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DEVICE_DB_STORE)) db.createObjectStore(DEVICE_DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

async function persistStateToDevice(snapshot = state) {
  const db = await openDeviceDatabase();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(DEVICE_DB_STORE, "readwrite");
    transaction.objectStore(DEVICE_DB_STORE).put(snapshot, DEVICE_DB_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB write failed"));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB write aborted"));
  });
  db.close();
}

async function loadStateFromDevice() {
  try {
    const db = await openDeviceDatabase();
    const cached = await new Promise((resolve, reject) => {
      const transaction = db.transaction(DEVICE_DB_STORE, "readonly");
      const request = transaction.objectStore(DEVICE_DB_STORE).get(DEVICE_DB_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("IndexedDB read failed"));
    });
    db.close();
    return cached;
  } catch {
    return null;
  }
}

async function refreshStaleAssetCache() {
  const previousVersion = localStorage.getItem(ASSET_CACHE_VERSION_KEY);
  if (previousVersion === APP_VERSION) return;
  localStorage.setItem(ASSET_CACHE_VERSION_KEY, APP_VERSION);
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => !key.includes(APP_VERSION)).map(key => caches.delete(key)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.update()));
    }
  } catch {}
}

function saveState(options = {}) {
  stateDataVersion += 1;
  state.checks = compactCheckRecords(state.checks);
  persistStateLocally(state);
  if (options.remote === false) {
    window.queueMicrotask(updateGlobalReminderBadge);
    window.queueMicrotask(syncAppIconBadge);
    return;
  }
  localStorage.setItem(`${STORE_KEY}-pending`, "1");
  queueRemoteStateSave();
  window.queueMicrotask(updateGlobalReminderBadge);
  window.queueMicrotask(syncAppIconBadge);
}

async function publishStateNow() {
  clearTimeout(remoteSaveTimer);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await saveRemoteState();
    if (localStorage.getItem(`${STORE_KEY}-pending`) !== "1") break;
    clearTimeout(remoteSaveTimer);
  }
}

function setButtonBusy(button, busy, text = "В ожидании...") {
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

function showAppToast(message, type = "ok") {
  const toast = document.createElement("div");
  toast.className = `app-toast ${type}`;
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.classList.add("visible"), 20);
  window.setTimeout(() => {
    toast.classList.remove("visible");
    window.setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function applyAppIconBadge(count) {
  const unread = Math.max(0, Number(count) || 0);
  try {
    if (unread > 0 && typeof navigator.setAppBadge === "function") {
      navigator.setAppBadge(unread).catch(() => {});
    } else if (typeof navigator.clearAppBadge === "function") {
      navigator.clearAppBadge().catch(() => {});
    }
  } catch {}
}

function appNotificationPermissionButton() {
  if (!("Notification" in window)) return "";
  if (Notification.permission === "granted" && localStorage.getItem(PUSH_SUBSCRIPTION_KEY) === "1") return "";
  const denied = Notification.permission === "denied";
  return `<button type="button" id="enableAppNotificationsButton" class="enable-app-notifications" ${denied ? "disabled" : ""}>${denied ? "Уведомления запрещены в настройках" : "🔔 Включить уведомления"}</button>`;
}

function pushApplicationServerKey(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), char => char.charCodeAt(0));
}

function preparePushPublicKey() {
  pushPublicKeyPromise ||= fetch("/api/push/public-key", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("push_public_key_failed");
      return response.json();
    })
    .then(result => String(result.publicKey || ""));
  return pushPublicKeyPromise;
}

async function ensurePushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const [registration, publicKey] = await Promise.all([navigator.serviceWorker.ready, preparePushPublicKey()]);
  if (!publicKey) return false;
  let subscription = await registration.pushManager.getSubscription();
  subscription ||= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: pushApplicationServerKey(publicKey)
  });
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      clientId: CLIENT_ID,
      profile: {
        id: authenticatedProfile?.id || profile?.id || "",
        employeeId: authenticatedProfile?.employeeId || profile?.employeeId || "",
        phone: authenticatedProfile?.phone || profile?.phone || "",
        name: authenticatedProfile?.name || profile?.name || "",
        role: authenticatedProfile?.role || profile?.role || "",
        area: authenticatedProfile?.area || profile?.area || ""
      }
    })
  });
  if (!response.ok) return false;
  localStorage.setItem(PUSH_SUBSCRIPTION_KEY, "1");
  return true;
}

function syncNotificationSetupPrompt() {
  const existing = document.querySelector("#notificationSetupPrompt");
  if (!mobileShareMode()) {
    existing?.remove();
    return;
  }
  const pushReady = localStorage.getItem(PUSH_SUBSCRIPTION_KEY) === "1";
  if (!isProfileReady() || !("Notification" in window) || (Notification.permission === "granted" && pushReady)) {
    existing?.remove();
    return;
  }
  preparePushPublicKey().catch(() => {});
  const denied = Notification.permission === "denied";
  const prompt = existing || document.createElement("div");
  prompt.id = "notificationSetupPrompt";
  prompt.className = "app-notification-prompt";
  prompt.innerHTML = `
    <div><strong>Замечания со звуком</strong><span>${denied ? "Разрешите уведомления для ALKZ в настройках iPhone" : "Нажмите один раз, чтобы включить красный счётчик и звук"}</span></div>
    <button type="button" ${denied ? "disabled" : ""}>${denied ? "Откройте настройки" : "Включить"}</button>
  `;
  if (!existing) document.body.append(prompt);
  prompt.querySelector("button")?.addEventListener("click", event => requestAppNotificationPermission(event.currentTarget), { once: true });
}

async function requestAppNotificationPermission(button) {
  if (!("Notification" in window)) {
    showAppToast("Системные уведомления не поддерживаются на этом устройстве.", "error");
    return;
  }
  if (Notification.permission === "denied") {
    showAppToast("Разрешите уведомления для ALKZ в настройках iPhone.", "error");
    return;
  }
  setButtonBusy(button, true, "Разрешение...");
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const pushEnabled = await ensurePushSubscription().catch(() => false);
      syncAppIconBadge();
      playNotificationDingDong();
      const remarks = openCommentCount();
      if (!remarks) {
        applyAppIconBadge(1);
        window.setTimeout(() => syncAppIconBadge(), 12000);
      }
      const registration = await navigator.serviceWorker?.ready;
      await registration?.showNotification("ALKZ — уведомления включены", {
        body: remarks ? `Открытых замечаний: ${remarks}` : "Звук и красный счётчик готовы к работе",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "alkz-notification-test",
        renotify: true,
        silent: false
      });
      showAppToast(pushEnabled
        ? "Готово: звук включён, на иконке показана проверочная цифра."
        : "Уведомления разрешены, но push не подключился. Нажмите «Включить» ещё раз.", pushEnabled ? "ok" : "error");
      renderProfile();
    } else {
      showAppToast("Без разрешения iPhone не покажет счётчик на иконке ALKZ.", "error");
      renderProfile();
    }
  } catch {
    showAppToast("Не удалось включить уведомления. Откройте ALKZ с домашнего экрана.", "error");
  } finally {
    if (button?.isConnected) setButtonBusy(button, false);
  }
}

async function showBackgroundSystemNotification(added, total) {
  if (document.visibilityState !== "hidden" || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker?.ready;
    await registration?.showNotification("ALKZ — новое замечание", {
      body: added === 1 ? `Открытых замечаний: ${total}` : `Новых замечаний: ${added}. Открытых: ${total}`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "alkz-remarks",
      renotify: true,
      silent: false,
      vibrate: [180, 80, 220],
      data: { url: "/" }
    });
  } catch {}
}

function resetAppNotificationsForOpen() {
  appNotificationKeys = currentAppNotificationKeys();
  appNotificationTrackingReady = Boolean(profile);
  syncAppIconBadge();
}

function currentAppNotificationKeys() {
  if (!profile) return new Set();
  const keys = new Set();
  const visibleEquipmentIds = new Set(visibleEquipment().map(eq => String(eq.id)));
  Object.entries(state.checks || {}).forEach(([recordKey, rec]) => {
    const [equipmentId] = recordKey.split(":");
    if (!visibleEquipmentIds.has(equipmentId)) return;
    openRemarkEntries(rec?.to || {}).forEach(entry => {
      if (remarkNotificationVisibleToCurrentUser(entry)) keys.add(`comment|${recordKey}|${entry.id}`);
    });
  });
  return keys;
}

function syncAppIconBadge(count = currentAppNotificationKeys().size) {
  const remarks = Math.max(0, Number(count) || 0);
  if (remarks > 0) localStorage.setItem(APP_BADGE_KEY, String(remarks));
  else localStorage.removeItem(APP_BADGE_KEY);
  applyAppIconBadge(remarks);
}

function unlockNotificationAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    notificationAudioContext ||= new AudioContextClass();
    if (notificationAudioContext.state === "suspended") notificationAudioContext.resume().catch(() => {});
  } catch {}
}

function playNotificationDingDong() {
  try {
    unlockNotificationAudio();
    const context = notificationAudioContext;
    if (!context || context.state !== "running") return;
    const start = context.currentTime + 0.02;
    [
      { frequency: 880, offset: 0, duration: 0.42, volume: 0.16 },
      { frequency: 659.25, offset: 0.46, duration: 0.55, volume: 0.14 }
    ].forEach(note => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, start + note.offset);
      gain.gain.setValueAtTime(0.0001, start + note.offset);
      gain.gain.exponentialRampToValueAtTime(note.volume, start + note.offset + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.offset + note.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + note.offset);
      oscillator.stop(start + note.offset + note.duration + 0.03);
    });
  } catch {}
}

function registerNewAppNotifications(count, total) {
  const added = Math.max(0, Number(count) || 0);
  const openRemarks = Math.max(0, Number(total) || 0);
  syncAppIconBadge(openRemarks);
  if (!added) return;
  playNotificationDingDong();
  showBackgroundSystemNotification(added, openRemarks);
}

function processAppNotificationChanges(beforeKeys = null) {
  const afterKeys = currentAppNotificationKeys();
  if (!profile || !appNotificationTrackingReady) {
    appNotificationKeys = afterKeys;
    appNotificationTrackingReady = Boolean(profile);
    syncAppIconBadge();
    return;
  }
  const baseline = beforeKeys instanceof Set ? beforeKeys : appNotificationKeys;
  let added = 0;
  afterKeys.forEach(item => {
    if (!baseline.has(item)) added += 1;
  });
  appNotificationKeys = afterKeys;
  registerNewAppNotifications(added, afterKeys.size);
}

function showQrSavedNotice(message = "") {
  const pending = localStorage.getItem(`${STORE_KEY}-pending`) === "1";
  showAppToast(pending || !navigator.onLine
    ? "QR сохранён на телефоне. При появлении Wi‑Fi отправится автоматически."
    : message || "QR отмечен и отправляется автоматически.");
}

async function runButtonOperation(button, handler, text = "В ожидании...") {
  if (!button || button.disabled) return;
  const requestId = button.dataset.requestId || "";
  if (requestId) pendingRequestIds.add(requestId);
  setButtonBusy(button, true, text);
  try {
    await Promise.resolve(handler());
    await publishStateNow();
    if (requestId) pendingRequestIds.delete(requestId);
    if (current.view === "requests") renderRequests();
  } catch (error) {
    if (requestId) pendingRequestIds.delete(requestId);
    console.error("Request action failed", error);
    window.alert("Действие не сохранилось. Попробуйте ещё раз.");
    if (current.view === "requests") renderRequests();
  } finally {
    if (requestId && localStorage.getItem(`${STORE_KEY}-pending`) !== "1") {
      pendingRequestIds.delete(requestId);
    }
    if (button.isConnected) setButtonBusy(button, false);
  }
}

async function clearRecordedDataEverywhere() {
  const clearedAt = new Date().toISOString();
  const downtimeTombstones = (state.downtimes || [])
    .filter(item => item?.id)
    .map(item => ({
      id: item.id,
      deleted: true,
      deletedAt: clearedAt,
      updatedAt: clearedAt
    }));
  downtimeTombstones.push({
    id: "__downtime-clear__",
    deleted: true,
    clearAll: true,
    deletedAt: clearedAt,
    updatedAt: clearedAt
  });
  state.checks = {};
  state.requests = {};
  state.inventory = {};
  state.downtimes = downtimeTombstones;
  state.compressorJournal = {};
  state.gasJournal = {};
  state.pprSheets = {};
  state.directorMessages = [];
  state.serviceCosts = [];
  state.serviceCosts = [];
  persistStateLocally(state);
  localStorage.setItem(`${STORE_KEY}-pending`, "1");
  localStorage.setItem(`${STORE_KEY}-clear-recorded`, "1");
  localStorage.setItem(`${STORE_KEY}-clear-confirm`, "ОЧИСТИТЬ");
  await publishStateNow();
}

function applyWorkCleanFromUrl() {
  const cleanMode = new URLSearchParams(window.location.search).get("clean");
  if (cleanMode === "logs") {
    state.checks = {};
    state.requests = {};
    state.downtimes = [];
    state.serviceCosts = [];
    state.compressorJournal = {};
    state.gasJournal = {};
    state.pprSheets = {};
    persistStateLocally(state);
    return;
  }
  if (cleanMode !== "work") return;
  state.checks = {};
  state.requests = {};
  state.inventory = {};
  state.downtimes = [];
  state.compressorJournal = {};
  state.gasJournal = {};
  state.pprSheets = {};
  state.directorMessages = [];
  state.serviceCosts = [];
  state.serviceCosts = [];
  persistStateLocally(state);
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
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.data = data;
      error.status = response.status;
      throw error;
    }
    return data;
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

function mergeObjectByFreshnessLocal(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  Object.entries(incoming || {}).forEach(([id, value]) => {
    if (isIncomingNewerRecord(next[id], value)) next[id] = value;
  });
  return next;
}

function mergeCommentLogsLocal(current = [], incoming = []) {
  const map = new Map();
  for (const entry of [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!entry || typeof entry !== "object") continue;
    const brokenText = /^\?{3,}$/.test(String(entry.text || "").trim());
    const brokenName = /^[?\s]{3,}$/.test(String(entry.name || "").trim());
    if (brokenText && brokenName) continue;
    const entryKey = String(entry.id || "") || [entry.at, entry.type, entry.role, entry.name, entry.text, entry.photo].map(value => String(value || "")).join("\u0001");
    map.set(entryKey, { ...(map.get(entryKey) || {}), ...entry });
  }
  return Array.from(map.values()).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
}

function mergeCheckRecordLocal(current = {}, incoming = {}) {
  const incomingWins = isIncomingNewerRecord(current, incoming);
  const next = incomingWins ? { ...incoming } : { ...current };
  const currentTo = current?.to && typeof current.to === "object" ? current.to : {};
  const incomingTo = incoming?.to && typeof incoming.to === "object" ? incoming.to : {};
  const baseTo = incomingWins ? incomingTo : currentTo;
  next.to = {
    ...baseTo,
    commentLog: mergeCommentLogsLocal(currentTo.commentLog, incomingTo.commentLog)
  };
  const hasLocalComposer = Boolean(String(currentTo.nodeDraftText || "").trim() || currentTo.commentPhoto);
  if (hasLocalComposer) {
    next.to.nodeDraftText = currentTo.nodeDraftText || "";
    next.to.commentPhoto = currentTo.commentPhoto || "";
    next.to.commentOwnerRole = currentTo.commentOwnerRole || "";
    next.to.commentOwnerName = currentTo.commentOwnerName || "";
    next.to.commentUpdatedAt = currentTo.commentUpdatedAt || "";
  }
  return next;
}

function mergeCheckRecordsLocal(current = {}, incoming = {}) {
  const next = { ...(current || {}) };
  Object.entries(incoming || {}).forEach(([id, value]) => {
    next[id] = mergeCheckRecordLocal(next[id] || {}, value || {});
  });
  return next;
}

function mergeRemoteState(remote = {}, options = {}) {
  stateDataVersion += 1;
  const remoteResetAt = String(remote.operationalResetAt || "");
  if (remoteResetAt && remoteResetAt !== String(state.operationalResetAt || "")) {
    state.checks = {};
    state.requests = {};
    state.downtimes = [];
    state.compressorJournal = {};
    state.gasJournal = {};
    state.pprSheets = {};
    state.journalDueSince = {};
    state.directorMessages = [];
    state.serviceCosts = [];
    state.auditHistory = [];
    state.operationalResetAt = remoteResetAt;
    localStorage.removeItem(`${STORE_KEY}-pending`);
  }
  if (remote.walkShiftCleanupVersion !== WALK_SHIFT_CLEANUP_VERSION) clearLegacyWalkCompletions(remote);
  const preferRemote = options.preferRemote === true && localStorage.getItem(`${STORE_KEY}-pending`) !== "1";
  state.checks = compactCheckRecords(mergeCheckRecordsLocal(state.checks, remote.checks));
  state.requests = preferRemote
    ? { ...(remote.requests || {}) }
    : mergeObjectByFreshnessLocal(state.requests, remote.requests);
  Object.assign(state.inventory, remote.inventory || {});
  state.catalog ||= { equipment: {} };
  state.catalog.equipment = isEditorSession()
    ? { ...(state.catalog.equipment || {}), ...(remote.catalog?.equipment || {}) }
    : { ...(remote.catalog?.equipment || {}) };
  state.directorMessages = mergeArrayByIdLocal(state.directorMessages, remote.directorMessages);
  state.serviceCosts = mergeArrayByIdLocal(state.serviceCosts, remote.serviceCosts);
  state.downtimes = mergeArrayByIdLocal(state.downtimes, remote.downtimes);
  state.compressorJournal = preferRemote
    ? { ...(remote.compressorJournal || {}) }
    : mergeObjectByFreshnessLocal(state.compressorJournal || {}, remote.compressorJournal || {});
  state.gasJournal = preferRemote
    ? { ...(remote.gasJournal || {}) }
    : mergeObjectByFreshnessLocal(state.gasJournal || {}, remote.gasJournal || {});
  state.pprSheets = preferRemote
    ? { ...(remote.pprSheets || {}) }
    : mergeObjectByFreshnessLocal(state.pprSheets || {}, remote.pprSheets || {});
  state.journalDueSince = { ...(state.journalDueSince || {}), ...(remote.journalDueSince || {}) };
  state.auditHistory = mergeArrayByIdLocal(state.auditHistory, remote.auditHistory);
  state.operationalResetAt = remoteResetAt || state.operationalResetAt || "";
  state.walkShiftCleanupVersion = state.walkShiftCleanupVersion || remote.walkShiftCleanupVersion || "";
  const migration = mergeLegacyOpenJournalRequests(state);
  const journalCleanup = removeJournalRequestsLocal(state);
  const articleMigration = migrateInventoryArticles(state);
  if (migration.changed) {
    state.journalRequestCleanupVersion = APP_VERSION;
    localStorage.setItem(`${STORE_KEY}-pending`, "1");
  }
  if (journalCleanup.changed) {
    state.journalRequestCleanupVersion = APP_VERSION;
    localStorage.setItem(`${STORE_KEY}-pending`, "1");
  }
  persistStateLocally(state);
}

function mergeRealtimePatch(remote = {}) {
  stateDataVersion += 1;
  if (remote.checks) {
    state.checks = compactCheckRecords(mergeCheckRecordsLocal(state.checks, remote.checks));
  }
  if (remote.requests) state.requests = mergeObjectByFreshnessLocal(state.requests, remote.requests);
  if (remote.inventory) state.inventory = mergeObjectByFreshnessLocal(state.inventory, remote.inventory);
  if (remote.catalog?.equipment) {
    state.catalog ||= { equipment: {} };
    state.catalog.equipment = { ...(state.catalog.equipment || {}), ...remote.catalog.equipment };
  }
  if (remote.compressorJournal) state.compressorJournal = mergeObjectByFreshnessLocal(state.compressorJournal, remote.compressorJournal);
  if (remote.gasJournal) state.gasJournal = mergeObjectByFreshnessLocal(state.gasJournal, remote.gasJournal);
  if (remote.pprSheets) state.pprSheets = mergeObjectByFreshnessLocal(state.pprSheets, remote.pprSheets);
  if (remote.journalDueSince) state.journalDueSince = { ...(state.journalDueSince || {}), ...remote.journalDueSince };
  if (remote.downtimes) state.downtimes = mergeArrayByIdLocal(state.downtimes, remote.downtimes);
  if (remote.directorMessages) state.directorMessages = mergeArrayByIdLocal(state.directorMessages, remote.directorMessages);
  if (remote.serviceCosts) state.serviceCosts = mergeArrayByIdLocal(state.serviceCosts, remote.serviceCosts);
  if (remote.auditHistory) state.auditHistory = mergeArrayByIdLocal(state.auditHistory, remote.auditHistory);
  if (Object.prototype.hasOwnProperty.call(remote, "operationalResetAt")) state.operationalResetAt = remote.operationalResetAt;
  if (Object.prototype.hasOwnProperty.call(remote, "walkShiftCleanupVersion")) state.walkShiftCleanupVersion = remote.walkShiftCleanupVersion;
  persistStateLocally(state);
}

function setRealtimeStateVersion(value) {
  realtimeStateVersion = String(value || "");
  if (realtimeStateVersion) localStorage.setItem(REALTIME_VERSION_KEY, realtimeStateVersion);
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
    if (msg.type === "ready") {
      pollRemoteUsers(true);
      const serverVersion = String(msg.stateVersion || "");
      if (serverVersion && serverVersion !== realtimeStateVersion) {
        syncRemoteChanges(serverVersion);
      } else if (serverVersion) {
        setRealtimeStateVersion(serverVersion);
      }
      return;
    }
    if (msg.type !== "state") return;
    const notificationKeysBeforeUpdate = appNotificationTrackingReady ? currentAppNotificationKeys() : null;
    if (msg.partial) mergeRealtimePatch(msg.state || {});
    else mergeRemoteState(msg.state || {}, { preferRemote: true });
    if (msg.origin === CLIENT_ID) {
      appNotificationKeys = currentAppNotificationKeys();
    } else {
      processAppNotificationChanges(notificationKeysBeforeUpdate);
    }
    if (msg.stateVersion) setRealtimeStateVersion(msg.stateVersion);
    loadRemoteUsers();
    scheduleRender();
  } catch {}
}

async function syncRemoteChanges(expectedVersion = "") {
  if (realtimeChangesLoadPromise) return realtimeChangesLoadPromise;
  realtimeChangesLoadPromise = (async () => {
    try {
      if (!realtimeStateVersion) return await loadRemoteState();
      const result = await apiJson(`/api/changes?since=${encodeURIComponent(realtimeStateVersion)}`, { timeout: 10000 });
      if (result?.reset) return await loadRemoteState();
      const events = Array.isArray(result?.events) ? result.events : [];
      for (const event of events) handleRealtimeMessage(event);
      const version = String(result?.stateVersion || expectedVersion || "");
      if (version) setRealtimeStateVersion(version);
      return true;
    } catch {
      return await loadRemoteState();
    } finally {
      realtimeChangesLoadPromise = null;
    }
  })();
  return realtimeChangesLoadPromise;
}

async function pollRealtimeStateVersion() {
  if (realtimeVersionPollInFlight) return;
  realtimeVersionPollInFlight = true;
  try {
    const health = await apiJson("/api/health", { timeout: 5000 });
    const serverVersion = String(health?.stateVersion || "");
    if (serverVersion && serverVersion !== realtimeStateVersion) {
      const loaded = await syncRemoteChanges(serverVersion);
      if (loaded) setRealtimeStateVersion(serverVersion);
    }
  } catch {
    // The normal reconnect and state polling paths remain active.
  } finally {
    realtimeVersionPollInFlight = false;
  }
}

function connectRealtimeEvents() {
  if (!("EventSource" in window)) return false;
  if (realtimeEventSource && realtimeEventSource.readyState !== EventSource.CLOSED) return true;
  realtimeEventSource = new EventSource("/api/events");
  realtimeEventSource.onmessage = event => handleRealtimeMessage(event.data);
  realtimeEventSource.onopen = () => {
    lastRealtimeMessageAt = Date.now();
    pollRemoteUsers(true);
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

function connectRealtimeSocket() {
  if (!("WebSocket" in window)) return false;
  if (realtimeSocket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(realtimeSocket.readyState)) return true;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  realtimeSocket = new WebSocket(`${protocol}//${window.location.host}/ws`);
  realtimeSocket.onmessage = event => handleRealtimeMessage(event.data);
  realtimeSocket.onopen = () => {
    lastRealtimeMessageAt = Date.now();
    pollRemoteUsers(true);
    if (realtimeEventSource) {
      realtimeEventSource.close();
      realtimeEventSource = null;
    }
    if (localStorage.getItem(`${STORE_KEY}-pending`) === "1") saveRemoteState();
  };
  realtimeSocket.onerror = () => {
    try { realtimeSocket?.close(); } catch {}
  };
  realtimeSocket.onclose = () => {
    realtimeSocket = null;
    connectRealtimeEvents();
    clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = window.setTimeout(connectRealtime, 1500);
  };
  return true;
}

function connectRealtime() {
  if (!connectRealtimeSocket()) connectRealtimeEvents();
}

function startRealtimePoll() {
  clearInterval(realtimePollTimer);
  realtimePollTimer = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    pollRemoteUsers();
    const socketAlive = realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN;
    const eventsAlive = realtimeEventSource && realtimeEventSource.readyState === EventSource.OPEN;
    pollRealtimeStateVersion();
    if (eventsAlive || socketAlive) {
      if (socketAlive && Date.now() - lastRealtimeMessageAt > 20000) {
        try { realtimeSocket.send(JSON.stringify({ type: "ping" })); } catch {}
      }
      return;
    }
    connectRealtime();
  }, 1000);
}

async function loadRemoteState() {
  if (remoteStateLoadPromise) return remoteStateLoadPromise;
  remoteStateLoadPromise = (async () => {
    try {
      const remote = await apiJson("/api/state");
      const notificationKeysBeforeUpdate = appNotificationTrackingReady ? currentAppNotificationKeys() : null;
      if (remote?.stateVersion) setRealtimeStateVersion(remote.stateVersion);
      const localResetAtBeforeMerge = String(state.operationalResetAt || "");
      const remoteResetAt = String(remote.operationalResetAt || "");
      rememberRemoteStateBaseline(remote);
      mergeRemoteState(remote, { preferRemote: true });
      const sameOperationalPeriod = !remoteResetAt || localResetAtBeforeMerge === remoteResetAt;
      if (sameOperationalPeriod) {
        const recoveredChecks = {};
        Object.entries(state.checks || {}).forEach(([recordKey, mergedRecord]) => {
          const serverRecord = remote.checks?.[recordKey];
          if (JSON.stringify(mergedRecord) === JSON.stringify(serverRecord)) return;
          if (!serverRecord || isIncomingNewerRecord(serverRecord, mergedRecord)) {
            recoveredChecks[recordKey] = mergedRecord;
          }
        });
        if (Object.keys(recoveredChecks).length) {
          await publishRecoveredChecksNow(recoveredChecks, remoteResetAt);
        }
      }
      processAppNotificationChanges(notificationKeysBeforeUpdate);
      scheduleRender();
      return true;
    } catch {
      // Static/offline mode keeps using localStorage.
      return false;
    } finally {
      remoteStateLoadPromise = null;
    }
  })();
  return remoteStateLoadPromise;
}

async function publishRecoveredChecksNow(checks, operationalResetAt) {
  try {
    const result = await apiJson("/api/state", {
      method: "PUT",
      timeout: 60000,
      body: JSON.stringify({
        actionId: nextActionId(),
        clientId: CLIENT_ID,
        baseOperationalResetAt: String(operationalResetAt || state.operationalResetAt || ""),
        user: profile ? {
          name: profile.name || "",
          role: profile.role || "",
          phone: profile.phone || "",
          authenticatedRole: authenticatedProfile?.role || profile.role || ""
        } : null,
        checks
      })
    });
    remoteSectionFingerprints.set("checks", JSON.stringify(state.checks || {}));
    if (result?.stateVersion) setRealtimeStateVersion(result.stateVersion);
    persistStateLocally(state);
    return true;
  } catch {
    localStorage.setItem(`${STORE_KEY}-pending`, "1");
    scheduleRemoteRetry();
    return false;
  }
}

async function publishNodeUpdateNow(equipmentId, nodeIndex, date) {
  const recordKey = key(equipmentId, nodeIndex, date);
  const localRecord = state.checks[recordKey];
  if (!localRecord) return false;
  localRecord.updatedAt = localRecord.to?.updatedAt || new Date().toISOString();
  try {
    const result = await apiJson("/api/node-update", {
      method: "PUT",
      timeout: 15000,
      body: JSON.stringify({
        actionId: nextActionId(),
        clientId: CLIENT_ID,
        user: profile ? {
          name: profile.name || "",
          role: profile.role || "",
          phone: profile.phone || "",
          authenticatedRole: authenticatedProfile?.role || profile.role || ""
        } : null,
        key: recordKey,
        record: localRecord,
        downtimes: state.downtimes || []
      })
    });
    if (result?.state) mergeRealtimePatch(result.state);
    if (result?.stateVersion) setRealtimeStateVersion(result.stateVersion);
    persistStateLocally(state);
    return true;
  } catch {
    localStorage.setItem(`${STORE_KEY}-pending`, "1");
    scheduleRemoteRetry();
    return false;
  }
}

async function loadRemoteUsers() {
  try {
    const notificationKeysBeforeUpdate = appNotificationTrackingReady ? currentAppNotificationKeys() : null;
    const users = await apiJson("/api/users");
    if (Array.isArray(users)) {
      const previousUsers = localStorage.getItem(USERS_KEY) || "[]";
      const nextUsers = JSON.stringify(users);
      const usersChanged = previousUsers !== nextUsers;
      localStorage.setItem(USERS_KEY, nextUsers);
      if (isProfileWaitingApproval()) {
        const fresh = users.find(user =>
          (profile.id && user.id === profile.id) ||
          (profile.employeeId && user.employeeId === profile.employeeId) ||
          (profile.phone && user.phone === profile.phone)
        );
        if (fresh?.approved === true && fresh?.pendingApproval !== true) {
          localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, ...fresh, approved: true, pendingApproval: false }));
          await finishAuthOnCurrentPage();
          return;
        }
      }
      processAppNotificationChanges(notificationKeysBeforeUpdate);
      updateDirectorBadge();
      if (usersChanged && ["director", "directorControl"].includes(current.view)) scheduleRender();
    }
  } catch {
    // Static/offline mode keeps using local registered users.
  }
}

function pollRemoteUsers(force = false) {
  if (!isEditorSession() && !isProfileWaitingApproval()) return;
  const now = Date.now();
  if (!force && now - lastRemoteUsersPollAt < 4000) return;
  lastRemoteUsersPollAt = now;
  loadRemoteUsers();
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

function rememberRemoteStateBaseline(snapshot = {}, fingerprints = null) {
  REMOTE_STATE_FIELDS.forEach(field => {
    if (fingerprints?.has(field)) {
      remoteSectionFingerprints.set(field, fingerprints.get(field));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(snapshot, field)) {
      remoteSectionFingerprints.set(field, JSON.stringify(snapshot[field]));
    }
  });
}

function changedRemoteStateSections() {
  const payload = {};
  const fingerprints = new Map();
  REMOTE_STATE_FIELDS.forEach(field => {
    const value = state[field];
    const fingerprint = JSON.stringify(value);
    if (field === "catalog" && !["editor", "engineer", "shop"].includes(catalogEditorRole())) {
      remoteSectionFingerprints.set(field, fingerprint);
      return;
    }
    if (remoteSectionFingerprints.get(field) === fingerprint) return;
    payload[field] = value;
    fingerprints.set(field, fingerprint);
  });
  return { payload, fingerprints };
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
    const changedSections = changedRemoteStateSections();
    const result = await apiJson("/api/state", {
      method: "PUT",
      timeout: 60000,
      body: JSON.stringify({
        actionId: nextActionId(),
        clientId: CLIENT_ID,
        // The reset marker is a concurrency guard, not a changed state section.
        // Send it with every save so the server can safely accept operational
        // changes even when the delta contains only checks, requests or reports.
        baseOperationalResetAt: String(state.operationalResetAt || ""),
        clearRecordedData: localStorage.getItem(`${STORE_KEY}-clear-recorded`) === "1",
        clearConfirm: localStorage.getItem(`${STORE_KEY}-clear-confirm`) || "",
        user: profile ? {
          name: profile.name || "",
          role: profile.role || "",
          area: profile.area || "",
          phone: profile.phone || "",
          authenticatedRole: authenticatedProfile?.role || profile.role || "",
          authenticatedArea: authenticatedProfile?.area || profile.area || ""
        } : null,
        ...changedSections.payload
      })
    });
    rememberRemoteStateBaseline({}, changedSections.fingerprints);
    const hasNewLocalChanges = remoteSavePending;
    if (!hasNewLocalChanges) localStorage.removeItem(`${STORE_KEY}-pending`);
    localStorage.removeItem(`${STORE_KEY}-clear-recorded`);
    localStorage.removeItem(`${STORE_KEY}-clear-confirm`);
    if (result?.state) mergeRemoteState(result.state, { preferRemote: !hasNewLocalChanges });
    if (result?.stateVersion) setRealtimeStateVersion(result.stateVersion);
    if (!hasNewLocalChanges && pendingRequestIds.size) {
      pendingRequestIds.clear();
      if (current.view === "requests") renderRequests();
    }
  } catch (error) {
    if (error?.data?.error === "state_reset_mismatch") {
      // A reset made this local snapshot obsolete. Reload instead of retrying
      // forever or pretending that the rejected operation was saved.
      localStorage.removeItem(`${STORE_KEY}-pending`);
      localStorage.removeItem(`${STORE_KEY}-clear-recorded`);
      localStorage.removeItem(`${STORE_KEY}-clear-confirm`);
      await loadRemoteState();
      showAppToast("Период записей был обновлён. Данные синхронизированы — повторите последнее действие.", "error");
    } else {
      // If the backend is unavailable, local work remains saved and will be resent.
      scheduleRemoteRetry();
    }
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

function isEditorSession() {
  return authenticatedProfile?.role === "editor";
}

function editorPreviewRole() {
  if (!isEditorSession()) return "";
  const savedRole = localStorage.getItem(EDITOR_PREVIEW_ROLE_KEY) || "editor";
  return ROLE_ACCESS[savedRole] ? savedRole : "editor";
}

function editorPreviewArea(role = editorPreviewRole()) {
  if (!isEditorSession() || !needsArea(role)) return "";
  const savedArea = localStorage.getItem(EDITOR_PREVIEW_AREA_KEY) || "";
  return AREAS.includes(savedArea) ? savedArea : "";
}

function activeProfileFromSession(user) {
  if (user && REMOVED_REQUEST_ROLES.has(user.role)) {
    return { ...user, role: "mechanic", originalRemovedRole: user.role };
  }
  if (!user || user.role !== "editor") return user;
  const previewRole = editorPreviewRole();
  const area = needsArea(previewRole)
    ? editorPreviewArea(previewRole) || user.area || AREAS.find(areaName => areaName !== "Резерв") || ""
    : user.area || "";
  return {
    ...user,
    role: previewRole,
    area,
    editorOriginalRole: "editor",
    editorPreviewRole: previewRole
  };
}

function setEditorPreviewRole(role) {
  if (!isEditorSession() || !ROLE_ACCESS[role]) return;
  localStorage.setItem(EDITOR_PREVIEW_ROLE_KEY, role);
  if (!needsArea(role)) localStorage.removeItem(EDITOR_PREVIEW_AREA_KEY);
  profile = activeProfileFromSession(authenticatedProfile);
  current.requestRole = defaultRequestRole(profile?.role);
  current.view = homeViewForProfile(profile?.role);
  nav.length = 0;
  show(current.view, false);
}

function setEditorPreviewArea(area) {
  if (!isEditorSession()) return;
  if (area && !AREAS.includes(area)) return;
  if (area) localStorage.setItem(EDITOR_PREVIEW_AREA_KEY, area);
  else localStorage.removeItem(EDITOR_PREVIEW_AREA_KEY);
  profile = activeProfileFromSession(authenticatedProfile);
  current.view = homeViewForProfile(profile?.role);
  nav.length = 0;
  show(current.view, false);
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function currentLanguage() {
  const value = profile?.language || localStorage.getItem(LANGUAGE_KEY) || "ru";
  return I18N[value] ? value : "ru";
}

function t(key) {
  const lang = currentLanguage();
  return I18N[lang]?.[key] || I18N.ru[key] || key;
}

function languageOptions(selected = currentLanguage()) {
  return Object.entries(LANGUAGES)
    .map(([code, label]) => `<option value="${code}" data-no-translate ${code === selected ? "selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
}

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

function applyLanguage() {
  const lang = currentLanguage();
  document.documentElement.lang = lang;
  document.title = t("appTitle");
  setText(".app-title", t("appTitle"));
  setText('[data-auth-mode="login"]', t("loginTab"));
  setText('[data-auth-mode="register"]', t("registerTab"));
  setText("#loginNameRow span", t("fullName"));
  if (ui.loginName) ui.loginName.placeholder = t("fullNamePlaceholder");
  const passwordLabel = ui.loginPassword?.closest("label")?.querySelector("span");
  if (passwordLabel) passwordLabel.textContent = t("password");
  if (ui.loginPassword) ui.loginPassword.placeholder = t("passwordPlaceholder");
  setText("#loginPhoneRow span", t("phone"));
  setText("#globalReminderTitle", t("reminders"));
  setText(".global-reminder-head span", t("todayControl").toUpperCase());
  ui.globalReminderButton?.setAttribute("aria-label", t("reminders"));
  ui.globalReminderButton?.setAttribute("title", t("reminders"));
  ui.globalReminderClose?.setAttribute("aria-label", t("close"));
  ui.back?.setAttribute("aria-label", t("back"));
  ui.back?.setAttribute("title", t("back"));
  setText('[data-mobile-view="home"] small', t("home"));
  setText('[data-mobile-view="requestCreate"] small', t("createRequest"));
  setText('[data-mobile-view="requests"] small', t("requests"));
  setText('[data-mobile-view="downtime"] small', t("downtime"));
  setText('[data-mobile-view="profile"] small', t("profile"));
  const createRequestButton = document.querySelector("#createTmcRequestButton span");
  if (createRequestButton) createRequestButton.textContent = t("createRequest");
  const alertCounterLabel = document.querySelector("#alertCounter span");
  if (alertCounterLabel) alertCounterLabel.textContent = remarksSectionLabel();
  const downtimeButton = document.querySelector("#downtimeOpenButton");
  if (downtimeButton?.firstChild) downtimeButton.firstChild.nodeValue = `${t("downtime")} `;
  const directorLabel = document.querySelector("#directorOpenLabel");
  if (directorLabel && !isEditorSession()) directorLabel.textContent = t("director");
}

function saveProfileLanguage(language) {
  if (!I18N[language]) return;
  localStorage.setItem(LANGUAGE_KEY, language);
  if (profile) {
    const storedProfile = authenticatedProfile || profile;
    const nextStoredProfile = { ...storedProfile, language };
    if (authenticatedProfile) authenticatedProfile = nextStoredProfile;
    profile = authenticatedProfile ? activeProfileFromSession(authenticatedProfile) : { ...profile, language };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nextStoredProfile));
    const userPayload = {
      id: nextStoredProfile.id || "",
      employeeId: nextStoredProfile.employeeId || "",
      phone: nextStoredProfile.phone || "",
      name: nextStoredProfile.name || "",
      role: nextStoredProfile.role || "",
      area: nextStoredProfile.area || "",
      approved: nextStoredProfile.approved,
      pendingApproval: nextStoredProfile.pendingApproval,
      status: nextStoredProfile.status || "",
      language,
      actionId: nextActionId(),
      clientId: CLIENT_ID
    };
    apiJson("/api/users", {
      method: "POST",
      body: JSON.stringify(userPayload)
    }).catch(() => {});
  }
  render();
}

function translationRoot() {
  if (ui.loginOverlay && !ui.loginOverlay.hidden) return ui.loginOverlay;
  return document.querySelector(".app-shell") || document.querySelector(".view.active") || document.body;
}

function isTranslatableText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length < 2 || text.length > 1200) return false;
  if (/^[\d\s.,:;()+\-/%№#]+$/.test(text)) return false;
  return /[A-Za-zА-Яа-яЁёІіҢңҒғҚқҰұҮүӨөӘәҺһЎўҚқҒғҲҳ]/.test(text);
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

const MANUAL_CONTENT_TRANSLATION_SELECTOR = [
  ".warehouse-panel",
  ".aggregate-journal-list",
  ".aggregate-journal-sheet",
  ".checklist-table",
  ".node-walk-row",
  ".director-card",
  ".director-users",
  ".director-memo-form",
  ".equipment-card",
  ".calendar-grid",
  ".downtime-card",
  ".downtime-chart",
  ".downtime-details",
  ".comment-history",
  ".comment-entry",
  ".comment-owner",
  ".comment-resolution-detail",
  ".request-list",
  ".request-author",
  ".request-history",
  ".director-info-list",
  ".audit-history-panel",
  ".director-users",
  ".request-text",
  ".stock-action-line",
  ".manual-text",
  "[data-tmc-row]",
  "[data-no-translate]"
].join(", ");

function shouldSkipTranslationElement(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.closest?.("[hidden], [aria-hidden='true'], .view:not(.active)")) return true;
  if (el.closest?.("script, style, textarea, input, pre")) return true;
  if (el.closest?.(MANUAL_CONTENT_TRANSLATION_SELECTOR)) return true;
  return false;
}

function collectTextNodesForTranslation(root) {
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!isTranslatableText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      if (shouldSkipTranslationElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function collectAttributeTargetsForTranslation(root) {
  const attrs = ["title", "aria-label", "placeholder"];
  const targets = [];
  root.querySelectorAll("*").forEach(el => {
    if (shouldSkipTranslationElement(el) && el.tagName !== "INPUT") return;
    attrs.forEach(attr => {
      const value = el.getAttribute(attr);
      if (isTranslatableText(value)) targets.push({ el, attr, value });
    });
  });
  return targets;
}

function attrOriginalKey(attr) {
  return `i18nOriginal${attr.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase())}`;
}

function loadTranslationCacheEntries() {
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      const clean = parsed.filter(entry =>
        Array.isArray(entry)
        && entry.length === 2
        && !looksLikeMojibake(entry[0])
        && !looksLikeMojibake(entry[1])
      );
      if (clean.length !== parsed.length) localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(clean));
      return clean;
    }
  } catch {
    localStorage.removeItem(TRANSLATION_CACHE_KEY);
  }
  return [];
}

function translationCacheKey(target, text) {
  return `${target}\u0001${text}`;
}

function getCachedTranslation(target, text) {
  return translationMemoryCache.get(translationCacheKey(target, text)) || "";
}

function setCachedTranslation(target, text, translated) {
  if (!target || !text || !translated) return;
  if (looksLikeMojibake(text) || looksLikeMojibake(translated)) return;
  const key = translationCacheKey(target, text);
  if (translationMemoryCache.has(key)) translationMemoryCache.delete(key);
  translationMemoryCache.set(key, translated);
  while (translationMemoryCache.size > 2500) {
    const oldest = translationMemoryCache.keys().next().value;
    translationMemoryCache.delete(oldest);
  }
  clearTimeout(translationCacheSaveTimer);
  translationCacheSaveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify([...translationMemoryCache.entries()]));
    } catch {}
  }, 700);
}

function restoreTranslatedPage(root = document.body) {
  translatedTextNodes.forEach(node => {
    if (!node.isConnected) {
      translatedTextNodes.delete(node);
      return;
    }
    if (root && !root.contains(node.parentElement)) return;
    const original = translatedNodeOriginals.get(node);
    if (original) node.nodeValue = original;
  });
  translatedAttributeTargets.forEach(item => {
    const { el, attr } = item || {};
    if (!el?.isConnected) {
      translatedAttributeTargets.delete(item);
      return;
    }
    if (root && !root.contains(el)) return;
    const key = attrOriginalKey(attr);
    const original = el.dataset?.[key];
    if (original) el.setAttribute(attr, original);
  });
}

async function translateVisiblePage(force = false) {
  const target = currentLanguage();
  const root = translationRoot();
  if (!root || target === TRANSLATION_SOURCE_LANG) {
    if (translatedTextNodes.size || translatedAttributeTargets.size) restoreTranslatedPage(root || document.body);
    return;
  }
  restoreTranslatedPage(root);
  const runId = ++translationRunId;
  const textNodes = collectTextNodesForTranslation(root);
  const attrTargets = collectAttributeTargetsForTranslation(root);
  const originals = [];
  textNodes.forEach(node => {
    const original = force ? String(node.nodeValue || "").replace(/\s+/g, " ").trim() : (translatedNodeOriginals.get(node) || String(node.nodeValue || "").replace(/\s+/g, " ").trim());
    translatedNodeOriginals.set(node, original);
    translatedTextNodes.add(node);
    originals.push(original);
  });
  attrTargets.forEach(targetItem => {
    const key = attrOriginalKey(targetItem.attr);
    if (!targetItem.el.dataset[key]) targetItem.el.dataset[key] = targetItem.value;
    translatedAttributeTargets.add(targetItem);
    originals.push(targetItem.el.dataset[key] || targetItem.value);
  });
  const texts = [...new Set(originals.filter(isTranslatableText))].slice(0, 700);
  if (!texts.length) return;
  try {
    const translations = {};
    const missingTexts = [];
    texts.forEach(text => {
      const cached = getCachedTranslation(target, text);
      if (cached) translations[text] = cached;
      else missingTexts.push(text);
    });
    for (let i = 0; i < missingTexts.length; i += 200) {
      const response = await apiJson("/api/translate", {
        method: "POST",
        timeout: 8000,
        body: JSON.stringify({ target, texts: missingTexts.slice(i, i + 200) })
      });
      Object.entries(response?.translations || {}).forEach(([source, translated]) => {
        translations[source] = translated;
        setCachedTranslation(target, source, translated);
      });
    }
    if (runId !== translationRunId || currentLanguage() !== target) return;
    textNodes.forEach(node => {
      const original = translatedNodeOriginals.get(node) || String(node.nodeValue || "").replace(/\s+/g, " ").trim();
      const translated = translations[original];
      if (translated && translated !== original) node.nodeValue = String(node.nodeValue || "").replace(original, translated);
    });
    attrTargets.forEach(({ el, attr, value }) => {
      const original = el.dataset?.[attrOriginalKey(attr)] || value;
      const translated = translations[original];
      if (translated && translated !== original) el.setAttribute(attr, translated);
    });
  } catch {
    // Offline or translation service unavailable: keep original text.
  }
}

function queueTranslateVisiblePage(force = false) {
  clearTimeout(translationTimer);
  if (currentLanguage() === TRANSLATION_SOURCE_LANG) {
    if (translatedTextNodes.size || translatedAttributeTargets.size) {
      restoreTranslatedPage(translationRoot() || document.body);
    }
    return;
  }
  translationTimer = window.setTimeout(() => translateVisiblePage(force), force ? 20 : 120);
}

async function registerEmployee(data) {
  const result = await apiJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
  const pendingProfile = { ...result.user, registrationPending: true, approved: false, pendingApproval: true };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(pendingProfile));
  return pendingProfile;
}

async function loginEmployee(identifier, password) {
  const result = await apiJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password })
  });
  if (result.user?.role === "editor") localStorage.removeItem(EDITOR_PREVIEW_ROLE_KEY);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(result.user));
  return result.user;
}

async function finishAuthOnCurrentPage() {
  authenticatedProfile = loadProfile();
  profile = activeProfileFromSession(authenticatedProfile);

  if (isProfileWaitingApproval()) {
    ui.loginOverlay.hidden = false;
    ui.loginForm.hidden = true;
    ui.loginError.textContent = t("pendingApproval");
    window.setInterval(loadRemoteUsers, 5000);
    return;
  }

  if (!isProfileReady()) return;

  ui.loginOverlay.hidden = true;
  ui.loginForm.hidden = false;
  ui.loginError.textContent = "";
  resetCurrentForProfile();
  renderProfile();
  applyLanguage();
  flushPendingWork();
  loadRemoteUsers();
  const loaded = await loadRemoteState();
  if (!loaded) render();
  show(current.view, false);
  if (localStorage.getItem(PUSH_SUBSCRIPTION_KEY) === "1" && window.Notification?.permission === "granted") {
    ensurePushSubscription().catch(() => {});
  }
}

function defaultRequestRole(role = profile?.role) {
  if (MANUAL_REQUEST_WORKFLOW && role === "warehouse") return "warehouse";
  if (MANUAL_REQUEST_WORKFLOW) return "all";
  const access = ROLE_ACCESS[role] || ROLE_ACCESS.mechanic;
  if (access.requestRoles.includes(role)) return role;
  if (access.requestRoles.includes("all")) return "all";
  return access.requestRoles[0] || "all";
}

function homeViewForProfile(role = profile?.role) {
  if (role === "warehouse") return "requests";
  if (role === "director") return "directorControl";
  return "equipment";
}

function resetCurrentForProfile() {
  current.view = homeViewForProfile(profile?.role);
  current.requestRole = defaultRequestRole(profile?.role);
  current.equipmentId = null;
  current.nodeIndex = null;
  current.nodeDetailIndex = null;
  nav.length = 0;
}

function roleAccess() {
  return ROLE_ACCESS[profile?.role] || ROLE_ACCESS.mechanic;
}

function canOpenView(view) {
  if (profile?.role === "warehouse") return view === "requests";
  if (view === "directorControl") return ["director", "editor"].includes(profile?.role);
  if (view === "engineerReport") return ["engineer", "editor", "productionDirector"].includes(profile?.role);
  if (view === "workerRating") return ["mechanic", "electrician", "engineer", "editor", "productionDirector"].includes(profile?.role);
  if (view === "requestCreate") return canEditChecklist();
  return true;
}

function canShowMobileView(view) {
  if (view === "profile" || view === "home") return true;
  if (view === "requests" && MANUAL_REQUEST_WORKFLOW) return false;
  return canOpenView(view);
}

function isProfileReady() {
  if (!profile?.name || !profile?.role) return false;
  return profile.approved !== false && profile.pendingApproval !== true;
}

function isProfileWaitingApproval() {
  return Boolean(profile?.name && (profile.registrationPending || profile.approved === false || profile.pendingApproval === true));
}

function needsArea(role = profile?.role) {
  return role === "shop" || role === "operator";
}

function isFieldWorkerRole(role = profile?.role) {
  return ["mechanic", "electrician", "operator"].includes(role);
}

function canOpenRequestRole(role) {
  if (MANUAL_REQUEST_WORKFLOW) {
    if (role === "all") return profile?.role !== "warehouse";
    if (role === "warehouse") return roleAccess().requestRoles.includes("warehouse");
    return role === profile?.role && canReceiveWarehouseIssue(role);
  }
  if (profile?.role === "editor") return roleAccess().requestRoles.includes(role);
  if (profile?.role === "warehouse") return role === "warehouse";
  if (role === "warehouse") return roleAccess().requestRoles.includes("warehouse");
  return role === profile?.role && roleAccess().requestRoles.includes(role);
}

function canSeeRequestRoleIndicator(role) {
  if (MANUAL_REQUEST_WORKFLOW) {
    if (role === "all") return profile?.role !== "warehouse";
    if (role === "warehouse") return roleAccess().requestRoles.includes("warehouse");
    return role === profile?.role && canReceiveWarehouseIssue(role);
  }
  if (profile?.role === "editor") return roleAccess().requestRoles.includes(role);
  if (profile?.role === "warehouse") return role === "warehouse";
  if (role === "all") return false;
  return Boolean(ROLE_ACCESS[role]);
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

function catalogEditorRole() {
  return authenticatedProfile?.role || profile?.role || "";
}

function canManageCatalogStructure(equipmentOrId = current.equipmentId) {
  return canEditEquipmentCatalog(equipmentOrId);
}

function canEditEquipmentCatalog(equipmentOrId = current.equipmentId) {
  const role = catalogEditorRole();
  if (!["editor", "engineer", "shop"].includes(role)) return false;
  const eq = typeof equipmentOrId === "object" ? equipmentOrId : equipmentById(Number(equipmentOrId));
  if (!eq) return false;
  if (role !== "shop") return true;
  const actorArea = authenticatedProfile?.area || profile?.area || "";
  return Boolean(actorArea && eq.area === actorArea);
}

function canEditCatalog() {
  return canEditEquipmentCatalog(current.equipmentId);
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
  const eq = equipmentById(equipmentId);
  if (!eq || !canEditEquipmentCatalog(eq)) return false;
  const item = equipmentOverride(equipmentId);
  const nextName = String(patch?.name || eq.name).trim() || eq.name;
  item.name = nextName;
  item.area ||= eq.area;
  item.updatedAt = new Date().toISOString();
  if (nextName !== eq.name) recordAudit("Изменил название оборудования", eq.name, "", `Новое название: ${nextName}`);
  saveState();
  return true;
}

function saveNodeName(equipmentId, nodeIndex, value) {
  if (!canEditEquipmentCatalog(equipmentId)) return false;
  const eq = equipmentById(equipmentId);
  if (!eq || !Number.isInteger(nodeIndex) || nodeIndex < 0 || nodeIndex >= eq.nodes.length) return false;
  const previousName = eq.nodes[nodeIndex];
  const nextName = String(value || "").trim() || previousName;
  if (nextName === previousName) return true;
  const item = equipmentOverride(equipmentId);
  item.nodes = [...eq.nodes];
  item.nodes[nodeIndex] = nextName;
  item.area ||= eq.area;
  item.updatedAt = new Date().toISOString();
  recordAudit("Изменил название узла", `${eq.name} · ${previousName}`, "", `Новое название: ${nextName}`);
  saveState();
  return true;
}

function addNodeName(equipmentId, value) {
  if (!canManageCatalogStructure(equipmentId)) return false;
  const clean = String(value || "").trim();
  if (!clean) return false;
  const eq = equipmentById(equipmentId);
  const item = equipmentOverride(equipmentId);
  item.nodes = [...eq.nodes, clean];
  item.area ||= eq.area;
  item.updatedAt = new Date().toISOString();
  recordAudit("Добавил узел", eq.name, "", clean);
  saveState();
  return true;
}

function nodeDeleteTouchesSavedHistory(equipmentId, nodeIndex) {
  const targetEquipmentId = Number(equipmentId);
  const targetNodeIndex = Number(nodeIndex);
  const checkHistory = Object.keys(state.checks || {}).some(recordKey => {
    const [eqId, index] = recordKey.split(":").map(Number);
    return eqId === targetEquipmentId && index >= targetNodeIndex;
  });
  const linkedRows = [
    ...Object.values(state.requests || {}),
    ...(state.downtimes || []),
    ...(state.serviceCosts || [])
  ];
  return checkHistory || linkedRows.some(item =>
    Number(item?.equipmentId) === targetEquipmentId && Number(item?.nodeIndex) >= targetNodeIndex
  );
}

function deleteNodeName(equipmentId, nodeIndex) {
  if (!canManageCatalogStructure(equipmentId)) return false;
  const eq = equipmentById(equipmentId);
  if (!eq || !Number.isInteger(nodeIndex) || nodeIndex < 0 || nodeIndex >= eq.nodes.length) return false;
  if (eq.nodes.length <= 1) return false;
  if (nodeDeleteTouchesSavedHistory(equipmentId, nodeIndex)) return false;
  const item = equipmentOverride(equipmentId);
  item.nodes = [...eq.nodes];
  item.nodes.splice(nodeIndex, 1);
  item.area ||= eq.area;
  item.updatedAt = new Date().toISOString();
  if (item.reminders) {
    const nextReminders = {};
    Object.entries(item.reminders).forEach(([key, value]) => {
      const index = Number(key);
      if (!Number.isInteger(index) || index === nodeIndex) return;
      nextReminders[index > nodeIndex ? index - 1 : index] = value;
    });
    item.reminders = nextReminders;
  }
  recordAudit("Удалил узел", eq.name, "", eq.nodes[nodeIndex]);
  saveState();
  return true;
}

function reminderItemsForNode(equipmentId, nodeIndex, nodeName) {
  const saved = equipmentOverride(equipmentId).reminders?.[nodeIndex];
  return Array.isArray(saved) && saved.length ? saved : nodeReminderItems(nodeName);
}

function saveNodeReminder(equipmentId, nodeIndex, text) {
  if (!canEditEquipmentCatalog(equipmentId)) return false;
  const eq = equipmentById(equipmentId);
  if (!eq || !Number.isInteger(nodeIndex) || nodeIndex < 0 || nodeIndex >= eq.nodes.length) return false;
  const item = equipmentOverride(equipmentId);
  item.reminders ||= {};
  const previous = reminderItemsForNode(equipmentId, nodeIndex, eq.nodes[nodeIndex]);
  const next = String(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  item.reminders[nodeIndex] = next;
  item.area ||= eq.area;
  item.updatedAt = new Date().toISOString();
  if (JSON.stringify(previous) !== JSON.stringify(next)) {
    recordAudit("Изменил памятку узла", `${eq.name} · ${eq.nodes[nodeIndex]}`, "", `${next.length} строк`);
  }
  saveState();
  return true;
}

function areaAllowed(area) {
  if (!needsArea()) return true;
  if (!profile?.area) return false;
  return area === profile.area;
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
  if (req.rejected && req.returnedTo && req.sourceKey) return req.sourceKey === profileKey();
  if (profile?.role === "shop" || profile?.role === "operator") return areaAllowed(req.area);
  return true;
}

function isRequestSource(req) {
  if (profile?.role === "editor") return true;
  if (req?.sourceKey) return req.sourceKey === profileKey();
  return req?.sourceRole === profile?.role;
}

function warehouseIssueTargetRole(req) {
  return req.issueTargetRole || "mechanic";
}

function canReceiveWarehouseIssue(role) {
  return ["mechanic", "electrician", "operator", "shop", "engineer"].includes(role);
}

function canConfirmIssuedInstall(req, role = current.requestRole) {
  return req.issued && !req.mechanicInstalled && !req.done && !req.stock && warehouseIssueTargetRole(req) === role;
}

function issuedWarehouseItemVisibleToProfile(req, role = profile?.role) {
  if (!canConfirmIssuedInstall(req, role) || profile?.role !== role) return false;
  const targetPhone = String(req.issueTargetPhone || "").trim();
  const targetName = String(req.issueTargetName || "").trim().toLowerCase();
  const normalizeWarehousePhone = value => String(value || "").replace(/\D/g, "").replace(/^8(?=\d{10}$)/, "7");
  const profilePhone = normalizeWarehousePhone(profile?.phone);
  const issuedPhone = targetPhone.replace(/\D/g, "").replace(/^8(?=\d{10}$)/, "7");
  const profileName = String(profile?.name || "").trim().toLowerCase();
  const registeredProfile = loadUsers().find(user => {
    if (user.approved === false || user.pendingApproval === true || user.role !== profile?.role) return false;
    if (profile?.id && user.id === profile.id) return true;
    if (profile?.employeeId && user.employeeId === profile.employeeId) return true;
    if (profilePhone && normalizeWarehousePhone(user.phone) === profilePhone) return true;
    return profileName && String(user.name || "").trim().toLowerCase() === profileName;
  });
  const knownPhones = [profilePhone, normalizeWarehousePhone(registeredProfile?.phone)].filter(Boolean);
  const knownNames = [profileName, String(registeredProfile?.name || "").trim().toLowerCase()].filter(Boolean);
  const phoneMatches = Boolean(issuedPhone && knownPhones.includes(issuedPhone));
  const nameMatches = Boolean(targetName && knownNames.includes(targetName));
  if ((targetPhone || targetName) && !phoneMatches && !nameMatches) return false;
  return true;
}

function userMatchesWarehouseIssueRequester(user, req) {
  if (!user || !req) return false;
  const phone = String(req.issueTargetPhone || "").trim();
  const name = String(req.issueTargetName || "").trim().toLowerCase();
  const role = warehouseIssueTargetRole(req);
  if (!phone && !name) return false;
  return user.role === role
    && user.approved !== false
    && user.pendingApproval !== true
    && (!phone || String(user.phone || "").trim() === phone)
    && (!name || String(user.name || "").trim().toLowerCase() === name);
}

function warehouseIssueRequesterExists(req) {
  return loadUsers().some(user => userMatchesWarehouseIssueRequester(user, req));
}

function stockOutNotifyRole(req) {
  return req.stockOutNotifyRole || warehouseIssueTargetRole(req);
}

function stockOutVisibleToProfile(req, role = current.requestRole) {
  if (!req?.stockOut || req.stockOutAcknowledged) return false;
  const notifyRole = stockOutNotifyRole(req);
  if (role !== notifyRole || profile?.role !== notifyRole) return false;
  if (!warehouseIssueRequesterExists(req)) return true;
  if (req.sourceKey && req.sourceKey === profileKey()) return true;
  if (req.issueTargetPhone && String(req.issueTargetPhone || "").trim() === String(profile?.phone || "").trim()) return true;
  return Boolean(req.issueTargetName && String(req.issueTargetName || "").trim().toLowerCase() === String(profile?.name || "").trim().toLowerCase());
}

function markWarehouseAskStockOut(req, availableQty = 0) {
  if (!req || req.stockOut) return false;
  const requestedQty = Number(req.qtyIssued || req.qtyReceived || 1);
  const notifyRole = warehouseIssueTargetRole(req);
  const requesterExists = warehouseIssueRequesterExists(req);
  req.stockOut = true;
  req.stockOutAcknowledged = false;
  req.stockOutAt = new Date().toISOString();
  req.stockOutAvailableQty = Number(availableQty || 0);
  req.stockOutRequestedQty = requestedQty;
  req.stockOutNotifyRole = notifyRole;
  req.stockOutRecipientMissing = !requesterExists;
  req.stockOutReason = requesterExists
    ? "Запас закончился. Склад не может выдать запрошенную позицию."
    : "Запас закончился. Автор заявки не найден, уведомление направлено замещающему по роли.";
  req.warehouseAsk = false;
  req.status = "stockOut";
  req.updatedAt = new Date().toISOString();
  requestAddHistory(req, "Запас закончился", `${partNameFromRequest(req)} · Запрошено: ${requestedQty} шт. · Доступно: ${Number(availableQty || 0)} шт.`);
  syncRequestToRecord(req);
  return true;
}

function requestIssuedToWorker(req) {
  return ["mechanic", "electrician", "operator"].includes(warehouseIssueTargetRole(req));
}

function requestIssuedToSupervisor(req) {
  return ["shop", "engineer"].includes(warehouseIssueTargetRole(req));
}

function requestWaitingForProductionDirector(req) {
  return req.mechanicInstalled
    && !req.shopInstallApproved
    && !req.productionDirectorApproved
    && !req.done
    && !req.stock;
}

function requestRequiresEngineerApproval(req) {
  return req.route !== "stock" && req.sourceRole !== "engineer";
}

function requestTechnicalApprovalOpenToBoth(req) {
  return req.route !== "stock" && req.sourceRole !== "engineer";
}

function requestWaitingForProductionDirectorInitial(req) {
  return req.route !== "stock"
    && req.shopApproved
    && (req.engineerApproved || req.sourceRole === "engineer")
    && !req.productionDirectorRequestApproved
    && !req.financePreApproved
    && !req.supplyPrepared
    && !req.done
    && !req.stock;
}

function requestWaitingForFinancePreApproval(req) {
  return req.route !== "stock"
    && req.shopApproved
    && (req.engineerApproved || req.sourceRole === "engineer")
    && req.productionDirectorRequestApproved
    && !req.financePreApproved
    && !req.supplyPrepared
    && !req.financeApproved
    && !req.cashApproved
    && !req.done
    && !req.stock;
}

function requestReadyForSupply(req) {
  return req.route !== "stock"
    && req.shopApproved
    && (req.engineerApproved || req.sourceRole === "engineer")
    && req.productionDirectorRequestApproved
    && req.financePreApproved
    && !req.supplyPrepared
    && !req.done
    && !req.stock;
}

function approvalResponsibilityDeclines(req) {
  if (!req.approvalResponsibilityDeclines || typeof req.approvalResponsibilityDeclines !== "object") {
    req.approvalResponsibilityDeclines = {};
  }
  return req.approvalResponsibilityDeclines;
}

function approvalResponsibilityDeclined(req, role) {
  return Boolean(approvalResponsibilityDeclines(req)[role]);
}

function clearApprovalResponsibilityDeclines(req) {
  req.approvalResponsibilityDeclines = {};
}

function installResponsibilityDeclines(req) {
  if (!req.installResponsibilityDeclines || typeof req.installResponsibilityDeclines !== "object") {
    req.installResponsibilityDeclines = {};
  }
  return req.installResponsibilityDeclines;
}

function installResponsibilityDeclined(req, role) {
  return Boolean(installResponsibilityDeclines(req)[role]);
}

function clearInstallResponsibilityDeclines(req) {
  req.installResponsibilityDeclines = {};
}

function requestReadyForAccounting(req) {
  return !req.stock
    && !req.done
    && req.mechanicInstalled
    && (req.shopInstallApproved || req.productionDirectorApproved);
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

function recordAudit(action, target, reason = "", details = "") {
  state.auditHistory ||= [];
  state.auditHistory.unshift({
    id: `audit:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    action: String(action || "").trim(),
    target: String(target || "").trim(),
    reason: String(reason || "").trim(),
    details: String(details || "").trim(),
    userName: profile?.name || "Система",
    userRole: profile?.role || ""
  });
  state.auditHistory = state.auditHistory.slice(0, 1000);
}

function auditHistoryRows() {
  const rows = (state.auditHistory || []).slice(0, 100);
  if (!rows.length) return `<div class="director-empty-ok"><strong>История изменений пока пуста</strong></div>`;
  return rows.map(item => `
    <div class="audit-history-row">
      <time>${dateTimeHuman(item.at)}</time>
      <div><strong>${escapeHtml(item.userName || "Система")}</strong><span>${escapeHtml(item.action)}${item.target ? ` · ${escapeHtml(item.target)}` : ""}</span></div>
      <p>${item.reason ? `Причина: ${escapeHtml(item.reason)}` : escapeHtml(item.details || "")}</p>
    </div>
  `).join("");
}

function directorMessages() {
  state.directorMessages ||= [];
  return state.directorMessages;
}

function pendingUserApprovalCount() {
  if (!isEditorSession()) return 0;
  return loadUsers().filter(user => user.approved === false || user.pendingApproval === true).length;
}

function directorUnreadCount() {
  if (isEditorSession()) return pendingUserApprovalCount();
  if (directorCanAnswer()) return directorMessages().filter(msg => !msg.directorRead).length;
  return directorMessages().filter(msg => directorMessageVisibleForProfile(msg) && msg.reply && !msg.userRead).length;
}

function updateDirectorBadge() {
  if (!ui.directorOpenButton || !ui.directorBadge) return;
  const adminSession = isEditorSession();
  const hiddenForRole = ["warehouse", "mechanic", "electrician", "operator"].includes(profile?.role);
  ui.directorOpenButton.hidden = !adminSession && hiddenForRole;
  if (ui.directorOpenLabel) ui.directorOpenLabel.textContent = adminSession ? "Админ" : "Директорская";
  const count = directorUnreadCount();
  ui.directorBadge.textContent = count;
  ui.directorOpenButton.classList.toggle("request-alert", count > 0);
}

function directorCanAnswer() {
  return profile?.role === "director";
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
  if (MANUAL_REQUEST_WORKFLOW) {
    if (role === "warehouse" && String(req.id || "").startsWith("stock-issue:")) return false;
    if (role === "all" || role === "warehouse") return true;
    return issuedWarehouseItemVisibleToProfile(req, role) || stockOutVisibleToProfile(req, role);
  }
  if (["mechanic", "electrician", "operator"].includes(profile?.role) && role === "warehouse") {
    return req.transferredToWarehouse || req.warehouseReceived || req.stock || req.issued;
  }
  return requestMatchesRole(req, role);
}

function requestVisibleForRoleIndicator(req, role) {
  if (!canSeeRequestRoleIndicator(role) || !requestAllowedByUser(req)) return false;
  if (MANUAL_REQUEST_WORKFLOW) {
    if (role === "warehouse" && String(req.id || "").startsWith("stock-issue:")) return false;
    if (role === "all" || role === "warehouse") return true;
    return issuedWarehouseItemVisibleToProfile(req, role) || stockOutVisibleToProfile(req, role);
  }
  if (profile?.role === "warehouse" && role !== "warehouse") return false;
  return requestMatchesRole(req, role);
}

function renderProfile() {
  if (!ui.profileBar) return;
  if (ui.factoryStatusButton) ui.factoryStatusButton.hidden = profile?.role !== "editor";
  document.body.classList.toggle("editor-profile", profile?.role === "editor");
  document.body.classList.toggle("editor-preview-profile", isEditorSession() && profile?.role !== "editor");
  document.body.classList.toggle("warehouse-only-profile", profile?.role === "warehouse");
  document.body.classList.toggle("director-control-profile", current.view === "directorControl");
  if (!isProfileReady()) {
    ui.profileBar.innerHTML = "";
    return;
  }
  const area = profile.area ? ` · ${profile.area}` : "";
  const phone = profile.phone ? ` · ${profile.phone}` : "";
  const employeeId = profile.employeeId ? ` · Таб. № ${profile.employeeId}` : "";
  const editorRoleSwitcher = isEditorSession() ? `
    <label class="editor-role-switcher">
      <span>${escapeHtml(t("changeRole"))}</span>
      <select id="editorPreviewRoleSelect">
        ${Object.entries(ROLE_ACCESS).map(([role, access]) => `<option value="${role}" ${profile.role === role ? "selected" : ""}>${escapeHtml(access.label)}</option>`).join("")}
      </select>
    </label>
  ` : "";
  const editorAreaSwitcher = isEditorSession() && needsArea(profile.role) ? `
    <label class="editor-area-switcher">
      <span>Цех</span>
      <select id="editorPreviewAreaSelect">
        ${AREAS.filter(areaName => areaName !== "Резерв").map(areaName => `<option value="${escapeHtml(areaName)}" ${profile.area === areaName ? "selected" : ""}>${escapeHtml(areaName)}</option>`).join("")}
      </select>
    </label>
  ` : "";
  const previewNote = isEditorSession() && profile.role !== "editor"
    ? `<span class="editor-preview-note">${escapeHtml(t("viewMode"))}: ${escapeHtml(ROLE_ACCESS[profile.role]?.label || profile.role)}</span>`
    : "";
  const languageSwitcher = `
    <label class="profile-language-switcher">
      <span>${escapeHtml(t("language"))}</span>
      <select id="profileLanguageSelect">${languageOptions()}</select>
    </label>
  `;
  ui.profileBar.innerHTML = `
    <div><strong class="manual-text">${escapeHtml(profile.name || "")}</strong><span>${ROLE_ACCESS[profile.role]?.label || profile.role}${area}${employeeId}${phone}</span>${previewNote}</div>
    ${editorRoleSwitcher}
    ${editorAreaSwitcher}
    ${languageSwitcher}
    ${appNotificationPermissionButton()}
    ${profile.role === "director" && current.view !== "directorControl" ? `<button type="button" id="openDirectorControlButton">${escapeHtml(t("commonControl"))}</button>` : ""}
    ${profile.role === "editor" ? `<button type="button" id="clearRecordedDataButton">${escapeHtml(t("clearRecords"))}</button>` : ""}
    <button type="button" id="changeUserButton">${escapeHtml(t("logout"))}</button>
  `;
  ui.profileBar.querySelector("#editorPreviewRoleSelect")?.addEventListener("change", event => {
    setEditorPreviewRole(event.currentTarget.value);
  });
  ui.profileBar.querySelector("#editorPreviewAreaSelect")?.addEventListener("change", event => {
    setEditorPreviewArea(event.currentTarget.value);
  });
  ui.profileBar.querySelector("#profileLanguageSelect")?.addEventListener("change", event => {
    saveProfileLanguage(event.currentTarget.value);
  });
  ui.profileBar.querySelector("#enableAppNotificationsButton")?.addEventListener("click", event => {
    requestAppNotificationPermission(event.currentTarget);
  });
  ui.profileBar.querySelector("#openDirectorControlButton")?.addEventListener("click", () => show("directorControl"));
  ui.profileBar.querySelector("#clearRecordedDataButton")?.addEventListener("click", event => {
    if (!window.confirm("Очистить все записанные данные: комментарии, заявки, складские остатки, простои и директорскую? Памятки и оборудование останутся.")) return;
    const confirmation = window.prompt("Для подтверждения введите слово ОЧИСТИТЬ:");
    if (String(confirmation || "").trim().toUpperCase() !== "ОЧИСТИТЬ") {
      window.alert("Очистка отменена.");
      return;
    }
    const reason = window.prompt("Укажите причину очистки записей:")?.trim();
    if (!reason) return;
    runButtonOperation(event.currentTarget, async () => {
      recordAudit("Очистил рабочие записи", "Все разделы", reason);
      await clearRecordedDataEverywhere();
      render();
    }, "Очищается...");
  });
  ui.profileBar.querySelector("#changeUserButton")?.addEventListener("click", () => {
    if (!window.confirm("Точно выйти из профиля?")) return;
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(EDITOR_PREVIEW_ROLE_KEY);
    location.reload();
  });
  syncNotificationSetupPrompt();
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
  let authMode = "login";
  ui.toggleLoginPassword?.addEventListener("click", () => {
    const visible = ui.loginPassword.type === "text";
    ui.loginPassword.type = visible ? "password" : "text";
    ui.toggleLoginPassword.setAttribute("aria-label", visible ? "Показать пароль" : "Скрыть пароль");
    ui.toggleLoginPassword.setAttribute("title", visible ? "Показать пароль" : "Скрыть пароль");
    ui.toggleLoginPassword.classList.toggle("active", !visible);
  });
  if (!ui.loginForm.querySelector("#loginLanguageSelect")) {
    const languageLabel = document.createElement("label");
    languageLabel.className = "login-language-field";
    languageLabel.innerHTML = `<span>${escapeHtml(t("language"))}</span><select id="loginLanguageSelect">${languageOptions()}</select>`;
    ui.loginError.before(languageLabel);
    languageLabel.querySelector("select")?.addEventListener("change", event => {
      localStorage.setItem(LANGUAGE_KEY, event.currentTarget.value);
      applyLanguage();
      setAuthMode(authMode);
      queueTranslateVisiblePage(true);
    });
  }
  const setAuthMode = mode => {
    authMode = mode;
    const registering = mode === "register";
    document.querySelectorAll("[data-auth-mode]").forEach(button => button.classList.toggle("active", button.dataset.authMode === mode));
    ui.authTitle.textContent = registering ? t("registerTitle") : t("loginTitle");
    ui.loginNameRow.hidden = !registering;
    ui.loginPhoneRow.hidden = !registering;
    ui.loginName.required = registering;
    ui.loginPhone.required = registering;
    ui.loginIdentifierLabel.textContent = registering ? t("employeeId") : t("identifier");
    ui.loginEmployeeId.placeholder = registering ? t("employeeIdPlaceholder") : t("identifier");
    ui.loginPassword.autocomplete = registering ? "new-password" : "current-password";
    ui.authSubmitButton.textContent = registering ? t("registerButton") : t("loginButton");
    ui.authHint.textContent = registering ? t("registerHint") : t("loginHint");
    ui.loginError.textContent = "";
    applyLanguage();
    queueTranslateVisiblePage(true);
  };
  document.querySelectorAll("[data-auth-mode]").forEach(button => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
  ui.loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const submitButton = ui.loginForm.querySelector("button[type='submit']");
    if (submitButton?.disabled) return;
    setButtonBusy(submitButton, true, authMode === "register" ? "Отправляем..." : "Входим...");
    try {
      if (authMode === "register") {
        await registerEmployee({
          name: ui.loginName.value.trim(),
          employeeId: ui.loginEmployeeId.value.trim(),
          phone: ui.loginPhone.value.trim(),
          password: ui.loginPassword.value,
          language: currentLanguage()
        });
      } else {
        await loginEmployee(ui.loginEmployeeId.value.trim(), ui.loginPassword.value);
      }
      await finishAuthOnCurrentPage();
    } catch (error) {
      ui.loginError.textContent = error?.message || (authMode === "register"
        ? t("registerFailed")
        : t("loginFailed"));
    } finally {
      setButtonBusy(submitButton, false);
    }
  });
  setAuthMode("login");
  if (isProfileWaitingApproval()) {
    ui.loginOverlay.hidden = false;
    ui.loginForm.hidden = true;
    ui.loginError.textContent = t("pendingApproval");
    window.setInterval(loadRemoteUsers, 5000);
    return;
  }
  ui.loginOverlay.hidden = isProfileReady();
  if (isProfileReady()) renderProfile();
  applyLanguage();
  queueTranslateVisiblePage(true);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoDateFromLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentWalkShift(now = new Date()) {
  const hour = now.getHours();
  if (hour >= WALK_SHIFT_DAY_START && hour < WALK_SHIFT_NIGHT_START) {
    return {
      key: "day",
      date: isoDateFromLocal(now),
      label: WALK_SHIFT_LABELS.day,
      range: "08:00-20:00"
    };
  }
  if (hour >= WALK_SHIFT_NIGHT_START) {
    return {
      key: "night",
      date: isoDateFromLocal(now),
      label: WALK_SHIFT_LABELS.night,
      range: "20:00-08:00"
    };
  }
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  return {
    key: "night",
    date: isoDateFromLocal(start),
    label: WALK_SHIFT_LABELS.night,
    range: "20:00-08:00"
  };
}

function walkShiftKeysDueForDate(date, now = new Date()) {
  const shift = currentWalkShift(now);
  if (date < shift.date) return ["day", "night"];
  if (date > shift.date) return [];
  return shift.key === "day" ? ["day"] : ["day", "night"];
}

function visibleWalkShiftForDate(date = current.date) {
  const shift = currentWalkShift();
  if (date === shift.date) return shift;
  return {
    key: "day",
    date,
    label: WALK_SHIFT_LABELS.day,
    range: "08:00-20:00"
  };
}

function mobilePdfMode() {
  return window.innerWidth <= 680 || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);
}

function printActionLabel(desktopLabel, mobileLabel = "PDF") {
  return mobilePdfMode() ? mobileLabel : desktopLabel;
}

function printCurrentDocument(title = "ППР Контроль") {
  const oldTitle = document.title;
  document.title = title;
  document.body.classList.toggle("mobile-pdf-mode", mobilePdfMode());
  const cleanup = () => {
    document.title = oldTitle;
    document.body.classList.remove("mobile-pdf-mode");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  window.setTimeout(cleanup, 1500);
}

function nodeQrPayload(equipmentId, nodeIndex) {
  return `PPRQR|NODE|${Number(equipmentId)}|${Number(nodeIndex)}`;
}

function nodeQrShortCode(equipmentId, nodeIndex) {
  return `${Number(equipmentId)}-${Number(nodeIndex)}`;
}

function nodeQrDisplayCode(equipmentId, nodeIndex) {
  return `QR-${Number(equipmentId)}-${Number(nodeIndex)}`;
}

function nodeQrBaseUrl() {
  return PUBLIC_APP_URL;
}

function nodeQrUrl(equipmentId, nodeIndex) {
  const url = new URL("/", nodeQrBaseUrl());
  url.searchParams.set("qr", nodeQrPayload(equipmentId, nodeIndex));
  return url.toString();
}

function parseNodeQrPayload(value) {
  let text = String(value || "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    text = url.searchParams.get("qr") || text;
  } catch {
    const match = text.match(/[?&]qr=([^&#]+)/);
    if (match) text = decodeURIComponent(match[1]);
  }
  text = text.replace(/^QR\s*[-:]?\s*/i, "").trim();
  const shortCode = text.match(/^(\d+)\s*[-/]\s*(\d+)$/);
  if (shortCode) {
    const equipmentId = Number(shortCode[1]);
    const nodeIndex = Number(shortCode[2]);
    if (Number.isFinite(equipmentId) && Number.isFinite(nodeIndex)) return { equipmentId, nodeIndex };
  }
  const parts = text.split("|");
  if (parts.length !== 4 || parts[0] !== "PPRQR" || parts[1] !== "NODE") return null;
  const equipmentId = Number(parts[2]);
  const nodeIndex = Number(parts[3]);
  if (!Number.isFinite(equipmentId) || !Number.isFinite(nodeIndex)) return null;
  return { equipmentId, nodeIndex };
}

function markNodeWalkDoneByQr(equipmentId, nodeIndex, date = currentWalkShift().date, shiftInfo = currentWalkShift()) {
  const eq = equipmentById(equipmentId);
  if (!eq || !eq.nodes?.[nodeIndex]) return null;
  const now = new Date().toISOString();
  const rec = record(equipmentId, nodeIndex, date);
  rec.to.walkShifts ||= {};
  rec.to.walkShifts[shiftInfo.key] = {
    done: true,
    at: now,
    byRole: profile?.role || "",
    byName: profile?.name || "",
    shift: shiftInfo.key,
    label: shiftInfo.label,
    range: shiftInfo.range
  };
  rec.to.tasks[0] = false;
  rec.to.walkDone = false;
  rec.to.updatedAt = now;
  rec.updatedAt = now;
  saveState();
  return { date, shift: shiftInfo };
}

function incomingNodeQrFromUrl() {
  try {
    return new URL(location.href).searchParams.get("qr") || "";
  } catch {
    return "";
  }
}

function clearIncomingNodeQrFromUrl() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has("qr")) return;
    url.searchParams.delete("qr");
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {}
}

async function handleIncomingNodeQrFromUrl() {
  const value = incomingNodeQrFromUrl();
  if (!value) return false;
  const parsed = parseNodeQrPayload(value);
  if (!parsed) {
    clearIncomingNodeQrFromUrl();
    return false;
  }
  if (!isProfileReady()) return false;
  if (!canEditChecklist()) {
    window.alert("Для обхода войдите ролью, которой разрешено сканировать QR.");
    clearIncomingNodeQrFromUrl();
    return false;
  }
  const shift = currentWalkShift();
  const marked = markNodeWalkDoneByQr(parsed.equipmentId, parsed.nodeIndex, shift.date, shift);
  if (!marked) {
    window.alert("QR найден, но узел в журнале не найден. Проверьте, что QR распечатан из этой версии ППР.");
    clearIncomingNodeQrFromUrl();
    return false;
  }
  current.equipmentId = parsed.equipmentId;
  current.nodeIndex = parsed.nodeIndex;
  current.date = marked.date;
  current.kind = "to";
  current.scrollToQrNode = parsed.nodeIndex;
  clearIncomingNodeQrFromUrl();
  show("checklist", false);
  publishStateNow().catch(scheduleRemoteRetry);
  const eq = equipmentById(parsed.equipmentId);
  window.setTimeout(() => {
    const row = document.querySelector(`[data-node-walk-index="${parsed.nodeIndex}"]`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.classList.add("qr-just-scanned");
    window.setTimeout(() => row?.classList.remove("qr-just-scanned"), 1800);
  }, 150);
  if (eq) refreshNodeWalkProgress(eq);
  showQrSavedNotice();
  return true;
}

function refreshNodeWalkProgress(eq) {
  const shift = visibleWalkShiftForDate(current.date);
  const doneCount = eq.nodes.filter((_, index) => isNodeShiftChecked(getRecord(eq.id, index, current.date), shift.key)).length;
  ui.dayStatus.textContent = `${doneCount}/${eq.nodes.length} · ${shift.label}`;
  ui.dayStatus.style.background = doneCount === eq.nodes.length ? "var(--to)" : "var(--nav-soft)";
}

function printNodeQrCode(eq, nodeIndex) {
  const nodeName = eq.nodes[nodeIndex] || "";
  const payload = nodeQrPayload(eq.id, nodeIndex);
  const qrLink = nodeQrUrl(eq.id, nodeIndex);
  const displayCode = nodeQrDisplayCode(eq.id, nodeIndex);
  const qrUrl = `/api/qr?size=720&data=${encodeURIComponent(qrLink)}`;
  const win = window.open("", "_blank", "width=760,height=760");
  if (!win) {
    window.alert("Разрешите всплывающие окна для печати QR.");
    return;
  }
  win.document.write(`<!doctype html>
    <html><head><meta charset="utf-8"><title>QR - ${escapeHtml(eq.name)} - ${escapeHtml(nodeName)}</title>
    <style>
      body{margin:0;background:#eef3f6;font-family:Arial,sans-serif;color:#132f42}
      .sheet{width:120mm;min-height:170mm;margin:18px auto;background:#fff;padding:14mm;box-sizing:border-box;border:1px solid #d7e3e9}
      .top{display:flex;justify-content:space-between;gap:14px;font-size:11px;color:#526a77;margin-bottom:16px}
      .head{border-bottom:2px solid #14324a;padding-bottom:10px;margin-bottom:12px}
      h1{font-size:22px;margin:0 0 8px} p{margin:4px 0;font-size:14px;line-height:1.35}
      .qr{display:grid;place-items:center;margin:14px 0}.qr img{width:92mm;height:92mm}
      .hint{font-weight:700;color:#14324a}
      .code{font-family:Consolas,monospace;font-size:20px;font-weight:800;letter-spacing:1px;text-align:center;border:1px dashed #9fb2bd;padding:10px;margin-top:10px}
      .link{font-size:9px;color:#6b7d86;word-break:break-all;margin-top:8px}
      .actions{position:sticky;bottom:0;background:#eef3f6;padding:10px;text-align:center}
      button{border:0;border-radius:8px;background:#14324a;color:#fff;padding:10px 18px;font-weight:800}
      @media print{body{background:#fff}.sheet{margin:0;border:0}.actions{display:none}}
    </style></head><body>
      <div class="sheet">
        <div class="top"><span>${escapeHtml(new Date().toLocaleString("ru-RU"))}</span><span>QR - ${escapeHtml(eq.name)} - ${escapeHtml(nodeName)}</span></div>
        <div class="head">
          <h1>QR код обхода узла</h1>
          <p><strong>Оборудование:</strong> ${escapeHtml(eq.name)}</p>
          <p><strong>Участок:</strong> ${escapeHtml(eq.area || "")}</p>
          <p><strong>Узел:</strong> ${escapeHtml(nodeName)}</p>
        </div>
        <div class="qr"><img src="${qrUrl}" alt="QR код"></div>
        <p class="hint">Установите ППР на экран телефона, чтобы повторные QR открывались в приложении. Без установки используйте сканер внутри ППР.</p>
        <div class="code">${escapeHtml(displayCode)}</div>
        <div class="link">${escapeHtml(payload)} · ${escapeHtml(qrLink)}</div>
      </div>
      <div class="actions"><button onclick="window.print()">Печатать QR</button></div>
    </body></html>`);
  win.document.close();
}

function printEquipmentQrCodes(eq) {
  if (!eq?.nodes?.length) {
    window.alert("У этого оборудования нет узлов для печати QR.");
    return;
  }
  const win = window.open("", "_blank", "width=960,height=900");
  if (!win) {
    window.alert("Разрешите всплывающие окна для печати QR.");
    return;
  }
  const cards = eq.nodes.map((nodeName, nodeIndex) => {
    const payload = nodeQrPayload(eq.id, nodeIndex);
    const qrLink = nodeQrUrl(eq.id, nodeIndex);
    const displayCode = nodeQrDisplayCode(eq.id, nodeIndex);
    const qrUrl = `/api/qr?size=720&data=${encodeURIComponent(qrLink)}`;
    return `
      <section class="qr-card">
        <div class="qr-title">${escapeHtml(eq.name || `Оборудование ${eq.id}`)}</div>
        <div class="qr-area">${escapeHtml(eq.area || "")}</div>
        <div class="qr-node">${nodeIndex + 1}. ${escapeHtml(nodeName)}</div>
        <img src="${qrUrl}" alt="QR ${escapeHtml(nodeName)}">
        <div class="qr-code">${escapeHtml(displayCode)}</div>
        <div class="qr-payload">${escapeHtml(qrLink)}</div>
        <div class="qr-hint">Установите ППР на экран телефона, чтобы повторные QR открывались в приложении. Без установки используйте сканер внутри ППР.</div>
      </section>
    `;
  });
  const pages = [];
  for (let index = 0; index < cards.length; index += 4) {
    pages.push(`<main class="qr-page">${cards.slice(index, index + 4).join("")}</main>`);
  }
  win.document.write(`<!doctype html>
    <html lang="ru"><head><meta charset="utf-8"><title>QR - ${escapeHtml(eq.name || `Оборудование ${eq.id}`)}</title>
    <style>
      @page{size:A4 portrait;margin:8mm}
      *{box-sizing:border-box}
      body{margin:0;font-family:Arial,sans-serif;color:#111827;background:#e5e7eb}
      .qr-page{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:7mm;width:210mm;height:281mm;margin:0 auto 12px;background:#fff;page-break-after:always}
      .qr-page:last-child{page-break-after:auto}
      .qr-card{border:2px solid #111827;border-radius:8px;padding:5mm;display:grid;grid-template-rows:auto auto auto 1fr auto auto auto;align-items:center;text-align:center;overflow:hidden}
      .qr-title{font-size:15pt;font-weight:900;text-transform:uppercase}
      .qr-area{font-size:9pt;font-weight:800;color:#4b5563}
      .qr-node{min-height:18mm;display:grid;place-items:center;font-size:13pt;font-weight:800;line-height:1.15}
      .qr-card img{width:80mm;height:80mm;margin:0 auto;image-rendering:pixelated}
      .qr-code{font-size:18pt;font-weight:900;letter-spacing:.5px}
      .qr-payload{font-size:7pt;font-weight:700;color:#374151;overflow-wrap:anywhere}
      .qr-hint{font-size:8pt;color:#4b5563;font-weight:700}
      .actions{position:fixed;left:0;right:0;bottom:0;background:#eef3f6;padding:10px;text-align:center;box-shadow:0 -6px 20px rgba(0,0,0,.12)}
      .actions button{border:0;border-radius:8px;background:#14324a;color:#fff;padding:10px 18px;font-weight:900}
      @media print{body{background:#fff}.qr-page{margin:0}.actions{display:none}}
    </style>
    <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),700));</script>
    </head><body>
      ${pages.join("")}
      <div class="actions"><button onclick="window.print()">Печатать QR всех узлов</button></div>
    </body></html>`);
  win.document.close();
}

async function scanNodeQrCode(expectedEquipmentId, expectedNodeIndex, statusEl) {
  const hasExpectedNode = expectedEquipmentId !== null && expectedEquipmentId !== undefined && expectedNodeIndex !== null && expectedNodeIndex !== undefined;
  const expected = { equipmentId: Number(expectedEquipmentId), nodeIndex: Number(expectedNodeIndex) };
  let overlay = null;
  const applyScannedValue = value => {
    const parsed = parseNodeQrPayload(value);
    if (!parsed) {
      if (statusEl) statusEl.textContent = "QR код не распознан";
      return false;
    }
    if (hasExpectedNode && (parsed.equipmentId !== expected.equipmentId || parsed.nodeIndex !== expected.nodeIndex)) {
      if (statusEl) statusEl.textContent = "QR от другого узла";
      return false;
    }
    const eq = equipmentById(parsed.equipmentId);
    if (!eq?.nodes?.[parsed.nodeIndex]) {
      if (statusEl) statusEl.textContent = "Не удалось отметить узел";
      return false;
    }
    return parsed;
  };

  const ensureJsQr = async () => {
    if (typeof window.jsQR === "function") return true;
    try {
      const response = await fetch(`node_modules/jsqr/dist/jsQR.js?v=${APP_VERSION}`, { cache: "no-store" });
      const source = await response.text();
      const module = { exports: {} };
      const exports = module.exports;
      new Function("module", "exports", source)(module, exports);
      window.jsQR = module.exports?.default || module.exports;
    } catch {}
    return typeof window.jsQR === "function";
  };

  const scanWithLiveCamera = async (video, messageEl, applyValue, shouldStop) => {
    if (!navigator.mediaDevices?.getUserMedia || !video) return false;
    const hasQrReader = await ensureJsQr();
    if (!hasQrReader) return false;
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      video.srcObject = stream;
      video.hidden = false;
      await video.play();
      if (messageEl) messageEl.textContent = "Наведите камеру на QR. После считывания можно идти дальше.";
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const started = Date.now();
      return await new Promise(resolve => {
        const finish = value => {
          stream?.getTracks()?.forEach(track => track.stop());
          resolve(value);
        };
        let scanning = false;
        const tick = async () => {
          if (shouldStop()) return finish(false);
          if (Date.now() - started > 45000) {
            if (messageEl) messageEl.textContent = "QR не найден. Поднесите ближе или нажмите «Сканировать ещё раз».";
            return finish(false);
          }
          if (!scanning && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
            scanning = true;
            try {
              const maxSide = 1280;
              const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
              canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
              canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const value = await detectQrOnCanvas(canvas);
              if (value) return finish(applyValue(value));
            } catch {
            } finally {
              scanning = false;
            }
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
    } catch {
      stream?.getTracks()?.forEach(track => track.stop());
      return false;
    }
  };

  const detectQrWithNativeDetector = async source => {
    if (!("BarcodeDetector" in window)) return "";
    try {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const results = await detector.detect(source);
      return String(results?.[0]?.rawValue || "");
    } catch {
      return "";
    }
  };

  const detectQrWithJsQr = async (img, maxSide = 1600) => {
    const hasQrReader = await ensureJsQr();
    if (!hasQrReader || !img?.width || !img?.height) return "";
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const nativeValue = await detectQrWithNativeDetector(canvas);
    if (nativeValue) return nativeValue;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
    return String(result?.data || "");
  };

  const detectQrOnCanvas = async canvas => {
    const nativeValue = await detectQrWithNativeDetector(canvas);
    if (nativeValue) return nativeValue;
    const hasQrReader = await ensureJsQr();
    if (!hasQrReader) return "";
    const attempts = [{ x: 0, y: 0, w: canvas.width, h: canvas.height }];
    for (const ratio of [0.86, 0.72, 0.58]) {
      const size = Math.round(Math.min(canvas.width, canvas.height) * ratio);
      attempts.push({
        x: Math.max(0, Math.round((canvas.width - size) / 2)),
        y: Math.max(0, Math.round((canvas.height - size) / 2)),
        w: size,
        h: size
      });
    }
    for (const area of attempts) {
      const work = document.createElement("canvas");
      work.width = area.w;
      work.height = area.h;
      const workCtx = work.getContext("2d", { willReadFrequently: true });
      if (!workCtx) continue;
      workCtx.drawImage(canvas, area.x, area.y, area.w, area.h, 0, 0, area.w, area.h);
      const nativeCropValue = await detectQrWithNativeDetector(work);
      if (nativeCropValue) return nativeCropValue;
      const imageData = workCtx.getImageData(0, 0, area.w, area.h);
      const result = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
      if (result?.data) return String(result.data);
    }
    return "";
  };

  const loadImageFromFile = file => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    img.src = url;
  });

  const readQrFromPhotoFile = async file => {
    if (!file) return "";
    if ("createImageBitmap" in window) {
      try {
        const bitmap = await createImageBitmap(file);
        const nativeBitmapValue = await detectQrWithNativeDetector(bitmap);
        if (nativeBitmapValue) return nativeBitmapValue;
        for (const size of [2200, 1600, 1100]) {
          const value = await detectQrWithJsQr(bitmap, size);
          if (value) return value;
        }
      } catch {}
    }
    const img = await loadImageFromFile(file);
    const nativeValue = await detectQrWithNativeDetector(img);
    if (nativeValue) return nativeValue;
    for (const size of [2200, 1600, 1100, 800]) {
      const value = await detectQrWithJsQr(img, size);
      if (value) return value;
    }
    return "";
  };

  const scanFromPhoto = messageEl => new Promise(resolve => {
    let finished = false;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.append(input);
    const finish = value => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      input.remove();
      resolve(value);
    };
    const timeout = window.setTimeout(() => {
      const message = "QR не найден. Сфотографируйте ближе, ровно и без бликов.";
      if (messageEl) messageEl.textContent = message;
      if (statusEl) statusEl.textContent = message;
      finish(false);
    }, 12000);
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        if (messageEl) messageEl.textContent = "Фото не выбрано. Попробуйте ещё раз.";
        finish(false);
        return;
      }
      try {
        if (messageEl) messageEl.textContent = "Читаем QR с фото...";
        const value = await readQrFromPhotoFile(file);
        if (!value) {
          if (messageEl) messageEl.textContent = "QR не найден. Наведите камеру ближе, чтобы QR занимал почти весь экран.";
          finish(false);
          return;
        }
        finish(applyScannedValue(value));
      } catch {
        if (messageEl) messageEl.textContent = "Фото не удалось прочитать. Попробуйте ближе или откройте QR обычной камерой.";
        finish(false);
      }
    }, { once: true });
    input.addEventListener("cancel", () => finish(false), { once: true });
    input.click();
  });

  overlay = document.createElement("div");
  overlay.className = "qr-scan-overlay";
  overlay.innerHTML = `
    <div class="qr-scan-panel">
      <strong>Сканирование QR</strong>
      <video playsinline muted hidden></video>
      <span class="qr-scan-message">Открываем камеру. Наведите на QR узла.</span>
      <div class="qr-scan-actions">
        <button type="button" data-qr-photo>Сканировать ещё раз</button>
        <button type="button" data-qr-cancel>Отмена</button>
      </div>
    </div>
  `;
  document.body.append(overlay);
  const messageEl = overlay.querySelector(".qr-scan-message");
  const video = overlay.querySelector("video");
  let stopped = false;
  const stop = () => {
    stopped = true;
    if (video?.srcObject) {
      video.srcObject.getTracks?.().forEach(track => track.stop());
      video.srcObject = null;
    }
    overlay.remove();
  };

  return new Promise(resolve => {
    const complete = value => {
      stop();
      resolve(value);
    };
    const scanAutomatically = async () => {
      let ok = await scanWithLiveCamera(video, messageEl, applyScannedValue, () => stopped);
      if (stopped || ok) return complete(ok || null);
      if (messageEl) messageEl.textContent = "Откройте камеру и наведите на QR узла.";
      ok = await scanFromPhoto(messageEl);
      if (stopped || ok) return complete(ok || null);
      if (messageEl) messageEl.textContent = "QR не найден. Нажмите «Сканировать ещё раз» и наведите ближе.";
    };
    overlay.querySelector("[data-qr-cancel]")?.addEventListener("click", () => complete(false));
    overlay.querySelector("[data-qr-photo]")?.addEventListener("click", async event => {
      const button = event.currentTarget;
      setButtonBusy(button, true, "Чтение...");
      if (messageEl) messageEl.textContent = "Откройте камеру и сфотографируйте QR узла.";
      const ok = await scanFromPhoto(messageEl);
      setButtonBusy(button, false);
      if (ok) complete(ok);
    });
    scanAutomatically();
  });
}

function qrWalkProgress(equipmentId, shift = currentWalkShift()) {
  const eq = equipmentById(equipmentId);
  if (!eq) return { done: 0, total: 0 };
  const done = eq.nodes.filter((_, nodeIndex) => isNodeShiftChecked(getRecord(eq.id, nodeIndex, shift.date), shift.key)).length;
  return { done, total: eq.nodes.length };
}

function promptQrWalkDecision(parsed) {
  const eq = equipmentById(parsed.equipmentId);
  const nodeName = eq?.nodes?.[parsed.nodeIndex] || "Узел";
  const shift = currentWalkShift();
  const alreadyDone = isNodeShiftChecked(getRecord(parsed.equipmentId, parsed.nodeIndex, shift.date), shift.key);
  const progress = qrWalkProgress(parsed.equipmentId, shift);
  const overlay = document.createElement("div");
  overlay.className = "qr-result-overlay";
  overlay.innerHTML = `
    <section class="qr-result-panel" role="dialog" aria-modal="true" aria-label="Результат обхода QR">
      <div class="qr-result-progress">Обойдено ${progress.done} из ${progress.total} · ${escapeHtml(shift.label)}</div>
      <h2>${escapeHtml(eq?.name || "Оборудование")}</h2>
      <p class="qr-result-node">${escapeHtml(nodeName)}</p>
      ${alreadyDone ? `
        <div class="qr-already-done">Этот узел уже проверен в текущую смену.</div>
        <div class="qr-result-actions single">
          <button type="button" class="qr-next-button" data-qr-next>Сканировать следующий</button>
          <button type="button" class="qr-finish-button" data-qr-finish>Завершить обход</button>
        </div>
      ` : `
        <div class="qr-result-actions">
          <button type="button" class="qr-good-button" data-qr-good>✓ Всё хорошо</button>
          <button type="button" class="qr-remark-button" data-qr-remark>! Есть замечание</button>
          <button type="button" class="qr-rescan-button" data-qr-next>Сканировать заново</button>
          <button type="button" class="qr-finish-button" data-qr-finish>Завершить обход</button>
        </div>
        <div class="qr-remark-form" hidden>
          <label><span>Комментарий по узлу</span><textarea rows="4" data-qr-comment placeholder="Опишите замечание..."></textarea></label>
          <label><span>Фото (необязательно)</span><input type="file" accept="image/*" capture="environment" data-qr-photo-input></label>
          <div class="qr-remark-error" data-qr-error></div>
          <div class="qr-result-actions single">
            <button type="button" class="qr-save-remark-button" data-qr-save-remark>Сохранить замечание</button>
            <button type="button" class="qr-rescan-button" data-qr-back>Назад</button>
          </div>
        </div>
      `}
    </section>
  `;
  document.body.append(overlay);
  return new Promise(resolve => {
    const finish = result => {
      overlay.remove();
      resolve(result);
    };
    overlay.querySelector("[data-qr-next]")?.addEventListener("click", () => finish("continue"));
    overlay.querySelector("[data-qr-finish]")?.addEventListener("click", () => finish("finish"));
    overlay.querySelector("[data-qr-good]")?.addEventListener("click", () => {
      markNodeWalkDoneByQr(parsed.equipmentId, parsed.nodeIndex, shift.date, shift);
      publishStateNow().catch(scheduleRemoteRetry);
      showQrSavedNotice();
      finish("continue");
    });
    const form = overlay.querySelector(".qr-remark-form");
    const actions = overlay.querySelector(":scope .qr-result-panel > .qr-result-actions");
    overlay.querySelector("[data-qr-remark]")?.addEventListener("click", () => {
      if (actions) actions.hidden = true;
      if (form) form.hidden = false;
      overlay.querySelector("[data-qr-comment]")?.focus();
    });
    overlay.querySelector("[data-qr-back]")?.addEventListener("click", () => {
      if (form) form.hidden = true;
      if (actions) actions.hidden = false;
    });
    overlay.querySelector("[data-qr-save-remark]")?.addEventListener("click", async event => {
      const comment = String(overlay.querySelector("[data-qr-comment]")?.value || "").trim();
      const errorEl = overlay.querySelector("[data-qr-error]");
      if (!comment) {
        if (errorEl) errorEl.textContent = "Напишите комментарий, чтобы сохранить замечание.";
        return;
      }
      const button = event.currentTarget;
      setButtonBusy(button, true, "Сохраняем...");
      try {
        const file = overlay.querySelector("[data-qr-photo-input]")?.files?.[0];
        const photo = file ? await readPhotoFile(file) : "";
        markNodeWalkDoneByQr(parsed.equipmentId, parsed.nodeIndex, shift.date, shift);
        const item = record(parsed.equipmentId, parsed.nodeIndex, shift.date).to;
        saveCommentDraft(item, comment);
        item.commentPhoto = photo;
        item.resolved = false;
        item.updatedAt = new Date().toISOString();
        saveState();
        publishStateNow().catch(scheduleRemoteRetry);
        showQrSavedNotice("Обход сохранён с замечанием");
        finish("continue");
      } catch {
        if (errorEl) errorEl.textContent = "Не удалось обработать фото. Попробуйте ещё раз.";
        setButtonBusy(button, false);
      }
    });
  });
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
  return { tasks: Array(15).fill(false), walkDone: false, walkShifts: {}, comment: "", commentPhoto: "", commentOwnerRole: "", commentOwnerName: "", commentLog: [], nodeDraftText: "", request: "", requestPhoto: "", resolved: false, createdAt: now, updatedAt: now };
}

function hasMeaningfulCheckKind(item) {
  if (!item || typeof item !== "object") return false;
  if (Array.isArray(item.tasks) && item.tasks.some(Boolean)) return true;
  if (item.walkShifts && Object.values(item.walkShifts).some(shift => shift?.done)) return true;
  if (item.walkDone || item.resolved || item.mechanicFixed || item.done) return true;
  if (item.shopApproved || item.engineerApproved || item.supplyPrepared || item.financeApproved || item.cashApproved) return true;
  if (item.transferredToWarehouse || item.warehouseReceived || item.issued || item.mechanicInstalled || item.shopInstallApproved || item.productionDirectorApproved || item.accountingWrittenOff) return true;
  if (String(item.lastRequestId || item.requestStatus || item.status || "").trim()) return true;
  if (String(item.nodeDraftText || "").trim()) return true;
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

function legacyNodeChecked(item) {
  return Boolean(item?.walkDone || item?.tasks?.[0]);
}

function nodeShiftRecord(item, shiftKey) {
  return item?.walkShifts?.[shiftKey] || null;
}

function isNodeShiftChecked(rec, shiftKey = visibleWalkShiftForDate(current.date).key) {
  const item = rec?.to || rec || {};
  const shift = nodeShiftRecord(item, shiftKey);
  if (shift) return Boolean(shift.done);
  return shiftKey === "day" && legacyNodeChecked(item);
}

function isNodeChecked(rec) {
  const item = rec?.to || rec || {};
  return Boolean(
    isNodeShiftChecked(rec, "day") ||
    isNodeShiftChecked(rec, "night") ||
    legacyNodeChecked(item)
  );
}

function nodeWalkCompletion(rec, date = current.date) {
  const dueShiftKeys = walkShiftKeysDueForDate(date);
  const done = dueShiftKeys.filter(shiftKey => isNodeShiftChecked(rec, shiftKey)).length;
  return {
    done,
    total: dueShiftKeys.length,
    dueShiftKeys,
    complete: dueShiftKeys.length > 0 && done === dueShiftKeys.length,
    partial: done > 0 && done < dueShiftKeys.length
  };
}

function nodeWalkShiftStatusText(rec, date = current.date) {
  const completion = nodeWalkCompletion(rec, date);
  if (!completion.total) return "Смена ещё не началась";
  if (completion.complete) return "Обход выполнен";
  if (completion.partial) return `Выполнено ${completion.done}/${completion.total} смен`;
  return "Обход не выполнен";
}

function currentRoleId() {
  return profile?.role || "";
}

function resolutionUserKey(user = {}) {
  const id = String(user.id || "").trim();
  if (id) return `id:${id}`;
  const employeeId = String(user.employeeId || "").trim().toLowerCase();
  if (employeeId) return `employee:${employeeId}`;
  const phone = String(user.phone || "").replace(/\D/g, "");
  if (phone) return `phone:${phone}`;
  return `person:${String(user.role || "").trim().toLowerCase()}:${String(user.name || "").trim().toLowerCase()}`;
}

function resolutionActor() {
  const user = authenticatedProfile || profile || {};
  return {
    key: resolutionUserKey(user),
    id: String(user.id || ""),
    employeeId: String(user.employeeId || ""),
    phone: String(user.phone || ""),
    name: String(user.name || profile?.name || "Сотрудник"),
    role: String(user.role || profile?.role || ""),
    area: String(user.area || profile?.area || "")
  };
}

function resolutionParticipantFromUser(user = {}) {
  return {
    key: resolutionUserKey(user),
    id: String(user.id || ""),
    employeeId: String(user.employeeId || ""),
    phone: String(user.phone || ""),
    name: String(user.name || "Сотрудник"),
    role: String(user.role || ""),
    area: String(user.area || "")
  };
}

function resolutionParticipants(item = {}) {
  const seen = new Set();
  return (Array.isArray(item.resolutionParticipants) ? item.resolutionParticipants : [])
    .map(resolutionParticipantFromUser)
    .filter(participant => participant.key && !seen.has(participant.key) && seen.add(participant.key));
}

function isResolutionParticipant(item, user = resolutionActor()) {
  const key = resolutionUserKey(user);
  return resolutionParticipants(item).some(participant => participant.key === key);
}

function remarkNotificationVisibleToCurrentUser(item) {
  const participants = resolutionParticipants(item);
  if (item?.resolutionPendingConfirmation && canCurrentUserConfirmRemark(item)) return true;
  return participants.length === 0 || participants.some(participant => participant.key === resolutionActor().key);
}

function canManageResolutionParticipants(item) {
  const actor = resolutionActor();
  return ["editor", "engineer", "shop"].includes(actor.role)
    || Boolean(item?.resolutionLeadKey && item.resolutionLeadKey === actor.key);
}

function canCompleteCollaborativeResolution(item) {
  const participants = resolutionParticipants(item);
  if (!participants.length) return true;
  return isResolutionParticipant(item) || ["editor", "engineer", "shop"].includes(resolutionActor().role);
}

function eligibleResolutionUsers(eq) {
  const actor = resolutionActor();
  const users = [...loadUsers(), actor]
    .filter(user => user && user.approved !== false && user.pendingApproval !== true && ROLE_ACCESS[user.role]?.checklist)
    .filter(user => user.role !== "operator" && user.role !== "shop" || !user.area || user.area === eq.area);
  const byKey = new Map();
  users.forEach(user => byKey.set(resolutionUserKey(user), resolutionParticipantFromUser(user)));
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function resolutionUpdateAuthor(entry = {}) {
  const role = ROLE_ACCESS[entry.role]?.label || entry.role || "";
  return entry.name ? `${entry.name}${role ? ` (${role})` : ""}` : role || "Сотрудник";
}

const REMARK_SHOP_CONFIRMATION_AUTHOR_ROLES = new Set(["mechanic", "electrician", "operator"]);

function remarkAuthorIdentity(entry = {}) {
  return {
    key: String(entry.authorKey || ""),
    id: String(entry.authorId || ""),
    employeeId: String(entry.authorEmployeeId || ""),
    phone: String(entry.authorPhone || ""),
    name: String(entry.name || ""),
    role: String(entry.role || "")
  };
}

function sameRemarkPerson(user = {}, identity = {}) {
  const userKey = resolutionUserKey(user);
  const identityKey = String(identity.key || resolutionUserKey(identity) || "");
  if (identityKey && userKey === identityKey) return true;
  return Boolean(identity.name && identity.role
    && String(user.name || "").trim().toLowerCase() === String(identity.name).trim().toLowerCase()
    && String(user.role || "") === String(identity.role));
}

function approvedRemarkUsers() {
  const actor = resolutionActor();
  const byKey = new Map();
  [...loadUsers(), actor]
    .filter(user => user && user.approved !== false && user.pendingApproval !== true)
    .forEach(user => byKey.set(resolutionUserKey(user), resolutionParticipantFromUser(user)));
  return [...byKey.values()];
}

function remarkConfirmationRule(entry = {}, eq = null) {
  const users = approvedRemarkUsers();
  const area = String(entry.confirmationArea || eq?.area || "");
  if (entry.confirmationRequiredKey) {
    const candidates = users.filter(user => resolutionUserKey(user) === entry.confirmationRequiredKey);
    return { mode: "author", role: entry.confirmationRequiredRole || entry.role || "", area, candidates };
  }
  if (entry.confirmationRequiredRole === "shop") {
    const candidates = users.filter(user => user.role === "shop" && user.area === area);
    return { mode: "shop", role: "shop", area, candidates };
  }
  if (entry.confirmationRequiredRole === "engineer") {
    const candidates = users.filter(user => user.role === "engineer");
    return { mode: "engineer", role: "engineer", area, candidates };
  }
  if (REMARK_SHOP_CONFIRMATION_AUTHOR_ROLES.has(entry.role)) {
    const shopCandidates = users.filter(user => user.role === "shop" && user.area === area);
    if (shopCandidates.length) return { mode: "shop", role: "shop", area, candidates: shopCandidates };
    return { mode: "engineer", role: "engineer", area, candidates: users.filter(user => user.role === "engineer") };
  }
  const author = remarkAuthorIdentity(entry);
  return { mode: "author", role: entry.role || "", area, candidates: users.filter(user => sameRemarkPerson(user, author)) };
}

function canCurrentUserConfirmRemark(entry = {}, eq = null) {
  const actor = resolutionActor();
  const rule = remarkConfirmationRule(entry, eq);
  if (rule.mode === "shop") return actor.role === "shop" && actor.area === rule.area;
  if (rule.mode === "engineer") return actor.role === "engineer";
  return sameRemarkPerson(actor, {
    key: entry.confirmationRequiredKey || entry.authorKey || "",
    name: entry.confirmationRequiredName || entry.name || "",
    role: entry.confirmationRequiredRole || entry.role || ""
  });
}

function remarkConfirmationLabel(entry = {}, eq = null) {
  const rule = remarkConfirmationRule(entry, eq);
  if (rule.mode === "shop") return `Начальник цеха · ${rule.area || "цех оборудования"}`;
  if (rule.mode === "engineer") return "Инженер";
  return entry.confirmationRequiredName || entry.name || "Автор предупреждения";
}

function stableRemarkId(entry = {}) {
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

const REMARK_COLLABORATION_FIELDS = [
  "resolutionParticipants", "resolutionUpdates", "resolutionEvents", "resolutionStartedAt",
  "resolutionLeadKey", "resolutionLeadName", "resolutionCompletedParticipants",
  "resolutionPendingConfirmation", "resolutionSubmittedAt", "resolutionSubmittedByKey",
  "resolutionSubmittedByName", "resolutionSubmittedByRole", "resolutionSubmittedComment",
  "resolutionSubmittedPhoto", "confirmationRequiredKey", "confirmationRequiredName",
  "confirmationRequiredRole", "confirmationArea", "confirmedAt", "confirmedByKey",
  "confirmedByName", "confirmedByRole"
];

function ensureRemarkEntries(item = {}) {
  const entries = (Array.isArray(item.commentLog) ? item.commentLog : [])
    .filter(entry => entry && !isDowntimeCommentEntry(entry) && String(entry.text || entry.photo || "").trim());
  entries.forEach(entry => {
    entry.id ||= stableRemarkId(entry);
    if (typeof entry.resolved !== "boolean") entry.resolved = Boolean(item.resolved);
  });
  const legacyTarget = entries.find(entry => !entry.resolved);
  if (legacyTarget && REMARK_COLLABORATION_FIELDS.some(field => item[field] !== undefined)) {
    REMARK_COLLABORATION_FIELDS.forEach(field => {
      if (legacyTarget[field] === undefined && item[field] !== undefined) legacyTarget[field] = item[field];
      delete item[field];
    });
  }
  return entries;
}

function openRemarkEntries(item = {}) {
  return ensureRemarkEntries(item).filter(entry => !entry.resolved);
}

function syncItemRemarkSummary(item = {}) {
  const entries = ensureRemarkEntries(item);
  if (!entries.length) return;
  const allResolved = entries.every(entry => entry.resolved);
  item.resolved = allResolved;
  if (allResolved) {
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
  } else {
    item.resolvedAt = "";
    item.confirmedAt = "";
  }
}

function appendResolutionCompletion(item) {
  const actor = resolutionActor();
  const now = new Date().toISOString();
  item.resolutionEvents = [...(Array.isArray(item.resolutionEvents) ? item.resolutionEvents : []), {
    id: `resolution-event:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    action: "completed",
    actorKey: actor.key,
    name: actor.name,
    role: actor.role,
    at: now
  }];
  item.resolutionCompletedParticipants = resolutionParticipants(item);
}

async function publishRemarkCollaborationAction(equipmentId, nodeIndex, date, action, extra = {}) {
  const recordKey = key(equipmentId, nodeIndex, date);
  const equipmentArea = equipmentById(Number(equipmentId))?.area || "";
  const result = await apiJson("/api/remark-collaboration", {
    method: "POST",
    timeout: 20000,
    body: JSON.stringify({
      actionId: nextActionId(),
      clientId: CLIENT_ID,
      key: recordKey,
      action,
      actor: resolutionActor(),
      equipmentArea,
      ...extra
    })
  });
  if (result?.state) mergeRealtimePatch(result.state);
  if (result?.stateVersion) setRealtimeStateVersion(result.stateVersion);
  persistStateLocally(state);
  return result;
}

function canEditComment(item) {
  if (!canEditChecklist()) return false;
  if (profile?.role === "editor" || profile?.role === "director") return true;
  return true;
}

function setCommentOwner(item) {
  if (!item.commentOwnerRole && (String(item.comment || "").trim() || item.commentPhoto)) {
    const actor = resolutionActor();
    item.commentOwnerRole = currentRoleId();
    item.commentOwnerName = profile?.name || "";
    item.commentOwnerKey = actor.key;
    item.commentOwnerId = actor.id;
    item.commentOwnerEmployeeId = actor.employeeId;
    item.commentOwnerPhone = actor.phone;
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
    authorKey: item.commentOwnerKey || "",
    authorId: item.commentOwnerId || "",
    authorEmployeeId: item.commentOwnerEmployeeId || "",
    authorPhone: item.commentOwnerPhone || "",
    at: item.commentUpdatedAt || ""
  };
}

function appendCommentEntry(item, text, photo = "", meta = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;
  const now = new Date().toISOString();
  const actor = resolutionActor();
  const entry = {
    id: `remark:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
    text: cleanText,
    photo: photo || item.commentPhoto || "",
    role: currentRoleId(),
    name: profile?.name || "",
    authorKey: actor.key,
    authorId: actor.id,
    authorEmployeeId: actor.employeeId,
    authorPhone: actor.phone,
    at: now,
    type: meta.type || "remark",
    resolved: meta.type === "downtime"
  };
  item.commentLog = [...(Array.isArray(item.commentLog) ? item.commentLog : []), entry];
  if (window.PPRModules?.comments?.clearComposer) {
    window.PPRModules.comments.clearComposer(item);
  } else {
    item.comment = "";
    item.commentPhoto = "";
    item.commentOwnerRole = "";
    item.commentOwnerName = "";
    item.commentUpdatedAt = "";
    item.nodeDraftText = "";
  }
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
  item.comment = "";
  item.commentPhoto = "";
  item.commentOwnerRole = "";
  item.commentOwnerName = "";
  item.commentUpdatedAt = "";
  item.nodeDraftText = "";
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

function remarkCardHtml(eq, item, nodeIndex, entry, entryIndex) {
  const remarkId = stableRemarkId(entry);
  const author = commentEntryAuthor(entry);
  const resolved = Boolean(entry.resolved);
  const pendingConfirmation = Boolean(entry.resolutionPendingConfirmation && !resolved);
  const participants = resolutionParticipants(entry);
  const participantKeys = new Set(participants.map(participant => participant.key));
  const currentParticipant = isResolutionParticipant(entry);
  const canManageParticipants = canManageResolutionParticipants(entry);
  const participantOptions = eligibleResolutionUsers(eq).filter(user => !participantKeys.has(user.key));
  const resolutionUpdates = (Array.isArray(entry.resolutionUpdates) ? entry.resolutionUpdates : []).slice().reverse();
  const resolutionEvents = (Array.isArray(entry.resolutionEvents) ? entry.resolutionEvents : []).slice().reverse();
  const resolutionStartedText = entry.resolutionStartedAt ? `В работе с ${dateTimeHuman(entry.resolutionStartedAt)}` : "Можно устранять вместе";
  const photoKey = `${key(eq.id, nodeIndex, current.date)}:${remarkId}`;
  const draftPhoto = remarkResolutionPhotoDrafts.get(photoKey) || "";
  const canResolve = canCompleteCollaborativeResolution(entry);
  const canConfirm = canCurrentUserConfirmRemark(entry, eq);
  const resolvedRole = ROLE_ACCESS[entry.resolvedByRole]?.label || entry.resolvedByRole || "";
  const resolvedBy = entry.resolvedByName ? `${entry.resolvedByName}${resolvedRole ? ` (${resolvedRole})` : ""}` : resolvedRole;
  const submittedRole = ROLE_ACCESS[entry.resolutionSubmittedByRole]?.label || entry.resolutionSubmittedByRole || "";
  const submittedBy = entry.resolutionSubmittedByName ? `${entry.resolutionSubmittedByName}${submittedRole ? ` (${submittedRole})` : ""}` : submittedRole;
  const confirmedRole = ROLE_ACCESS[entry.confirmedByRole]?.label || entry.confirmedByRole || "";
  const confirmedBy = entry.confirmedByName ? `${entry.confirmedByName}${confirmedRole ? ` (${confirmedRole})` : ""}` : confirmedRole;
  const cardStatus = resolved ? "Подтверждено" : pendingConfirmation ? "Ждёт подтверждения" : "Открыто";

  return `
    <article class="remark-card ${resolved ? "resolved" : pendingConfirmation ? "pending-confirmation" : "open"}" data-remark-card="${escapeHtml(remarkId)}">
      <header class="remark-card-head">
        <div>
          <strong>Замечание ${entryIndex + 1}</strong>
          <small>${escapeHtml(author)} · ${escapeHtml(dateTimeHuman(entry.at || ""))}</small>
        </div>
        <span class="remark-card-status">${cardStatus}</span>
      </header>
      <p class="remark-card-text">${escapeHtml(entry.text || "")}</p>
      ${entry.photo ? `<img class="remark-card-photo" src="${entry.photo}" alt="Фото замечания">` : ""}
      ${resolved ? `
        <div class="comment-resolution-detail">
          <strong>Устранил: ${escapeHtml(resolvedBy || "Сотрудник")}</strong>
          <span>${escapeHtml(dateTimeHuman(entry.resolvedAt || ""))}</span>
          ${entry.resolvedComment ? `<p>${escapeHtml(entry.resolvedComment)}</p>` : ""}
          ${entry.resolvedPhoto ? `<img src="${entry.resolvedPhoto}" alt="Фото устранения">` : ""}
          <small>Подтвердил: ${escapeHtml(confirmedBy || "Сотрудник")} · ${escapeHtml(dateTimeHuman(entry.confirmedAt || ""))}</small>
        </div>
      ` : pendingConfirmation ? `
        <section class="remark-confirmation-panel">
          <div class="remark-confirmation-head">
            <strong>Устранение ожидает подтверждения</strong>
            <span>Фактическое время устранения: ${escapeHtml(dateTimeHuman(entry.resolutionSubmittedAt || ""))}</span>
          </div>
          <div class="comment-resolution-detail pending">
            <strong>Устранил: ${escapeHtml(submittedBy || "Сотрудник")}</strong>
            ${entry.resolutionSubmittedComment ? `<p>${escapeHtml(entry.resolutionSubmittedComment)}</p>` : ""}
            ${entry.resolutionSubmittedPhoto ? `<img src="${entry.resolutionSubmittedPhoto}" alt="Фото устранения для подтверждения">` : ""}
          </div>
          <p class="remark-confirmation-who">Подтверждает: <strong>${escapeHtml(remarkConfirmationLabel(entry, eq))}</strong></p>
          ${canConfirm ? `
            <div class="node-walk-actions remark-confirmation-actions">
              <button type="button" class="secondary" data-remark-return>Вернуть на доработку</button>
              <button type="button" data-remark-confirm>Подтвердить устранение</button>
            </div>
          ` : `<div class="resolution-empty">Ожидается решение ответственного сотрудника</div>`}
        </section>
      ` : `
        <section class="remark-collaboration">
          <div class="remark-collaboration-head">
            <div><strong>Совместное устранение</strong><span>${escapeHtml(resolutionStartedText)}</span></div>
            ${!currentParticipant ? `<button type="button" data-remark-join>${participants.length ? "Присоединиться" : "Начать устранение"}</button>` : `<span class="resolution-participating">Вы участвуете</span>`}
          </div>
          <div class="resolution-participants">
            ${participants.length ? participants.map(participant => `
              <span class="resolution-participant">
                <span><strong>${escapeHtml(participant.name)}</strong><small>${escapeHtml(ROLE_ACCESS[participant.role]?.label || participant.role || "Сотрудник")}</small></span>
                ${canManageParticipants && participant.key !== entry.resolutionLeadKey ? `<button type="button" data-remark-remove="${escapeHtml(participant.key)}" aria-label="Убрать участника">×</button>` : ""}
              </span>
            `).join("") : `<span class="resolution-empty">Участники ещё не добавлены</span>`}
          </div>
          ${canManageParticipants && participantOptions.length ? `
            <div class="resolution-add-row">
              <select data-remark-user>
                <option value="">Выберите участника</option>
                ${participantOptions.map(user => `<option value="${escapeHtml(user.key)}">${escapeHtml(user.name)} · ${escapeHtml(ROLE_ACCESS[user.role]?.label || user.role || "Сотрудник")}</option>`).join("")}
              </select>
              <button type="button" data-remark-add>Добавить</button>
            </div>
          ` : ""}
          ${resolutionUpdates.length ? `
            <div class="resolution-updates">
              <strong>Что сделано</strong>
              ${resolutionUpdates.map(update => `
                <div class="resolution-update">
                  <strong>${escapeHtml(resolutionUpdateAuthor(update))}</strong>
                  <small>${escapeHtml(dateTimeHuman(update.at || ""))}</small>
                  <p>${escapeHtml(update.text || "")}</p>
                  ${update.photo ? `<img src="${update.photo}" alt="Фото выполненной работы">` : ""}
                </div>
              `).join("")}
            </div>
          ` : ""}
          <div class="remark-action-composer">
            <textarea data-remark-action-text rows="2" placeholder="Что сделано по этому замечанию"></textarea>
            <input data-remark-action-photo type="file" accept="image/*" capture="environment">
            <div class="photo-preview remark-action-preview">${draftPhoto ? `<img src="${draftPhoto}" alt="Фото работы"><button type="button" data-clear-remark-photo>Удалить фото</button>` : ""}</div>
            <div class="node-walk-actions">
              <button type="button" class="secondary" data-remark-work-update ${currentParticipant ? "" : "disabled"}>Добавить запись о работе</button>
              <button type="button" data-remark-resolve data-permission-disabled="${canResolve ? "false" : "true"}" ${!canResolve ? "disabled" : ""}>Устранено</button>
            </div>
          </div>
          ${resolutionEvents.length ? `
            <details class="resolution-events"><summary>История участников</summary>
              ${resolutionEvents.map(event => `<p><strong>${escapeHtml(event.name || "Сотрудник")}</strong> · ${escapeHtml(event.action === "removed" ? "убрал участника" : event.action === "submitted" ? "передал на подтверждение" : event.action === "confirmed" ? "подтвердил устранение" : event.action === "returned" ? "вернул на доработку" : event.action === "completed" ? "завершил устранение" : "добавил участника")} · ${escapeHtml(dateTimeHuman(event.at || ""))}</p>`).join("")}
            </details>
          ` : ""}
        </section>
      `}
    </article>
  `;
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

function requestNumberFromId(req) {
  const year = String(req.createdAt || req.date || todayISO()).slice(0, 4) || String(new Date().getFullYear());
  let hash = 0;
  for (const char of String(req.id || "")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return `З-${year}-${String(Math.abs(hash) % 100000).padStart(5, "0")}`;
}

function requestAddHistory(req, action, details = "") {
  req.history ||= [];
  req.approvals ||= {};
  const last = req.history.at(-1);
  if (last?.action === action && last?.details === details && Date.now() - Date.parse(last.at || 0) < 1500) return;
  req.history.push({
    at: new Date().toISOString(),
    action,
    details,
    status: req.status || req.requestStatus || "",
    role: profile?.role || "",
    name: profile?.name || ""
  });
}

function normalizeRequest(req) {
  if (!req || typeof req !== "object") return req;
  const eq = equipmentById(Number(req.equipmentId || 0));
  if (eq) {
    req.equipment = eq.name || req.equipment || "";
    req.area = eq.area || req.area || "";
    req.stockArea = eq.area || req.stockArea || "";
    const nodeIndex = Number(req.nodeIndex);
    if (Number.isFinite(nodeIndex) && eq.nodes?.[nodeIndex]) req.node = eq.nodes[nodeIndex];
  }
  req.requestNumber ||= requestNumberFromId(req);
  req.items = normalizeRequestItems(req.items, req);
  req.requestedQty = requestItemsTotal(req.items) || Number(req.requestedQty || req.quantity || req.qtyRequested || 1);
  req.route ||= req.stock || String(req.id || "").startsWith("stock-issue:") ? "stock" : "purchase";
  req.priority ||= "normal";
  req.dueDate ||= "";
  req.qtyPurchased = Number(req.qtyPurchased || req.qtyReceived || 0);
  req.qtyAccepted = Number(req.qtyAccepted || (req.warehouseReceived ? req.qtyReceived : 0) || 0);
  req.qtyInstalled = Number(req.qtyInstalled || req.aggregateInstalledQty || (req.mechanicInstalled ? req.qtyIssued : 0) || 0);
  req.productionDirectorRequestApproved = Boolean(req.productionDirectorRequestApproved);
  req.financePreApproved = Boolean(
    req.financePreApproved
    || req.economistPreApproved
    || req.financeInitialApproved
    || req.supplyPrepared
    || req.financeApproved
    || req.cashApproved
    || req.transferredToWarehouse
    || req.warehouseReceived
    || req.issued
    || req.done
    || req.stock
  );
  req.stockOut = Boolean(req.stockOut);
  req.stockOutAcknowledged = Boolean(req.stockOutAcknowledged);
  req.stockOutAt ||= "";
  req.stockOutReason ||= "";
  req.stockOutNotifyRole ||= "";
  req.stockOutRecipientMissing = Boolean(req.stockOutRecipientMissing);
  req.stockOutRequestedQty = Number(req.stockOutRequestedQty || 0);
  req.stockOutAvailableQty = Number(req.stockOutAvailableQty || 0);
  req.createdAt ||= req.updatedAt || new Date().toISOString();
  req.sourceRole ||= req.createdByRole || "";
  req.sourceName ||= req.createdByName || "";
  req.sourceKey ||= req.createdByKey || "";
  req.sourcePhone ||= req.createdByPhone || "";
  req.sourceEmployeeId ||= req.createdByEmployeeId || "";
  req.additionalPhotos = Array.isArray(req.additionalPhotos) ? req.additionalPhotos : [];
  req.history ||= [];
  if (!req.history.length) {
    req.history.push({
      at: req.createdAt || req.updatedAt || new Date().toISOString(),
      action: "Заявка создана",
      details: req.text || "",
      status: req.status || "shop",
      role: "",
      name: ""
    });
  }
  return req;
}

function requestAuthorHtml(req) {
  if (req.engineerCombinedBatch) {
    const authors = [...new Set(requestItems(req).map(item => [item.sourceName, item.sourceRole ? requestRoleLabel(item.sourceRole) : "", item.sourceArea].filter(Boolean).join(" · ")).filter(Boolean))];
    return `
      <div class="request-author">
        <strong>Сводная заявка:</strong>
        <span>${escapeHtml(authors.length ? authors.join("; ") : "несколько отправителей")}</span>
      </div>
    `;
  }
  const name = req.sourceName || req.createdByName || req.authorName || "";
  const role = req.sourceRole || req.createdByRole || req.authorRole || "";
  const phone = req.sourcePhone || req.createdByPhone || "";
  const employeeId = req.sourceEmployeeId || req.createdByEmployeeId || "";
  const meta = [
    role ? requestRoleLabel(role) : "",
    employeeId ? `таб. ${employeeId}` : "",
    phone
  ].filter(Boolean).join(" · ");
  if (!name && !meta) return `<div class="request-author missing">Автор заявки: не указан</div>`;
  return `
    <div class="request-author">
      <strong>Автор заявки:</strong>
      <span>${escapeHtml(name || "Не указан")}${meta ? ` · ${escapeHtml(meta)}` : ""}</span>
    </div>
  `;
}

function normalizeRequestItems(items, req = {}) {
  const source = Array.isArray(items) ? items : [];
  const normalized = source
    .map((item, index) => ({
      number: Number(item?.number || index + 1),
      name: String(item?.name || item?.text || "").trim(),
      article: String(item?.article || "").trim(),
      stockRemainder: String(item?.stockRemainder ?? item?.stock ?? "").trim(),
      unit: String(item?.unit || "шт").trim(),
      requestedQty: Number(item?.requestedQty || item?.qty || 0),
      requiredQty: Number(item?.requiredQty || item?.neededQty || item?.requestedQty || item?.qty || 0),
      note: String(item?.note || "").trim(),
      photo: String(item?.photo || item?.requestPhoto || "").trim(),
      price: String(item?.price || "").trim(),
      supplier: String(item?.supplier || "").trim(),
      supplyNote: String(item?.supplyNote || item?.purchaseNote || "").trim(),
      sourceRole: String(item?.sourceRole || "").trim(),
      sourceName: String(item?.sourceName || "").trim(),
      sourceKey: String(item?.sourceKey || "").trim(),
      sourcePhone: String(item?.sourcePhone || "").trim(),
      sourceEmployeeId: String(item?.sourceEmployeeId || "").trim(),
      sourceArea: String(item?.sourceArea || "").trim()
    }))
    .filter(item => item.name || item.article || item.note || item.requestedQty || item.requiredQty);
  if (normalized.length) return normalized.map((item, index) => ({ ...item, number: index + 1 }));
  const name = String(req.text || req.request || "").trim();
  if (!name) return [];
  return [{
    number: 1,
    name,
    article: normalizeArticle(req.article || ""),
    stockRemainder: "",
    unit: "шт",
    requestedQty: Number(req.requestedQty || req.quantity || 1),
    requiredQty: Number(req.requestedQty || req.quantity || 1),
    note: String(req.comment || "").trim(),
    photo: String(req.requestPhoto || "").trim(),
    price: String(req.price || "").trim(),
    supplier: String(req.supplier || "").trim(),
    supplyNote: String(req.supplier || "").trim()
  }];
}

function requestItems(req) {
  return normalizeRequestItems(req?.items, req);
}

function requestItemsTotal(items) {
  return normalizeRequestItems(items).reduce((sum, item) => sum + Number(item.requiredQty || item.requestedQty || 0), 0);
}

function requestItemsText(items) {
  return normalizeRequestItems(items).map(item => item.name).filter(Boolean).join("; ");
}

function applyRequestItems(req, items) {
  const normalized = normalizeRequestItems(items, req);
  req.items = normalized;
  req.text = requestItemsText(normalized) || req.text || "";
  req.requestedQty = requestItemsTotal(normalized) || Number(req.requestedQty || 1);
  req.qtyReceived = req.qtyReceived ? Math.min(Number(req.qtyReceived || 0), req.requestedQty) : req.requestedQty;
  req.qtyPurchased = req.qtyPurchased ? Math.min(Number(req.qtyPurchased || 0), req.requestedQty) : req.qtyReceived;
  return req;
}

function nodeWalkRequestItem(text, eq, nodeIndex, date, item = {}) {
  const noteParts = [
    eq?.nodes?.[nodeIndex] || "",
    dateHuman(date),
    commentsSummary(item) || item.comment || ""
  ].filter(Boolean);
  return {
    number: 1,
    name: String(text || "").trim(),
    article: "",
    stockRemainder: "",
    unit: "шт",
    requestedQty: 1,
    requiredQty: 1,
    note: noteParts.join(" · "),
    price: "",
    supplier: "",
    supplyNote: ""
  };
}

function openJournalRequestForShop(area, requestedTargetRole) {
  return Object.values(state.requests || {})
    .map(normalizeRequest)
    .find(req =>
      req
      && req.kind === "journal-batch"
      && !req.deleted
      && !req.engineerApproved
      && !req.productionDirectorRequestApproved
      && !req.financePreApproved
      && !req.supplyPrepared
      && !req.financeApproved
      && !req.cashApproved
      && !req.transferredToWarehouse
      && !req.done
      && !req.stock
      && ["shop", "engineer", "productionDirector"].includes(String(req.status || req.requestStatus || "shop"))
      && (req.area || "") === (area || "")
      && (req.requestedTargetRole || "") === (requestedTargetRole || "")
    ) || null;
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
    items: normalizeRequestItems(recKind.items, { text: requestText, requestedQty: recKind.requestedQty, comment: recKind.comment }),
    requestPhoto: recKind.requestPhoto || "",
    invoicePhoto: recKind.invoicePhoto || "",
    noInvoiceApproved: Boolean(recKind.noInvoiceApproved),
    price: recKind.price || "",
    supplier: recKind.supplier || "",
    status: recKind.requestStatus || "created",
    shopApproved: Boolean(recKind.shopApproved),
    engineerApproved: Boolean(recKind.engineerApproved),
    productionDirectorRequestApproved: Boolean(recKind.productionDirectorRequestApproved),
    financePreApproved: Boolean(recKind.financePreApproved || recKind.supplyPrepared || recKind.financeApproved || recKind.cashApproved || recKind.transferredToWarehouse),
    supplyPrepared: Boolean(recKind.supplyPrepared),
    financeApproved: Boolean(recKind.financeApproved),
    cashApproved: Boolean(recKind.cashApproved),
    transferredToWarehouse: Boolean(recKind.transferredToWarehouse),
    warehouseReceived: Boolean(recKind.warehouseReceived),
    issued: Boolean(recKind.issued),
    stockOut: Boolean(recKind.stockOut),
    stockOutAcknowledged: Boolean(recKind.stockOutAcknowledged),
    stockOutAt: recKind.stockOutAt || "",
    stockOutReason: recKind.stockOutReason || "",
    stockOutNotifyRole: recKind.stockOutNotifyRole || "",
    stockOutRecipientMissing: Boolean(recKind.stockOutRecipientMissing),
    stockOutRequestedQty: Number(recKind.stockOutRequestedQty || 0),
    stockOutAvailableQty: Number(recKind.stockOutAvailableQty || 0),
    requestedTargetRole: recKind.requestedTargetRole || "",
    issueTargetRole: recKind.issueTargetRole || "",
    issueTargetName: recKind.issueTargetName || "",
    issueTargetPhone: recKind.issueTargetPhone || "",
    installComment: recKind.installComment || "",
    aggregateRemarkKey: recKind.aggregateRemarkKey || "",
    mechanicInstalled: Boolean(recKind.mechanicInstalled),
    shopInstallApproved: Boolean(recKind.shopInstallApproved),
    productionDirectorApproved: Boolean(recKind.productionDirectorApproved),
    approvalResponsibilityDeclines: recKind.approvalResponsibilityDeclines && typeof recKind.approvalResponsibilityDeclines === "object" ? recKind.approvalResponsibilityDeclines : {},
    installResponsibilityDeclines: recKind.installResponsibilityDeclines && typeof recKind.installResponsibilityDeclines === "object" ? recKind.installResponsibilityDeclines : {},
    accountingWrittenOff: Boolean(recKind.accountingWrittenOff),
    done: Boolean(recKind.done),
    stock: Boolean(recKind.stock),
    qtyReceived: Number(recKind.qtyReceived || 0),
    qtyIssued: Number(recKind.qtyIssued || 0),
    aggregateInstalledQty: Number(recKind.aggregateInstalledQty || 0),
    stockArea: recKind.stockArea || "",
    inventoryAddedQty: Number(recKind.inventoryAddedQty || 0),
    inventoryAddedItems: recKind.inventoryAddedItems && typeof recKind.inventoryAddedItems === "object" ? recKind.inventoryAddedItems : {},
    requestNumber: recKind.requestNumber || "",
    route: recKind.route || "",
    priority: recKind.priority || "normal",
    dueDate: recKind.dueDate || "",
    requestedQty: Number(recKind.requestedQty || 1),
    qtyPurchased: Number(recKind.qtyPurchased || 0),
    qtyAccepted: Number(recKind.qtyAccepted || 0),
    qtyInstalled: Number(recKind.qtyInstalled || 0),
    returnedTo: recKind.returnedTo || "",
    returnReason: recKind.returnReason || "",
    rejected: Boolean(recKind.rejected),
    rejectionReason: recKind.rejectionReason || "",
    approvals: recKind.approvals && typeof recKind.approvals === "object" ? recKind.approvals : {},
    history: Array.isArray(recKind.history) ? recKind.history : []
    ,
    sourceRole: recKind.sourceRole || "",
    sourceName: recKind.sourceName || "",
    sourceKey: recKind.sourceKey || "",
    additionalPhotos: Array.isArray(recKind.additionalPhotos) ? recKind.additionalPhotos : []
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
    items: normalizeRequestItems(item.items || req.items, { text, requestedQty: item.requestedQty || req.requestedQty, comment: item.comment || req.comment }),
    requestPhoto: item.requestPhoto || req.requestPhoto || "",
    invoicePhoto: item.invoicePhoto || req.invoicePhoto || "",
    noInvoiceApproved: Boolean(item.noInvoiceApproved || req.noInvoiceApproved),
    price: item.price || req.price || "",
    supplier: item.supplier || req.supplier || "",
    status: item.requestStatus || req.status || "shop",
    shopApproved: Boolean(item.shopApproved || req.shopApproved),
    engineerApproved: Boolean(item.engineerApproved || req.engineerApproved),
    productionDirectorRequestApproved: Boolean(item.productionDirectorRequestApproved || req.productionDirectorRequestApproved),
    financePreApproved: Boolean(item.financePreApproved || req.financePreApproved || item.supplyPrepared || req.supplyPrepared || item.financeApproved || req.financeApproved),
    supplyPrepared: Boolean(item.supplyPrepared || req.supplyPrepared),
    financeApproved: Boolean(item.financeApproved || req.financeApproved),
    cashApproved: Boolean(item.cashApproved || req.cashApproved),
    transferredToWarehouse: Boolean(item.transferredToWarehouse || req.transferredToWarehouse),
    warehouseReceived: Boolean(item.warehouseReceived || req.warehouseReceived),
    issued: Boolean(item.issued || req.issued),
    stockOut: Boolean(item.stockOut || req.stockOut),
    stockOutAcknowledged: Boolean(item.stockOutAcknowledged || req.stockOutAcknowledged),
    stockOutAt: item.stockOutAt || req.stockOutAt || "",
    stockOutReason: item.stockOutReason || req.stockOutReason || "",
    stockOutNotifyRole: item.stockOutNotifyRole || req.stockOutNotifyRole || "",
    stockOutRecipientMissing: Boolean(item.stockOutRecipientMissing || req.stockOutRecipientMissing),
    stockOutRequestedQty: Number(item.stockOutRequestedQty || req.stockOutRequestedQty || 0),
    stockOutAvailableQty: Number(item.stockOutAvailableQty || req.stockOutAvailableQty || 0),
    requestedTargetRole: item.requestedTargetRole || req.requestedTargetRole || "",
    issueTargetRole: item.issueTargetRole || req.issueTargetRole || "",
    issueTargetName: item.issueTargetName || req.issueTargetName || "",
    issueTargetPhone: item.issueTargetPhone || req.issueTargetPhone || "",
    installComment: item.installComment || req.installComment || "",
    aggregateRemarkKey: item.aggregateRemarkKey || req.aggregateRemarkKey || "",
    mechanicInstalled: Boolean(item.mechanicInstalled || req.mechanicInstalled),
    shopInstallApproved: Boolean(item.shopInstallApproved || req.shopInstallApproved),
    productionDirectorApproved: Boolean(item.productionDirectorApproved || req.productionDirectorApproved),
    approvalResponsibilityDeclines: item.approvalResponsibilityDeclines || req.approvalResponsibilityDeclines || {},
    installResponsibilityDeclines: item.installResponsibilityDeclines || req.installResponsibilityDeclines || {},
    accountingWrittenOff: Boolean(item.accountingWrittenOff || req.accountingWrittenOff),
    done: Boolean(item.done || req.done),
    stock: Boolean(item.stock || req.stock),
    qtyReceived: Number(item.qtyReceived || req.qtyReceived || 0),
    qtyIssued: Number(item.qtyIssued || req.qtyIssued || 0),
    aggregateInstalledQty: Number(item.aggregateInstalledQty || req.aggregateInstalledQty || 0),
    stockArea: item.stockArea || req.stockArea || "",
    inventoryAddedQty: Number(item.inventoryAddedQty || req.inventoryAddedQty || 0),
    inventoryAddedItems: item.inventoryAddedItems || req.inventoryAddedItems || {},
    updatedAt: new Date().toISOString()
  };
  saveState();
  return state.requests[id];
}

function createDirectRequestFromCurrent() {
  state.requests ||= {};
  const rec = record();
  const item = rec[current.kind];
  const text = (ui.requestInput?.value || item.request || "").trim();
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
    items: normalizeRequestItems(old.items || item.items, { text, requestedQty: old.requestedQty || item.requestedQty, comment: item.comment }),
    requestPhoto: old.requestPhoto || item.requestPhoto || "",
    invoicePhoto: old.invoicePhoto || item.invoicePhoto || "",
    noInvoiceApproved: Boolean(old.noInvoiceApproved || item.noInvoiceApproved),
    price: old.price || item.price || "",
    supplier: old.supplier || item.supplier || "",
    status: old.status || item.requestStatus || "shop",
    shopApproved: Boolean(old.shopApproved || item.shopApproved),
    engineerApproved: Boolean(old.engineerApproved || item.engineerApproved),
    productionDirectorRequestApproved: Boolean(old.productionDirectorRequestApproved || item.productionDirectorRequestApproved),
    financePreApproved: Boolean(old.financePreApproved || item.financePreApproved || old.supplyPrepared || item.supplyPrepared || old.financeApproved || item.financeApproved),
    supplyPrepared: Boolean(old.supplyPrepared || item.supplyPrepared),
    financeApproved: Boolean(old.financeApproved || item.financeApproved),
    cashApproved: Boolean(old.cashApproved || item.cashApproved),
    transferredToWarehouse: Boolean(old.transferredToWarehouse || item.transferredToWarehouse),
    warehouseReceived: Boolean(old.warehouseReceived || item.warehouseReceived),
    issued: Boolean(old.issued || item.issued),
    stockOut: Boolean(old.stockOut || item.stockOut),
    stockOutAcknowledged: Boolean(old.stockOutAcknowledged || item.stockOutAcknowledged),
    stockOutAt: old.stockOutAt || item.stockOutAt || "",
    stockOutReason: old.stockOutReason || item.stockOutReason || "",
    stockOutNotifyRole: old.stockOutNotifyRole || item.stockOutNotifyRole || "",
    stockOutRecipientMissing: Boolean(old.stockOutRecipientMissing || item.stockOutRecipientMissing),
    stockOutRequestedQty: Number(old.stockOutRequestedQty || item.stockOutRequestedQty || 0),
    stockOutAvailableQty: Number(old.stockOutAvailableQty || item.stockOutAvailableQty || 0),
    requestedTargetRole: old.requestedTargetRole || item.requestedTargetRole || "",
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
    inventoryAddedItems: old.inventoryAddedItems || item.inventoryAddedItems || {},
    sourceRole: old.sourceRole || profile?.role || "",
    sourceName: old.sourceName || profile?.name || "",
    sourceKey: old.sourceKey || profileKey(),
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveState();
  return state.requests[id];
}

function blankTmcRequestRow() {
  return { name: "", article: "", stockRemainder: "", unit: "шт", requestedQty: 1, requiredQty: 1, note: "", photo: "" };
}

function tmcRowPhotoPreviewHtml(photo = "") {
  return photo ? `
    <div class="tmc-row-photo-preview">
      <img src="${photo}" alt="Фото позиции">
      <button type="button" data-clear-tmc-row-photo>Удалить</button>
    </div>
  ` : `<div class="tmc-row-photo-preview"></div>`;
}

function tmcRequestRowHtml(row = blankTmcRequestRow(), index = 0) {
  return `
    <tr data-tmc-row data-tmc-row-photo="${escapeHtml(row.photo || "")}">
      <td>${index + 1}</td>
      <td><textarea data-tmc-name rows="2" placeholder="Наименование ТМЦ или услуги">${escapeHtml(row.name || "")}</textarea></td>
      <td><input data-tmc-stock type="text" value="${escapeHtml(row.stockRemainder || "")}" placeholder="Остаток"></td>
      <td><input data-tmc-unit type="text" value="${escapeHtml(row.unit || "шт")}" placeholder="шт"></td>
      <td><input data-tmc-requested type="number" min="0" step="1" value="${Number(row.requestedQty || 1)}"></td>
      <td><input data-tmc-required type="number" min="0" step="1" value="${Number(row.requiredQty || row.requestedQty || 1)}"></td>
      <td>
        <label class="tmc-row-photo-field">
          <span>Фото</span>
          <input data-tmc-row-photo-input type="file" accept="image/*">
        </label>
        ${tmcRowPhotoPreviewHtml(row.photo || "")}
      </td>
      <td>
        <textarea data-tmc-note rows="2" placeholder="Примечание">${escapeHtml(row.note || "")}</textarea>
        ${index > 0 ? `<button type="button" class="tmc-row-remove" data-remove-tmc-row>Убрать</button>` : ""}
      </td>
    </tr>
  `;
}

function selectedTmcEquipment() {
  const id = Number(ui.tmcRequestEquipment?.value || 0);
  return equipmentById(id) || visibleEquipment()[0] || null;
}

function refreshTmcEquipmentSelectors() {
  if (!ui.tmcRequestArea || !ui.tmcRequestEquipment || !ui.tmcRequestNode) return;
  const equipment = visibleEquipment();
  const areas = [...new Set(equipment.map(eq => eq.area).filter(Boolean))];
  const selectedArea = ui.tmcRequestArea.value || profile?.area || current.selectedAggregateArea || areas[0] || "";
  ui.tmcRequestArea.innerHTML = areas.map(area => `<option value="${escapeHtml(area)}" ${area === selectedArea ? "selected" : ""}>${escapeHtml(area)}</option>`).join("");
  const areaEquipment = equipment.filter(eq => !ui.tmcRequestArea.value || eq.area === ui.tmcRequestArea.value);
  const selectedEquipmentId = Number(ui.tmcRequestEquipment.value || current.equipmentId || areaEquipment[0]?.id || 0);
  ui.tmcRequestEquipment.innerHTML = areaEquipment.map(eq => `<option value="${eq.id}" ${eq.id === selectedEquipmentId ? "selected" : ""}>${escapeHtml(eq.name)}</option>`).join("");
  const eq = selectedTmcEquipment();
  const selectedNode = Number(ui.tmcRequestNode.value || current.nodeIndex || 0);
  ui.tmcRequestNode.innerHTML = (eq?.nodes || []).map((node, index) => `<option value="${index}" ${index === selectedNode ? "selected" : ""}>${escapeHtml(node)}</option>`).join("");
}

function ensureTmcRequestRows() {
  if (!ui.tmcRequestRows) return;
  if (!ui.tmcRequestRows.querySelector("[data-tmc-row]")) {
    ui.tmcRequestRows.innerHTML = tmcRequestRowHtml(blankTmcRequestRow(), 0);
  }
}

function readTmcRequestRows() {
  const area = ui.tmcRequestArea?.value || profile?.area || COMMON_WAREHOUSE;
  const reserved = new Set();
  return [...(ui.tmcRequestRows?.querySelectorAll("[data-tmc-row]") || [])]
    .map((row, index) => ({
      number: index + 1,
      name: row.querySelector("[data-tmc-name]")?.value.trim() || "",
      article: "",
      stockRemainder: row.querySelector("[data-tmc-stock]")?.value.trim() || "",
      unit: row.querySelector("[data-tmc-unit]")?.value.trim() || "шт",
      requestedQty: Number(row.querySelector("[data-tmc-requested]")?.value || 0),
      requiredQty: Number(row.querySelector("[data-tmc-required]")?.value || 0),
      note: row.querySelector("[data-tmc-note]")?.value.trim() || "",
      photo: row.dataset.tmcRowPhoto || ""
    }))
    .filter(row => row.name || row.article || row.note || row.requestedQty || row.requiredQty)
    .map(row => ({
      ...row,
      article: row.name ? ensureInventoryArticle(area, row.name, row.article, state, reserved) : normalizeArticle(row.article)
    }));
}

function tmcRequestItemsWithContext(items, eq, nodeIndex) {
  const nodeName = Number.isFinite(Number(nodeIndex)) ? eq?.nodes?.[Number(nodeIndex)] || "" : "";
  const context = [eq?.name || "", nodeName].filter(Boolean).join(" · ");
  if (!context) return items;
  return items.map(item => ({
    ...item,
    note: [context, item.note].filter(Boolean).join(" · ")
  }));
}

function openDailyTmcRequest(area, status, sourceKey = "", combinedEngineerBatch = false) {
  const date = todayISO();
  return Object.values(state.requests || {})
    .map(normalizeRequest)
    .find(req =>
      req
      && req.kind === "tmc"
      && req.route !== "stock"
      && !req.deleted
      && req.date === date
      && (combinedEngineerBatch || (req.area || "") === (area || ""))
      && String(req.status || req.requestStatus || "") === String(status || "")
      && (!combinedEngineerBatch || req.engineerCombinedBatch)
      && (combinedEngineerBatch || !sourceKey || (req.sourceKey || "") === sourceKey)
      && (String(status || "") !== "shop" || !req.shopApproved)
      && !req.engineerApproved
      && !req.productionDirectorRequestApproved
      && !req.financePreApproved
      && !req.supplyPrepared
      && !req.financeApproved
      && !req.cashApproved
      && !req.transferredToWarehouse
      && !req.done
      && !req.stock
    ) || null;
}

function engineerIncomingTmcRequests() {
  if (profile?.role !== "engineer" && profile?.role !== "editor") return [];
  return allRequests().filter(req =>
    req
    && req.kind === "tmc"
    && !req.deleted
    && !req.done
    && !req.stock
    && ["mechanic", "electrician", "operator"].includes(req.sourceRole || "")
    && !req.engineerApproved
    && !req.productionDirectorRequestApproved
    && !req.financePreApproved
    && !req.supplyPrepared
    && !req.financeApproved
    && !req.cashApproved
    && !req.transferredToWarehouse
    && !req.warehouseReceived
    && !req.issued
  );
}

function canSeeTmcRequestArchive() {
  return ["engineer", "shop", "editor"].includes(profile?.role || "");
}

function tmcRequestArchiveItems() {
  if (!canSeeTmcRequestArchive()) return [];
  return allRequests().filter(req => {
    if (!req || req.deleted || req.kind !== "tmc") return false;
    if (profile?.role === "engineer") return ["mechanic", "electrician", "operator", "shop", "engineer"].includes(req.sourceRole || "");
    if (profile?.role === "shop") return areaAllowed(req.area);
    return true;
  });
}

function compactTmcArchiveCard(req, archiveMode = false) {
  normalizeRequest(req);
  const items = requestItems(req);
  const itemText = items.length
    ? items.slice(0, 4).map((item, index) => `${index + 1}. ${item.sourceName ? `${item.sourceName}: ` : ""}${item.name || item.article || "Позиция"}${item.requiredQty || item.requestedQty ? ` - ${Number(item.requiredQty || item.requestedQty)} ${item.unit || "шт"}` : ""}`).join("; ")
    : req.text || "";
  return `
    <article class="request-card archive-request-card" data-archive-request-card="${escapeHtml(req.id)}">
      <div class="request-main">
        <div class="request-card-head">
          <div>
            <strong class="request-number">${escapeHtml(req.requestNumber || requestNumberFromId(req))}</strong>
            <b class="manual-text">${escapeHtml(req.equipment || "Без оборудования")}</b>
            <span><span class="manual-text">${escapeHtml(req.area || "")}${req.node ? ` · ${escapeHtml(req.node)}` : ""}</span> · ${dateHuman(req.date)}</span>
          </div>
          <div class="request-badges">
            <span class="request-route">${requestRoleLabel(req.status || waitingRole(req))}</span>
          </div>
        </div>
        ${requestAuthorHtml(req)}
        <p class="request-text manual-text">${escapeHtml(itemText)}</p>
        ${items.some(item => item.photo) ? `<div class="request-photo-strip">${items.filter(item => item.photo).slice(0, 4).map((item, index) => `<img class="request-photo" src="${item.photo}" alt="Фото позиции ${index + 1}">`).join("")}</div>` : ""}
        ${requestHistoryHtml(req)}
        <div class="archive-request-actions">
          ${archiveMode
            ? `<button type="button" class="action-button" data-print-archived-request="${escapeHtml(req.id)}">${mobileShareMode() ? "Отправить WhatsApp" : "Печатать"}</button>`
            : `<button type="button" class="action-button" data-save-print-request-archive="${escapeHtml(req.id)}">${mobileShareMode() ? "Сохранить и WhatsApp" : "Сохранить и печатать"}</button>`}
        </div>
      </div>
    </article>
  `;
}

function mobileShareMode() {
  return window.matchMedia?.("(max-width: 760px), (pointer: coarse)")?.matches || false;
}

function requestShareText(req) {
  normalizeRequest(req);
  const rows = requestItems(req).map((item, index) => {
    const author = [item.sourceName, item.sourceRole ? requestRoleLabel(item.sourceRole) : "", item.sourceArea].filter(Boolean).join(" · ");
    const qty = Number(item.requiredQty || item.requestedQty || 0);
    return `${index + 1}. ${author ? `${author}: ` : ""}${item.name || item.article || "Позиция"}${qty ? ` - ${qty} ${item.unit || "шт"}` : ""}${item.note ? ` (${item.note})` : ""}`;
  }).join("\n");
  return [
    `Заявка ${req.requestNumber || requestNumberFromId(req)}`,
    `${req.equipment || ""}${req.node ? ` · ${req.node}` : ""}`,
    `Участок: ${req.area || ""}`,
    `Дата: ${dateHuman(req.date)}`,
    `Автор: ${req.engineerCombinedBatch ? "Сводная заявка" : (req.sourceName || "Не указан")}`,
    "",
    rows || req.text || ""
  ].filter(line => line !== null && line !== undefined).join("\n");
}

function shareTextToWhatsApp(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
}

function requestPrintableFile(req) {
  normalizeRequest(req);
  const items = requestItems(req);
  const rows = (items.length ? items : [{}]).map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name || req.text || "Позиция")}</td>
      <td>${escapeHtml(item.article || "")}</td>
      <td>${escapeHtml(item.unit || "шт")}</td>
      <td>${Number(item.requiredQty || item.requestedQty || 0)}</td>
      <td>${escapeHtml(item.note || "")}</td>
    </tr>
  `).join("");
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(req.requestNumber || "Заявка")}</title><style>
    @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#102331;margin:0;padding:12mm}h1{margin:0 0 5mm;color:#14324a;font-size:22px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-bottom:5mm}.meta div{border:1px solid #cbd8df;border-radius:6px;padding:3mm}.meta span{display:block;color:#607785;font-size:11px}.meta strong{display:block;margin-top:1mm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #b9c9d1;padding:2.5mm;text-align:left;font-size:12px;vertical-align:top}th{background:#14324a;color:#fff}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:8mm}.signatures div{border-top:1px solid #102331;padding-top:2mm;font-size:12px}@media print{body{padding:0}}
  </style></head><body><h1>Заявка на приобретение ТМЦ и услуг</h1><div class="meta"><div><span>Номер</span><strong>${escapeHtml(req.requestNumber || requestNumberFromId(req))}</strong></div><div><span>Дата</span><strong>${escapeHtml(dateTimeHuman(req.createdAt || req.date))}</strong></div><div><span>Участок</span><strong>${escapeHtml(req.area || "")}</strong></div><div><span>Оборудование</span><strong>${escapeHtml(req.equipment || "")}</strong></div><div><span>Узел</span><strong>${escapeHtml(req.node || "")}</strong></div><div><span>Автор</span><strong>${escapeHtml(req.sourceName || profile?.name || "")}</strong></div></div><table><thead><tr><th>№</th><th>Наименование</th><th>Артикул</th><th>Ед.</th><th>Количество</th><th>Примечание</th></tr></thead><tbody>${rows}</tbody></table><div class="signatures"><div>Составил: __________________</div><div>Согласовал: __________________</div><div>Получил: __________________</div></div><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),500));<\/script></body></html>`;
  const safeNumber = String(req.requestNumber || "zayavka").replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, "-");
  return new File([html], `${safeNumber}-print.html`, { type: "text/html" });
}

async function shareRequestPrintFile(req) {
  try {
    const file = printRequestSheet(req, { asFile: true });
    if (!file) throw new Error("print-file-not-created");
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: req.requestNumber || "Заявка", text: "Файл заявки для печати", files: [file] });
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  printRequestSheet(req);
}

function sendRequestByDevice(req) {
  if (mobileShareMode()) shareRequestPrintFile(req);
  else printRequestSheet(req);
}

function bindTmcArchiveActions(root = document) {
  root.querySelectorAll("[data-save-print-request-archive]").forEach(button => {
    button.addEventListener("click", event => {
      const req = state.requests?.[event.currentTarget.dataset.savePrintRequestArchive || ""];
      if (!req) return;
      req.done = true;
      req.stock = false;
      req.status = "done";
      req.updatedAt = new Date().toISOString();
      requestAddHistory(req, "Сохранено в архив и отправлено на печать", profile?.name || "");
      syncRequestToRecord(req);
      saveState();
      publishStateNow().catch(scheduleRemoteRetry);
      sendRequestByDevice(req);
      renderTmcRequestArchivePanel();
    });
  });
  root.querySelectorAll("[data-print-archived-request]").forEach(button => {
    button.addEventListener("click", event => {
      const req = state.requests?.[event.currentTarget.dataset.printArchivedRequest || ""];
      if (req) sendRequestByDevice(req);
    });
  });
}

function printTmcArchiveSheet(requests = []) {
  const win = window.open("", "_blank");
  if (!win) return;
  const title = profile?.role === "shop" ? "Архив заявок участка" : "Архив заявок инженеру";
  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body{font-family:Arial,sans-serif;color:#111827;margin:18px}
          .sheet{page-break-after:always;border:1px solid #cfd8e3;padding:16px;margin-bottom:16px}
          .sheet:last-child{page-break-after:auto}
          h1{font-size:20px;margin:0 0 8px}
          h2{font-size:16px;margin:12px 0 6px}
          p{margin:4px 0}
          table{width:100%;border-collapse:collapse;margin-top:8px}
          th,td{border:1px solid #cfd8e3;padding:6px;text-align:left;font-size:12px}
          .muted{color:#667085}
        </style>
      </head>
      <body>
        ${requests.map(req => {
          normalizeRequest(req);
          return `
            <section class="sheet">
              <h1>${escapeHtml(req.requestNumber || requestNumberFromId(req))}</h1>
              <p><b>Оборудование:</b> ${escapeHtml(req.equipment || "")}${req.node ? ` · ${escapeHtml(req.node)}` : ""}</p>
              <p><b>Участок:</b> ${escapeHtml(req.area || "")} · <b>Дата:</b> ${dateHuman(req.date)}</p>
              <p><b>Автор:</b> ${escapeHtml(req.sourceName || "Не указан")} ${req.sourceRole ? `(${escapeHtml(requestRoleLabel(req.sourceRole))})` : ""} ${req.sourcePhone ? ` · ${escapeHtml(req.sourcePhone)}` : ""}</p>
              <h2>Позиции</h2>
              <table>
                <thead><tr><th>№</th><th>Кто отправил</th><th>Наименование</th><th>Артикул</th><th>Ед.</th><th>Кол-во</th><th>Примечание</th></tr></thead>
                <tbody>${requestItems(req).map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml([item.sourceName, item.sourceRole ? requestRoleLabel(item.sourceRole) : "", item.sourceArea].filter(Boolean).join(" · "))}</td>
                    <td>${escapeHtml(item.name || "")}</td>
                    <td>${escapeHtml(item.article || "")}</td>
                    <td>${escapeHtml(item.unit || "шт")}</td>
                    <td>${Number(item.requiredQty || item.requestedQty || 0)}</td>
                    <td>${escapeHtml(item.note || "")}</td>
                  </tr>
                `).join("")}</tbody>
              </table>
              <h2>История</h2>
              ${(req.history || []).map(entry => `<p class="muted">${dateTimeHuman(entry.at)} - ${escapeHtml(entry.action || "")}${entry.name ? ` - ${escapeHtml(entry.name)}` : ""}</p>`).join("")}
            </section>
          `;
        }).join("")}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function shareTmcArchive(requests = []) {
  if (!requests.length) return;
  const title = profile?.role === "shop" ? "Архив заявок участка" : "Архив заявок инженеру";
  const text = [title, "", ...requests.map(requestShareText)].join("\n\n---\n\n");
  shareTextToWhatsApp(text);
}

function openTmcArchiveDialog() {
  const requests = tmcRequestArchiveItems().filter(req => req.done || req.stock).slice(0, 200);
  const overlay = document.createElement("div");
  overlay.className = "request-archive-overlay";
  overlay.innerHTML = `
    <section class="request-archive-dialog" role="dialog" aria-modal="true">
      <header>
        <div>
          <strong>${profile?.role === "shop" ? "Архив заявок участка" : "Архив заявок инженеру"}</strong>
          <span>${requests.length} записей для просмотра и отчёта</span>
        </div>
        <button type="button" data-close-request-archive>Закрыть</button>
      </header>
      <div class="archive-request-actions archive-dialog-actions">
        <button type="button" class="action-button" data-print-request-archive-all ${requests.length ? "" : "disabled"}>${mobileShareMode() ? "Отправить архив WhatsApp" : "Печатать архив по листам"}</button>
      </div>
      <div class="request-archive-dialog-list">${requests.length ? requests.map(req => compactTmcArchiveCard(req, true)).join("") : `<div class="empty-state">Архив пока пуст</div>`}</div>
    </section>
  `;
  const close = () => overlay.remove();
  overlay.addEventListener("click", event => {
    if (event.target === overlay) close();
  });
  overlay.querySelector("[data-close-request-archive]")?.addEventListener("click", close);
  overlay.querySelector("[data-print-request-archive-all]")?.addEventListener("click", () => {
    if (mobileShareMode()) shareTmcArchive(requests);
    else printTmcArchiveSheet(requests);
  });
  bindTmcArchiveActions(overlay);
  document.body.append(overlay);
}

function renderTmcRequestArchivePanel() {
  const panel = ui.tmcRequestArchivePanel;
  if (!panel) return;
  if (!canSeeTmcRequestArchive()) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  const items = tmcRequestArchiveItems();
  const active = items.filter(req => !req.done && !req.stock).slice(0, 30);
  const archive = items.filter(req => req.done || req.stock).slice(0, 50);
  panel.hidden = false;
  panel.innerHTML = `
    <section class="request-create-archive-section">
      <div class="warehouse-stock-head">
        <div>
          <strong>${profile?.role === "shop" ? "Заявки участка" : "Заявки инженеру"}</strong>
          <span>Автор, оборудование, позиции и история</span>
        </div>
        <button type="button" class="mini-action" data-open-request-archive>Архив (${archive.length})</button>
      </div>
      <details open>
        <summary>Текущие (${active.length})</summary>
        <div class="request-create-archive-list">${active.length ? active.map(req => compactTmcArchiveCard(req, false)).join("") : `<div class="empty-state">Текущих заявок нет</div>`}</div>
      </details>
    </section>
  `;
  bindTmcArchiveActions(panel);
  panel.querySelector("[data-open-request-archive]")?.addEventListener("click", openTmcArchiveDialog);
}

function engineerIncomingTmcItemCount() {
  return engineerIncomingTmcRequests().reduce((sum, req) => sum + Math.max(1, requestItems(req).length), 0);
}

function saveEngineerIncomingTmcRow(req, index, row) {
  const items = requestItems(req);
  if (!items[index]) return false;
  items[index] = {
    ...items[index],
    name: row.querySelector("[data-engineer-item-name]")?.value.trim() || "",
    article: row.querySelector("[data-engineer-item-article]")?.value.trim() || "",
    stockRemainder: row.querySelector("[data-engineer-item-stock]")?.value.trim() || "",
    unit: row.querySelector("[data-engineer-item-unit]")?.value.trim() || "шт",
    requestedQty: Number(row.querySelector("[data-engineer-item-requested]")?.value || 0),
    requiredQty: Number(row.querySelector("[data-engineer-item-required]")?.value || 0),
    note: row.querySelector("[data-engineer-item-note]")?.value.trim() || ""
  };
  req.items = normalizeRequestItems(items, req);
  req.text = requestItemsText(req.items);
  req.requestedQty = requestItemsTotal(req.items) || 1;
  req.updatedAt = new Date().toISOString();
  return true;
}

function deleteEngineerIncomingTmcRow(req, index) {
  const items = requestItems(req);
  if (!items[index]) return false;
  items.splice(index, 1);
  if (!items.length) {
    req.deleted = true;
    req.updatedAt = new Date().toISOString();
    requestAddHistory(req, "Удалена накопленная заявка", "Инженер удалил последнюю строку");
    return true;
  }
  req.items = normalizeRequestItems(items, req);
  req.text = requestItemsText(req.items);
  req.requestedQty = requestItemsTotal(req.items) || 1;
  req.updatedAt = new Date().toISOString();
  requestAddHistory(req, "Удалена строка заявки", `Позиция ${index + 1}`);
  return true;
}

function renderEngineerIncomingTmcPanel() {
  const panel = ui.engineerIncomingTmcPanel;
  if (!panel) return;
  const requests = engineerIncomingTmcRequests();
  panel.hidden = !(profile?.role === "engineer" && requests.length);
  if (panel.hidden) {
    panel.innerHTML = "";
    return;
  }
  const count = requests.reduce((sum, req) => sum + requestItems(req).length, 0);
  panel.innerHTML = `
    <div class="engineer-incoming-head">
      <div>
        <strong>Накопленные заявки инженеру</strong>
        <span>${count} позиций ожидает проверки</span>
      </div>
      <button type="button" data-open-engineer-requests>Открыть список</button>
    </div>
    ${requests.map(req => `
      <section class="engineer-incoming-request" data-engineer-req="${escapeHtml(req.id)}">
        <header>
          <b>${escapeHtml(req.requestNumber || requestNumberFromId(req))}</b>
          <span>${escapeHtml(req.area || "")} · ${dateHuman(req.date)}${req.sourceName ? ` · от ${escapeHtml(req.sourceName)}` : ""}</span>
          <button type="button" data-print-engineer-req="${escapeHtml(req.id)}">${mobileShareMode() ? "Отправить WhatsApp" : "Печатать"}</button>
        </header>
        <div class="engineer-incoming-table-wrap">
          <table class="engineer-incoming-table">
            <thead><tr><th>№</th><th>Кто отправил</th><th>Наименование</th><th>Артикул</th><th>Остаток</th><th>Ед.</th><th>Заяв.</th><th>Необх.</th><th>Примечание</th><th></th></tr></thead>
            <tbody>
              ${requestItems(req).map((item, index) => `
                <tr data-engineer-req-row="${escapeHtml(req.id)}" data-engineer-item-index="${index}">
                  <td>${index + 1}</td>
                  <td><span class="manual-text">${escapeHtml([item.sourceName, item.sourceRole ? requestRoleLabel(item.sourceRole) : "", item.sourceArea].filter(Boolean).join(" · "))}</span></td>
                  <td><textarea data-engineer-item-name rows="2">${escapeHtml(item.name || "")}</textarea></td>
                  <td><input data-engineer-item-article type="text" value="${escapeHtml(item.article || "")}"></td>
                  <td><input data-engineer-item-stock type="text" value="${escapeHtml(item.stockRemainder || "")}"></td>
                  <td><input data-engineer-item-unit type="text" value="${escapeHtml(item.unit || "шт")}"></td>
                  <td><input data-engineer-item-requested type="number" min="0" step="1" value="${Number(item.requestedQty || 0)}"></td>
                  <td><input data-engineer-item-required type="number" min="0" step="1" value="${Number(item.requiredQty || item.requestedQty || 0)}"></td>
                  <td><textarea data-engineer-item-note rows="2">${escapeHtml(item.note || "")}</textarea>${item.photo ? `<img class="request-item-photo" src="${item.photo}" alt="Фото позиции ${index + 1}">` : ""}</td>
                  <td><button type="button" data-delete-engineer-item>Удалить</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `).join("")}
  `;
}

function renderEngineerIncomingBanner() {
  const banner = ui.engineerIncomingBanner;
  if (!banner) return;
  banner.hidden = true;
  banner.innerHTML = "";
}

function resetTmcRequestForm() {
  if (!ui.tmcRequestForm) return;
  ui.tmcRequestDue.value = "";
  ui.tmcRequestRows.innerHTML = tmcRequestRowHtml(blankTmcRequestRow(), 0);
}

function workerSendsTmcRequestToEngineer(role = profile?.role) {
  return ["mechanic", "electrician", "operator"].includes(role);
}

function tmcRequestSubmitLabel(role = profile?.role) {
  if (mobileShareMode()) return "Отправить в WhatsApp";
  return workerSendsTmcRequestToEngineer(role) ? "Отправить инженеру" : "Создать заявку";
}

function updateTmcRequestButtonLabels() {
  const submitLabel = tmcRequestSubmitLabel();
  const quickLabel = ui.createTmcRequestButton?.querySelector("span");
  const quickBadge = ui.createTmcRequestButton?.querySelector("strong");
  const engineerCount = profile?.role === "engineer" ? engineerIncomingTmcItemCount() : 0;
  if (quickLabel) quickLabel.textContent = engineerCount > 0 ? "Заявки" : submitLabel;
  if (quickBadge) quickBadge.textContent = engineerCount > 0 ? engineerCount : workerSendsTmcRequestToEngineer() ? "→" : "+";
  ui.createTmcRequestButton?.classList.toggle("request-alert", engineerCount > 0);
  ui.createTmcRequestButton?.classList.toggle("has-count", engineerCount > 0);
  if (ui.submitTmcRequest) ui.submitTmcRequest.textContent = submitLabel;
}

function renderRequestCreate() {
  ui.subtitle.textContent = "Новая заявка";
  updateTmcRequestButtonLabels();
  renderEngineerIncomingBanner();
  renderEngineerIncomingTmcPanel();
  renderTmcRequestArchivePanel();
  refreshTmcEquipmentSelectors();
  ensureTmcRequestRows();
  if (ui.tmcRequestStatus && !ui.tmcRequestStatus.textContent) {
    ui.tmcRequestStatus.textContent = workerSendsTmcRequestToEngineer()
      ? "Заполните строки заявки и отправьте инженеру"
      : "Заполните строки заявки и нажмите создать";
  }
}

function createStandaloneTmcRequest() {
  if (!canEditChecklist()) return null;
  restoreTranslatedPage(ui.requestCreateScreen || document.body);
  current.tmcRequestMerged = false;
  const rawItems = readTmcRequestRows();
  if (!rawItems.length || !rawItems.some(item => item.name)) return null;
  const eq = selectedTmcEquipment();
  const nodeIndex = Number(ui.tmcRequestNode?.value || 0);
  const items = tmcRequestItemsWithContext(rawItems, eq, nodeIndex);
  const now = new Date().toISOString();
  const sourceRole = profile?.role || "";
  const authorIsShop = sourceRole === "shop";
  const authorIsEngineer = sourceRole === "engineer";
  const authorSendsToEngineer = workerSendsTmcRequestToEngineer(sourceRole);
  const initialRequestStatus = authorIsEngineer ? "productionDirector" : (authorIsShop || authorSendsToEngineer) ? "engineer" : "shop";
  const area = ui.tmcRequestArea?.value || eq?.area || profile?.area || "";
  const text = items.map(item => item.name).filter(Boolean).join("; ");
  const requestedQty = items.reduce((sum, item) => sum + Number(item.requiredQty || item.requestedQty || 0), 0) || 1;
  const itemsWithAuthor = items.map(item => ({
    ...item,
    sourceRole,
    sourceName: profile?.name || "",
    sourceKey: profileKey(),
    sourcePhone: profile?.phone || "",
    sourceEmployeeId: profile?.employeeId || "",
    sourceArea: area
  }));
  state.requests ||= {};
  const authorKey = profileKey();
  const existing = openDailyTmcRequest(area, initialRequestStatus, authorKey, authorSendsToEngineer);
  if (existing) {
    existing.items = normalizeRequestItems([...(existing.items || []), ...itemsWithAuthor], existing);
    existing.text = requestItemsText(existing.items);
    existing.requestedQty = requestItemsTotal(existing.items) || existing.requestedQty || 1;
    existing.updatedAt = now;
    if (ui.tmcRequestDue?.value && (!existing.dueDate || ui.tmcRequestDue.value < existing.dueDate)) {
      existing.dueDate = ui.tmcRequestDue.value;
    }
    requestAddHistory(existing, "Добавлены строки заявки", text);
    saveState();
    current.tmcRequestMerged = true;
    return existing;
  }
  const id = `tmc-request:${todayISO()}:req:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    state.requests[id] = normalizeRequest({
    id,
    equipmentId: eq?.id || 0,
    nodeIndex: Number.isFinite(nodeIndex) ? nodeIndex : 0,
    date: todayISO(),
    kind: "tmc",
    equipment: eq?.name || "Без оборудования",
    area: authorSendsToEngineer ? "Сводная заявка инженеру" : area,
    node: eq?.nodes?.[nodeIndex] || "",
    comment: "",
    commentPhoto: "",
    text,
    items: itemsWithAuthor,
    requestPhoto: "",
    invoicePhoto: "",
    noInvoiceApproved: false,
    price: "",
    supplier: "",
    status: initialRequestStatus,
    shopApproved: authorIsShop || authorIsEngineer || authorSendsToEngineer,
    engineerApproved: authorIsEngineer,
    productionDirectorRequestApproved: false,
    financePreApproved: false,
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
    approvalResponsibilityDeclines: {},
    installResponsibilityDeclines: {},
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: 0,
    qtyIssued: 0,
    aggregateInstalledQty: 0,
    stockArea: ui.tmcRequestArea?.value || eq?.area || "",
    inventoryAddedQty: 0,
    route: "purchase",
    priority: "normal",
    dueDate: ui.tmcRequestDue?.value || "",
    requestedQty,
    qtyPurchased: 0,
    qtyAccepted: 0,
    qtyInstalled: 0,
    sourceRole,
    sourceName: profile?.name || "",
    sourceKey: authorKey,
    sourcePhone: profile?.phone || "",
    sourceEmployeeId: profile?.employeeId || "",
    engineerCombinedBatch: authorSendsToEngineer,
    createdAt: now,
    updatedAt: now,
    history: [{
      at: now,
      action: "Заявка создана",
      details: text,
      status: initialRequestStatus,
      role: profile?.role || "",
      name: profile?.name || ""
    }],
    approvals: {}
  });
  saveState();
  return state.requests[id];
}

function buildMobileTmcRequestDraft() {
  if (!canEditChecklist()) return null;
  const rawItems = readTmcRequestRows();
  if (!rawItems.length || !rawItems.some(item => item.name)) return null;
  const eq = selectedTmcEquipment();
  const nodeIndex = Number(ui.tmcRequestNode?.value || 0);
  const area = ui.tmcRequestArea?.value || eq?.area || profile?.area || "";
  const items = tmcRequestItemsWithContext(rawItems, eq, nodeIndex).map(item => ({
    ...item,
    sourceRole: profile?.role || "",
    sourceName: profile?.name || "",
    sourcePhone: profile?.phone || "",
    sourceArea: area
  }));
  const now = new Date().toISOString();
  const id = `whatsapp-draft:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  return normalizeRequest({
    id,
    requestNumber: requestNumberFromId({ id, createdAt: now }),
    equipmentId: eq?.id || 0,
    nodeIndex: Number.isFinite(nodeIndex) ? nodeIndex : 0,
    date: todayISO(),
    createdAt: now,
    updatedAt: now,
    area,
    equipment: eq?.name || "Без оборудования",
    node: eq?.nodes?.[nodeIndex] || "",
    text: items.map(item => item.name).filter(Boolean).join("; "),
    items,
    dueDate: ui.tmcRequestDue?.value || "",
    sourceRole: profile?.role || "",
    sourceName: profile?.name || "",
    sourcePhone: profile?.phone || "",
    requestedQty: requestItemsTotal(items) || 1,
    kind: "tmc",
    status: "whatsapp",
    whatsappOnly: true,
    whatsappSent: true,
    reportOnly: true,
    done: true,
    sourceKey: profileKey(),
    history: [{ at: now, action: "Отправлено через WhatsApp", details: items.map(item => item.name).filter(Boolean).join("; "), status: "whatsapp", role: profile?.role || "", name: profile?.name || "" }],
    approvals: {}
  });
}

function createNodeWalkRequestSubmission(equipmentId, nodeIndex, date, item, text, requestPhoto = "") {
  state.requests ||= {};
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;
  const eq = equipmentById(equipmentId);
  const now = new Date().toISOString();
  const sourceRole = profile?.role || "";
  const authorIsShop = sourceRole === "shop";
  const authorIsEngineer = sourceRole === "engineer";
  const authorSendsToEngineer = workerSendsTmcRequestToEngineer(sourceRole);
  const initialRequestStatus = authorIsEngineer ? "productionDirector" : (authorIsShop || authorSendsToEngineer) ? "engineer" : "shop";
  const requestedTargetRole = item.requestedTargetRole || "";
  const nextItem = nodeWalkRequestItem(cleanText, eq, nodeIndex, date, item);
  const existing = openJournalRequestForShop(eq?.area || "", requestedTargetRole);
  if (existing) {
    existing.items = normalizeRequestItems([...(existing.items || []), nextItem], existing);
    existing.text = requestItemsText(existing.items);
    existing.requestedQty = requestItemsTotal(existing.items) || existing.requestedQty || 1;
    existing.updatedAt = now;
    existing.additionalPhotos = Array.isArray(existing.additionalPhotos) ? existing.additionalPhotos : [];
    if (requestPhoto) existing.additionalPhotos.push(requestPhoto);
    existing.comment = [existing.comment, commentsSummary(item) || item.comment || ""].filter(Boolean).join("\n");
    requestAddHistory(existing, "Добавлена строка из журнала", `${eq?.name || ""} · ${eq?.nodes?.[nodeIndex] || ""}: ${cleanText}`);
    syncRequestToRecord(existing);
    item.lastRequestId = existing.id;
    item.request = "";
    item.requestedTargetRole = "";
    item.requestPhoto = "";
    item.requestStatus = initialRequestStatus;
    item.updatedAt = now;
    saveState();
    return existing;
  }
  const id = newRequestId(equipmentId, nodeIndex, date, "to");
  state.requests[id] = {
    id,
    equipmentId,
    nodeIndex,
    date,
    kind: "journal-batch",
    equipment: eq?.name || "",
    area: eq?.area || "",
    node: eq?.nodes[nodeIndex] || "",
    comment: commentsSummary(item) || item.comment || "",
    commentPhoto: "",
    text: cleanText,
    items: [nextItem],
    requestPhoto: requestPhoto || item.requestPhoto || "",
    invoicePhoto: "",
    noInvoiceApproved: false,
    price: "",
    supplier: "",
    status: initialRequestStatus,
    shopApproved: authorIsShop || authorIsEngineer || authorSendsToEngineer,
    engineerApproved: authorIsEngineer,
    productionDirectorRequestApproved: false,
    financePreApproved: false,
    supplyPrepared: false,
    financeApproved: false,
    cashApproved: false,
    transferredToWarehouse: false,
    warehouseReceived: false,
    issued: false,
    requestedTargetRole,
    issueTargetRole: "",
    issueTargetName: "",
    issueTargetPhone: "",
    installComment: "",
    aggregateRemarkKey: "",
    mechanicInstalled: false,
    shopInstallApproved: false,
    productionDirectorApproved: false,
    approvalResponsibilityDeclines: {},
    accountingWrittenOff: false,
    done: false,
    stock: false,
    qtyReceived: 0,
    qtyIssued: 0,
    aggregateInstalledQty: 0,
    stockArea: "",
    inventoryAddedQty: 0,
    sourceRole,
    sourceName: profile?.name || "",
    sourceKey: profileKey(),
    createdAt: now,
    updatedAt: now,
    history: [{
      at: now,
      action: "Заявка создана из журнала",
      details: `${eq?.name || ""} · ${eq?.nodes?.[nodeIndex] || ""}: ${cleanText}`,
      status: initialRequestStatus,
      role: profile?.role || "",
      name: profile?.name || ""
    }],
    approvals: {}
  };
  item.lastRequestId = id;
  item.request = "";
  item.requestedTargetRole = "";
  item.requestPhoto = "";
  item.requestStatus = initialRequestStatus;
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
    items: normalizeRequestItems(item.items || old.items, { text, requestedQty: item.requestedQty || old.requestedQty, comment: item.comment || old.comment }),
    requestPhoto: item.requestPhoto || old.requestPhoto || "",
    invoicePhoto: old.invoicePhoto || item.invoicePhoto || "",
    noInvoiceApproved: Boolean(old.noInvoiceApproved || item.noInvoiceApproved),
    price: old.price || item.price || "",
    supplier: old.supplier || item.supplier || "",
    status: old.status || item.requestStatus || "shop",
    shopApproved: Boolean(old.shopApproved || item.shopApproved),
    engineerApproved: Boolean(old.engineerApproved || item.engineerApproved),
    productionDirectorRequestApproved: Boolean(old.productionDirectorRequestApproved || item.productionDirectorRequestApproved),
    financePreApproved: Boolean(old.financePreApproved || item.financePreApproved || old.supplyPrepared || item.supplyPrepared || old.financeApproved || item.financeApproved),
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
    sourceRole: old.sourceRole || item.sourceRole || profile?.role || "",
    sourceName: old.sourceName || item.sourceName || profile?.name || "",
    sourceKey: old.sourceKey || item.sourceKey || profileKey(),
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveState();
  return state.requests[id];
}

function allRequests() {
  if (allRequestsCacheVersion === stateDataVersion) return allRequestsCache;
  state.requests ||= {};
  const map = { ...(state.requests || {}) };
  Object.values(map).forEach(normalizeRequest);
  state.requests = map;
  allRequestsCache = Object.values(map)
    .filter(req => req && !req.deleted && req.text && req.id && !["journal-batch", "to"].includes(req.kind))
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)));
  allRequestsCacheVersion = stateDataVersion;
  return allRequestsCache;
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

function askCommentSubmit() {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "send-kind-overlay";
    const close = value => {
      overlay.remove();
      resolve(value);
    };
    overlay.innerHTML = `
      <div class="send-kind-dialog" role="dialog" aria-modal="true">
        <strong>Замечание с остановкой?</strong>
        <p>Если узел остановлен, запись попадет в простои.</p>
        <div class="send-kind-actions">
          <button type="button" data-send-without-stop>Без остановки</button>
          <button type="button" data-send-stop-type="breakdown">Аварийная остановка</button>
          <button type="button" data-send-stop-type="production">Производственная остановка</button>
          <button type="button" data-send-cancel>Отмена</button>
        </div>
      </div>
    `;
    overlay.querySelector("[data-send-without-stop]").addEventListener("click", () => close({ kind: "comment", downtime: false }));
    overlay.querySelectorAll("[data-send-stop-type]").forEach(button => button.addEventListener("click", () => {
      const type = button.dataset.sendStopType || "breakdown";
      close({ kind: "comment", downtime: true, downtimeType: type });
    }));
    overlay.querySelector("[data-send-cancel]").addEventListener("click", () => close(null));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close(null);
    });
    document.body.append(overlay);
  });
}

function requestMatchesRole(req, role) {
  if (MANUAL_REQUEST_WORKFLOW) return role === "all";
  if (role === "all") return true;
  if (stockOutVisibleToProfile(req, role)) return true;
  if (req.returnedTo) return req.returnedTo === role || (req.returnedTo === "financePre" && role === "finance");
  if (canConfirmIssuedInstall(req, role)) return true;
  if (role === "shop") return !req.issued && !req.shopApproved;
  if (role === "engineer" && requestWaitingForInstallApproval(req)) return !installResponsibilityDeclined(req, "engineer");
  if (role === "productionDirector" && requestWaitingForProductionDirectorInitial(req)) return !approvalResponsibilityDeclined(req, "productionDirector");
  if (role === "productionDirector" && requestWaitingForProductionDirector(req)) return !installResponsibilityDeclined(req, "productionDirector");
  if (role === "accounting") return requestReadyForAccounting(req) && !req.accountingWrittenOff;
  if (req.route === "stock") {
    if (role === "warehouse") return req.shopApproved && !req.issued && !req.stock && !req.done;
    return false;
  }
  if (role === "engineer") return requestWaitingForEngineerInitial(req) && !approvalResponsibilityDeclined(req, "engineer");
  if (role === "supply") return requestReadyForSupply(req) || (req.cashApproved && !req.transferredToWarehouse);
  if (role === "finance") return requestWaitingForFinancePreApproval(req) || (req.supplyPrepared && !req.financeApproved);
  if (role === "cash") return req.financeApproved && !req.cashApproved;
  if (role === "warehouse") return ((req.transferredToWarehouse || req.warehouseAsk) && !req.issued && !req.stock && !req.done);
  return false;
}

function requestNeedsRole(req, role) {
  if (MANUAL_REQUEST_WORKFLOW) return false;
  if (role === "all") return true;
  if (stockOutVisibleToProfile(req, role)) return true;
  if (req.returnedTo) return req.returnedTo === role || (req.returnedTo === "financePre" && role === "finance");
  if (canConfirmIssuedInstall(req, role)) return true;
  if (role === "shop") return !req.issued && !req.shopApproved;
  if (role === "warehouse") return ((req.transferredToWarehouse || req.warehouseAsk) && !req.issued && !req.stock && !req.done);
  if (role === "productionDirector" && requestWaitingForProductionDirectorInitial(req)) return !approvalResponsibilityDeclined(req, "productionDirector");
  if (role === "productionDirector" && requestWaitingForProductionDirector(req)) return !installResponsibilityDeclined(req, "productionDirector");
  if (role === "accounting") return requestReadyForAccounting(req) && !req.accountingWrittenOff;
  return requestMatchesRole(req, role);
}

function requestRoleLabel(role) {
  return {
    all: "Все",
    manual: "Ручной обход",
    shop: "Начальник цеха",
    confirmInstall: "Инженер/Директор производства",
    engineer: "Инженер",
    financePre: "Ручное согласование",
    supply: "Ручное согласование",
    finance: "Ручное согласование",
    cash: "Ручное согласование",
    productionDirector: "Директор производства",
    accounting: "Ответственный",
    warehouse: "Складовщик",
    mechanic: "Механик",
    electrician: "Электрик",
    operator: "Оператор"
  }[role] || role;
}

function waitingRole(req) {
  if (MANUAL_REQUEST_WORKFLOW) {
    if (req.stock || req.done) return "done";
    if (req.rejected && req.returnedTo) return req.returnedTo;
    if (req.rejected) return req.sourceRole || "manual";
    return "manual";
  }
  if (req.rejected && req.returnedTo) return req.returnedTo;
  if (req.rejected) return req.sourceRole || "shop";
  if (req.stockOut && !req.stockOutAcknowledged) return stockOutNotifyRole(req);
  if (req.stock || req.done) return "done";
  if (req.returnedTo) return req.returnedTo;
  if (requestReadyForAccounting(req) && !req.accountingWrittenOff) return "accounting";
  if (requestWaitingForInstallApproval(req)) return "confirmInstall";
  if (req.issued && !req.mechanicInstalled) return warehouseIssueTargetRole(req);
  if (req.transferredToWarehouse && !req.warehouseReceived) return "warehouse";
  if (req.warehouseReceived && !req.issued) return "warehouse";
  if (!req.shopApproved) return "shop";
  if (req.route === "stock") return "warehouse";
  if (requestRequiresEngineerApproval(req) && !req.engineerApproved && !approvalResponsibilityDeclined(req, "engineer")) return "engineer";
  if (requestWaitingForProductionDirectorInitial(req)) return "productionDirector";
  if (requestWaitingForFinancePreApproval(req)) return "financePre";
  if (requestReadyForSupply(req)) return "supply";
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

async function uploadPhotoDataUrl(dataUrl) {
  if (!String(dataUrl || "").startsWith("data:image/")) return dataUrl || "";
  const result = await apiJson("/api/photos", {
    method: "POST",
    timeout: 30000,
    body: JSON.stringify({ data: dataUrl })
  });
  return result?.url || dataUrl;
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
      img.onerror = () => {
        const dataUrl = String(reader.result || "");
        uploadPhotoDataUrl(dataUrl).then(resolve).catch(() => resolve(dataUrl));
      };
      img.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        uploadPhotoDataUrl(dataUrl).then(resolve).catch(() => resolve(dataUrl));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function downtimes() {
  state.downtimes ||= [];
  const clearMarker = state.downtimes
    .filter(item => item?.clearAll)
    .sort((a, b) => String(b.deletedAt || b.updatedAt || "").localeCompare(String(a.deletedAt || a.updatedAt || "")))[0];
  const clearedAt = Date.parse(clearMarker?.deletedAt || clearMarker?.updatedAt || "");
  return state.downtimes.filter(item => {
    if (!item || item.deleted || item.clearAll) return false;
    if (!Number.isFinite(clearedAt)) return true;
    const itemTime = Date.parse(item.updatedAt || item.endedAt || item.startedAt || item.createdAt || "");
    return Number.isFinite(itemTime) && itemTime > clearedAt;
  });
}

function downtimeKey(equipmentId, nodeIndex) {
  return `${equipmentId}:${nodeIndex}`;
}

function activeDowntime(equipmentId, nodeIndex) {
  const keyValue = downtimeKey(equipmentId, nodeIndex);
  return downtimes().find(item => item.key === keyValue && !item.endedAt) || null;
}

function activeDowntimeForArea(area) {
  return downtimes()
    .filter(item => item.area === area && !item.endedAt)
    .sort((a, b) => String(b.startedAt || "").localeCompare(String(a.startedAt || "")))[0] || null;
}

function openDowntimeComment(item) {
  if (!item) return false;
  const eq = equipmentById(Number(item.equipmentId));
  const nodeIndex = Number(item.nodeIndex);
  const downtimeDate = String(item.startedAt || "").slice(0, 10);
  if (!eq || !Number.isInteger(nodeIndex) || nodeIndex < 0 || nodeIndex >= eq.nodes.length || !/^\d{4}-\d{2}-\d{2}$/.test(downtimeDate)) return false;
  current.equipmentId = eq.id;
  current.nodeIndex = nodeIndex;
  current.nodeDetailIndex = current.nodeIndex;
  current.date = downtimeDate;
  current.kind = "to";
  current.scrollToDowntimeNode = current.nodeIndex;
  current.scrollToCommentNode = null;
  current.scrollToMainComment = false;
  show("checklist");
  return true;
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

function openDowntime(equipmentId, nodeIndex, comment, type = "breakdown", saveOptions = {}) {
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
  saveState(saveOptions);
}

function closeDowntime(item, comment = "", saveOptions = {}) {
  if (!item || item.endedAt) return;
  item.endedAt = new Date().toISOString();
  item.closeComment = String(comment || "").trim();
  item.closedByName = profile?.name || "";
  item.closedByRole = profile?.role || "";
  saveState(saveOptions);
}

function openDowntimeFromRemark(equipmentId, nodeIndex, comment, type = "breakdown") {
  const text = String(comment || "").trim();
  if (!text || activeDowntime(equipmentId, nodeIndex)) return null;
  openDowntime(equipmentId, nodeIndex, text, type, { remote: false });
  const opened = activeDowntime(equipmentId, nodeIndex);
  appendDowntimeCommentToNode(equipmentId, nodeIndex, current.date, "Остановка", text);
  return opened;
}

function closeDowntimeFromFix(equipmentId, nodeIndex, comment) {
  const active = activeDowntime(equipmentId, nodeIndex);
  if (!active) return;
  const text = String(comment || "").trim() || "Замечание устранено";
  closeDowntime(active, text);
  appendDowntimeCommentToNode(equipmentId, nodeIndex, current.date, "Пуск", text);
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

function partNameFromRequest(req) {
  return String(req.text || "").trim() || "Запчасть без названия";
}

function partArticleFromRequest(req) {
  return normalizeArticle(req.article || requestItems(req)[0]?.article || "");
}

function inventoryNameFromRequestItem(item, fallback = "") {
  return String(item?.name || item?.text || fallback || "Запчасть без названия").trim();
}

function requestInventoryLines(req) {
  const items = requestItems(req);
  if (!items.length) {
    return [{
      key: "single",
      name: partNameFromRequest(req),
      article: partArticleFromRequest(req),
      qty: Number(req.qtyReceived || req.requestedQty || 1) || 1,
      unit: requestItems(req)[0]?.unit || req.unit || "шт",
      note: [req.node, req.comment].filter(Boolean).join(" · ")
    }];
  }
  return items
    .map((item, index) => ({
      key: normalizeArticle(item.article) || String(index),
      name: inventoryNameFromRequestItem(item, partNameFromRequest(req)),
      article: normalizeArticle(item.article),
      qty: Number(item.requiredQty || item.requestedQty || 0),
      unit: item.unit || "шт",
      note: [item.note, item.supplyNote].filter(Boolean).join(" · ")
    }))
    .filter(line => line.name && line.qty > 0);
}

function inventoryAddedMap(req) {
  if (!req.inventoryAddedItems || typeof req.inventoryAddedItems !== "object") {
    req.inventoryAddedItems = {};
  }
  return req.inventoryAddedItems;
}

function addRequestItemsToInventory(req, targetArea, totalReceived = 0) {
  const lines = requestInventoryLines(req);
  const added = inventoryAddedMap(req);
  const now = req.stockAt || new Date().toISOString();
  const warehousePrice = req.warehouseUnitPrice || "";
  let remaining = Number(totalReceived || 0) > 0
    ? Number(totalReceived || 0)
    : lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  let totalAdded = 0;
  lines.forEach(line => {
    const acceptedQty = Math.min(Number(line.qty || 0), Math.max(remaining, 0));
    remaining -= acceptedQty;
    const already = Number(added[line.key] || 0);
    const delta = Math.max(acceptedQty - already, 0);
    if (delta <= 0) return;
    addInventory(targetArea, line.name, delta, `Запас: ${req.equipment || req.requestNumber || ""}`, {
      stockAt: now,
      article: line.article,
      unit: line.unit,
      note: line.note,
      price: warehousePrice
    });
    added[line.key] = already + delta;
    totalAdded += delta;
  });
  req.inventoryAddedQty = Object.values(added).reduce((sum, value) => sum + Number(value || 0), 0);
  return totalAdded;
}

function inventoryItems() {
  if (inventoryItemsCacheVersion === stateDataVersion) return inventoryItemsCache;
  state.inventory ||= {};
  inventoryItemsCache = Object.values(state.inventory)
    .filter(item => item && item.name && Number(item.qty || 0) > 0)
    .sort((a, b) => String(b.lastReceivedAt || b.updatedAt || "").localeCompare(String(a.lastReceivedAt || a.updatedAt || "")) || `${a.area} ${a.name}`.localeCompare(`${b.area} ${b.name}`, "ru"));
  inventoryItemsCacheVersion = stateDataVersion;
  return inventoryItemsCache;
}

function zeroInventoryItems() {
  return Object.values(state.inventory || {})
    .filter(item => item && item.name && Number(item.qty || 0) <= 0)
    .sort((a, b) => String(b.archivedAt || b.lastIssuedAt || b.updatedAt || "").localeCompare(String(a.archivedAt || a.lastIssuedAt || a.updatedAt || "")));
}

function reconcileWarehouseAskStockOuts() {
  let changed = false;
  allRequests()
    .filter(req => req.warehouseAsk && !req.issued && !req.stock && !req.done && !req.stockOut)
    .forEach(req => {
      const requestedQty = Number(req.qtyIssued || req.qtyReceived || 1);
      const availableQty = inventoryRemainderForRequest(req);
      if (availableQty < requestedQty) changed = markWarehouseAskStockOut(req, availableQty) || changed;
    });
  return changed;
}

function warehouseFolderArea() {
  return current.selectedWarehouseFolder || current.selectedStockArea || COMMON_WAREHOUSE;
}

function inventoryItemsByArea(area, items = inventoryItems()) {
  return items.filter(item => item.area === area && Number(item.qty || 0) > 0);
}

function buildWarehouseRenderData() {
  const requests = allRequests();
  const warehouseRequests = requests.filter(req => requestVisibleForRole(req, "warehouse"));
  const inventory = inventoryItems();
  const itemsByArea = new Map();
  inventory.forEach(item => {
    const area = item.area || COMMON_WAREHOUSE;
    if (!itemsByArea.has(area)) itemsByArea.set(area, []);
    itemsByArea.get(area).push(item);
  });
  const pendingByArea = new Map();
  warehouseRequests.forEach(req => {
    if (!req.transferredToWarehouse || req.warehouseReceived || req.issued || req.stock || req.done) return;
    const area = req.stockArea || req.area || COMMON_WAREHOUSE;
    pendingByArea.set(area, (pendingByArea.get(area) || 0) + 1);
  });
  return { requests, warehouseRequests, inventory, itemsByArea, pendingByArea };
}

function warehouseFolderStats(area, data = null) {
  const items = data?.itemsByArea?.get(area) || inventoryItemsByArea(area, data?.inventory || inventoryItems());
  const pending = data?.pendingByArea?.get(area) || 0;
  return {
    positions: items.length,
    qty: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    pending
  };
}

function renderWarehouseFolders(selectedArea = warehouseFolderArea(), data = null) {
  return `
    <div class="warehouse-folders">
      ${WAREHOUSE_AREAS.map(area => {
        const stats = warehouseFolderStats(area, data);
        return `
          <button type="button" data-warehouse-folder="${escapeHtml(area)}" class="${area === selectedArea ? "active" : ""} ${stats.pending ? "request-alert" : ""}">
            <span>${escapeHtml(area)}</span>
            <strong>${stats.positions} поз.${stats.pending ? ` · приход ${stats.pending}` : ""}</strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderWarehouseInventory(area = warehouseFolderArea(), canManageWarehouse = false, data = null) {
  const allItems = data?.itemsByArea?.get(area) || inventoryItemsByArea(area, data?.inventory || inventoryItems());
  const q = String(current.warehouseSearch || "").trim().toLowerCase();
  const matchedItems = q ? allItems.filter(item => inventoryMatchesWarehouseSearch(item, q)) : allItems;
  const items = matchedItems.slice(0, WAREHOUSE_RENDER_LIMIT);
  const hiddenCount = Math.max(matchedItems.length - items.length, 0);
  return `
    <div class="warehouse-stock-folder">
      <div class="warehouse-stock-head">
        <strong>Склад: ${escapeHtml(area)}</strong>
        <span>${matchedItems.length ? `Показано ${items.length} из ${matchedItems.length} позиций` : "Пока пусто"}</span>
      </div>
      ${hiddenCount ? `<div class="empty-state">Показаны первые ${WAREHOUSE_RENDER_LIMIT} позиций. Для быстрого перехода напишите название, полку или примечание в поиск.</div>` : ""}
      ${items.length ? items.map(item => {
        const unit = escapeHtml(item.unit || "шт");
        return `
        <div class="warehouse-stock-row ${q && inventoryMatchesWarehouseSearch(item, q) ? "search-hit" : ""}" data-stock-row="${escapeHtml(item.id)}">
          <div>
            <span>${escapeHtml(item.name)}</span>
            <small>Артикул: ${escapeHtml(item.article || "без артикула")}</small>
            <small>Ед. изм.: ${unit}</small>
            ${item.note || item.location ? `<small>Место/примечание: ${escapeHtml(item.note || item.location || "")}</small>` : ""}
            <small>${escapeHtml(item.source || "")}</small>
            <small class="${parseMoneyAmount(item.unitPrice || item.price || item.lastPrice || "") ? "" : "request-alert"}">Цена за 1 ${unit}: ${parseMoneyAmount(item.unitPrice || item.price || item.lastPrice || "") ? escapeHtml(formatMoney(parseMoneyAmount(item.unitPrice || item.price || item.lastPrice || ""))) : "нет цены, складовщик должен добавить"}</small>
            <small>Приход: ${escapeHtml(dateTimeHuman(item.lastReceivedAt || item.updatedAt || ""))}${item.lastStockAt ? ` · В запас: ${escapeHtml(dateTimeHuman(item.lastStockAt))}` : ""}</small>
            <small>Получено: ${Number(item.receivedQty || (Number(item.qty || 0) + Number(item.issuedQty || 0)))} ${unit} · Выдано: ${Number(item.issuedQty || 0)} ${unit} · Осталось: ${Number(item.qty || 0)} ${unit}</small>
          </div>
          <strong>${Number(item.qty || 0)} ${unit}</strong>
          <div class="stock-row-actions">
            <input data-stock-qty="${escapeHtml(item.id)}" type="number" min="0.001" step="0.001" max="${Number(item.qty || 0)}" value="${Math.min(1, Number(item.qty || 0))}">
            ${canManageWarehouse ? `
              <input data-stock-unit="${escapeHtml(item.id)}" type="text" value="${unit}" placeholder="Ед. изм.: кг, м, шт">
              <input data-stock-price="${escapeHtml(item.id)}" type="text" inputmode="decimal" value="${escapeHtml(priceTextFromAmount(parseMoneyAmount(item.unitPrice || item.price || item.lastPrice || "")))}" placeholder="Цена за 1 ед. изм.">
              <button type="button" data-stock-price-lookup="${escapeHtml(item.id)}">Найти цену</button>
              <div class="stock-action-line">
                <select data-stock-target="${escapeHtml(item.id)}">${warehouseOptions(item.area)}</select>
                <button type="button" data-stock-move="${escapeHtml(item.id)}">Перенести</button>
              </div>
              <div class="stock-action-line">
                <select data-stock-recipient="${escapeHtml(item.id)}">${warehouseRecipientOptions()}</select>
                <button type="button" data-stock-issue="${escapeHtml(item.id)}">Выдать сотруднику</button>
              </div>
            ` : `<button type="button" data-stock-ask="${escapeHtml(item.id)}">Спросить</button>`}
          </div>
        </div>
      `;
      }).join("") : `<div class="empty-state">На этом складе пока нет остатков</div>`}
    </div>
  `;
}

function warehouseInstalledRequests() {
  return allRequests()
    .filter(req => req.issued && req.mechanicInstalled)
    .sort((a, b) => String(b.approvals?.install?.at || b.updatedAt || "").localeCompare(String(a.approvals?.install?.at || a.updatedAt || "")));
}

function warehouseInstalledPartsHtml() {
  const installed = warehouseInstalledRequests();
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(installed.length / pageSize));
  current.warehouseInstalledArchivePage = Math.min(Math.max(1, Number(current.warehouseInstalledArchivePage || 1)), pages);
  const start = (current.warehouseInstalledArchivePage - 1) * pageSize;
  const pageItems = installed.slice(start, start + pageSize);
  const rows = pageItems.map(req => {
    const items = requestItems(req);
    const names = items.length
      ? items.map(item => `${item.name || req.text || "Запчасть"}${item.article ? ` (${item.article})` : ""}`).join(", ")
      : `${partNameFromRequest(req)}${partArticleFromRequest(req) ? ` (${partArticleFromRequest(req)})` : ""}`;
    const qty = Number(req.qtyInstalled || req.aggregateInstalledQty || req.qtyIssued || 0);
    const issuedAt = req.approvals?.warehouse?.at || req.warehouseReceivedAt || req.createdAt || "";
    const installedAt = req.approvals?.install?.at || req.updatedAt || "";
    return `
      <article class="warehouse-installed-row">
        <div class="warehouse-installed-part"><strong>${escapeHtml(names)}</strong><span>${qty} ${escapeHtml(items[0]?.unit || "шт")}</span></div>
        <div><small>Кто взял</small><strong>${escapeHtml(req.issueTargetName || "Получатель не указан")}</strong><span>${escapeHtml(requestRoleLabel(warehouseIssueTargetRole(req)))}</span></div>
        <div><small>Куда установил</small><strong>${escapeHtml(req.equipment || "Оборудование не указано")}</strong><span>${escapeHtml(req.node || "Узел не указан")}</span></div>
        <div><small>Даты</small><span>Выдано: ${escapeHtml(dateTimeHuman(issuedAt))}</span><span>Установлено: ${escapeHtml(dateTimeHuman(installedAt))}</span></div>
        <div class="warehouse-installed-comment"><small>Комментарий установки</small><span>${escapeHtml(req.installComment || "Без комментария")}</span></div>
      </article>
    `;
  }).join("");
  return `<section class="warehouse-installed-parts">
    <div class="warehouse-installed-head"><div><strong>Архив установленных запчастей</strong><span>${installed.length} записей · страница ${current.warehouseInstalledArchivePage} из ${pages}</span></div><button type="button" data-print-warehouse-installed ${installed.length ? "" : "disabled"}>Печатать весь список</button></div>
    <div class="warehouse-installed-list">${rows || `<div class="empty-state">Подтверждённых установок пока нет</div>`}</div>
    ${pages > 1 ? `<div class="warehouse-archive-pages"><button type="button" data-installed-page="${current.warehouseInstalledArchivePage - 1}" ${current.warehouseInstalledArchivePage <= 1 ? "disabled" : ""}>← Назад</button><button type="button" data-installed-page="${current.warehouseInstalledArchivePage + 1}" ${current.warehouseInstalledArchivePage >= pages ? "disabled" : ""}>Далее →</button></div>` : ""}
  </section>`;
}

function warehouseZeroArchiveHtml() {
  const all = zeroInventoryItems();
  const pageSize = 50;
  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  current.warehouseZeroArchivePage = Math.min(Math.max(1, Number(current.warehouseZeroArchivePage || 1)), pages);
  const start = (current.warehouseZeroArchivePage - 1) * pageSize;
  const rows = all.slice(start, start + pageSize).map(item => `<div class="warehouse-stock-row"><div><span>${escapeHtml(item.name)}</span><small>Артикул: ${escapeHtml(item.article || "без артикула")}</small><small>Склад: ${escapeHtml(item.area || COMMON_WAREHOUSE)} · Выдано всего: ${Number(item.issuedQty || 0)} ${escapeHtml(item.unit || "шт")}</small><small>Закончилась: ${escapeHtml(dateTimeHuman(item.archivedAt || item.lastIssuedAt || item.updatedAt || ""))}</small></div><strong>0 ${escapeHtml(item.unit || "шт")}</strong></div>`).join("");
  return `<section class="warehouse-installed-parts"><div class="warehouse-installed-head"><div><strong>Архив нулевых остатков</strong><span>${all.length} позиций · страница ${current.warehouseZeroArchivePage} из ${pages}</span></div></div><div class="warehouse-installed-list">${rows || `<div class="empty-state">Нулевых остатков нет</div>`}</div>${pages > 1 ? `<div class="warehouse-archive-pages"><button type="button" data-zero-page="${current.warehouseZeroArchivePage - 1}" ${current.warehouseZeroArchivePage <= 1 ? "disabled" : ""}>← Назад</button><button type="button" data-zero-page="${current.warehouseZeroArchivePage + 1}" ${current.warehouseZeroArchivePage >= pages ? "disabled" : ""}>Далее →</button></div>` : ""}</section>`;
}

function printWarehouseInstalledParts() {
  const installed = warehouseInstalledRequests();
  if (!installed.length) return;
  const rows = installed.map((req, index) => {
    const item = requestItems(req)[0] || {};
    const quantity = Number(req.qtyInstalled || req.aggregateInstalledQty || req.qtyIssued || 0);
    return `<tr><td>${index + 1}</td><td>${escapeHtml(partNameFromRequest(req))}</td><td>${escapeHtml(partArticleFromRequest(req))}</td><td>${quantity} ${escapeHtml(item.unit || "шт")}</td><td>${escapeHtml(req.issueTargetName || "-")}</td><td>${escapeHtml(requestRoleLabel(warehouseIssueTargetRole(req)))}</td><td>${escapeHtml(req.equipment || "-")}</td><td>${escapeHtml(req.node || "-")}</td><td>${escapeHtml(req.installComment || "-")}</td><td>${escapeHtml(dateTimeHuman(req.approvals?.install?.at || req.updatedAt || ""))}</td></tr>`;
  }).join("");
  const win = window.open("", "_blank", "width=1200,height=850");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Архив установленных запчастей</title><style>@page{size:A4 landscape;margin:8mm}body{font-family:Arial,sans-serif;color:#111827}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #9ca3af;padding:5px;font-size:9px;text-align:left;vertical-align:top}th{background:#14324a;color:#fff}.actions{text-align:center;margin:12px}button{border:0;border-radius:7px;background:#14324a;color:#fff;padding:10px 18px;font-weight:700}@media print{.actions{display:none}}</style></head><body><h1>Архив установленных запчастей</h1><p>Сформировано: ${escapeHtml(new Date().toLocaleString("ru-RU"))}</p><table><thead><tr><th>№</th><th>Запчасть</th><th>Артикул</th><th>Кол-во</th><th>Кто взял</th><th>Роль</th><th>Оборудование</th><th>Узел</th><th>Комментарий</th><th>Установлено</th></tr></thead><tbody>${rows}</tbody></table><div class="actions"><button onclick="window.print()">Печатать / PDF</button></div></body></html>`);
  win.document.close();
}

function pendingWarehouseReceipts(area = warehouseFolderArea(), warehouseRequests = null) {
  const q = String(current.warehouseSearch || "").trim();
  return (warehouseRequests || allRequests().filter(req => requestVisibleForRole(req, "warehouse")))
    .filter(req => req.transferredToWarehouse && !req.warehouseReceived && !req.warehouseAsk && !req.issued && !req.stock && !req.done)
    .filter(req => (req.stockArea || req.area || COMMON_WAREHOUSE) === area)
    .filter(req => requestMatchesWarehouseSearch(req, q))
    .sort((a, b) => String(b.updatedAt || b.createdAt || b.date).localeCompare(String(a.updatedAt || a.createdAt || a.date)));
}

function pendingWarehouseAsks(warehouseRequests = null) {
  const q = String(current.warehouseSearch || "").trim();
  return (warehouseRequests || allRequests().filter(req => requestVisibleForRole(req, "warehouse")))
    .filter(req => req.warehouseAsk && !req.issued && !req.stock && !req.done)
    .filter(req => requestMatchesWarehouseSearch(req, q))
    .sort((a, b) => String(b.updatedAt || b.createdAt || b.date).localeCompare(String(a.updatedAt || a.createdAt || a.date)));
}

function needsWarehouseNoInvoiceConfirmation(req) {
  return false;
}

function pendingWarehouseConfirmations() {
  return [];
}

function addInventory(area, name, qty, source = "", meta = {}) {
  state.inventory ||= {};
  const cleanArea = area || "Общий склад";
  const cleanName = String(name || "").trim();
  const amount = Number(qty || 0);
  if (!cleanName || amount <= 0) return null;
  const article = ensureInventoryArticle(cleanArea, cleanName, meta.article);
  const id = inventoryKey(cleanArea, cleanName, article);
  const now = new Date().toISOString();
  const old = state.inventory[id] || { id, area: cleanArea, name: cleanName, article, qty: 0, source: "", unit: "шт" };
  const newPrice = parseMoneyAmount(meta.price || meta.unitPrice || "");
  const oldPrice = parseMoneyAmount(old.unitPrice || old.price || old.lastPrice || "");
  const nextReceivedQty = Number(old.receivedQty || (Number(old.qty || 0) + Number(old.issuedQty || 0))) + amount;
  const nextUnitPrice = newPrice > 0
    ? oldPrice > 0 && Number(old.receivedQty || 0) > 0
      ? ((oldPrice * Number(old.receivedQty || 0)) + (newPrice * amount)) / Math.max(nextReceivedQty, 1)
      : newPrice
    : oldPrice;
  state.inventory[id] = {
    ...old,
    area: cleanArea,
    name: cleanName,
    article,
    unit: String(meta.unit || old.unit || "шт").trim(),
    qty: Number(old.qty || 0) + amount,
    archivedAt: "",
    receivedQty: nextReceivedQty,
    issuedQty: Number(old.issuedQty || 0),
    source: source || old.source || "",
    note: String(meta.note || old.note || "").trim(),
    location: String(meta.location || old.location || "").trim(),
    price: nextUnitPrice ? priceTextFromAmount(nextUnitPrice) : (old.price || ""),
    unitPrice: nextUnitPrice || 0,
    lastPrice: newPrice || old.lastPrice || "",
    firstReceivedAt: old.firstReceivedAt || now,
    lastReceivedAt: now,
    lastStockAt: meta.stockAt || old.lastStockAt || "",
    updatedAt: now
  };
  return state.inventory[id];
}

function removeInventory(area, name, qty, countIssued = false, article = "") {
  state.inventory ||= {};
  const id = inventoryKey(area || "Общий склад", name, article);
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
  if (item.qty <= 0) {
    item.qty = 0;
    item.archivedAt = item.updatedAt;
  }
  return removed;
}

function updateInventoryUnitPrice(item, price) {
  if (!item) return 0;
  const amount = parseMoneyAmount(price);
  if (amount <= 0) return 0;
  item.unitPrice = amount;
  item.price = priceTextFromAmount(amount);
  item.lastPrice = item.price;
  item.priceUpdatedAt = new Date().toISOString();
  item.priceUpdatedBy = profile?.name || "";
  item.updatedAt = item.priceUpdatedAt;
  return amount;
}

function ensureInventoryPriceForOperation(item, priceInput, message = "Укажите цену за 1 единицу измерения. Без цены складская операция запрещена.") {
  if (!item) return 0;
  const typedPrice = parseMoneyAmount(priceInput?.value ?? priceInput ?? "");
  const currentPrice = parseMoneyAmount(item.unitPrice || item.price || item.lastPrice || "");
  if (typedPrice > 0) return updateInventoryUnitPrice(item, typedPrice);
  if (currentPrice > 0) return currentPrice;
  window.alert(message);
  if (priceInput?.focus) priceInput.focus();
  return 0;
}

function createMechanicIssueFromInventory(item, qty, targetRole = "mechanic") {
  const amount = Number(qty || 0);
  if (!item || amount <= 0) return false;
  const cleanTargetRole = canReceiveWarehouseIssue(targetRole) ? targetRole : "mechanic";
  const removed = removeInventory(item.area, item.name, amount, true, item.article);
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
    article: item.article || "",
    items: [{
      number: 1,
      name: item.name,
      article: item.article || "",
      stockRemainder: "",
      unit: item.unit || "шт",
      requestedQty: issuedAmount,
      requiredQty: issuedAmount,
      note: item.note || ""
    }],
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
    article: item.article || "",
    items: [{
      number: 1,
      name: item.name,
      article: item.article || "",
      stockRemainder: "",
      unit: item.unit || "шт",
      requestedQty: askedAmount,
      requiredQty: askedAmount,
      note: item.note || ""
    }],
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
    stockOut: false,
    stockOutAcknowledged: false,
    stockOutAt: "",
    stockOutReason: "",
    stockOutNotifyRole: "",
    stockOutRecipientMissing: false,
    stockOutRequestedQty: 0,
    stockOutAvailableQty: 0,
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
    sourceRole: profile.role,
    sourceName: profile.name || "",
    sourceKey: profileKey(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return true;
}

function createManualWarehouseRequest(area, name, qty, note, article = "", unit = "шт", price = "") {
  const cleanName = String(name || "").trim();
  const cleanUnit = String(unit || "шт").trim() || "шт";
  const amount = Number(qty || 0);
  if (!cleanName || amount <= 0) return null;
  const cleanArticle = ensureInventoryArticle(area || COMMON_WAREHOUSE, cleanName, article);
  const cleanPrice = priceTextFromAmount(parseMoneyAmount(price));
  if (!cleanPrice) return null;
  const id = `manual-warehouse:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  state.requests ||= {};
  state.requests[id] = {
    id,
    equipmentId: "",
    nodeIndex: "",
    date: todayISO(),
    kind: "manual",
    equipment: "Приход на склад",
    area: area || COMMON_WAREHOUSE,
    node: note || "Добавлено складовщиком",
    comment: note || "Добавление на склад",
    text: cleanName,
    article: cleanArticle,
    items: [{
      number: 1,
      name: cleanName,
      article: cleanArticle,
      stockRemainder: "",
      unit: cleanUnit,
      requestedQty: amount,
      requiredQty: amount,
      note: note || ""
    }],
    price: "",
    warehouseUnitPrice: cleanPrice,
    supplier: "Добавлено складовщиком",
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

function inventoryUnitOptions(selected = "шт") {
  const units = ["шт", "кг", "м", "л", "комплект", "упаковка", "рулон"];
  return units.map(unit => `<option value="${unit}" ${unit === selected ? "selected" : ""}>${unit}</option>`).join("");
}

function warehouseRecipientOptions(selectedRole = "mechanic", selectedPhone = "") {
  const users = loadUsers()
    .filter(user => user.approved !== false && user.pendingApproval !== true && canReceiveWarehouseIssue(user.role))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru"));
  return `<option value="">Выберите сотрудника</option>${users.map(user => `<option value="${escapeHtml(user.phone || user.id || user.employeeId || user.name || "")}" data-role="${escapeHtml(user.role || selectedRole)}" data-name="${escapeHtml(user.name || "")}" data-phone="${escapeHtml(user.phone || "")}" ${(selectedPhone && String(user.phone || "") === String(selectedPhone)) ? "selected" : ""}>${escapeHtml(user.name || "Без имени")} · ${escapeHtml(requestRoleLabel(user.role))}${user.area ? ` · ${escapeHtml(user.area)}` : ""}</option>`).join("")}`;
}

function requestMatchesWarehouseSearch(req, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const itemText = requestItems(req).map(item => [item.name, item.article, item.note, item.stockRemainder].join(" ")).join(" ");
  const text = [
    req.text,
    req.article,
    itemText,
    req.equipment,
    req.node,
    req.comment,
    req.area,
    req.stockArea,
    req.supplier
  ].join(" ").toLowerCase();
  return text.includes(q);
}

function inventoryMatchesWarehouseSearch(item, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return [
    item?.name,
    item?.article,
    item?.source,
    item?.area,
    item?.note,
    item?.location
  ].join(" ").toLowerCase().includes(q);
}

function firstWarehouseSearchHit(query) {
  const q = String(query || "").trim();
  if (!q) return null;
  const stockHit = inventoryItems().find(item => inventoryMatchesWarehouseSearch(item, q));
  if (stockHit) return { type: "stock", area: stockHit.area, id: stockHit.id };
  const requestHit = allRequests()
    .filter(req => requestVisibleForRole(req, "warehouse"))
    .find(req => requestMatchesWarehouseSearch(req, q));
  if (requestHit) return { type: "request", area: requestHit.stockArea || requestHit.area || COMMON_WAREHOUSE, id: requestHit.id };
  return null;
}

function requestMatchesFilters(req) {
  const query = String(current.requestSearch || "").trim().toLowerCase();
  if (query) {
    const itemText = requestItems(req).map(item => [item.name, item.article, item.note, item.stockRemainder].join(" ")).join(" ");
    const searchable = [
      req.requestNumber, req.text, itemText, req.comment, req.area, req.equipment,
      req.node, req.supplier, req.issueTargetName, statusText(req.status)
    ].join(" ").toLowerCase();
    if (!searchable.includes(query)) return false;
  }
  if (current.requestPriority && req.priority !== current.requestPriority) return false;
  if (current.requestRoute && req.route !== current.requestRoute) return false;
  if (current.requestDue && (!req.dueDate || req.dueDate > current.requestDue)) return false;
  return true;
}

function requestRoleCounts() {
  if (MANUAL_REQUEST_WORKFLOW) {
    const counts = { all: 0, shop: 0, engineer: 0, warehouse: 0, mechanic: 0, electrician: 0, operator: 0, productionDirector: 0 };
    allRequests().forEach(req => {
      for (const role of ["shop", "engineer", "mechanic", "electrician", "operator"]) {
        if (issuedWarehouseItemVisibleToProfile(req, role) || stockOutVisibleToProfile(req, role)) counts[role] += 1;
      }
    });
    return counts;
  }
  const all = allRequests();
  const roles = ["shop", "engineer", "warehouse", "mechanic", "electrician", "operator", "productionDirector"];
  const counts = { all: all.filter(req => requestVisibleForRole(req, "all")).length };
  roles.forEach(role => {
    counts[role] = all.filter(req => requestVisibleForRoleIndicator(req, role) && requestNeedsRole(req, role)).length;
  });
  return counts;
}

function updateRoleBadges() {
  const counts = requestRoleCounts();
  document.querySelectorAll("[data-open-role], .request-tabs .tab[data-role]").forEach(button => {
    const role = button.dataset.openRole || button.dataset.role;
    const quickButton = Boolean(button.dataset.openRole);
    const canEnter = canOpenRequestRole(role);
    button.hidden = quickButton ? !canSeeRequestRoleIndicator(role) : !canEnter;
    const waiting = counts[role] || 0;
    const label = requestRoleLabel(role);
    button.innerHTML = `<span>${label}</span><strong>${waiting}</strong>`;
    button.classList.toggle("indicator-only", quickButton && !canEnter);
    button.classList.toggle("request-alert", waiting > 0 && role !== "all");
    button.classList.toggle("has-count", waiting > 0);
    button.setAttribute("aria-disabled", quickButton && !canEnter ? "true" : "false");
  });
  const ownRole = defaultRequestRole();
  const ownWaiting = counts[ownRole] || 0;
  document.querySelector('[data-mobile-view="requests"]')?.classList.toggle("request-alert", ownWaiting > 0);
  updateTmcRequestButtonLabels();
  renderEngineerIncomingBanner();
  if (ui.createTmcRequestButton) ui.createTmcRequestButton.hidden = !canEditChecklist();
  if (ui.workerRatingButton) ui.workerRatingButton.hidden = !canOpenView("workerRating");
  if (ui.engineerReportButton) ui.engineerReportButton.hidden = profile?.role !== "engineer";
}

function getRequestKindById(id) {
  const [equipmentId, nodeIndex, date, kind] = id.split(":");
  return record(Number(equipmentId), Number(nodeIndex), date)[kind];
}

function syncRequestToRecord(req) {
  state.requests ||= {};
  normalizeRequest(req);
  const previousStatus = req.history?.at(-1)?.status || "";
  setRequestStatus(req);
  req.status = req.requestStatus || req.status || "shop";
  if (req.status !== previousStatus) requestAddHistory(req, statusText(req.status));
  req.updatedAt = new Date().toISOString();
  state.requests[req.id] = req;
  if (
    String(req.id || "").startsWith("stock-issue:")
    || String(req.id || "").startsWith("warehouse-ask:")
    || String(req.id || "").startsWith("manual-warehouse:")
    || String(req.id || "").includes(":req:")
  ) return;
  const kind = getRequestKindById(req.id);
  kind.request = req.text;
  kind.items = requestItems(req);
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
  kind.productionDirectorRequestApproved = req.productionDirectorRequestApproved;
  kind.financePreApproved = req.financePreApproved;
  kind.supplyPrepared = req.supplyPrepared;
  kind.financeApproved = req.financeApproved;
  kind.cashApproved = req.cashApproved;
  kind.transferredToWarehouse = req.transferredToWarehouse;
  kind.warehouseReceived = req.warehouseReceived;
  kind.issued = req.issued;
  kind.stockOut = Boolean(req.stockOut);
  kind.stockOutAcknowledged = Boolean(req.stockOutAcknowledged);
  kind.stockOutAt = req.stockOutAt || "";
  kind.stockOutReason = req.stockOutReason || "";
  kind.stockOutNotifyRole = req.stockOutNotifyRole || "";
  kind.stockOutRecipientMissing = Boolean(req.stockOutRecipientMissing);
  kind.stockOutRequestedQty = Number(req.stockOutRequestedQty || 0);
  kind.stockOutAvailableQty = Number(req.stockOutAvailableQty || 0);
  kind.requestedTargetRole = req.requestedTargetRole || "";
  kind.issueTargetRole = req.issueTargetRole || (req.issued ? "mechanic" : "");
  kind.issueTargetName = req.issueTargetName || "";
  kind.issueTargetPhone = req.issueTargetPhone || "";
  kind.installComment = req.installComment || "";
  kind.aggregateRemarkKey = req.aggregateRemarkKey || "";
  kind.mechanicInstalled = req.mechanicInstalled;
  kind.shopInstallApproved = req.shopInstallApproved;
  kind.productionDirectorApproved = req.productionDirectorApproved;
  kind.approvalResponsibilityDeclines = req.approvalResponsibilityDeclines || {};
  kind.installResponsibilityDeclines = req.installResponsibilityDeclines || {};
  kind.accountingWrittenOff = req.accountingWrittenOff;
  kind.done = req.done;
  kind.stock = req.stock;
  kind.qtyReceived = Number(req.qtyReceived || 0);
  kind.qtyIssued = Number(req.qtyIssued || 0);
  kind.aggregateInstalledQty = Number(req.aggregateInstalledQty || 0);
  kind.stockArea = req.stockArea || "";
  kind.inventoryAddedQty = Number(req.inventoryAddedQty || 0);
  kind.inventoryAddedItems = req.inventoryAddedItems || {};
  kind.requestNumber = req.requestNumber || "";
  kind.route = req.route || "purchase";
  kind.priority = req.priority || "normal";
  kind.dueDate = req.dueDate || "";
  kind.requestedQty = Number(req.requestedQty || 1);
  kind.qtyPurchased = Number(req.qtyPurchased || 0);
  kind.qtyAccepted = Number(req.qtyAccepted || 0);
  kind.qtyInstalled = Number(req.qtyInstalled || 0);
  kind.returnedTo = req.returnedTo || "";
  kind.returnReason = req.returnReason || "";
  kind.rejected = Boolean(req.rejected);
  kind.rejectionReason = req.rejectionReason || "";
  kind.sourceRole = req.sourceRole || "";
  kind.sourceName = req.sourceName || "";
  kind.sourceKey = req.sourceKey || "";
  kind.additionalPhotos = Array.isArray(req.additionalPhotos) ? req.additionalPhotos : [];
  kind.approvals = req.approvals && typeof req.approvals === "object" ? req.approvals : {};
  kind.history = Array.isArray(req.history) ? req.history : [];
  if (req.done || req.stock) kind.resolved = true;
}

function setRequestStatus(reqKind) {
  if (reqKind.rejected && reqKind.returnedTo) reqKind.requestStatus = reqKind.returnedTo;
  else if (reqKind.rejected) reqKind.requestStatus = "rejected";
  else if (reqKind.returnedTo) reqKind.requestStatus = reqKind.returnedTo;
  else if (reqKind.stock) reqKind.requestStatus = "stock";
  else if (reqKind.done) reqKind.requestStatus = "done";
  else if (MANUAL_REQUEST_WORKFLOW) reqKind.requestStatus = "manual";
  else if (reqKind.accountingWrittenOff) reqKind.requestStatus = "done";
  else if (requestReadyForAccounting(reqKind)) reqKind.requestStatus = "accounting";
  else if (requestWaitingForProductionDirector(reqKind)) reqKind.requestStatus = "productionDirector";
  else if (requestIssuedToWorker(reqKind) && reqKind.mechanicInstalled) reqKind.requestStatus = "waitingShopDone";
  else if (reqKind.issued) reqKind.requestStatus = "issued";
  else if (reqKind.warehouseReceived) reqKind.requestStatus = "warehouse";
  else if (reqKind.transferredToWarehouse) reqKind.requestStatus = "waitingWarehouse";
  else if (reqKind.cashApproved) reqKind.requestStatus = "cashApproved";
  else if (reqKind.financeApproved) reqKind.requestStatus = "cash";
  else if (reqKind.supplyPrepared) reqKind.requestStatus = "finance";
  else if (requestReadyForSupply(reqKind)) reqKind.requestStatus = "supply";
  else if (requestWaitingForFinancePreApproval(reqKind)) reqKind.requestStatus = "financePre";
  else if (requestWaitingForProductionDirectorInitial(reqKind)) reqKind.requestStatus = "productionDirector";
  else if (reqKind.route === "stock" && reqKind.shopApproved) reqKind.requestStatus = "warehouse";
  else if (reqKind.shopApproved && requestRequiresEngineerApproval(reqKind)) reqKind.requestStatus = "engineer";
  else reqKind.requestStatus = "shop";
}

function requestWaitingForShopInitial(req) {
  return !req.issued && !req.shopApproved && !req.done && !req.stock;
}

function requestWaitingForInstallApproval(req) {
  return req.mechanicInstalled
    && !req.shopInstallApproved
    && !req.productionDirectorApproved
    && !req.done
    && !req.stock;
}

function requestWaitingForEngineerInitial(req) {
  return req.route !== "stock"
    && requestRequiresEngineerApproval(req)
    && req.shopApproved
    && !req.engineerApproved
    && !req.productionDirectorRequestApproved
    && !req.done
    && !req.stock;
}

function requestWaitingForSupplyPrepare(req) {
  return requestReadyForSupply(req);
}

function requestWaitingForSupplyWarehouse(req) {
  return req.cashApproved && !req.transferredToWarehouse && !req.done && !req.stock;
}

function requestFinanciallyLocked(req) {
  return Boolean(req.financeApproved || req.cashApproved || req.transferredToWarehouse || req.warehouseReceived || req.issued || req.done || req.stock);
}

function requestWaitingForWarehouse(req) {
  return (req.transferredToWarehouse || (req.route === "stock" && req.shopApproved)) && !req.issued && !req.stock && !req.done;
}

function statusText(status) {
  if (status === "stock") return "В запасе";
  return {
    created: "Создана",
    manual: "Ручной обход",
    shop: "Ожидает начальника цеха",
    engineer: "Ожидает инженера",
    financePre: "Ручное согласование",
    supply: "Ручное согласование",
    finance: "Ручное согласование",
    financeApproved: "Ручное согласование",
    cash: "Ручное согласование",
    cashApproved: "Ручное согласование",
    waitingWarehouse: "Передано складовщику",
    warehouse: "У складовщика",
    issued: "Выдано сотруднику",
    waitingShopDone: "Ждёт подтверждения установки",
    productionDirector: "Ждёт директора производства",
    accounting: "Ждёт ответственного",
    stockOut: "Запас закончился",
    rejected: "Отклонено",
    done: "Выполнено"
  }[status] || status;
}

function requestRouteLabel(route) {
  if (MANUAL_REQUEST_WORKFLOW) return "Ручная заявка";
  return route === "stock" ? "Со склада" : "Закупка";
}

function requestPriorityLabel(priority) {
  return {
    normal: "Обычная",
    urgent: "Срочная",
    emergency: "Аварийная"
  }[priority] || "Обычная";
}

function requestIsOverdue(req) {
  return window.PPRModules.requests.overdue(req, todayISO());
}

function requestStageItems(req) {
  if (MANUAL_REQUEST_WORKFLOW) {
    return [
      { key: "created", label: "Создана", done: true, current: false },
      { key: "print", label: "Печать", done: false, current: false },
      { key: "manual", label: "Ручной обход", done: false, current: !req.done && !req.stock }
    ];
  }
  const purchase = [
    ["shop", "Начальник цеха"],
    ["engineer", "Инженер"],
    ["productionDirectorRequest", "Директор производства"],
    ["financePre", "Ручное согласование"],
    ["supply", "Ручное согласование"],
    ["finance", "Ручное согласование"],
    ["cash", "Ручное согласование"],
    ["warehouse", "Складовщик"],
    ["recipient", "Получатель"],
    ["install", "Установка"],
    ["productionDirector", "Подтверждение"],
    ["accounting", "Ответственный"]
  ];
  const stock = [
    ["shop", "Начальник цеха"],
    ["warehouse", "Складовщик"],
    ["recipient", "Получатель"],
    ["install", "Установка"],
    ["productionDirector", "Подтверждение"],
    ["accounting", "Ответственный"]
  ];
  const done = {
    shop: Boolean(req.shopApproved),
    engineer: Boolean(req.engineerApproved),
    productionDirectorRequest: Boolean(req.productionDirectorRequestApproved),
    financePre: Boolean(req.financePreApproved),
    supply: Boolean(req.supplyPrepared),
    finance: Boolean(req.financeApproved),
    cash: Boolean(req.cashApproved),
    warehouse: Boolean(req.warehouseReceived || req.issued),
    recipient: Boolean(req.issued),
    install: Boolean(req.mechanicInstalled),
    productionDirector: Boolean(req.shopInstallApproved || req.productionDirectorApproved),
    accounting: Boolean(req.accountingWrittenOff || req.done)
  };
  const currentRole = waitingRole(req);
  const routeStages = req.route === "stock" ? stock : purchase;
  return routeStages.map(([key, label]) => ({
    key,
    label,
    done: done[key],
    current: !req.done && !req.stock && (
      currentRole === key
      || (currentRole === "productionDirector" && key === "productionDirectorRequest" && !req.mechanicInstalled)
      || (currentRole === "financePre" && key === "financePre")
      || (currentRole === "confirmInstall" && key === "productionDirector")
      || (["mechanic", "electrician", "operator", "shop", "engineer"].includes(currentRole) && req.issued && key === "recipient")
    )
  }));
}

function requestStageHtml(req) {
  return `<div class="request-stage-line" aria-label="Этапы заявки">${requestStageItems(req).map(stage =>
    `<span class="${[stage.done ? "done" : "", stage.current ? "current" : ""].filter(Boolean).join(" ")}">${stage.done ? "✓ " : ""}${stage.label}</span>`
  ).join("")}</div>`;
}

function requestQuantityHtml(req) {
  const requested = Number(req.requestedQty || 0);
  const purchased = Number(req.qtyPurchased || req.qtyReceived || 0);
  const accepted = Number(req.qtyAccepted || (req.warehouseReceived ? req.qtyReceived : 0) || 0);
  const issued = Number(req.qtyIssued || 0);
  const installed = Number(req.qtyInstalled || req.aggregateInstalledQty || 0);
  const balance = Math.max(accepted - issued, 0);
  return `
    <div class="request-qty-grid">
      <span><small>Запрошено</small><strong>${requested}</strong></span>
      <span><small>Закуплено</small><strong>${purchased}</strong></span>
      <span><small>Принято</small><strong>${accepted}</strong></span>
      <span><small>Выдано</small><strong>${issued}</strong></span>
      <span><small>Установлено</small><strong>${installed}</strong></span>
      <span><small>Остаток</small><strong>${balance}</strong></span>
    </div>
  `;
}

function requestHistoryHtml(req) {
  const history = Array.isArray(req.history) ? req.history.slice().reverse() : [];
  return `
    <details class="request-history">
      <summary>История действий (${history.length})</summary>
      <ol>${history.map(entry => `
        <li>
          <strong>${escapeHtml(entry.action || "Изменение")}</strong>
          ${entry.name || entry.role ? ` — ${escapeHtml(entry.name || requestRoleLabel(entry.role))}` : ""}
          <time>${dateTimeHuman(entry.at)}</time>
          ${entry.details ? `<div>${escapeHtml(entry.details)}</div>` : ""}
        </li>
      `).join("")}</ol>
    </details>
  `;
}

function requestRecordApproval(req, key, label) {
  req.approvals ||= {};
  req.approvals[key] = {
    label,
    at: new Date().toISOString(),
    name: profile?.name || "Сотрудник",
    role: profile?.role || ""
  };
  requestAddHistory(req, label, `Подтвердил: ${profile?.name || requestRoleLabel(profile?.role || "")}`);
}

function requestApprovalsHtml(req) {
  const definitions = [
    ["shop", "Подтверждено начальником цеха", "Ожидает инженера"],
    ["engineer", "Подтверждено инженером", "Ожидает директора производства"],
    ["productionDirectorRequest", "Заявка подтверждена директором производства", "Ручное согласование"],
    ["financePre", "Ручное согласование", "Ручное согласование"],
    ["supply", "Ручное согласование", "Ручное согласование"],
    ["finance", "Ручное согласование", "Ручное согласование"],
    ["cash", "Ручное согласование", "Ручное согласование"],
    ["warehouse", "Выдано складовщиком", "Выдано сотруднику"],
    ["install", "Установка выполнена", "Ждёт подтверждения установки"],
    ["installApproval", "Установка подтверждена", "Ждёт директора производства"],
    ["productionDirector", "Подтверждено директором производства", "Ждёт ответственного"],
    ["accounting", "Списано", "Выполнено"]
  ];
  const approvals = req.approvals && typeof req.approvals === "object" ? req.approvals : {};
  const history = Array.isArray(req.history) ? req.history : [];
  const entries = definitions.map(([key, label, legacyAction]) => {
    if (approvals[key]) return approvals[key];
    const old = history.slice().reverse().find(entry => entry?.name && entry.action === legacyAction);
    return old ? { label, at: old.at, name: old.name, role: old.role } : null;
  }).filter(Boolean);
  if (!entries.length) return "";
  return `
    <div class="request-approvals">
      <strong>Кто подтвердил</strong>
      <div>${entries.map(entry => `
        <span>
          <b>✓ ${escapeHtml(entry.label || "Подтверждено")}</b>
          ${escapeHtml(entry.name || requestRoleLabel(entry.role || ""))}
          <time>${dateTimeHuman(entry.at)}</time>
        </span>
      `).join("")}</div>
    </div>
  `;
}

function cloneRequestForFinanceItems(req, selectedItems) {
  const now = new Date().toISOString();
  const childId = `finance-split:${todayISO()}:req:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  const child = normalizeRequest({
    ...req,
    id: childId,
    requestNumber: `${req.requestNumber || requestNumberFromId(req)}-${Object.keys(state.requests || {}).length + 1}`,
    items: selectedItems,
    text: requestItemsText(selectedItems),
    requestedQty: requestItemsTotal(selectedItems) || 1,
    qtyReceived: requestItemsTotal(selectedItems) || 1,
    qtyPurchased: requestItemsTotal(selectedItems) || 1,
    qtyAccepted: 0,
    qtyIssued: 0,
    aggregateInstalledQty: 0,
    qtyInstalled: 0,
    financeApproved: true,
    cashApproved: false,
    transferredToWarehouse: false,
    warehouseReceived: false,
    issued: false,
    mechanicInstalled: false,
    shopInstallApproved: false,
    productionDirectorApproved: false,
    accountingWrittenOff: false,
    done: false,
    stock: false,
    status: "cash",
    returnedTo: "",
    returnReason: "",
    parentRequestId: req.id,
    parentRequestNumber: req.requestNumber || "",
    createdAt: req.createdAt || now,
    updatedAt: now,
    history: [...(Array.isArray(req.history) ? req.history : []), {
      at: now,
      action: "Выбраны позиции к оплате",
      details: requestItemsText(selectedItems),
      status: "cash",
      role: profile?.role || "",
      name: profile?.name || ""
    }],
    approvals: {
      ...(req.approvals || {}),
      finance: {
        label: "Подтверждено вручную",
        at: now,
        name: profile?.name || "Ответственный",
        role: profile?.role || "finance"
      }
    }
  });
  applyRequestItems(child, selectedItems);
  return child;
}

function approveFinanceItems(req, selectedIndexes) {
  const items = requestItems(req);
  const selected = [...new Set(selectedIndexes)].filter(index => index >= 0 && index < items.length);
  if (!selected.length) return { ok: false, message: "Выберите хотя бы одну позицию для оплаты." };
  const selectedItems = items.filter((_, index) => selected.includes(index));
  const remainingItems = items.filter((_, index) => !selected.includes(index));
  const now = new Date().toISOString();
  if (!remainingItems.length) {
    req.financeApproved = true;
    req.status = "cash";
    req.qtyReceived = requestItemsTotal(selectedItems) || req.qtyReceived || req.requestedQty || 1;
    req.qtyPurchased = req.qtyReceived;
    requestRecordApproval(req, "finance", "Подтверждено вручную");
    requestAddHistory(req, "Выбраны к оплате все позиции", requestItemsText(selectedItems));
    clearRequestReturn(req);
    syncRequestToRecord(req);
    saveState();
    return { ok: true, split: false };
  }
  const child = cloneRequestForFinanceItems(req, selectedItems);
  state.requests[child.id] = child;
  applyRequestItems(req, remainingItems);
  req.financeApproved = false;
  req.cashApproved = false;
  req.status = "finance";
  req.updatedAt = now;
  req.history ||= [];
  req.history.push({
    at: now,
    action: "Часть позиций отправлена на оплату",
    details: requestItemsText(selectedItems),
    status: "finance",
    role: profile?.role || "",
    name: profile?.name || ""
  });
  syncRequestToRecord(req);
  syncRequestToRecord(child);
  saveState();
  return { ok: true, split: true, child };
}

function clearRequestReturn(req) {
  req.returnedTo = "";
  req.returnReason = "";
}

function returnRequestTo(req, targetRole, reason) {
  if (req.cashApproved) return false;
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) return false;
  const resetFrom = {
    shop: ["shopApproved", "engineerApproved", "productionDirectorRequestApproved", "financePreApproved", "supplyPrepared", "financeApproved", "cashApproved", "transferredToWarehouse", "warehouseReceived", "issued", "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    engineer: ["engineerApproved", "productionDirectorRequestApproved", "financePreApproved", "supplyPrepared", "financeApproved", "cashApproved", "transferredToWarehouse", "warehouseReceived", "issued", "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    productionDirector: ["productionDirectorRequestApproved", "financePreApproved", "supplyPrepared", "financeApproved", "cashApproved", "transferredToWarehouse", "warehouseReceived", "issued", "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    financePre: ["financePreApproved", "supplyPrepared", "financeApproved", "cashApproved", "transferredToWarehouse", "warehouseReceived", "issued", "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    supply: ["supplyPrepared", "financeApproved", "cashApproved", "transferredToWarehouse", "warehouseReceived", "issued", "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    finance: ["financeApproved", "cashApproved", "transferredToWarehouse", "warehouseReceived", "issued", "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    cash: ["cashApproved", "transferredToWarehouse", "warehouseReceived", "issued", "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    warehouse: ["warehouseReceived", "issued", "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    mechanic: ["mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    electrician: ["mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    operator: ["mechanicInstalled", "shopInstallApproved", "productionDirectorApproved", "accountingWrittenOff"],
    accounting: ["accountingWrittenOff"]
  };
  (resetFrom[targetRole] || []).forEach(field => { req[field] = false; });
  req.done = false;
  req.stock = false;
  req.returnedTo = targetRole;
  req.returnReason = cleanReason;
  req.status = targetRole;
  clearApprovalResponsibilityDeclines(req);
  requestAddHistory(req, `Возвращено: ${requestRoleLabel(targetRole)}`, cleanReason);
  syncRequestToRecord(req);
  saveState();
  return true;
}

function appendReturnAction(actions, req, targetRole) {
  if (!actions || !targetRole || req.done || req.stock || req.cashApproved) return;
  const button = actionButton(`Вернуть: ${requestRoleLabel(targetRole)}`, () => {
    const reason = window.prompt("Укажите причину возврата. Без причины заявка не будет возвращена:");
    if (!String(reason || "").trim()) return;
    if (returnRequestTo(req, targetRole, reason)) renderRequests();
  });
  button.classList.add("secondary-action", "danger-action");
  actions.append(button);
}

function appendFinanceSelectionAction(actions, req) {
  const items = requestItems(req);
  const panel = document.createElement("div");
  panel.className = "finance-selection-panel";
  panel.innerHTML = `
    <strong>Выберите позиции, которые можно оплатить</strong>
    <div class="finance-selection-list">
      ${items.map((item, index) => `
        <label>
          <input type="checkbox" data-finance-item-index="${index}" ${items.length === 1 ? "checked" : ""}>
          <span>
            <b>${escapeHtml(item.name || `Позиция ${index + 1}`)}</b>
            <small>${escapeHtml(item.article || "без артикула")} · ${Number(item.requiredQty || item.requestedQty || 0)} ${escapeHtml(item.unit || "шт")}${item.price ? ` · Цена: ${escapeHtml(item.price)}` : ""}${item.supplier ? ` · ${escapeHtml(item.supplier)}` : ""}${item.supplyNote ? ` · ${escapeHtml(item.supplyNote)}` : ""}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small>
          </span>
        </label>
      `).join("")}
    </div>
    <div class="readonly-note">Выбранные позиции отмечены для ручного обхода.</div>
  `;
  actions.append(panel);
  actions.append(actionButton("Подтвердить выбранное", () => {
    const selectedIndexes = [...panel.querySelectorAll("[data-finance-item-index]:checked")]
      .map(input => Number(input.dataset.financeItemIndex));
    const result = approveFinanceItems(req, selectedIndexes);
    if (!result.ok) {
      const note = panel.querySelector(".readonly-note");
      if (note) note.textContent = result.message;
      return;
    }
    renderRequests();
  }));
}

function supplyItemsTotal(items) {
  return normalizeRequestItems(items).reduce((sum, item) => sum + Number(item.requiredQty || item.requestedQty || 0), 0);
}

function supplyItemsPrepared(items) {
  const rows = normalizeRequestItems(items);
  return rows.length > 0 && rows.every(item => String(item.price || "").trim() && String(item.supplier || "").trim());
}

function appendSupplyItemsEditor(actions, req) {
  const items = requestItems(req);
  const panel = document.createElement("div");
  panel.className = "supply-items-panel";
  panel.innerHTML = `
    <strong>Цена и поставщик по позициям</strong>
    <div class="supply-items-table-wrap">
      <table class="supply-items-table">
        <thead>
          <tr><th>№</th><th>Позиция</th><th>Кол-во</th><th>Цена</th><th>Поставщик</th><th>Примечание</th></tr>
        </thead>
        <tbody>
          ${items.map((item, index) => `
            <tr data-supply-item-row="${index}">
              <td>${index + 1}</td>
              <td><b>${escapeHtml(item.name || "")}</b><small>${escapeHtml(item.article || "без артикула")}</small></td>
              <td>${Number(item.requiredQty || item.requestedQty || 0)} ${escapeHtml(item.unit || "шт")}</td>
              <td><input data-supply-item-price type="text" inputmode="decimal" value="${escapeHtml(item.price || req.price || "")}" placeholder="Цена"></td>
              <td><input data-supply-item-supplier type="text" value="${escapeHtml(item.supplier || req.supplier || "")}" placeholder="Поставщик"></td>
              <td><textarea data-supply-item-note rows="2" placeholder="Примечание">${escapeHtml(item.supplyNote || "")}</textarea></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  const read = () => {
    const nextItems = items.map((item, index) => {
      const row = panel.querySelector(`[data-supply-item-row="${index}"]`);
      return {
        ...item,
        price: row?.querySelector("[data-supply-item-price]")?.value.trim() || "",
        supplier: row?.querySelector("[data-supply-item-supplier]")?.value.trim() || "",
        supplyNote: row?.querySelector("[data-supply-item-note]")?.value.trim() || ""
      };
    });
    req.items = normalizeRequestItems(nextItems, req);
    const prepared = req.items.filter(item => item.price && item.supplier);
    req.price = prepared.map(item => `${item.name}: ${item.price}`).join("; ");
    req.supplier = prepared.map(item => `${item.name}: ${item.supplier}${item.supplyNote ? ` (${item.supplyNote})` : ""}`).join("; ");
    req.qtyReceived = supplyItemsTotal(req.items);
    req.qtyPurchased = req.qtyReceived;
    return req.items;
  };
  panel.addEventListener("change", () => {
    read();
    syncRequestToRecord(req);
    saveState();
  });
  actions.append(panel);
  return read;
}

function readInlineSupplyItems(actions, req) {
  if (requestFinanciallyLocked(req)) return requestItems(req);
  const card = actions.closest(".request-card");
  const items = requestItems(req);
  const nextItems = items.map((item, index) => {
    const row = card?.querySelector(`[data-supply-item-row="${index}"]`);
    return {
      ...item,
      price: row?.querySelector("[data-supply-item-price]")?.value.trim() || "",
      supplier: row?.querySelector("[data-supply-item-supplier]")?.value.trim() || "",
      supplyNote: row?.querySelector("[data-supply-item-note]")?.value.trim() || ""
    };
  });
  req.items = normalizeRequestItems(nextItems, req);
  const prepared = req.items.filter(item => item.price && item.supplier);
  req.price = prepared.map(item => `${item.name}: ${item.price}`).join("; ");
  req.supplier = prepared.map(item => `${item.name}: ${item.supplier}${item.supplyNote ? ` (${item.supplyNote})` : ""}`).join("; ");
  req.qtyReceived = supplyItemsTotal(req.items);
  req.qtyPurchased = req.qtyReceived;
  return req.items;
}

function readInlineQuantityItems(actions, req) {
  if (requestFinanciallyLocked(req)) return requestItems(req);
  const card = actions.closest(".request-card");
  const items = requestItems(req);
  const nextItems = items.map((item, index) => {
    const row = card?.querySelectorAll(".request-items-summary tbody tr")?.[index];
    const requested = row?.querySelector("[data-request-item-requested]");
    const required = row?.querySelector("[data-request-item-required]");
    return {
      ...item,
      requestedQty: requested ? Number(requested.value || 0) : Number(item.requestedQty || 0),
      requiredQty: required ? Number(required.value || 0) : Number(item.requiredQty || item.requestedQty || 0)
    };
  });
  applyRequestItems(req, nextItems);
  return req.items;
}

function appendInlineFinanceSelectionAction(actions, req) {
  const note = document.createElement("div");
  note.className = "readonly-note";
  note.textContent = "Отметьте позиции прямо в таблице заявки для ручного обхода.";
  actions.append(note);
  actions.append(actionButton("Подтвердить выбранное", () => {
    const card = actions.closest(".request-card");
    const selectedIndexes = [...(card?.querySelectorAll("[data-finance-item-index]:checked") || [])]
      .map(input => Number(input.dataset.financeItemIndex));
    if (!selectedIndexes.length) {
      note.textContent = "Выберите хотя бы одну позицию для оплаты.";
      return;
    }
    if (!window.confirm(`Точно подтвердить выбранные позиции? Количество: ${selectedIndexes.length}.`)) return;
    const result = approveFinanceItems(req, selectedIndexes);
    if (!result.ok) {
      note.textContent = result.message;
      return;
    }
    renderRequests();
  }));
}

function returnInstallResponsibility(req, reason) {
  const targetRole = warehouseIssueTargetRole(req) || "warehouse";
  req.shopInstallApproved = false;
  req.productionDirectorApproved = false;
  req.accountingWrittenOff = false;
  req.done = false;
  req.stock = false;
  req.returnedTo = targetRole;
  req.returnReason = reason;
  req.status = targetRole;
  requestAddHistory(req, `Возвращено после отказа инженера и директора производства: ${requestRoleLabel(targetRole)}`, reason);
  clearInstallResponsibilityDeclines(req);
  syncRequestToRecord(req);
  saveState();
}

function appendInstallResponsibilityAction(actions, req, role) {
  if (!actions || !["engineer", "productionDirector"].includes(role) || !requestWaitingForInstallApproval(req)) return;
  if (installResponsibilityDeclined(req, role)) return;
  const otherRole = role === "engineer" ? "productionDirector" : "engineer";
  const button = actionButton("Не моя зона ответственности", () => {
    const reason = window.prompt("Укажите причину. Если вторая роль тоже откажется, заявка вернётся назад:")?.trim();
    if (!reason) return;
    const declines = installResponsibilityDeclines(req);
    declines[role] = {
      at: new Date().toISOString(),
      name: profile?.name || "",
      reason
    };
    requestAddHistory(req, `Не моя зона ответственности: ${requestRoleLabel(role)}`, reason);
    if (declines.engineer && declines.productionDirector) {
      returnInstallResponsibility(req, `${declines.engineer.reason || ""}${declines.productionDirector.reason ? ` / ${declines.productionDirector.reason}` : ""}`);
    } else {
      req.status = otherRole;
      syncRequestToRecord(req);
      saveState();
    }
    renderRequests();
  });
  button.classList.add("secondary-action", "danger-action");
  actions.append(button);
}

function returnApprovalResponsibility(req, reason) {
  const targetRole = req.sourceRole === "engineer" ? "engineer" : "shop";
  req.shopApproved = targetRole === "shop" ? false : req.shopApproved;
  req.engineerApproved = false;
  req.productionDirectorRequestApproved = false;
  req.financePreApproved = false;
  req.supplyPrepared = false;
  req.done = false;
  req.stock = false;
  req.returnedTo = targetRole;
  req.returnReason = reason;
  req.status = targetRole;
  requestAddHistory(req, `Возвращено после отказа инженера и директора производства: ${requestRoleLabel(targetRole)}`, reason);
  clearApprovalResponsibilityDeclines(req);
  syncRequestToRecord(req);
  saveState();
}

function appendApprovalResponsibilityAction(actions, req, role) {
  if (!actions || !["engineer", "productionDirector"].includes(role) || !requestTechnicalApprovalOpenToBoth(req)) return;
  if (!req.shopApproved || req.supplyPrepared || req.done || req.stock) return;
  if (approvalResponsibilityDeclined(req, role)) return;
  const otherRole = role === "engineer" ? "productionDirector" : "engineer";
  const button = actionButton("Не моя зона ответственности", () => {
    const reason = window.prompt("Укажите причину. Если вторая роль тоже откажется, заявка вернётся назад:")?.trim();
    if (!reason) return;
    const declines = approvalResponsibilityDeclines(req);
    declines[role] = {
      at: new Date().toISOString(),
      name: profile?.name || "",
      reason
    };
    requestAddHistory(req, `Не моя зона ответственности: ${requestRoleLabel(role)}`, reason);
    if (declines.engineer && declines.productionDirector) {
      returnApprovalResponsibility(req, `${declines.engineer.reason || ""}${declines.productionDirector.reason ? ` / ${declines.productionDirector.reason}` : ""}`);
    } else {
      req.status = otherRole;
      syncRequestToRecord(req);
      saveState();
    }
    renderRequests();
  });
  button.classList.add("secondary-action", "danger-action");
  actions.append(button);
}

function appendRejectAction(actions, req) {
  if (!actions || req.done || req.stock || req.rejected || req.cashApproved) return;
  const button = actionButton("Отклонить заявку", () => {
    const reason = window.prompt("Укажите причину отклонения. Без причины заявка не будет отклонена:");
    const cleanReason = String(reason || "").trim();
    if (!cleanReason) return;
    req.sourceRole ||= req.createdByRole || "mechanic";
    req.sourceName ||= req.createdByName || "";
    req.sourceKey ||= req.createdByKey || "";
    req.rejected = true;
    req.rejectionReason = cleanReason;
    req.rejectedByRole = profile?.role || "";
    req.rejectedByName = profile?.name || "";
    req.returnedTo = req.sourceRole;
    req.returnReason = cleanReason;
    req.done = false;
    req.status = req.sourceRole;
    requestAddHistory(req, `Отклонено и возвращено автору: ${req.sourceName || requestRoleLabel(req.sourceRole)}`, cleanReason);
    syncRequestToRecord(req);
    saveState();
    renderRequests();
  });
  button.classList.add("secondary-action", "danger-action");
  actions.append(button);
}

function resubmitRejectedRequest(req, correctionText, correctionPhoto = "") {
  if (!req?.rejected || !isRequestSource(req)) return false;
  const cleanText = String(correctionText || "").trim();
  if (cleanText) {
    const correction = `Дополнение после отклонения (${profile?.name || "автор"}): ${cleanText}`;
    req.comment = [String(req.comment || "").trim(), correction].filter(Boolean).join("\n");
  }
  if (correctionPhoto) {
    if (req.requestPhoto) {
      req.additionalPhotos = [...(Array.isArray(req.additionalPhotos) ? req.additionalPhotos : []), correctionPhoto];
    } else {
      req.requestPhoto = correctionPhoto;
    }
  }
  [
    "shopApproved", "engineerApproved", "supplyPrepared", "financeApproved",
    "cashApproved", "transferredToWarehouse", "warehouseReceived", "issued",
    "mechanicInstalled", "shopInstallApproved", "productionDirectorApproved",
    "accountingWrittenOff"
  ].forEach(field => { req[field] = false; });
  req.done = false;
  req.stock = false;
  req.rejected = false;
  req.rejectionReason = "";
  req.rejectedByRole = "";
  req.rejectedByName = "";
  req.returnedTo = "";
  req.returnReason = "";
  req.status = "shop";
  req.requestStatus = "shop";
  req.approvals = {};
  req.updatedAt = new Date().toISOString();
  requestAddHistory(req, "Заявка исправлена и отправлена повторно", cleanText || (correctionPhoto ? "Добавлено новое фото" : ""));
  syncRequestToRecord(req);
  saveState();
  return true;
}

function deleteRejectedRequest(req, reason = "") {
  if (!req?.rejected || !isRequestSource(req)) return;
  const recKey = key(req.equipmentId, req.nodeIndex, req.date);
  const item = state.checks?.[recKey]?.[req.kind || "to"];
  if (item) {
    if (item.lastRequestId === req.id) item.lastRequestId = "";
    const directId = requestId(req.equipmentId, req.nodeIndex, req.date, req.kind || "to");
    if (req.id === directId) {
      item.request = "";
      item.requestPhoto = "";
    }
    item.requestStatus = "";
    item.rejected = false;
    item.rejectionReason = "";
    item.done = false;
    item.updatedAt = new Date().toISOString();
  }
  const deletedAt = new Date().toISOString();
  state.requests ||= {};
  state.requests[req.id] = {
    id: req.id,
    deleted: true,
    deletedAt,
    updatedAt: deletedAt
  };
  recordAudit("Удалил заявку", req.requestNumber || req.text || req.id, reason, req.equipment || req.area || "");
  saveState();
}

function equipmentById(id) {
  return allEquipment().find(item => item.id === id);
}

function statusForRecord(rec, date = current.date) {
  const completion = nodeWalkCompletion(rec, date);
  if (completion.complete) return "ТО";
  if (completion.partial) return "ТО";
  return "";
}

function plannedStatus(day) {
  return "ТО";
}

function isPlannedDone(rec, planned, date = current.date) {
  if (planned === "ТО") return nodeWalkCompletion(rec, date).complete;
  return true;
}

function isDueOrPast(date) {
  return date <= todayISO();
}

function isTodayDate(date) {
  return date === todayISO();
}

function canOpenEquipmentDate(date) {
  return isTodayDate(date) || date === currentWalkShift().date;
}

function hasOpenCommentRecord(rec) {
  return ["to"].some(kind => openRemarkEntries(rec?.[kind] || {}).length > 0);
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
  return allOpenCommentTargets().length;
}

function remarksSectionLabel() {
  return "Предупреждения";
}

function remarkVisibleToCurrentRole(eq) {
  if (!eq) return false;
  if (["shop", "operator"].includes(profile?.role)) return Boolean(profile?.area) && eq.area === profile.area;
  if (["engineer", "electrician", "mechanic", "editor", "productionDirector"].includes(profile?.role)) return true;
  return visibleEquipment().some(item => Number(item.id) === Number(eq.id));
}

function allOpenCommentTargets() {
  return Object.entries(state.checks)
    .flatMap(([k, rec]) => {
      const [equipmentId, nodeIndex, date] = k.split(":");
      const eq = equipmentById(Number(equipmentId));
      if (!remarkVisibleToCurrentRole(eq)) return [];
      return openRemarkEntries(rec?.to || {}).map(entry => ({
          equipmentId: Number(equipmentId),
          nodeIndex: Number(nodeIndex),
          date,
          kind: "to",
          remarkId: entry.id,
          text: entry.text || "",
          author: commentEntryAuthor(entry),
          areaName: eq?.area || "",
          equipmentName: eq?.name || `Оборудование ${equipmentId}`,
          nodeName: eq?.nodes?.[Number(nodeIndex)] || `Узел ${Number(nodeIndex) + 1}`,
          at: entry.at || "",
          pendingConfirmation: Boolean(entry.resolutionPendingConfirmation),
          submittedAt: entry.resolutionSubmittedAt || "",
          submittedBy: resolutionUpdateAuthor({ name: entry.resolutionSubmittedByName, role: entry.resolutionSubmittedByRole }),
          submittedComment: entry.resolutionSubmittedComment || "",
          confirmationLabel: remarkConfirmationLabel(entry, eq),
          canConfirm: canCurrentUserConfirmRemark(entry, eq)
        }));
    })
    .sort((a, b) => String(b.at || b.date).localeCompare(String(a.at || a.date)) || a.equipmentId - b.equipmentId || a.nodeIndex - b.nodeIndex);
}

function openAllRemarkCards() {
  const targets = allOpenCommentTargets();
  if (!targets.length) {
    showAppToast("Открытых замечаний нет");
    return;
  }
  document.querySelector(".open-remarks-overlay")?.remove();
  const pendingCount = targets.filter(target => target.pendingConfirmation).length;
  const activeCount = targets.length - pendingCount;
  const overlay = document.createElement("div");
  overlay.className = "request-archive-overlay open-remarks-overlay";
  overlay.innerHTML = `
    <section class="request-archive-dialog open-remarks-dialog" role="dialog" aria-modal="true">
      <header>
        <div><small class="warnings-hall-kicker">ОБЩИЙ ЗАЛ</small><strong>${escapeHtml(remarksSectionLabel())}</strong><span>К устранению: ${activeCount} · На подтверждении: ${pendingCount}</span></div>
        <button type="button" data-close-open-remarks>Закрыть</button>
      </header>
      <div class="request-archive-dialog-list open-remarks-list">
        ${targets.map((target, index) => `
          <article class="open-remark-item ${target.pendingConfirmation ? "pending-confirmation" : ""}" data-open-remark-id="${escapeHtml(target.remarkId)}">
            <header>
              <span><strong>Карточка ${index + 1} · ${escapeHtml(target.equipmentName)}</strong><small>${escapeHtml(target.areaName)} · ${escapeHtml(target.nodeName)} · ${escapeHtml(dateTimeHuman(target.at || target.date))}</small></span>
              <span class="open-remark-status">${target.pendingConfirmation ? "Ждёт подтверждения" : "Открыто"}</span>
            </header>
            <p>${escapeHtml(target.text)}</p>
            ${target.pendingConfirmation ? `
              <div class="open-remark-confirmation-summary">
                <strong>Устранил: ${escapeHtml(target.submittedBy || "Сотрудник")} · ${escapeHtml(dateTimeHuman(target.submittedAt))}</strong>
                <p>${escapeHtml(target.submittedComment)}</p>
                <small>Подтверждает: ${escapeHtml(target.confirmationLabel)}</small>
              </div>
            ` : ""}
            <footer>
              <small>${escapeHtml(target.author)}</small>
              <button type="button" data-open-remark-card data-remark-id="${escapeHtml(target.remarkId)}" data-equipment-id="${target.equipmentId}" data-node-index="${target.nodeIndex}" data-date="${escapeHtml(target.date)}">${target.pendingConfirmation ? (target.canConfirm ? "Проверить и подтвердить" : "Открыть карточку") : "Перейти в узел и устранить"}</button>
            </footer>
          </article>
        `).join("")}
      </div>
    </section>
  `;
  const close = () => overlay.remove();
  overlay.addEventListener("click", event => {
    if (event.target === overlay) close();
  });
  overlay.querySelector("[data-close-open-remarks]")?.addEventListener("click", close);
  overlay.querySelectorAll("[data-open-remark-card]").forEach(button => button.addEventListener("click", () => {
    current.equipmentId = Number(button.dataset.equipmentId);
    current.nodeIndex = Number(button.dataset.nodeIndex);
    current.nodeDetailIndex = Number(button.dataset.nodeIndex);
    current.date = button.dataset.date || todayISO();
    current.kind = "to";
    current.scrollToCommentNode = current.nodeIndex;
    current.scrollToRemarkId = button.dataset.remarkId || "";
    current.returnToRemarkListAfterResolve = true;
    close();
    show("checklist");
  }));
  document.body.append(overlay);
}

function returnToOpenRemarkCards() {
  current.returnToRemarkListAfterResolve = false;
  current.scrollToRemarkId = "";
  if (nav[nav.length - 1] === "equipment") nav.pop();
  show("equipment", false);
  window.setTimeout(() => openAllRemarkCards(), 50);
}

function show(view, push = true) {
  if (!canOpenView(view)) view = homeViewForProfile(profile?.role);
  if (push && current.view !== view) nav.push(current.view);
  current.view = view;
  document.body.classList.toggle("warehouse-only-profile", profile?.role === "warehouse");
  document.body.classList.toggle("director-control-profile", view === "directorControl");
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  document.querySelector(`#${view}Screen`).classList.add("active");
  if (ui.back) ui.back.disabled = view === homeViewForProfile(profile?.role) || view === "directorControl";
  renderProfile();
  updateMobileNavigation();
  render();
}

function updateMobileNavigation() {
  const profileFocused = document.body.classList.contains("mobile-profile-focus");
  const adminAtHome = isEditorSession() && profile?.role === "editor" && current.view === "equipment";
  document.querySelectorAll("[data-mobile-view]").forEach(button => {
    const target = button.dataset.mobileView;
    button.hidden = !canShowMobileView(target);
    const active = target === "profile"
      ? profileFocused && current.view === homeViewForProfile(profile?.role)
      : target === "home"
        ? !profileFocused && (isEditorSession() ? adminAtHome : current.view === homeViewForProfile(profile?.role))
      : !profileFocused && target === current.view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

function isUserEditingForm() {
  const active = document.activeElement;
  return Boolean(active && active !== document.body && active.matches?.("input, textarea, select, [contenteditable='true']"));
}

function scheduleRender(delay = 80) {
  if (isUserEditingForm()) {
    backgroundRenderPending = true;
    clearTimeout(renderTimer);
    renderTimer = null;
    return;
  }
  clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderTimer = null;
    backgroundRenderPending = false;
    render();
  }, delay);
}

function render() {
  renderProfile();
  updateDirectorBadge();
  updateDowntimeBadge();
  updateRoleBadges();
  renderGlobalReminderPanel();
  if (current.view === "equipment") renderEquipment();
  if (current.view === "node") renderNodes();
  if (current.view === "schedule") renderSchedule();
  if (current.view === "checklist") renderChecklist();
  if (current.view === "requestCreate") renderRequestCreate();
  if (current.view === "requests") renderRequests();
  if (current.view === "director") renderDirector();
  if (current.view === "directorControl") renderDirectorControl();
  if (current.view === "engineerReport") renderEngineerReport();
  if (current.view === "workerRating") renderWorkerRating();
  if (current.view === "downtime") renderDowntime();
  if (current.view === "aggregateJournal") renderAggregateJournal();
  applyLanguage();
  queueTranslateVisiblePage();
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
        resolved: Boolean(entry.resolved),
        resolvedAt: entry.resolvedAt || "",
        resolvedByName: entry.resolvedByName || "",
        resolvedByRole: entry.resolvedByRole || "",
        resolvedComment: entry.resolvedComment || "",
        confirmedAt: entry.confirmedAt || "",
        confirmedByName: entry.confirmedByName || "",
        confirmedByRole: entry.confirmedByRole || "",
        durationMs: Number(entry.resolvedDurationMs || 0)
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
const COMPRESSOR_JOURNAL_END_DATE = "2028-12-31";

function compressorJournalKey(area, date, compressor) {
  return `${area}::${date}::${compressor}`;
}

function compressorJournalBaseDate() {
  if (!current.compressorBaseDate) current.compressorBaseDate = todayISO();
  if (String(current.compressorBaseDate) < todayISO()) current.compressorBaseDate = todayISO();
  return current.compressorBaseDate;
}

function compressorJournalSheetIndex() {
  if (!Number.isInteger(current.compressorSheetIndex) || current.compressorSheetIndex < 0) current.compressorSheetIndex = 0;
  return current.compressorSheetIndex;
}

function compressorJournalAddDays(dateISO, days) {
  const date = new Date(dateISO);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function compressorJournalSheetDates(sheetIndex = compressorJournalSheetIndex()) {
  const base = compressorJournalBaseDate();
  const startOffset = sheetIndex * COMPRESSOR_JOURNAL_DAYS_PER_SHEET;
  const dates = [];
  for (let i = 0; i < COMPRESSOR_JOURNAL_DAYS_PER_SHEET; i++) {
    const date = compressorJournalAddDays(base, startOffset + i);
    if (date <= COMPRESSOR_JOURNAL_END_DATE) dates.push(date);
  }
  return dates;
}

function compressorJournalMaxSheetIndex() {
  const base = compressorJournalBaseDate();
  const start = new Date(base);
  const end = new Date(COMPRESSOR_JOURNAL_END_DATE);
  const diffDays = Math.max(0, Math.floor((end - start) / 86400000));
  return Math.floor(diffDays / COMPRESSOR_JOURNAL_DAYS_PER_SHEET);
}

function compressorJournalRows(area = COMPRESSOR_JOURNAL_AREA, sheetIndex = compressorJournalSheetIndex()) {
  state.compressorJournal ||= {};
  const rows = [];
  compressorJournalSheetDates(sheetIndex).forEach(date => {
    COMPRESSOR_JOURNAL_COMPRESSORS.forEach(compressor => {
      const id = compressorJournalKey(area, date, compressor);
      rows.push({
        id,
        area,
        date,
        compressor,
        ...(state.compressorJournal[id] || {})
      });
    });
  });
  return rows;
}

function compressorJournalFilledRows(area = COMPRESSOR_JOURNAL_AREA) {
  return Object.values(state.compressorJournal || {})
    .filter(row => row?.area === area)
    .filter(row => ["shiftTime", "airPressure", "airTemp", "oilPressureTemp", "leakGrounding", "blowTime", "checkedBy"].some(field => String(row[field] || "").trim()));
}

function compressorJournalRowComplete(row) {
  return window.PPRModules.compressor.rowComplete(row);
}

function compressorJournalSheetComplete(rows) {
  return window.PPRModules.compressor.rowsComplete(rows);
}

function compressorJournalDateRows(area = COMPRESSOR_JOURNAL_AREA, date = todayISO()) {
  return COMPRESSOR_JOURNAL_COMPRESSORS.map(compressor => {
    const id = compressorJournalKey(area, date, compressor);
    return { id, area, date, compressor, ...(state.compressorJournal?.[id] || {}) };
  });
}

function compressorJournalDateComplete(area = COMPRESSOR_JOURNAL_AREA, date = todayISO()) {
  return compressorJournalDateRows(area, date).every(compressorJournalRowComplete);
}

function compressorJournalDateNeedsAttention(area = COMPRESSOR_JOURNAL_AREA, date = todayISO()) {
  if (area !== COMPRESSOR_JOURNAL_AREA) return false;
  if (String(date) > todayISO()) return false;
  if (String(date) < compressorJournalBaseDate()) return false;
  return !compressorJournalDateComplete(area, date);
}

function journalEarliestDate(rows, fallback = todayISO()) {
  const dates = Object.values(rows || {})
    .map(row => String(row?.date || "").trim())
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayISO())
    .sort();
  return dates[0] || fallback;
}

function journalDueStart(key, rows) {
  state.journalDueSince ||= {};
  if (!state.journalDueSince[key]) {
    state.journalDueSince[key] = journalEarliestDate(rows);
    persistStateLocally(state);
    localStorage.setItem(`${STORE_KEY}-pending`, "1");
    queueRemoteStateSave();
  }
  return state.journalDueSince[key];
}

function incompleteJournalDays(startDate, completeForDate) {
  let date = String(startDate || todayISO());
  const today = todayISO();
  let count = 0;
  let guard = 0;
  while (date <= today && guard < 3660) {
    if (!completeForDate(date)) count += 1;
    date = compressorJournalAddDays(date, 1);
    guard += 1;
  }
  return count;
}

function overdueDaysText(days) {
  const value = Math.max(0, Number(days || 0));
  const mod10 = value % 10;
  const mod100 = value % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? "день"
    : [2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)
      ? "дня"
      : "дней";
  return `Просрочено ${value} ${word}`;
}

function compressorJournalIncompleteDays(area = COMPRESSOR_JOURNAL_AREA) {
  if (area !== COMPRESSOR_JOURNAL_AREA) return 0;
  const areaRows = Object.fromEntries(
    Object.entries(state.compressorJournal || {}).filter(([, row]) => row?.area === area)
  );
  const start = journalDueStart("compressor", areaRows);
  return incompleteJournalDays(start, date => compressorJournalDateComplete(area, date));
}

function compressorJournalTodayNeedsAttention(area = COMPRESSOR_JOURNAL_AREA) {
  return compressorJournalDateNeedsAttention(area, todayISO());
}

function compressorJournalHasIncompleteDueDays(area = COMPRESSOR_JOURNAL_AREA) {
  if (area !== COMPRESSOR_JOURNAL_AREA) return false;
  let date = compressorJournalBaseDate();
  const today = todayISO();
  while (date <= today && date <= COMPRESSOR_JOURNAL_END_DATE) {
    if (!compressorJournalDateComplete(area, date)) return true;
    date = compressorJournalAddDays(date, 1);
  }
  return false;
}

function compressorJournalButtonStatus(area = COMPRESSOR_JOURNAL_AREA) {
  const overdueDays = compressorJournalIncompleteDays(area);
  return overdueDays > 0 ? overdueDaysText(overdueDays) : "выполнено";
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
const GAS_JOURNAL_DAYS_PER_SHEET_A = 16;
const GAS_JOURNAL_DAYS_PER_SHEET_B = 5;

function gasJournalKey(section, date) {
  return `${section}::${date}`;
}

function gasJournalBaseDate(section) {
  const key = section === "A" ? "gasBaseDateA" : "gasBaseDateB";
  if (!current[key]) current[key] = todayISO();
  return current[key];
}

function gasJournalSheetIndex(section) {
  const key = section === "A" ? "gasSheetIndexA" : "gasSheetIndexB";
  if (!Number.isInteger(current[key]) || current[key] < 0) current[key] = 0;
  return current[key];
}

function gasJournalDaysPerSheet(section) {
  return section === "A" ? GAS_JOURNAL_DAYS_PER_SHEET_A : GAS_JOURNAL_DAYS_PER_SHEET_B;
}

function addDaysISO(dateISO, days) {
  const date = new Date(dateISO);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function gasJournalSheetDates(section) {
  const base = gasJournalBaseDate(section);
  const sheetIndex = gasJournalSheetIndex(section);
  const daysPerSheet = gasJournalDaysPerSheet(section);
  const startOffset = sheetIndex * daysPerSheet;
  return Array.from({ length: daysPerSheet }, (_, index) => addDaysISO(base, startOffset + index));
}

function shiftGasJournalSheet(section, deltaSheets) {
  const key = section === "A" ? "gasSheetIndexA" : "gasSheetIndexB";
  current[key] = Math.max(0, gasJournalSheetIndex(section) + deltaSheets);
  renderGasJournal();
}

function setGasJournalSheetToToday(section) {
  const keyBase = section === "A" ? "gasBaseDateA" : "gasBaseDateB";
  const keyIndex = section === "A" ? "gasSheetIndexA" : "gasSheetIndexB";
  current[keyBase] = todayISO();
  current[keyIndex] = 0;
  renderGasJournal();
}

function gasJournalRecord(section, date) {
  state.gasJournal ||= {};
  const id = gasJournalKey(section, date);
  return { id, section, date, ...(state.gasJournal[id] || {}) };
}

function gasJournalRowCompleteA(date = todayISO()) {
  const row = gasJournalRecord("A", date);
  return window.PPRModules.shgrp.rowAComplete(row);
}

function gasJournalRowCompleteB(date = todayISO()) {
  const row = gasJournalRecord("B", date);
  return window.PPRModules.shgrp.rowBComplete(row);
}

function gasJournalCompleteA(date = todayISO()) {
  return gasJournalRowCompleteA(date);
}

function gasJournalCompleteB(date = todayISO()) {
  return gasJournalRowCompleteB(date);
}

function gasJournalSheetComplete(section) {
  const dates = gasJournalSheetDates(section);
  return dates.every(date => section === "A" ? gasJournalRowCompleteA(date) : gasJournalRowCompleteB(date));
}

function gasJournalSheetHasFilledDay(section) {
  const dates = gasJournalSheetDates(section);
  return dates.some(date => section === "A" ? gasJournalRowCompleteA(date) : gasJournalRowCompleteB(date));
}

function gasJournalTodayNeedsAttention() {
  return !gasJournalRowCompleteA(todayISO()) || !gasJournalRowCompleteB(todayISO());
}

function gasJournalDateComplete(date = todayISO()) {
  return gasJournalRowCompleteA(date) && gasJournalRowCompleteB(date);
}

function gasJournalIncompleteDays() {
  const start = journalDueStart("gas", state.gasJournal || {});
  return incompleteJournalDays(start, gasJournalDateComplete);
}

function gasJournalButtonStatus() {
  const overdueDays = gasJournalIncompleteDays();
  return overdueDays > 0 ? overdueDaysText(overdueDays) : "выполнено";
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

function clearGasJournalSheet(section, reason = "") {
  const sheetNo = gasJournalSheetIndex(section) + 1;
  state.gasJournal ||= {};
  gasJournalSheetDates(section).forEach(date => delete state.gasJournal[gasJournalKey(section, date)]);
  recordAudit("Удалил лист журнала", `ШГРП раздел ${section}, лист ${sheetNo}`, reason);
  saveState();
  renderGasJournal();
  renderEquipment();
}

function printGasJournalSheet(section) {
  document.body.classList.remove("print-gas-A", "print-gas-B");
  document.body.classList.add(`print-gas-${section}`);
  printCurrentDocument(`ППР - Газовый журнал - раздел ${section}`);
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

function gasSheetActionsHtml(section, complete) {
  const label = section === "A" ? "А" : "Б";
  const sheetNo = gasJournalSheetIndex(section) + 1;
  return `<div class="gas-sheet-actions">
    <button type="button" data-gas-sheet-prev="${section}">‹ Предыдущий лист</button>
    <button type="button" data-gas-sheet-today="${section}">Сегодня</button>
    <button type="button" data-gas-sheet-next="${section}">Следующий лист ›</button>
    ${complete ? `<button type="button" data-gas-print="${section}">${printActionLabel(`Печать листа ${label} №${sheetNo}`, `PDF листа ${label} №${sheetNo}`)}</button><button type="button" class="danger" data-gas-clear="${section}">Удалить лист ${label} №${sheetNo}</button>` : `<span class="gas-sheet-note">Печать и удаление появятся после заполнения хотя бы одной даты на этом листе.</span>`}
  </div>`;
}

function renderGasJournal() {
  state.gasJournal ||= {};
  ui.aggregateJournalTitle.textContent = "Агрегатный журнал ШГРП / ГРП / ГРУ";
  ui.aggregateJournalMeta.textContent = `${gasJournalFilledCount()} заполненных строк. На одном листе несколько дат; одна дата не переносится на второй лист.`;
  const datesA = gasJournalSheetDates("A");
  const datesB = gasJournalSheetDates("B");
  const completeA = gasJournalSheetHasFilledDay("A");
  const completeB = gasJournalSheetHasFilledDay("B");
  const sheetNoA = gasJournalSheetIndex("A") + 1;
  const sheetNoB = gasJournalSheetIndex("B") + 1;

  ui.aggregateJournalList.innerHTML = `
    <div class="aggregate-journal-sheet gas-journal-sheet gas-a4-sheet gas-section-a ${datesA.includes(todayISO()) && !gasJournalRowCompleteA(todayISO()) ? "gas-missing-today" : ""}" data-print-section="A">
      <div class="aggregate-sheet-head"><strong>Раздел А. Эксплуатация и ТО ГРП (ГРУ)</strong><span>Лист раздела А № ${sheetNoA}</span></div>
      <div class="aggregate-journal-table-wrap gas-a4-wrap">
        <table class="aggregate-journal-table gas-journal-table gas-sheet-table gas-section-a-table">
          <thead><tr><th>Дата</th><th>Время</th><th>Давление входное<br>МПа</th><th>Давление выходное<br>МПа</th><th>Температура входная<br>°C</th><th>Температура выходная<br>°C</th><th>Перепад давления<br>МПа</th><th>Исправность оборудования</th><th>Срабатывание<br>ПСК</th><th>Техническое обслуживание</th><th>Замечания</th><th>Подпись</th></tr></thead>
          <tbody>
            ${datesA.map(date => {
              const row = gasJournalRecord("A", date);
              return `<tr class="gas-day-row">
                <td>${dateHuman(date)}</td>
                <td>${escapeHtml(row.time || "")}</td>
                <td>${gasInputHtml("A", date, "inletMpa", row.inletMpa)}</td>
                <td>${gasInputHtml("A", date, "outletMpa", row.outletMpa)}</td>
                <td>${gasInputHtml("A", date, "tempInC", row.tempInC ?? row.tempC)}</td>
                <td>${gasInputHtml("A", date, "tempOutC", row.tempOutC)}</td>
                <td>${gasInputHtml("A", date, "pressureDeltaMpa", row.pressureDeltaMpa ?? row.filterDelta)}</td>
                <td>${gasSelectHtml("A", date, "equipmentStatus", row.equipmentStatus ?? row.regulator, ["Исправно", "Неисправно"])}</td>
                <td>${gasSelectHtml("A", date, "pskTrigger", row.pskTrigger ?? row.psk, ["Нет", "Есть"])}</td>
                <td>${gasSelectHtml("A", date, "maintenance", row.maintenance, ["Не требуется", "Требуется"])}</td>
                <td>${gasInputHtml("A", date, "remarks", row.remarks ?? row.result)}</td>
                <td>${escapeHtml(row.checkedBy || "")}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      ${gasSheetActionsHtml("A", completeA)}
    </div>

    <div class="aggregate-journal-sheet gas-journal-sheet gas-a4-sheet gas-section-b ${datesB.includes(todayISO()) && !gasJournalRowCompleteB(todayISO()) ? "gas-missing-today" : ""}" data-print-section="B">
      <div class="aggregate-sheet-head"><strong>Раздел Б. Обход подземного газопровода</strong><span>Лист раздела Б № ${sheetNoB}</span></div>
      <div class="aggregate-journal-table-wrap gas-a4-wrap">
        <table class="aggregate-journal-table gas-journal-table gas-sheet-table gas-section-b-table">
          <thead><tr><th>Дата</th><th>Время</th><th>Участок</th><th>Контрольный трубопровод<br>и колодцы</th><th>Запах газа</th><th>Охранная зона</th><th>Замечания</th><th>Принятые меры</th><th>Подпись</th></tr></thead>
          <tbody>
            ${datesB.map(date => {
              const row = gasJournalRecord("B", date);
              const route = row.route || GAS_ROUTE_LIST.join("\n");
              return `<tr class="gas-day-row gas-route-day-row">
                <td>${dateHuman(date)}</td>
                <td>${escapeHtml(row.time || "")}</td>
                <td class="gas-route-cell">${escapeHtml(route).replace(/\n/g, "<br>")}</td>
                <td>${gasSelectHtml("B", date, "wells", row.wells, ["Исправно", "Неисправно"])}</td>
                <td>${gasSelectHtml("B", date, "gasSmell", row.gasSmell, ["Нет", "Есть"])}</td>
                <td>${gasSelectHtml("B", date, "protectionZone", row.protectionZone, ["Без нарушений", "Нарушение"])}</td>
                <td>${gasInputHtml("B", date, "remarks", row.remarks)}</td>
                <td>${gasSelectHtml("B", date, "actions", row.actions, ["Не требуется", "Требуется"])}</td>
                <td>${escapeHtml(row.checkedBy || "")}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      ${gasSheetActionsHtml("B", completeB)}
    </div>
  `;
  ui.aggregateJournalList.querySelectorAll("[data-gas-section]").forEach(el => {
    el.addEventListener("change", () => {
      updateGasJournalRow(el.dataset.gasSection, el.dataset.gasDate, el.dataset.gasField, el.value);
      renderGasJournal();
      renderEquipment();
    });
  });
  ui.aggregateJournalList.querySelectorAll("[data-gas-sheet-prev]").forEach(btn => btn.addEventListener("click", () => shiftGasJournalSheet(btn.dataset.gasSheetPrev, -1)));
  ui.aggregateJournalList.querySelectorAll("[data-gas-sheet-next]").forEach(btn => btn.addEventListener("click", () => shiftGasJournalSheet(btn.dataset.gasSheetNext, 1)));
  ui.aggregateJournalList.querySelectorAll("[data-gas-sheet-today]").forEach(btn => btn.addEventListener("click", () => setGasJournalSheetToToday(btn.dataset.gasSheetToday)));
  ui.aggregateJournalList.querySelectorAll("[data-gas-print]").forEach(btn => btn.addEventListener("click", () => printGasJournalSheet(btn.dataset.gasPrint)));
  ui.aggregateJournalList.querySelectorAll("[data-gas-clear]").forEach(btn => btn.addEventListener("click", () => {
    const section = btn.dataset.gasClear;
    const sheetNo = gasJournalSheetIndex(section) + 1;
    if (!confirm(`Удалить лист раздела ${section} №${sheetNo}?`)) return;
    const reason = prompt("Укажите причину удаления листа:")?.trim();
    if (!reason) return;
    clearGasJournalSheet(section, reason);
  }));
}

function renderCompressorJournal(area = COMPRESSOR_JOURNAL_AREA) {
  const sheetIndex = compressorJournalSheetIndex();
  const maxSheetIndex = compressorJournalMaxSheetIndex();
  if (current.compressorSheetIndex > maxSheetIndex) current.compressorSheetIndex = maxSheetIndex;
  const activeSheetIndex = compressorJournalSheetIndex();
  const sheetRows = compressorJournalRows(area, activeSheetIndex);
  const filled = compressorJournalFilledRows(area).length;
  ui.aggregateJournalTitle.textContent = `\u0410\u0433\u0440\u0435\u0433\u0430\u0442\u043d\u044b\u0439 \u0436\u0443\u0440\u043d\u0430\u043b: ${area}`;
  ui.aggregateJournalMeta.textContent = `${filled} \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u0445 \u0441\u0442\u0440\u043e\u043a. \u0416\u0443\u0440\u043d\u0430\u043b \u0437\u0430\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f \u0432\u0440\u0443\u0447\u043d\u0443\u044e; \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u044f \u0441\u044e\u0434\u0430 \u043d\u0435 \u043f\u043e\u043f\u0430\u0434\u0430\u044e\u0442.`;
  ui.aggregateJournalList.innerHTML = `
    <div class="aggregate-print-actions compressor-journal-actions">
      <div class="segmented">
        <button type="button" data-compressor-sheet-prev ${activeSheetIndex <= 0 ? "disabled" : ""}>\u2039</button>
        <strong>\u041b\u0438\u0441\u0442 ${activeSheetIndex + 1}</strong>
        <button type="button" data-compressor-sheet-next ${activeSheetIndex >= maxSheetIndex || !compressorJournalSheetComplete(sheetRows) ? "disabled" : ""}>\u203a</button>
      </div>
    </div>
    <div class="aggregate-journal-sheet compressor-journal-sheet" data-compressor-sheet="${activeSheetIndex}">
      <div class="aggregate-sheet-head">
        <strong>\u041a\u043e\u043c\u043f\u0440\u0435\u0441\u0441\u043e\u0440\u043d\u0430\u044f</strong>
        <span>${dateHuman(compressorJournalSheetDates(activeSheetIndex)[0] || todayISO())} – ${dateHuman(compressorJournalSheetDates(activeSheetIndex).slice(-1)[0] || todayISO())} · \u041b\u0438\u0441\u0442 ${activeSheetIndex + 1}</span>
        <button class="compressor-sheet-print" type="button" data-print-compressor-sheet="${activeSheetIndex}" ${compressorJournalSheetComplete(sheetRows) ? "" : "disabled"}>${printActionLabel(`Печать листа №${activeSheetIndex + 1}`, `PDF листа №${activeSheetIndex + 1}`)}</button>
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
            ${sheetRows.map((row, index) => {
              const compressorDayAttention = compressorJournalDateNeedsAttention(area, row.date);
              return `
              <tr class="${compressorDayAttention ? "overdue-line-blink" : ""}">
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
            `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  ui.aggregateJournalList.querySelector("[data-compressor-sheet-prev]")?.addEventListener("click", () => {
    current.compressorSheetIndex = Math.max(0, compressorJournalSheetIndex() - 1);
    renderAggregateJournal();
  });
  ui.aggregateJournalList.querySelector("[data-compressor-sheet-next]")?.addEventListener("click", () => {
    current.compressorSheetIndex = Math.min(compressorJournalSheetIndex() + 1, compressorJournalMaxSheetIndex());
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
      printCurrentDocument(`ППР - Компрессорная - лист ${Number(sheetIndex) + 1}`);
      window.setTimeout(cleanup, 1000);
    });
  });
  const refreshCompressorSheetControls = () => {
    const complete = compressorJournalSheetComplete(compressorJournalRows(area, activeSheetIndex));
    const printButton = ui.aggregateJournalList.querySelector(`[data-print-compressor-sheet="${activeSheetIndex}"]`);
    const nextButton = ui.aggregateJournalList.querySelector("[data-compressor-sheet-next]");
    if (printButton) printButton.disabled = !complete;
    if (nextButton) nextButton.disabled = activeSheetIndex >= maxSheetIndex || !complete;
  };
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
      refreshCompressorSheetControls();
    };
    input.addEventListener("input", commitCompressorValue);
    input.addEventListener("change", event => {
      commitCompressorValue(event);
      renderEquipment();
    });
  });
}

function renderEquipment() {
  ui.subtitle.textContent = "Оборудование";
  const editorSchedule = false;
  const today = new Date();
  current.month = today.getMonth();
  current.year = today.getFullYear();
  const count = openCommentCount();
  updateRoleBadges();
  ui.alertCounter.innerHTML = `<span>${escapeHtml(remarksSectionLabel())}</span><strong>${count}</strong>`;
  ui.alertCounter.classList.toggle("request-alert", count > 0);
  ui.alertCounter.classList.toggle("clickable", count > 0);
  ui.alertCounter.title = count > 0 ? `Открыть все ${remarksSectionLabel().toLowerCase()} отдельными карточками` : "Открытых замечаний нет";
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
      <span>${editorSchedule ? "Нажмите день напротив оборудования" : `Сегодня: ${today.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}`}</span>
    </div>
    <div class="segmented">
      ${editorSchedule ? `<button type="button" data-equipment-month="prev">‹</button>` : ""}
      <strong>${new Date(current.year, current.month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</strong>
      ${editorSchedule ? `<button type="button" data-equipment-month="next">›</button>` : ""}
    </div>
  `;
  monthBar.querySelector("[data-equipment-month='prev']")?.addEventListener("click", () => {
    current.month -= 1;
    if (current.month < 0) {
      current.month = 11;
      current.year -= 1;
    }
    renderEquipment();
  });
  monthBar.querySelector("[data-equipment-month='next']")?.addEventListener("click", () => {
    current.month += 1;
    if (current.month > 11) {
      current.month = 0;
      current.year += 1;
    }
    renderEquipment();
  });
  ui.equipmentList.append(monthBar);

  const days = editorSchedule
    ? Array.from({ length: 31 }, (_, index) => index + 1)
    : [today.getDate()];
  const wrap = document.createElement("div");
  wrap.className = "schedule-wrap equipment-schedule-wrap";
  const table = document.createElement("table");
  table.className = "schedule-table equipment-schedule-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th class="node-head equipment-head">Агрегатный журнал</th>
        ${days.map(day => `<th>${day}</th>`).join("")}
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  equipment.forEach(eq => {
      const tr = document.createElement("tr");
      const alert = hasOpenCommentEquipment(eq.id);
      const stoppedNodeIndex = eq.nodes.findIndex((_, nodeIndex) => activeDowntime(eq.id, nodeIndex));
      const equipmentDowntimeOpen = stoppedNodeIndex >= 0;
      const equipmentDowntimeBlink = eq.nodes.some((_, nodeIndex) => {
        const active = activeDowntime(eq.id, nodeIndex);
        return Boolean(active && active.type !== "production");
      });
      const downtimeColor = equipmentRowColor(eq);
      const downtimeStyle = downtimeColor ? ` style="--downtime-area-color:${downtimeColor}"` : "";
      const compressorJournalOverdueDays = compressorJournalIncompleteDays(eq.area);
      const gasJournalOverdueDays = eq.area === GAS_JOURNAL_AREA ? gasJournalIncompleteDays() : 0;
      const compressorJournalMissingToday = compressorJournalOverdueDays > 0;
      const gasJournalMissingToday = gasJournalOverdueDays > 0;
      tr.innerHTML = `
        <th class="node-name equipment-name equipment-journal-cell area-color-cell"${downtimeStyle}>
          <div class="equipment-row-tools">
            <button type="button" data-aggregate-area="${escapeHtml(eq.area)}" class="equipment-journal-button ${(compressorJournalMissingToday || gasJournalMissingToday) ? "compressor-journal-alert" : ""}">
              <span class="journal-button-title">Журнал</span>
              <strong>${escapeHtml(eq.name)}</strong>
              <span>${eq.nodes.length} узлов · ${escapeHtml(eq.area)}</span>
              <small>${eq.area === GAS_JOURNAL_AREA ? gasJournalButtonStatus() : eq.area === COMPRESSOR_JOURNAL_AREA ? compressorJournalButtonStatus(eq.area) : `${aggregateJournalCount(eq.area)} записей`}</small>
            </button>
            ${isEditorSession() ? `<button type="button" class="equipment-qr-print-button" data-print-equipment-qr="${eq.id}">QR всех узлов<br><small>${eq.nodes.length} шт · A4 по 4</small></button>` : ""}
          </div>
          ${canEditEquipmentCatalog(eq) ? `
            <details class="catalog-editor" data-equipment-editor="${eq.id}">
              <summary>Редактировать название</summary>
              <label><span>Название оборудования</span><input data-equipment-name="${eq.id}" type="text" maxlength="200" value="${escapeHtml(eq.name)}"></label>
              <div class="catalog-editor-actions">
                <button type="button" data-save-equipment="${eq.id}">Сохранить</button>
                <button type="button" class="secondary" data-cancel-equipment="${eq.id}">Отмена</button>
              </div>
            </details>
          ` : ""}
        </th>
      `;
      tr.querySelector("[data-aggregate-area]")?.addEventListener("click", () => {
        current.selectedAggregateArea = eq.area || "";
        show("aggregateJournal");
      });
      tr.querySelector("[data-print-equipment-qr]")?.addEventListener("click", event => {
        event.stopPropagation();
        printEquipmentQrCodes(eq);
      });
      for (const day of days) {
        const date = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const summary = equipmentDaySummary(eq, date);
        const firstOpenCommentIndex = eq.nodes.findIndex((_, nodeIndex) => hasOpenCommentRecord(getRecord(eq.id, nodeIndex, date)));
        const downtimeOpen = equipmentDowntimeOpen;
        const td = document.createElement("td");
        const signalClass = downtimeOpen ? "downtime-cell" : summary.open ? "comment-cell" : "";
        const baseClass = summary.done === summary.total ? "completed-day" : "to";
        td.className = `${baseClass} ${summary.overdue ? "planned-overdue" : ""} ${summary.blinkToday ? "overdue-line-blink" : ""} ${summary.open || equipmentDowntimeBlink ? "blink-cell" : ""} ${summary.open ? "open-comment" : ""} ${signalClass} ${isTodayDate(date) ? "today-cell" : ""}`;
        if (!canOpenEquipmentDate(date)) td.classList.add("date-locked");
        td.textContent = summary.done === summary.total ? "✓" : `${summary.done}/${summary.total}`;
        td.title = downtimeOpen ? `${eq.name} · идет простой` : summary.open ? `${eq.name} · есть комментарий` : `${eq.name} · ${dateHuman(date)} · выполнено ${summary.done} из ${summary.total}`;
        td.addEventListener("click", () => {
          if (!canOpenEquipmentDate(date)) return;
          current.equipmentId = eq.id;
          current.nodeIndex = downtimeOpen ? stoppedNodeIndex : firstOpenCommentIndex >= 0 ? firstOpenCommentIndex : 0;
          current.nodeDetailIndex = null;
          current.date = date;
          current.kind = "to";
          current.scrollToDowntimeNode = null;
          current.scrollToCommentNode = null;
          show("checklist");
        });
        tr.append(td);
      }
      tr.querySelector("[data-save-equipment]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
        const input = tr.querySelector(`[data-equipment-name="${eq.id}"]`);
        if (!saveEquipmentCatalog(eq.id, { name: input?.value || eq.name })) return;
        renderEquipment();
      }, "Сохраняется..."));
      tr.querySelector("[data-cancel-equipment]")?.addEventListener("click", () => {
        const input = tr.querySelector(`[data-equipment-name="${eq.id}"]`);
        if (input) input.value = eq.name;
        const editor = tr.querySelector(`[data-equipment-editor="${eq.id}"]`);
        if (editor) editor.open = false;
      });
      tbody.append(tr);
    });
  wrap.append(table);
  ui.equipmentList.append(wrap);
}

function equipmentDaySummary(eq, date) {
  const rows = eq.nodes.map((_, index) => getRecord(eq.id, index, date));
  const shiftKeys = walkShiftKeysDueForDate(date);
  const total = eq.nodes.length * Math.max(1, shiftKeys.length);
  const done = shiftKeys.length
    ? rows.reduce((sum, rec) => sum + shiftKeys.filter(shiftKey => isNodeShiftChecked(rec, shiftKey)).length, 0)
    : rows.filter(rec => isNodeChecked(rec)).length;
  const open = rows.some(rec => hasOpenCommentRecord(rec));
  const requestOpen = rows.some((rec, index) => hasActiveRequestRecord(rec) || hasActiveRequestForNodeDate(eq.id, index, date));
  return {
    done,
    total,
    open,
    requestOpen,
    overdue: isDueOrPast(date) && shiftKeys.length > 0 && done < total,
    blinkToday: date === currentWalkShift().date && shiftKeys.length > 0 && done < total
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
      const completion = nodeWalkCompletion(rec, date);
      const factStatus = statusForRecord(rec, date);
      const plan = plannedStatus(day);
      const status = factStatus || plan;
      const open = hasOpenCommentRecord(rec);
      const requestOpen = hasActiveRequestRecord(rec) || hasActiveRequestForNodeDate(current.equipmentId, nodeIndex, date);
      const activeNodeDowntime = activeDowntime(current.equipmentId, nodeIndex);
      const downtimeOpen = Boolean(activeNodeDowntime);
      const downtimeBlink = Boolean(activeNodeDowntime && activeNodeDowntime.type !== "production");
      const overdue = plan && isDueOrPast(date) && walkShiftKeysDueForDate(date).length > 0 && !isPlannedDone(rec, plan, date);
      const blinkToday = plan && date === currentWalkShift().date && !isPlannedDone(rec, plan, date);
      const td = document.createElement("td");
      const signalClass = downtimeOpen ? "downtime-cell" : open ? "comment-cell" : "";
      const baseClass = isPlannedDone(rec, plan, date) ? "completed-day" : statusClass(status);
      td.className = `${baseClass} ${overdue ? "planned-overdue" : ""} ${blinkToday ? "overdue-line-blink" : ""} ${open || downtimeBlink ? "blink-cell" : ""} ${open ? "open-comment" : ""} ${signalClass} ${isTodayDate(date) ? "today-cell" : ""}`;
      if (!canOpenEquipmentDate(date)) td.classList.add("date-locked");
      td.textContent = completion.complete ? "ТО" : completion.partial ? `${completion.done}/${completion.total}` : status;
      td.title = downtimeOpen ? "Идет простой по этому узлу" : open ? "Есть комментарий по узлу" : overdue ? `${plan} по утверждённому графику не выполнено` : `${status} выполнено или без замечаний`;
      td.addEventListener("click", () => {
        if (!canOpenEquipmentDate(date)) return;
        current.nodeIndex = nodeIndex;
        current.nodeDetailIndex = null;
        current.date = date;
        current.kind = "to";
        current.scrollToDowntimeNode = null;
        current.scrollToCommentNode = null;
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
  ui.resolvedInput.checked = Boolean(kind.resolved);
  ui.commentInput.disabled = !canEditThisComment;
  ui.commentPhotoInput.disabled = !canEditThisComment;
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
  const activeShift = visibleWalkShiftForDate(current.date);
  ui.subtitle.textContent = "Обход по узлам";
  const forcedDetailIndex = current.scrollToDowntimeNode ?? current.scrollToCommentNode;
  if (forcedDetailIndex !== null && forcedDetailIndex !== undefined) {
    current.nodeDetailIndex = forcedDetailIndex;
    current.nodeIndex = forcedDetailIndex;
  }
  const selectedNodeIndex = Number.isInteger(current.nodeDetailIndex) && current.nodeDetailIndex >= 0 && current.nodeDetailIndex < eq.nodes.length
    ? current.nodeDetailIndex
    : null;
  ui.checklistTitle.textContent = selectedNodeIndex === null ? `Узлы - ${eq.name}` : eq.nodes[selectedNodeIndex];
  ui.checklistMeta.textContent = `${eq.area} · ${dateHuman(current.date)} · ${activeShift.label} ${activeShift.range}`;
  document.querySelector(".tabs[role='tablist']")?.setAttribute("hidden", "");
  ui.commentPanel.hidden = true;
  ui.taskList.innerHTML = "";

  const doneCount = eq.nodes.filter((_, index) => isNodeShiftChecked(getRecord(eq.id, index, current.date), activeShift.key)).length;
  ui.dayStatus.textContent = `${doneCount}/${eq.nodes.length} · ${activeShift.label}`;
  ui.dayStatus.style.background = doneCount === eq.nodes.length ? "var(--to)" : "var(--nav-soft)";

  const list = document.createElement("div");
  list.className = "node-walk-list";
  if (selectedNodeIndex === null) {
    const backRow = document.createElement("div");
    backRow.className = "node-list-back-row";
    backRow.innerHTML = `<button type="button" data-node-screen-back>‹ Назад</button>`;
    backRow.querySelector("[data-node-screen-back]")?.addEventListener("click", goBack);
    list.append(backRow);
  }
  if (selectedNodeIndex === null && canManageCatalogStructure(eq)) {
    const adminPanel = document.createElement("form");
    adminPanel.className = "node-catalog-admin";
    adminPanel.innerHTML = `
      <input type="text" data-add-node-name placeholder="Название нового узла">
      <button type="submit">Добавить узел</button>
    `;
    adminPanel.addEventListener("submit", event => {
      event.preventDefault();
      const input = adminPanel.querySelector("[data-add-node-name]");
      if (addNodeName(eq.id, input?.value || "")) {
        current.nodeDetailIndex = null;
        renderNodeWalkthrough(equipmentById(eq.id));
      } else {
        input?.focus();
      }
    });
    list.append(adminPanel);
  }
  eq.nodes.forEach((nodeName, index) => {
    const item = getRecord(eq.id, index, current.date)?.to || blankKind();
    const activeStop = activeDowntime(eq.id, index);
    const hasUnresolvedRemark = openRemarkEntries(item).length > 0;
    const nodeDone = isNodeShiftChecked(getRecord(eq.id, index, current.date), activeShift.key);
    if (selectedNodeIndex === null) {
      const row = document.createElement("div");
      row.className = `node-walk-row node-walk-list-item ${hasUnresolvedRemark ? "open-comment" : ""}`;
      row.dataset.nodeWalkIndex = String(index);
      const statusText = activeStop
        ? `Простой: ${durationText(downtimeDurationMs(activeStop))}`
        : nodeWalkStatusText(item);
      row.innerHTML = `
        <button type="button" class="node-open-button" data-open-node-detail="${index}">
          <span class="node-open-main">
            <strong>${escapeHtml(nodeName)}</strong>
            <small>${escapeHtml(nodeWalkShiftStatusText(getRecord(eq.id, index, current.date), current.date))} · ${escapeHtml(statusText)}</small>
          </span>
          <span class="node-open-arrow">›</span>
        </button>
        ${canEditEquipmentCatalog(eq) ? `
          <div class="node-admin-actions">
            <input class="node-name-editor" data-node-name-list="${index}" type="text" value="${escapeHtml(nodeName)}">
            <button type="button" data-save-node-name="${index}">Сохранить</button>
            <button type="button" class="secondary" data-cancel-node-name="${index}">Отмена</button>
            ${canManageCatalogStructure(eq) ? `<button type="button" class="danger" data-delete-node="${index}">Удалить</button>` : ""}
          </div>
        ` : ""}
      `;
      row.querySelector("[data-open-node-detail]")?.addEventListener("click", () => {
        current.nodeDetailIndex = index;
        current.nodeIndex = index;
        renderNodeWalkthrough(eq);
      });
      row.querySelector("[data-save-node-name]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
        const input = row.querySelector("[data-node-name-list]");
        if (!saveNodeName(eq.id, index, input?.value || nodeName)) return;
        renderNodeWalkthrough(equipmentById(eq.id));
      }, "Сохраняется..."));
      row.querySelector("[data-cancel-node-name]")?.addEventListener("click", () => {
        const input = row.querySelector("[data-node-name-list]");
        if (input) input.value = nodeName;
      });
      row.querySelector("[data-delete-node]")?.addEventListener("click", event => {
        if (!canManageCatalogStructure(eq)) return;
        if (!window.confirm(`Точно удалить узел "${nodeName}"? После удаления QR-коды следующих узлов нужно распечатать заново.`)) return;
        if (deleteNodeName(eq.id, index)) {
          current.nodeDetailIndex = null;
          current.nodeIndex = 0;
          renderNodeWalkthrough(equipmentById(eq.id));
        } else {
          window.alert(eq.nodes.length <= 1
            ? "Нельзя удалить последний узел."
            : "Удаление запрещено: у этого или следующих узлов уже есть сохранённые обходы, заявки или простои.");
        }
      });
      list.append(row);
      return;
    }
    if (selectedNodeIndex !== index) return;
    const reminderItems = reminderItemsForNode(eq.id, index, nodeName);
    const waitingShopFix = Boolean(item.mechanicFixed && !item.resolved);
    const canEditThisComment = canEditComment(item);
    const ownerText = commentOwnerText(item);
    const allCommentEntries = visibleCommentEntries(item, !sameCommentAuthor(item));
    const remarkEntries = ensureRemarkEntries(item).slice().reverse();
    const downtimeCommentEntries = allCommentEntries.filter(isDowntimeCommentEntry).reverse();
    const currentAuthorText = profile?.name
      ? `${profile.name} (${ROLE_ACCESS[profile?.role]?.label || profile?.role || "Сотрудник"})`
      : ROLE_ACCESS[profile?.role]?.label || "Сотрудник";
    const remarkCardsBlock = remarkEntries.length ? `
      <div class="remark-cards" data-node-first-comment="${index}" tabindex="-1">
        <div class="remark-cards-title"><strong>Все замечания</strong><span>Открыто: ${remarkEntries.filter(entry => !entry.resolved).length}</span></div>
        ${remarkEntries.map((entry, entryIndex) => remarkCardHtml(eq, item, index, entry, entryIndex)).join("")}
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
    const productionStopActive = activeStop?.type === "production";
    const fixedButtonLabel = productionStopActive ? "Устранить" : waitingShopFix && canConfirmInstallation() ? "Подтвердить устранение" : "Устранено";
    const fixedButtonDisabled = !canEditChecklist() || !productionStopActive;
    const submitRemarkDisabled = !canEditThisComment;
    const submitRemarkLabel = "Отправить";
    const downtimeActiveBlock = activeStop ? `
      <div class="downtime-active" data-node-downtime="${index}" tabindex="-1">
        <strong>Простой идет: ${durationText(downtimeDurationMs(activeStop))}</strong>
        <span>Тип: ${escapeHtml(downtimeTypeLabel(activeStop.type))}</span>
        <span>Причина: ${escapeHtml(activeStop.comment || "без комментария")}</span>
        <span>Записал: ${escapeHtml(activeStop.authorName || "сотрудник")}</span>
      </div>
    ` : "";
    const row = document.createElement("div");
    row.className = `node-walk-row node-walk-detail ${hasUnresolvedRemark ? "open-comment" : ""}`;
    row.dataset.nodeWalkIndex = String(index);
    row.innerHTML = `
      <div class="node-detail-toolbar">
        <button type="button" data-back-node-list>‹ К списку узлов</button>
      </div>
      <div class="node-walk-field">
        <small class="comment-owner">${escapeHtml(sameCommentAuthor(item) && ownerText ? ownerText : `Новый комментарий: ${currentAuthorText}`)}</small>
        <textarea data-node-comment="${index}" rows="2" placeholder="${sameCommentAuthor(item) ? "Напишите замечание по узлу" : "Новое замечание по узлу"}" ${canEditThisComment ? "" : "disabled"}>${escapeHtml(item.nodeDraftText || commentInputValue(item))}</textarea>
        <input data-node-comment-photo="${index}" type="file" accept="image/*" capture="environment" ${canEditThisComment ? "" : "disabled"}>
        <div class="photo-preview node-photo-preview" data-node-comment-preview="${index}">
          ${item.commentPhoto && sameCommentAuthor(item) ? `<img src="${item.commentPhoto}" alt="Фото комментария">${canEditThisComment ? `<button type="button" data-clear-node-photo="comment" data-node-index="${index}">Удалить фото</button>` : ""}` : ""}
        </div>
        <div class="node-walk-actions node-comment-actions">
          <button type="button" data-node-submit-comment="${index}" ${submitRemarkDisabled ? "disabled" : ""}>${submitRemarkLabel}</button>
          ${productionStopActive ? `<button type="button" data-node-fixed="${index}" ${fixedButtonDisabled ? "disabled" : ""}>${fixedButtonLabel}</button>` : ""}
        </div>
        ${remarkCardsBlock}
        ${downtimeCommentHistory}
      </div>
      <label class="node-walk-check">
        ${downtimeActiveBlock}
        <details class="node-reminder">
          <summary>Памятка</summary>
          ${canEditEquipmentCatalog(eq) ? `
            <textarea data-node-reminder="${index}" rows="6">${escapeHtml(reminderItems.join("\n"))}</textarea>
            <div class="node-reminder-actions">
              <button type="button" data-save-reminder="${index}">Сохранить памятку</button>
              <button type="button" class="secondary" data-cancel-reminder="${index}">Отмена</button>
            </div>
          ` : `
            <ol>
              ${reminderItems.map(text => `<li>${escapeHtml(text)}</li>`).join("")}
            </ol>
          `}
        </details>
      </label>
    `;
    let nodePhotoProcessing = Promise.resolve();
    row.querySelector("[data-back-node-list]")?.addEventListener("click", () => {
      current.nodeDetailIndex = null;
      renderNodeWalkthrough(eq);
    });
    row.querySelector("[data-node-name]")?.addEventListener("change", event => {
      if (!canEditCatalog()) return;
      saveNodeName(eq.id, index, event.target.value);
      renderNodeWalkthrough(equipmentById(eq.id));
    });
    row.querySelector("[data-save-reminder]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
      if (!canEditEquipmentCatalog(eq)) return;
      saveNodeReminder(eq.id, index, row.querySelector(`[data-node-reminder="${index}"]`)?.value || "");
      renderNodeWalkthrough(equipmentById(eq.id));
    }));
    row.querySelector("[data-cancel-reminder]")?.addEventListener("click", () => {
      const textarea = row.querySelector(`[data-node-reminder="${index}"]`);
      if (textarea) textarea.value = reminderItems.join("\n");
    });
    row.querySelectorAll("[data-remark-card]").forEach(card => {
      const remarkId = card.dataset.remarkCard || "";
      const remarkEntry = ensureRemarkEntries(item).find(entry => entry.id === remarkId);
      if (!remarkEntry || remarkEntry.resolved) return;
      const photoKey = `${key(eq.id, index, current.date)}:${remarkId}`;
      card.querySelector("[data-remark-join]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
        await publishRemarkCollaborationAction(eq.id, index, current.date, "start", { remarkId });
        renderNodeWalkthrough(equipmentById(eq.id));
      }, resolutionParticipants(remarkEntry).length ? "Присоединяем..." : "Начинаем..."));
      card.querySelector("[data-remark-add]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
        const select = card.querySelector("[data-remark-user]");
        const participant = eligibleResolutionUsers(eq).find(user => user.key === select?.value);
        if (!participant) {
          select?.focus();
          return;
        }
        await publishRemarkCollaborationAction(eq.id, index, current.date, "add", { remarkId, participant });
        renderNodeWalkthrough(equipmentById(eq.id));
      }, "Добавляем..."));
      card.querySelectorAll("[data-remark-remove]").forEach(button => button.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
        await publishRemarkCollaborationAction(eq.id, index, current.date, "remove", { remarkId, participantKey: event.currentTarget.dataset.remarkRemove || "" });
        renderNodeWalkthrough(equipmentById(eq.id));
      }, "Убираем...")));
      card.querySelector("[data-remark-action-photo]")?.addEventListener("change", async event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
          const photo = await readPhotoFile(file);
          remarkResolutionPhotoDrafts.set(photoKey, photo);
          const preview = card.querySelector(".remark-action-preview");
          if (preview) preview.innerHTML = `<img src="${photo}" alt="Фото работы"><button type="button" data-clear-remark-photo>Удалить фото</button>`;
        } catch {
          window.alert("Не удалось обработать фото. Выберите его ещё раз.");
        }
      });
      card.addEventListener("click", event => {
        if (!event.target.closest("[data-clear-remark-photo]")) return;
        remarkResolutionPhotoDrafts.delete(photoKey);
        const preview = card.querySelector(".remark-action-preview");
        if (preview) preview.innerHTML = "";
      });
      card.querySelector("[data-remark-work-update]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
        const textBox = card.querySelector("[data-remark-action-text]");
        const text = String(textBox?.value || "").trim();
        if (!text) {
          textBox?.focus();
          return;
        }
        await publishRemarkCollaborationAction(eq.id, index, current.date, "update", { remarkId, text, photo: remarkResolutionPhotoDrafts.get(photoKey) || "" });
        remarkResolutionPhotoDrafts.delete(photoKey);
        renderNodeWalkthrough(equipmentById(eq.id));
      }, "Сохраняем..."));
      card.querySelector("[data-remark-resolve]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
        const textBox = card.querySelector("[data-remark-action-text]");
        const text = String(textBox?.value || "").trim();
        if (!text) {
          textBox?.focus();
          return;
        }
        if (!window.confirm("Работа выполнена? Зафиксировать время устранения и передать на подтверждение?")) return;
        await publishRemarkCollaborationAction(eq.id, index, current.date, "resolve", { remarkId, text, photo: remarkResolutionPhotoDrafts.get(photoKey) || "" });
        remarkResolutionPhotoDrafts.delete(photoKey);
        if (current.returnToRemarkListAfterResolve) {
          returnToOpenRemarkCards();
        } else {
          renderNodeWalkthrough(equipmentById(eq.id));
        }
      }, "Публикуется..."));
      card.querySelector("[data-remark-confirm]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
        if (!window.confirm("Подтвердить, что предупреждение действительно устранено?")) return;
        await publishRemarkCollaborationAction(eq.id, index, current.date, "confirm", { remarkId });
        if (current.returnToRemarkListAfterResolve) returnToOpenRemarkCards();
        else renderNodeWalkthrough(equipmentById(eq.id));
      }, "Подтверждаем..."));
      card.querySelector("[data-remark-return]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
        const reason = window.prompt("Что необходимо доработать?");
        if (reason === null) return;
        if (!String(reason).trim()) {
          window.alert("Напишите причину возврата на доработку.");
          return;
        }
        await publishRemarkCollaborationAction(eq.id, index, current.date, "return", { remarkId, reason: String(reason).trim() });
        if (current.returnToRemarkListAfterResolve) returnToOpenRemarkCards();
        else renderNodeWalkthrough(equipmentById(eq.id));
      }, "Возвращаем..."));
    });
    row.querySelector("[data-node-comment]").addEventListener("input", event => {
      if (!canEditComment(item)) return;
      const liveItem = record(eq.id, index, current.date).to;
      liveItem.nodeDraftText = event.target.value;
      liveItem.updatedAt = new Date().toISOString();
      saveState({ remote: false });
      if (event.target.value.trim()) event.target.classList.remove("comment-required-blink");
      const submitButton = row.querySelector(`[data-node-submit-comment="${index}"]`);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Отправить";
      }
    });
    const submitNodeText = async (button, sendChoice) => {
      await nodePhotoProcessing;
      const liveItem = record(eq.id, index, current.date).to;
      if (!canEditComment(liveItem)) return;
      const text = row.querySelector("[data-node-comment]").value;
      if (!text.trim()) {
        const commentBox = row.querySelector("[data-node-comment]");
        commentBox.classList.remove("comment-required-blink");
        void commentBox.offsetWidth;
        commentBox.classList.add("comment-required-blink");
        commentBox.scrollIntoView({ behavior: "smooth", block: "center" });
        commentBox.focus();
        return;
      }
      if (!sendChoice) {
        return;
      }
      if (button.disabled) return;
      setButtonBusy(button, true, "Отправка...");
      try {
        if (sendChoice.downtimeType !== "production") appendCommentEntry(liveItem, text, liveItem.commentPhoto);
        if (sendChoice.downtime) openDowntimeFromRemark(eq.id, index, text, sendChoice.downtimeType);
        window.PPRModules?.comments?.clearComposer?.(liveItem);
        liveItem.nodeDraftText = "";
        syncItemRemarkSummary(liveItem);
        saveState({ remote: false });
        renderNodeWalkthrough(equipmentById(eq.id));
        await publishNodeUpdateNow(eq.id, index, current.date);
        renderNodeWalkthrough(equipmentById(eq.id));
      } catch (error) {
        scheduleRemoteRetry();
      } finally {
        if (button.isConnected) setButtonBusy(button, false);
      }
    };
    row.querySelector("[data-node-submit-comment]").addEventListener("click", async event => {
      const button = event.currentTarget;
      const sendChoice = await askCommentSubmit();
      await submitNodeText(button, sendChoice);
    });
    row.querySelector("[data-node-fixed]")?.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
      if (!canEditChecklist()) return;
      const liveItem = record(eq.id, index, current.date).to;
      const commentBox = row.querySelector("[data-node-comment]");
      const fixText = commentBox.value.trim();
      if (!fixText) {
        commentBox.classList.remove("comment-required-blink");
        void commentBox.offsetWidth;
        commentBox.classList.add("comment-required-blink");
        commentBox.scrollIntoView({ behavior: "smooth", block: "center" });
        commentBox.focus();
        return;
      }
      const activeStop = activeDowntime(eq.id, index);
      if (activeStop?.type === "production") {
        closeDowntimeFromFix(eq.id, index, fixText);
        window.PPRModules?.comments?.clearComposer?.(liveItem);
        liveItem.nodeDraftText = "";
        saveState();
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      if (!hasAnyComment(liveItem)) {
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      if (!canCompleteCollaborativeResolution(liveItem)) return;
      if (!window.confirm("Устранение полностью завершено?")) return;
      appendResolutionCompletion(liveItem);
      const relatedReq = relatedIssuedRequestForNode(eq.id, index, current.date, liveItem);
      if (liveItem.mechanicFixed && !liveItem.resolved && canConfirmInstallation()) {
        markCommentResolved(liveItem, fixText, liveItem.commentPhoto, { preserveExisting: true });
        closeDowntimeFromFix(eq.id, index, fixText);
        liveItem.mechanicFixed = false;
        if (relatedReq) {
          relatedReq.shopInstallApproved = true;
          relatedReq.productionDirectorApproved = false;
          relatedReq.done = false;
          relatedReq.status = "productionDirector";
          clearInstallResponsibilityDeclines(relatedReq);
          syncRequestToRecord(relatedReq);
        } else {
          liveItem.shopInstallApproved = true;
          saveState({ remote: false });
        }
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      if (profile?.role === "shop" || profile?.role === "engineer" || profile?.role === "editor") {
        markCommentResolved(liveItem, fixText, liveItem.commentPhoto);
        closeDowntimeFromFix(eq.id, index, fixText);
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
          clearInstallResponsibilityDeclines(relatedReq);
          syncRequestToRecord(relatedReq);
        } else {
          saveState();
        }
        renderNodeWalkthrough(equipmentById(eq.id));
        return;
      }
      liveItem.mechanicFixed = true;
      liveItem.resolved = false;
      liveItem.shopInstallApproved = false;
      liveItem.productionDirectorApproved = false;
      liveItem.accountingWrittenOff = false;
      saveCommentResolution(liveItem, fixText, liveItem.commentPhoto);
      closeDowntimeFromFix(eq.id, index, fixText);
      if (relatedReq) {
        lockRequestInstalledQty(relatedReq);
        relatedReq.mechanicInstalled = true;
        relatedReq.done = false;
        relatedReq.stock = false;
        relatedReq.shopInstallApproved = false;
        relatedReq.productionDirectorApproved = false;
        relatedReq.accountingWrittenOff = false;
        relatedReq.status = "waitingShopDone";
        clearInstallResponsibilityDeclines(relatedReq);
        syncRequestToRecord(relatedReq);
      } else {
        markCommentResolved(liveItem, "", "", { preserveExisting: true });
        liveItem.mechanicFixed = false;
        saveState();
      }
      renderNodeWalkthrough(equipmentById(eq.id));
    }, "Публикуется..."));
    row.querySelector("[data-node-comment-photo]").addEventListener("change", event => {
      const liveItem = record(eq.id, index, current.date).to;
      if (!canEditComment(liveItem)) return;
      const file = event.target.files?.[0];
      if (!file) return;
      liveItem.nodeDraftText = row.querySelector("[data-node-comment]")?.value || liveItem.nodeDraftText || "";
      if (!sameCommentAuthor(liveItem) && String(liveItem.comment || "").trim()) {
        beginCommentEdit(liveItem, "");
      }
      event.target.value = "";
      const submitButton = row.querySelector(`[data-node-submit-comment="${index}"]`);
      const fixedButton = row.querySelector(`[data-node-fixed="${index}"]`);
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Загрузка фото...";
      }
      if (fixedButton) fixedButton.disabled = true;
      nodePhotoProcessing = (async () => {
        try {
          liveItem.commentPhoto = await readPhotoFile(file);
          setCommentOwner(liveItem);
          liveItem.commentUpdatedAt = new Date().toISOString();
          liveItem.updatedAt = liveItem.commentUpdatedAt;
          saveState({ remote: false });
        } catch {
          window.alert("Не удалось обработать фото. Выберите его ещё раз.");
        }
        renderNodeWalkthrough(eq);
      })();
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
      const target = list.querySelector(`[data-node-walk-index="${targetIndex}"] [data-node-downtime]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("focus-comment");
      target?.focus();
      window.setTimeout(() => target?.classList.remove("focus-comment"), 1600);
    }, 80);
  }
  if (current.scrollToCommentNode !== null && current.scrollToCommentNode !== undefined) {
    const targetIndex = current.scrollToCommentNode;
    const targetRemarkId = current.scrollToRemarkId;
    current.scrollToCommentNode = null;
    current.scrollToRemarkId = "";
    window.setTimeout(() => {
      const row = list.querySelector(`[data-node-walk-index="${targetIndex}"]`);
      const target = (targetRemarkId ? row?.querySelector(`[data-remark-card="${CSS.escape(targetRemarkId)}"]`) : null)
        || row?.querySelector("[data-node-first-comment]")
        || row?.querySelector("[data-node-comment]");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("focus-comment");
      if (!target?.disabled) target?.focus();
      window.setTimeout(() => target?.classList.remove("focus-comment"), 1600);
    }, 80);
  }
}

function nodeWalkStatusText(item) {
  if (item.productionDirectorApproved && !item.accountingWrittenOff && !item.done) return "Подтверждено директором производства. Ждёт ответственного";
  if (item.shopInstallApproved && !item.productionDirectorApproved && !item.done) return "Установка подтверждена. Ждёт директора производства";
  if (item.mechanicFixed && !item.resolved) return "Устранено. Ждёт подтверждения начальника цеха/инженера";
  const openRemarks = openRemarkEntries(item).length;
  if (openRemarks) return `Открытых замечаний: ${openRemarks}`;
  if (item.resolved) return commentResolutionText(item) || "Замечания закрыты";
  if (String(item.nodeDraftText || "").trim() || item.commentPhoto) return "Черновик сохранён. Нажмите «Отправить»";
  if (hasAnyComment(item)) return "Замечания закрыты";
  return "Замечаний нет";
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
    "Если есть замечание, записать комментарий и сделать фото."
  ];
}

function renderRequests() {
  ui.subtitle.textContent = "Заявки";
  if (!canOpenRequestRole(current.requestRole)) current.requestRole = defaultRequestRole();
  const list = document.querySelector("#requestList");
  if (current.requestRole === "warehouse") {
    ui.requestsMeta.textContent = "Склад: приход, остатки и выдача.";
    if (ui.requestSearchInput) ui.requestSearchInput.value = current.requestSearch;
    updateTmcRequestButtonLabels();
    renderEngineerIncomingBanner();
    renderWarehousePanel();
    list.innerHTML = "";
    applyLanguage();
    queueTranslateVisiblePage();
    return;
  }
  updateRoleBadges();
  document.querySelectorAll(".request-tabs .tab").forEach(tab => tab.classList.toggle("active", tab.dataset.role === current.requestRole));
  const all = allRequests();
  const visible = all.filter(req => requestAllowedByUser(req));
  const waitingHere = visible.filter(req => requestNeedsRole(req, current.requestRole)).length;
  ui.requestsMeta.textContent = MANUAL_REQUEST_WORKFLOW
    ? current.requestRole === "warehouse"
      ? `Склад: приход, остатки и выдача.`
      : `Всего заявок: ${visible.length}`
    : `Всего доступно: ${visible.length} · Требуют вашего действия: ${waitingHere}`;
  if (ui.requestSearchInput) ui.requestSearchInput.value = current.requestSearch;
  renderWarehousePanel();
  let rows = all.filter(req => requestVisibleForRole(req, current.requestRole));
  rows = rows.filter(requestMatchesFilters);
  if (current.requestRole === "warehouse") {
    const folderArea = warehouseFolderArea();
    rows = rows.filter(req => (req.stockArea || req.area || "") === folderArea);
    rows = rows.filter(req => !(req.transferredToWarehouse && !req.warehouseReceived && !req.issued && !req.stock && !req.done));
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
    if (!current.warehouseSearch.trim()) rows = rows.slice(0, 40);
  }
  list.innerHTML = "";
  if (!rows.length) list.insertAdjacentHTML("beforeend", `<div class="empty-state">${current.requestRole === "warehouse" ? `В складе "${escapeHtml(warehouseFolderArea())}" нет заявок` : "Нет заявок для этого раздела"}</div>`);
  rows.forEach(req => list.append(requestCard(req)));
  if (current.requestRole === "accounting") {
    list.insertAdjacentHTML("beforeend", renderAccountingWrittenOffList());
    list.querySelector("[data-print-accounting]")?.addEventListener("click", printAccountingWrittenOffReport);
  }
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
  applyLanguage();
  queueTranslateVisiblePage();
}

function directorTodayWalk(eq) {
  const shift = currentWalkShift();
  const rows = eq.nodes.map((_, index) => state.checks?.[key(eq.id, index, shift.date)] || null);
  const done = rows.filter(rec => isNodeShiftChecked(rec, shift.key)).length;
  return { done, total: rows.length, shift };
}

function directorTraffic(done, total, overdue = false) {
  if (overdue || done === 0) return "red";
  if (done < total) return "yellow";
  return "green";
}

function directorOpenRemarks() {
  const result = [];
  Object.entries(state.checks || {}).forEach(([recordKey, rec]) => {
    const [equipmentIdRaw, nodeIndexRaw, date] = recordKey.split(":");
    const eq = equipmentById(Number(equipmentIdRaw));
    const item = rec?.to;
    if (!eq || !item || item.resolved || !hasAnyComment(item)) return;
    result.push({
      equipmentId: eq.id,
      equipment: eq.name,
      node: eq.nodes[Number(nodeIndexRaw)] || "",
      date,
      startedAt: firstCommentTime(item) || `${date}T00:00:00`,
      item
    });
  });
  return result;
}

function directorRecommendedMaintenance(eq, date = todayISO()) {
  const intervalDays = [COMPRESSOR_JOURNAL_AREA, GAS_JOURNAL_AREA].includes(eq.area) ? 7 : 14;
  const dayNumber = Math.floor(new Date(`${date}T00:00:00`).getTime() / 86400000);
  const offset = (dayNumber + Number(eq.id || 0) * 3) % intervalDays;
  const daysUntil = offset === 0 ? 0 : intervalDays - offset;
  const dueDate = addDaysISO(date, daysUntil);
  const nodeIndex = eq.nodes.length ? (dayNumber + Number(eq.id || 0)) % eq.nodes.length : 0;
  return {
    dueDate,
    daysUntil,
    node: eq.nodes[nodeIndex] || eq.name,
    intervalDays
  };
}

function directorRecommendedSchedule(equipment = allEquipment(), days = 14) {
  const activeEquipment = equipment.filter(eq => eq.area !== "Резерв");
  const rows = [];
  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = addDaysISO(todayISO(), dayOffset);
    activeEquipment.forEach(eq => {
      const plan = directorRecommendedMaintenance(eq, date);
      if (plan.daysUntil !== 0) return;
      rows.push({
        date,
        equipment: eq.name,
        area: eq.area,
        node: plan.node,
        intervalDays: plan.intervalDays
      });
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.equipment.localeCompare(b.equipment, "ru"));
}

function recommendedMaintenanceForDate(eq, date) {
  const plan = directorRecommendedMaintenance(eq, date);
  return plan.daysUntil === 0 ? plan : null;
}

function pprCalendarMonthData(equipment = allEquipment(), year = current.pprCalendarYear, month = current.pprCalendarMonth) {
  const activeEquipment = equipment.filter(eq => eq.area !== "Резерв");
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const itemsByDate = {};
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const items = activeEquipment.flatMap(eq => {
      const plan = recommendedMaintenanceForDate(eq, date);
      return plan ? [{
        equipmentId: eq.id,
        equipment: eq.name,
        area: eq.area,
        node: plan.node,
        intervalDays: plan.intervalDays
      }] : [];
    });
    if (items.length) itemsByDate[date] = items;
  }
  return { year, month, daysInMonth, itemsByDate };
}

function pprCalendarShortName(name) {
  return String(name || "")
    .replace(/оборудование/gi, "обор.")
    .replace(/инструментальный/gi, "инструм.")
    .replace(/электроподстанции/gi, "подстанции")
    .replace(/уличное освещение/gi, "освещение")
    .replace(/помещение/gi, "пом.")
    .trim();
}

const PPR_SHEET_DEFAULT_ROWS = 8;

function pprSheetDefaultRows(date, count = PPR_SHEET_DEFAULT_ROWS) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${date}-work-${index + 1}`,
    work: "",
    mark: ""
  }));
}

function pprSheetRecord(date, create = false) {
  state.pprSheets ||= {};
  if (!state.pprSheets[date] && create) {
    state.pprSheets[date] = {
      id: `ppr-sheet:${date}`,
      date,
      rows: pprSheetDefaultRows(date),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedByName: profile?.name || ""
    };
  }
  return state.pprSheets[date] || {
    id: `ppr-sheet:${date}`,
    date,
    rows: pprSheetDefaultRows(date),
    createdAt: "",
    updatedAt: "",
    updatedByName: ""
  };
}

function pprSheetCompletion(date) {
  const sheet = pprSheetRecord(date);
  const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
  // Empty reserve rows never block completion, even if a mark was tapped accidentally.
  const activeRows = rows.filter(row => String(row?.work || "").trim());
  const workersComplete = activeRows.length > 0 && activeRows.every(row =>
    ["done", "na"].includes(row?.mark)
  );
  const approved = Boolean(sheet.approvedAt && sheet.approvedByName);
  const complete = workersComplete && approved;
  const marked = activeRows.filter(row => ["done", "na"].includes(row?.mark)).length;
  return {
    complete,
    partial: activeRows.length > 0 && !complete,
    workersComplete,
    awaitingApproval: workersComplete && !approved,
    approved,
    active: activeRows.length,
    marked
  };
}

function canPlanPprSheet() {
  return ["engineer", "editor"].includes(profile?.role);
}

function canMarkPprSheet() {
  return ["mechanic", "electrician", "editor"].includes(profile?.role);
}

function canApprovePprSheet() {
  return ["engineer", "editor"].includes(profile?.role);
}

function touchPprSheet(sheet, remote = true) {
  sheet.updatedAt = new Date().toISOString();
  sheet.updatedByName = profile?.name || sheet.updatedByName || "";
  if (remote) saveState();
  else persistStateLocally(state);
}

async function publishPprSheetAction(date, action, details = {}) {
  const result = await apiJson("/api/ppr-sheet/action", {
    method: "POST",
    timeout: 15000,
    body: JSON.stringify({
      date,
      action,
      ...details,
      actionId: nextActionId(),
      clientId: CLIENT_ID,
      user: profile ? { name: profile.name || "", role: profile.role || "", phone: profile.phone || "" } : null
    })
  });
  if (result?.state) mergeRealtimePatch(result.state);
  if (result?.stateVersion) setRealtimeStateVersion(result.stateVersion);
  return result;
}

function renderPprMaintenanceSheet(date, scheduledItems = []) {
  const sheet = pprSheetRecord(date);
  const savedRows = Array.isArray(sheet.rows) && sheet.rows.length ? sheet.rows : pprSheetDefaultRows(date);
  const rows = [...savedRows];
  while (rows.length < scheduledItems.length) {
    rows.push({ id: `${date}-work-${rows.length + 1}`, work: "", mark: "" });
  }
  const completion = pprSheetCompletion(date);
  const locked = Boolean(sheet.approvedAt);
  const canPlan = canPlanPprSheet() && !locked;
  const canMark = canMarkPprSheet() && !locked;
  const scheduleNames = [...new Set(scheduledItems.map(item =>
    [item.equipment, item.node].filter(Boolean).join(" — ")
  ).filter(Boolean))];
  const statusText = completion.complete
    ? `ППР принят инженером · лист закреплён за ${dateHuman(date)}`
    : completion.awaitingApproval
      ? "Все работы отмечены · ожидается обход и приёмка инженером"
    : completion.active
      ? `Заполнено отметок: ${completion.marked} из ${completion.active}`
      : "Инженер должен заполнить перечень работ";
  const rowHtml = rows.map((row, index) => {
    const scheduled = scheduledItems[index] || (scheduledItems.length === 1 ? scheduledItems[0] : null);
    const equipmentId = row.equipmentId || scheduled?.equipmentId || "";
    const equipmentName = row.equipment || scheduled?.equipment || "";
    const nodeName = row.node || scheduled?.node || "";
    const areaName = row.area || scheduled?.area || "";
    return `
    <tr data-ppr-sheet-row="${escapeHtml(row.id)}">
      <td class="ppr-sheet-number">${index + 1}</td>
      <td class="ppr-sheet-work">
        <textarea data-ppr-work-input="${escapeHtml(row.id)}" data-ppr-equipment-id="${escapeHtml(equipmentId)}" data-ppr-equipment="${escapeHtml(equipmentName)}" data-ppr-node="${escapeHtml(nodeName)}" data-ppr-area="${escapeHtml(areaName)}" rows="2" placeholder="Инженер записывает работу" ${canPlan ? "" : "readonly"}>${escapeHtml(row.work || "")}</textarea>
      </td>
      <td class="ppr-sheet-mark">
        <div class="ppr-sheet-mark-buttons" role="group" aria-label="Отметка по строке ${index + 1}">
          <button type="button" class="done ${row.mark === "done" ? "active" : ""}" data-ppr-row-mark="${escapeHtml(row.id)}" data-ppr-mark-value="done" ${canMark && String(row.work || "").trim() ? "" : "disabled"} aria-label="Выполнено">✓</button>
          <button type="button" class="na ${row.mark === "na" ? "active" : ""}" data-ppr-row-mark="${escapeHtml(row.id)}" data-ppr-mark-value="na" ${canMark && String(row.work || "").trim() ? "" : "disabled"} aria-label="Не требуется">−</button>
        </div>
        ${row.markedByName ? `<small class="ppr-row-author">${escapeHtml(row.markedByName)} · ${escapeHtml(requestRoleLabel(row.markedByRole) || row.markedByRole || "")}</small>` : ""}
        <strong class="ppr-sheet-print-mark">${row.mark === "done" ? "✓" : row.mark === "na" ? "−" : ""}</strong>
      </td>
    </tr>
  `;
  }).join("");
  return `
    <section class="ppr-maintenance-sheet ${completion.complete ? "complete" : ""}" data-ppr-sheet-date="${date}">
      <header class="ppr-sheet-header">
        <div>
          <span>Лист планового обслуживания</span>
          <h3>ППР · ${dateHuman(date)}</h3>
        </div>
        <button type="button" class="secondary no-print" data-print-ppr-sheet="${date}">🖨️ Печать</button>
      </header>
      ${scheduleNames.length ? `<p class="ppr-sheet-equipment"><strong>По графику:</strong> ${escapeHtml(scheduleNames.join("; "))}</p>` : ""}
      <div class="ppr-sheet-table-wrap">
        <table class="ppr-sheet-table">
          <thead>
            <tr><th rowspan="2">№</th><th rowspan="2">Перечень работ</th><th>План обслуживания</th></tr>
            <tr><th>A</th></tr>
          </thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </div>
      <footer class="ppr-sheet-footer">
        <div class="ppr-sheet-state ${completion.complete ? "done" : completion.partial ? "partial" : "empty"}">
          <strong>${completion.complete ? "✓" : completion.partial ? "!" : "○"}</strong>
          <span>${escapeHtml(statusText)}</span>
        </div>
        ${sheet.plannedByName || sheet.updatedByName ? `<small>План составил: ${escapeHtml(sheet.plannedByName || sheet.updatedByName)}${sheet.plannedAt || sheet.updatedAt ? ` · ${dateTimeHuman(sheet.plannedAt || sheet.updatedAt)}` : ""}</small>` : ""}
        ${sheet.approvedByName ? `<small>Принял: ${escapeHtml(sheet.approvedByName)} · ${dateTimeHuman(sheet.approvedAt)}</small>` : ""}
        ${!sheet.updatedByName ? `<small>Лист будет сохранён за этой датой и останется доступен в календаре.</small>` : ""}
        ${canPlan ? `<button type="button" class="secondary no-print" data-add-ppr-row="${date}">+ Добавить строку</button>` : ""}
        ${completion.awaitingApproval && canApprovePprSheet() ? `<button type="button" class="primary no-print" data-approve-ppr-sheet="${date}">Принять выполненные работы</button>` : ""}
      </footer>
    </section>
  `;
}

function printPprMaintenanceSheet(date) {
  const sheet = document.querySelector(`[data-ppr-sheet-date="${date}"]`);
  if (!sheet) return;
  const oldTitle = document.title;
  document.title = `Лист ППР ${date}`;
  document.body.classList.add("printing-ppr-sheet");
  const cleanup = () => {
    document.title = oldTitle;
    document.body.classList.remove("printing-ppr-sheet");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  window.setTimeout(cleanup, 1800);
}

function pprJournalCompletion(eq, date, node = "") {
  if (date < PPR_RECOMMENDED_START_DATE) {
    return { complete: false, partial: false, ignored: true, author: "", updatedAt: "" };
  }
  if (eq.area === COMPRESSOR_JOURNAL_AREA) {
    const rows = compressorJournalDateRows(eq.area, date);
    const complete = compressorJournalDateComplete(eq.area, date);
    const author = rows.map(row => row.checkedBy).filter(Boolean).join(", ");
    const updatedAt = rows.map(row => row.updatedAt).filter(Boolean).sort().pop() || "";
    return { complete, partial: rows.some(row => compressorJournalRowComplete(row)), author, updatedAt };
  }
  if (eq.area === GAS_JOURNAL_AREA) {
    const rows = [gasJournalRecord("A", date), gasJournalRecord("B", date)];
    const complete = gasJournalDateComplete(date);
    const author = rows.map(row => row.checkedBy).filter(Boolean).join(", ");
    const updatedAt = rows.map(row => row.updatedAt).filter(Boolean).sort().pop() || "";
    return { complete, partial: gasJournalRowCompleteA(date) || gasJournalRowCompleteB(date), author, updatedAt };
  }
  const nodeIndex = Math.max(0, eq.nodes.indexOf(node));
  const rec = getRecord(eq.id, nodeIndex, date);
  const item = rec?.to || {};
  const complete = nodeWalkCompletion(rec, date).complete || Boolean(
    item.resolved ||
    item.mechanicFixed ||
    item.shopInstallApproved ||
    item.productionDirectorApproved ||
    item.accountingWrittenOff
  );
  const partial = !complete && (nodeWalkCompletion(rec, date).partial || hasMeaningfulCheckKind(item));
  const author = item.updatedByName || item.checkedBy || item.commentOwnerName || item.resolvedByName || "";
  const updatedAt = item.updatedAt || item.commentUpdatedAt || item.resolvedAt || "";
  return {
    complete,
    partial,
    author,
    updatedAt
  };
}

function openPprLinkedJournal(date, equipmentId, node = "") {
  const eq = equipmentById(Number(equipmentId));
  if (!eq) return;
  closeGlobalReminderPanel();
  if ([COMPRESSOR_JOURNAL_AREA, GAS_JOURNAL_AREA].includes(eq.area)) {
    if (eq.area === COMPRESSOR_JOURNAL_AREA) {
      current.compressorBaseDate = date;
      current.compressorSheetIndex = 0;
    } else {
      current.gasBaseDateA = date;
      current.gasBaseDateB = date;
      current.gasSheetIndexA = 0;
      current.gasSheetIndexB = 0;
    }
    current.selectedAggregateArea = eq.area;
    show("aggregateJournal");
    return;
  }
  current.equipmentId = eq.id;
  const scheduledNodeIndex = eq.nodes.indexOf(node);
  current.nodeIndex = scheduledNodeIndex >= 0 ? scheduledNodeIndex : 0;
  current.nodeDetailIndex = current.nodeIndex;
  current.date = date;
  current.kind = "to";
  current.scrollToCommentNode = current.nodeIndex;
  current.scrollToDowntimeNode = null;
  current.month = Number(date.slice(5, 7)) - 1;
  current.year = Number(date.slice(0, 4));
  if (canOpenEquipmentDate(date)) show("checklist");
  else show("schedule");
}

function renderPprMonthCalendar(equipment = allEquipment()) {
  const data = pprCalendarMonthData(equipment);
  const monthDate = new Date(data.year, data.month, 1);
  const monthLabel = monthDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const leadingDays = (monthDate.getDay() + 6) % 7;
  const monthPrefix = `${data.year}-${String(data.month + 1).padStart(2, "0")}`;
  const defaultDate = todayISO().startsWith(monthPrefix) ? todayISO() : `${monthPrefix}-01`;
  const selectedDate = String(current.pprCalendarSelectedDate || "").startsWith(monthPrefix)
    ? current.pprCalendarSelectedDate
    : defaultDate;
  current.pprCalendarSelectedDate = selectedDate;
  const cells = [];
  for (let index = 0; index < leadingDays; index += 1) {
    cells.push(`<div class="ppr-calendar-day empty" aria-hidden="true"></div>`);
  }
  for (let day = 1; day <= data.daysInMonth; day += 1) {
    const date = `${data.year}-${String(data.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const items = data.itemsByDate[date] || [];
    const itemStatuses = items.map(item => pprJournalCompletion(equipmentById(item.equipmentId), date, item.node));
    const sheetStatus = pprSheetCompletion(date);
    const usesSheet = sheetStatus.active > 0;
    const dayDone = items.length && (usesSheet ? sheetStatus.complete : itemStatuses.every(item => item.complete));
    const dayPartial = usesSheet ? sheetStatus.partial : itemStatuses.some(item => item.partial && !item.complete);
    const activeIncomplete = itemStatuses.some(item => !item.complete && !item.ignored);
    const dayMissed = date < todayISO() && !sheetStatus.awaitingApproval && (usesSheet ? !sheetStatus.complete : activeIncomplete);
    const dayWarning = date >= todayISO() && (usesSheet ? !sheetStatus.complete : activeIncomplete);
    const stateClass = dayDone ? "completed" : sheetStatus.awaitingApproval ? "warning" : dayMissed ? "missed" : dayPartial || dayWarning ? "warning" : items.length ? "history" : "";
    const statusIcon = dayDone ? "✓" : sheetStatus.awaitingApproval ? "!" : dayMissed ? "×" : dayPartial || dayWarning ? "!" : "";
    const statusText = dayDone
      ? "ППР принят инженером"
      : sheetStatus.awaitingApproval
        ? "Работы выполнены · ожидают приёмки инженером"
        : dayMissed
          ? "ППР не выполнен"
          : dayPartial
            ? "ППР выполнен частично"
            : dayWarning
              ? "Приближается срок ППР"
              : items.length ? "Архивный график" : "Работ нет";
    cells.push(`
      <button type="button" class="ppr-calendar-day ${date === todayISO() ? "today" : ""} ${date === selectedDate ? "selected" : ""} ${stateClass}" data-ppr-day-date="${date}" aria-pressed="${date === selectedDate ? "true" : "false"}" title="${escapeHtml(`${dateHuman(date)} · ${statusText}`)}">
        <time datetime="${date}">${day}</time>
        ${statusIcon ? `<span class="ppr-day-status" aria-label="${escapeHtml(statusText)}">${statusIcon}</span>` : ""}
        ${items.length > 1 ? `<small class="ppr-day-count">${items.length}</small>` : ""}
      </button>
    `);
  }
  const selectedItems = data.itemsByDate[selectedDate] || [];
  return `
    <div class="ppr-calendar-toolbar">
      <strong>${escapeHtml(monthLabel)}</strong>
      <div>
        <button type="button" data-ppr-calendar-shift="-1" aria-label="Предыдущий месяц">‹</button>
        <button type="button" data-ppr-calendar-shift="1" aria-label="Следующий месяц">›</button>
      </div>
    </div>
    <div class="ppr-calendar-legend" aria-label="Обозначения календаря">
      <span class="done">✓ Сделано</span><span class="missed">× Не сделано</span><span class="warning">! Внимание</span>
    </div>
    <div class="ppr-calendar-weekdays">
      ${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(day => `<span>${day}</span>`).join("")}
    </div>
    <div class="ppr-calendar-grid">${cells.join("")}</div>
    <section class="ppr-selected-day">
      <div><span>Выбранный день</span><strong>${dateHuman(selectedDate)}</strong></div>
      <div class="ppr-calendar-tasks">${selectedItems.length ? renderPprMaintenanceSheet(selectedDate, selectedItems) : `<p>На этот день работ ППР нет</p>`}</div>
    </section>
  `;
}

function shiftPprCalendar(monthDelta) {
  current.pprCalendarMonth += Number(monthDelta || 0);
  if (current.pprCalendarMonth < 0) {
    current.pprCalendarMonth = 11;
    current.pprCalendarYear -= 1;
  }
  if (current.pprCalendarMonth > 11) {
    current.pprCalendarMonth = 0;
    current.pprCalendarYear += 1;
  }
  current.pprCalendarSelectedDate = "";
}

function bindPprCalendarControls(container, rerender) {
  container?.querySelectorAll("[data-ppr-calendar-shift]").forEach(button => {
    button.addEventListener("click", () => {
      shiftPprCalendar(button.dataset.pprCalendarShift);
      rerender();
    });
  });
  container?.querySelectorAll("[data-ppr-day-date]").forEach(button => {
    button.addEventListener("click", () => {
      current.pprCalendarSelectedDate = button.dataset.pprDayDate;
      rerender();
      window.setTimeout(() => {
        const selected = container.querySelector(`[data-ppr-sheet-date="${button.dataset.pprDayDate}"]`) || container.querySelector(".ppr-selected-day");
        selected?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    });
  });
  container?.querySelectorAll("[data-ppr-work-input]").forEach(input => {
    input.addEventListener("input", () => {
      const date = input.closest("[data-ppr-sheet-date]")?.dataset.pprSheetDate;
      if (!date) return;
      const sheet = pprSheetRecord(date, true);
      let row = sheet.rows.find(item => item.id === input.dataset.pprWorkInput);
      if (!row) {
        row = { id: input.dataset.pprWorkInput, work: "", mark: "" };
        sheet.rows.push(row);
      }
      if (row.work !== input.value && row.mark) {
        row.mark = "";
        row.markedByName = "";
        row.markedByRole = "";
        row.markedAt = "";
      }
      row.work = input.value;
      row.equipmentId = input.dataset.pprEquipmentId || row.equipmentId || "";
      row.equipment = input.dataset.pprEquipment || row.equipment || "";
      row.node = input.dataset.pprNode || row.node || "";
      row.area = input.dataset.pprArea || row.area || "";
      sheet.plannedByName = profile?.name || sheet.plannedByName || "";
      sheet.plannedByRole = profile?.role || sheet.plannedByRole || "";
      sheet.plannedAt ||= new Date().toISOString();
      touchPprSheet(sheet);
    });
  });
  container?.querySelectorAll("[data-ppr-row-mark]").forEach(button => {
    button.addEventListener("click", async () => {
      const date = button.closest("[data-ppr-sheet-date]")?.dataset.pprSheetDate;
      if (!date) return;
      const sheet = pprSheetRecord(date, true);
      const row = sheet.rows.find(item => item.id === button.dataset.pprRowMark);
      if (!row) return;
      const workInput = button.closest("tr")?.querySelector("[data-ppr-work-input]");
      row.equipmentId = workInput?.dataset.pprEquipmentId || row.equipmentId || "";
      row.equipment = workInput?.dataset.pprEquipment || row.equipment || "";
      row.node = workInput?.dataset.pprNode || row.node || "";
      row.area = workInput?.dataset.pprArea || row.area || "";
      row.mark = row.mark === button.dataset.pprMarkValue ? "" : button.dataset.pprMarkValue;
      row.markedByName = row.mark ? profile?.name || "" : "";
      row.markedByRole = row.mark ? profile?.role || "" : "";
      row.markedAt = row.mark ? new Date().toISOString() : "";
      touchPprSheet(sheet, false);
      try {
        await publishPprSheetAction(date, "mark", {
          rowId: row.id,
          mark: row.mark,
          equipmentId: row.equipmentId,
          equipment: row.equipment,
          node: row.node,
          area: row.area
        });
      } catch {
        saveState();
      }
      rerender();
    });
  });
  container?.querySelectorAll("[data-add-ppr-row]").forEach(button => {
    button.addEventListener("click", async () => {
      const date = button.dataset.addPprRow;
      const sheet = pprSheetRecord(date, true);
      const row = { id: `${date}-work-${Date.now()}`, work: "", mark: "" };
      sheet.rows.push(row);
      touchPprSheet(sheet, false);
      try {
        await publishPprSheetAction(date, "add-row", { rowId: row.id });
      } catch {
        saveState();
      }
      rerender();
    });
  });
  container?.querySelectorAll("[data-print-ppr-sheet]").forEach(button => {
    button.addEventListener("click", () => printPprMaintenanceSheet(button.dataset.printPprSheet));
  });
  container?.querySelectorAll("[data-approve-ppr-sheet]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!canApprovePprSheet()) return;
      const date = button.dataset.approvePprSheet;
      const sheet = pprSheetRecord(date, true);
      const completion = pprSheetCompletion(date);
      if (!completion.workersComplete) return;
      sheet.approvedAt = new Date().toISOString();
      sheet.approvedByName = profile?.name || "";
      sheet.approvedByRole = profile?.role || "engineer";
      sheet.lockedAt = sheet.approvedAt;
      touchPprSheet(sheet, false);
      try {
        await publishPprSheetAction(date, "approve");
      } catch {
        saveState();
      }
      rerender();
    });
  });
}

function directorCalendarItems(equipment = allEquipment()) {
  const activeEquipment = equipment.filter(eq => eq.area !== "Резерв");
  const maintenance = activeEquipment
    .map(eq => ({ eq, plan: directorRecommendedMaintenance(eq) }))
    .filter(item => item.plan.daysUntil === 0)
    .map(({ eq, plan }) => ({
      type: "maintenance",
      icon: pprJournalCompletion(eq, todayISO(), plan.node).complete ? "✅" : "⏰",
      color: pprJournalCompletion(eq, todayISO(), plan.node).complete ? "green" : "yellow",
      title: `ТО: ${plan.node}`,
      text: pprJournalCompletion(eq, todayISO(), plan.node).complete ? `${eq.name} · выполнено по журналу` : `${eq.name} · ожидает заполнения журнала`
    }));
  return maintenance;
}

function directorReminderItems(equipment = allEquipment()) {
  const items = [];
  const overdueRequests = allRequests().filter(req =>
    !req.done && !req.stock && !req.rejected && !req.deleted && requestIsOverdue(req)
  );
  overdueRequests.forEach(req => items.push({
    level: "red",
    icon: "📋",
    title: `Просрочена заявка ${req.requestNumber || ""}`.trim(),
    text: req.equipment || req.area || req.text || "Требуется обработка"
  }));
  equipment.filter(eq => eq.area !== "Резерв").forEach(eq => {
    const plan = directorRecommendedMaintenance(eq);
    const journalComplete = pprJournalCompletion(eq, plan.dueDate, plan.node).complete;
    if (plan.daysUntil <= 2 && !journalComplete) {
      items.push({
        level: plan.daysUntil === 0 ? "red" : "yellow",
        icon: "⏰",
        title: plan.daysUntil === 0 ? `Сегодня ТО: ${plan.node}` : `Подходит срок ТО: ${plan.node}`,
        text: `${eq.name} · ${plan.daysUntil === 0 ? "сегодня" : dateHuman(plan.dueDate)}`
      });
    }
  });
  return items;
}

function globalControlEquipment() {
  return visibleEquipment().filter(eq => eq.area !== "Резерв");
}

function globalReminderItems(equipment = globalControlEquipment()) {
  const equipmentIds = new Set(equipment.map(eq => Number(eq.id)));
  const areas = new Set(equipment.map(eq => eq.area));
  const items = [];
  if (["engineer", "editor"].includes(profile?.role)) {
    Object.keys(state.pprSheets || {})
      .filter(date => pprSheetCompletion(date).awaitingApproval)
      .sort()
      .forEach(date => items.push({
        level: "yellow",
        icon: "✅",
        title: "ППР ожидает приёмки инженером",
        text: `${dateHuman(date)} · выполненные работы нужно проверить обходом`,
        pprApprovalDate: date
      }));
  }
  allRequests()
    .filter(req =>
      !req.done && !req.stock && !req.rejected && !req.deleted &&
      requestIsOverdue(req) && requestAllowedByUser(req) &&
      (!equipment.length || !req.equipmentId || equipmentIds.has(Number(req.equipmentId)) || areas.has(req.area))
    )
    .forEach(req => items.push({
      level: "red",
      icon: "📋",
      title: `Просрочена заявка ${req.requestNumber || ""}`.trim(),
      text: req.equipment || req.area || req.text || "Требуется обработка"
    }));
  equipment.forEach(eq => {
    const plan = directorRecommendedMaintenance(eq);
    const journalComplete = pprJournalCompletion(eq, plan.dueDate, plan.node).complete;
    if (plan.daysUntil <= 2 && !journalComplete) {
      items.push({
        level: plan.daysUntil === 0 ? "red" : "yellow",
        icon: "⏰",
        title: plan.daysUntil === 0 ? `Сегодня ТО: ${plan.node}` : `Подходит срок ТО: ${plan.node}`,
        text: `${eq.name} · ${plan.daysUntil === 0 ? "сегодня" : dateHuman(plan.dueDate)}`
      });
    }
  });
  return items;
}

function renderGlobalReminderPanel() {
  if (!ui.globalReminderButton || !ui.globalReminderContent) return;
  if (!profile) {
    ui.globalReminderButton.hidden = true;
    return;
  }
  ui.globalReminderButton.hidden = false;
  const equipment = globalControlEquipment();
  const reminders = globalReminderItems(equipment);
  const calendar = directorCalendarItems(equipment);
  const monthCalendar = renderPprMonthCalendar(allEquipment());
  updateGlobalReminderBadge(reminders);
  const calendarRows = calendar.map(item => `
    <div class="director-calendar-row ${item.color}">
      <span class="director-calendar-icon">${item.icon}</span>
      <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.text)}</small></div>
    </div>
  `).join("");
  const reminderRows = reminders.map(item => `
    <div class="director-reminder-row ${item.level}" ${item.pprApprovalDate ? `data-open-ppr-approval="${escapeHtml(item.pprApprovalDate)}" role="button" tabindex="0"` : ""}>
      <span>${item.icon}</span>
      <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.text)}</small></div>
    </div>
  `).join("");
  ui.globalReminderContent.innerHTML = `
    <div class="global-control-date">Сегодня · ${dateHuman(todayISO())}</div>
    <div class="global-control-grid">
      <section>
        <div class="director-section-head"><div><span>🔔</span><h2>Напоминания</h2></div><strong>${reminders.length}</strong></div>
        <div class="director-reminder-list">${reminderRows || `<div class="director-empty-ok"><span class="traffic-dot"></span><strong>Всё выполнено, срочных напоминаний нет</strong></div>`}</div>
      </section>
      <section>
        <div class="director-section-head"><div><span>📅</span><h2>Календарь ППР</h2></div><small>Сегодня</small></div>
        <div class="director-calendar-list">${calendarRows || `<div class="director-empty-ok"><strong>На сегодня работ нет</strong></div>`}</div>
        <p class="director-safe-note">✅ Заполнение соответствующего агрегатного журнала автоматически подтверждает выполнение ТО.</p>
      </section>
    </div>
    <section class="global-ppr-month-card">
      <div class="director-section-head"><div><span>🗓️</span><h2>Общий график ППР завода</h2></div><small>Доступен всем</small></div>
      ${monthCalendar}
    </section>
  `;
  bindPprCalendarControls(ui.globalReminderContent, renderGlobalReminderPanel);
  ui.globalReminderContent.querySelectorAll("[data-open-ppr-approval]").forEach(row => {
    const openDate = () => {
      const date = row.dataset.openPprApproval;
      current.pprCalendarYear = Number(date.slice(0, 4));
      current.pprCalendarMonth = Number(date.slice(5, 7)) - 1;
      current.pprCalendarSelectedDate = date;
      renderGlobalReminderPanel();
      window.setTimeout(() => ui.globalReminderContent.querySelector(`[data-ppr-sheet-date="${date}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    };
    row.addEventListener("click", openDate);
    row.addEventListener("keydown", event => {
      if (["Enter", " "].includes(event.key)) { event.preventDefault(); openDate(); }
    });
  });
}

function updateGlobalReminderBadge(knownReminders = null) {
  if (!ui.globalReminderButton || !ui.globalReminderBadge || !profile) return;
  const reminders = Array.isArray(knownReminders) ? knownReminders : globalReminderItems(globalControlEquipment());
  ui.globalReminderBadge.textContent = reminders.length;
  ui.globalReminderButton.classList.toggle("has-alerts", reminders.length > 0);
  ui.globalReminderButton.classList.toggle("all-clear", reminders.length === 0);
}

function directorEquipmentHealth(eq) {
  const walk = directorTodayWalk(eq);
  const missingRatio = walk.total ? Math.max(walk.total - walk.done, 0) / walk.total : 0;
  const remarks = directorOpenRemarks().filter(item => item.equipmentId === eq.id).length;
  const journal = directorJournalState(eq);
  const overdueDays = eq.area === COMPRESSOR_JOURNAL_AREA
    ? compressorJournalIncompleteDays(eq.area)
    : eq.area === GAS_JOURNAL_AREA
      ? gasJournalIncompleteDays()
      : 0;
  const emergencyRequests = allRequests().filter(req =>
    !req.done && !req.stock && !req.rejected && !req.deleted &&
    req.priority === "emergency" &&
    (Number(req.equipmentId) === eq.id || (!req.equipmentId && req.area === eq.area))
  ).length;
  const since = Date.now() - 30 * 86400000;
  const repairs = downtimes().filter(item =>
    item.type !== "production" &&
    (Number(item.equipmentId) === eq.id || (!item.equipmentId && item.area === eq.area)) &&
    Date.parse(item.startedAt || "") >= since
  ).length;
  const score = Math.max(0, Math.min(100, Math.round(
    100
    - Math.min(remarks * 5, 20)
    - Math.round(missingRatio * 25)
    - Math.min(overdueDays * 3, 15)
    - Math.min(emergencyRequests * 15, 30)
    - Math.min(repairs * 4, 20)
    - (journal.color === "red" && !overdueDays ? 5 : 0)
  )));
  const color = window.PPRModules.director.healthBand(score);
  return { score, color, remarks, overdueDays, emergencyRequests, repairs };
}

function directorRemarkOverdue(item) {
  const started = Date.parse(item?.startedAt || "");
  return Number.isFinite(started) && Date.now() - started >= 3 * 86400000;
}

function directorItemTimeMs(item, fallbackDate = "") {
  const raw = item?.startedAt || item?.createdAt || item?.registeredAt || item?.date || fallbackDate || "";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? `${raw}T00:00:00` : raw;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : 0;
}

function directorWithinLastDay(item, fallbackDate = "") {
  const ms = directorItemTimeMs(item, fallbackDate);
  return ms > 0 && Date.now() - ms < 24 * 60 * 60 * 1000;
}

function directorOlderThanDay(item, fallbackDate = "") {
  const ms = directorItemTimeMs(item, fallbackDate);
  return ms > 0 && Date.now() - ms >= 24 * 60 * 60 * 1000;
}

function directorRecentRequests() {
  return allRequests()
    .filter(req => !req.done && !req.stock && !req.rejected && !req.deleted)
    .filter(req => directorWithinLastDay(req, req.date));
}

function directorArchivedRequests() {
  return allRequests()
    .filter(req => !req.done && !req.stock && !req.rejected && !req.deleted)
    .filter(req => directorOlderThanDay(req, req.date));
}

function directorRecentRemarks() {
  return directorOpenRemarks().filter(remark => directorWithinLastDay(remark, remark.date));
}

function directorArchivedRemarks() {
  return directorOpenRemarks().filter(remark => directorOlderThanDay(remark, remark.date));
}

function directorJournalState(eq) {
  if (eq.area === COMPRESSOR_JOURNAL_AREA) {
    const overdue = compressorJournalIncompleteDays(eq.area);
    return {
      color: overdue ? (overdue >= 3 ? "red" : "yellow") : "green",
      text: overdue ? overdueDaysText(overdue) : "Выполнено"
    };
  }
  if (eq.area === GAS_JOURNAL_AREA) {
    const overdue = gasJournalIncompleteDays();
    return {
      color: overdue ? (overdue >= 3 ? "red" : "yellow") : "green",
      text: overdue ? overdueDaysText(overdue) : "Выполнено"
    };
  }
  const walk = directorTodayWalk(eq);
  return {
    color: directorTraffic(walk.done, walk.total),
    text: walk.done === walk.total ? "Выполнено" : walk.done ? `${walk.done}/${walk.total} узлов` : "Не заполнено"
  };
}

function directorRequestStats() {
  const requests = directorRecentRequests();
  const archive = directorArchivedRequests();
  return {
    open: requests.length,
    archive: archive.length,
    approval: requests.filter(req => ["shop", "engineer", "financePre", "finance", "cash", "productionDirector", "accounting"].includes(waitingRole(req))).length,
    purchase: requests.filter(req => req.route !== "stock").length,
    warehouse: requests.filter(req => ["warehouse", "waitingWarehouse"].includes(req.status) || waitingRole(req) === "warehouse").length,
    overdue: requests.filter(requestIsOverdue).length
  };
}

function directorActiveRequests() {
  return directorRecentRequests();
}

function directorRequestDetailRows(requests = directorActiveRequests(), archiveMode = false) {
  if (!requests.length) return `<div class="director-empty-ok"><span class="traffic-dot"></span><strong>${archiveMode ? "В архиве заявок нет" : "Заявок за последние 24 часа нет"}</strong></div>`;
  return requests.map(req => {
    const role = waitingRole(req);
    const holder = requestRoleLabel(role);
    const overdue = requestIsOverdue(req);
    return `
      <div class="director-info-row ${overdue ? "red" : ""}">
        <span class="traffic-dot"></span>
        <div>
          <strong>${escapeHtml(req.requestNumber || "Заявка")}${req.equipment ? ` · ${escapeHtml(req.equipment)}` : ""}</strong>
          <p>${escapeHtml(req.text || "Описание отсутствует")}</p>
          <small>${escapeHtml(req.area || "")}${req.node ? ` · ${escapeHtml(req.node)}` : ""}${req.dueDate ? ` · Срок ${dateHuman(req.dueDate)}` : ""}</small>
        </div>
        <div class="director-info-owner">
          <b>${overdue ? "Просрочено" : statusText(req.status || req.requestStatus || "")}</b>
          <span>Сейчас у: ${escapeHtml(holder)}</span>
        </div>
      </div>`;
  }).join("");
}

function directorRemarkDetailRows(remarks = directorOpenRemarks()) {
  if (!remarks.length) return `<div class="director-empty-ok"><span class="traffic-dot"></span><strong>Открытых замечаний нет</strong></div>`;
  return remarks.map(remark => {
    const entry = firstRemarkEntry(remark.item);
    const overdue = directorRemarkOverdue(remark);
    const author = entry?.name || remark.item?.commentOwnerName || "";
    return `
      <div class="director-info-row ${overdue ? "red" : "yellow"}">
        <span class="traffic-dot"></span>
        <div>
          <strong>${escapeHtml(remark.equipment)}${remark.node ? ` · ${escapeHtml(remark.node)}` : ""}</strong>
          <p>${escapeHtml(entry?.text || remark.item?.comment || "Текст замечания отсутствует")}</p>
          <small>${dateHuman(remark.date)}${author ? ` · Записал: ${escapeHtml(author)}` : ""}</small>
        </div>
        <div class="director-info-owner">
          <b>${overdue ? "Просрочено" : "Открыто"}</b>
          <span>${overdue ? "Требует внимания" : "Ожидает устранения"}</span>
        </div>
      </div>`;
  }).join("");
}

function directorUserStats() {
  const users = loadUsers().filter(user => user.approved !== false && user.pendingApproval !== true);
  const today = todayISO();
  const worked = users.filter(user => String(user.lastLoginAt || "").slice(0, 10) === today).length;
  return { total: users.length, worked, absent: Math.max(users.length - worked, 0) };
}

function directorTodayDowntimeStats() {
  const start = new Date(`${todayISO()}T00:00:00`).getTime();
  const end = start + 86400000;
  const now = Date.now();
  const items = downtimes()
    .map(item => {
      const itemStart = Date.parse(item.startedAt || "");
      const itemEnd = item.endedAt ? Date.parse(item.endedAt) : now;
      const overlapMs = Math.max(Math.min(itemEnd, end) - Math.max(itemStart, start), 0);
      return { ...item, todayMs: overlapMs };
    })
    .filter(item => item.todayMs > 0)
    .sort((a, b) => Number(!b.endedAt) - Number(!a.endedAt) || String(b.startedAt).localeCompare(String(a.startedAt)));
  const active = items.filter(item => !item.endedAt);
  return {
    items,
    active,
    totalMs: items.reduce((sum, item) => sum + item.todayMs, 0),
    production: items.filter(item => item.type === "production").length,
    breakdown: items.filter(item => item.type !== "production").length
  };
}

function directorAnnualYear() {
  return new Date().getFullYear();
}

function directorMonthName(index) {
  return new Date(directorAnnualYear(), index, 1).toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
}

function directorAnnualEmptyMonths() {
  return Array.from({ length: 12 }, (_, index) => ({
    index,
    label: directorMonthName(index),
    repairsCreated: 0,
    repairsClosed: 0,
    stops: 0,
    downtimeMs: 0,
    breakdowns: 0,
    qrDone: 0,
    qrPlan: 0
  }));
}

function dateYearMonth(value) {
  const ms = Date.parse(value || "");
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function annualRepairEvents(year = directorAnnualYear()) {
  const events = [];
  Object.entries(state.checks || {}).forEach(([recordKey, rec]) => {
    const [equipmentIdRaw, nodeIndexRaw, date] = recordKey.split(":");
    const eq = equipmentById(Number(equipmentIdRaw));
    const item = rec?.to;
    if (!eq || !item) return;
    visibleCommentEntries(item).forEach(entry => {
      if (isDowntimeCommentEntry(entry) || !String(entry?.text || "").trim()) return;
      const createdAt = entry.at || item.commentUpdatedAt || `${date}T00:00:00.000Z`;
      const created = dateYearMonth(createdAt);
      const resolved = dateYearMonth(entry.resolved ? entry.resolvedAt || "" : "");
      if (created?.year === year || resolved?.year === year) {
        events.push({
          type: "remark",
          resolutionKey: `remark:${recordKey}`,
          equipment: eq.name || "",
          area: eq.area || "",
          node: eq.nodes[Number(nodeIndexRaw)] || "",
          createdAt,
          resolvedAt: entry.resolved ? entry.resolvedAt || "" : "",
          authorRole: entry.role || item.commentOwnerRole || "",
          authorName: entry.name || item.commentOwnerName || "",
          resolvedByRole: entry.resolvedByRole || "",
          resolvedByName: entry.resolvedByName || "",
          confirmedAt: entry.confirmedAt || "",
          confirmedByRole: entry.confirmedByRole || "",
          confirmedByName: entry.confirmedByName || "",
          durationMs: Number(entry.resolvedDurationMs || 0),
          open: !entry.resolved,
          text: entry.text || item.comment || ""
        });
      }
    });
  });
  downtimes().forEach(item => {
    if (item.type === "production") return;
    const created = dateYearMonth(item.startedAt || "");
    const resolved = dateYearMonth(item.endedAt || "");
    if (created?.year !== year && resolved?.year !== year) return;
    events.push({
      type: "breakdown",
      equipment: item.equipment || "",
      area: item.area || "",
      node: item.node || "",
      createdAt: item.startedAt || "",
      resolvedAt: item.endedAt || "",
      authorRole: item.authorRole || "",
      resolvedByRole: item.closedByRole || "",
      resolvedByName: item.closedByName || "",
      durationMs: downtimeDurationMs(item),
      open: !item.endedAt,
      text: item.comment || ""
    });
  });
  allRequests().forEach(req => {
    if (!req.mechanicInstalled && !req.done) return;
    const targetRole = req.issueTargetRole || "";
    if (!["mechanic", "electrician"].includes(targetRole)) return;
    const resolvedAt = req.updatedAt || req.createdAt || req.date || "";
    const resolved = dateYearMonth(resolvedAt);
    if (resolved?.year !== year) return;
    events.push({
      type: "install",
      equipment: req.equipment || "",
      area: req.area || "",
      node: req.node || "",
      createdAt: req.createdAt || req.date || "",
      resolvedAt,
      authorRole: req.sourceRole || "",
      resolvedByRole: targetRole,
      resolvedByName: req.issueTargetName || "",
      durationMs: 0,
      open: false,
      text: partNameFromRequest(req)
    });
  });
  return events;
}

function directorAnnualStats(year = directorAnnualYear()) {
  const months = directorAnnualEmptyMonths();
  const repairEvents = annualRepairEvents(year);
  repairEvents.forEach(event => {
    const created = dateYearMonth(event.createdAt);
    const resolved = dateYearMonth(event.resolvedAt);
    if (created?.year === year) months[created.month].repairsCreated += 1;
    if (resolved?.year === year) months[resolved.month].repairsClosed += 1;
    if (event.type === "breakdown" && created?.year === year) months[created.month].breakdowns += 1;
  });
  downtimes().forEach(item => {
    const created = dateYearMonth(item.startedAt || "");
    if (created?.year !== year) return;
    months[created.month].stops += 1;
    months[created.month].downtimeMs += downtimeDurationMs(item);
  });
  const today = todayISO();
  const activeEquipment = allEquipment().filter(eq => eq.area !== "Резерв");
  for (let month = 0; month < 12; month += 1) {
    const days = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= days; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (date > today) continue;
      const dueShiftKeys = walkShiftKeysDueForDate(date);
      if (!dueShiftKeys.length) continue;
      activeEquipment.forEach(eq => {
        months[month].qrPlan += eq.nodes.length * dueShiftKeys.length;
        eq.nodes.forEach((_, nodeIndex) => {
          const rec = getRecord(eq.id, nodeIndex, date);
          months[month].qrDone += dueShiftKeys.filter(shiftKey => Boolean(rec?.to?.walkShifts?.[shiftKey]?.done)).length;
        });
      });
    }
  }
  const workerMap = new Map();
  const workerKey = (role, name) => `${role}:${String(name || "").trim().toLowerCase()}`;
  const ensureWorker = (role, name) => {
    if (!["mechanic", "electrician"].includes(role)) return null;
    const cleanName = String(name || "").trim() || requestRoleLabel(role);
    const key = workerKey(role, cleanName);
    if (!workerMap.has(key)) {
      workerMap.set(key, {
        key,
        role,
        roleLabel: requestRoleLabel(role),
        name: cleanName,
        closed: 0,
        overdueOpen: 0,
        downtimeClosed: 0,
        installs: 0,
        durations: []
      });
    }
    return workerMap.get(key);
  };
  loadUsers()
    .filter(user => ["mechanic", "electrician"].includes(user.role))
    .forEach(user => ensureWorker(user.role, user.name || user.employeeId || user.phone));
  repairEvents.forEach(event => {
    const worker = ensureWorker(event.resolvedByRole, event.resolvedByName);
    if (worker && event.resolvedAt) {
      worker.closed += 1;
      if (event.type === "breakdown") worker.downtimeClosed += 1;
      if (event.type === "install") worker.installs += 1;
      if (event.durationMs > 0) worker.durations.push(event.durationMs);
    }
    if (event.open && ["mechanic", "electrician"].includes(event.authorRole)) {
      const started = Date.parse(event.createdAt || "");
      if (Number.isFinite(started) && Date.now() - started >= 3 * 86400000) {
        const openWorker = ensureWorker(event.authorRole, event.resolvedByName || event.authorName);
        if (openWorker) openWorker.overdueOpen += 1;
      }
    }
  });
  const workers = [...workerMap.values()]
    .map(worker => {
      const avgMs = worker.durations.length ? worker.durations.reduce((sum, value) => sum + value, 0) / worker.durations.length : 0;
      const denominator = worker.closed + worker.overdueOpen;
      const kpd = denominator ? Math.round(worker.closed / denominator * 100) : null;
      return { ...worker, avgMs, kpd };
    })
    .sort((a, b) => (b.kpd ?? -1) - (a.kpd ?? -1) || b.closed - a.closed || a.name.localeCompare(b.name, "ru"));
  const totals = {
    repairsCreated: months.reduce((sum, item) => sum + item.repairsCreated, 0),
    repairsClosed: months.reduce((sum, item) => sum + item.repairsClosed, 0),
    stops: months.reduce((sum, item) => sum + item.stops, 0),
    downtimeMs: months.reduce((sum, item) => sum + item.downtimeMs, 0),
    breakdowns: months.reduce((sum, item) => sum + item.breakdowns, 0),
    qrDone: months.reduce((sum, item) => sum + item.qrDone, 0),
    qrPlan: months.reduce((sum, item) => sum + item.qrPlan, 0)
  };
  return { year, months, workers, totals };
}

function trendText(currentValue, previousValue, unit = "") {
  const diff = Number(currentValue || 0) - Number(previousValue || 0);
  if (!diff) return "без изменений";
  return `${diff > 0 ? "рост" : "падение"} ${Math.abs(diff)}${unit}`;
}

function annualBarHeight(value, maxValue) {
  if (!maxValue) return 4;
  return Math.max(4, Math.round(value / maxValue * 100));
}

function directorAnnualStatsHtml(stats = directorAnnualStats()) {
  const maxRepairs = Math.max(...stats.months.map(item => Math.max(item.repairsCreated, item.repairsClosed)), 1);
  const maxDowntime = Math.max(...stats.months.map(item => item.downtimeMs), 1);
  const lastMonthIndex = Math.min(new Date().getMonth(), 11);
  const currentMonth = stats.months[lastMonthIndex];
  const previousMonth = stats.months[Math.max(lastMonthIndex - 1, 0)];
  const workerCards = stats.workers.map(worker => `
    <div class="annual-role-card ${worker.kpd === null ? "empty" : worker.kpd >= 85 ? "green" : worker.kpd >= 65 ? "yellow" : "red"}">
      <div><strong>${escapeHtml(worker.name)}</strong><span>${escapeHtml(worker.roleLabel)}</span></div>
      <b>${worker.kpd === null ? "нет данных" : `${worker.kpd}%`}</b>
      <small>Закрыто: ${worker.closed} · Установки: ${worker.installs} · Простои: ${worker.downtimeClosed} · Просрочено: ${worker.overdueOpen}${worker.avgMs ? ` · Среднее время: ${durationText(worker.avgMs)}` : ""}</small>
    </div>
  `).join("");
  const workerRows = stats.workers.map((worker, index) => `
    <tr class="${worker.kpd === null ? "empty" : worker.kpd >= 85 ? "green" : worker.kpd >= 65 ? "yellow" : "red"}">
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(worker.name)}</strong><small>${escapeHtml(worker.roleLabel)}</small></td>
      <td>${worker.kpd === null ? "нет данных" : `${worker.kpd}%`}</td>
      <td>${worker.closed}</td>
      <td>${worker.installs}</td>
      <td>${worker.downtimeClosed}</td>
      <td>${worker.overdueOpen}</td>
      <td>${worker.avgMs ? durationText(worker.avgMs) : "-"}</td>
    </tr>
  `).join("");
  const monthBars = stats.months.map((month, index) => {
    const repairTrend = index ? trendText(month.repairsClosed, stats.months[index - 1].repairsClosed) : "старт года";
    return `
      <div class="annual-month">
        <div class="annual-bars" title="${escapeHtml(month.label)}: создано ${month.repairsCreated}, закрыто ${month.repairsClosed}, простои ${durationText(month.downtimeMs)}">
          <i class="created" style="height:${annualBarHeight(month.repairsCreated, maxRepairs)}%"></i>
          <i class="closed" style="height:${annualBarHeight(month.repairsClosed, maxRepairs)}%"></i>
        </div>
        <strong>${escapeHtml(month.label)}</strong>
        <small>${escapeHtml(repairTrend)}</small>
      </div>
    `;
  }).join("");
  const downtimeBars = stats.months.map((month, index) => {
    const previous = index ? stats.months[index - 1].downtimeMs : month.downtimeMs;
    const diff = month.downtimeMs - previous;
    const diffText = index
      ? diff === 0
        ? "без изменений"
        : `${diff > 0 ? "рост" : "падение"} ${durationText(Math.abs(diff))}`
      : "старт года";
    const hours = Math.round(month.downtimeMs / 3600000 * 10) / 10;
    return `
      <div class="downtime-year-month ${!month.downtimeMs ? "empty" : diff > 0 ? "up" : diff < 0 ? "down" : ""}">
        <div class="downtime-year-bar" style="height:${month.downtimeMs ? annualBarHeight(month.downtimeMs, maxDowntime) : 0}%"></div>
        <strong>${escapeHtml(month.label)}</strong>
        <span>${hours ? `${hours} ч` : "0"}</span>
        <small>${escapeHtml(diffText)}</small>
      </div>
    `;
  }).join("");
  return `
    <section class="director-annual-card">
      <div class="director-section-head">
        <div><span>📈</span><h2>Годовая статистика ${stats.year}</h2></div>
        <small>КПД, ремонты, остановки, рост/падение по месяцам</small>
      </div>
      <div class="annual-summary-grid">
        <div><strong>${stats.totals.repairsCreated}</strong><span>ремонтов/замечаний создано</span></div>
        <div><strong>${stats.totals.repairsClosed}</strong><span>закрыто работ</span></div>
        <div><strong>${stats.totals.stops}</strong><span>остановок</span></div>
        <div><strong>${durationText(stats.totals.downtimeMs)}</strong><span>простоя за год</span></div>
      </div>
      <div class="annual-role-grid">${workerCards || `<div class="annual-role-card empty"><div><strong>Нет сотрудников</strong><span>Добавьте механиков и электриков в пользователях</span></div><b>нет данных</b></div>`}</div>
      <div class="annual-worker-table-wrap">
        <table class="annual-worker-table">
          <thead><tr><th>№</th><th>Сотрудник</th><th>КПД</th><th>Закрыто</th><th>Установки</th><th>Простои</th><th>Просрочено</th><th>Среднее время</th></tr></thead>
          <tbody>${workerRows || `<tr><td colspan="8">Пока нет данных по механикам и электрикам</td></tr>`}</tbody>
        </table>
      </div>
      <div class="annual-trend-note">
        <b>Текущий месяц:</b>
        закрытые работы - ${escapeHtml(trendText(currentMonth.repairsClosed, previousMonth.repairsClosed))};
        остановки - ${escapeHtml(trendText(currentMonth.stops, previousMonth.stops))};
        простой - ${escapeHtml(currentMonth.downtimeMs === previousMonth.downtimeMs ? "без изменений" : `${currentMonth.downtimeMs > previousMonth.downtimeMs ? "рост" : "падение"} ${durationText(Math.abs(currentMonth.downtimeMs - previousMonth.downtimeMs))}`)}.
      </div>
      <div class="downtime-year-chart">
        <div class="director-section-head">
          <div><span>⏱</span><h2>Простой по месяцам</h2></div>
          <small>Красная колонка - часы простоя. Подпись показывает рост или падение к прошлому месяцу.</small>
        </div>
        <div class="downtime-year-months">${downtimeBars}</div>
      </div>
      <div class="annual-chart">
        <div class="annual-chart-legend"><span class="created"></span>Создано <span class="closed"></span>Закрыто</div>
        <div class="annual-months">${monthBars}</div>
      </div>
    </section>
  `;
}

function directorFactoryReliabilityScore(month) {
  const downtimeHours = month.downtimeMs / 3600000;
  const openWorks = Math.max(month.repairsCreated - month.repairsClosed, 0);
  const qrPercent = month.qrPlan ? month.qrDone / month.qrPlan * 100 : 100;
  const downtimePenalty = Math.min(Math.round(downtimeHours / 125 * 45), 45);
  const stopPenalty = Math.min(month.stops * 4, 20);
  const openPenalty = Math.min(openWorks * 5, 25);
  const breakdownPenalty = Math.min(month.breakdowns * 3, 10);
  const qrPenalty = Math.min(Math.round((100 - qrPercent) * 0.25), 25);
  return Math.max(0, Math.min(100, 100 - downtimePenalty - stopPenalty - openPenalty - breakdownPenalty - qrPenalty));
}

function reliabilityBand(score) {
  if (score >= 85) return "green";
  if (score >= 65) return "yellow";
  return "red";
}

function workerRatingKey(role, name) {
  return `${role}:${String(name || "").trim().toLowerCase()}`;
}

function emptyWorkerRating(role, name) {
  const cleanName = String(name || "").trim() || requestRoleLabel(role);
  return {
    key: workerRatingKey(role, cleanName),
    role,
    roleLabel: requestRoleLabel(role),
    name: cleanName,
    closed: 0,
    breakdownClosed: 0,
    plannedDone: 0,
    remarksFound: 0,
    remarksResolved: 0,
    installs: 0,
    overdueOpen: 0,
    qrDone: 0,
    shifts: { day: 0, night: 0 },
    reactionDurations: [],
    repairDurations: [],
    points: 0,
    efficiency: 0,
    planPercent: 0,
    emergencyPercent: 0,
    pprPercent: 0,
    achievements: []
  };
}

function workerRatingStats(year = current.ratingYear || directorAnnualYear()) {
  const workers = new Map();
  const ensureWorker = (role, name) => {
    if (!["mechanic", "electrician"].includes(role)) return null;
    const cleanName = String(name || "").trim() || requestRoleLabel(role);
    const key = workerRatingKey(role, cleanName);
    if (!workers.has(key)) workers.set(key, emptyWorkerRating(role, cleanName));
    return workers.get(key);
  };

  loadUsers()
    .filter(user => ["mechanic", "electrician"].includes(user.role))
    .forEach(user => ensureWorker(user.role, user.name || user.employeeId || user.phone));

  const resolvedRemarkKeys = new Set();
  const overdueRemarkKeys = new Set();
  annualRepairEvents(year).forEach(event => {
    const created = dateYearMonth(event.createdAt || "");
    const resolved = dateYearMonth(event.resolvedAt || "");
    if (event.type === "remark" && created?.year === year) {
      const author = ensureWorker(event.authorRole, event.authorName);
      if (author) author.remarksFound += 1;
    }
    let countResolution = Boolean(event.resolvedAt && resolved?.year === year);
    if (event.type === "remark" && event.resolutionKey) {
      if (resolvedRemarkKeys.has(event.resolutionKey)) countResolution = false;
      else if (countResolution) resolvedRemarkKeys.add(event.resolutionKey);
    }
    const worker = ensureWorker(event.resolvedByRole, event.resolvedByName);
    if (worker && countResolution) {
      worker.closed += 1;
      if (event.type === "breakdown") worker.breakdownClosed += 1;
      if (event.type === "install") worker.installs += 1;
      if (event.type === "remark") {
        worker.plannedDone += 1;
        worker.remarksResolved += 1;
      }
      if (event.durationMs > 0) {
        worker.reactionDurations.push(event.durationMs);
        if (event.type !== "install") worker.repairDurations.push(event.durationMs);
      }
    }
    if (event.open && ["mechanic", "electrician"].includes(event.authorRole)) {
      if (event.type === "remark" && event.resolutionKey) {
        if (overdueRemarkKeys.has(event.resolutionKey)) return;
        overdueRemarkKeys.add(event.resolutionKey);
      }
      const started = Date.parse(event.createdAt || "");
      if (Number.isFinite(started) && Date.now() - started >= 3 * 86400000) {
        const openWorker = ensureWorker(event.authorRole, event.authorName || event.resolvedByName);
        if (openWorker) openWorker.overdueOpen += 1;
      }
    }
  });

  Object.values(state.checks || {}).forEach(rec => {
    const shifts = rec?.to?.walkShifts || {};
    Object.values(shifts).forEach(shift => {
      if (!shift?.done) return;
      const at = dateYearMonth(shift.at || "");
      if (at?.year !== year) return;
      const worker = ensureWorker(shift.byRole, shift.byName);
      if (!worker) return;
      worker.qrDone += 1;
      const shiftKey = shift.shift === "night" ? "night" : "day";
      worker.shifts[shiftKey] += 1;
    });
  });

  const list = [...workers.values()].map(worker => {
    const avgReactionMs = worker.reactionDurations.length
      ? worker.reactionDurations.reduce((sum, value) => sum + value, 0) / worker.reactionDurations.length
      : 0;
    const avgRepairMs = worker.repairDurations.length
      ? worker.repairDurations.reduce((sum, value) => sum + value, 0) / worker.repairDurations.length
      : 0;
    const workTotal = worker.closed + worker.qrDone;
    const planBase = worker.closed + worker.overdueOpen;
    const planPercent = planBase ? Math.round(worker.closed / planBase * 100) : 0;
    const emergencyPercent = worker.closed ? Math.round(worker.breakdownClosed / worker.closed * 100) : 0;
    const pprPercent = workTotal ? Math.round((worker.plannedDone + worker.qrDone) / workTotal * 100) : 0;
    const speedBonus = avgRepairMs && avgRepairMs <= 4 * 3600000 ? 12 : avgRepairMs && avgRepairMs <= 24 * 3600000 ? 6 : 0;
    const points = Math.max(0,
      worker.closed * 10
      + worker.breakdownClosed * 12
      + worker.installs * 6
      + worker.qrDone * 2
      + worker.plannedDone * 5
      + worker.remarksFound * 3
      + speedBonus
      - worker.overdueOpen * 8
    );
    const efficiency = Math.min(100, Math.round(
      (planPercent * 0.45)
      + (Math.min(worker.closed, 40) / 40 * 25)
      + (Math.min(worker.qrDone, 120) / 120 * 20)
      + (avgRepairMs ? Math.max(0, 10 - Math.min(avgRepairMs / 3600000 / 24 * 10, 10)) : 0)
    ));
    const achievements = [];
    if (worker.breakdownClosed >= 3) achievements.push("Аварийный мастер");
    if (worker.remarksFound >= 5) achievements.push("Внимательный обход");
    if (worker.remarksResolved >= 5) achievements.push("Устраняет замечания");
    if (worker.qrDone >= 50) achievements.push("ППР дисциплина");
    if (worker.overdueOpen === 0 && worker.closed > 0) achievements.push("Без просрочек");
    if (avgRepairMs && avgRepairMs <= 4 * 3600000) achievements.push("Быстрый ремонт");
    if (worker.installs >= 5) achievements.push("Монтажник");
    return { ...worker, avgReactionMs, avgRepairMs, planPercent, emergencyPercent, pprPercent, points, efficiency, achievements };
  });

  list.sort((a, b) => b.points - a.points || b.efficiency - a.efficiency || b.closed - a.closed || a.name.localeCompare(b.name, "ru"));
  list.forEach((worker, index) => worker.place = index + 1);

  const monthIndex = Math.min(new Date().getMonth(), 11);
  const monthWorkers = new Map();
  const ensureMonthWorker = (role, name) => {
    if (!["mechanic", "electrician"].includes(role)) return null;
    const cleanName = String(name || "").trim() || requestRoleLabel(role);
    const key = workerRatingKey(role, cleanName);
    if (!monthWorkers.has(key)) monthWorkers.set(key, { role, name: cleanName, roleLabel: requestRoleLabel(role), points: 0, closed: 0, qrDone: 0, breakdownClosed: 0, remarksFound: 0, remarksResolved: 0 });
    return monthWorkers.get(key);
  };
  const monthResolvedRemarkKeys = new Set();
  annualRepairEvents(year).forEach(event => {
    const created = dateYearMonth(event.createdAt || "");
    if (event.type === "remark" && created?.year === year && created.month === monthIndex) {
      const author = ensureMonthWorker(event.authorRole, event.authorName);
      if (author) {
        author.remarksFound += 1;
        author.points += 3;
      }
    }
    const resolved = dateYearMonth(event.resolvedAt || "");
    if (resolved?.year !== year || resolved.month !== monthIndex) return;
    if (event.type === "remark" && event.resolutionKey) {
      if (monthResolvedRemarkKeys.has(event.resolutionKey)) return;
      monthResolvedRemarkKeys.add(event.resolutionKey);
    }
    const worker = ensureMonthWorker(event.resolvedByRole, event.resolvedByName);
    if (!worker) return;
    worker.closed += 1;
    if (event.type === "breakdown") worker.breakdownClosed += 1;
    if (event.type === "remark") worker.remarksResolved += 1;
    worker.points += event.type === "breakdown" ? 22 : event.type === "install" ? 16 : 15;
  });
  Object.values(state.checks || {}).forEach(rec => {
    Object.values(rec?.to?.walkShifts || {}).forEach(shift => {
      const at = dateYearMonth(shift?.at || "");
      if (!shift?.done || at?.year !== year || at.month !== monthIndex) return;
      const worker = ensureMonthWorker(shift.byRole, shift.byName);
      if (!worker) return;
      worker.qrDone += 1;
      worker.points += 2;
    });
  });
  const monthLeaders = [...monthWorkers.values()].sort((a, b) => b.points - a.points || b.closed - a.closed || b.qrDone - a.qrDone);
  const bestMechanic = monthLeaders.find(worker => worker.role === "mechanic") || null;
  const bestElectrician = monthLeaders.find(worker => worker.role === "electrician") || null;
  const bestOverall = monthLeaders[0] || list[0] || null;
  const totals = {
    workers: list.length,
    points: list.reduce((sum, worker) => sum + worker.points, 0),
    closed: list.reduce((sum, worker) => sum + worker.closed, 0),
    qrDone: list.reduce((sum, worker) => sum + worker.qrDone, 0),
    breakdownClosed: list.reduce((sum, worker) => sum + worker.breakdownClosed, 0),
    remarksFound: list.reduce((sum, worker) => sum + worker.remarksFound, 0),
    remarksResolved: list.reduce((sum, worker) => sum + worker.remarksResolved, 0),
    overdueOpen: list.reduce((sum, worker) => sum + worker.overdueOpen, 0)
  };
  return { year, monthIndex, workers: list, bestOverall, bestMechanic, bestElectrician, totals };
}

function workerRatingBand(worker) {
  if (worker.place === 1) return "gold";
  if (worker.efficiency >= 85) return "green";
  if (worker.efficiency >= 65) return "yellow";
  return "red";
}

function workerRatingHtml(stats = workerRatingStats()) {
  const detailed = !["mechanic", "electrician"].includes(profile?.role);
  const monthName = new Date(stats.year, stats.monthIndex, 1).toLocaleDateString("ru-RU", { month: "long" });
  const winner = stats.bestOverall;
  const winnerFull = winner ? stats.workers.find(worker => worker.role === winner.role && worker.name === winner.name) : null;
  const winnerName = winner ? winner.name : "Пока нет победителя";
  const winnerRole = winner ? winner.roleLabel : "Нет закрытых работ";
  const winnerKpi = winnerFull ? ` · КПД ${winnerFull.efficiency}%` : "";
  const bestMechanic = stats.bestMechanic ? `${stats.bestMechanic.name} · ${stats.bestMechanic.points} баллов` : "нет данных";
  const bestElectrician = stats.bestElectrician ? `${stats.bestElectrician.name} · ${stats.bestElectrician.points} баллов` : "нет данных";
  const maxPoints = Math.max(...stats.workers.map(worker => worker.points), 1);
  const graph = stats.workers.map(worker => {
    const height = Math.max(8, Math.round(worker.points / maxPoints * 100));
    const currentWorker = ["mechanic", "electrician"].includes(profile?.role)
      && String(worker.name || "").trim().toLowerCase() === String(profile?.name || "").trim().toLowerCase()
      && worker.role === profile.role;
    return `
      <div class="worker-graph-item ${workerRatingBand(worker)} ${currentWorker ? "current" : ""}">
        <div class="worker-graph-bar-wrap">
          <div class="worker-graph-bar" style="height:${height}%"><strong>${worker.place}</strong></div>
        </div>
        <b>${escapeHtml(worker.name)}</b>
        <span>${worker.points} баллов</span>
        <small>⚠ ${worker.remarksFound} · ✓ ${worker.remarksResolved}</small>
      </div>
    `;
  }).join("");
  const rows = stats.workers.map(worker => `
    <article class="worker-rating-row ${workerRatingBand(worker)}">
      <div class="worker-place">${worker.place === 1 ? "🏆" : worker.place}</div>
      <div class="worker-main">
        <strong>${escapeHtml(worker.name)}</strong>
        <span>${escapeHtml(worker.roleLabel)} · ${worker.points} баллов · КПД ${worker.efficiency}%</span>
        <div class="worker-achievements">
          ${worker.achievements.length ? worker.achievements.map(item => `<b>${escapeHtml(item)}</b>`).join("") : "<small>Достижения появятся после выполненных работ</small>"}
        </div>
      </div>
      <div class="worker-metrics">
        <span class="worker-metric-found"><b>${worker.remarksFound}</b> нашёл / написал</span>
        <span class="worker-metric-resolved"><b>${worker.remarksResolved}</b> устранил</span>
        <span><b>${worker.closed}</b> работ</span>
        <span><b>${worker.breakdownClosed}</b> аварий</span>
        <span><b>${worker.qrDone}</b> QR-ППР</span>
        <span><b>${worker.planPercent}%</b> план</span>
        <span><b>${worker.emergencyPercent}%</b> аварии</span>
        <span><b>${worker.pprPercent}%</b> ППР</span>
      </div>
      <div class="worker-time">
        <span>Реакция: ${worker.avgReactionMs ? durationText(worker.avgReactionMs) : "-"}</span>
        <span>Ремонт: ${worker.avgRepairMs ? durationText(worker.avgRepairMs) : "-"}</span>
        <span>Смены: день ${worker.shifts.day}, ночь ${worker.shifts.night}</span>
      </div>
    </article>
  `).join("");
  if (!detailed) {
    return `
      <section class="worker-rating-hero simple">
        <div>
          <span>Лучший за месяц · ${escapeHtml(monthName)}</span>
          <h2>${escapeHtml(winnerName)}</h2>
          <p>${escapeHtml(winnerRole)}${winner ? ` · ${winner.points} баллов` : ""}</p>
        </div>
        <div class="worker-trophy">🏆</div>
      </section>
      <section class="worker-rating-graph simple">
        <div class="worker-rating-graph-head">
          <div>
            <strong>Рейтинг сотрудников</strong>
            <span>Самая высокая колонка - первое место. Твоё место выделено рамкой.</span>
          </div>
        </div>
        <div class="worker-graph-grid simple">${graph || `<div class="empty-state">Пока нет данных рейтинга</div>`}</div>
        <div class="worker-rating-key"><span>⚠ — нашёл или написал предупреждение</span><span>✓ — устранил замечание</span></div>
      </section>
    `;
  }
  return `
    <section class="worker-rating-hero">
      <div>
        <span>Победитель месяца · ${escapeHtml(monthName)}</span>
        <h2>${escapeHtml(winnerName)}</h2>
        <p>${escapeHtml(winnerRole)}${winner ? ` · ${winner.points} баллов${winnerKpi}` : ""}</p>
      </div>
      <div class="worker-trophy">🏆</div>
    </section>
    <section class="worker-rating-summary">
      <div><strong>${stats.totals.points}</strong><span>баллов всего</span></div>
      <div><strong>${stats.totals.closed}</strong><span>выполнено работ</span></div>
      <div><strong>${stats.totals.breakdownClosed}</strong><span>аварий устранено</span></div>
      <div><strong>${stats.totals.remarksFound}</strong><span>замечаний найдено / написано</span></div>
      <div><strong>${stats.totals.remarksResolved}</strong><span>замечаний устранено</span></div>
      <div><strong>${stats.totals.qrDone}</strong><span>QR-ППР обходов</span></div>
      <div><strong>${stats.totals.overdueOpen}</strong><span>просрочено</span></div>
    </section>
    <section class="worker-month-winners">
      <div><span>Лучший механик месяца</span><strong>${escapeHtml(bestMechanic)}</strong></div>
      <div><span>Лучший электрик месяца</span><strong>${escapeHtml(bestElectrician)}</strong></div>
      <div><span>${detailed ? "Как считается" : "Твоя цель"}</span><strong>${detailed ? "работы + аварии + QR-ППР - просрочки" : "подняться выше в графике"}</strong></div>
    </section>
    <section class="worker-rating-graph">
      <div class="worker-rating-graph-head">
        <div>
          <strong>График рейтинга</strong>
          <span>Чем выше колонка, тем выше место сотрудника</span>
        </div>
      </div>
      <div class="worker-graph-grid">${graph || `<div class="empty-state">Пока нет механиков и электриков в списке сотрудников</div>`}</div>
    </section>
    ${detailed ? `
      <section class="worker-rating-explain">
        <strong>Как понимать рейтинг:</strong>
        <span>Предупреждение считается его автору отдельно, устранение — сотруднику, который закрыл замечание.</span>
        <span>За найденное или написанное предупреждение начисляется 3 балла; устранение входит в выполненные работы и считается только один раз.</span>
        <span>КПД учитывает выполнение плана, количество работ, ППР и скорость закрытия.</span>
        <span>Чем меньше просрочек и быстрее ремонт, тем выше место.</span>
      </section>
      <section class="worker-rating-list">
        ${rows || `<div class="empty-state">Пока нет механиков и электриков в списке сотрудников</div>`}
      </section>
    ` : ""}
  `;
}

function renderWorkerRating() {
  if (!ui.workerRatingPanel) return;
  const stats = workerRatingStats(current.ratingYear);
  if (ui.workerRatingYearLabel) ui.workerRatingYearLabel.textContent = String(stats.year);
  ui.workerRatingPanel.innerHTML = workerRatingHtml(stats);
}

function directorFactoryAnalyticsGraphHtml(stats = directorAnnualStats()) {
  const monthIndex = Math.min(new Date().getMonth(), 11);
  const current = stats.months[monthIndex];
  const previous = stats.months[Math.max(monthIndex - 1, 0)];
  const currentScore = directorFactoryReliabilityScore(current);
  const previousScore = directorFactoryReliabilityScore(previous);
  const scoreDiff = currentScore - previousScore;
  const totalOpen = stats.months.reduce((sum, item) => sum + Math.max(item.repairsCreated - item.repairsClosed, 0), 0);
  const bestWorker = stats.workers.find(worker => worker.kpd !== null);
  const bars = stats.months.map((month, index) => {
    const score = directorFactoryReliabilityScore(month);
    const prevScore = index ? directorFactoryReliabilityScore(stats.months[index - 1]) : score;
    const diff = score - prevScore;
    const downtimeHours = Math.round(month.downtimeMs / 3600000 * 10) / 10;
    const band = reliabilityBand(score);
    const qrPercent = month.qrPlan ? Math.round(month.qrDone / month.qrPlan * 100) : 0;
    return `
      <div class="factory-month ${band}">
        <div class="factory-bar-wrap">
          <div class="factory-score-bar" style="height:${score}%"><strong>${score}</strong></div>
        </div>
        <b>${escapeHtml(month.label)}</b>
        <span class="${diff > 0 ? "up" : diff < 0 ? "down" : ""}">${index ? diff === 0 ? "=" : `${diff > 0 ? "+" : ""}${diff}` : "старт"}</span>
        <small>${downtimeHours ? `${downtimeHours}ч` : "0ч"} · QR ${qrPercent}% · ${month.repairsClosed}/${month.repairsCreated}</small>
      </div>
    `;
  }).join("");
  const totalQrPercent = stats.totals.qrPlan ? Math.round(stats.totals.qrDone / stats.totals.qrPlan * 100) : 0;
  return `
    <section class="factory-analytics-card">
      <div class="factory-analytics-head">
        <div>
          <span>ГЛАВНЫЙ ГРАФИК</span>
          <h2>Индекс надежности завода ${stats.year}</h2>
          <p>Один показатель учитывает QR-обходы, простои, остановки, ремонты и незакрытые работы. Чем выше колонка, тем лучше месяц.</p>
        </div>
        <div class="factory-current-score ${reliabilityBand(currentScore)}">
          <strong>${currentScore}</strong>
          <span>${scoreDiff === 0 ? "без изменений" : scoreDiff > 0 ? `рост +${scoreDiff}` : `падение ${scoreDiff}`}</span>
        </div>
      </div>
      <div class="factory-graph">${bars}</div>
      <div class="factory-graph-help">
        <strong>Как читать график:</strong>
        <span>Высокая колонка - месяц прошёл хорошо.</span>
        <span>Зелёный - норма, жёлтый - внимание, красный - риск.</span>
        <span>+ / - под месяцем показывает рост или падение к прошлому месяцу.</span>
        <span>Нижняя строка: часы простоя · процент QR-обхода · закрыто/создано работ.</span>
      </div>
      <div class="factory-graph-legend">
        <span class="green"></span>85-100 хорошо
        <span class="yellow"></span>65-84 внимание
        <span class="red"></span>0-64 риск
      </div>
      <div class="factory-summary-strip">
        <div><strong>${durationText(stats.totals.downtimeMs)}</strong><span>простой за год</span></div>
        <div><strong>${stats.totals.stops}</strong><span>остановок</span></div>
        <div><strong>${stats.totals.repairsClosed}/${stats.totals.repairsCreated}</strong><span>закрыто / создано</span></div>
        <div><strong>${totalOpen}</strong><span>незакрытых работ</span></div>
        <div><strong>${totalQrPercent}%</strong><span>QR-обходы за год</span></div>
      </div>
    </section>
  `;
}

function parseMonthKey(monthKey = current.engineerReportMonth || todayISO().slice(0, 7)) {
  const match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  if (!match) return { year: now.getFullYear(), month: now.getMonth(), key: todayISO().slice(0, 7) };
  const year = Number(match[1]);
  const month = Math.min(Math.max(Number(match[2]) - 1, 0), 11);
  return { year, month, key: `${year}-${String(month + 1).padStart(2, "0")}` };
}

function monthDisplayName(monthKey = current.engineerReportMonth) {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(year, month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function parseMoneyAmount(value) {
  const text = String(value || "").replace(/\u00a0/g, " ");
  const numbers = [...text.matchAll(/\d[\d\s.,]*/g)]
    .map(match => Number(match[0].replace(/\s/g, "").replace(",", ".")))
    .filter(Number.isFinite);
  if (!numbers.length) return 0;
  const hasRange = /[-–—]/.test(text) && numbers.length >= 2;
  return hasRange ? (numbers[0] + numbers[1]) / 2 : numbers[0];
}

function formatMoney(amount) {
  const value = Math.round(Number(amount || 0));
  if (!value) return "0";
  return value.toLocaleString("ru-RU");
}

function priceTextFromAmount(amount) {
  const value = Number(amount || 0);
  return value > 0 ? formatMoney(value) : "";
}

const priceLookupMemory = new Map();

function clearPriceLookupClientQuery(name = "") {
  const cleanName = String(name || "").trim();
  const words = cleanName.split(/\s+/).filter(word => word.length >= 3);
  const generic = /^(болт|гайка|шайба|профиль|кабель|масло|труба|лента|насос|датчик|подшипник)$/i.test(cleanName);
  return words.length >= 2 && cleanName.length >= 8 && !generic;
}

async function lookupInternetPriceClient(name = "") {
  if (!clearPriceLookupClientQuery(name)) return null;
  const keyValue = String(name || "").trim().toLowerCase();
  if (priceLookupMemory.has(keyValue)) return priceLookupMemory.get(keyValue);
  const result = await apiJson("/api/price-lookup", {
    method: "POST",
    body: JSON.stringify({ name }),
    timeout: 12000
  }).catch(() => null);
  const price = result?.ok && Number(result.price || 0) > 0 ? Number(result.price) : 0;
  const value = price ? { price, source: result.source || "internet", confidence: result.confidence || "" } : null;
  priceLookupMemory.set(keyValue, value);
  return value;
}

async function autoFillInternetPriceInput(input, name = "", article = "", onApply = null) {
  if (!input || parseMoneyAmount(input.value) > 0) return false;
  if (input.dataset.priceLookupDone === "1") return false;
  input.dataset.priceLookupDone = "1";
  const result = await lookupInternetPriceClient(name);
  if (!result?.price || parseMoneyAmount(input.value) > 0) return false;
  input.value = priceTextFromAmount(result.price);
  input.title = `Автоматически найдено из интернета (${result.confidence || "оценка"})`;
  input.classList.add("internet-price-filled");
  if (typeof onApply === "function") onApply(result.price);
  return true;
}

function waitMs(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function queueWarehouseStockPriceLookup(input) {
  const id = input?.dataset?.stockPrice;
  const item = id ? state.inventory?.[id] : null;
  if (!id || !item || warehousePriceLookupProcessed.has(id)) return;
  if (parseMoneyAmount(input.value || item.unitPrice || item.price || item.lastPrice || "") > 0) return;
  warehousePriceLookupProcessed.add(id);
  warehousePriceLookupQueue.push(id);
  runWarehouseStockPriceLookupQueue();
}

async function runWarehouseStockPriceLookupQueue() {
  if (warehousePriceLookupRunning) return;
  warehousePriceLookupRunning = true;
  while (warehousePriceLookupQueue.length) {
    const id = warehousePriceLookupQueue.shift();
    const item = state.inventory?.[id];
    if (!item || parseMoneyAmount(item.unitPrice || item.price || item.lastPrice || "") > 0) {
      await waitMs(250);
      continue;
    }
    const result = await lookupInternetPriceClient(item.name);
    if (result?.price && updateInventoryUnitPrice(item, result.price)) {
      const input = ui.warehousePanel?.querySelector(`[data-stock-price="${CSS.escape(id)}"]`);
      if (input && parseMoneyAmount(input.value) <= 0) {
        input.value = priceTextFromAmount(result.price);
        input.title = `Автоматически найдено из интернета (${result.confidence || "оценка"})`;
        input.classList.add("internet-price-filled");
      }
      saveState();
    }
    await waitMs(900);
  }
  warehousePriceLookupRunning = false;
}

function serviceCosts() {
  state.serviceCosts ||= [];
  return state.serviceCosts.filter(item => item && !item.deleted);
}

function serviceCostAreas() {
  return [...new Set([...AREAS, ...allEquipment().map(eq => eq.area)].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ru"));
}

function serviceCostEquipmentForArea(area = current.serviceCostArea) {
  return allEquipment()
    .filter(eq => !area || eq.area === area)
    .sort((a, b) => `${a.area} ${a.name}`.localeCompare(`${b.area} ${b.name}`, "ru"));
}

function ensureServiceCostSelection() {
  const areas = serviceCostAreas();
  if (!current.serviceCostArea || !areas.includes(current.serviceCostArea)) {
    current.serviceCostArea = areas[0] || "";
  }
  const equipment = serviceCostEquipmentForArea(current.serviceCostArea);
  if (!current.serviceCostEquipmentId || !equipment.some(eq => String(eq.id) === String(current.serviceCostEquipmentId))) {
    current.serviceCostEquipmentId = equipment[0]?.id ? String(equipment[0].id) : "";
  }
  const eq = equipmentById(Number(current.serviceCostEquipmentId));
  if (!eq || current.serviceCostNodeIndex === "" || !eq.nodes[Number(current.serviceCostNodeIndex)]) {
    current.serviceCostNodeIndex = eq?.nodes?.length ? "0" : "";
  }
}

function createServiceCost(data = {}) {
  ensureServiceCostSelection();
  const amount = parseMoneyAmount(data.amount);
  const comment = String(data.comment || "").trim();
  if (amount <= 0 || !comment) return null;
  const eq = equipmentById(Number(data.equipmentId || current.serviceCostEquipmentId));
  const nodeIndex = Number(data.nodeIndex ?? current.serviceCostNodeIndex);
  const item = {
    id: `service:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    date: String(data.date || todayISO()),
    area: data.area || eq?.area || current.serviceCostArea || "",
    equipmentId: eq?.id || "",
    equipment: eq?.name || "",
    nodeIndex: Number.isFinite(nodeIndex) ? nodeIndex : "",
    node: eq?.nodes?.[nodeIndex] || "",
    amount,
    comment,
    authorName: profile?.name || "",
    authorRole: profile?.role || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.serviceCosts ||= [];
  state.serviceCosts.unshift(item);
  return item;
}

function annualServiceCostEntries(year) {
  return serviceCosts()
    .filter(item => dateYearMonth(item.date || item.createdAt)?.year === year)
    .map(item => ({
      date: item.date || item.createdAt || "",
      area: item.area || "",
      equipment: item.equipment || "",
      node: item.node || "",
      name: "Услуга / работа",
      qty: 1,
      unit: "усл.",
      unitPrice: Number(item.amount || 0),
      total: Number(item.amount || 0),
      supplier: item.comment || ""
    }))
    .filter(item => item.total > 0);
}

function annualRequestCostEntries(year) {
  const entries = [];
  Object.values(state.inventory || {}).forEach(item => {
    if (!item || !item.name) return;
    const costDate = item.lastReceivedAt || item.firstReceivedAt || item.updatedAt || "";
    const ym = dateYearMonth(costDate);
    if (ym?.year !== year) return;
    const unitPrice = parseMoneyAmount(item.unitPrice || item.price || item.lastPrice || "");
    if (!unitPrice) return;
    const qty = Number(item.receivedQty || item.qty || 0);
    if (qty <= 0) return;
    entries.push({
      date: costDate,
      area: item.area || "",
      equipment: item.source || item.area || "Склад",
      node: item.location || "",
      name: item.name || "",
      qty,
      unit: item.unit || "шт",
      unitPrice,
      total: unitPrice * qty,
      supplier: "Склад"
    });
  });
  return entries;
}

function engineerAnnualAnalysis(year) {
  const events = annualRepairEvents(year);
  const repeatedMap = new Map();
  events
    .filter(event => ["remark", "breakdown"].includes(event.type))
    .forEach(event => {
      const created = dateYearMonth(event.createdAt);
      if (created?.year !== year) return;
      const key = `${event.area || ""}|${event.equipment || ""}|${event.node || ""}`;
      const item = repeatedMap.get(key) || {
        area: event.area || "",
        equipment: event.equipment || "",
        node: event.node || "",
        count: 0,
        breakdowns: 0,
        remarks: 0,
        downtimeMs: 0,
        lastAt: "",
        texts: []
      };
      item.count += 1;
      if (event.type === "breakdown") {
        item.breakdowns += 1;
        item.downtimeMs += Number(event.durationMs || 0);
      } else {
        item.remarks += 1;
      }
      if (String(event.createdAt || "") > String(item.lastAt || "")) item.lastAt = event.createdAt || "";
      if (event.text && item.texts.length < 3) item.texts.push(event.text);
      repeatedMap.set(key, item);
    });
  const repeatedBreakdowns = [...repeatedMap.values()]
    .filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count || b.downtimeMs - a.downtimeMs || a.equipment.localeCompare(b.equipment, "ru"))
    .slice(0, 10);
  const annualStats = directorAnnualStats(year);
  const employeeRating = annualStats.workers
    .filter(worker => worker.closed || worker.installs || worker.downtimeClosed)
    .sort((a, b) => b.closed - a.closed || b.installs - a.installs || (b.kpd ?? 0) - (a.kpd ?? 0) || a.name.localeCompare(b.name, "ru"))
    .slice(0, 12);
  const warehouseCosts = annualRequestCostEntries(year);
  const serviceCostsForYear = annualServiceCostEntries(year);
  const costs = [...warehouseCosts, ...serviceCostsForYear];
  const equipmentCostMap = new Map();
  costs.forEach(entry => {
    const key = `${entry.area || ""}|${entry.equipment || ""}`;
    const item = equipmentCostMap.get(key) || {
      area: entry.area || "",
      equipment: entry.equipment || "Без оборудования",
      total: 0,
      count: 0,
      lastItem: ""
    };
    item.total += entry.total;
    item.count += 1;
    item.lastItem = entry.name || item.lastItem;
    equipmentCostMap.set(key, item);
  });
  const equipmentCosts = [...equipmentCostMap.values()]
    .sort((a, b) => b.total - a.total || a.equipment.localeCompare(b.equipment, "ru"))
    .slice(0, 12);
  return {
    year,
    repeatedBreakdowns,
    employeeRating,
    equipmentCosts,
    totalCost: costs.reduce((sum, item) => sum + item.total, 0),
    warehouseCost: warehouseCosts.reduce((sum, item) => sum + item.total, 0),
    serviceCost: serviceCostsForYear.reduce((sum, item) => sum + item.total, 0),
    costCount: costs.length,
    serviceCosts: serviceCostsForYear
  };
}

function engineerMonthlyStats(monthKey = current.engineerReportMonth) {
  const { year, month, key } = parseMonthKey(monthKey);
  const range = monthRange(year, month);
  const annual = directorAnnualStats(year);
  const annualAnalysis = engineerAnnualAnalysis(year);
  const monthStats = annual.months[month] || directorAnnualEmptyMonths()[month];
  const remarkItems = [];
  Object.entries(state.checks || {}).forEach(([recordKey, rec]) => {
    const [equipmentIdRaw, nodeIndexRaw, date] = recordKey.split(":");
    const eq = equipmentById(Number(equipmentIdRaw));
    const item = rec?.to;
    if (!eq || !item) return;
    visibleCommentEntries(item).forEach(entry => {
      if (isDowntimeCommentEntry(entry) || !String(entry?.text || "").trim()) return;
      const createdAt = entry.at || item.commentUpdatedAt || `${date}T00:00:00.000Z`;
      const resolvedAt = entry.resolved ? entry.resolvedAt || "" : "";
      const createdInMonth = String(createdAt).slice(0, 7) === key;
      const resolvedInMonth = String(resolvedAt).slice(0, 7) === key;
      const openNow = !entry.resolved;
      const createdMs = Date.parse(createdAt || "");
      const openForReport = openNow && Number.isFinite(createdMs) && createdMs < range.end.getTime();
      if (!createdInMonth && !resolvedInMonth && !openForReport) return;
      remarkItems.push({
        equipment: eq.name || "",
        area: eq.area || "",
        node: eq.nodes[Number(nodeIndexRaw)] || "",
        date,
        createdAt,
        resolvedAt,
        createdInMonth,
        resolvedInMonth,
        open: openNow,
        author: entry.name || item.commentOwnerName || "",
        authorRole: entry.role || item.commentOwnerRole || "",
        resolvedBy: entry.resolvedByName || "",
        resolvedByRole: entry.resolvedByRole || "",
        confirmedAt: entry.confirmedAt || "",
        confirmedBy: entry.confirmedByName || "",
        confirmedByRole: entry.confirmedByRole || "",
        text: entry.text || item.comment || "",
        resolvedComment: entry.resolvedComment || "",
        durationMs: Number(entry.resolvedDurationMs || 0)
      });
    });
  });
  const downtimeItems = downtimes()
    .map(item => ({ ...item, monthMs: downtimeOverlapMs(item, year, month) }))
    .filter(item => item.monthMs > 0)
    .sort((a, b) => b.monthMs - a.monthMs || String(b.startedAt || "").localeCompare(String(a.startedAt || "")));
  const doneRequests = allRequests()
    .filter(req => req.mechanicInstalled || req.done)
    .filter(req => String(req.updatedAt || req.createdAt || req.date || "").slice(0, 7) === key)
    .map(req => ({
      number: req.requestNumber || req.id || "",
      equipment: req.equipment || "",
      area: req.area || "",
      node: req.node || "",
      name: partNameFromRequest(req),
      doneAt: req.updatedAt || req.createdAt || req.date || "",
      worker: req.issueTargetName || "",
      workerRole: req.issueTargetRole || ""
    }))
    .sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)));
  const pprSchedule = pprCalendarMonthData(allEquipment(), year, month).itemsByDate;
  const pprSheets = Object.entries(state.pprSheets || {})
    .filter(([date]) => String(date).slice(0, 7) === key)
    .map(([date, sheet]) => {
      const scheduledItems = pprSchedule[date] || [];
      const works = (Array.isArray(sheet?.rows) ? sheet.rows : [])
        .map((row, index) => ({
          work: String(row.work).trim(),
          equipment: row.equipment || scheduledItems[index]?.equipment || "",
          node: row.node || scheduledItems[index]?.node || "",
          area: row.area || scheduledItems[index]?.area || "",
          mark: row.mark || "",
          markedByName: row.markedByName || "",
          markedByRole: row.markedByRole || "",
          markedAt: row.markedAt || ""
        }))
        .filter(row => row.work);
      return { date, sheet, works, completion: pprSheetCompletion(date) };
    })
    .filter(item => item.works.length)
    .sort((a, b) => b.date.localeCompare(a.date));
  const createdRemarks = remarkItems.filter(item => item.createdInMonth);
  const closedRemarks = remarkItems.filter(item => item.resolvedInMonth);
  const openRemarks = remarkItems
    .filter(item => item.open)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const problemMap = new Map();
  [...createdRemarks, ...downtimeItems].forEach(item => {
    const keyValue = `${item.area || ""}|${item.equipment || ""}|${item.node || ""}`;
    const currentItem = problemMap.get(keyValue) || {
      area: item.area || "",
      equipment: item.equipment || "",
      node: item.node || "",
      count: 0,
      downtimeMs: 0
    };
    currentItem.count += 1;
    currentItem.downtimeMs += Number(item.monthMs || 0);
    problemMap.set(keyValue, currentItem);
  });
  const topProblems = [...problemMap.values()]
    .sort((a, b) => b.downtimeMs - a.downtimeMs || b.count - a.count || a.equipment.localeCompare(b.equipment, "ru"))
    .slice(0, 6);
  const qrPercent = monthStats.qrPlan ? Math.round(monthStats.qrDone / monthStats.qrPlan * 100) : 0;
  return {
    key,
    year,
    month,
    label: monthDisplayName(key),
    monthStats,
    reliabilityScore: directorFactoryReliabilityScore(monthStats),
    qrPercent,
    downtimeItems,
    downtimeMs: downtimeItems.reduce((sum, item) => sum + item.monthMs, 0),
    breakdowns: downtimeItems.filter(item => item.type !== "production").length,
    productionStops: downtimeItems.filter(item => item.type === "production").length,
    createdRemarks,
    closedRemarks,
    openRemarks,
    doneRequests,
    pprSheets,
    topProblems,
    annualAnalysis
  };
}

function engineerReportRows(items, emptyText, renderRow) {
  if (!items.length) return `<tr><td colspan="6" class="engineer-report-empty">${escapeHtml(emptyText)}</td></tr>`;
  return items.map(renderRow).join("");
}

function engineerMonthlyReportHtml(monthKey = current.engineerReportMonth, printable = false) {
  const stats = engineerMonthlyStats(monthKey);
  const band = reliabilityBand(stats.reliabilityScore);
  const annual = stats.annualAnalysis;
  const bestEmployee = annual.employeeRating[0];
  ensureServiceCostSelection();
  const serviceAreas = serviceCostAreas();
  const serviceEquipment = serviceCostEquipmentForArea(current.serviceCostArea);
  const selectedServiceEquipment = equipmentById(Number(current.serviceCostEquipmentId));
  const serviceItemsMonth = serviceCosts()
    .filter(item => String(item.date || item.createdAt || "").slice(0, 7) === stats.key)
    .sort((a, b) => String(b.date || b.createdAt || "").localeCompare(String(a.date || a.createdAt || "")));
  const serviceRows = engineerReportRows(
    serviceItemsMonth,
    "За выбранный месяц услуги не записаны",
    item => `
      <tr>
        <td>${escapeHtml(item.date ? dateHuman(item.date) : dateTimeHuman(item.createdAt))}</td>
        <td>${escapeHtml(item.area || "-")}</td>
        <td>${escapeHtml(item.equipment || "-")}</td>
        <td>${escapeHtml(item.node || "-")}</td>
        <td>${formatMoney(item.amount)}</td>
        <td>${escapeHtml(item.comment || "-")}</td>
      </tr>
    `
  );
  const pprRows = engineerReportRows(
    stats.pprSheets,
    "За выбранный месяц листы ППР не заполнялись",
    item => `
      <tr>
        <td>${escapeHtml(dateHuman(item.date))}</td>
        <td>${item.completion.complete ? "Принято инженером" : item.completion.awaitingApproval ? "Ожидает приёмки" : "В работе"}</td>
        <td>${item.works.length}</td>
        <td>${escapeHtml(item.works.map(work => `${work.mark === "done" ? "✓" : work.mark === "na" ? "−" : "○"} ${work.equipment || "Оборудование"}${work.node ? ` / ${work.node}` : ""}: ${work.work}${work.markedByName ? ` — ${work.markedByName}` : ""}`).join("; "))}</td>
        <td>${escapeHtml(item.sheet?.plannedByName || item.sheet?.updatedByName || "-")}</td>
        <td>${escapeHtml(item.sheet?.approvedByName ? `${item.sheet.approvedByName} · ${dateTimeHuman(item.sheet.approvedAt)}` : "-")}</td>
      </tr>
    `
  );
  const happenedItems = [
    ...stats.downtimeItems.map(item => ({
      at: item.startedAt,
      area: item.area,
      equipment: item.equipment,
      node: item.node,
      marker: `Простой: ${durationText(item.monthMs)}`,
      text: item.comment || downtimeTypeLabel(item.type)
    })),
    ...stats.createdRemarks.map(item => ({
      at: item.createdAt,
      area: item.area,
      equipment: item.equipment,
      node: item.node,
      marker: "Замечание",
      text: item.text
    }))
  ].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const happenedRows = engineerReportRows(
    happenedItems.slice(0, printable ? 80 : 18),
    "За выбранный месяц простоев и новых замечаний не зафиксировано",
    item => `
      <tr>
        <td>${escapeHtml(dateTimeHuman(item.at))}</td>
        <td>${escapeHtml(item.area || "-")}</td>
        <td>${escapeHtml(item.equipment || "-")}</td>
        <td>${escapeHtml(item.node || "-")}</td>
        <td>${escapeHtml(item.marker || "-")}</td>
        <td>${escapeHtml(item.text || "-")}</td>
      </tr>
    `
  );
  const closedRows = engineerReportRows(
    [...stats.closedRemarks, ...stats.doneRequests].slice(0, printable ? 60 : 14),
    "Закрытых работ за выбранный месяц нет",
    item => {
      if (item.number) {
        return `
          <tr>
            <td>${escapeHtml(dateTimeHuman(item.doneAt))}</td>
            <td>${escapeHtml(item.area || "-")}</td>
            <td>${escapeHtml(item.equipment || "-")}</td>
            <td>${escapeHtml(item.node || "-")}</td>
            <td>${escapeHtml(item.worker || requestRoleLabel(item.workerRole) || "-")}</td>
            <td>${escapeHtml(item.name || "Заявка выполнена")}</td>
          </tr>
        `;
      }
      return `
        <tr>
          <td>${escapeHtml(dateTimeHuman(item.resolvedAt))}</td>
          <td>${escapeHtml(item.area || "-")}</td>
          <td>${escapeHtml(item.equipment || "-")}</td>
          <td>${escapeHtml(item.node || "-")}</td>
          <td>${escapeHtml(item.resolvedBy || requestRoleLabel(item.resolvedByRole) || "-")}</td>
          <td>${escapeHtml(item.resolvedComment || item.text || "Замечание устранено")}</td>
        </tr>
      `;
    }
  );
  const openRows = engineerReportRows(
    stats.openRemarks.slice(0, printable ? 60 : 12),
    "Открытых замечаний нет",
    item => `
      <tr>
        <td>${escapeHtml(dateTimeHuman(item.createdAt))}</td>
        <td>${escapeHtml(item.area || "-")}</td>
        <td>${escapeHtml(item.equipment || "-")}</td>
        <td>${escapeHtml(item.node || "-")}</td>
        <td>${escapeHtml(item.author || requestRoleLabel(item.authorRole) || "-")}</td>
        <td>${escapeHtml(item.text || "-")}</td>
      </tr>
    `
  );
  const problemRows = engineerReportRows(
    stats.topProblems,
    "Проблемные узлы не выявлены",
    item => `
      <tr>
        <td>${escapeHtml(item.area || "-")}</td>
        <td>${escapeHtml(item.equipment || "-")}</td>
        <td>${escapeHtml(item.node || "-")}</td>
        <td>${item.count}</td>
        <td>${escapeHtml(durationText(item.downtimeMs))}</td>
        <td>${item.downtimeMs ? "В первую очередь проверить причину простоя" : "Контроль повторных замечаний"}</td>
      </tr>
    `
  );
  const repeatRows = engineerReportRows(
    annual.repeatedBreakdowns,
    "Повторных поломок и повторных замечаний за год не выявлено",
    item => `
      <tr>
        <td>${escapeHtml(item.area || "-")}</td>
        <td>${escapeHtml(item.equipment || "-")}</td>
        <td>${escapeHtml(item.node || "-")}</td>
        <td>${item.count}</td>
        <td>${escapeHtml(durationText(item.downtimeMs))}</td>
        <td>${escapeHtml(item.texts[0] || "Проверить причину повторения")}</td>
      </tr>
    `
  );
  const employeeRows = engineerReportRows(
    annual.employeeRating,
    "За год пока нет закрытых работ по сотрудникам",
    (worker, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(worker.name)}</td>
        <td>${escapeHtml(worker.roleLabel)}</td>
        <td>${worker.closed}</td>
        <td>${worker.installs}</td>
        <td>${worker.kpd === null ? "нет данных" : `${worker.kpd}%`}${worker.avgMs ? ` · ${escapeHtml(durationText(worker.avgMs))}` : ""}</td>
      </tr>
    `
  );
  const costRows = engineerReportRows(
    annual.equipmentCosts,
    "За год нет складских позиций с указанной ценой",
    item => `
      <tr>
        <td>${escapeHtml(item.area || "-")}</td>
        <td>${escapeHtml(item.equipment || "-")}</td>
        <td>${item.count}</td>
        <td>${formatMoney(item.total)}</td>
        <td>${escapeHtml(item.lastItem || "-")}</td>
        <td>${item.total ? "Контроль затрат по оборудованию" : "-"}</td>
      </tr>
    `
  );
  return `
    <article class="engineer-report ${printable ? "printable" : ""}">
      ${printable ? "" : `<div class="engineer-factory-index">${directorFactoryAnalyticsGraphHtml()}</div>`}
      <div class="engineer-report-title">
        <div>
          <span>Месячный отчёт</span>
          <h2>Отчёт инженера за ${escapeHtml(stats.label)}</h2>
          <p>Кратко показывает состояние оборудования, простои, выполненные работы, QR-обходы и нерешённые замечания.</p>
        </div>
        <div class="factory-current-score ${band}">
          <strong>${stats.reliabilityScore}</strong>
          <span>индекс месяца</span>
        </div>
      </div>
      <div class="engineer-report-summary">
        <div><strong>${durationText(stats.downtimeMs)}</strong><span>простой за месяц</span></div>
        <div><strong>${stats.downtimeItems.length}</strong><span>остановок всего</span></div>
        <div><strong>${stats.createdRemarks.length}</strong><span>новых замечаний</span></div>
        <div><strong>${stats.closedRemarks.length + stats.doneRequests.length}</strong><span>закрыто работ</span></div>
        <div><strong>${stats.openRemarks.length}</strong><span>открыто сейчас</span></div>
        <div><strong>${stats.qrPercent}%</strong><span>QR-обходы ${stats.monthStats.qrDone}/${stats.monthStats.qrPlan}</span></div>
        <div><strong>${stats.pprSheets.filter(item => item.completion.complete).length}/${stats.pprSheets.length}</strong><span>листов ППР выполнено</span></div>
      </div>
      <div class="engineer-report-year-strip">
        <div><strong>${annual.repeatedBreakdowns.length}</strong><span>повторных проблем за ${annual.year}</span></div>
        <div><strong>${bestEmployee ? escapeHtml(bestEmployee.name) : "нет данных"}</strong><span>лидер по выполненным работам${bestEmployee ? `: ${bestEmployee.closed}` : ""}</span></div>
        <div><strong>${formatMoney(annual.totalCost)}</strong><span>затраты всего: склад ${formatMoney(annual.warehouseCost)} · услуги ${formatMoney(annual.serviceCost)}</span></div>
      </div>
      ${!printable && ["engineer", "editor"].includes(profile?.role) ? `
        <section class="engineer-service-form">
          <div>
            <strong>Услуги / работы за сегодня</strong>
            <span>Если сегодня услуг не было, ничего заполнять не нужно.</span>
          </div>
          <div class="engineer-service-grid">
            <select id="serviceCostArea">
              ${serviceAreas.map(area => `<option value="${escapeHtml(area)}" ${area === current.serviceCostArea ? "selected" : ""}>${escapeHtml(area)}</option>`).join("")}
            </select>
            <select id="serviceCostEquipment">
              ${serviceEquipment.map(eq => `<option value="${eq.id}" ${String(eq.id) === String(current.serviceCostEquipmentId) ? "selected" : ""}>${escapeHtml(eq.name)}</option>`).join("")}
            </select>
            <select id="serviceCostNode">
              ${(selectedServiceEquipment?.nodes || []).map((node, index) => `<option value="${index}" ${String(index) === String(current.serviceCostNodeIndex) ? "selected" : ""}>${escapeHtml(node)}</option>`).join("")}
            </select>
            <input id="serviceCostAmount" type="text" inputmode="decimal" placeholder="Цена услуги">
            <input id="serviceCostComment" type="text" placeholder="Комментарий по работе / услуге">
            <button type="button" id="addServiceCostButton">Добавить услугу</button>
          </div>
        </section>
      ` : ""}
      <section class="engineer-report-note">
        <strong>Как объяснить директору:</strong>
        <span>Если индекс высокий и простои падают - оборудование под контролем. Если индекс падает, смотрим простои, открытые замечания и повторные поломки. Деньги считаются по ценам склада и записанным инженером услугам.</span>
      </section>
      <section class="engineer-report-block">
        <h3>1. Что произошло за месяц</h3>
        <table><thead><tr><th>Дата</th><th>Участок</th><th>Оборудование</th><th>Узел</th><th>Тип / время</th><th>Причина</th></tr></thead><tbody>${happenedRows}</tbody></table>
      </section>
      <section class="engineer-report-block">
        <h3>2. Что сделали и закрыли</h3>
        <table><thead><tr><th>Дата</th><th>Участок</th><th>Оборудование</th><th>Узел</th><th>Исполнитель</th><th>Работа</th></tr></thead><tbody>${closedRows}</tbody></table>
      </section>
      <section class="engineer-report-block">
        <h3>Листы планового обслуживания ППР</h3>
        <table><thead><tr><th>Дата</th><th>Статус</th><th>Работ</th><th>Работы и исполнители</th><th>План составил</th><th>Принял инженер</th></tr></thead><tbody>${pprRows}</tbody></table>
      </section>
      <section class="engineer-report-block">
        <h3>3. Что осталось в работе</h3>
        <table><thead><tr><th>Дата</th><th>Участок</th><th>Оборудование</th><th>Узел</th><th>Автор</th><th>Замечание</th></tr></thead><tbody>${openRows}</tbody></table>
      </section>
      <section class="engineer-report-block">
        <h3>4. Проблемные узлы для контроля</h3>
        <table><thead><tr><th>Участок</th><th>Оборудование</th><th>Узел</th><th>Событий</th><th>Простой</th><th>Вывод</th></tr></thead><tbody>${problemRows}</tbody></table>
      </section>
      <section class="engineer-report-block">
        <h3>5. Анализ повторных поломок за ${annual.year}</h3>
        <table><thead><tr><th>Участок</th><th>Оборудование</th><th>Узел</th><th>Повторов</th><th>Простой</th><th>Комментарий</th></tr></thead><tbody>${repeatRows}</tbody></table>
      </section>
      <section class="engineer-report-block">
        <h3>6. Рейтинг сотрудников по выполненным работам за ${annual.year}</h3>
        <table><thead><tr><th>№</th><th>Сотрудник</th><th>Должность</th><th>Выполнено</th><th>Установки</th><th>КПД / среднее время</th></tr></thead><tbody>${employeeRows}</tbody></table>
      </section>
      <section class="engineer-report-block">
        <h3>7. Затраты по складу за ${annual.year}</h3>
        <table><thead><tr><th>Участок</th><th>Оборудование</th><th>Позиций</th><th>Сумма</th><th>Последняя позиция</th><th>Вывод</th></tr></thead><tbody>${costRows}</tbody></table>
      </section>
      <section class="engineer-report-block">
        <h3>8. Услуги и работы инженера за выбранный месяц</h3>
        <table><thead><tr><th>Дата</th><th>Цех</th><th>Оборудование</th><th>Узел</th><th>Сумма</th><th>Комментарий</th></tr></thead><tbody>${serviceRows}</tbody></table>
      </section>
      <div class="engineer-report-signatures">
        <div>Инженер: ____________________</div>
        <div>Директор: ____________________</div>
        <div>Дата: ____________________</div>
      </div>
    </article>
  `;
}

function renderEngineerReport() {
  if (!ui.engineerReportPanel) return;
  if (ui.engineerReportMonth) ui.engineerReportMonth.value = current.engineerReportMonth || todayISO().slice(0, 7);
  ui.engineerReportPanel.innerHTML = engineerMonthlyReportHtml(current.engineerReportMonth);
  ui.engineerReportPanel.querySelector("#serviceCostArea")?.addEventListener("change", event => {
    current.serviceCostArea = event.currentTarget.value;
    current.serviceCostEquipmentId = "";
    current.serviceCostNodeIndex = "";
    renderEngineerReport();
  });
  ui.engineerReportPanel.querySelector("#serviceCostEquipment")?.addEventListener("change", event => {
    current.serviceCostEquipmentId = event.currentTarget.value;
    current.serviceCostNodeIndex = "";
    renderEngineerReport();
  });
  ui.engineerReportPanel.querySelector("#serviceCostNode")?.addEventListener("change", event => {
    current.serviceCostNodeIndex = event.currentTarget.value;
  });
  ui.engineerReportPanel.querySelector("#addServiceCostButton")?.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
    const amount = ui.engineerReportPanel.querySelector("#serviceCostAmount")?.value || "";
    const comment = ui.engineerReportPanel.querySelector("#serviceCostComment")?.value || "";
    const item = createServiceCost({
      date: todayISO(),
      area: current.serviceCostArea,
      equipmentId: current.serviceCostEquipmentId,
      nodeIndex: current.serviceCostNodeIndex,
      amount,
      comment
    });
    if (!item) {
      window.alert("Заполните цену услуги и комментарий.");
      return;
    }
    saveState();
    renderEngineerReport();
  }));
}

function printEngineerMonthlyReport(monthKey = current.engineerReportMonth) {
  const html = engineerMonthlyReportHtml(monthKey, true);
  const popup = window.open("", "_blank", "width=1180,height=820");
  if (!popup) {
    window.print();
    return;
  }
  popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт инженера ${escapeHtml(monthDisplayName(monthKey))}</title><style>
    body{font-family:Arial,sans-serif;margin:18px;color:#111827;background:#fff}
    .engineer-report-title{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:12px}
    .engineer-report-title span{text-transform:uppercase;font-size:11px;font-weight:800;color:#475569}
    h2{margin:4px 0 6px;font-size:24px} h3{margin:18px 0 8px;font-size:15px}
    p{margin:0;color:#475569}.factory-current-score{border:2px solid #111827;border-radius:8px;padding:10px 18px;text-align:center}.factory-current-score strong{display:block;font-size:32px}
    .engineer-report-summary{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:12px 0}.engineer-report-summary div{border:1px solid #cbd5e1;border-radius:8px;padding:8px}.engineer-report-summary strong{display:block;font-size:18px}.engineer-report-summary span{font-size:11px;color:#475569}
    .engineer-report-year-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.engineer-report-year-strip div{border:1px solid #cbd5e1;border-left:4px solid #2563eb;border-radius:8px;padding:8px;background:#eff6ff}.engineer-report-year-strip strong,.engineer-report-year-strip span{display:block}.engineer-report-year-strip strong{font-size:17px}.engineer-report-year-strip span{font-size:11px;color:#475569}
    .engineer-report-note{border:1px solid #cbd5e1;background:#f8fafc;border-radius:8px;padding:10px;margin:12px 0}.engineer-report-note strong{display:block;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;page-break-inside:auto}th,td{border:1px solid #cbd5e1;padding:6px 7px;font-size:11px;vertical-align:top}th{background:#e2e8f0;text-align:left}.engineer-report-empty{text-align:center;color:#64748b}
    .engineer-report-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:24px;font-weight:700}.engineer-report-block{page-break-inside:auto}
    @media print{body{margin:10mm}.engineer-report-block{break-inside:auto}.engineer-report-summary{grid-template-columns:repeat(3,1fr)}.engineer-report-year-strip{grid-template-columns:repeat(3,1fr)}}
  </style></head><body>${html}<script>window.onload=()=>{window.print();};<\/script></body></html>`);
  popup.document.close();
}

function directorDowntimeDetail(stats) {
  const rows = stats.items.map(item => `
    <div class="director-downtime-row ${item.endedAt ? "closed" : "active"}">
      <span class="director-downtime-signal"></span>
      <div>
        <strong>${escapeHtml(item.equipment || item.area || "Оборудование")}</strong>
        <small>${escapeHtml(item.node || "")}${item.area ? ` · ${escapeHtml(item.area)}` : ""}</small>
        <p>${escapeHtml(item.comment || "Причина не указана")}</p>
      </div>
      <div class="director-downtime-time">
        <b>${item.endedAt ? "Завершён" : "Идёт сейчас"}</b>
        <span>${durationText(item.endedAt ? downtimeDurationMs(item) : downtimeDurationMs(item, Date.now()))}</span>
        <small>${dateTimeHuman(item.startedAt)}${item.endedAt ? ` → ${dateTimeHuman(item.endedAt)}` : ""}</small>
      </div>
    </div>
  `).join("");
  return `<div class="director-downtime-detail">
    <div class="director-downtime-detail-head">
      <div><h2>Простои за сегодня</h2><p>Причина, оборудование, время начала и длительность</p></div>
    </div>
    ${rows || `<div class="director-empty-ok"><span class="traffic-dot"></span><strong>Простоев сегодня нет</strong></div>`}
  </div>`;
}

function directorControlTotals() {
  const equipment = allEquipment();
  const walks = equipment.map(eq => directorTodayWalk(eq));
  const done = walks.reduce((sum, walk) => sum + walk.done, 0);
  const total = walks.reduce((sum, walk) => sum + walk.total, 0);
  const allRemarks = directorOpenRemarks();
  const remarks = directorRecentRemarks();
  const archivedRemarks = directorArchivedRemarks();
  const resolvedToday = Object.values(state.checks || {}).filter(rec =>
    String(rec?.to?.resolvedAt || "").slice(0, 10) === todayISO()
  ).length;
  return {
    equipment,
    done,
    total,
    percent: total ? Math.round(done / total * 100) : 0,
    remarks,
    allRemarks,
    archivedRemarks,
    overdueRemarks: remarks.filter(directorRemarkOverdue).length,
    resolvedToday,
    requests: directorRequestStats(),
    users: directorUserStats(),
    downtime: directorTodayDowntimeStats(),
    calendar: directorCalendarItems(equipment),
    reminders: directorReminderItems(equipment),
    health: equipment.filter(eq => eq.area !== "Резерв").map(eq => ({ eq, ...directorEquipmentHealth(eq) })),
    recommendedSchedule: directorRecommendedSchedule(equipment)
  };
}

function directorEquipmentDetail(eq) {
  const walk = directorTodayWalk(eq);
  const nodeRows = eq.nodes.map((node, index) => {
    const rec = getRecord(eq.id, index, walk.shift.date);
    const done = isNodeShiftChecked(rec, walk.shift.key);
    const item = rec?.to || {};
    const checker = item.updatedByName || item.commentOwnerName || item.checkedBy || "";
    const time = item.updatedAt || item.commentUpdatedAt || "";
    return `<li class="${done ? "done" : "missing"}"><span>${done ? "✓" : "×"}</span><div><strong>${escapeHtml(node)}</strong><small>${checker ? `${escapeHtml(checker)}${time ? ` · ${dateTimeHuman(time)}` : ""}` : "Не проверено"}</small></div></li>`;
  }).join("");
  let special = "";
  if (eq.area === COMPRESSOR_JOURNAL_AREA) {
    special = `<div class="director-special-list">${compressorJournalDateRows(eq.area, todayISO()).map(row => `
      <div class="${compressorJournalRowComplete(row) ? "green" : "red"}">
        <span class="traffic-dot"></span><strong>${escapeHtml(row.compressor)}</strong><small>${compressorJournalRowComplete(row) ? "Заполнено" : "Не заполнено"}</small>
      </div>`).join("")}</div>`;
  }
  if (eq.area === GAS_JOURNAL_AREA) {
    special = `<div class="director-special-list">
      <div class="${gasJournalRowCompleteA(todayISO()) ? "green" : "red"}"><span class="traffic-dot"></span><strong>ШГРП / ГРП / ГРУ</strong><small>${gasJournalRowCompleteA(todayISO()) ? "Заполнено" : "Не заполнено"}</small></div>
      <div class="${gasJournalRowCompleteB(todayISO()) ? "green" : "red"}"><span class="traffic-dot"></span><strong>Подземный газопровод</strong><small>${gasJournalRowCompleteB(todayISO()) ? "Заполнено" : "Не заполнено"}</small></div>
    </div>`;
  }
  return `
    <div class="director-detail">
      <button type="button" class="director-detail-close" data-director-detail-close>×</button>
      <h2>${escapeHtml(eq.name)}</h2>
      <p>${escapeHtml(eq.area)} · ${walk.shift.label}: проверено ${walk.done}/${walk.total}</p>
      ${special}
      <h3>Обход по узлам</h3>
      <ul class="director-node-list">${nodeRows}</ul>
    </div>`;
}

function renderDirectorControl() {
  if (!ui.directorControlPanel || !["director", "editor"].includes(profile?.role)) return;
  const directorAnalyticsOnly = profile?.role === "director";
  ui.subtitle.textContent = directorAnalyticsOnly ? "Статистика" : "Общий контроль";
  const totals = directorControlTotals();
  const detailEq = current.directorControlEquipmentId ? equipmentById(current.directorControlEquipmentId) : null;
  const controlRows = totals.equipment.filter(eq => eq.area !== "Резерв").map(eq => {
    const stateInfo = directorJournalState(eq);
    const walk = directorTodayWalk(eq);
    const color = stateInfo.color === "red" || walk.done === 0
      ? "red"
      : stateInfo.color === "yellow" || walk.done < walk.total
        ? "yellow"
        : "green";
    return `<button type="button" class="director-status-row ${color}" data-director-equipment="${eq.id}">
      <span class="traffic-dot"></span>
      <strong>${escapeHtml(eq.name)}</strong>
      <small>Журнал: ${escapeHtml(stateInfo.text)} · Обход: ${walk.done}/${walk.total}</small>
    </button>`;
  }).join("");
  const healthRows = totals.health
    .sort((a, b) => a.score - b.score || a.eq.name.localeCompare(b.eq.name, "ru"))
    .map(item => `
      <button type="button" class="director-health-row ${item.color}" data-director-equipment="${item.eq.id}">
        <span class="traffic-dot"></span>
        <div><strong>${escapeHtml(item.eq.name)}</strong><small>Замечания ${item.remarks} · Просрочки ${item.overdueDays} · Аварийные ${item.emergencyRequests} · Ремонты за 30 дней ${item.repairs}</small></div>
        <b>${item.score}%</b>
      </button>
    `).join("");
  const monthCalendar = renderPprMonthCalendar(totals.equipment);
  const todayMaintenance = totals.equipment
    .filter(eq => eq.area !== "Резерв")
    .map(eq => ({ eq, plan: directorRecommendedMaintenance(eq) }))
    .filter(item => item.plan.daysUntil === 0);
  const pendingTodayMaintenance = todayMaintenance.filter(item =>
    !pprJournalCompletion(item.eq, todayISO(), item.plan.node).complete
  ).length;
  const kpiDetails = current.directorKpiOpen === "requests"
    ? `<section class="director-kpi-details">
        <div class="director-section-head"><div><span>📋</span><h2>${current.directorArchiveOpen === "requests" ? "Архив заявок" : "Заявки за последние 24 часа"}</h2></div><small>${current.directorArchiveOpen === "requests" ? "Старше суток" : "Этап и ответственный"}</small></div>
        <div class="director-archive-actions"><button type="button" class="director-archive-button" data-toggle-director-archive="requests">${current.directorArchiveOpen === "requests" ? "Показать последние 24 часа" : `Архив (${totals.requests.archive || 0})`}</button></div>
        <div class="director-info-list">${current.directorArchiveOpen === "requests" ? directorRequestDetailRows(directorArchivedRequests(), true) : directorRequestDetailRows(directorRecentRequests(), false)}</div>
      </section>`
    : current.directorKpiOpen === "remarks"
      ? `<section class="director-kpi-details">
          <div class="director-section-head"><div><span>⚠</span><h2>${current.directorArchiveOpen === "remarks" ? "Архив замечаний" : "Замечания за последние 24 часа"}</h2></div><small>${current.directorArchiveOpen === "remarks" ? "Старше суток" : "Оборудование и описание"}</small></div>
          <div class="director-archive-actions"><button type="button" class="director-archive-button" data-toggle-director-archive="remarks">${current.directorArchiveOpen === "remarks" ? "Показать последние 24 часа" : `Архив (${totals.archivedRemarks.length})`}</button></div>
          <div class="director-info-list">${current.directorArchiveOpen === "remarks" ? directorRemarkDetailRows(totals.archivedRemarks) : directorRemarkDetailRows(totals.remarks)}</div>
        </section>`
      : current.directorKpiOpen === "downtime"
        ? directorDowntimeDetail(totals.downtime)
        : current.directorKpiOpen === "calendar"
          ? `<section class="director-kpi-details director-calendar-details">
              <div class="director-section-head"><div><span>🗓️</span><h2>Календарь ППР</h2></div><small>Расчётный план</small></div>
              ${monthCalendar}
              <p class="director-safe-note">Компрессорная и газовое хозяйство — каждые 7 дней, остальное оборудование — каждые 14 дней. Выполнение подтверждается автоматически после заполнения журнала за назначенную дату.</p>
            </section>`
        : "";
  const compactHealthRows = totals.health
    .sort((a, b) => a.score - b.score || a.eq.name.localeCompare(b.eq.name, "ru"))
    .slice(0, 8)
    .map(item => `
      <div class="director-health-row ${item.color}">
        <span class="traffic-dot"></span>
        <div><strong>${escapeHtml(item.eq.name)}</strong><small>Замечания ${item.remarks} · Просрочки ${item.overdueDays} · Ремонты ${item.repairs}</small></div>
        <b>${item.score}%</b>
      </div>
    `).join("");
  const directorAnalyticsHtml = `
    <div class="director-control-head director-analytics-head director-analytics-only-head">
      <div><span>СТАТИСТИКА ПРЕДПРИЯТИЯ</span><h1>Главный график завода</h1><p>Сегодня: ${dateHuman(todayISO())}</p></div>
      <div class="director-control-actions">
        <button type="button" data-refresh-director-control>Обновить</button>
      </div>
    </div>
    <div class="director-main-graph-only">${directorFactoryAnalyticsGraphHtml()}</div>
  `;
  if (directorAnalyticsOnly) {
    ui.directorControlPanel.innerHTML = directorAnalyticsHtml;
    ui.directorControlPanel.querySelector("[data-refresh-director-control]")?.addEventListener("click", async event => {
      await runButtonOperation(event.currentTarget, async () => {
        await loadRemoteState();
        await loadRemoteUsers();
      }, "Обновляем...");
    });
    return;
  }
  ui.directorControlPanel.innerHTML = `
    <div class="director-control-head">
      <div><span>КОНТРОЛЬ ПРЕДПРИЯТИЯ</span><h1>Общее состояние завода</h1><p>Сегодня: ${dateHuman(todayISO())}</p></div>
      <div class="director-control-actions">
        ${profile?.role === "editor" ? `<button type="button" class="director-normal-screen-button" data-open-normal-screen>← Главный экран</button>` : ""}
        <button type="button" class="director-reminder-button ${totals.reminders.length ? "has-alerts" : ""}" data-open-global-reminders>🔔 Напоминания <strong>${totals.reminders.length}</strong></button>
        <button type="button" data-refresh-director-control>Общее состояние завода</button>
        <button type="button" data-open-director-messages>Директорская</button>
        <button type="button" data-toggle-audit-history>История изменений</button>
      </div>
    </div>
    <button type="button" class="director-progress-card director-progress-toggle ${current.directorProgressOpen ? "open" : ""}" data-toggle-director-progress aria-expanded="${current.directorProgressOpen}">
      <div><strong>${totals.percent}%</strong><span>Обходы по узлам</span><b>${current.directorProgressOpen ? "Скрыть список ▲" : "Показать список ▼"}</b></div>
      <div class="director-progress"><i style="width:${totals.percent}%"></i></div>
      <small>${totals.done} из ${totals.total} узлов</small>
    </button>
    <section class="director-progress-details ${current.directorProgressOpen ? "open" : ""}" ${current.directorProgressOpen ? "" : "hidden"}>
      <div class="director-section-head"><div><span>🏭</span><h2>Обходы по узлам — сегодня</h2></div><small>Журнал и проверенные узлы</small></div>
      <div class="director-status-list director-progress-status-list">${controlRows}</div>
    </section>
    <div class="director-kpi-grid">
      <button type="button" class="director-kpi-button ${totals.requests.open ? "has-alerts" : ""} ${current.directorKpiOpen === "requests" ? "selected" : ""}" data-toggle-director-kpi="requests" aria-expanded="${current.directorKpiOpen === "requests"}"><span>📋 Заявки</span><strong>${totals.requests.open}</strong><small>Последние 24 часа · Архив ${totals.requests.archive || 0} · Просрочено ${totals.requests.overdue} · ${current.directorKpiOpen === "requests" ? "Скрыть ▲" : "Подробнее ▼"}</small></button>
      <button type="button" class="director-kpi-button ${totals.remarks.length ? "has-alerts" : ""} ${totals.overdueRemarks ? "danger" : ""} ${current.directorKpiOpen === "remarks" ? "selected" : ""}" data-toggle-director-kpi="remarks" aria-expanded="${current.directorKpiOpen === "remarks"}"><span>⚠ Замечания</span><strong>${totals.remarks.length}</strong><small>Последние 24 часа · Архив ${totals.archivedRemarks.length} · Устранено сегодня ${totals.resolvedToday} · ${current.directorKpiOpen === "remarks" ? "Скрыть ▲" : "Подробнее ▼"}</small></button>
      <button type="button" class="director-kpi-button director-downtime-kpi ${totals.downtime.active.length ? "has-alerts danger" : totals.downtime.items.length ? "warning" : "ok"} ${current.directorKpiOpen === "downtime" ? "selected" : ""}" data-toggle-director-kpi="downtime" aria-expanded="${current.directorKpiOpen === "downtime"}">
        <span>⏱ Простои</span><strong>${totals.downtime.active.length}</strong>
        <small>Сейчас · За сегодня ${totals.downtime.items.length} · Всего ${durationText(totals.downtime.totalMs)} · ${current.directorKpiOpen === "downtime" ? "Скрыть ▲" : "Подробнее ▼"}</small>
      </button>
      <button type="button" class="director-kpi-button ${pendingTodayMaintenance ? "has-alerts" : ""} ${current.directorKpiOpen === "calendar" ? "selected" : ""}" data-toggle-director-kpi="calendar" aria-expanded="${current.directorKpiOpen === "calendar"}"><span>📅 Календарь ППР</span><strong>${pendingTodayMaintenance}</strong><small>Невыполненных работ сегодня · ${current.directorKpiOpen === "calendar" ? "Скрыть календарь ▲" : "Открыть календарь ▼"}</small></button>
    </div>
    ${kpiDetails}
    <section class="audit-history-panel" ${current.directorAuditOpen ? "" : "hidden"}>
      <div class="director-section-head"><div><span>🕘</span><h2>История изменений</h2></div><small>Последние 100 действий</small></div>
      <div class="audit-history-list">${auditHistoryRows()}</div>
    </section>
    ${directorAnnualStatsHtml()}
    <section class="director-health-card">
      <div class="director-section-head"><div><span>📊</span><h2>Индекс состояния оборудования</h2></div><small>Автоматический расчёт</small></div>
      <div class="director-health-legend"><span class="green">90–100 отлично</span><span class="yellow">70–89 замечания</span><span class="orange">50–69 внимание</span><span class="red">менее 50 высокий риск</span></div>
      <div class="director-health-list">${healthRows}</div>
    </section>
    ${detailEq ? directorEquipmentDetail(detailEq) : ""}
  `;
  ui.directorControlPanel.querySelector("[data-refresh-director-control]")?.addEventListener("click", async event => {
    await runButtonOperation(event.currentTarget, async () => {
      await loadRemoteState();
      await loadRemoteUsers();
    }, "Обновляем...");
  });
  ui.directorControlPanel.querySelector("[data-open-director-messages]")?.addEventListener("click", () => show("director"));
  ui.directorControlPanel.querySelector("[data-toggle-audit-history]")?.addEventListener("click", () => {
    current.directorAuditOpen = !current.directorAuditOpen;
    renderDirectorControl();
  });
  ui.directorControlPanel.querySelectorAll("[data-toggle-director-kpi]").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.toggleDirectorKpi;
      const wasOpen = current.directorKpiOpen === target;
      current.directorKpiOpen = wasOpen ? "" : target;
      current.directorArchiveOpen = "";
      renderDirectorControl();
    });
  });
  ui.directorControlPanel.querySelectorAll("[data-toggle-director-archive]").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.toggleDirectorArchive;
      current.directorArchiveOpen = current.directorArchiveOpen === target ? "" : target;
      renderDirectorControl();
    });
  });
  bindPprCalendarControls(ui.directorControlPanel, renderDirectorControl);
  ui.directorControlPanel.querySelector("[data-toggle-director-progress]")?.addEventListener("click", () => {
    current.directorProgressOpen = !current.directorProgressOpen;
    renderDirectorControl();
  });
  ui.directorControlPanel.querySelector("[data-open-normal-screen]")?.addEventListener("click", () => {
    nav.length = 0;
    show("equipment", false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  ui.directorControlPanel.querySelector("[data-open-global-reminders]")?.addEventListener("click", () => {
    renderGlobalReminderPanel();
    ui.globalReminderOverlay.hidden = false;
    document.body.classList.add("global-reminder-open");
  });
  ui.directorControlPanel.querySelectorAll("[data-director-equipment]").forEach(button => {
    button.addEventListener("click", () => {
      current.directorControlEquipmentId = Number(button.dataset.directorEquipment);
      renderDirectorControl();
      ui.directorControlPanel.querySelector(".director-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  ui.directorControlPanel.querySelector("[data-director-detail-close]")?.addEventListener("click", () => {
    current.directorControlEquipmentId = null;
    renderDirectorControl();
  });
}

function renderDirector() {
  const isEditor = isEditorSession();
  ui.subtitle.textContent = isEditor ? "Админ · Регистрации" : "Директорская";
  if (ui.directorTitle) ui.directorTitle.textContent = isEditor ? "Подтверждение сотрудников" : "Директорская";
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

  ui.directorMeta.textContent = isEditor
    ? `Ожидают подтверждения: ${pendingUserApprovalCount()}. Всего сотрудников: ${loadUsers().length}`
    : isDirector
      ? `Обращений: ${messages.length}`
      : "Ваши сообщения видите только вы и директор";

  ui.directorPanel.innerHTML = `
    ${isEditor ? renderDirectorUsers() : isDirector ? "" : renderDirectorSendForm()}
    ${isEditor ? "" : `<div class="director-messages">
      ${messages.length ? "" : `<div class="empty-state">${isDirector ? "Новых обращений нет" : "Вы еще не писали директору"}</div>`}
    </div>`}
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
  ui.directorPanel.querySelectorAll("[data-user-role], [data-user-area]").forEach(select => {
    select.addEventListener("change", event => {
      const row = event.currentTarget.closest("[data-user-key]");
      const userKey = row?.dataset.userKey || "";
      if (!userKey) return;
      const draft = userApprovalDrafts.get(userKey) || {};
      if (event.currentTarget.matches("[data-user-role]")) draft.role = event.currentTarget.value;
      if (event.currentTarget.matches("[data-user-area]")) draft.area = event.currentTarget.value;
      userApprovalDrafts.set(userKey, draft);
    });
  });
  ui.directorPanel.querySelectorAll("[data-approve-user]").forEach(button => {
    button.addEventListener("click", event => {
      const userKey = event.currentTarget.dataset.approveUser || "";
      const users = loadUsers();
      const user = users.find(item => (item.id || item.employeeId || item.phone || item.name || "") === userKey);
      if (!user || !window.confirm(`Подтвердить регистрацию: ${user.name || user.phone || ""}?`)) return;
      const row = event.currentTarget.closest(".director-user-row");
      const role = row?.querySelector("[data-user-role]")?.value || user.role || "";
      const area = row?.querySelector("[data-user-area]")?.value || "";
      if (!role) {
        window.alert("Сначала назначьте должность сотрудника.");
        return;
      }
      user.approved = true;
      user.pendingApproval = false;
      user.registrationPending = false;
      user.status = "approved";
      user.role = role;
      if (needsArea(role) && !area) {
        window.alert("Для этой должности сначала выберите участок.");
        return;
      }
      user.area = needsArea(role) ? area : "";
      user.approvedAt = new Date().toISOString();
      user.approvedBy = profile?.name || "";
      userApprovalDrafts.delete(userKey);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      apiJson("/api/users", {
        method: "POST",
        body: JSON.stringify({
          ...user,
          actor: { name: authenticatedProfile?.name || profile?.name || "", role: authenticatedProfile?.role || "" },
          actionId: nextActionId(),
          clientId: CLIENT_ID
        })
      }).then(loadRemoteUsers).catch(() => {});
      renderDirector();
    });
  });
  ui.directorPanel.querySelectorAll("[data-reset-user-password]").forEach(button => {
    button.addEventListener("click", async event => {
      const userKey = event.currentTarget.dataset.resetUserPassword || "";
      const users = loadUsers();
      const user = users.find(item => (item.id || item.employeeId || item.phone || item.name || "") === userKey);
      if (!user) return;
      const newPassword = window.prompt(`Новый временный пароль для ${user.name || user.phone}:`);
      if (!newPassword) return;
      if (newPassword.length < 6) {
        window.alert("Пароль должен содержать минимум 6 символов.");
        return;
      }
      await runButtonOperation(event.currentTarget, async () => {
        await apiJson("/api/users", {
          method: "POST",
          body: JSON.stringify({
            ...user,
            newPassword,
            actor: { name: authenticatedProfile?.name || profile?.name || "", role: authenticatedProfile?.role || "" },
            actionId: nextActionId(),
            clientId: CLIENT_ID
          })
        });
        await loadRemoteUsers();
        renderDirector();
      }, "Сохраняем...");
    });
  });
  ui.directorPanel.querySelectorAll("[data-delete-user]").forEach(button => {
    button.addEventListener("click", event => {
      const userKey = event.currentTarget.dataset.deleteUser || "";
      const users = loadUsers();
      const user = users.find(item => (item.id || item.employeeId || item.phone || item.name || "") === userKey);
      if (!user || !window.confirm(`Удалить сотрудника: ${user.name || user.phone || ""}?`)) return;
      const reason = window.prompt("Укажите причину удаления сотрудника:")?.trim();
      if (!reason) return;
      recordAudit("Удалил сотрудника", user.name || user.phone || userKey, reason);
      saveState();
      const nextUsers = users.filter(item => (item.id || item.employeeId || item.phone || item.name || "") !== userKey);
      localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
      apiJson("/api/users", {
        method: "POST",
        body: JSON.stringify({
          action: "delete",
          id: user.id || "",
          employeeId: user.employeeId || "",
          phone: user.phone || "",
          name: user.name || "",
          actor: { name: authenticatedProfile?.name || profile?.name || "", role: authenticatedProfile?.role || "" },
          actionId: nextActionId(),
          clientId: CLIENT_ID
        })
      }).then(loadRemoteUsers).catch(() => {});
      renderDirector();
    });
  });

  const list = ui.directorPanel.querySelector(".director-messages");
  if (!isEditor) messages.forEach(msg => {
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
            <button type="button" data-print-director-memo="${msg.id}">${printActionLabel("Печать", "PDF")}</button>
          </div>
        </div>
      ` : `<div class="director-reply-form"><div class="director-reply-actions"><button type="button" data-print-director-memo="${msg.id}">${printActionLabel("Печать", "PDF")}</button></div></div>`}
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
      const active = activeDowntimeForArea(current.selectedDowntimeArea);
      if (active && openDowntimeComment(active)) return;
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
      <button type="button" class="downtime-entry ${item.endedAt ? "" : "active"}" data-open-downtime-comment="${escapeHtml(item.id)}">
        <strong>${escapeHtml(item.equipment)} · ${escapeHtml(item.node)}</strong>
        <span>${downtimeTypeLabel(item.type)} · ${dateTimeHuman(item.startedAt)} - ${item.endedAt ? dateTimeHuman(item.endedAt) : "идет сейчас"} · ${durationText(downtimeDurationMs(item))}</span>
        <p>${escapeHtml(item.comment || "Без комментария")}</p>
        ${item.closeComment ? `<p>Пуск: ${escapeHtml(item.closeComment)}</p>` : ""}
        <small>${escapeHtml(item.authorName || "Сотрудник")} ${item.authorRole ? `(${escapeHtml(ROLE_ACCESS[item.authorRole]?.label || item.authorRole)})` : ""}</small>
      </button>
    `).join("") : `<div class="empty-state">По этому цеху за выбранный месяц нет комментариев простоев</div>`}
  `;
  ui.downtimeDetails.querySelectorAll("[data-open-downtime-comment]").forEach(button => {
    button.addEventListener("click", () => {
      const item = downtimes().find(entry => entry.id === button.dataset.openDowntimeComment);
      if (item && !item.endedAt) openDowntimeComment(item);
    });
  });
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
      <button type="button" data-print-aggregate-journal>${printActionLabel("Печать в альбомном виде", "PDF в альбомном виде")}</button>
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
            <th>Кто устранил / кто подтвердил</th>
          </tr>
        </thead>
        <tbody>
          ${sheetItems.length ? sheetItems.map((item, index) => {
            const rowNumber = sheetIndex * AGGREGATE_JOURNAL_ROWS_PER_SHEET + index + 1;
            const author = commentEntryAuthor({ name: item.authorName, role: item.authorRole });
            const resolverRole = ROLE_ACCESS[item.resolvedByRole]?.label || item.resolvedByRole || "";
            const resolver = item.resolvedByName ? `${item.resolvedByName}${resolverRole ? ` (${resolverRole})` : ""}` : resolverRole;
            const confirmerRole = ROLE_ACCESS[item.confirmedByRole]?.label || item.confirmedByRole || "";
            const confirmer = item.confirmedByName ? `${item.confirmedByName}${confirmerRole ? ` (${confirmerRole})` : ""}` : confirmerRole;
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
                <td>${escapeHtml(resolver ? `Устранил: ${resolver}${confirmer ? `\nПодтвердил: ${confirmer}${item.confirmedAt ? ` · ${dateTimeHuman(item.confirmedAt)}` : ""}` : ""}` : "")}</td>
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
  ui.aggregateJournalList.querySelector("[data-print-aggregate-journal]")?.addEventListener("click", () => printCurrentDocument(`ППР - Агрегатный журнал - ${selectedArea}`));
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
  const canResetPasswords = ["director", "editor"].includes(profile?.role);
  const pendingCount = users.filter(user => user.approved === false || user.pendingApproval).length;
  const cleanPhone = phone => String(phone || "").replace(/\D/g, "");
  const whatsappHref = phone => {
    const digits = cleanPhone(phone);
    return digits ? `https://wa.me/${digits}` : "";
  };
  const roleOptions = selected => `<option value="">Выберите должность</option>${Object.entries(ROLE_ACCESS)
    .map(([role, access]) => `<option value="${role}" ${selected === role ? "selected" : ""}>${escapeHtml(access.label)}</option>`)
    .join("")}`;
  const areaOptions = selected => `<option value="">Без участка</option>${AREAS
    .map(area => `<option value="${escapeHtml(area)}" ${selected === area ? "selected" : ""}>${escapeHtml(area)}</option>`)
    .join("")}`;
  return `
    <div class="director-users">
      <div class="director-users-head">
        <strong>Зарегистрированные сотрудники</strong>
        <button type="button" class="mini-action" data-refresh-users>Обновить список</button>
      </div>
      <div class="empty-state">Пароли не отображаются. Директор может выдать сотруднику новый временный пароль.</div>
      ${profile?.role === "editor" && pendingCount ? `<div class="empty-state request-alert">Новые регистрации ждут подтверждения: ${pendingCount}</div>` : ""}
      ${users.length ? users.map(user => {
        const userKey = String(user.id || user.employeeId || user.phone || user.name || "");
        const draft = userApprovalDrafts.get(userKey) || {};
        return `
        <div class="director-user-row ${user.approved === false || user.pendingApproval ? "pending-user" : ""}" data-user-key="${escapeHtml(userKey)}">
          <span>${escapeHtml(user.name || "")}</span>
          <span>Таб. № ${escapeHtml(user.employeeId || "не задан")}</span>
          <span>${escapeHtml(user.phone || "")}</span>
          ${user.approved === false || user.pendingApproval ? `
            <label class="user-access-field"><span>Должность</span><select data-user-role>${roleOptions(draft.role ?? user.role ?? "")}</select></label>
            <label class="user-access-field"><span>Участок</span><select data-user-area>${areaOptions(draft.area ?? user.area ?? "")}</select></label>
          ` : `<span>${escapeHtml(ROLE_ACCESS[user.role]?.label || user.role || "")}${user.area ? ` · ${escapeHtml(user.area)}` : ""}</span>`}
          <span class="user-approval-status">${user.approved === false || user.pendingApproval ? "Ждёт подтверждения" : "Подтверждён"}</span>
          ${whatsappHref(user.phone) ? `<a class="mini-action" href="${whatsappHref(user.phone)}" target="_blank" rel="noopener" data-whatsapp-user="${escapeHtml(user.phone)}">WhatsApp</a>` : ""}
          ${profile?.role === "editor" && (user.approved === false || user.pendingApproval) ? `<button type="button" class="mini-action" data-approve-user="${escapeHtml(user.id || user.employeeId || user.phone || user.name || "")}">Подтвердить</button>` : ""}
          ${canResetPasswords ? `<button type="button" class="mini-action" data-reset-user-password="${escapeHtml(user.id || user.employeeId || user.phone || user.name || "")}">Новый пароль</button>` : ""}
          ${profile?.role === "editor" ? `<button type="button" class="mini-action" data-delete-user="${escapeHtml(user.id || user.employeeId || user.phone || user.name || "")}">Удалить</button>` : ""}
        </div>
      `;
      }).join("") : `<div class="empty-state">Список сотрудников пока пуст</div>`}
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
  if (canManageWarehouse && warehouseReconcileVersion !== stateDataVersion) {
    warehouseReconcileVersion = stateDataVersion;
    if (reconcileWarehouseAskStockOuts()) saveState();
  }
  const warehouseData = buildWarehouseRenderData();
  const warehouseRequests = warehouseData.warehouseRequests;
  const foundRequests = warehouseRequests.filter(req => requestMatchesWarehouseSearch(req, query));
  const foundStock = query ? warehouseData.inventory.filter(item => inventoryMatchesWarehouseSearch(item, query)) : [];
  const folderArea = warehouseFolderArea();
  const pendingAsks = pendingWarehouseAsks(warehouseRequests);
  const pendingReceipts = pendingWarehouseReceipts(folderArea, warehouseRequests);
  current.selectedStockArea = folderArea;
  ui.warehousePanel.hidden = false;
  ui.warehousePanel.innerHTML = `
    <div class="warehouse-head">
      <div>
        <strong>Склады по цехам</strong>
        <span>${query ? `Найдено: запас ${foundStock.length} · заявки ${foundRequests.length}` : "Выберите папку склада или найдите запчасть"}</span>
      </div>
      <div class="stock-action-line"><button type="button" class="warehouse-archive-button ${current.warehouseInstalledArchiveOpen ? "active" : ""}" data-toggle-warehouse-installed>${current.warehouseInstalledArchiveOpen ? "Закрыть архив установок ▲" : "Открыть архив установок ▼"}</button><button type="button" class="warehouse-archive-button ${current.warehouseZeroArchiveOpen ? "active" : ""}" data-toggle-warehouse-zero>${current.warehouseZeroArchiveOpen ? "Закрыть нулевые остатки ▲" : `Открыть нулевые остатки (${zeroInventoryItems().length}) ▼`}</button></div>
    </div>
    ${renderWarehouseFolders(folderArea, warehouseData)}
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
        <input id="manualInventoryArticle" type="text" placeholder="Артикул (авто)">
        <select id="manualInventoryUnit" aria-label="Единица измерения">${inventoryUnitOptions("шт")}</select>
        <input id="manualInventoryQty" type="number" min="0.001" step="0.001" placeholder="Количество">
        <input id="manualInventoryPrice" type="text" inputmode="decimal" placeholder="Цена за 1 ед. изм.">
        <button type="button" id="manualInventoryPriceLookup">Найти цену</button>
        <input id="manualInventoryNote" type="text" placeholder="Место / полка / примечание">
        <button type="submit">Создать приход</button>
      </form>
    ` : `<div class="readonly-note">Остатки доступны только для просмотра. Добавляет и распределяет складовщик.</div>`}
    ${pendingAsks.length ? `<div class="warehouse-pending warehouse-asks">
      <div class="warehouse-stock-head">
        <strong>Запросы сотрудников на выдачу</strong>
        <span>${pendingAsks.length} ждёт выдачи</span>
      </div>
      <div class="warehouse-pending-list" id="warehouseAskList"></div>
    </div>` : ""}
    ${pendingReceipts.length ? `<div class="warehouse-pending">
      <div class="warehouse-stock-head">
        <strong>Новый приход</strong>
        <span>${pendingReceipts.length} ждёт распределения</span>
      </div>
      <div class="warehouse-pending-list" id="warehousePendingList"></div>
    </div>` : ""}
    ${current.warehouseInstalledArchiveOpen ? warehouseInstalledPartsHtml() : ""}
    ${current.warehouseZeroArchiveOpen ? warehouseZeroArchiveHtml() : ""}
    ${renderWarehouseInventory(folderArea, canManageWarehouse, warehouseData)}
    ${query ? `<div class="empty-state">${foundStock.length || foundRequests.length ? "Найденная позиция подсвечена. Если она была в другой папке, склад открыт автоматически." : "Поиск ничего не нашёл"}</div>` : ""}
  `;
  const form = ui.warehousePanel.querySelector("#manualInventoryForm");
  ui.warehousePanel.querySelector("[data-toggle-warehouse-installed]")?.addEventListener("click", () => {
    current.warehouseInstalledArchiveOpen = !current.warehouseInstalledArchiveOpen;
    current.warehouseInstalledArchivePage = 1;
    renderWarehousePanel();
  });
  ui.warehousePanel.querySelector("[data-toggle-warehouse-zero]")?.addEventListener("click", () => {
    current.warehouseZeroArchiveOpen = !current.warehouseZeroArchiveOpen;
    current.warehouseZeroArchivePage = 1;
    renderWarehousePanel();
  });
  ui.warehousePanel.querySelector("[data-print-warehouse-installed]")?.addEventListener("click", printWarehouseInstalledParts);
  ui.warehousePanel.querySelectorAll("[data-installed-page]").forEach(button => button.addEventListener("click", () => {
    current.warehouseInstalledArchivePage = Number(button.dataset.installedPage || 1);
    renderWarehousePanel();
  }));
  ui.warehousePanel.querySelectorAll("[data-zero-page]").forEach(button => button.addEventListener("click", () => {
    current.warehouseZeroArchivePage = Number(button.dataset.zeroPage || 1);
    renderWarehousePanel();
  }));
  const searchForm = ui.warehousePanel.querySelector("#warehouseSearchForm");
  const askList = ui.warehousePanel.querySelector("#warehouseAskList");
  if (askList) {
    askList.innerHTML = pendingAsks.length ? "" : `<div class="empty-state">Запросов сотрудников на выдачу нет</div>`;
    pendingAsks.forEach(req => askList.append(requestCard(req)));
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
      current.warehouseSearch = ui.warehousePanel.querySelector("#warehouseSearchInput").value.trim();
      const hit = firstWarehouseSearchHit(current.warehouseSearch);
      if (hit?.area) {
        current.selectedWarehouseFolder = hit.area;
        current.selectedStockArea = hit.area;
      }
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
  ui.warehousePanel.querySelectorAll("[data-stock-price]").forEach(input => {
    input.addEventListener("change", event => {
      if (!canManageWarehouse) return;
      const id = event.currentTarget.dataset.stockPrice;
      const item = state.inventory?.[id];
      if (!item) return;
      if (!updateInventoryUnitPrice(item, event.currentTarget.value)) {
        event.currentTarget.value = priceTextFromAmount(parseMoneyAmount(item.unitPrice || item.price || item.lastPrice || ""));
        return;
      }
      saveState();
      renderRequests();
    });
  });
  ui.warehousePanel.querySelectorAll("[data-stock-unit]").forEach(input => {
    input.addEventListener("change", () => {
      const item = state.inventory?.[input.dataset.stockUnit || ""];
      const unit = String(input.value || "").trim();
      if (!item || !unit) {
        if (item) input.value = item.unit || "шт";
        return;
      }
      item.unit = unit;
      item.updatedAt = new Date().toISOString();
      saveState();
      renderWarehousePanel();
      showAppToast(`Единица измерения сохранена: ${unit}`);
    });
  });
  ui.warehousePanel.querySelectorAll("[data-stock-price-lookup]").forEach(button => {
    button.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
      if (!canManageWarehouse) return;
      const id = event.currentTarget.dataset.stockPriceLookup;
      const item = state.inventory?.[id];
      const input = id ? ui.warehousePanel.querySelector(`[data-stock-price="${CSS.escape(id)}"]`) : null;
      if (!item || !input) return;
      input.dataset.priceLookupDone = "";
      const found = await autoFillInternetPriceInput(input, item.name, item.article, price => {
        updateInventoryUnitPrice(item, price);
      });
      if (found) {
        saveState();
      } else {
        window.alert("Цена автоматически не найдена. Введите цену вручную.");
        input.focus();
      }
    }, "Ищу..."));
  });
  ui.warehousePanel.querySelectorAll("[data-stock-move]").forEach(button => {
    button.addEventListener("click", event => runButtonOperation(event.currentTarget, () => {
      if (!canManageWarehouse) return;
      const id = button.dataset.stockMove;
      const item = state.inventory?.[id];
      const qty = Number(ui.warehousePanel.querySelector(`[data-stock-qty="${CSS.escape(id)}"]`)?.value || 0);
      const priceInput = ui.warehousePanel.querySelector(`[data-stock-price="${CSS.escape(id)}"]`);
      const targetArea = ui.warehousePanel.querySelector(`[data-stock-target="${CSS.escape(id)}"]`)?.value || item?.area || COMMON_WAREHOUSE;
      if (!item || qty <= 0 || targetArea === item.area) return;
      if (!ensureInventoryPriceForOperation(item, priceInput, "Перед переносом укажите цену за 1 единицу измерения.")) return;
      const moved = Math.min(qty, Number(item.qty || 0));
      if (removeInventory(item.area, item.name, moved, false, item.article)) {
        addInventory(targetArea, item.name, moved, item.source || `Перенос со склада ${item.area}`, {
          article: item.article,
          unit: item.unit,
          note: item.note,
          location: item.location,
          price: item.unitPrice || item.price || ""
        });
        current.selectedWarehouseFolder = targetArea;
        current.selectedStockArea = targetArea;
        saveState();
        renderRequests();
      }
    }));
  });
  ui.warehousePanel.querySelectorAll("[data-stock-issue]").forEach(button => {
    button.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
      if (!canManageWarehouse) return;
      const id = button.dataset.stockIssue;
      const item = state.inventory?.[id];
      const qty = Number(ui.warehousePanel.querySelector(`[data-stock-qty="${CSS.escape(id)}"]`)?.value || 0);
      const recipient = ui.warehousePanel.querySelector(`[data-stock-recipient="${CSS.escape(id)}"]`);
      const selected = recipient?.selectedOptions?.[0];
      const targetRole = selected?.dataset.role || "";
      const targetName = selected?.dataset.name || "";
      const targetPhone = selected?.dataset.phone || "";
      const priceInput = ui.warehousePanel.querySelector(`[data-stock-price="${CSS.escape(id)}"]`);
      if (!item || qty <= 0) return;
      if (!targetName) {
        window.alert("Выберите конкретного сотрудника, которому выдаётся запчасть.");
        recipient?.focus();
        return;
      }
      const unitPrice = ensureInventoryPriceForOperation(item, priceInput, "Перед выдачей укажите цену за 1 единицу измерения.");
      if (!unitPrice) return;
      try {
        const result = await apiJson("/api/warehouse/issue", {
          method: "POST",
          timeout: 30000,
          body: JSON.stringify({
            actionId: nextActionId(),
            clientId: CLIENT_ID,
            user: profile ? { name: profile.name || "", role: profile.role || "", phone: profile.phone || "" } : null,
            inventoryId: id,
            quantity: qty,
            targetRole,
            targetName,
            targetPhone,
            unitPrice,
            priceText: priceTextFromAmount(unitPrice)
          })
        });
        if (result?.state) mergeRealtimePatch(result.state);
        if (result?.stateVersion) setRealtimeStateVersion(result.stateVersion);
        persistStateLocally(state);
        current.requestRole = "warehouse";
        showAppToast(`Выдано: ${targetName}. Остаток: ${Number(result.available || 0)} ${item.unit || "шт"}`);
        renderRequests();
      } catch (error) {
        if (error?.message === "warehouse_insufficient_stock") {
          await syncRemoteChanges();
          window.alert(`Выдача отменена: на складе осталось только ${Number(error.data?.available || 0)} ${item.unit || "шт"}.`);
          renderRequests();
          return;
        }
        throw error;
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
    const manualName = ui.warehousePanel.querySelector("#manualInventoryName");
    const manualArticle = ui.warehousePanel.querySelector("#manualInventoryArticle");
    const manualPrice = ui.warehousePanel.querySelector("#manualInventoryPrice");
    ui.warehousePanel.querySelector("#manualInventoryPriceLookup")?.addEventListener("click", event => runButtonOperation(event.currentTarget, async () => {
      if (!manualPrice) return;
      manualPrice.dataset.priceLookupDone = "";
      const found = await autoFillInternetPriceInput(manualPrice, manualName?.value || "", manualArticle?.value || "");
      if (!found) {
        window.alert("Цена автоматически не найдена. Введите цену вручную.");
        manualPrice.focus();
      }
    }, "Ищу..."));
    form.addEventListener("submit", event => {
      event.preventDefault();
      runButtonOperation(form.querySelector("button[type='submit']"), () => {
        const area = ui.warehousePanel.querySelector("#manualInventoryArea").value;
        const name = ui.warehousePanel.querySelector("#manualInventoryName").value;
        const article = ui.warehousePanel.querySelector("#manualInventoryArticle").value;
        const unit = ui.warehousePanel.querySelector("#manualInventoryUnit").value;
        const qty = ui.warehousePanel.querySelector("#manualInventoryQty").value;
        const price = ui.warehousePanel.querySelector("#manualInventoryPrice").value;
        const note = ui.warehousePanel.querySelector("#manualInventoryNote").value;
        if (parseMoneyAmount(price) <= 0) {
          window.alert("Укажите цену за 1 единицу измерения. Без цены приход на склад запрещён.");
          ui.warehousePanel.querySelector("#manualInventoryPrice")?.focus();
          return;
        }
        if (!createManualWarehouseRequest(area, name, qty, note, article, unit, price)) return;
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
  const area = req.stockArea || req.area || COMMON_WAREHOUSE;
  const lines = requestInventoryLines(req);
  if (lines.length) {
    return lines.reduce((sum, line) => {
      const id = inventoryKey(area, line.name, line.article);
      return sum + Number(state.inventory?.[id]?.qty || 0);
    }, 0);
  }
  const id = inventoryKey(area, partNameFromRequest(req), partArticleFromRequest(req));
  return Number(state.inventory?.[id]?.qty || 0);
}

function accountingWrittenOffItems() {
  return allRequests()
    .filter(req => req.accountingWrittenOff && !req.stock)
    .sort((a, b) => String(b.updatedAt || b.createdAt || b.date).localeCompare(String(a.updatedAt || a.createdAt || a.date)));
}

function printAccountingWrittenOffReport() {
  const items = accountingWrittenOffItems();
  if (!items.length) {
    window.alert("Нет списанных деталей для печати.");
    return;
  }
  const totalQty = items.reduce((sum, req) => sum + Number(req.qtyIssued || req.qtyInstalled || 0), 0);
  const reportDate = new Date().toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" });
  const rows = items.map((req, index) => {
    const accountingApproval = req.approvals?.accounting || {};
    const installApproval = req.approvals?.productionDirector || req.approvals?.installApproval || {};
    return `
      <tr>
        <td class="num">${index + 1}</td>
        <td>
          <strong>${escapeHtml(partNameFromRequest(req))}</strong>
          <small>${escapeHtml(req.requestNumber || "")}</small>
        </td>
        <td>${escapeHtml(req.equipment || "—")}<small>${escapeHtml(req.node || "")}</small></td>
        <td>${escapeHtml(req.stockArea || req.area || "—")}</td>
        <td>${escapeHtml(requestRoleLabel(warehouseIssueTargetRole(req)))}<small>${escapeHtml(req.issueTargetName || "")}</small></td>
        <td class="qty">${Number(req.qtyIssued || req.qtyInstalled || 0)}</td>
        <td>${escapeHtml(installApproval.name || "—")}<small>${escapeHtml(dateTimeHuman(installApproval.at || ""))}</small></td>
        <td>${escapeHtml(accountingApproval.name || "—")}<small>${escapeHtml(dateTimeHuman(accountingApproval.at || req.updatedAt || ""))}</small></td>
      </tr>
    `;
  }).join("");
  const win = window.open("", "_blank", "width=1200,height=820");
  if (!win) {
    window.alert("Разрешите всплывающие окна для печати отчёта.");
    return;
  }
  win.document.write(`<!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8">
        <title>Список списанных деталей</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 landscape; margin: 12mm; }
          body { margin: 0; font-family: Inter, Arial, sans-serif; color: #172b3a; background: #eef3f6; }
          .sheet { max-width: 1180px; margin: 24px auto; background: #fff; padding: 30px; border-radius: 22px; box-shadow: 0 18px 55px rgba(20,50,74,.16); }
          header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding-bottom: 22px; border-bottom: 3px solid #14324a; }
          .brand { display: flex; gap: 14px; align-items: center; }
          .mark { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 15px; background: linear-gradient(135deg,#14324a,#27769a); color: #fff; font-weight: 900; font-size: 20px; }
          h1 { margin: 0; font-size: 27px; letter-spacing: -.5px; }
          header p, small { display: block; margin: 5px 0 0; color: #637786; font-size: 11px; }
          .meta { text-align: right; font-size: 12px; color: #637786; }
          .summary { display: flex; gap: 12px; margin: 20px 0; }
          .summary div { min-width: 150px; padding: 13px 16px; border-radius: 13px; background: #edf5f8; border: 1px solid #d7e5eb; }
          .summary strong { display: block; font-size: 22px; color: #14324a; }
          .summary span { font-size: 11px; color: #637786; text-transform: uppercase; letter-spacing: .5px; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; border: 1px solid #d7e1e6; border-radius: 14px; }
          th { padding: 11px 9px; background: #14324a; color: #fff; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .45px; }
          td { padding: 11px 9px; border-bottom: 1px solid #e4eaed; vertical-align: top; font-size: 11px; }
          tr:nth-child(even) td { background: #f6f9fa; }
          tr:last-child td { border-bottom: 0; }
          td strong { display: block; font-size: 12px; color: #102b3b; }
          .num { width: 34px; text-align: center; font-weight: 900; color: #27769a; }
          .qty { text-align: center; font-size: 15px; font-weight: 900; color: #14324a; }
          footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 15px; border-top: 1px solid #d7e1e6; color: #637786; font-size: 11px; }
          .actions { position: sticky; bottom: 16px; display: flex; justify-content: center; margin-top: 18px; }
          button { border: 0; border-radius: 12px; background: #14324a; color: #fff; padding: 12px 28px; font-weight: 800; cursor: pointer; box-shadow: 0 8px 20px rgba(20,50,74,.25); }
          @media print { body { background: #fff; } .sheet { margin: 0; padding: 0; box-shadow: none; border-radius: 0; } .actions { display: none; } }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header>
            <div class="brand"><div class="mark">ППР</div><div><h1>Список списанных деталей</h1><p>Отчёт по установленным и списанным запасам</p></div></div>
            <div class="meta"><strong>ППР Контроль</strong><br>${escapeHtml(reportDate)}</div>
          </header>
          <section class="summary">
            <div><strong>${items.length}</strong><span>операций списания</span></div>
            <div><strong>${totalQty}</strong><span>деталей списано</span></div>
          </section>
          <table>
            <thead><tr><th>№</th><th>Деталь / заявка</th><th>Оборудование</th><th>Склад</th><th>Получатель</th><th>Кол-во</th><th>Подтвердил</th><th>Списал</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <footer><span>Сформировано автоматически системой «ППР Контроль»</span><span>Ответственный: ____________________</span></footer>
          <div class="actions"><button onclick="window.print()">Печатать / сохранить PDF</button></div>
        </main>
      </body>
    </html>`);
  win.document.close();
}

function requestItemsHtml(req, mode = "") {
  const items = requestItems(req);
  if (!items.length) return "";
  const financeMode = mode === "finance";
  const supplyMode = mode === "supply";
  const quantityMode = mode === "quantity";
  return `
    <div class="request-items-summary">
      <strong>Позиции заявки</strong>
      <table>
        <thead><tr>${financeMode ? "<th>Оплата</th>" : ""}<th>№</th><th>Наименование</th><th>Артикул</th><th>Остаток</th><th>Ед.</th><th>Заявочное</th><th>Необходимое</th><th>Цена</th><th>Поставщик</th><th>Примечание</th></tr></thead>
        <tbody>
          ${items.map((item, index) => `
            <tr ${supplyMode ? `data-supply-item-row="${index}"` : ""}>
              ${financeMode ? `<td class="request-item-check"><input type="checkbox" data-finance-item-index="${index}" ${items.length === 1 ? "checked" : ""} aria-label="Оплатить позицию ${index + 1}"></td>` : ""}
              <td>${index + 1}</td>
              <td><span class="manual-text">${escapeHtml(item.name || "")}</span></td>
              <td><span class="manual-text">${escapeHtml(item.article || "")}</span></td>
              <td><span class="manual-text">${escapeHtml(item.stockRemainder || "")}</span></td>
              <td><span class="manual-text">${escapeHtml(item.unit || "шт")}</span></td>
              <td>${quantityMode ? `<input class="request-inline-input request-inline-number" data-request-item-requested type="number" min="0" step="1" value="${Number(item.requestedQty || 0)}">` : Number(item.requestedQty || 0)}</td>
              <td>${quantityMode ? `<input class="request-inline-input request-inline-number" data-request-item-required type="number" min="0" step="1" value="${Number(item.requiredQty || item.requestedQty || 0)}">` : Number(item.requiredQty || item.requestedQty || 0)}</td>
              <td>${supplyMode ? `<input class="request-inline-input" data-supply-item-price type="text" inputmode="decimal" value="${escapeHtml(item.price || req.price || "")}" placeholder="Цена">` : `<span class="manual-text">${escapeHtml(item.price || "")}</span>`}</td>
              <td>${supplyMode ? `<input class="request-inline-input" data-supply-item-supplier type="text" value="${escapeHtml(item.supplier || req.supplier || "")}" placeholder="Поставщик">` : `<span class="manual-text">${escapeHtml(item.supplier || "")}</span>`}</td>
              <td>${supplyMode ? `<textarea class="request-inline-note" data-supply-item-note rows="2" placeholder="Примечание">${escapeHtml(item.supplyNote || "")}</textarea>${item.note ? `<small class="request-item-note manual-text">${escapeHtml(item.note)}</small>` : ""}` : `<span class="manual-text">${escapeHtml([item.note, item.supplyNote].filter(Boolean).join(" · "))}</span>`}${item.photo ? `<img class="request-item-photo" src="${item.photo}" alt="Фото позиции ${index + 1}">` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function requestApprovalCell(req, role, fallback = "") {
  const approval = req.approvals?.[role] || {};
  const name = approval.name || fallback || "";
  const status = approval.at ? "Подтверждено" : req.rejectedByRole === role ? "Отказ" : "";
  return `
    <strong>${escapeHtml(name || "________________________")}</strong>
    <span>${escapeHtml(status)}${approval.at ? ` · ${escapeHtml(dateTimeHuman(approval.at))}` : ""}</span>
  `;
}

function requestPrintColumns(items) {
  return [
    { key: "number", label: "№", className: "num", show: true, value: (item, index) => index + 1 },
    { key: "name", label: "Наименование закупаемой ТМЦ и услуг", className: "name", show: true, value: item => item.name || "" },
    { key: "article", label: "Артикул", className: "article", show: true, value: item => item.article || "" },
    { key: "stock", label: "Остаток на складе", className: "stock", show: true, value: item => item.stockRemainder || 0 },
    { key: "unit", label: "Ед. измерения", className: "unit", show: true, value: item => item.unit || "" },
    { key: "requested", label: "Заявочное количество", className: "qty", show: true, value: item => Number(item.requestedQty || 0) || "" },
    { key: "required", label: "Необходимое", className: "qty", show: true, value: item => Number(item.requiredQty || item.requestedQty || 0) || "" },
    { key: "note", label: "Примечание", className: "note", show: true, value: item => [item.note, item.supplyNote].filter(Boolean).join(" · ") }
  ];
}

function requestPrintRows(columns, rows, startIndex = 0, minRows = 0) {
  const visibleRows = Array.from({ length: Math.max(minRows, rows.length || 1) }, (_, index) => rows[index] || {});
  return visibleRows.map((item, index) => `
    <tr>
      ${columns.map(column => `<td class="${column.className || ""}">${escapeHtml(column.value(item, startIndex + index))}</td>`).join("")}
    </tr>
  `).join("");
}

function requestPrintTable(columns, rows, startIndex = 0, minRows = 0) {
  return `
    <table class="items">
      <thead><tr>${columns.map(column => `<th class="${column.className || ""}">${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
      <tbody>${requestPrintRows(columns, rows, startIndex, minRows)}</tbody>
    </table>
  `;
}

function requestPrintSignatures(req, sourceRole) {
  return `
    <section class="excel-signatures">
      <div>Заявитель <strong>${escapeHtml(req.sourceName || "________________________")}</strong></div>
      <div>Начальник цеха РКС <strong>________________________</strong></div>
      <div>Финансист <strong>________________________</strong></div>
      <div>Главный инженер <strong>________________________</strong></div>
      <div>Зам. директора <strong>________________________</strong></div>
      <div class="delivery-line">Срок доставки <strong>${req.dueDate ? escapeHtml(dateHuman(req.dueDate)) : "_____ дней"}</strong> · Снабженец <strong>________________________</strong></div>
    </section>
  `;
}

function printRequestSheet(req, options = {}) {
  normalizeRequest(req);
  const items = requestItems(req);
  const columns = requestPrintColumns(items);
  const printItems = items.length ? items : [{}];
  const firstPageLimit = 24;
  const nextPageLimit = 27;
  const firstPageItems = printItems.slice(0, firstPageLimit);
  const continuationChunks = [];
  for (let index = firstPageLimit; index < printItems.length; index += nextPageLimit) {
    continuationChunks.push(printItems.slice(index, index + nextPageLimit));
  }
  let printableHtml = "";
  const win = options.asFile
    ? { document: { write(value) { printableHtml += String(value || ""); }, close() {} } }
    : window.open("", "_blank", "width=1280,height=820");
  if (!win) {
    window.alert("Разрешите всплывающие окна для печати заявки.");
    return;
  }
  const sourceRole = ROLE_ACCESS[req.sourceRole]?.label || req.sourceRole || "";
  const logoUrl = new URL("hoffmann-logo.png", location.href).href;
  const createdDate = dateTimeHuman(req.createdAt || req.date || new Date().toISOString());
  const totalQty = requestItemsTotal(items) || Number(req.requestedQty || 0);
  const status = statusText(req.status || waitingRole(req));
  const signaturesHtml = requestPrintSignatures(req, sourceRole);
  const continuationHtml = continuationChunks.map((chunk, index) => {
    const pageNo = index + 2;
    const startIndex = firstPageLimit + (index * nextPageLimit);
    const isLastPage = index === continuationChunks.length - 1;
    return `
      <main class="sheet continuation-sheet">
        <div class="page-label">Лист ${pageNo}</div>
        ${requestPrintTable(columns, chunk, startIndex, 0)}
        ${isLastPage ? signaturesHtml : ""}
      </main>
    `;
  }).join("");
  win.document.write(`<!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(req.requestNumber || "Заявка")}</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4 landscape; margin: 10mm; }
          body { margin: 0; background: #edf2f5; color: #102331; font-family: Arial, sans-serif; }
          .sheet { width: 277mm; min-height: 190mm; margin: 14px auto; background: #fff; padding: 9mm; border-radius: 10px; box-shadow: 0 18px 45px rgba(15, 35, 50, .16); }
          .sheet + .sheet { page-break-before: always; }
          .continuation-sheet { padding-top: 9mm; }
          .page-label { margin: 0 0 5mm auto; width: max-content; border: 1px solid #d7e2e8; border-radius: 999px; padding: 1.8mm 4mm; color: #14324a; font-size: 9pt; font-weight: 800; }
          .header { display: grid; grid-template-columns: 1fr 92mm; gap: 8mm; align-items: stretch; padding-bottom: 5mm; border-bottom: 2px solid #14324a; }
          .brand { display: grid; grid-template-columns: 18mm 1fr; gap: 4mm; align-items: center; }
          .logo { width: 18mm; height: 18mm; border-radius: 5mm; object-fit: contain; background: #f4f8fa; border: 1px solid #d7e2e8; padding: 2mm; }
          h1 { margin: 0; color: #14324a; font-size: 20pt; line-height: 1.05; letter-spacing: 0; }
          .subtitle { margin-top: 2mm; color: #5b7180; font-size: 9pt; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #d7e2e8; border-radius: 6px; overflow: hidden; }
          .meta div { padding: 2.4mm 3mm; border-right: 1px solid #d7e2e8; border-bottom: 1px solid #d7e2e8; min-height: 12mm; }
          .meta div:nth-child(2n) { border-right: 0; }
          .meta div:nth-last-child(-n + 2) { border-bottom: 0; }
          .meta span { display: block; color: #6b7d88; font-size: 7.5pt; text-transform: uppercase; font-weight: 700; }
          .meta strong { display: block; margin-top: 1mm; font-size: 10pt; color: #102331; }
          .context { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 3mm; margin: 5mm 0; }
          .context div { border: 1px solid #d7e2e8; border-radius: 6px; padding: 2.4mm 3mm; min-height: 13mm; }
          .context span { display: block; color: #6b7d88; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; }
          .context strong { display: block; margin-top: 1mm; font-size: 10pt; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 1px solid #b9c9d1; border-radius: 7px; overflow: hidden; }
          th, td { border-right: 1px solid #d5e0e5; border-bottom: 1px solid #d5e0e5; padding: 2mm 2.2mm; vertical-align: top; font-size: 8.3pt; line-height: 1.22; word-break: break-word; }
          th:last-child, td:last-child { border-right: 0; }
          tbody tr:last-child td { border-bottom: 0; }
          th { background: #14324a; color: #fff; text-align: left; font-size: 7.4pt; text-transform: uppercase; letter-spacing: .2px; }
          tbody tr:nth-child(even) td { background: #f7fafb; }
          .num { width: 9mm; text-align: center; font-weight: 800; }
          .name { width: 58mm; font-weight: 700; color: #102331; }
          .article { width: 24mm; }
          .stock, .unit, .qty { width: 18mm; text-align: center; }
          .money { width: 23mm; text-align: right; }
          .supplier { width: 34mm; }
          .note { width: 48mm; color: #334955; }
          .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 6mm; }
          .sign { border: 1px solid #d7e2e8; border-radius: 6px; padding: 3mm; min-height: 20mm; }
          .sign b { display: block; color: #14324a; font-size: 8pt; text-transform: uppercase; }
          .sign strong { display: block; margin-top: 3mm; font-size: 9pt; min-height: 5mm; }
          .sign span { display: block; margin-top: 1mm; color: #60737f; font-size: 7.5pt; }
          .footer-note { margin-top: 4mm; display: flex; justify-content: space-between; gap: 5mm; color: #60737f; font-size: 7.5pt; }
          .excel-header { display: grid; grid-template-columns: 1fr 62mm; align-items: start; gap: 8mm; margin-bottom: 3mm; }
          .excel-title-block { text-align: center; padding-top: 4mm; }
          .excel-title-block h1 { text-align: center; font-size: 16pt; color: #111; }
          .excel-title-block p { margin: 3mm 0 0; font-size: 9pt; }
          .excel-logo-block { display: grid; justify-items: end; gap: 2mm; }
          .excel-logo { width: 57mm; max-height: 20mm; object-fit: contain; object-position: right center; }
          .excel-approval { width: 57mm; text-align: center; font-size: 8.5pt; line-height: 1.5; }
          .excel-request-line { margin: 4mm 0 2mm; font-size: 11pt; font-weight: 700; }
          .excel-date-line { margin-bottom: 4mm; font-size: 10pt; }
          .excel-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm 8mm; width: 100%; margin: 4mm 0 0; font-size: 7.5pt; }
          .excel-signatures div { min-height: 4mm; border: 0; white-space: nowrap; }
          .excel-signatures strong { margin-left: 1.5mm; }
          .excel-signatures .delivery-line { grid-column: 1 / -1; border-top: 1px solid #777; padding-top: 2mm; }
          .actions { display: flex; justify-content: center; margin: 16px auto; }
          button { border: 0; border-radius: 8px; background: #14324a; color: #fff; padding: 11px 24px; font-weight: 800; cursor: pointer; }
          @media print {
            body { background: #fff; }
            .sheet { margin: 0; width: auto; min-height: 190mm; padding: 0; border-radius: 0; box-shadow: none; page-break-after: always; }
            .sheet:last-of-type { page-break-after: auto; }
            .continuation-sheet { padding-top: 0; }
            .actions { display: none; }
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header class="excel-header">
            <div class="excel-title-block"><h1>Заявка на приобретение ТМЦ и услуг</h1><p>«___» __________ 20___ года</p></div>
            <div class="excel-logo-block"><img class="excel-logo" src="${escapeHtml(logoUrl)}" alt="Hoffmann Aluminium"><div class="excel-approval">Зам. директора __________________</div></div>
          </header>
          <div class="excel-request-line">Заявка № ${escapeHtml(req.requestNumber || "_______")} · Цех: ${escapeHtml(req.area || "________________")}</div>
          <div class="excel-date-line">Дата формирования: ${escapeHtml(createdDate)}</div>
          ${requestPrintTable(columns, firstPageItems, 0, 0)}
          ${continuationChunks.length ? "" : signaturesHtml}
        </main>
        ${continuationHtml}
        <div class="actions"><button onclick="window.print()">Печатать / сохранить PDF</button></div>
      </body>
    </html>`);
  win.document.close();
  if (options.asFile) {
    const safeNumber = String(req.requestNumber || "zayavka").replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, "-");
    return new File([printableHtml], `${safeNumber}-print.html`, { type: "text/html" });
  }
}

function renderAccountingWrittenOffList() {
  const items = accountingWrittenOffItems();
  return `
    <div class="warehouse-pending accounting-written-off">
      <div class="warehouse-stock-head">
        <div><strong>Списанные запасы</strong><span>${items.length ? `${items.length} записей` : "Списаний нет"}</span></div>
        ${items.length ? `<button type="button" class="accounting-print-button" data-print-accounting>Печать</button>` : ""}
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
            <div class="request-status">Списано</div>
          </div>
        </div>
      `).join("") : `<div class="empty-state">Списанных запасов пока нет</div>`}
    </div>
  `;
}

function requestCard(req) {
  normalizeRequest(req);
  const card = document.createElement("div");
  card.className = "request-card";
  const currentWaitingRole = waitingRole(req);
  const actionRole = profile?.role === "editor" && current.requestRole === "all"
    ? (currentWaitingRole === "confirmInstall" ? "engineer" : currentWaitingRole === "financePre" ? "finance" : currentWaitingRole)
    : current.requestRole;
  if (requestIsOverdue(req)) card.classList.add("overdue");
  if (current.requestRole === "warehouse" && current.warehouseSearch.trim() && requestMatchesWarehouseSearch(req, current.warehouseSearch)) {
    card.classList.add("search-hit");
  }
  card.innerHTML = `
    <div class="request-main">
      <div class="request-card-head">
        <div>
          <strong class="request-number">${escapeHtml(req.requestNumber)}</strong>
          <b class="manual-text">${escapeHtml(req.equipment || "Без оборудования")}</b>
          <span><span class="manual-text">${escapeHtml(req.area || "")}${req.node ? ` · ${escapeHtml(req.node)}` : ""}</span> · ${dateHuman(req.date)}</span>
          ${req.kind === "journal-batch" ? `<span>Сборная заявка из журнала</span>` : ""}
        </div>
        <div class="request-badges">
          <span class="request-route">${requestRouteLabel(req.route)}</span>
          <span class="request-priority ${req.priority}">${requestPriorityLabel(req.priority)}</span>
          ${req.dueDate ? `<span class="${requestIsOverdue(req) ? "request-overdue" : "request-due"}">${requestIsOverdue(req) ? "Просрочено: " : "Срок: "}${dateHuman(req.dueDate)}</span>` : ""}
        </div>
      </div>
      ${requestAuthorHtml(req)}
      ${requestStageHtml(req)}
      ${req.stockOut && !req.stockOutAcknowledged ? `<div class="request-returned request-rejected-source"><strong>Запас закончился</strong><span class="manual-text">${escapeHtml(req.stockOutReason || "Склад не может выдать запрошенную позицию.")}</span><small>Запрошено: ${Number(req.stockOutRequestedQty || req.qtyIssued || req.qtyReceived || 0)} шт. · Доступно: ${Number(req.stockOutAvailableQty || 0)} шт.${req.stockOutRecipientMissing ? " · Автор не найден, уведомление показано замещающему по роли." : ""}</small></div>` : ""}
      ${req.returnedTo ? `<div class="request-returned"><strong>Возвращено: ${requestRoleLabel(req.returnedTo)}</strong><span class="manual-text">${escapeHtml(req.returnReason || "")}</span></div>` : ""}
      ${req.rejected ? `<div class="request-returned request-rejected-source"><strong>Заявка возвращена автору на исправление</strong><span class="manual-text">${escapeHtml(req.rejectionReason || "")}</span>${req.rejectedByName ? `<small>Отклонил: <span class="manual-text">${escapeHtml(req.rejectedByName)}</span> (${escapeHtml(requestRoleLabel(req.rejectedByRole))})</small>` : ""}</div>` : ""}
      ${req.comment ? `<p class="manual-text">${escapeHtml(req.comment)}</p>` : ""}
      ${req.commentPhoto ? `<img class="request-photo" src="${req.commentPhoto}" alt="Фото замечания">` : ""}
      <p class="request-text manual-text">${escapeHtml(req.text)}</p>
      ${requestItemsHtml(req, actionRole === "supply" && canActAsRole(actionRole) && requestWaitingForSupplyPrepare(req) && !requestFinanciallyLocked(req) ? "supply" : actionRole === "finance" && canActAsRole(actionRole) && req.supplyPrepared && !req.financeApproved && !req.done && !req.stock ? "finance" : ["shop", "engineer"].includes(actionRole) && canActAsRole(actionRole) && !requestFinanciallyLocked(req) && (requestWaitingForShopInitial(req) || requestWaitingForEngineerInitial(req)) ? "quantity" : "")}
      ${req.requestPhoto ? `<img class="request-photo" src="${req.requestPhoto}" alt="Фото заявки">` : ""}
      ${(Array.isArray(req.additionalPhotos) ? req.additionalPhotos : []).map((photo, index) => `<img class="request-photo" src="${photo}" alt="Дополнительное фото заявки ${index + 1}">`).join("")}
      <div class="request-current-stage">Текущий этап: ${requestRoleLabel(waitingRole(req))}</div>
      ${req.requestedTargetRole && !req.issueTargetRole ? `<div class="request-recipient">Рекомендованная роль: ${escapeHtml(requestRoleLabel(req.requestedTargetRole))}</div>` : ""}
      ${req.issueTargetRole && req.issued && !req.mechanicInstalled ? `<div class="request-recipient">Получатель: ${requestRoleLabel(req.issueTargetRole)}${req.issueTargetName ? ` · <span class="manual-text">${escapeHtml(req.issueTargetName)}</span>` : ""}</div>` : ""}
      ${requestHistoryHtml(req)}
      ${MANUAL_REQUEST_WORKFLOW ? "" : `<div class="request-finance">${financeInfoText(req)}</div>`}
      ${req.approvalResponsibilityDeclines?.engineer && !req.approvalResponsibilityDeclines?.productionDirector ? `<div class="request-no-invoice">Инженер отметил по заявке: не моя зона ответственности. Ждёт директора производства.</div>` : ""}
      ${req.approvalResponsibilityDeclines?.productionDirector && !req.approvalResponsibilityDeclines?.engineer ? `<div class="request-no-invoice">Директор производства отметил по заявке: не моя зона ответственности. Ждёт инженера.</div>` : ""}
      ${req.installComment ? `<div class="request-no-invoice">Комментарий установки: <span class="manual-text">${escapeHtml(req.installComment)}</span></div>` : ""}
      ${req.installResponsibilityDeclines?.engineer && !req.installResponsibilityDeclines?.productionDirector ? `<div class="request-no-invoice">Инженер отметил: не моя зона ответственности. Ждёт директора производства.</div>` : ""}
      ${req.installResponsibilityDeclines?.productionDirector && !req.installResponsibilityDeclines?.engineer ? `<div class="request-no-invoice">Директор производства отметил: не моя зона ответственности. Ждёт инженера.</div>` : ""}
      ${MANUAL_REQUEST_WORKFLOW ? "" : requestApprovalsHtml(req)}
    </div>
    <div class="request-actions"></div>
  `;
  const actions = card.querySelector(".request-actions");
  const canAct = canActAsRole(actionRole);
  actions.append(actionButton("Печатать заявку", () => printRequestSheet(req)));

  if (stockOutVisibleToProfile(req, actionRole)) {
    actions.append(actionButton("Понятно", () => {
      req.stockOutAcknowledged = true;
      req.done = true;
      req.status = "done";
      req.updatedAt = new Date().toISOString();
      requestAddHistory(req, "Уведомление о закончившемся запасе прочитано", profile?.name || "");
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
    return card;
  }

  if (MANUAL_REQUEST_WORKFLOW && actionRole !== "warehouse" && !issuedWarehouseItemVisibleToProfile(req, actionRole)) {
    actions.insertAdjacentHTML("beforeend", `<div class="readonly-note">Электронный маршрут отключён. Распечатайте заявку и обходите вручную.</div>`);
    return card;
  }

  if (canAct && actionRole === "shop" && requestWaitingForShopInitial(req)) {
    const setup = document.createElement("div");
    setup.className = "request-setup";
    setup.innerHTML = `
      <label><span>Маршрут</span><select data-request-route>
        <option value="purchase" ${req.route === "purchase" ? "selected" : ""}>Закупка</option>
        <option value="stock" ${req.route === "stock" ? "selected" : ""}>Со склада</option>
      </select></label>
      <label><span>Срочность</span><select data-request-priority>
        <option value="normal" ${req.priority === "normal" ? "selected" : ""}>Обычная</option>
        <option value="urgent" ${req.priority === "urgent" ? "selected" : ""}>Срочная</option>
        <option value="emergency" ${req.priority === "emergency" ? "selected" : ""}>Аварийная</option>
      </select></label>
      <label><span>Срок исполнения</span><input data-request-due type="date" value="${escapeHtml(req.dueDate || "")}"></label>
    `;
    actions.append(setup);
  }

  if (!canAct) {
    actions.insertAdjacentHTML("beforeend", `<div class="readonly-note">Только просмотр. Выдачу подтверждает складовщик.</div>`);
  }

  if (canAct && canConfirmIssuedInstall(req, actionRole)) {
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
      req.shopInstallApproved = false;
      req.productionDirectorApproved = false;
      req.done = false;
      req.stock = false;
      req.accountingWrittenOff = false;
      clearInstallResponsibilityDeclines(req);
      req.status = "waitingShopDone";
      requestRecordApproval(req, "install", "Установка выполнена");
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }

  if (actionRole === "shop" && canAct && requestWaitingForShopInitial(req)) {
    actions.append(actionButton("Подтвердить начальником", () => {
      readInlineQuantityItems(actions, req);
      const route = actions.querySelector("[data-request-route]");
      const priority = actions.querySelector("[data-request-priority]");
      const dueDate = actions.querySelector("[data-request-due]");
      req.route = route?.value || req.route || "purchase";
      req.priority = priority?.value || req.priority || "normal";
      req.dueDate = dueDate?.value || "";
      req.requestedQty = requestItemsTotal(req.items);
      if (!req.dueDate || req.requestedQty <= 0) {
        window.alert("Заполните срок исполнения и количество.");
        return;
      }
      req.shopApproved = true;
      req.status = req.route === "stock" ? "warehouse" : "engineer";
      requestRecordApproval(req, "shop", "Подтверждено начальником цеха");
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (actionRole === "engineer" && canAct && (requestWaitingForEngineerInitial(req) || requestWaitingForInstallApproval(req))) {
    const isInstallApproval = requestWaitingForInstallApproval(req);
    actions.append(actionButton(isInstallApproval ? "Подтвердить установку" : "Подтвердить инженером", () => {
      if (isInstallApproval) {
        req.shopInstallApproved = true;
        req.productionDirectorApproved = false;
        req.done = false;
        req.status = "accounting";
        clearInstallResponsibilityDeclines(req);
        requestRecordApproval(req, "installApproval", "Установка подтверждена");
      } else {
        readInlineQuantityItems(actions, req);
        req.engineerApproved = true;
        req.productionDirectorRequestApproved = false;
        req.financePreApproved = false;
        req.status = "productionDirector";
        requestRecordApproval(req, "engineer", "Подтверждено инженером");
      }
      clearApprovalResponsibilityDeclines(req);
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
    if (isInstallApproval) appendInstallResponsibilityAction(actions, req, "engineer");
    else appendApprovalResponsibilityAction(actions, req, "engineer");
  }
  if (actionRole === "productionDirector" && canAct && requestWaitingForProductionDirectorInitial(req)) {
    actions.append(actionButton("Подтвердить директором производства", () => {
      req.productionDirectorRequestApproved = true;
      req.financePreApproved = false;
      req.status = "financePre";
      requestRecordApproval(req, "productionDirectorRequest", "Заявка подтверждена директором производства");
      clearApprovalResponsibilityDeclines(req);
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
    appendApprovalResponsibilityAction(actions, req, "productionDirector");
  }
  if (actionRole === "supply" && canAct && (requestWaitingForSupplyPrepare(req) || requestWaitingForSupplyWarehouse(req))) {
    const readSupplyItems = () => readInlineSupplyItems(actions, req);
    if (requestWaitingForSupplyPrepare(req)) {
      const statusNote = document.createElement("div");
      statusNote.className = "readonly-note";
      statusNote.textContent = "Заполните цену, поставщика/примечание и количество для ручного обхода.";
      actions.append(statusNote);
      actions.append(actionButton("Подтвердить вручную", () => {
        const items = readSupplyItems();
        if (!supplyItemsPrepared(items)) {
          statusNote.textContent = "Нужно заполнить цену и поставщика по каждой позиции.";
          return;
        }
        req.supplyPrepared = true;
        req.status = "finance";
        req.qtyReceived = supplyItemsTotal(items);
        req.qtyPurchased = req.qtyReceived;
        requestRecordApproval(req, "supply", "Подготовлено вручную");
        clearRequestReturn(req);
        syncRequestToRecord(req);
        saveState();
        renderRequests();
      }));
    }
    if (requestWaitingForSupplyWarehouse(req)) {
      actions.append(actionButton("Передать на склад", () => {
        req.transferredToWarehouse = true;
        req.stockArea = req.area || req.stockArea || COMMON_WAREHOUSE;
        req.qtyReceived = supplyItemsTotal(requestItems(req)) || Number(req.qtyReceived || 0);
        req.warehouseReceived = false;
        req.status = "waitingWarehouse";
        clearRequestReturn(req);
        syncRequestToRecord(req);
        saveState();
        renderRequests();
      }));
    }
  }
  if (actionRole === "finance" && canAct && requestWaitingForFinancePreApproval(req)) {
    actions.append(actionButton("Предварительно подтвердить", () => {
      req.financePreApproved = true;
      req.status = "supply";
      requestRecordApproval(req, "financePre", "Подтверждено вручную");
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (actionRole === "finance" && canAct && req.supplyPrepared && !req.financeApproved && !req.done && !req.stock) {
    appendInlineFinanceSelectionAction(actions, req);
  }
  if (actionRole === "cash" && canAct && req.financeApproved && !req.cashApproved && !req.done && !req.stock) {
    actions.append(actionButton("Оплатить", () => {
      if (!window.confirm("Точно подтвердить оплату?")) return;
      req.cashApproved = true;
      req.status = "cashApproved";
      requestRecordApproval(req, "cash", "Оплачено");
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (actionRole === "warehouse" && canAct && req.warehouseAsk && !req.issued && !req.stock && !req.done) {
    const requestedQty = Number(req.qtyIssued || req.qtyReceived || 1);
    const availableQty = inventoryRemainderForRequest(req);
    const issueNote = document.createElement("div");
    issueNote.className = "readonly-note";
    issueNote.textContent = `Запросил: ${requestRoleLabel(warehouseIssueTargetRole(req))}${req.issueTargetName ? ` · ${req.issueTargetName}` : ""}. Запрошено: ${requestedQty} шт. Доступно: ${availableQty} шт.`;
    actions.append(issueNote);
    const requestStockItem = state.inventory?.[inventoryKey(req.stockArea || req.area || COMMON_WAREHOUSE, partNameFromRequest(req), partArticleFromRequest(req))];
    const issuePrice = document.createElement("input");
    issuePrice.type = "text";
    issuePrice.inputMode = "decimal";
    issuePrice.placeholder = "Цена за 1 ед. изм. перед выдачей";
    issuePrice.value = priceTextFromAmount(parseMoneyAmount(requestStockItem?.unitPrice || requestStockItem?.price || requestStockItem?.lastPrice || ""));
    actions.append(issuePrice);
    if (parseMoneyAmount(issuePrice.value) <= 0) {
      autoFillInternetPriceInput(issuePrice, partNameFromRequest(req), partArticleFromRequest(req), price => {
        const stockItem = state.inventory?.[inventoryKey(req.stockArea || req.area || COMMON_WAREHOUSE, partNameFromRequest(req), partArticleFromRequest(req))];
        if (stockItem) updateInventoryUnitPrice(stockItem, price);
        saveState();
      });
    }
    actions.append(actionButton("Выдать", async () => {
      const targetArea = req.stockArea || req.area || COMMON_WAREHOUSE;
      const stockItem = state.inventory?.[inventoryKey(targetArea, partNameFromRequest(req), partArticleFromRequest(req))];
      const unitPrice = ensureInventoryPriceForOperation(stockItem, issuePrice, "Перед выдачей укажите цену за 1 единицу измерения.");
      if (!unitPrice || !stockItem) return;
      try {
        const result = await apiJson("/api/warehouse/issue", {
          method: "POST",
          timeout: 30000,
          body: JSON.stringify({
            actionId: nextActionId(), clientId: CLIENT_ID,
            user: profile ? { name: profile.name || "", role: profile.role || "", phone: profile.phone || "" } : null,
            inventoryId: stockItem.id, requestId: req.id, quantity: requestedQty,
            unitPrice, priceText: priceTextFromAmount(unitPrice)
          })
        });
        if (result?.state) mergeRealtimePatch(result.state);
        if (result?.stateVersion) setRealtimeStateVersion(result.stateVersion);
        persistStateLocally(state);
        showAppToast(`Выдано: ${req.issueTargetName}. Остаток: ${Number(result.available || 0)} ${stockItem.unit || "шт"}`);
      } catch (error) {
        if (error?.message === "warehouse_insufficient_stock") {
          await syncRemoteChanges();
          window.alert(`Выдача отменена: на складе осталось только ${Number(error.data?.available || 0)} ${stockItem.unit || "шт"}.`);
        } else if (error?.message === "warehouse_request_already_processed") {
          await syncRemoteChanges();
          showAppToast("Эта заявка уже обработана другим складовщиком.", "error");
        } else {
          throw error;
        }
      }
      renderRequests();
    }));
  }
  if (actionRole === "warehouse" && canAct && !req.warehouseAsk && requestWaitingForWarehouse(req)) {
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

    const warehousePrice = document.createElement("input");
    warehousePrice.type = "text";
    warehousePrice.inputMode = "decimal";
    warehousePrice.placeholder = "Цена за 1 ед. изм. на склад";
    warehousePrice.value = req.warehouseUnitPrice || "";
    warehousePrice.addEventListener("change", () => {
      req.warehouseUnitPrice = priceTextFromAmount(parseMoneyAmount(warehousePrice.value));
      syncRequestToRecord(req);
      saveState();
    });
    actions.append(warehousePrice);
    if (parseMoneyAmount(warehousePrice.value) <= 0) {
      autoFillInternetPriceInput(warehousePrice, partNameFromRequest(req), partArticleFromRequest(req), price => {
        req.warehouseUnitPrice = priceTextFromAmount(price);
        syncRequestToRecord(req);
        saveState();
      });
    }

    actions.append(actionButton("В запас", () => {
      const targetArea = stockArea.value || req.area || COMMON_WAREHOUSE;
      const received = Number(req.qtyReceived || qtyReceived.value || 1);
      req.warehouseUnitPrice = priceTextFromAmount(parseMoneyAmount(warehousePrice.value || req.warehouseUnitPrice || ""));
      if (parseMoneyAmount(req.warehouseUnitPrice) <= 0) {
        window.alert("Укажите цену за 1 единицу измерения. Без цены приход нельзя поставить в запас.");
        warehousePrice.focus();
        return;
      }
      const alreadyAdded = Number(req.inventoryAddedQty || 0);
      const delta = Math.max(received - alreadyAdded, 0);
      req.warehouseReceived = true;
      req.stock = true;
      req.done = true;
      req.warehouseReceivedAt = req.warehouseReceivedAt || new Date().toISOString();
      req.stockAt = new Date().toISOString();
      req.stockArea = targetArea;
      req.qtyReceived = received;
      if (delta > 0) addRequestItemsToInventory(req, targetArea, received);
      req.status = "stock";
      req.qtyAccepted = received;
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (actionRole === "productionDirector" && canAct && requestWaitingForInstallApproval(req)) {
    actions.append(actionButton("Подтвердить установку", () => {
      req.productionDirectorApproved = true;
      req.done = false;
      req.status = "accounting";
      clearInstallResponsibilityDeclines(req);
      requestRecordApproval(req, "productionDirector", "Установка подтверждена директором производства");
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
    appendInstallResponsibilityAction(actions, req, "productionDirector");
  }
  if (actionRole === "accounting" && canAct && requestReadyForAccounting(req) && !req.accountingWrittenOff) {
    actions.append(actionButton("Списать деталь", () => {
      req.accountingWrittenOff = true;
      req.done = true;
      req.status = "done";
      requestRecordApproval(req, "accounting", "Списано");
      clearRequestReturn(req);
      syncRequestToRecord(req);
      saveState();
      renderRequests();
    }));
  }
  if (canAct) {
    const installApproverRole = req.approvals?.installApproval?.role;
    const finalInstallApproverRole = req.approvals?.productionDirector?.role || installApproverRole;
    const returnTargets = {
      engineer: "shop",
      supply: requestWaitingForSupplyWarehouse(req) ? "cash" : "financePre",
      finance: requestWaitingForFinancePreApproval(req) ? "productionDirector" : "supply",
      cash: "finance",
      warehouse: req.route === "stock" ? "shop" : "supply",
      mechanic: "warehouse",
      electrician: "warehouse",
      operator: "warehouse",
      productionDirector: requestWaitingForProductionDirectorInitial(req) ? "engineer" : warehouseIssueTargetRole(req),
      accounting: ["engineer", "productionDirector"].includes(finalInstallApproverRole)
        ? finalInstallApproverRole
        : "engineer"
    };
    appendReturnAction(actions, req, returnTargets[actionRole]);
    appendRejectAction(actions, req);
  }
  if (req.rejected && isRequestSource(req)) {
    actions.innerHTML = "";
    const correctionNote = document.createElement("div");
    correctionNote.className = "readonly-note request-alert";
    correctionNote.textContent = "Заявка возвращена вам. Добавьте пояснение или новое фото и отправьте повторно.";
    actions.append(correctionNote);
    const correctionText = document.createElement("textarea");
    correctionText.rows = 3;
    correctionText.placeholder = "Что исправлено или уточнено";
    actions.append(correctionText);
    let correctionPhoto = "";
    const correctionFile = document.createElement("label");
    correctionFile.className = "request-file-row";
    correctionFile.innerHTML = `<span>Новое фото к заявке</span><input type="file" accept="image/*" capture="environment">`;
    correctionFile.querySelector("input").addEventListener("change", async event => {
      correctionPhoto = await readPhotoFile(event.target.files?.[0]);
      correctionFile.querySelector("span").textContent = correctionPhoto ? "Новое фото прикреплено" : "Новое фото к заявке";
    });
    actions.append(correctionFile);
    actions.append(actionButton("Отправить повторно", () => {
      if (!correctionText.value.trim() && !correctionPhoto) {
        window.alert("Добавьте комментарий или новое фото.");
        return;
      }
      if (resubmitRejectedRequest(req, correctionText.value, correctionPhoto)) renderRequests();
    }));
    const deleteButton = actionButton("Удалить заявку", () => {
      if (!window.confirm("Точно удалить отклонённую заявку? Восстановить её будет нельзя.")) return;
      const reason = window.prompt("Укажите причину удаления заявки:")?.trim();
      if (!reason) return;
      deleteRejectedRequest(req, reason);
      renderRequests();
    });
    deleteButton.classList.add("secondary-action", "danger-action", "delete-request-action");
    actions.append(deleteButton);
  }
  actions.querySelectorAll(".action-button").forEach(button => {
    button.dataset.requestId = req.id;
  });
  if (pendingRequestIds.has(req.id)) {
    card.classList.add("request-pending");
    actions.querySelectorAll("button, input, select, textarea").forEach(control => {
      control.disabled = true;
    });
    const note = document.createElement("div");
    note.className = "request-sync-pending";
    note.textContent = "В ожидании синхронизации у всех пользователей...";
    actions.prepend(note);
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

function goBack() {
  if (current.view === "checklist" && current.returnToRemarkListAfterResolve) {
    returnToOpenRemarkCards();
    return;
  }
  const previous = nav.pop() || homeViewForProfile(profile?.role);
  show(previous, false);
}

ui.back?.addEventListener("click", goBack);

ui.factoryStatusButton?.addEventListener("click", () => show("engineerReport"));

ui.qrWalkButton?.addEventListener("click", async () => {
  if (!isProfileReady()) {
    window.alert("Сначала войдите в ППР.");
    return;
  }
  if (!canEditChecklist()) {
    window.alert("Для обхода нужна роль, которой разрешено отмечать узлы.");
    return;
  }
  setButtonBusy(ui.qrWalkButton, true, "Открываем камеру...");
  try {
    while (true) {
      const parsed = await scanNodeQrCode(null, null, null);
      if (!parsed) break;
      const shift = currentWalkShift();
      if (isNodeShiftChecked(getRecord(parsed.equipmentId, parsed.nodeIndex, shift.date), shift.key)) {
        current.equipmentId = parsed.equipmentId;
        current.nodeIndex = parsed.nodeIndex;
        current.date = shift.date;
        current.kind = "to";
        current.scrollToQrNode = parsed.nodeIndex;
        show("checklist");
        window.setTimeout(() => {
          ui.commentInput?.scrollIntoView({ behavior: "smooth", block: "center" });
          if (canEditChecklist()) ui.commentInput?.focus();
        }, 180);
        showAppToast("Узел уже обойден — открыт комментарий узла.");
        break;
      }
      const action = await promptQrWalkDecision(parsed);
      if (action === "finish") break;
    }
  } finally {
    if (ui.qrWalkButton?.isConnected) setButtonBusy(ui.qrWalkButton, false);
  }
});

ui.globalReminderButton?.addEventListener("click", () => {
  renderGlobalReminderPanel();
  ui.globalReminderOverlay.hidden = false;
  document.body.classList.add("global-reminder-open");
});

function closeGlobalReminderPanel() {
  if (!ui.globalReminderOverlay) return;
  ui.globalReminderOverlay.hidden = true;
  document.body.classList.remove("global-reminder-open");
}

ui.globalReminderClose?.addEventListener("click", closeGlobalReminderPanel);
ui.globalReminderOverlay?.addEventListener("click", event => {
  if (event.target === ui.globalReminderOverlay) closeGlobalReminderPanel();
});

document.querySelectorAll("[data-mobile-view]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.mobileView;
    if (!canShowMobileView(target)) return;
    if (target === "home") {
      document.body.classList.remove("mobile-profile-focus");
      if (current.view !== homeViewForProfile(profile?.role)) goBack();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (target === "profile") {
      document.body.classList.add("mobile-profile-focus");
      show(homeViewForProfile(profile?.role));
      requestAnimationFrame(() => ui.profileBar?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    document.body.classList.remove("mobile-profile-focus");
    if (target === "requestCreate") {
      show("requestCreate");
      if (profile?.role === "engineer" && engineerIncomingTmcItemCount() > 0) {
        window.setTimeout(() => ui.engineerIncomingTmcPanel?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
      return;
    }
    show(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

ui.directorOpenButton?.addEventListener("click", () => {
  show("director");
});

ui.downtimeOpenButton?.addEventListener("click", () => {
  show("downtime");
});

ui.engineerReportButton?.addEventListener("click", () => {
  show("engineerReport");
});

ui.workerRatingButton?.addEventListener("click", () => {
  show("workerRating");
});

ui.prevRatingYear?.addEventListener("click", () => {
  current.ratingYear -= 1;
  renderWorkerRating();
});

ui.nextRatingYear?.addEventListener("click", () => {
  current.ratingYear += 1;
  renderWorkerRating();
});

ui.engineerReportMonth?.addEventListener("change", () => {
  current.engineerReportMonth = ui.engineerReportMonth.value || todayISO().slice(0, 7);
  renderEngineerReport();
});

ui.engineerReportPrint?.addEventListener("click", () => {
  printEngineerMonthlyReport(current.engineerReportMonth);
});

ui.alertCounter?.addEventListener("click", openAllRemarkCards);

ui.createTmcRequestButton?.addEventListener("click", () => {
  show("requestCreate");
  if (profile?.role === "engineer" && engineerIncomingTmcItemCount() > 0) {
    window.setTimeout(() => ui.engineerIncomingTmcPanel?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
});

ui.engineerIncomingBanner?.addEventListener("click", event => {
  if (!event.target.closest("[data-open-engineer-incoming]")) return;
  show("requestCreate");
  window.setTimeout(() => ui.engineerIncomingTmcPanel?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
});

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
  saveCommentDraft(item, ui.commentInput.value || item.comment || "");
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

ui.commentPhotoPreview.addEventListener("click", event => {
  if (!canEditChecklist() || !event.target.matches("[data-clear-photo]")) return;
  const rec = record();
  if (!canEditComment(rec[current.kind])) return;
  rec[current.kind].commentPhoto = "";
  saveState();
  renderChecklist();
});

ui.openRequestsButton?.addEventListener("click", () => {
  current.requestRole = defaultRequestRole();
  show("requests");
});

ui.tmcRequestArea?.addEventListener("change", () => {
  restoreTranslatedPage(ui.requestCreateScreen || document.body);
  ui.tmcRequestEquipment.value = "";
  ui.tmcRequestNode.value = "";
  refreshTmcEquipmentSelectors();
  applyLanguage();
  queueTranslateVisiblePage(true);
});

ui.tmcRequestEquipment?.addEventListener("change", () => {
  restoreTranslatedPage(ui.requestCreateScreen || document.body);
  ui.tmcRequestNode.value = "";
  refreshTmcEquipmentSelectors();
  applyLanguage();
  queueTranslateVisiblePage(true);
});

ui.addTmcRequestRow?.addEventListener("click", () => {
  const index = ui.tmcRequestRows.querySelectorAll("[data-tmc-row]").length;
  ui.tmcRequestRows.insertAdjacentHTML("beforeend", tmcRequestRowHtml(blankTmcRequestRow(), index));
  applyLanguage();
  queueTranslateVisiblePage(true);
});

ui.tmcRequestRows?.addEventListener("click", event => {
  if (event.target.matches("[data-clear-tmc-row-photo]")) {
    const row = event.target.closest("[data-tmc-row]");
    if (!row) return;
    row.dataset.tmcRowPhoto = "";
    const input = row.querySelector("[data-tmc-row-photo-input]");
    if (input) input.value = "";
    const preview = row.querySelector(".tmc-row-photo-preview");
    if (preview) preview.innerHTML = "";
    return;
  }
  if (event.target.matches("[data-remove-tmc-row]")) {
    event.target.closest("[data-tmc-row]")?.remove();
    [...ui.tmcRequestRows.querySelectorAll("[data-tmc-row]")].forEach((row, index) => {
      row.querySelector("td").textContent = index + 1;
    });
    ensureTmcRequestRows();
    applyLanguage();
    queueTranslateVisiblePage(true);
  }
});

ui.tmcRequestRows?.addEventListener("change", async event => {
  if (!event.target.matches("[data-tmc-row-photo-input]")) return;
  const row = event.target.closest("[data-tmc-row]");
  if (!row) return;
  const photo = await readPhotoFile(event.target.files?.[0]);
  row.dataset.tmcRowPhoto = photo || "";
  event.target.value = "";
  const preview = row.querySelector(".tmc-row-photo-preview");
  if (preview) preview.innerHTML = photo ? `
    <img src="${photo}" alt="Фото позиции">
    <button type="button" data-clear-tmc-row-photo>Удалить</button>
  ` : "";
});

ui.engineerIncomingTmcPanel?.addEventListener("input", event => {
  const row = event.target.closest("[data-engineer-req-row]");
  if (!row) return;
  const req = state.requests?.[row.dataset.engineerReqRow];
  const index = Number(row.dataset.engineerItemIndex);
  if (!req || !Number.isFinite(index)) return;
  if (saveEngineerIncomingTmcRow(req, index, row)) {
    saveState();
    updateRoleBadges();
  }
});

ui.engineerIncomingTmcPanel?.addEventListener("click", event => {
  const openButton = event.target.closest("[data-open-engineer-requests]");
  if (openButton) {
    current.requestRole = "engineer";
    show("requests");
    return;
  }
  const printButton = event.target.closest("[data-print-engineer-req]");
  if (printButton) {
    const req = state.requests?.[printButton.dataset.printEngineerReq];
    if (req) sendRequestByDevice(req);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-engineer-item]");
  if (!deleteButton) return;
  const row = deleteButton.closest("[data-engineer-req-row]");
  const req = state.requests?.[row?.dataset.engineerReqRow || ""];
  const index = Number(row?.dataset.engineerItemIndex);
  if (!req || !Number.isFinite(index)) return;
  if (!window.confirm("Удалить эту строку из накопленной заявки?")) return;
  if (deleteEngineerIncomingTmcRow(req, index)) {
    saveState();
    renderRequestCreate();
    updateRoleBadges();
  }
});

ui.tmcRequestForm?.addEventListener("submit", async event => {
  event.preventDefault();
  if (tmcRequestSubmitting) return;
  tmcRequestSubmitting = true;
  setButtonBusy(ui.submitTmcRequest, true, "Отправляем...");
  try {
    restoreTranslatedPage(ui.requestCreateScreen || document.body);
    if (mobileShareMode()) {
      const draft = buildMobileTmcRequestDraft();
      if (!draft) {
        ui.tmcRequestStatus.textContent = "Заполните хотя бы одну строку с наименованием";
        ui.tmcRequestStatus.classList.add("error");
        return;
      }
      ui.tmcRequestStatus.classList.remove("error");
      state.requests ||= {};
      state.requests[draft.id] = draft;
      saveState();
      await publishStateNow();
      await shareRequestPrintFile(draft);
      resetTmcRequestForm();
      ui.tmcRequestStatus.textContent = "Заявка сохранена в отчётах ППР и передана для отправки в WhatsApp";
      return;
    }
    const req = createStandaloneTmcRequest();
    if (!req) {
      ui.tmcRequestStatus.textContent = "Заполните хотя бы одну строку с наименованием";
      ui.tmcRequestStatus.classList.add("error");
      applyLanguage();
      queueTranslateVisiblePage(true);
      return;
    }
    ui.tmcRequestStatus.classList.remove("error");
    ui.tmcRequestStatus.textContent = workerSendsTmcRequestToEngineer()
      ? "Отправлено инженеру"
      : current.tmcRequestMerged
        ? `Добавлено в дневную заявку: ${req.requestNumber}`
        : `Заявка создана: ${req.requestNumber}`;
    resetTmcRequestForm();
    publishStateNow().catch(scheduleRemoteRetry);
    if (canOpenRequestRole("shop")) {
      current.requestRole = "shop";
      show("requests");
    }
    applyLanguage();
    queueTranslateVisiblePage(true);
  } catch (error) {
    console.error("TMC request submit failed", error);
    ui.tmcRequestStatus.textContent = "Не удалось создать заявку. Попробуйте ещё раз.";
    ui.tmcRequestStatus.classList.add("error");
  } finally {
    tmcRequestSubmitting = false;
    if (ui.submitTmcRequest?.isConnected) setButtonBusy(ui.submitTmcRequest, false);
  }
});

ui.requestSearchInput?.addEventListener("input", () => {
  current.requestSearch = ui.requestSearchInput.value;
  clearTimeout(requestSearchTimer);
  requestSearchTimer = window.setTimeout(renderRequests, 180);
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
  syncRemoteChanges();
  pollRemoteUsers(true);
});

window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (serviceWorkerUpdateReady && !isUserEditingForm()) {
      window.location.reload();
      return;
    }
    resetAppNotificationsForOpen();
    flushPendingWork();
    syncRemoteChanges();
    pollRemoteUsers(true);
  }
});

window.addEventListener("pointerdown", unlockNotificationAudio, { once: true, passive: true });
window.addEventListener("keydown", unlockNotificationAudio, { once: true });
document.addEventListener("focusin", () => {
  if (!isUserEditingForm()) return;
  clearTimeout(renderTimer);
  renderTimer = null;
});
document.addEventListener("focusout", () => {
  window.setTimeout(() => {
    if (backgroundRenderPending && !isUserEditingForm() && userApprovalDrafts.size === 0) scheduleRender();
  }, 800);
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    serviceWorkerUpdateReady = true;
  });
  window.addEventListener("load", () => {
    refreshStaleAssetCache();
    navigator.serviceWorker.register("/sw.js")
      .then(registration => registration.update())
      .catch(() => {});
  });
}

setupTheme();
setupLogin();
resetAppNotificationsForOpen();
(async () => {
  const deviceState = await loadStateFromDevice();
  if (deviceState && typeof deviceState === "object") mergeRemoteState(deviceState);
  if (isProfileReady()) {
    const handled = await handleIncomingNodeQrFromUrl();
    if (!handled) show(current.view, false);
  } else {
    render();
  }
  await loadRemoteState();
  loadRemoteUsers();
  connectRealtime();
  startRealtimePoll();
})();

