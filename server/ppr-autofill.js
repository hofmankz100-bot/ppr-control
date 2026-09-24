"use strict";

// The existing client catalogue and maintenance instructions are retained verbatim.
// A parity regression checks them against the browser until they are shared.
const DEFAULT_NODES = [
  "Основное оборудование", "Привод и механическая часть", "Электрическая часть", "Панель управления и автоматика",
  "Система безопасности", "Смазка и обслуживание", "Рабочая зона", "Освещение", "Шкаф управления", "Журнал замечаний"
];

const EQUIPMENT = [
  { id: 1, name: "пресс 2400 EGE", area: "Прессовый участок", nodes: [
    "Пресс гидравлический станция и цилиндры", "Печь загатовка и Робот", "Пульт управление кнопки (пила,пресс,печь заг)",
    "Печь матрица ,Толкатель матрицы, Кран-балка матрицы", "Стол охлаждение вентиляторы(бикса,стол ролик,стол пуллер)",
    "Лента стол 1-2-3-4 (цилиндр,вал,цеп,клапн воздух)", "Горячий пила и Пуллер A.B", "Термичка 1", "Термичка 2",
    "Финишный пила (экран управление,лапа,размер проф)", "печь матрицы электрическая таль №10", "кран балка №7 2 тонны термичка загрузка"
  ]},
  { id: 2, name: "пресс 1540 EGE", area: "Прессовый участок", nodes: [
    "Главный цилиндр", "Гидравлическая станция", "Масляная система", "Гидрораспределители", "Пресс-шток", "Dummy block", "Контейнер", "Нагрев контейнера",
    "Матрицедержатель", "Оснастка", "Колонны пресса", "Станина", "Печь нагрева", "Стол загрузки", "Подача заготовок", "Нож резки", "Пуллер", "Охлаждающий стол", "Охлаждение масла", "Шкаф управления"
  ]},
  { id: 3, name: "Литейный цех", area: "Литейный цех", nodes: [
    "Литейная печь", "Стол заливки слитков", "Пила резки алюминиевых слитков", "Транспортер загрузки", "Освещение", "ШГРП литейного цеха"
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
    "ШГРП", "КОНТРОЛЬНАЯ ТРУБКА №1", "КОНТРОЛЬНАЯ ТРУБКА №2", "КОНТРОЛЬНАЯ ТРУБКА №3", "КОНТРОЛЬНАЯ ТРУБКА №4", "КОНТРОЛЬНАЯ ТРУБКА №5",
    "Охранная зона газопровода", "Газорегуляторный пункт (ГРП) №1", "Газорегуляторный пункт (ГРП) №2", "Газорегуляторный пункт (ГРП) №3",
    "Газорегуляторный пункт (ГРП) №4", "Газорегуляторный пункт (ГРП) №5", "Газорегуляторный пункт (ГРП) №6", "Газорегуляторный пункт (ГРП) №7",
    "Газорегуляторный пункт (ГРП) №8", "Газорегуляторный пункт (ГРП) №9", "Газорегуляторный пункт (ГРП) №10", "Газорегуляторный пункт (ГРП) №11", "ПСК"
  ]},
  { id: 17, name: "оборудование 17", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 18, name: "оборудование 18", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 19, name: "оборудование 19", area: "Резерв", nodes: DEFAULT_NODES },
  { id: 20, name: "оборудование 20", area: "Резерв", nodes: DEFAULT_NODES }
];


