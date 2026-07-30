(() => {
  "use strict";

  const screen = document.querySelector("#workPermitScreen");
  if (!screen) return;

  const DRAFT_KEY = "ppr-work-permit-draft-v1";
  const LANGUAGE_KEY = "ppr-work-permit-language-v1";
  const TEAM_ROW_COUNT = 10;
  const BREAK_ROW_COUNT = 4;
  const CHANGE_ROW_COUNT = 4;
  const MEASURE_ROW_COUNT = 6;
  const APPROVAL_ROW_COUNT = 3;

  const TEXT = {
    ru: {
      screenTitle: "Наряд-допуск",
      screenDescription: "Форма для выполнения работ повышенной опасности",
      draftLocal: "Черновик автоматически сохраняется на этом устройстве",
      language: "Язык наряда",
      languageHint: "Выбранный язык применяется ко всему наряду и печати",
      russian: "Русский",
      kazakh: "Қазақша",
      print: "Печать / PDF",
      clear: "Очистить форму",
      clearConfirm: "Очистить все заполненные поля наряда-допуска?",
      saved: "Черновик сохранён",
      companyName: "ТОО «Aluminium of Kazakhstan»",
      permitTitle: "Наряд-допуск",
      permitSubtitle: "на выполнение работ повышенной опасности",
      permitNumber: "№ наряда-допуска",
      permitDate: "Дата выдачи",
      generalInformation: "Основные сведения",
      producerSection: "1. Производитель работ",
      assignedWorkSection: "2. Поручается выполнить",
      admitterSection: "3. Допускающий к работе",
      leaderSection: "4. Ответственный руководитель",
      safetySection: "5. Мероприятия для обеспечения безопасности работ",
      issuerSection: "6. Наряд-допуск выдал",
      completedMeasuresSection: "7. Мероприятия выполнены",
      approvalSection: "8. Согласовано",
      brigadeSection: "9. Допуск бригады к работе",
      startSection: "Бригада к работе приступила",
      breaksSection: "10. Оформление перерывов и возобновления работы",
      changesSection: "Изменения в составе бригады",
      finishSection: "Окончание работ",
      fullName: "ФИО",
      position: "Должность",
      organization: "Организация",
      signature: "Подпись",
      date: "Дата",
      time: "Время",
      dateTime: "Дата и время",
      equipment: "Оборудование",
      workPlace: "Место выполнения работ",
      workScope: "Краткое содержание работ",
      stopEquipment: "5.1 Остановить (техническое устройство)",
      disconnectEquipment: "5.2 Отключить (рубильник, задвижку, магистраль и т. п.)",
      installSafety: "5.3 Установить (тупики, заглушки, сигнальные лампы и т. п.)",
      airAnalysis: "5.4 Выполнить анализ воздушной среды (место)",
      fenceArea: "5.5 Оградить (зону работ, установить плакаты)",
      heightWork: "5.6 Работа на высоте или в колодцах (леса, пояса, верёвки и т. п.)",
      warnPersonnel: "5.7 Предупредить персонал цеха",
      route: "5.8 Указать маршруты следования (при необходимости приложить схему)",
      additionalMeasures: "5.9 Дополнительные мероприятия (ПЛА, ПОР, ПТМ, сети, подрядчики, огневые работы и т. п.)",
      measureNumber: "№ мероприятия",
      completedBy: "Выполнил",
      approvalNumber: "№",
      teamNumber: "№",
      briefingDateTime: "Дата и время инструктажа",
      teamMember: "Член бригады",
      profession: "Профессия / должность",
      memberSignature: "Подпись об ознакомлении",
      instructor: "Инструктаж провёл (ФИО, подпись)",
      workStartDate: "Дата начала",
      workStartTime: "Время начала",
      producerNameSignature: "Производитель работ (ФИО, подпись)",
      admitterNameSignature: "Допускающий (ФИО, подпись)",
      breakNumber: "№",
      breakDateTime: "Перерыв: дата и время",
      workplaceHandover: "Рабочее место сдал / принял",
      breakProducer: "Производитель работ (ФИО, подпись)",
      breakAdmitter: "Допускающий (ФИО, подпись)",
      resumeDateTime: "Возобновление: дата и время",
      resumeProducer: "Производитель работ (ФИО, подпись)",
      resumeAdmitter: "Допускающий (ФИО, подпись)",
      changeType: "Изменение",
      removedMembers: "Выведены из состава",
      addedMembers: "Введены в состав",
      changedMembers: "Члены бригады",
      changeIssuer: "Изменение разрешил (ФИО, подпись)",
      changeDateTime: "Дата и время",
      workFinishedDate: "Дата окончания",
      workFinishedTime: "Время окончания",
      workCompleted: "Работа выполнена",
      workplaceCleared: "Рабочее место убрано",
      permitReturned: "Наряд-допуск сдал (ФИО, должность, подпись)",
      permitAccepted: "Наряд-допуск принял (ФИО, должность, подпись)",
      reminderTitle: "ПАМЯТКА О НАРЯДЕ-ДОПУСКЕ",
      hideReminder: "Скрыть памятку",
      showReminder: "Показать памятку",
      reminder1: "Наряд-допуск оформляют на работы повышенной опасности, выполняемые в действующих цехах, на территории предприятия и на объектах, где действуют опасные производственные факторы.",
      reminder2: "Наряд-допуск оформляют в двух экземплярах в цехе заказчика до начала выполнения работ.",
      reminder3: "Все графы заполняют разборчиво, чернилами, без исправлений. В незаполняемых графах ставят прочерк.",
      reminder4: "Срок действия наряда-допуска не должен превышать пяти календарных дней.",
      reminder5: "Один наряд-допуск выдают на один объект или одну технологическую установку.",
      reminder6: "При одновременной работе нескольких подрядных организаций дополнительные меры безопасности указывают в пункте 5.9.",
      reminder7: "При работах около линий электропередачи, скрытых коммуникаций и в газоопасных местах специальные меры указывают в пункте 5.9.",
      reminder8: "Один экземпляр находится у производителя работ, второй — у допускающего.",
      blankOption: "Выберите"
    },
    kk: {
      screenTitle: "Жұмысқа рұқсат",
      screenDescription: "Қауіптілігі жоғары жұмыстарды орындауға арналған нысан",
      draftLocal: "Жоба осы құрылғыда автоматты түрде сақталады",
      language: "Жұмысқа рұқсат тілі",
      languageHint: "Таңдалған тіл бүкіл нысанға және басып шығаруға қолданылады",
      russian: "Русский",
      kazakh: "Қазақша",
      print: "Басып шығару / PDF",
      clear: "Нысанды тазалау",
      clearConfirm: "Жұмысқа рұқсаттың барлық толтырылған өрістерін тазалау керек пе?",
      saved: "Жоба сақталды",
      companyName: "«Aluminium of Kazakhstan» ЖШС",
      permitTitle: "Жұмысқа рұқсат",
      permitSubtitle: "қауіптілігі жоғары жұмыстарды орындауға",
      permitNumber: "Жұмысқа рұқсат №",
      permitDate: "Берілген күні",
      generalInformation: "Негізгі мәліметтер",
      producerSection: "1. Жұмыс жүргізушісі",
      assignedWorkSection: "2. Орындауға тапсырылған жұмыс",
      admitterSection: "3. Жұмысқа жіберуші",
      leaderSection: "4. Жауапты басшы",
      safetySection: "5. Жұмыс қауіпсіздігін қамтамасыз ету шаралары",
      issuerSection: "6. Жұмысқа рұқсатты берген",
      completedMeasuresSection: "7. Қауіпсіздік шаралары орындалды",
      approvalSection: "8. Келісілді",
      brigadeSection: "9. Бригаданы жұмысқа жіберу",
      startSection: "Бригада жұмысқа кірісті",
      breaksSection: "10. Үзілістер мен жұмысты қайта бастауды рәсімдеу",
      changesSection: "Бригада құрамындағы өзгерістер",
      finishSection: "Жұмыстың аяқталуы",
      fullName: "Т.А.Ә.",
      position: "Лауазымы",
      organization: "Ұйымы",
      signature: "Қолы",
      date: "Күні",
      time: "Уақыты",
      dateTime: "Күні мен уақыты",
      equipment: "Жабдық",
      workPlace: "Жұмыс орны",
      workScope: "Жұмыстың қысқаша мазмұны",
      stopEquipment: "5.1 Тоқтату (техникалық құрылғы)",
      disconnectEquipment: "5.2 Ажырату (ажыратқыш, ысырма, магистраль және т. б.)",
      installSafety: "5.3 Орнату (тіректер, бітеуіштер, дабыл шамдары және т. б.)",
      airAnalysis: "5.4 Ауа ортасына талдау жүргізу (орны)",
      fenceArea: "5.5 Қоршау (жұмыс аймағы, плакаттар)",
      heightWork: "5.6 Биіктікте немесе құдықтарда жұмыс (мінбелер, белдіктер, арқандар және т. б.)",
      warnPersonnel: "5.7 Цех персоналын ескерту",
      route: "5.8 Жүру маршруттарын көрсету (қажет болғанда сұлба қоса беріледі)",
      additionalMeasures: "5.9 Қосымша шаралар (АЖЖ, ЖӨЖ, жүк көтергіш тетіктер, желілер, мердігерлер, отты жұмыстар және т. б.)",
      measureNumber: "Шара №",
      completedBy: "Орындаған",
      approvalNumber: "№",
      teamNumber: "№",
      briefingDateTime: "Нұсқама күні мен уақыты",
      teamMember: "Бригада мүшесі",
      profession: "Кәсібі / лауазымы",
      memberSignature: "Танысқаны туралы қолы",
      instructor: "Нұсқама өткізген (Т.А.Ә., қолы)",
      workStartDate: "Басталған күні",
      workStartTime: "Басталған уақыты",
      producerNameSignature: "Жұмыс жүргізушісі (Т.А.Ә., қолы)",
      admitterNameSignature: "Жұмысқа жіберуші (Т.А.Ә., қолы)",
      breakNumber: "№",
      breakDateTime: "Үзіліс: күні мен уақыты",
      workplaceHandover: "Жұмыс орнын тапсырды / қабылдады",
      breakProducer: "Жұмыс жүргізушісі (Т.А.Ә., қолы)",
      breakAdmitter: "Жұмысқа жіберуші (Т.А.Ә., қолы)",
      resumeDateTime: "Қайта бастау: күні мен уақыты",
      resumeProducer: "Жұмыс жүргізушісі (Т.А.Ә., қолы)",
      resumeAdmitter: "Жұмысқа жіберуші (Т.А.Ә., қолы)",
      changeType: "Өзгеріс",
      removedMembers: "Құрамнан шығарылды",
      addedMembers: "Құрамға енгізілді",
      changedMembers: "Бригада мүшелері",
      changeIssuer: "Өзгеріске рұқсат берген (Т.А.Ә., қолы)",
      changeDateTime: "Күні мен уақыты",
      workFinishedDate: "Аяқталған күні",
      workFinishedTime: "Аяқталған уақыты",
      workCompleted: "Жұмыс орындалды",
      workplaceCleared: "Жұмыс орны тазаланды",
      permitReturned: "Жұмысқа рұқсатты тапсырған (Т.А.Ә., лауазымы, қолы)",
      permitAccepted: "Жұмысқа рұқсатты қабылдаған (Т.А.Ә., лауазымы, қолы)",
      reminderTitle: "ЖҰМЫСҚА РҰҚСАТ ТУРАЛЫ ЕСКЕРТПЕ",
      hideReminder: "Ескертпені жасыру",
      showReminder: "Ескертпені көрсету",
      reminder1: "Жұмысқа рұқсат қолданыстағы цехтарда, кәсіпорын аумағында және қауіпті өндірістік факторлар әсер ететін объектілерде орындалатын қауіптілігі жоғары жұмыстарға рәсімделеді.",
      reminder2: "Жұмысқа рұқсат жұмыстар басталғанға дейін тапсырыс беруші цехта екі данада рәсімделеді.",
      reminder3: "Барлық жолдар анық, өшпейтін сиямен, түзетусіз толтырылады. Толтырылмайтын жолдарға сызықша қойылады.",
      reminder4: "Жұмысқа рұқсаттың қолданылу мерзімі бес күнтізбелік күннен аспауға тиіс.",
      reminder5: "Бір жұмысқа рұқсат бір объектіге немесе бір технологиялық қондырғыға беріледі.",
      reminder6: "Бірнеше мердігер ұйым бір мезгілде жұмыс істегенде қосымша қауіпсіздік шаралары 5.9-тармақта көрсетіледі.",
      reminder7: "Электр беру желілерінің, жасырын коммуникациялардың жанында және газ қауіпті орындарда жұмыс істегенде арнайы шаралар 5.9-тармақта көрсетіледі.",
      reminder8: "Бір данасы жұмыс жүргізушісінде, екіншісі жұмысқа жіберушіде сақталады.",
      blankOption: "Таңдаңыз"
    }
  };

  let language = loadLanguage();
  let reminderVisible = true;
  let saveTimer = 0;

  function loadLanguage() {
    try {
      return localStorage.getItem(LANGUAGE_KEY) === "kk" ? "kk" : "ru";
    } catch {
      return "ru";
    }
  }

  function text(key) {
    return TEXT[language]?.[key] || TEXT.ru[key] || key;
  }

  function i18n(key, tag = "span", className = "") {
    return `<${tag}${className ? ` class="${className}"` : ""} data-work-permit-i18n="${key}">${text(key)}</${tag}>`;
  }

  function printMirror(name) {
    return `<span class="work-permit-print-value" data-work-permit-print-for="${name}" aria-hidden="true"></span>`;
  }

  function inputControl(name, labelKey, type = "text") {
    return `<input name="${name}" type="${type}" autocomplete="off" data-work-permit-aria="${labelKey}" aria-label="${text(labelKey)}">${printMirror(name)}`;
  }

  function textareaControl(name, labelKey, rows = 2) {
    return `<textarea name="${name}" rows="${rows}" data-work-permit-aria="${labelKey}" aria-label="${text(labelKey)}"></textarea>${printMirror(name)}`;
  }

  function field(name, labelKey, options = {}) {
    const { type = "text", textarea = false, rows = 2, wide = false } = options;
    return `
      <label class="work-permit-field${wide ? " work-permit-field-wide" : ""}">
        ${i18n(labelKey)}
        ${textarea ? textareaControl(name, labelKey, rows) : inputControl(name, labelKey, type)}
      </label>
    `;
  }

  function tableCell(name, labelKey, options = {}) {
    const { type = "text", textarea = false, rows = 2, content = "" } = options;
    const control = content || (textarea ? textareaControl(name, labelKey, rows) : inputControl(name, labelKey, type));
    return `<td data-work-permit-label="${labelKey}" data-mobile-label="${text(labelKey)}">${control}</td>`;
  }

  function responsibleLeaderRows() {
    return Array.from({ length: 2 }, (_, index) => `
      <tr>
        <th scope="row">${index + 1}</th>
        ${tableCell(`leader_${index}_name`, "fullName")}
        ${tableCell(`leader_${index}_position`, "position")}
        ${tableCell(`leader_${index}_signature`, "signature")}
      </tr>
    `).join("");
  }

  function measureRows() {
    return Array.from({ length: MEASURE_ROW_COUNT }, (_, index) => `
      <tr>
        ${tableCell(`measure_${index}_number`, "measureNumber")}
        ${tableCell(`measure_${index}_name`, "completedBy")}
        ${tableCell(`measure_${index}_position`, "position")}
        ${tableCell(`measure_${index}_signature`, "signature")}
      </tr>
    `).join("");
  }

  function approvalRows() {
    return Array.from({ length: APPROVAL_ROW_COUNT }, (_, index) => `
      <tr>
        <th scope="row">${index + 1}</th>
        ${tableCell(`approval_${index}_position`, "position")}
        ${tableCell(`approval_${index}_name`, "fullName")}
        ${tableCell(`approval_${index}_signature`, "signature")}
        ${tableCell(`approval_${index}_date`, "date", { type: "date" })}
      </tr>
    `).join("");
  }

  function teamRows() {
    return Array.from({ length: TEAM_ROW_COUNT }, (_, index) => `
      <tr>
        <th scope="row">${index + 1}</th>
        ${tableCell(`team_${index}_briefing`, "briefingDateTime", { type: "datetime-local" })}
        ${tableCell(`team_${index}_name`, "teamMember")}
        ${tableCell(`team_${index}_profession`, "profession")}
        ${tableCell(`team_${index}_signature`, "memberSignature")}
        ${tableCell(`team_${index}_instructor`, "instructor")}
      </tr>
    `).join("");
  }

  function breakRows() {
    return Array.from({ length: BREAK_ROW_COUNT }, (_, index) => `
      <tr>
        <th scope="row">${index + 1}</th>
        ${tableCell(`break_${index}_start`, "breakDateTime", { type: "datetime-local" })}
        ${tableCell(`break_${index}_workplace`, "workplaceHandover", { textarea: true, rows: 2 })}
        ${tableCell(`break_${index}_producer`, "breakProducer", { textarea: true, rows: 2 })}
        ${tableCell(`break_${index}_admitter`, "breakAdmitter", { textarea: true, rows: 2 })}
        ${tableCell(`break_${index}_resume`, "resumeDateTime", { type: "datetime-local" })}
        ${tableCell(`break_${index}_resume_producer`, "resumeProducer", { textarea: true, rows: 2 })}
        ${tableCell(`break_${index}_resume_admitter`, "resumeAdmitter", { textarea: true, rows: 2 })}
      </tr>
    `).join("");
  }

  function changeTypeControl(name) {
    return `
      <select name="${name}" data-work-permit-aria="changeType" aria-label="${text("changeType")}">
        <option value="" data-work-permit-i18n="blankOption">${text("blankOption")}</option>
        <option value="removed" data-work-permit-i18n="removedMembers">${text("removedMembers")}</option>
        <option value="added" data-work-permit-i18n="addedMembers">${text("addedMembers")}</option>
      </select>
      ${printMirror(name)}
    `;
  }

  function changeRows() {
    return Array.from({ length: CHANGE_ROW_COUNT }, (_, index) => `
      <tr>
        <th scope="row">${index + 1}</th>
        ${tableCell(`change_${index}_type`, "changeType", { content: changeTypeControl(`change_${index}_type`) })}
        ${tableCell(`change_${index}_members`, "changedMembers", { textarea: true, rows: 2 })}
        ${tableCell(`change_${index}_issuer`, "changeIssuer", { textarea: true, rows: 2 })}
        ${tableCell(`change_${index}_date`, "changeDateTime", { type: "datetime-local" })}
      </tr>
    `).join("");
  }

  function buildScreen() {
    screen.innerHTML = `
      <header class="work-permit-toolbar no-print">
        <div class="work-permit-intro">
          ${i18n("screenTitle", "h1")}
          ${i18n("screenDescription", "p")}
          <small><span aria-hidden="true">✓</span> ${i18n("draftLocal")}</small>
        </div>
        <div class="work-permit-toolbar-actions">
          <label class="work-permit-language-control">
            ${i18n("language")}
            <select id="workPermitLanguageSelect" aria-label="${text("language")}">
              <option value="ru">${text("russian")}</option>
              <option value="kk">${text("kazakh")}</option>
            </select>
            ${i18n("languageHint", "small")}
          </label>
          <button id="workPermitPrintButton" class="work-permit-print-button" type="button">
            <span aria-hidden="true">⎙</span> ${i18n("print")}
          </button>
          <button id="workPermitClearButton" class="work-permit-clear-button" type="button">
            ${i18n("clear")}
          </button>
        </div>
        <div id="workPermitSaveStatus" class="work-permit-save-status" role="status" aria-live="polite"></div>
      </header>

      <form id="workPermitForm" class="work-permit-form" autocomplete="off">
        <article class="work-permit-paper">
          <header class="work-permit-document-head">
            <div class="work-permit-company">
              ${i18n("companyName", "strong")}
              <span class="work-permit-document-code">НД / ЖР</span>
            </div>
            <div class="work-permit-title-row">
              <div>
                ${i18n("permitTitle", "h1")}
                ${i18n("permitSubtitle", "p")}
              </div>
              <div class="work-permit-head-fields">
                ${field("permit_number", "permitNumber")}
                ${field("permit_date", "permitDate", { type: "date" })}
              </div>
            </div>
          </header>

          <section class="work-permit-section">
            ${i18n("producerSection", "h2")}
            <div class="work-permit-grid work-permit-grid-three">
              ${field("producer_name", "fullName")}
              ${field("producer_position", "position")}
              ${field("producer_organization", "organization")}
            </div>
          </section>

          <section class="work-permit-section">
            ${i18n("assignedWorkSection", "h2")}
            <div class="work-permit-grid">
              ${field("work_equipment", "equipment")}
              ${field("work_place", "workPlace")}
              ${field("work_scope", "workScope", { textarea: true, rows: 3, wide: true })}
            </div>
          </section>

          <section class="work-permit-section">
            ${i18n("admitterSection", "h2")}
            <div class="work-permit-grid">
              ${field("admitter_name", "fullName")}
              ${field("admitter_position", "position")}
            </div>
          </section>

          <section class="work-permit-section">
            ${i18n("leaderSection", "h2")}
            <div class="work-permit-table-wrap">
              <table class="work-permit-table work-permit-responsive-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th data-work-permit-i18n="fullName">${text("fullName")}</th>
                    <th data-work-permit-i18n="position">${text("position")}</th>
                    <th data-work-permit-i18n="signature">${text("signature")}</th>
                  </tr>
                </thead>
                <tbody>${responsibleLeaderRows()}</tbody>
              </table>
            </div>
          </section>

          <section class="work-permit-section work-permit-safety-section">
            ${i18n("safetySection", "h2")}
            <div class="work-permit-grid">
              ${field("safety_stop", "stopEquipment", { textarea: true, rows: 2 })}
              ${field("safety_disconnect", "disconnectEquipment", { textarea: true, rows: 2 })}
              ${field("safety_install", "installSafety", { textarea: true, rows: 2 })}
              ${field("safety_air", "airAnalysis", { textarea: true, rows: 2 })}
              ${field("safety_fence", "fenceArea", { textarea: true, rows: 2 })}
              ${field("safety_height", "heightWork", { textarea: true, rows: 2 })}
              ${field("safety_warn", "warnPersonnel", { textarea: true, rows: 2 })}
              ${field("safety_route", "route", { textarea: true, rows: 2 })}
              ${field("safety_additional", "additionalMeasures", { textarea: true, rows: 3, wide: true })}
            </div>
          </section>

          <section class="work-permit-section">
            ${i18n("issuerSection", "h2")}
            <div class="work-permit-grid work-permit-grid-four">
              ${field("issuer_name", "fullName")}
              ${field("issuer_position", "position")}
              ${field("issuer_signature", "signature")}
              ${field("issuer_date", "date", { type: "date" })}
            </div>
          </section>

          <section class="work-permit-section work-permit-section-long">
            ${i18n("completedMeasuresSection", "h2")}
            <div class="work-permit-table-wrap">
              <table class="work-permit-table work-permit-responsive-table">
                <thead>
                  <tr>
                    <th data-work-permit-i18n="measureNumber">${text("measureNumber")}</th>
                    <th data-work-permit-i18n="completedBy">${text("completedBy")}</th>
                    <th data-work-permit-i18n="position">${text("position")}</th>
                    <th data-work-permit-i18n="signature">${text("signature")}</th>
                  </tr>
                </thead>
                <tbody>${measureRows()}</tbody>
              </table>
            </div>
          </section>

          <section class="work-permit-section">
            ${i18n("approvalSection", "h2")}
            <div class="work-permit-table-wrap">
              <table class="work-permit-table work-permit-responsive-table">
                <thead>
                  <tr>
                    <th data-work-permit-i18n="approvalNumber">${text("approvalNumber")}</th>
                    <th data-work-permit-i18n="position">${text("position")}</th>
                    <th data-work-permit-i18n="fullName">${text("fullName")}</th>
                    <th data-work-permit-i18n="signature">${text("signature")}</th>
                    <th data-work-permit-i18n="date">${text("date")}</th>
                  </tr>
                </thead>
                <tbody>${approvalRows()}</tbody>
              </table>
            </div>
          </section>

          <section class="work-permit-section work-permit-section-long">
            ${i18n("brigadeSection", "h2")}
            <div class="work-permit-table-wrap">
              <table class="work-permit-table work-permit-responsive-table work-permit-team-table">
                <thead>
                  <tr>
                    <th data-work-permit-i18n="teamNumber">${text("teamNumber")}</th>
                    <th data-work-permit-i18n="briefingDateTime">${text("briefingDateTime")}</th>
                    <th data-work-permit-i18n="teamMember">${text("teamMember")}</th>
                    <th data-work-permit-i18n="profession">${text("profession")}</th>
                    <th data-work-permit-i18n="memberSignature">${text("memberSignature")}</th>
                    <th data-work-permit-i18n="instructor">${text("instructor")}</th>
                  </tr>
                </thead>
                <tbody>${teamRows()}</tbody>
              </table>
            </div>
          </section>

          <section class="work-permit-section">
            ${i18n("startSection", "h2")}
            <div class="work-permit-grid work-permit-grid-four">
              ${field("start_date", "workStartDate", { type: "date" })}
              ${field("start_time", "workStartTime", { type: "time" })}
              ${field("start_producer", "producerNameSignature", { textarea: true, rows: 2 })}
              ${field("start_admitter", "admitterNameSignature", { textarea: true, rows: 2 })}
            </div>
          </section>

          <section class="work-permit-section work-permit-section-long">
            ${i18n("breaksSection", "h2")}
            <div class="work-permit-table-wrap">
              <table class="work-permit-table work-permit-responsive-table work-permit-break-table">
                <thead>
                  <tr>
                    <th data-work-permit-i18n="breakNumber">${text("breakNumber")}</th>
                    <th data-work-permit-i18n="breakDateTime">${text("breakDateTime")}</th>
                    <th data-work-permit-i18n="workplaceHandover">${text("workplaceHandover")}</th>
                    <th data-work-permit-i18n="breakProducer">${text("breakProducer")}</th>
                    <th data-work-permit-i18n="breakAdmitter">${text("breakAdmitter")}</th>
                    <th data-work-permit-i18n="resumeDateTime">${text("resumeDateTime")}</th>
                    <th data-work-permit-i18n="resumeProducer">${text("resumeProducer")}</th>
                    <th data-work-permit-i18n="resumeAdmitter">${text("resumeAdmitter")}</th>
                  </tr>
                </thead>
                <tbody>${breakRows()}</tbody>
              </table>
            </div>
          </section>

          <section class="work-permit-section work-permit-section-long">
            ${i18n("changesSection", "h2")}
            <div class="work-permit-table-wrap">
              <table class="work-permit-table work-permit-responsive-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th data-work-permit-i18n="changeType">${text("changeType")}</th>
                    <th data-work-permit-i18n="changedMembers">${text("changedMembers")}</th>
                    <th data-work-permit-i18n="changeIssuer">${text("changeIssuer")}</th>
                    <th data-work-permit-i18n="changeDateTime">${text("changeDateTime")}</th>
                  </tr>
                </thead>
                <tbody>${changeRows()}</tbody>
              </table>
            </div>
          </section>

          <section class="work-permit-section">
            ${i18n("finishSection", "h2")}
            <div class="work-permit-grid work-permit-grid-four">
              ${field("finish_date", "workFinishedDate", { type: "date" })}
              ${field("finish_time", "workFinishedTime", { type: "time" })}
              ${field("work_completed", "workCompleted", { textarea: true, rows: 2 })}
              ${field("workplace_cleared", "workplaceCleared", { textarea: true, rows: 2 })}
              ${field("permit_returned", "permitReturned", { textarea: true, rows: 2, wide: true })}
              ${field("permit_accepted", "permitAccepted", { textarea: true, rows: 2, wide: true })}
            </div>
          </section>

          <section id="workPermitReminder" class="work-permit-reminder">
            <header>
              ${i18n("reminderTitle", "h2")}
              <button id="workPermitReminderToggle" class="no-print" type="button" aria-expanded="true">
                ${i18n("hideReminder")}
              </button>
            </header>
            <ol>
              ${Array.from({ length: 8 }, (_, index) => `<li data-work-permit-i18n="reminder${index + 1}">${text(`reminder${index + 1}`)}</li>`).join("")}
            </ol>
          </section>
          <button id="workPermitReminderShow" class="work-permit-reminder-show no-print" type="button" hidden>
            ${i18n("showReminder")}
          </button>
        </article>
      </form>
    `;
  }

  function controls() {
    return [...screen.querySelectorAll("#workPermitForm input[name], #workPermitForm textarea[name], #workPermitForm select[name]")];
  }

  function formatControlValue(control) {
    if (!control?.value) return "";
    if (control.tagName === "SELECT") return control.selectedOptions[0]?.textContent?.trim() || "";
    if (control.type === "date") {
      const date = new Date(`${control.value}T00:00:00`);
      return Number.isNaN(date.getTime()) ? control.value : date.toLocaleDateString(language === "kk" ? "kk-KZ" : "ru-RU");
    }
    if (control.type === "datetime-local") {
      const date = new Date(control.value);
      return Number.isNaN(date.getTime())
        ? control.value
        : date.toLocaleString(language === "kk" ? "kk-KZ" : "ru-RU", { dateStyle: "short", timeStyle: "short" });
    }
    return control.value;
  }

  function syncPrintValue(control) {
    if (!control?.name) return;
    const mirror = screen.querySelector(`[data-work-permit-print-for="${control.name}"]`);
    if (mirror) mirror.textContent = formatControlValue(control);
  }

  function syncAllPrintValues() {
    controls().forEach(syncPrintValue);
  }

  function growTextarea(textarea) {
    if (!textarea || textarea.tagName !== "TEXTAREA") return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 58)}px`;
  }

  function growAllTextareas() {
    screen.querySelectorAll("textarea").forEach(growTextarea);
  }

  function draftValues() {
    return controls().reduce((values, control) => {
      values[control.name] = control.value;
      return values;
    }, {});
  }

  function saveDraft(showStatus = true) {
    window.clearTimeout(saveTimer);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        version: 1,
        language,
        reminderVisible,
        values: draftValues(),
        updatedAt: new Date().toISOString()
      }));
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {}
    if (!showStatus) return;
    const status = screen.querySelector("#workPermitSaveStatus");
    if (!status) return;
    status.textContent = text("saved");
    status.classList.add("visible");
    window.setTimeout(() => status.classList.remove("visible"), 1400);
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveDraft(true), 250);
  }

  function restoreDraft() {
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    } catch {}
    if (draft?.language === "ru" || draft?.language === "kk") language = draft.language;
    reminderVisible = draft?.reminderVisible !== false;
    const values = draft?.values && typeof draft.values === "object" ? draft.values : {};
    controls().forEach(control => {
      if (Object.prototype.hasOwnProperty.call(values, control.name)) control.value = String(values[control.name] ?? "");
    });
    const permitDate = screen.querySelector('[name="permit_date"]');
    if (permitDate && !permitDate.value && !draft) {
      const now = new Date();
      const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      permitDate.value = localDate;
    }
    setReminderVisible(reminderVisible, false);
    growAllTextareas();
    syncAllPrintValues();
  }

  function setReminderVisible(visible, persist = true) {
    reminderVisible = Boolean(visible);
    const reminder = screen.querySelector("#workPermitReminder");
    const hideButton = screen.querySelector("#workPermitReminderToggle");
    const showButton = screen.querySelector("#workPermitReminderShow");
    if (reminder) reminder.hidden = !reminderVisible;
    if (showButton) showButton.hidden = reminderVisible;
    if (hideButton) {
      hideButton.setAttribute("aria-expanded", String(reminderVisible));
      hideButton.setAttribute("aria-label", text("hideReminder"));
    }
    if (persist) saveDraft(false);
  }

  function applyLanguage(nextLanguage = language) {
    language = nextLanguage === "kk" ? "kk" : "ru";
    screen.lang = language === "kk" ? "kk" : "ru";
    screen.dataset.workPermitLanguage = language;
    screen.querySelectorAll("[data-work-permit-i18n]").forEach(element => {
      const key = element.dataset.workPermitI18n;
      element.textContent = text(key);
    });
    screen.querySelectorAll("[data-work-permit-aria]").forEach(element => {
      element.setAttribute("aria-label", text(element.dataset.workPermitAria));
    });
    screen.querySelectorAll("[data-work-permit-label]").forEach(element => {
      element.dataset.mobileLabel = text(element.dataset.workPermitLabel);
    });
    const languageSelect = screen.querySelector("#workPermitLanguageSelect");
    if (languageSelect) {
      languageSelect.value = language;
      languageSelect.setAttribute("aria-label", text("language"));
    }
    setReminderVisible(reminderVisible, false);
    syncAllPrintValues();
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {}
  }

  function clearForm() {
    if (!window.confirm(text("clearConfirm"))) return;
    screen.querySelector("#workPermitForm")?.reset();
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    const permitDate = screen.querySelector('[name="permit_date"]');
    if (permitDate) {
      const now = new Date();
      permitDate.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
    reminderVisible = true;
    setReminderVisible(true, false);
    growAllTextareas();
    syncAllPrintValues();
    saveDraft(true);
  }

  function printPermit() {
    saveDraft(false);
    growAllTextareas();
    syncAllPrintValues();
    const oldTitle = document.title;
    const printStyle = document.createElement("style");
    printStyle.id = "workPermitPrintPageStyle";
    printStyle.textContent = "@page { size: A4 portrait; margin: 10mm; }";
    document.head.append(printStyle);
    document.title = `${text("permitTitle")} ${screen.querySelector('[name="permit_number"]')?.value || ""}`.trim();
    document.body.classList.add("printing-work-permit");
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.title = oldTitle;
      document.body.classList.remove("printing-work-permit");
      printStyle.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.requestAnimationFrame(() => {
      window.print();
      window.setTimeout(cleanup, 5000);
    });
  }

  function bindEvents() {
    const form = screen.querySelector("#workPermitForm");
    form?.addEventListener("input", event => {
      if (event.target.matches("textarea")) growTextarea(event.target);
      syncPrintValue(event.target);
      scheduleSave();
    });
    form?.addEventListener("change", event => {
      syncPrintValue(event.target);
      scheduleSave();
    });
    screen.querySelector("#workPermitLanguageSelect")?.addEventListener("change", event => {
      saveDraft(false);
      applyLanguage(event.currentTarget.value);
      saveDraft(true);
    });
    screen.querySelector("#workPermitPrintButton")?.addEventListener("click", printPermit);
    screen.querySelector("#workPermitClearButton")?.addEventListener("click", clearForm);
    screen.querySelector("#workPermitReminderToggle")?.addEventListener("click", () => setReminderVisible(false));
    screen.querySelector("#workPermitReminderShow")?.addEventListener("click", () => setReminderVisible(true));
    window.addEventListener("beforeprint", () => {
      if (document.body.classList.contains("printing-work-permit")) {
        growAllTextareas();
        syncAllPrintValues();
      }
    });
    window.addEventListener("beforeunload", () => saveDraft(false));
  }

  function activate() {
    applyLanguage(language);
    growAllTextareas();
    syncAllPrintValues();
  }

  buildScreen();
  restoreDraft();
  applyLanguage(language);
  bindEvents();

  window.PprWorkPermit = {
    activate,
    print: printPermit,
    subtitle: () => text("screenTitle"),
    language: () => language
  };
})();