function nodeReminderItems(nodeName, equipmentName = "") {
  const name = `${equipmentName || ""} ${nodeName || ""}`.toLowerCase();
  if (/конвейер|транспортер|транспортёр|лента/.test(name)) {
    return [
      "Осмотреть ленту, стыки, ролики и барабаны на повреждения и загрязнение.",
      "Проверить натяжение, центровку ленты и отсутствие схода в сторону.",
      "Проверить привод, редуктор, муфты, крепления, шум и вибрацию.",
      "Проверить ограждения, аварийные тросы, кнопки остановки и блокировки.",
      "Проверить предусмотренные точки смазки по инструкции изготовителя."
    ];
  }
  if (/электродвиг|мотор|двигатель/.test(name)) {
    return [
      "Осмотреть корпус, крепления, клеммную коробку, кабель и заземление.",
      "Проверить нагрев, шум, вибрацию и состояние вентиляционных отверстий.",
      "Проверить подшипники и соединение с приводом без разборки защитных устройств.",
      "Проверить отсутствие запаха гари, искрения и повреждения изоляции.",
      "Измерения выполнять только обученному персоналу по инструкции изготовителя."
    ];
  }
  if (/редуктор/.test(name)) {
    return [
      "Осмотреть корпус, крепления, уплотнения и соединения на утечки.",
      "Проверить уровень и состояние масла по инструкции изготовителя.",
      "Проверить шум, вибрацию, нагрев, люфт и состояние муфты.",
      "Очистить сапун и наружные поверхности, если это допускает инструкция.",
      "Проверить срок замены масла и смазки по паспорту оборудования."
    ];
  }
  if (/пресс/.test(name)) {
    return [
      "Осмотреть раму, колонны, направляющие, крепления и рабочую зону.",
      "Проверить гидравлические соединения, цилиндры, шланги и утечки.",
      "Проверить защитные ограждения, блокировки и аварийную остановку.",
      "Проверить шум, вибрацию, нагрев и плавность рабочего хода.",
      "Смазку и регулировку выполнять только по карте ППР изготовителя."
    ];
  }
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

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00.000Z`)) && new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) === date;
}

function rawMaintenance(equipment, date) {
  const intervalDays = ["Компрессорная", "Газовое хозяйство"].includes(equipment.area) ? 7 : 14;
  // Preserve the existing plant-calendar schedule at Kazakhstan local midnight.
  // The server timezone must not move the rotation by a day in Linux/CI.
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00+05:00`) / 86400000);
  const offset = (dayNumber + Number(equipment.id || 0) * 3) % intervalDays;
  const daysUntil = offset === 0 ? 0 : intervalDays - offset;
  // Advance by one node for every maintenance occurrence. Using the raw day
  // number here skipped nodes whenever intervalDays and nodes.length shared a
  // divisor (for example, a 14-day interval with 20 nodes visited only 10).
  const dueDayNumber = dayNumber + daysUntil;
  const occurrence = Math.floor((dueDayNumber + Number(equipment.id || 0) * 3) / intervalDays);
  const groupSize = Math.max(1, Math.ceil(equipment.nodes.length / 4));
  const nodeIndex = equipment.nodes.length ? ((((occurrence * groupSize) % equipment.nodes.length) + equipment.nodes.length) % equipment.nodes.length) : 0;
  return { dueDate: addDays(date, daysUntil), daysUntil, node: equipment.nodes[nodeIndex] || equipment.name, intervalDays };
}

function recommendedMaintenanceForDate(equipment, date) {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  if (day === 0 || day === 6) return null;
  const plan = rawMaintenance(equipment, date);
  if (!plan.daysUntil) return plan;
  if (day !== 1) return null;
  for (const daysBack of [1, 2]) {
    const originalDate = addDays(date, -daysBack);
    const weekendPlan = rawMaintenance(equipment, originalDate);
    if (!weekendPlan.daysUntil) return { ...weekendPlan, dueDate: date, daysUntil: 0, shiftedFrom: originalDate };
  }
  return null;
}

function equipmentForPlan(catalog = {}) {
  const saved = catalog.equipment || {};
  const builtInIds = new Set(EQUIPMENT.map(item => Number(item.id)));
  const builtIn = EQUIPMENT.map(item => {
    const override = saved[item.id] || {};
    return { ...item, ...override, id: item.id, name: override.name || item.name, area: override.area || item.area, nodes: Array.isArray(override.nodes) ? override.nodes : item.nodes };
  });
  const created = Object.values(saved).filter(item => item?.created === true && Number.isSafeInteger(Number(item.id)) && !builtInIds.has(Number(item.id))).map(item => ({ ...item, id: Number(item.id), name: String(item.name || `Оборудование ${item.id}`), area: String(item.area || "Без участка"), nodes: Array.isArray(item.nodes) && item.nodes.length ? item.nodes : ["Основное оборудование"] }));
  return [...builtIn, ...created].filter(item => item.deleted !== true && item.area !== "Резерв").sort((a, b) => Number(a.id) - Number(b.id));
}

function pauseApplies(pause, date, today) {
  if (!pause?.startedAt) return false;
  const start = String(pause.startedAt).slice(0, 10);
  const end = String(pause.endedAt || "").slice(0, 10);
  if (end && date === today) return false;
  return date >= start && (!end || date <= end);
}

function rawScheduledItemsForDate(catalog, date, today = date) {
  return equipmentForPlan(catalog).flatMap(equipment => {
    if ((equipment.operationalPauses || []).some(pause => pauseApplies(pause, date, today))) return [];
    const plan = recommendedMaintenanceForDate(equipment, date);
    if (!plan) return [];
    // Keep neighboring nodes together without overloading one day. A full
    // equipment cycle is split into at most four consecutive PPR groups.
    const groupSize = Math.max(1, Math.ceil(equipment.nodes.length / 4));
    const startIndex = Math.max(0, equipment.nodes.indexOf(plan.node));
    const groupedNodes = Array.from({ length: Math.min(groupSize, equipment.nodes.length) }, (_, offset) => {
      const index = (startIndex + offset) % equipment.nodes.length;
      return { node: equipment.nodes[index], index };
    });
    return groupedNodes.flatMap(({ node, index }) => {
      if ((equipment.nodeOperationalPauses?.[index] || []).some(pause => pauseApplies(pause, date, today))) return [];
      return [{ equipmentId: equipment.id, equipment: equipment.name, area: equipment.area, node, intervalDays: plan.intervalDays }];
    });
  });
}

function workWeekDates(date) {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  const monday = addDays(date, weekday === 0 ? -6 : 1 - weekday);
  return Array.from({ length: 5 }, (_, index) => addDays(monday, index));
}

function yearlyDistributionOffset(catalog, week, today) {
  const year = Number(week[0].slice(0, 4));
  let cursor = workWeekDates(`${year}-01-01`)[0];
  let offset = 0;
  while (cursor < week[0]) {
    offset = (offset + workWeekDates(cursor).flatMap(day => rawScheduledItemsForDate(catalog, day, today)).length) % 5;
    cursor = addDays(cursor, 7);
  }
  return offset;
}

function scheduledItemsForDate(catalog, date, today = date) {
  const week = workWeekDates(date);
  const dayIndex = week.indexOf(date);
  if (dayIndex < 0) return [];
  const weeklyItems = week.flatMap(day => rawScheduledItemsForDate(catalog, day, today));
  const offset = yearlyDistributionOffset(catalog, week, today);
  const equipment = new Map(equipmentForPlan(catalog).map(item => [Number(item.id), item]));
  return weeklyItems.filter((item, index) => {
    if ((offset + index) % week.length !== dayIndex) return false;
    const target = equipment.get(Number(item.equipmentId));
    if (!target || (target.operationalPauses || []).some(pause => pauseApplies(pause, date, today))) return false;
    const nodeIndex = target.nodes.indexOf(item.node);
    return !(target.nodeOperationalPauses?.[nodeIndex] || []).some(pause => pauseApplies(pause, date, today));
  });
}

function buildAutofillRows(date, scheduledItems, templates = {}) {
  const rows = [];
  scheduledItems.forEach((scheduled, index) => {
    const template = templates[JSON.stringify([String(scheduled.equipmentId), scheduled.node])];
    const works = template?.works?.length ? template.works : nodeReminderItems(scheduled.node, scheduled.equipment);
    works.forEach((work, workIndex) => {
      const clean = String(work || "").trim();
      if (!clean || (!template && rows.some(row => row.work === clean && row.equipmentId === scheduled.equipmentId && row.node === scheduled.node))) return;
      rows.push({ id: `${date}-auto-${index + 1}-${workIndex + 1}`, work: clean, mark: "", equipmentId: scheduled.equipmentId, equipment: scheduled.equipment, node: scheduled.node, area: scheduled.area, autoFilled: true });
    });
  });
  while (rows.length < 8) rows.push({ id: `${date}-work-${rows.length + 1}`, work: "", mark: "" });
  return rows;
}

function pprSheetReadyForApproval(sheet) {
  const plannedTargets = sheet?.plannedAutomatically && !sheet?.explicitPlan
    ? new Set((sheet.autofilledFor || []).map(item => JSON.stringify([String(item?.equipmentId || ""), String(item?.node || "").trim()])))
    : null;
  const active = (sheet?.rows || []).filter(row => String(row?.work || "").trim()
    && (!plannedTargets?.size || plannedTargets.has(JSON.stringify([String(row?.equipmentId || ""), String(row?.node || "").trim()]))));
  return !sheet?.approvedAt && active.length > 0 && active.every(row => ["done", "na"].includes(row.mark));
}

function reconcilePprApprovalRequest(sheet, previous, now = new Date().toISOString()) {
  if (!sheet) return "";
  // Accepted sheets are history: preserve their saved request/signature fields.
  if (sheet.approvedAt) return previous?.approvedAt ? "" : "clear";
  if (pprSheetReadyForApproval(sheet)) {
    const alreadyRequested = pprSheetReadyForApproval(previous) && previous?.approvalRequestedAt;
    sheet.approvalRequestedAt = alreadyRequested || now;
    return alreadyRequested ? "" : "notify";
  }
  if (sheet.approvalRequestedAt) sheet.approvalRequestedAt = "";
  return previous?.approvalRequestedAt ? "clear" : "";
}

function finalizedAutofill(sheet, previous, changed, now) {
  if (!sheet || sheet.approvedAt) return { sheet, changed };
  const next = { ...sheet };
  reconcilePprApprovalRequest(next, previous, now);
  return { sheet: next, changed: changed || next.approvalRequestedAt !== previous?.approvalRequestedAt };
}

function scheduledTargetKey(item = {}) {
  return JSON.stringify([String(item.equipmentId), String(item.node || "").trim()]);
}

function scheduledTargetSignature(items = []) {
  return items.map(scheduledTargetKey).sort().join("|");
}

function appendMissingScheduledTargets(previous, scheduledItems, templates, date, now) {
  const existingTargets = new Set((previous.rows || [])
    .filter(row => String(row?.work || "").trim() && row.equipmentId != null && String(row.node || "").trim())
    .map(scheduledTargetKey));
  const missingTargets = new Set(scheduledItems.map(scheduledTargetKey).filter(key => !existingTargets.has(key)));
  const usedIds = new Set((previous.rows || []).map(row => String(row?.id || "")));
  const added = buildAutofillRows(date, scheduledItems, templates)
    .filter(row => String(row.work || "").trim() && missingTargets.has(scheduledTargetKey(row)))
    .map(row => {
      let id = row.id;
      for (let suffix = 1; usedIds.has(id); suffix += 1) id = `${row.id}-sync-${suffix}`;
      usedIds.add(id);
      return { ...row, id, updatedAt: now, workUpdatedAt: now, markUpdatedAt: now, resolutionUpdatedAt: now };
    });
  if (!added.length) return null;
  const activeRows = (previous.rows || []).filter(row => String(row?.work || "").trim());
  const reserveRows = (previous.rows || []).filter(row => !String(row?.work || "").trim());
  return [...activeRows, ...added, ...reserveRows];
}

function generatePprSheet({ catalog, templates = {}, previous, date, force = false, now = new Date().toISOString() }) {
  if (!validDate(date)) throw new Error("ppr_date_invalid");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Qyzylorda", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  const scheduledItems = scheduledItemsForDate(catalog, date, today);
  const rowsStarted = previous?.rows?.some(row => row.mark || row.markedAt || String(row.resolutionComment || "").trim());
  const automaticSheet = previous?.autofillInitialized && previous?.plannedAutomatically && !previous?.explicitPlan;
  const catalogChanged = automaticSheet
    && scheduledTargetSignature(previous.autofilledFor) !== scheduledTargetSignature(scheduledItems);
  // Opening a day is idempotent: a worker never replaces saved work, marks or
  // approvals, and a concurrent engineer edit wins before this transaction.
  // An untouched automatic sheet is refreshed when the live equipment catalog
  // gains, removes or renames scheduled nodes, so every node receives a checklist.
  if (previous && (previous.approvedAt || previous.explicitPlan)) return finalizedAutofill(previous, previous, false, now);
  if (previous && rowsStarted) {
    if (!catalogChanged) return finalizedAutofill(previous, previous, false, now);
    const rows = appendMissingScheduledTargets(previous, scheduledItems, templates, date, now);
    if (!rows) return finalizedAutofill(previous, previous, false, now);
    return finalizedAutofill({
      ...previous,
      rows,
      updatedAt: now,
      updatedByName: "Система",
      autofilledAt: now,
      autofilledFor: scheduledItems.map(({ equipmentId, equipment, node, area }) => ({ equipmentId, equipment, node, area }))
    }, previous, true, now);
  }
  if (previous && !force && !catalogChanged && (previous.autofillInitialized || previous.rows?.some(row => String(row?.work || "").trim()))) return finalizedAutofill(previous, previous, false, now);
  if (!scheduledItems.length) return finalizedAutofill(previous || null, previous, false, now);
  const sheet = {
    ...(previous || {}), id: previous?.id || `ppr-sheet:${date}`, date,
    rows: buildAutofillRows(date, scheduledItems, templates).map(row => ({ ...row, updatedAt: now, workUpdatedAt: now, markUpdatedAt: now, resolutionUpdatedAt: now })), createdAt: previous?.createdAt || now,
    updatedAt: now, updatedByName: "Система", autofillInitialized: true, autofillMode: "template", autofilledAt: now,
    plannedByName: "Система", plannedByRole: "system", plannedAt: now, plannedAutomatically: true,
    approvalRequestedAt: "",
    autofilledFor: scheduledItems.map(({ equipmentId, equipment, node, area }) => ({ equipmentId, equipment, node, area }))
  };
  return finalizedAutofill(sheet, previous, true, now);
}

module.exports = { EQUIPMENT, equipmentForPlan, nodeReminderItems, recommendedMaintenanceForDate, scheduledItemsForDate, buildAutofillRows, generatePprSheet, validDate, pprSheetReadyForApproval, reconcilePprApprovalRequest };
