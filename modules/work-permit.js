(() => {
  "use strict";

  const screen = document.querySelector("#workPermitScreen");

  if (!screen) return;

  /*
   * ============================================================
   * 1. ОСНОВНЫЕ НАСТРОЙКИ
   * ============================================================
   */

  const DRAFT_KEY_PREFIX = "ppr-work-permit-draft-v4";
  const LANGUAGE_KEY = "ppr-work-permit-language-v1";
  const LOCAL_NUMBER_KEY = "ppr-work-permit-local-number-v1";

  /*
   * Пока серверный API автоматической нумерации не подключён,
   * используется локальный номер.
   *
   * В дальнейшем функцию getNextPermitNumber() можно подключить
   * к PostgreSQL через серверный API.
   */

  const DEFAULT_COMPANY_NAME = "ТОО «Aluminium of Kazakhstan»";

  const OPTIONAL_SECTION_IDS = [
    "leader",
    "completedMeasures",
    "approval",
    "brigade",
    "breaks",
    "changes"
  ];

  const SAFETY_MEASURES = [
    {
      id: "5.1",
      key: "safetyStop",
      fieldName: "safety_stop"
    },
    {
      id: "5.2",
      key: "safetyDisconnect",
      fieldName: "safety_disconnect"
    },
    {
      id: "5.3",
      key: "safetyInstall",
      fieldName: "safety_install"
    },
    {
      id: "5.4",
      key: "safetyAir",
      fieldName: "safety_air"
    },
    {
      id: "5.5",
      key: "safetyFence",
      fieldName: "safety_fence"
    },
    {
      id: "5.6",
      key: "safetyHeight",
      fieldName: "safety_height"
    },
    {
      id: "5.7",
      key: "safetyWarn",
      fieldName: "safety_warn"
    },
    {
      id: "5.8",
      key: "safetyRoute",
      fieldName: "safety_route"
    },
    {
      id: "5.9",
      key: "safetyAdditional",
      fieldName: "safety_additional"
    }
  ];

  const SAFETY_DEFAULTS = {
    "5.2": "Отключить рубильник, задвижку, магистраль и другие источники питания",
    "5.5": "Оградить место работы, вывесить предупреждающие плакаты",
    "5.6": "Использовать предохранительные пояса и необходимые средства индивидуальной защиты (СИЗ)",
    "5.7": "Предупредить начальника цеха, бригадира, оператора и ответственного за цех",
    "5.8": "Не требуется"
  };

  const SAFETY_INSTALL_OPTIONS = [
    "Установить тупики",
    "Установить заглушки",
    "Установить табличку «Не включать»",
    "Установить сигнальные лампы"
  ];

  const SAFETY_DEFAULTS_KK = {
    "5.2": "Ажыратқышты, ысырманы, магистральды және басқа қуат көздерін ажырату",
    "5.5": "Жұмыс орнын қоршау, ескерту плакаттарын ілу",
    "5.6": "Сақтандыру белдіктерін және қажетті жеке қорғаныс құралдарын пайдалану",
    "5.7": "Цех бастығын, бригадирді, операторды және цехқа жауапты қызметкерді ескерту",
    "5.8": "Талап етілмейді"
  };

  const SAFETY_INSTALL_OPTIONS_KK = [
    "Тұйықтарды орнату",
    "Бітеуіштерді орнату",
    "«Қоспау» тақтайшасын орнату",
    "Сигнал шамдарын орнату"
  ];

  const SAFETY_INSTRUCTION_TITLES_KK = {
    general: "Қауіпсіздік техникасы жөніндегі нұсқаулық",
    fire: "Отты жұмыстар жөніндегі нұсқаулық",
    electric: "Электр қауіпсіздігі жөніндегі нұсқаулық",
    emergency: "Аварияларды оқшаулау және жою жоспары",
    por: "Жұмыстарды ұйымдастыру жобасы (ЖҰЖ)",
    height: "Биіктіктегі жұмыстар жөніндегі нұсқаулық",
    welding: "Дәнекерлеу жұмыстары жөніндегі нұсқаулық"
  };

  const SAFETY_INSTRUCTIONS = [
    { id: "general", title: "Инструкция по технике безопасности", source: "Трудовой кодекс РК и Правила оформления нарядов-допусков", url: "https://adilet.zan.kz/rus/docs/V2000021151", points: ["Выполнять только порученную работу", "Проверить рабочее место и защитные средства", "Остановить работу при возникновении опасности"] },
    { id: "fire", title: "Инструкция по огневым работам", source: "Правила пожарной безопасности Республики Казахстан", url: "https://adilet.zan.kz/rus/docs/V2100026867", points: ["Удалить или защитить горючие материалы", "Подготовить исправные средства пожаротушения", "После окончания проверить место проведения работ"] },
    { id: "electric", title: "Инструкция по электробезопасности", source: "Правила техники безопасности при эксплуатации электроустановок", url: "https://adilet.zan.kz/rus/docs/V1500010907", points: ["Отключить и исключить ошибочную подачу напряжения", "Проверить отсутствие напряжения и установить необходимые заземления", "Использовать испытанные защитные средства"] },
    { id: "emergency", title: "План локализации и ликвидации аварий", source: "Применяется утверждённый на предприятии ПЛА", url: "https://adilet.zan.kz/rus/docs/V1400010256", points: ["Знать сигналы аварии и пути эвакуации", "При аварии прекратить работу и сообщить ответственному", "Действовать только по утверждённому плану предприятия"] },
    { id: "por", title: "Проект организации работ (ПОР)", source: "Применяется утверждённый для конкретной работы ПОР", url: "https://adilet.zan.kz/rus/docs/V2000021151", points: ["Соблюдать указанную последовательность работ", "Применять предусмотренные ПОР механизмы и ограждения", "Не изменять технологию без согласования"] },
    { id: "height", title: "Инструкция по высотным работам", source: "Правила безопасности и охраны труда при работе на высоте", url: "https://adilet.zan.kz/rus/docs/V2200027349", points: ["Проверить допуск, состояние настилов и ограждений", "Использовать страховочную систему и каску", "Не выполнять работу при опасной погоде или недостаточной видимости"] },
    { id: "welding", title: "Инструкция по сварочным работам", source: "Требования пожарной и промышленной безопасности РК", url: "https://adilet.zan.kz/rus/docs/V1400010256", points: ["Проверить исправность сварочного оборудования", "Использовать щиток, спецодежду и защитные средства", "Не выполнять сварку рядом с незащищёнными горючими материалами"] }
  ];

  const OPTIONAL_SECTION_TITLE_KEYS = {
    leader: "leaderSection",
    completedMeasures: "completedMeasuresSection",
    approval: "approvalSection",
    brigade: "brigadeSection",
    breaks: "breaksSection",
    changes: "changesSection"
  };

  /*
   * ============================================================
   * 2. ТЕКСТЫ И ПЕРЕВОДЫ
   * ============================================================
   */

  const TEXT = {
    ru: {
      screenTitle: "Наряд-допуск",

      screenDescription:
        "Электронное оформление работ повышенной опасности",

      draftLocal:
        "Черновик автоматически сохраняется на этом устройстве",

      language: "Язык наряда",

      languageHint:
        "Выбранный язык применяется к форме и печати",

      russian: "Русский",
      kazakh: "Қазақша",

      companyName: DEFAULT_COMPANY_NAME,

      permitTitle: "Наряд-допуск",

      permitSubtitle:
        "на выполнение работ повышенной опасности",
      permitCode: "НД",

      permitNumber: "№ наряда-допуска",
      permitDate: "Дата выдачи",
      createdDateTime: "Дата и время создания",

      print: "Печать / PDF",
      clear: "Очистить форму",
      finishPermit: "Завершить работу",

      clearConfirm:
        "Очистить все заполненные данные наряда-допуска?",

      finishConfirm:
        "Завершить наряд-допуск и подготовить его к печати?",

      printNumberConfirm:
        "Сформировать документ? Будут присвоены новый общий номер, текущая дата и время.",

      saved: "Черновик сохранён",
      completed: "Наряд-допуск завершён",
      acknowledgedWith: "Ознакомился с:",

      selectEmployee: "Выберите сотрудника",
      employeeEntryMode: "Выберите сотрудника или ручной ввод",
      selectEquipment: "Выберите оборудование",
      selectWorkshop: "Выберите цех",
      selectPosition: "Выберите должность",

      manualInput: "Ввести вручную",
      notSelected: "Не выбрано",
      noData: "Нет данных",

      addSection: "Добавить раздел",
      addSelectedSections: "Добавить выбранные",
      close: "Закрыть",
      remove: "Убрать",
      collapse: "Свернуть",
      expand: "Развернуть",
      openSection: "Открыть раздел",
      closeSection: "Закрыть раздел",

      addRow: "Добавить строку",
      deleteRow: "Удалить строку",

      addLeader: "Добавить ответственного руководителя",
      addCompletedMeasure: "Добавить выполненное мероприятие",
      addApproval: "Добавить согласование",
      addBrigadeMember: "Добавить члена бригады",
      addBreak: "Добавить перерыв",
      addBrigadeChange: "Добавить изменение состава",

      optionalSections: "Дополнительные разделы",

      optionalSectionsHint:
        "Добавьте только те разделы, которые необходимы для этого наряда",

      optionalSection:
        "Добавляется при необходимости",

      removeSectionConfirm:
        "В разделе есть заполненные данные. Удалить раздел и очистить его?",

      removeRowConfirm:
        "Удалить эту строку и введённые в ней данные?",

      producerSection: "1. Производитель работ",

      assignedWorkSection:
        "2. Поручается выполнить",

      admitterSection:
        "3. Допускающий к работе",

      leaderSection:
        "4. Ответственный руководитель",

      safetySection:
        "5. Мероприятия для обеспечения безопасности работ",

      issuerSection:
        "6. Наряд-допуск выдал",

      completedMeasuresSection:
        "7. Мероприятия выполнены",

      approvalSection:
        "8. Согласовано",

      brigadeSection:
        "9. Допуск бригады к работе",

      brigadeStarted:
        "Бригада к работе приступила",

      breaksSection:
        "10. Оформление перерывов и возобновления работы",

      changesSection:
        "Изменения в составе бригады",

      finishSection:
        "Окончание работ",

      fullName: "ФИО",
      position: "Должность",
      organization: "Организация",
      signature: "Подпись",

      date: "Дата",
      time: "Время",
      dateTime: "Дата и время",

      equipment: "Оборудование",
      workshop: "Цех",
      workPlace: "Место выполнения работ",

      workScope:
        "Краткое содержание работ",

      safetyStop:
        "5.1 Остановить техническое устройство",

      safetyDisconnect:
        "5.2 Отключить рубильник, задвижку, магистраль и т. п.",

      safetyInstall:
        "5.3 Установить тупики, заглушки, сигнальные лампы и т. п.",

      safetyAir:
        "5.4 Выполнить анализ воздушной среды",

      safetyFence:
        "5.5 Оградить зону работ, установить плакаты",

      safetyHeight:
        "5.6 Работа на высоте или в колодцах",

      safetyWarn:
        "5.7 Предупредить персонал цеха",

      safetyRoute:
        "5.8 Указать маршруты следования",

      safetyAdditional:
        "5.9 Дополнительные мероприятия",

      safetyMeasureDetails:
        "Уточнение мероприятия",

      safetyChecked:
        "Мероприятие требуется",

      measureNumber:
        "№ мероприятия",

      completedBy:
        "Выполнил",

      approvalNumber: "№",

      briefingDateTime:
        "Дата и время инструктажа",

      teamMember:
        "Член бригады",

      profession:
        "Профессия / должность",

      memberSignature:
        "Подпись об ознакомлении",

      instructor:
        "Инструктаж провёл",

      workStartDate:
        "Дата начала",

      workStartTime:
        "Время начала",

      producerNameSignature:
        "Производитель работ",

      admitterNameSignature:
        "Допускающий",

      breakNumber: "№",

      breakDateTime:
        "Перерыв: дата и время",

      workplaceHandover:
        "Рабочее место сдал / принял",

      breakProducer:
        "Производитель работ",

      breakAdmitter:
        "Допускающий",

      resumeDateTime:
        "Возобновление: дата и время",

      resumeProducer:
        "Производитель работ",

      resumeAdmitter:
        "Допускающий",

      changeType:
        "Вид изменения",

      removedMembers:
        "Выведен из состава",

      addedMembers:
        "Введён в состав",

      changedMember:
        "Сотрудник",

      changeIssuer:
        "Изменение разрешил",

      changeDateTime:
        "Дата и время изменения",

      finishDate:
        "Дата окончания",

      finishTime:
        "Время окончания",

      workCompleted:
        "Работа выполнена",

      workplaceCleared:
        "Рабочее место убрано",

      permitReturned:
        "Наряд-допуск сдал",

      permitAccepted:
        "Наряд-допуск принял",

      checkboxYes: "Да",

      issuerAutoHint:
        "Автоматически подставляется текущий инженер",

      producerAutoHint:
        "Введите один раз — ФИО автоматически повторится в связанных разделах",

      admitterAutoHint:
        "Введите один раз — допускающий автоматически повторится в связанных разделах",

      blankOption: "Выберите"
    },

    kk: {
      screenTitle: "Жұмысқа рұқсат",

      screenDescription:
        "Қауіптілігі жоғары жұмыстарды электрондық рәсімдеу",

      draftLocal:
        "Жоба осы құрылғыда автоматты түрде сақталады",

      language: "Жұмысқа рұқсат тілі",

      languageHint:
        "Таңдалған тіл нысанға және басып шығаруға қолданылады",

      russian: "Русский",
      kazakh: "Қазақша",

      companyName:
        "«Aluminium of Kazakhstan» ЖШС",

      permitTitle:
        "Жұмысқа рұқсат",

      permitSubtitle:
        "қауіптілігі жоғары жұмыстарды орындауға",
      permitCode: "ЖР",

      permitNumber:
        "Жұмысқа рұқсат №",

      permitDate:
        "Берілген күні",

      createdDateTime:
        "Жасалған күні мен уақыты",

      print:
        "Басып шығару / PDF",

      clear:
        "Нысанды тазалау",

      finishPermit:
        "Жұмысты аяқтау",

      clearConfirm:
        "Жұмысқа рұқсаттағы барлық деректерді тазалау керек пе?",

      finishConfirm:
        "Жұмысқа рұқсатты аяқтап, басып шығаруға дайындау керек пе?",

      printNumberConfirm:
        "Құжатты қалыптастыру керек пе? Жаңа жалпы нөмір, ағымдағы күн мен уақыт беріледі.",

      saved:
        "Жоба сақталды",

      completed:
        "Жұмысқа рұқсат аяқталды",
      acknowledgedWith: "Таныстым:",

      selectEmployee:
        "Қызметкерді таңдаңыз",

      employeeEntryMode:
        "Қызметкерді таңдаңыз немесе қолмен енгізіңіз",

      selectEquipment:
        "Жабдықты таңдаңыз",

      selectWorkshop:
        "Цехты таңдаңыз",

      selectPosition:
        "Лауазымды таңдаңыз",

      manualInput:
        "Қолмен енгізу",

      notSelected:
        "Таңдалмаған",

      noData:
        "Деректер жоқ",

      addSection:
        "Бөлім қосу",

      addSelectedSections:
        "Таңдалған бөлімдерді қосу",

      close:
        "Жабу",

      remove:
        "Алып тастау",

      collapse:
        "Жинау",

      expand:
        "Ашу",

      openSection:
        "Бөлімді ашу",

      closeSection:
        "Бөлімді жабу",

      addRow:
        "Жол қосу",

      deleteRow:
        "Жолды жою",

      addLeader:
        "Жауапты басшыны қосу",

      addCompletedMeasure:
        "Орындалған шараны қосу",

      addApproval:
        "Келісуді қосу",

      addBrigadeMember:
        "Бригада мүшесін қосу",

      addBreak:
        "Үзіліс қосу",

      addBrigadeChange:
        "Құрам өзгерісін қосу",

      optionalSections:
        "Қосымша бөлімдер",

      optionalSectionsHint:
        "Осы жұмысқа рұқсат үшін қажетті бөлімдерді ғана қосыңыз",

      optionalSection:
        "Қажет болғанда қосылады",

      removeSectionConfirm:
        "Бөлімде толтырылған деректер бар. Бөлімді жойып, деректерді тазалау керек пе?",

      removeRowConfirm:
        "Осы жолды және енгізілген деректерді жою керек пе?",

      producerSection:
        "1. Жұмыс жүргізушісі",

      assignedWorkSection:
        "2. Орындауға тапсырылған жұмыс",

      admitterSection:
        "3. Жұмысқа жіберуші",

      leaderSection:
        "4. Жауапты басшы",

      safetySection:
        "5. Жұмыс қауіпсіздігін қамтамасыз ету шаралары",

      issuerSection:
        "6. Жұмысқа рұқсатты берген",

      completedMeasuresSection:
        "7. Қауіпсіздік шаралары орындалды",

      approvalSection:
        "8. Келісілді",

      brigadeSection:
        "9. Бригаданы жұмысқа жіберу",

      brigadeStarted:
        "Бригада жұмысқа кірісті",

      breaksSection:
        "10. Үзілістер мен жұмысты қайта бастауды рәсімдеу",

      changesSection:
        "Бригада құрамындағы өзгерістер",

      finishSection:
        "Жұмыстың аяқталуы",

      fullName: "Т.А.Ә.",
      position: "Лауазымы",
      organization: "Ұйымы",
      signature: "Қолы",

      date: "Күні",
      time: "Уақыты",
      dateTime: "Күні мен уақыты",

      equipment: "Жабдық",
      workshop: "Цех",

      workPlace:
        "Жұмыс орны",

      workScope:
        "Жұмыстың қысқаша мазмұны",

      safetyStop:
        "5.1 Техникалық құрылғыны тоқтату",

      safetyDisconnect:
        "5.2 Ажыратқышты, ысырманы, магистральды ажырату",

      safetyInstall:
        "5.3 Тіректерді, бітеуіштерді, дабыл шамдарын орнату",

      safetyAir:
        "5.4 Ауа ортасына талдау жүргізу",

      safetyFence:
        "5.5 Жұмыс аймағын қоршау, плакаттар орнату",

      safetyHeight:
        "5.6 Биіктікте немесе құдықтарда жұмыс",

      safetyWarn:
        "5.7 Цех персоналын ескерту",

      safetyRoute:
        "5.8 Жүру бағыттарын көрсету",

      safetyAdditional:
        "5.9 Қосымша шаралар",

      safetyMeasureDetails:
        "Шараны нақтылау",

      safetyChecked:
        "Шара қажет",

      measureNumber:
        "Шара №",

      completedBy:
        "Орындаған",

      approvalNumber: "№",

      briefingDateTime:
        "Нұсқама күні мен уақыты",

      teamMember:
        "Бригада мүшесі",

      profession:
        "Кәсібі / лауазымы",

      memberSignature:
        "Танысқаны туралы қолы",

      instructor:
        "Нұсқама өткізген",

      workStartDate:
        "Басталған күні",

      workStartTime:
        "Басталған уақыты",

      producerNameSignature:
        "Жұмыс жүргізушісі",

      admitterNameSignature:
        "Жұмысқа жіберуші",

      breakNumber: "№",

      breakDateTime:
        "Үзіліс: күні мен уақыты",

      workplaceHandover:
        "Жұмыс орнын тапсырды / қабылдады",

      breakProducer:
        "Жұмыс жүргізушісі",

      breakAdmitter:
        "Жұмысқа жіберуші",

      resumeDateTime:
        "Қайта бастау: күні мен уақыты",

      resumeProducer:
        "Жұмыс жүргізушісі",

      resumeAdmitter:
        "Жұмысқа жіберуші",

      changeType:
        "Өзгеріс түрі",

      removedMembers:
        "Құрамнан шығарылды",

      addedMembers:
        "Құрамға енгізілді",

      changedMember:
        "Қызметкер",

      changeIssuer:
        "Өзгеріске рұқсат берген",

      changeDateTime:
        "Өзгеріс күні мен уақыты",

      finishDate:
        "Аяқталған күні",

      finishTime:
        "Аяқталған уақыты",

      workCompleted:
        "Жұмыс орындалды",

      workplaceCleared:
        "Жұмыс орны тазаланды",

      permitReturned:
        "Жұмысқа рұқсатты тапсырған",

      permitAccepted:
        "Жұмысқа рұқсатты қабылдаған",

      checkboxYes:
        "Иә",

      issuerAutoHint:
        "Ағымдағы инженер автоматты түрде қойылады",

      producerAutoHint:
        "Қызметкерді таңдағаннан кейін лауазымы мен ұйымы автоматты түрде қойылады",

      admitterAutoHint:
        "Таңдалған жіберуші байланысты бөлімдерге автоматты түрде қойылады",

      blankOption:
        "Таңдаңыз"
    }
  };

  /*
   * ============================================================
   * 3. ТЕКУЩЕЕ СОСТОЯНИЕ НАРЯДА
   * ============================================================
   */

  let language = loadLanguage();
  let saveTimer = 0;
  let activeDraftOwnerKey = "";
  let sectionSelectorVisible = false;
  let instructionStoreIsAdmin = false;
  const instructionRecords = new Map();

  let activeOptionalSections = new Set(OPTIONAL_SECTION_IDS);
  let collapsedOptionalSections = new Set();

  const dynamicRows = {
    leaders: [],
    completedMeasures: [],
    approvals: [],
    brigade: [],
    breaks: [],
    changes: []
  };

  const permitState = {
    status: "draft",

    permitNumber: "",

    createdAt: "",

    completedAt: "",

    createdBy: null,

    producer: null,

    admitter: null,

    issuer: null,

    acceptedBy: null,

    selectedWorkshop: null,

    selectedEquipment: null
  };

  /*
   * ============================================================
   * 4. ОБЩИЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   * ============================================================
   */

  function loadLanguage() {
    try {
      return localStorage.getItem(LANGUAGE_KEY) === "kk"
        ? "kk"
        : "ru";
    } catch {
      return "ru";
    }
  }

  function text(key) {
    return TEXT[language]?.[key] || TEXT.ru[key] || key;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function generateId(prefix = "row") {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  function currentIsoDateTime() {
    return new Date().toISOString();
  }

  function localDateValue(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 10);
  }

  function localTimeValue(date = new Date()) {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  function localDateTimeValue(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
  }

  function formatDateTimeForPrint(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(
      language === "kk" ? "kk-KZ" : "ru-RU",
      {
        dateStyle: "short",
        timeStyle: "short"
      }
    );
  }

  function formatDateForPrint(value) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(
      language === "kk" ? "kk-KZ" : "ru-RU"
    );
  }

  /*
   * ============================================================
   * 5. ПОЛУЧЕНИЕ ДАННЫХ ИЗ ОСНОВНОГО ПРИЛОЖЕНИЯ
   * ============================================================
   */

  function getCurrentUser() {
    const candidates = [
      window.currentUser,
      window.appState?.currentUser,
      window.PPR?.currentUser,
      window.PprApp?.currentUser,
      window.authUser
    ];

    const user = candidates.find(
      candidate =>
        candidate &&
        typeof candidate === "object"
    );

    if (!user) {
      return {
        id: "",
        name: "",
        position: "",
        organization: DEFAULT_COMPANY_NAME
      };
    }

    return normalizeEmployee(user);
  }

  function draftOwnerKey() {
    const employee = getCurrentUser();
    const identity = [
      employee.id,
      employee.name
    ].filter(Boolean).join("|").toLowerCase() || "anonymous";
    let hash = 2166136261;
    for (let index = 0; index < identity.length; index += 1) {
      hash ^= identity.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${DRAFT_KEY_PREFIX}-${(hash >>> 0).toString(36)}`;
  }

  function resetRuntimeForDraftOwner() {
    activeOptionalSections = new Set(OPTIONAL_SECTION_IDS);
    collapsedOptionalSections.clear();
    Object.keys(dynamicRows).forEach(collection => {
      dynamicRows[collection] = [];
    });
    Object.assign(permitState, {
      status: "draft",
      permitNumber: "",
      createdAt: currentIsoDateTime(),
      completedAt: "",
      createdBy: getCurrentUser(),
      producer: null,
      admitter: null,
      issuer: getCurrentUser(),
      acceptedBy: null,
      selectedWorkshop: null,
      selectedEquipment: null
    });
    ensureInitialDynamicRows();
  }

  function getEmployees() {
    let storedUsers = [];
    try {
      const parsed = JSON.parse(localStorage.getItem("ppr-pwa-users-v1") || "[]");
      if (Array.isArray(parsed)) storedUsers = parsed;
    } catch {}

    const candidates = [
      window.employees,
      window.users,
      window.appState?.employees,
      window.appState?.users,
      window.PPR?.employees,
      window.PprApp?.employees,
      storedUsers
    ];

    const list = candidates.find(Array.isArray) || [];

    return list
      .map(normalizeEmployee)
      .filter(employee => employee.name);
  }

  function getEquipmentList() {
    const candidates = [
      window.equipment,
      window.appState?.equipment,
      window.PPR?.equipment,
      window.PprApp?.equipment
    ];

    const list = candidates.find(Array.isArray) || [];

    return list.map(item => ({
      id: String(
        item.id ??
        item._id ??
        item.code ??
        item.name ??
        ""
      ),

      name: String(
        item.name ??
        item.title ??
        item.equipmentName ??
        ""
      ),

      workshop: String(
        item.workshop ??
        item.department ??
        item.shop ??
        item.location ??
        ""
      )
    }));
  }

  function normalizeEmployee(source = {}) {
    const firstName =
      source.firstName ??
      source.first_name ??
      "";

    const lastName =
      source.lastName ??
      source.last_name ??
      "";

    const middleName =
      source.middleName ??
      source.middle_name ??
      "";

    const generatedName = [
      lastName,
      firstName,
      middleName
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      id: String(
        source.id ??
        source._id ??
        source.userId ??
        source.login ??
        source.employeeId ??
        source.phone ??
        ""
      ),

      name: String(
        source.fullName ??
        source.full_name ??
        source.name ??
        source.fio ??
        generatedName
      ).trim(),

      position: String(
        source.position ??
        source.jobTitle ??
        source.job_title ??
        source.roleName ??
        source.role ??
        ""
      ).trim(),

      organization: String(
        source.organization ??
        source.company ??
        source.companyName ??
        DEFAULT_COMPANY_NAME
      ).trim(),

      role: String(
        source.role ??
        source.roleName ??
        ""
      ).trim()
    };
  }

  /*
   * ============================================================
   * 6. АВТОМАТИЧЕСКИЙ НОМЕР НАРЯДА
   * ============================================================
   */

  function readLocalPermitNumber() {
    try {
      const value = Number(
        localStorage.getItem(LOCAL_NUMBER_KEY) || "0"
      );

      return Number.isFinite(value) && value >= 0
        ? value
        : 0;
    } catch {
      return 0;
    }
  }

  function formatPermitNumber(number) {
    return String(number).padStart(4, "0");
  }

  function getNextLocalPermitNumber() {
    const nextNumber = readLocalPermitNumber() + 1;

    return formatPermitNumber(nextNumber);
  }

  function confirmUsedPermitNumber(permitNumber) {
    const parsed = Number(permitNumber);

    if (!Number.isFinite(parsed)) return;

    try {
      const current = readLocalPermitNumber();

      if (parsed > current) {
        localStorage.setItem(
          LOCAL_NUMBER_KEY,
          String(parsed)
        );
      }
    } catch {}
  }

  /*
   * В будущем здесь можно сделать запрос:
   *
   * GET /api/work-permits/next-number
   *
   * Сервер должен выдавать уникальный номер из PostgreSQL.
   */

  function updatePermitPrintTimestamp() {
    const now = new Date();
    permitState.createdAt = now.toISOString();
    const values = {
      permit_date: localDateValue(now),
      created_at: localDateTimeValue(now),
      start_date: localDateValue(now),
      start_time: localTimeValue(now)
    };
    Object.entries(values).forEach(([name, value]) => {
      const control = screen.querySelector(`[name="${name}"]`);
      if (!control) return;
      control.value = value;
      syncPrintValue(control);
    });

    dynamicRows.brigade.forEach(row => {
      row.briefing = localDateTimeValue(now);
      const control = screen.querySelector(`[name="brigade_${CSS.escape(row.id)}_briefing"]`);
      if (!control) return;
      control.value = row.briefing;
      syncPrintValue(control);
    });
  }

  async function claimPermitNumber() {
    updatePermitPrintTimestamp();
    try {
      const response = await fetch(
        "/api/work-permits/claim-number",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        }
      );

      if (response.ok) {
        const result = await response.json();

        if (result?.number) {
          permitState.permitNumber = String(result.number);
          const control = screen.querySelector('[name="permit_number"]');
          if (control) {
            control.value = permitState.permitNumber;
            syncPrintValue(control);
          }
          saveDraft(false);
          return permitState.permitNumber;
        }
      }
    } catch {}

    permitState.permitNumber = getNextLocalPermitNumber();
    confirmUsedPermitNumber(permitState.permitNumber);
    const control = screen.querySelector('[name="permit_number"]');
    if (control) {
      control.value = permitState.permitNumber;
      syncPrintValue(control);
    }
    saveDraft(false);
    return permitState.permitNumber;
  }

  /*
   * ============================================================
   * 7. ШАБЛОНЫ HTML-ЭЛЕМЕНТОВ
   * ============================================================
   */

  function i18n(
    key,
    tag = "span",
    className = ""
  ) {
    return `
      <${tag}
        ${className ? `class="${className}"` : ""}
        data-work-permit-i18n="${key}">
        ${escapeHtml(text(key))}
      </${tag}>
    `;
  }

  function printMirror(name) {
    return `
      <span
        class="work-permit-print-value"
        data-work-permit-print-for="${escapeHtml(name)}"
        aria-hidden="true">
      </span>
    `;
  }

  function inputControl(
    name,
    labelKey,
    options = {}
  ) {
    const {
      type = "text",
      value = "",
      readonly = false,
      placeholder = ""
    } = options;

    return `
      <input
        name="${escapeHtml(name)}"
        type="${escapeHtml(type)}"
        value="${escapeHtml(value)}"
        ${readonly ? "readonly" : ""}
        placeholder="${escapeHtml(placeholder)}"
        autocomplete="off"
        data-work-permit-aria="${escapeHtml(labelKey)}"
        aria-label="${escapeHtml(text(labelKey))}">

      ${printMirror(name)}
    `;
  }

  function textareaControl(
    name,
    labelKey,
    options = {}
  ) {
    const {
      rows = 2,
      value = "",
      readonly = false,
      placeholder = ""
    } = options;

    return `
      <textarea
        name="${escapeHtml(name)}"
        rows="${rows}"
        ${readonly ? "readonly" : ""}
        placeholder="${escapeHtml(placeholder)}"
        data-work-permit-aria="${escapeHtml(labelKey)}"
        aria-label="${escapeHtml(text(labelKey))}">${escapeHtml(value)}</textarea>

      ${printMirror(name)}
    `;
  }

  function checkboxControl(
    name,
    labelKey,
    options = {}
  ) {
    const {
      checked = false,
      value = "1",
      className = ""
    } = options;

    return `
      <label class="work-permit-checkbox ${escapeHtml(className)}">
        <input
          name="${escapeHtml(name)}"
          type="checkbox"
          value="${escapeHtml(value)}"
          ${checked ? "checked" : ""}
          data-work-permit-aria="${escapeHtml(labelKey)}"
          aria-label="${escapeHtml(text(labelKey))}">

        <span class="work-permit-checkbox-mark">
          ✓
        </span>

        <span data-work-permit-i18n="${escapeHtml(labelKey)}">
          ${escapeHtml(text(labelKey))}
        </span>
      </label>

      ${printMirror(name)}
    `;
  }

  function employeeOptions(
    selectedId = "",
    includeBlank = true
  ) {
    const employees = getEmployees();

    const blankOption = includeBlank
      ? `
          <option value="">
            ${escapeHtml(text("selectEmployee"))}
          </option>
        `
      : "";

    const options = employees
      .map(employee => `
        <option
          value="${escapeHtml(employee.id)}"
          ${String(employee.id) === String(selectedId)
            ? "selected"
            : ""}>
          ${escapeHtml(employee.name)}
          ${employee.position
            ? ` — ${escapeHtml(employee.position)}`
            : ""}
        </option>
      `)
      .join("");

    return `
      ${blankOption}
      <option value="manual">
        ${escapeHtml(text("manualInput"))}
      </option>
      ${options}
    `;
  }

  function employeeSelect(
    name,
    labelKey,
    selectedId = ""
  ) {
    return `
      <select
        name="${escapeHtml(name)}"
        data-employee-select
        data-work-permit-aria="${escapeHtml(labelKey)}"
        aria-label="${escapeHtml(text(labelKey))}">

        ${employeeOptions(selectedId)}
      </select>

      ${printMirror(name)}
    `;
  }
    function field(
    name,
    labelKey,
    options = {}
  ) {
    const {
      type = "text",
      value = "",
      textarea = false,
      rows = 2,
      readonly = false,
      wide = false,
      placeholder = "",
      employee = false,
      selectedEmployeeId = "",
      hintKey = "",
      className = ""
    } = options;

    let control = "";

    if (employee) {
      control = employeeSelect(
        name,
        labelKey,
        selectedEmployeeId
      );
    } else if (textarea) {
      control = textareaControl(
        name,
        labelKey,
        {
          rows,
          value,
          readonly,
          placeholder
        }
      );
    } else {
      control = inputControl(
        name,
        labelKey,
        {
          type,
          value,
          readonly,
          placeholder
        }
      );
    }

    return `
      <label
        class="
          work-permit-field
          ${wide ? "work-permit-field-wide" : ""}
          ${escapeHtml(className)}
        ">

        ${i18n(labelKey)}

        ${control}

        ${
          hintKey
            ? `
              <small
                class="work-permit-field-hint"
                data-work-permit-i18n="${escapeHtml(hintKey)}">
                ${escapeHtml(text(hintKey))}
              </small>
            `
            : ""
        }
      </label>
    `;
  }

  function tableCell(
    content,
    labelKey,
    options = {}
  ) {
    const {
      className = "",
      colspan = 1
    } = options;
    const emptyClass = String(content ?? "").trim()
      ? ""
      : " work-permit-empty-cell";

    return `
      <td
        class="${escapeHtml(`${className}${emptyClass}`.trim())}"
        colspan="${colspan}"
        data-work-permit-label="${escapeHtml(labelKey)}"
        data-mobile-label="${escapeHtml(text(labelKey))}">
        ${content}
      </td>
    `;
  }

  function employeeFieldGroup(
    prefix,
    options = {}
  ) {
    const {
      includeOrganization = true,
      includeSignature = false,
      hintKey = "",
      selectedEmployeeId = ""
    } = options;

    return `
      <div
        class="work-permit-employee-group"
        data-employee-group="${escapeHtml(prefix)}">

        ${field(
          `${prefix}_name`,
          "fullName",
          {
            readonly: false,
            value: permitState[prefix]?.name || "",
            hintKey
          }
        )}

        ${field(
          `${prefix}_position`,
          "position",
          {
            readonly: false,
            value: permitState[prefix]?.position || ""
          }
        )}

        ${
          includeOrganization
            ? field(
                `${prefix}_organization`,
                "organization",
                {
                  readonly: false,
                  value: permitState[prefix]?.organization || DEFAULT_COMPANY_NAME
                }
              )
            : ""
        }

        ${
          includeSignature
            ? field(
                `${prefix}_signature`,
                "signature"
              )
            : ""
        }
      </div>
    `;
  }

  function getWorkshops() {
    const workshops = new Set();

    getEquipmentList().forEach(item => {
      if (item.workshop) {
        workshops.add(item.workshop);
      }
    });

    return [...workshops]
      .filter(Boolean)
      .sort((a, b) =>
        a.localeCompare(
          b,
          language === "kk"
            ? "kk"
            : "ru"
        )
      );
  }

  function workshopOptions(
    selectedWorkshop = ""
  ) {
    const workshops = getWorkshops();

    return `
      <option value="">
        ${escapeHtml(text("selectWorkshop"))}
      </option>

      <option value="manual">
        ${escapeHtml(text("manualInput"))}
      </option>

      ${workshops
        .map(workshop => `
          <option
            value="${escapeHtml(workshop)}"
            ${workshop === selectedWorkshop
              ? "selected"
              : ""}>
            ${escapeHtml(workshop)}
          </option>
        `)
        .join("")}

    `;
  }

  function workshopSelect(
    name,
    selectedWorkshop = ""
  ) {
    return `
      <select
        name="${escapeHtml(name)}"
        data-workshop-select
        data-work-permit-aria="workshop"
        aria-label="${escapeHtml(text("workshop"))}">

        ${workshopOptions(selectedWorkshop)}
      </select>

      ${printMirror(name)}
    `;
  }

  function equipmentOptions(
    selectedEquipmentId = "",
    selectedWorkshop = ""
  ) {
    const equipment = getEquipmentList()
      .filter(item => {
        if (!selectedWorkshop) return true;

        return item.workshop === selectedWorkshop;
      });

    return `
      <option value="">
        ${escapeHtml(text("selectEquipment"))}
      </option>

      <option value="manual">
        ${escapeHtml(text("manualInput"))}
      </option>

      ${equipment
        .map(item => `
          <option
            value="${escapeHtml(item.id)}"
            data-equipment-name="${escapeHtml(item.name)}"
            data-equipment-workshop="${escapeHtml(item.workshop)}"
            ${String(item.id) === String(selectedEquipmentId)
              ? "selected"
              : ""}>

            ${escapeHtml(item.name)}

            ${
              item.workshop
                ? ` — ${escapeHtml(item.workshop)}`
                : ""
            }
          </option>
        `)
        .join("")}

    `;
  }

  function equipmentSelect(
    name,
    selectedEquipmentId = "",
    selectedWorkshop = ""
  ) {
    return `
      <select
        name="${escapeHtml(name)}"
        data-equipment-select
        data-work-permit-aria="equipment"
        aria-label="${escapeHtml(text("equipment"))}">

        ${equipmentOptions(
          selectedEquipmentId,
          selectedWorkshop
        )}
      </select>

      ${printMirror(name)}
    `;
  }

  function workLocationBlock() {
    return `
      <div class="work-permit-grid work-permit-grid-two">
        ${field("workshop_manual", "workshop", { placeholder: text("manualInput") })}
        ${field("equipment_manual", "equipment", { placeholder: text("manualInput") })}

        ${field(
          "work_place",
          "workPlace",
          {
            wide: true
          }
        )}
      </div>
    `;
  }

  function safetyMeasureBlock(measure) {
    const checkboxName =
      `${measure.fieldName}_enabled`;

    return `
      <div
        class="work-permit-safety-item"
        data-safety-item="${escapeHtml(measure.id)}">

        <label class="work-permit-safety-check">
          <input
            type="checkbox"
            name="${escapeHtml(checkboxName)}"
            value="1"
            data-safety-toggle="${escapeHtml(measure.id)}">

          <span class="work-permit-checkbox-mark">
            ✓
          </span>

          <strong data-work-permit-i18n="${escapeHtml(measure.key)}">
            ${escapeHtml(text(measure.key))}
          </strong>
        </label>

        <div
          class="work-permit-safety-details"
          data-safety-details="${escapeHtml(measure.id)}"
          hidden>

          ${measure.id === "5.3"
            ? safetyInstallOptionsHtml(measure)
            : measure.id === "5.9"
              ? safetyInstructionsHtml(measure)
              : textareaControl(
                  measure.fieldName,
                  "safetyMeasureDetails",
                  { rows: 2, placeholder: safetyPlaceholder(measure.id) }
                )}
        </div>
      </div>
    `;
  }

  function safetyMeasuresHtml() {
    return SAFETY_MEASURES
      .map(safetyMeasureBlock)
      .join("");
  }

  function dynamicRowDeleteButton(
    collection,
    rowId,
    index = 0
  ) {
    if (index === 0) return "";

    return `
      <button
        type="button"
        class="work-permit-delete-row no-print"
        data-delete-dynamic-row="${escapeHtml(collection)}"
        data-row-id="${escapeHtml(rowId)}">

        ${escapeHtml(text("deleteRow"))}
      </button>
    `;
  }

  function addRowButton(
    collection,
    labelKey
  ) {
    return `
      <button
        type="button"
        class="work-permit-add-row no-print"
        data-add-dynamic-row="${escapeHtml(collection)}">

        ＋ ${escapeHtml(text(labelKey))}
      </button>
    `;
  }

  async function loadInstructionRecords() {
    try {
      const response = await fetch("/api/work-permit-instructions", {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return;
      const payload = await response.json();
      instructionStoreIsAdmin = payload?.isAdmin === true;
      instructionRecords.clear();
      (Array.isArray(payload?.records) ? payload.records : [])
        .forEach(record => instructionRecords.set(String(record.id), record));
    } catch {}
  }

  function instructionEditorKey(employee) {
    return String(employee?.id || employee?.employeeId || employee?.phone || "").trim();
  }

  function instructionEditorHtml(instruction) {
    const record = instructionRecords.get(instruction.id) || {};
    if (!record.canEdit && !instructionStoreIsAdmin) return "";
    const content = record.content || instruction.points.join("\n");
    const editorIds = new Set(Array.isArray(record.editorIds) ? record.editorIds : []);
    return `
      <section class="work-permit-instruction-editor no-print" data-instruction-editor="${escapeHtml(instruction.id)}">
        <h4>Редактирование инструкции</h4>
        <label>Полный текст инструкции
          <textarea rows="10" data-instruction-content>${escapeHtml(content)}</textarea>
        </label>
        <label class="work-permit-word-upload">Загрузить Word (.docx)
          <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-instruction-word>
        </label>
        <small data-instruction-file-name>${record.fileName ? `Загружен: ${escapeHtml(record.fileName)}` : "Можно написать текст или загрузить Word-документ"}</small>
        ${instructionStoreIsAdmin ? `
          <details class="work-permit-instruction-permissions">
            <summary>Кому разрешено редактировать</summary>
            <div>
              ${getEmployees().map(employee => {
                const key = instructionEditorKey(employee);
                return key ? `<label><input type="checkbox" data-instruction-editor-id value="${escapeHtml(key)}" ${editorIds.has(key) ? "checked" : ""}> ${escapeHtml(employee.name)}${employee.position ? ` — ${escapeHtml(employee.position)}` : ""}</label>` : "";
              }).join("")}
            </div>
          </details>
        ` : ""}
        <button type="button" data-save-instruction="${escapeHtml(instruction.id)}">Сохранить инструкцию</button>
        <span data-instruction-save-status></span>
      </section>
    `;
  }

  function instructionDisplayContent(instruction) {
    const record = instructionRecords.get(instruction.id);
    const content = String(record?.content || "").trim();
    if (!content) {
      return `<ul>${instruction.points.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ul>`;
    }
    return `<div class="work-permit-instruction-full-text">${escapeHtml(content).replace(/\n/g, "<br>")}</div>`;
  }

  function safetyPlaceholder(measureId) {
    if (measureId === "5.1") return "Оборудование из раздела 2";
    if (measureId === "5.4") return "Место проведения анализа воздушной среды";
    return "Автоматическое мероприятие — при необходимости отредактируйте";
  }

  function safetyInstallOptionsHtml(measure) {
    return `
      <div class="work-permit-safety-options">
        ${SAFETY_INSTALL_OPTIONS.map((option, index) => `
          <label>
            <input type="checkbox" name="safety_install_option_${index}" data-safety-install-option="${index}" value="${escapeHtml(option)}">
            <span data-safety-install-label="${index}">${escapeHtml(option)}</span>
          </label>
        `).join("")}
      </div>
      <div class="work-permit-generated-safety-value">
        ${textareaControl(measure.fieldName, "safetyMeasureDetails", { rows: 2, readonly: true })}
      </div>
    `;
  }

  function safetyInstructionsHtml(measure) {
    return `
      <div class="work-permit-instruction-list">
        ${SAFETY_INSTRUCTIONS.map(instruction => `
          <article class="work-permit-instruction-card" data-instruction-card="${escapeHtml(instruction.id)}">
            <label class="work-permit-instruction-select">
              <input type="checkbox" name="instruction_${escapeHtml(instruction.id)}" data-instruction-toggle="${escapeHtml(instruction.id)}">
              <strong data-instruction-title="${escapeHtml(instruction.id)}">${escapeHtml(instruction.title)}</strong>
            </label>
            <details>
              <summary>Открыть инструкцию</summary>
              <p>${escapeHtml(instruction.source)}</p>
              ${instructionDisplayContent(instruction)}
              <p><a href="${escapeHtml(instruction.url)}" target="_blank" rel="noopener">Официальный источник Республики Казахстан</a></p>
              <button type="button" data-instruction-ack="${escapeHtml(instruction.id)}">Прочитал и ознакомился</button>
              ${instructionEditorHtml(instruction)}
            </details>
          </article>
        `).join("")}
      </div>
      ${textareaControl(measure.fieldName, "safetyMeasureDetails", { rows: 4, readonly: true })}
      <small>В наряд попадут только выбранные и подтверждённые инструкции.</small>
    `;
  }

  function dynamicEmployeeEntry(prefix, row, labelKey, valueKey = "name") {
    return inputControl(
      `${prefix}_${valueKey}`,
      labelKey,
      { value: row[valueKey] || "" }
    );
  }

  function leaderRowHtml(
    row,
    index
  ) {
    const prefix =
      `leader_${row.id}`;

    return `
      <tr
        data-dynamic-row="leaders"
        data-row-id="${escapeHtml(row.id)}">

        <th scope="row">
          ${index + 1}
        </th>

        ${tableCell(dynamicEmployeeEntry(prefix, row, "fullName"), "fullName")}

        ${tableCell(
          inputControl(
            `${prefix}_position`,
            "position",
            {
              value: row.position || ""
            }
          ),
          "position"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_signature`,
            "signature",
            {
              value: row.signature || ""
            }
          ),
          "signature"
        )}

        ${tableCell(
          dynamicRowDeleteButton(
            "leaders",
            row.id,
            index
          ),
          "deleteRow",
          {
            className:
              "work-permit-row-actions no-print"
          }
        )}
      </tr>
    `;
  }

  function completedMeasureOptions(
    selectedValue = ""
  ) {
    const selectedMeasures =
      SAFETY_MEASURES.filter(measure => {
        const checkbox = screen.querySelector(
          `[name="${measure.fieldName}_enabled"]`
        );

        return checkbox?.checked;
      });

    const source =
      selectedMeasures.length
        ? selectedMeasures
        : SAFETY_MEASURES;

    return `
      <option value="">
        ${escapeHtml(text("blankOption"))}
      </option>

      ${source
        .map(measure => `
          <option
            value="${escapeHtml(measure.id)}"
            ${measure.id === selectedValue
              ? "selected"
              : ""}>
            ${escapeHtml(measure.id)}
          </option>
        `)
        .join("")}
    `;
  }

  function completedMeasureRowHtml(
    row,
    index
  ) {
    const prefix =
      `completed_${row.id}`;

    return `
      <tr
        data-dynamic-row="completedMeasures"
        data-row-id="${escapeHtml(row.id)}">

        <th scope="row">
          ${index + 1}
        </th>

        ${tableCell(
          `
            <select
              name="${escapeHtml(`${prefix}_number`)}"
              data-completed-measure-select
              data-work-permit-aria="measureNumber"
              aria-label="${escapeHtml(text("measureNumber"))}">

              ${completedMeasureOptions(
                row.number || ""
              )}
            </select>

            ${printMirror(`${prefix}_number`)}
          `,
          "measureNumber"
        )}

        ${tableCell(
          employeeSelect(
            `${prefix}_employee_id`,
            row.employeeId || ""
          ),
          "completedBy"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_name`,
            "completedBy",
            {
              value: row.name || ""
            }
          ),
          "completedBy"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_position`,
            "position",
            {
              value: row.position || ""
            }
          ),
          "position"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_signature`,
            "signature",
            {
              value: row.signature || ""
            }
          ),
          "signature"
        )}

        ${tableCell(
          dynamicRowDeleteButton(
            "completedMeasures",
            row.id,
            index
          ),
          "deleteRow",
          {
            className:
              "work-permit-row-actions no-print"
          }
        )}
      </tr>
    `;
  }

  function approvalRowHtml(
    row,
    index
  ) {
    const prefix =
      `approval_${row.id}`;

    return `
      <tr
        data-dynamic-row="approvals"
        data-row-id="${escapeHtml(row.id)}">

        <th scope="row">
          ${index + 1}
        </th>

        ${tableCell(
          inputControl(
            `${prefix}_position`,
            "position",
            {
              value: row.position || ""
            }
          ),
          "position"
        )}

        ${tableCell(dynamicEmployeeEntry(prefix, row, "fullName"), "fullName")}

        ${tableCell(
          inputControl(
            `${prefix}_signature`,
            "signature",
            {
              value: row.signature || ""
            }
          ),
          "signature"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_date`,
            "date",
            {
              type: "date",
              value: row.date || ""
            }
          ),
          "date"
        )}

        ${tableCell(
          dynamicRowDeleteButton(
            "approvals",
            row.id,
            index
          ),
          "deleteRow",
          {
            className:
              "work-permit-row-actions no-print"
          }
        )}
      </tr>
    `;
  }

  function brigadeRowHtml(
    row,
    index
  ) {
    const prefix =
      `brigade_${row.id}`;

    return `
      <tr
        data-dynamic-row="brigade"
        data-row-id="${escapeHtml(row.id)}">

        <th scope="row">
          ${index + 1}
        </th>

        ${tableCell(
          inputControl(
            `${prefix}_briefing`,
            "briefingDateTime",
            {
              type: "datetime-local",
              value: row.briefing || ""
            }
          ),
          "briefingDateTime"
        )}

        ${tableCell(dynamicEmployeeEntry(prefix, row, "teamMember"), "teamMember")}

        ${tableCell(
          inputControl(
            `${prefix}_profession`,
            "profession",
            {
              value: row.profession || ""
            }
          ),
          "profession"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_signature`,
            "memberSignature",
            {
              value: row.signature || ""
            }
          ),
          "memberSignature"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_instructor`,
            "instructor",
            {
              value: row.instructor || "",
              readonly: true
            }
          ),
          "instructor"
        )}

        ${tableCell(
          dynamicRowDeleteButton(
            "brigade",
            row.id,
            index
          ),
          "deleteRow",
          {
            className:
              "work-permit-row-actions no-print"
          }
        )}
      </tr>
    `;
  }

  function breakRowHtml(
    row,
    index
  ) {
    const prefix =
      `break_${row.id}`;

    return `
      <tr
        data-dynamic-row="breaks"
        data-row-id="${escapeHtml(row.id)}">

        <th scope="row">
          ${index + 1}
        </th>

        ${tableCell(
          inputControl(
            `${prefix}_start`,
            "breakDateTime",
            {
              type: "datetime-local",
              value: row.start || ""
            }
          ),
          "breakDateTime"
        )}

        ${tableCell(
          textareaControl(
            `${prefix}_workplace`,
            "workplaceHandover",
            {
              rows: 2,
              value: row.workplace || ""
            }
          ),
          "workplaceHandover"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_producer`,
            "breakProducer",
            {
              value: row.producer || "",
              readonly: true
            }
          ),
          "breakProducer"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_admitter`,
            "breakAdmitter",
            {
              value: row.admitter || "",
              readonly: true
            }
          ),
          "breakAdmitter"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_resume`,
            "resumeDateTime",
            {
              type: "datetime-local",
              value: row.resume || ""
            }
          ),
          "resumeDateTime"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_resume_producer`,
            "resumeProducer",
            {
              value: row.resumeProducer || "",
              readonly: true
            }
          ),
          "resumeProducer"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_resume_admitter`,
            "resumeAdmitter",
            {
              value: row.resumeAdmitter || "",
              readonly: true
            }
          ),
          "resumeAdmitter"
        )}

        ${tableCell(
          dynamicRowDeleteButton(
            "breaks",
            row.id,
            index
          ),
          "deleteRow",
          {
            className:
              "work-permit-row-actions no-print"
          }
        )}
      </tr>
    `;
  }

  function changeRowHtml(
    row,
    index
  ) {
    const prefix =
      `change_${row.id}`;

    return `
      <tr
        data-dynamic-row="changes"
        data-row-id="${escapeHtml(row.id)}">

        <th scope="row">
          ${index + 1}
        </th>

        ${tableCell(
          inputControl(
            `${prefix}_type`,
            "changeType",
            { value: row.type || "" }
          ),
          "changeType"
        )}

        ${tableCell(dynamicEmployeeEntry(prefix, row, "changedMember", "member"), "changedMember")}

        ${tableCell(
          inputControl(
            `${prefix}_issuer`,
            "changeIssuer",
            {
              value: row.issuer || "",
              readonly: true
            }
          ),
          "changeIssuer"
        )}

        ${tableCell(
          inputControl(
            `${prefix}_date`,
            "changeDateTime",
            {
              type: "datetime-local",
              value: row.date || ""
            }
          ),
          "changeDateTime"
        )}

        ${tableCell(
          dynamicRowDeleteButton(
            "changes",
            row.id,
            index
          ),
          "deleteRow",
          {
            className:
              "work-permit-row-actions no-print"
          }
        )}
      </tr>
    `;
  }

  function renderDynamicRows(
    collection
  ) {
    const container = screen.querySelector(
      `[data-dynamic-rows-container="${collection}"]`
    );

    if (!container) return;

    const rendererMap = {
      leaders: leaderRowHtml,
      completedMeasures: completedMeasureRowHtml,
      approvals: approvalRowHtml,
      brigade: brigadeRowHtml,
      breaks: breakRowHtml,
      changes: changeRowHtml
    };

    const renderer =
      rendererMap[collection];

    if (!renderer) return;

    container.innerHTML =
      dynamicRows[collection]
        .map((row, index) =>
          renderer(row, index)
        )
        .join("");

    syncAllPrintValues();
    updateEmployeeEntryModes();
    growAllTextareas();
  }

  function createEmptyDynamicRow(
    collection
  ) {
    const base = {
      id: generateId(collection)
    };

    if (collection === "leaders") {
      return {
        ...base,
        employeeId: "",
        name: "",
        position: "",
        signature: ""
      };
    }

    if (collection === "completedMeasures") {
      return {
        ...base,
        number: "",
        employeeId: "",
        name: "",
        position: "",
        signature: ""
      };
    }

    if (collection === "approvals") {
      return {
        ...base,
        employeeId: "",
        position: "",
        name: "",
        signature: "",
        date: localDateValue()
      };
    }

    if (collection === "brigade") {
      return {
        ...base,
        briefing: localDateTimeValue(),
        employeeId: "",
        name: "",
        profession: "",
        signature: "",
        instructor:
          permitState.admitter?.name || ""
      };
    }

    if (collection === "breaks") {
      return {
        ...base,
        start: "",
        workplace: "",
        producer:
          permitState.producer?.name || "",
        admitter:
          permitState.admitter?.name || "",
        resume: "",
        resumeProducer:
          permitState.producer?.name || "",
        resumeAdmitter:
          permitState.admitter?.name || ""
      };
    }

    if (collection === "changes") {
      return {
        ...base,
        type: "",
        employeeId: "",
        member: "",
        issuer:
          permitState.issuer?.name || "",
        date: ""
      };
    }

    return base;
  }

  function ensureInitialDynamicRows() {
    Object.keys(dynamicRows)
      .forEach(collection => {
        if (collection === "completedMeasures") return;
        if (!dynamicRows[collection].length) {
          dynamicRows[collection].push(
            createEmptyDynamicRow(collection)
          );
        }
      });
  }
    /*
   * ============================================================
   * 8. ДОБАВЛЕНИЕ И УДАЛЕНИЕ ДИНАМИЧЕСКИХ СТРОК
   * ============================================================
   */

  function addDynamicRow(collection) {
    if (!dynamicRows[collection]) return;

    dynamicRows[collection].push(
      createEmptyDynamicRow(collection)
    );

    renderDynamicRows(collection);
    saveDraft(true);
  }

  function removeDynamicRow(
    collection,
    rowId
  ) {
    if (!dynamicRows[collection]) return;

    if (dynamicRows[collection][0]?.id === rowId) return;

    const row = dynamicRows[collection]
      .find(item => item.id === rowId);

    if (!row) return;

    const containsData = Object.entries(row)
      .some(([key, value]) => {
        if (key === "id") return false;

        return String(value ?? "")
          .trim() !== "";
      });

    if (
      containsData &&
      !window.confirm(
        text("removeRowConfirm")
      )
    ) {
      return;
    }

    dynamicRows[collection] =
      dynamicRows[collection]
        .filter(item => item.id !== rowId);

    if (!dynamicRows[collection].length) {
      dynamicRows[collection].push(
        createEmptyDynamicRow(collection)
      );
    }

    renderDynamicRows(collection);
    saveDraft(true);
  }

  function updateDynamicRowValue(
    collection,
    rowId,
    fieldName,
    value
  ) {
    const row = dynamicRows[collection]
      ?.find(item => item.id === rowId);

    if (!row) return;

    row[fieldName] = value;
  }

  function findDynamicRowContext(
    control
  ) {
    const rowElement = control.closest(
      "[data-dynamic-row]"
    );

    if (!rowElement) return null;

    return {
      collection:
        rowElement.dataset.dynamicRow,

      rowId:
        rowElement.dataset.rowId
    };
  }

  function dynamicFieldKey(
    controlName,
    collection,
    rowId
  ) {
    if (!controlName) return "";

    const prefixes = {
      leaders: `leader_${rowId}_`,
      completedMeasures:
        `completed_${rowId}_`,
      approvals:
        `approval_${rowId}_`,
      brigade:
        `brigade_${rowId}_`,
      breaks:
        `break_${rowId}_`,
      changes:
        `change_${rowId}_`
    };

    const prefix =
      prefixes[collection] || "";

    if (
      prefix &&
      controlName.startsWith(prefix)
    ) {
      return controlName.slice(
        prefix.length
      );
    }

    return "";
  }

  /*
   * ============================================================
   * 9. АВТОМАТИЧЕСКАЯ ПОДСТАНОВКА СОТРУДНИКОВ
   * ============================================================
   */

  function findEmployeeById(employeeId) {
    return getEmployees().find(
      employee =>
        String(employee.id) ===
        String(employeeId)
    ) || null;
  }

  function setControlValue(
    name,
    value,
    options = {}
  ) {
    const {
      dispatch = false
    } = options;

    const control = screen.querySelector(
      `[name="${CSS.escape(name)}"]`
    );

    if (!control) return;

    control.value =
      value == null
        ? ""
        : String(value);

    syncPrintValue(control);

    if (
      control.tagName === "TEXTAREA"
    ) {
      growTextarea(control);
    }

    if (dispatch) {
      control.dispatchEvent(
        new Event("change", {
          bubbles: true
        })
      );
    }
  }

  function fillEmployeeFields(
    prefix,
    employee
  ) {
    if (!employee) return;

    setControlValue(
      `${prefix}_name`,
      employee.name
    );

    setControlValue(
      `${prefix}_position`,
      employee.position
    );

    setControlValue(
      `${prefix}_organization`,
      employee.organization
    );
  }

  function fillDynamicEmployeeFields(
    collection,
    rowId,
    employee
  ) {
    if (!employee) return;

    const row =
      dynamicRows[collection]
        ?.find(item => item.id === rowId);

    if (!row) return;

    if (collection === "leaders") {
      row.employeeId = employee.id;
      row.name = employee.name;
      row.position = employee.position;

      setControlValue(
        `leader_${rowId}_name`,
        employee.name
      );

      setControlValue(
        `leader_${rowId}_position`,
        employee.position
      );
    }

    if (
      collection ===
      "completedMeasures"
    ) {
      row.employeeId = employee.id;
      row.name = employee.name;
      row.position = employee.position;

      setControlValue(
        `completed_${rowId}_name`,
        employee.name
      );

      setControlValue(
        `completed_${rowId}_position`,
        employee.position
      );
    }

    if (collection === "approvals") {
      row.employeeId = employee.id;
      row.name = employee.name;

      if (!row.position) {
        row.position =
          employee.position;
      }

      setControlValue(
        `approval_${rowId}_name`,
        employee.name
      );

      if (
        !screen.querySelector(
          `[name="approval_${rowId}_position"]`
        )?.value
      ) {
        setControlValue(
          `approval_${rowId}_position`,
          employee.position
        );
      }
    }

    if (collection === "brigade") {
      row.employeeId = employee.id;
      row.name = employee.name;
      row.profession =
        employee.position;

      setControlValue(
        `brigade_${rowId}_name`,
        employee.name
      );

      setControlValue(
        `brigade_${rowId}_profession`,
        employee.position
      );
    }

    if (collection === "changes") {
      row.employeeId = employee.id;
      row.member = employee.name;

      setControlValue(
        `change_${rowId}_member`,
        employee.name
      );
    }
  }

  function updateRelatedProducerFields() {
    const name =
      permitState.producer?.name || "";
    const position =
      permitState.producer?.position || "";

    setControlValue(
      "completed_by_name",
      name
    );

    setControlValue(
      "completed_by_position",
      position
    );

    const primaryBrigadeMember =
      dynamicRows.brigade[0];

    if (primaryBrigadeMember) {
      primaryBrigadeMember.employeeId =
        permitState.producer?.id || "manual";
      primaryBrigadeMember.name = name;
      primaryBrigadeMember.profession = position;

      setControlValue(
        `brigade_${primaryBrigadeMember.id}_name`,
        name
      );

      setControlValue(
        `brigade_${primaryBrigadeMember.id}_profession`,
        position
      );
    }

    setControlValue(
      "start_producer",
      name
    );

    setControlValue(
      "permit_returned",
      name
    );

    dynamicRows.breaks.forEach(row => {
      row.producer = name;
      row.resumeProducer = name;

      setControlValue(
        `break_${row.id}_producer`,
        name
      );

      setControlValue(
        `break_${row.id}_resume_producer`,
        name
      );
    });
  }

  function updateRelatedAdmitterFields() {
    const name =
      permitState.admitter?.name || "";

    setControlValue(
      "start_admitter",
      name
    );

    dynamicRows.breaks.forEach(row => {
      row.admitter = name;
      row.resumeAdmitter = name;

      setControlValue(
        `break_${row.id}_admitter`,
        name
      );

      setControlValue(
        `break_${row.id}_resume_admitter`,
        name
      );
    });

    dynamicRows.brigade.forEach(row => {
      row.instructor = name;
      setControlValue(
        `brigade_${row.id}_instructor`,
        name
      );
    });
  }

  function updateRelatedIssuerFields() {
    const name =
      permitState.issuer?.name || "";

    dynamicRows.changes.forEach(row => {
      row.issuer = name;
      setControlValue(
        `change_${row.id}_issuer`,
        name
      );
    });

    if (!permitState.acceptedBy) {
      setControlValue(
        "permit_accepted",
        name
      );
    }
  }

  function manualEmployeeFromGroup(prefix) {
    const name = screen.querySelector(
      `[name="${CSS.escape(`${prefix}_name`)}"]`
    )?.value?.trim() || "";
    const position = screen.querySelector(
      `[name="${CSS.escape(`${prefix}_position`)}"]`
    )?.value?.trim() || "";
    const organization = screen.querySelector(
      `[name="${CSS.escape(`${prefix}_organization`)}"]`
    )?.value?.trim() || "";

    return {
      id: "manual",
      name,
      position,
      organization
    };
  }

  function syncManualEmployeeInput(control) {
    const match = control?.name?.match(
      /^(producer|admitter|issuer)_(name|position|organization)$/
    );
    if (!match) return;

    const prefix = match[1];
    const employee = manualEmployeeFromGroup(prefix);
    permitState[prefix] = employee;

    if (prefix === "producer") {
      updateRelatedProducerFields();
    } else if (prefix === "admitter") {
      updateRelatedAdmitterFields();
    } else if (prefix === "issuer") {
      updateRelatedIssuerFields();
    }
  }

  function handleEmployeeSelection(
    select
  ) {
    const employeeId =
      select.value;

    const employeeGroup = select.closest(
      "[data-employee-group]"
    );
    employeeGroup?.classList.toggle(
      "is-manual",
      employeeId === "manual"
    );

    if (!employeeId) return;

    if (employeeId === "manual") {
      const container =
        select.closest("[data-dynamic-row]") ||
        select.closest("[data-employee-group]") ||
        select.closest(".work-permit-grid") ||
        select.parentElement?.parentElement;
      const manualInput = container?.querySelector(
        'input[name$="_name"], input[name$="_member"], input[type="text"]'
      );
      manualInput?.removeAttribute("readonly");
      manualInput?.focus();
      manualInput?.scrollIntoView({ behavior: "smooth", block: "center" });

      const prefix = select.name.match(
        /^(producer|admitter|issuer)_employee_id$/
      )?.[1];
      if (prefix) {
        permitState[prefix] = manualEmployeeFromGroup(prefix);
        if (prefix === "producer") updateRelatedProducerFields();
        if (prefix === "admitter") updateRelatedAdmitterFields();
        if (prefix === "issuer") updateRelatedIssuerFields();
      }

      saveDraft(false);
      return;
    }

    const employee =
      findEmployeeById(employeeId);

    if (!employee) return;

    const dynamicContext =
      findDynamicRowContext(select);

    if (dynamicContext) {
      fillDynamicEmployeeFields(
        dynamicContext.collection,
        dynamicContext.rowId,
        employee
      );

      const key =
        dynamicFieldKey(
          select.name,
          dynamicContext.collection,
          dynamicContext.rowId
        );

      if (key === "employee_id") {
        updateDynamicRowValue(
          dynamicContext.collection,
          dynamicContext.rowId,
          "employeeId",
          employee.id
        );
      }

      saveDraft(false);
      return;
    }

    if (
      select.name ===
      "producer_employee_id"
    ) {
      permitState.producer =
        employee;

      fillEmployeeFields(
        "producer",
        employee
      );

      updateRelatedProducerFields();
    }

    if (
      select.name ===
      "admitter_employee_id"
    ) {
      permitState.admitter =
        employee;

      fillEmployeeFields(
        "admitter",
        employee
      );

      updateRelatedAdmitterFields();
    }

    if (
      select.name ===
      "issuer_employee_id"
    ) {
      permitState.issuer =
        employee;

      fillEmployeeFields(
        "issuer",
        employee
      );

      updateRelatedIssuerFields();
    }

    if (
      select.name ===
      "completed_by_employee_id"
    ) {
      fillEmployeeFields(
        "completed_by",
        employee
      );
    }

    if (
      select.name ===
      "accepted_employee_id"
    ) {
      permitState.acceptedBy =
        employee;

      setControlValue(
        "permit_accepted",
        employee.name
      );
    }

    saveDraft(false);
  }

  /*
   * ============================================================
   * 10. ВЫБОР ЦЕХА И ОБОРУДОВАНИЯ
   * ============================================================
   */

  function refreshEquipmentOptions(
    selectedWorkshop
  ) {
    const equipmentSelectElement =
      screen.querySelector(
        "[data-equipment-select]"
      );

    if (!equipmentSelectElement) return;

    const currentValue =
      equipmentSelectElement.value;

    equipmentSelectElement.innerHTML =
      equipmentOptions(
        currentValue,
        selectedWorkshop
      );

    syncPrintValue(
      equipmentSelectElement
    );
  }

  function handleWorkshopSelection(
    select
  ) {
    const value = select.value;
    select.closest("[data-location-entry]")
      ?.classList.toggle("is-manual", value === "manual");

    if (!value) {
      permitState.selectedWorkshop =
        null;

      refreshEquipmentOptions("");
      return;
    }

    if (value === "manual") {
      permitState.selectedWorkshop =
        null;

      const manual =
        screen.querySelector(
          '[name="workshop_manual"]'
        );

      manual?.focus();
      return;
    }

    permitState.selectedWorkshop = {
      name: value
    };

    refreshEquipmentOptions(value);
    saveDraft(false);
  }

  function handleEquipmentSelection(
    select
  ) {
    const value = select.value;
    select.closest("[data-location-entry]")
      ?.classList.toggle("is-manual", value === "manual");

    if (!value) {
      permitState.selectedEquipment =
        null;

      return;
    }

    if (value === "manual") {
      permitState.selectedEquipment =
        null;

      const manual =
        screen.querySelector(
          '[name="equipment_manual"]'
        );

      manual?.focus();
      return;
    }

    const selectedOption =
      select.selectedOptions[0];

    const equipment = {
      id: value,

      name:
        selectedOption
          ?.dataset
          ?.equipmentName || "",

      workshop:
        selectedOption
          ?.dataset
          ?.equipmentWorkshop || ""
    };

    permitState.selectedEquipment =
      equipment;

    if (
      equipment.workshop &&
      !permitState.selectedWorkshop
    ) {
      permitState.selectedWorkshop = {
        name: equipment.workshop
      };

      setControlValue(
        "workshop_id",
        equipment.workshop
      );
    }

    saveDraft(false);
  }

  /*
   * ============================================================
   * 11. ДОПОЛНИТЕЛЬНЫЕ РАЗДЕЛЫ
   * ============================================================
   */

  function optionalSectionTitle(
    sectionId
  ) {
    const key =
      OPTIONAL_SECTION_TITLE_KEYS[
        sectionId
      ];

    return text(key || sectionId);
  }

  function optionalSectionToolbar(
    sectionId
  ) {
    return `
      <div
        class="work-permit-optional-toolbar no-print">

        <strong
          class="work-permit-optional-label">
          ${escapeHtml(optionalSectionTitle(sectionId))}
        </strong>

        <div class="work-permit-optional-actions">
          <button
            type="button"
            data-collapse-section="${escapeHtml(sectionId)}">

            ${escapeHtml(text("closeSection"))}
          </button>
        </div>
      </div>
    `;
  }

  function sectionSelectorHtml() {
    // The complete permit structure is always present on screen.
    return "";
    /* legacy section picker
    return `
      <section
        class="work-permit-section-constructor no-print">

        <div class="work-permit-constructor-heading">
          <div>
            ${i18n(
              "optionalSections",
              "h2"
            )}

            ${i18n(
              "optionalSectionsHint",
              "p"
            )}
          </div>

          <button
            id="workPermitOpenSectionSelector"
            type="button">

            ＋ ${escapeHtml(text("addSection"))}
          </button>
        </div>

        <div
          id="workPermitSectionSelector"
          class="work-permit-section-selector"
          hidden>

          <div class="work-permit-section-options">
            ${OPTIONAL_SECTION_IDS
              .map(sectionId => `
                <label>
                  <input
                    type="checkbox"
                    value="${escapeHtml(sectionId)}"
                    data-optional-section-checkbox>

                  <span
                    data-optional-section-title="${escapeHtml(sectionId)}">
                    ${escapeHtml(
                      optionalSectionTitle(
                        sectionId
                      )
                    )}
                  </span>
                </label>
              `)
              .join("")}
          </div>

          <div class="work-permit-section-selector-actions">
            <button
              id="workPermitAddSelectedSections"
              type="button">

              ${escapeHtml(
                text(
                  "addSelectedSections"
                )
              )}
            </button>

            <button
              id="workPermitCloseSectionSelector"
              type="button">

              ${escapeHtml(text("close"))}
            </button>
          </div>
        </div>
      </section>
    `;
    */
  }

  function sectionElement(sectionId) {
    return screen.querySelector(
      `[data-optional-section="${sectionId}"]`
    );
  }

  function sectionHasValues(sectionId) {
    const section =
      sectionElement(sectionId);

    if (!section) return false;

    return [
      ...section.querySelectorAll(
        "input[name], textarea[name], select[name]"
      )
    ].some(control => {
      if (
        control.type === "checkbox"
      ) {
        return control.checked;
      }

      return String(
        control.value ?? ""
      ).trim() !== "";
    });
  }

  function clearSectionControls(
    sectionId
  ) {
    const section =
      sectionElement(sectionId);

    if (!section) return;

    section
      .querySelectorAll(
        "input[name], textarea[name], select[name]"
      )
      .forEach(control => {
        if (
          control.type === "checkbox"
        ) {
          control.checked = false;
        } else {
          control.value = "";
        }

        syncPrintValue(control);

        if (
          control.tagName === "TEXTAREA"
        ) {
          growTextarea(control);
        }
      });
  }

  function setOptionalSectionVisible(
    sectionId,
    visible,
    persist = true
  ) {
    if (
      !OPTIONAL_SECTION_IDS
        .includes(sectionId)
    ) {
      return;
    }

    if (visible) {
      activeOptionalSections.add(
        sectionId
      );
    } else {
      activeOptionalSections.delete(
        sectionId
      );

      collapsedOptionalSections.delete(
        sectionId
      );
    }

    updateOptionalSectionsUi();

    if (persist) {
      saveDraft(false);
    }
  }

  function setSectionCollapsed(
    sectionId,
    collapsed
  ) {
    if (collapsed) {
      collapsedOptionalSections.add(
        sectionId
      );
    } else {
      collapsedOptionalSections.delete(
        sectionId
      );
    }

    updateOptionalSectionsUi();
    saveDraft(false);
  }

  function updateOptionalSectionsUi() {
    OPTIONAL_SECTION_IDS
      .forEach(sectionId => {
        const section =
          sectionElement(sectionId);

        if (!section) return;

        const active = true;
        const collapsed =
          collapsedOptionalSections.has(sectionId);

        activeOptionalSections.add(sectionId);
        section.hidden = false;

        section.classList.toggle(
          "is-collapsed",
          active && collapsed
        );

        const collapseButton =
          section.querySelector(
            `[data-collapse-section="${sectionId}"]`
          );

        if (collapseButton) {
          collapseButton.textContent =
            collapsed
              ? text("openSection")
              : text("closeSection");
        }

        const checkbox =
          screen.querySelector(
            `[data-optional-section-checkbox][value="${sectionId}"]`
          );

        if (checkbox) {
          checkbox.checked = false;
          checkbox.disabled = active;
        }
      });
  }

  function setSectionSelectorVisible(
    visible
  ) {
    sectionSelectorVisible =
      Boolean(visible);

    const selector =
      screen.querySelector(
        "#workPermitSectionSelector"
      );

    if (selector) {
      selector.hidden =
        !sectionSelectorVisible;
    }
  }

  function addSelectedOptionalSections() {
    const selected = [
      ...screen.querySelectorAll(
        "[data-optional-section-checkbox]:checked"
      )
    ];

    selected.forEach(checkbox => {
      const sectionId =
        checkbox.value;

      setOptionalSectionVisible(
        sectionId,
        true,
        false
      );

      if (
        dynamicRows[sectionId]
      ) {
        renderDynamicRows(
          sectionId
        );
      }
    });

    updateRelatedProducerFields();

    setSectionSelectorVisible(false);
    updateOptionalSectionsUi();
    saveDraft(true);
  }

  function removeOptionalSection(
    sectionId
  ) {
    if (
      sectionHasValues(sectionId) &&
      !window.confirm(
        text(
          "removeSectionConfirm"
        )
      )
    ) {
      return;
    }

    clearSectionControls(sectionId);

    if (
      sectionId === "leader"
    ) {
      dynamicRows.leaders = [
        createEmptyDynamicRow(
          "leaders"
        )
      ];
    }

    if (
      sectionId ===
      "completedMeasures"
    ) {
      dynamicRows.completedMeasures = [
        createEmptyDynamicRow(
          "completedMeasures"
        )
      ];
    }

    if (
      sectionId === "approval"
    ) {
      dynamicRows.approvals = [
        createEmptyDynamicRow(
          "approvals"
        )
      ];
    }

    if (
      sectionId === "brigade"
    ) {
      dynamicRows.brigade = [
        createEmptyDynamicRow(
          "brigade"
        )
      ];
    }

    if (
      sectionId === "breaks"
    ) {
      dynamicRows.breaks = [
        createEmptyDynamicRow(
          "breaks"
        )
      ];
    }

    if (
      sectionId === "changes"
    ) {
      dynamicRows.changes = [
        createEmptyDynamicRow(
          "changes"
        )
      ];
    }

    setOptionalSectionVisible(
      sectionId,
      false,
      false
    );

    saveDraft(true);
  }

  /*
   * ============================================================
   * 12. НАЧАЛО ПОСТРОЕНИЯ ФОРМЫ
   * ============================================================
   */

  function buildScreen() {
    const currentUser =
      getCurrentUser();

    permitState.createdBy =
      currentUser;

    permitState.issuer =
      currentUser;

    if (!permitState.createdAt) {
      permitState.createdAt =
        currentIsoDateTime();
    }

    screen.innerHTML = `
      <header
        class="work-permit-toolbar no-print">

        <div class="work-permit-intro">
          ${i18n(
            "screenTitle",
            "h1"
          )}

          ${i18n(
            "screenDescription",
            "p"
          )}

          <small>
            ✓ ${escapeHtml(
              text("draftLocal")
            )}
          </small>
        </div>

        <div class="work-permit-toolbar-actions">
          <label>
            ${i18n("language")}

            <select
              id="workPermitLanguageSelect">

              <option value="ru">
                ${escapeHtml(
                  text("russian")
                )}
              </option>

              <option value="kk">
                ${escapeHtml(
                  text("kazakh")
                )}
              </option>
            </select>
          </label>

          <button
            id="workPermitClearButton"
            type="button">

            ${escapeHtml(
              text("clear")
            )}
          </button>
        </div>

        <div
          id="workPermitSaveStatus"
          role="status"
          aria-live="polite">
        </div>
      </header>

      <form
        id="workPermitForm"
        class="work-permit-form"
        autocomplete="off">

        <article class="work-permit-paper">

          <nav class="work-permit-flow no-print" aria-label="Этапы наряда-допуска">
            <span><b>1</b> Создание</span>
            <span><b>2</b> Безопасность</span>
            <span><b>3</b> Бригада</span>
            <span><b>4</b> Завершение</span>
          </nav>

          ${sectionSelectorHtml()}

          <header
            class="work-permit-document-head">

            <div class="work-permit-company">
              <strong
                data-work-permit-i18n="companyName">
                ${escapeHtml(
                  text("companyName")
                )}
              </strong>

              <span data-work-permit-i18n="permitCode">
                ${escapeHtml(text("permitCode"))}
              </span>
            </div>

            <div class="work-permit-title-row">
              <div>
                ${i18n(
                  "permitTitle",
                  "h1"
                )}

                ${i18n(
                  "permitSubtitle",
                  "p"
                )}
              </div>

              <div class="work-permit-head-fields">
                ${field(
                  "permit_number",
                  "permitNumber",
                  {
                    value:
                      permitState
                        .permitNumber,
                    readonly: true
                  }
                )}

                ${field(
                  "permit_date",
                  "permitDate",
                  {
                    type: "date",
                    value:
                      localDateValue()
                  }
                )}

                ${field(
                  "created_at",
                  "createdDateTime",
                  {
                    type:
                      "datetime-local",
                    value:
                      localDateTimeValue(
                        new Date(
                          permitState
                            .createdAt
                        )
                      ),
                    readonly: true
                  }
                )}
              </div>
            </div>
          </header>

          <section
            class="work-permit-section">

            ${i18n(
              "producerSection",
              "h2"
            )}

            ${employeeFieldGroup(
              "producer",
              {
                includeOrganization: true,
                includeSignature: false,
                hintKey:
                  "producerAutoHint"
              }
            )}
          </section>

          <section
            class="work-permit-section">

            ${i18n(
              "assignedWorkSection",
              "h2"
            )}

            ${workLocationBlock()}

            ${field(
              "work_scope",
              "workScope",
              {
                textarea: true,
                rows: 3,
                wide: true
              }
            )}
          </section>

          <section
            class="work-permit-section">

            ${i18n(
              "admitterSection",
              "h2"
            )}

            ${employeeFieldGroup(
              "admitter",
              {
                includeOrganization: false,
                includeSignature: false,
                hintKey:
                  "admitterAutoHint"
              }
            )}
          </section>
                    <section
            class="work-permit-section work-permit-optional-section"
            data-optional-section="leader"
            hidden>

            ${optionalSectionToolbar("leader")}

            ${i18n(
              "leaderSection",
              "h2"
            )}

            <div class="work-permit-table-wrap">
              <table
                class="work-permit-table work-permit-responsive-table">

                <thead>
                  <tr>
                    <th>№</th>

                    <th data-work-permit-i18n="fullName">
                      ${escapeHtml(text("fullName"))}
                    </th>

                    <th data-work-permit-i18n="position">
                      ${escapeHtml(text("position"))}
                    </th>

                    <th data-work-permit-i18n="signature">
                      ${escapeHtml(text("signature"))}
                    </th>

                    <th class="no-print"></th>
                  </tr>
                </thead>

                <tbody
                  data-dynamic-rows-container="leaders">
                </tbody>
              </table>
            </div>

            ${addRowButton(
              "leaders",
              "addLeader"
            )}
          </section>

          <section
            class="work-permit-section work-permit-safety-section">

            ${i18n(
              "safetySection",
              "h2"
            )}

            <div class="work-permit-safety-list">
              ${safetyMeasuresHtml()}
            </div>
          </section>

          <section class="work-permit-section">

            ${i18n(
              "issuerSection",
              "h2"
            )}

            <div
              class="work-permit-grid work-permit-grid-four">

              ${field(
                "issuer_name",
                "fullName",
                {
                  value:
                    permitState.issuer?.name || "",
                  hintKey: "issuerAutoHint"
                }
              )}

              ${field(
                "issuer_position",
                "position",
                {
                  value:
                    permitState.issuer?.position || ""
                }
              )}

              ${field(
                "issuer_signature",
                "signature"
              )}

              ${field(
                "issuer_date",
                "date",
                {
                  type: "date",
                  value: localDateValue()
                }
              )}
            </div>
          </section>

          <section
            class="
              work-permit-section
              work-permit-section-long
              work-permit-optional-section
            "
            data-optional-section="completedMeasures"
            hidden>

            ${optionalSectionToolbar(
              "completedMeasures"
            )}

            ${i18n(
              "completedMeasuresSection",
              "h2"
            )}

            <div class="work-permit-completed-summary work-permit-screen-only">
              <label class="work-permit-field work-permit-field-wide">
                <span data-work-permit-i18n="measureNumber">
                  ${escapeHtml(text("measureNumber"))}
                </span>
                ${textareaControl(
                  "completed_measures_summary",
                  "measureNumber",
                  { rows: 5, readonly: true }
                )}
                <small>Заполняется автоматически из выбранных пунктов раздела 5</small>
              </label>

              <details class="work-permit-extra-details no-print">
                <summary>＋ Добавить дополнительное уточнение</summary>
                ${textareaControl(
                  "completed_measures_extra",
                  "safetyAdditional",
                  { rows: 2 }
                )}
              </details>

              <div class="work-permit-grid work-permit-grid-four">
                ${field("completed_by_name", "completedBy")}
                ${field("completed_by_position", "position")}
                ${field("completed_by_signature", "signature")}
              </div>
            </div>

            <div class="work-permit-print-only work-permit-table-wrap">
              <table class="work-permit-table">
                <thead>
                  <tr>
                    <th data-work-permit-i18n="measureNumber">${escapeHtml(text("measureNumber"))}</th>
                    <th data-work-permit-i18n="completedBy">${escapeHtml(text("completedBy"))}</th>
                    <th data-work-permit-i18n="position">${escapeHtml(text("position"))}</th>
                    <th data-work-permit-i18n="signature">${escapeHtml(text("signature"))}</th>
                  </tr>
                </thead>
                <tbody id="workPermitCompletedMeasuresPrintRows"></tbody>
              </table>
            </div>

          </section>

          <section
            class="work-permit-section work-permit-optional-section"
            data-optional-section="approval"
            hidden>

            ${optionalSectionToolbar(
              "approval"
            )}

            ${i18n(
              "approvalSection",
              "h2"
            )}

            <div class="work-permit-table-wrap">
              <table
                class="work-permit-table work-permit-responsive-table">

                <thead>
                  <tr>
                    <th data-work-permit-i18n="approvalNumber">
                      ${escapeHtml(text("approvalNumber"))}
                    </th>

                    <th data-work-permit-i18n="position">
                      ${escapeHtml(text("position"))}
                    </th>

                    <th data-work-permit-i18n="fullName">
                      ${escapeHtml(text("fullName"))}
                    </th>

                    <th data-work-permit-i18n="signature">
                      ${escapeHtml(text("signature"))}
                    </th>

                    <th data-work-permit-i18n="date">
                      ${escapeHtml(text("date"))}
                    </th>

                    <th class="no-print"></th>
                  </tr>
                </thead>

                <tbody
                  data-dynamic-rows-container="approvals">
                </tbody>
              </table>
            </div>

            ${addRowButton(
              "approvals",
              "addApproval"
            )}
          </section>

          <section
            class="
              work-permit-section
              work-permit-section-long
              work-permit-optional-section
            "
            data-optional-section="brigade"
            hidden>

            ${optionalSectionToolbar(
              "brigade"
            )}

            ${i18n(
              "brigadeSection",
              "h2"
            )}

            <div class="work-permit-table-wrap">
              <table
                class="
                  work-permit-table
                  work-permit-responsive-table
                  work-permit-team-table
                ">

                <thead>
                  <tr>
                    <th>№</th>

                    <th data-work-permit-i18n="briefingDateTime">
                      ${escapeHtml(text("briefingDateTime"))}
                    </th>

                    <th data-work-permit-i18n="teamMember">
                      ${escapeHtml(text("teamMember"))}
                    </th>

                    <th data-work-permit-i18n="profession">
                      ${escapeHtml(text("profession"))}
                    </th>

                    <th data-work-permit-i18n="memberSignature">
                      ${escapeHtml(text("memberSignature"))}
                    </th>

                    <th data-work-permit-i18n="instructor">
                      ${escapeHtml(text("instructor"))}
                    </th>

                    <th class="no-print"></th>
                  </tr>
                </thead>

                <tbody
                  data-dynamic-rows-container="brigade">
                </tbody>
              </table>
            </div>

            ${addRowButton(
              "brigade",
              "addBrigadeMember"
            )}

            <div class="work-permit-subsection">
              ${i18n(
                "brigadeStarted",
                "h3"
              )}

              <div
                class="work-permit-grid work-permit-grid-four">

                ${field(
                  "start_date",
                  "workStartDate",
                  {
                    type: "date",
                    value: localDateValue()
                  }
                )}

                ${field(
                  "start_time",
                  "workStartTime",
                  {
                    type: "time",
                    value: localTimeValue()
                  }
                )}

                ${field(
                  "start_producer",
                  "producerNameSignature",
                  {
                    value:
                      permitState.producer?.name || "",
                    readonly: true
                  }
                )}

                ${field(
                  "start_admitter",
                  "admitterNameSignature",
                  {
                    value:
                      permitState.admitter?.name || "",
                    readonly: true
                  }
                )}
              </div>
            </div>
          </section>

          <section
            class="
              work-permit-section
              work-permit-section-long
              work-permit-optional-section
            "
            data-optional-section="breaks"
            hidden>

            ${optionalSectionToolbar(
              "breaks"
            )}

            ${i18n(
              "breaksSection",
              "h2"
            )}

            <div class="work-permit-table-wrap">
              <table
                class="
                  work-permit-table
                  work-permit-responsive-table
                  work-permit-break-table
                ">

                <thead>
                  <tr>
                    <th>№</th>

                    <th data-work-permit-i18n="breakDateTime">
                      ${escapeHtml(text("breakDateTime"))}
                    </th>

                    <th data-work-permit-i18n="workplaceHandover">
                      ${escapeHtml(text("workplaceHandover"))}
                    </th>

                    <th data-work-permit-i18n="breakProducer">
                      ${escapeHtml(text("breakProducer"))}
                    </th>

                    <th data-work-permit-i18n="breakAdmitter">
                      ${escapeHtml(text("breakAdmitter"))}
                    </th>

                    <th data-work-permit-i18n="resumeDateTime">
                      ${escapeHtml(text("resumeDateTime"))}
                    </th>

                    <th data-work-permit-i18n="resumeProducer">
                      ${escapeHtml(text("resumeProducer"))}
                    </th>

                    <th data-work-permit-i18n="resumeAdmitter">
                      ${escapeHtml(text("resumeAdmitter"))}
                    </th>

                    <th class="no-print"></th>
                  </tr>
                </thead>

                <tbody
                  data-dynamic-rows-container="breaks">
                </tbody>
              </table>
            </div>

            ${addRowButton(
              "breaks",
              "addBreak"
            )}
          </section>

          <section
            class="
              work-permit-section
              work-permit-section-long
              work-permit-optional-section
            "
            data-optional-section="changes"
            hidden>

            ${optionalSectionToolbar(
              "changes"
            )}

            ${i18n(
              "changesSection",
              "h2"
            )}

            <div class="work-permit-table-wrap">
              <table
                class="work-permit-table work-permit-responsive-table">

                <thead>
                  <tr>
                    <th>№</th>

                    <th data-work-permit-i18n="changeType">
                      ${escapeHtml(text("changeType"))}
                    </th>

                    <th data-work-permit-i18n="changedMember">
                      ${escapeHtml(text("changedMember"))}
                    </th>

                    <th data-work-permit-i18n="changeIssuer">
                      ${escapeHtml(text("changeIssuer"))}
                    </th>

                    <th data-work-permit-i18n="changeDateTime">
                      ${escapeHtml(text("changeDateTime"))}
                    </th>

                    <th class="no-print"></th>
                  </tr>
                </thead>

                <tbody
                  data-dynamic-rows-container="changes">
                </tbody>
              </table>
            </div>

            ${addRowButton(
              "changes",
              "addBrigadeChange"
            )}
          </section>

          <section class="work-permit-section">

            ${i18n(
              "finishSection",
              "h2"
            )}

            <div
              class="work-permit-grid work-permit-grid-four">

              ${field(
                "finish_date",
                "finishDate",
                {
                  type: "date"
                }
              )}

              ${field(
                "finish_time",
                "finishTime",
                {
                  type: "time"
                }
              )}
            </div>

            <div class="work-permit-completion-checks">
              ${checkboxControl(
                "work_completed",
                "workCompleted"
              )}

              ${checkboxControl(
                "workplace_cleared",
                "workplaceCleared"
              )}
            </div>

            <div
              class="work-permit-grid work-permit-grid-two">

              ${field(
                "permit_returned",
                "permitReturned",
                {
                  value:
                    permitState.producer?.name || "",
                  wide: true,
                  readonly: true
                }
              )}

              ${field(
                "permit_accepted",
                "permitAccepted",
                {
                  value:
                    permitState.acceptedBy?.name ||
                    permitState.issuer?.name ||
                    "",
                  wide: true,
                  readonly: true
                }
              )}
            </div>
          </section>

          <div class="work-permit-final-actions no-print">
            <button id="workPermitFinishButton" type="button">
              ${escapeHtml(text("finishPermit"))}
            </button>
            <button id="workPermitPrintButton" type="button">
              ${escapeHtml(text("print"))}
            </button>
            <button id="workPermitSharePdfButton" class="work-permit-share-button" type="button">
              PDF / WhatsApp
            </button>
          </div>
        </article>
      </form>
    `;

    ensureInitialDynamicRows();

    renderDynamicRows("leaders");
    renderDynamicRows("approvals");
    renderDynamicRows("brigade");
    renderDynamicRows("breaks");
    renderDynamicRows("changes");

    updateOptionalSectionsUi();
    updateSafetyMeasuresUi();
    syncSafetyLanguageText();
    syncAllPrintValues();
    growAllTextareas();
  }
    /*
   * ============================================================
   * 13. ПОЛУЧЕНИЕ ВСЕХ ПОЛЕЙ ФОРМЫ
   * ============================================================
   */

  function controls() {
    return [
      ...screen.querySelectorAll(
        "#workPermitForm input[name], " +
        "#workPermitForm textarea[name], " +
        "#workPermitForm select[name]"
      )
    ];
  }

  function controlValue(control) {
    if (!control) return "";

    if (control.type === "checkbox") {
      return control.checked;
    }

    return control.value;
  }

  function setStoredControlValue(
    control,
    value
  ) {
    if (!control) return;

    if (control.type === "checkbox") {
      control.checked =
        value === true ||
        value === "true" ||
        value === 1 ||
        value === "1";

      return;
    }

    control.value =
      value == null
        ? ""
        : String(value);
  }

  /*
   * ============================================================
   * 14. ПЕЧАТНЫЕ ЗНАЧЕНИЯ
   * ============================================================
   */

  function formatControlValue(
    control
  ) {
    if (!control) return "";

    if (control.type === "checkbox") {
      return control.checked
        ? "✓"
        : "";
    }

    if (!control.value) return "";

    if (control.tagName === "SELECT") {
      const selected =
        control.selectedOptions?.[0];

      if (!selected) return "";

      if (
        selected.value === "manual"
      ) {
        return text("manualInput");
      }

      return selected.textContent
        ?.trim() || "";
    }

    if (control.type === "date") {
      return formatDateForPrint(
        control.value
      );
    }

    if (
      control.type ===
      "datetime-local"
    ) {
      return formatDateTimeForPrint(
        control.value
      );
    }

    return control.value;
  }

  function syncPrintValue(
    control
  ) {
    if (!control?.name) return;

    const mirror =
      screen.querySelector(
        `[data-work-permit-print-for="${CSS.escape(
          control.name
        )}"]`
      );

    if (!mirror) return;

    mirror.textContent =
      formatControlValue(control);

    if (
      control.type === "checkbox"
    ) {
      mirror.classList.toggle(
        "is-checked",
        control.checked
      );
    }
  }

  function syncAllPrintValues() {
    controls().forEach(
      syncPrintValue
    );
  }

  /*
   * ============================================================
   * 15. АВТОМАТИЧЕСКАЯ ВЫСОТА ТЕКСТОВЫХ ПОЛЕЙ
   * ============================================================
   */

  function growTextarea(
    textarea
  ) {
    if (
      !textarea ||
      textarea.tagName !== "TEXTAREA"
    ) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height =
      `${Math.max(
        textarea.scrollHeight,
        58
      )}px`;
  }

  function growAllTextareas() {
    screen
      .querySelectorAll("textarea")
      .forEach(growTextarea);
  }

  /*
   * ============================================================
   * 16. ЛОГИКА МЕРОПРИЯТИЙ 5.1–5.9
   * ============================================================
   */

  function safetyToggle(
    measureId
  ) {
    return screen.querySelector(
      `[data-safety-toggle="${CSS.escape(
        measureId
      )}"]`
    );
  }

  function safetyDetails(
    measureId
  ) {
    return screen.querySelector(
      `[data-safety-details="${CSS.escape(
        measureId
      )}"]`
    );
  }

  function updateSafetyMeasureUi(
    measureId
  ) {
    const checkbox =
      safetyToggle(measureId);

    const details =
      safetyDetails(measureId);

    if (!checkbox || !details) {
      return;
    }

    details.hidden =
      !checkbox.checked;

    const item =
      checkbox.closest(
        "[data-safety-item]"
      );

    item?.classList.toggle(
      "is-enabled",
      checkbox.checked
    );

    const textarea =
      details.querySelector(
        "textarea"
      );

    if (
      checkbox.checked &&
      textarea
    ) {
      applySafetyAutofill(measureId, textarea);
      growTextarea(textarea);
    }
  }

  function workEquipmentValue() {
    return screen.querySelector('[name="equipment_manual"]')?.value?.trim() || "";
  }

  function workPlaceValue() {
    return screen.querySelector('[name="work_place"]')?.value?.trim() || "";
  }

  function safetyDefaultText(measureId) {
    if (language === "kk") {
      return SAFETY_DEFAULTS_KK[measureId] || SAFETY_DEFAULTS[measureId] || "";
    }
    return SAFETY_DEFAULTS[measureId] || "";
  }

  function safetyInstallOptionText(index) {
    if (language === "kk") {
      return SAFETY_INSTALL_OPTIONS_KK[index] || SAFETY_INSTALL_OPTIONS[index] || "";
    }
    return SAFETY_INSTALL_OPTIONS[index] || "";
  }

  function safetyInstructionTitle(item) {
    if (language === "kk") {
      return SAFETY_INSTRUCTION_TITLES_KK[item.id] || item.title;
    }
    return item.title;
  }

  function applySafetyAutofill(measureId, textarea, refresh = false) {
    if (!textarea) return;
    let value = safetyDefaultText(measureId);
    if (measureId === "5.1") value = workEquipmentValue();
    if (measureId === "5.4") {
      value = [workEquipmentValue(), workPlaceValue()].filter(Boolean).join(" — ");
    }
    if (!value) return;
    if (!refresh && textarea.value.trim()) return;
    if (refresh && textarea.dataset.autofilled !== "true" && textarea.value.trim()) return;
    textarea.value = value;
    textarea.dataset.autofilled = "true";
    syncPrintValue(textarea);
    growTextarea(textarea);
  }

  function refreshLinkedSafetyAutofill() {
    ["5.1", "5.4"].forEach(id => {
      if (!safetyToggle(id)?.checked) return;
      const textarea = safetyDetails(id)?.querySelector("textarea");
      applySafetyAutofill(id, textarea, true);
    });
    syncCompletedMeasuresSummary();
  }

  function syncSafetyInstallOptions() {
    const textarea = safetyDetails("5.3")?.querySelector("textarea");
    if (!textarea) return;
    textarea.value = [...screen.querySelectorAll("[data-safety-install-option]:checked")]
      .map(control => safetyInstallOptionText(Number(control.dataset.safetyInstallOption)))
      .join("; ");
    syncPrintValue(textarea);
    growTextarea(textarea);
    syncCompletedMeasuresSummary();
  }

  function acknowledgedInstructionIds() {
    const textarea = safetyDetails("5.9")?.querySelector("textarea");
    const storedIds = (textarea?.dataset.acknowledged || "").split(",").filter(Boolean);
    if (storedIds.length) return new Set(storedIds);
    const value = textarea?.value || "";
    return new Set(SAFETY_INSTRUCTIONS.filter(item => {
      const kkTitle = SAFETY_INSTRUCTION_TITLES_KK[item.id] || "";
      return value.includes(item.title) || (kkTitle && value.includes(kkTitle));
    }).map(item => item.id));
  }

  function syncInstructionAcknowledgements(ids = acknowledgedInstructionIds()) {
    const textarea = safetyDetails("5.9")?.querySelector("textarea");
    if (!textarea) return;
    const selected = SAFETY_INSTRUCTIONS.filter(item =>
      ids.has(item.id) && screen.querySelector(`[data-instruction-toggle="${item.id}"]`)?.checked
    );
    textarea.dataset.acknowledged = selected.map(item => item.id).join(",");
    textarea.value = selected
      .map(item => `${text("acknowledgedWith")} ${safetyInstructionTitle(item)}`)
      .join("\n");
    SAFETY_INSTRUCTIONS.forEach(item => {
      const card = screen.querySelector(`[data-instruction-card="${item.id}"]`);
      card?.classList.toggle("is-acknowledged", selected.some(entry => entry.id === item.id));
      const button = card?.querySelector("[data-instruction-ack]");
      if (button) button.textContent = selected.some(entry => entry.id === item.id)
        ? "✓ Ознакомление подтверждено"
        : "Прочитал и ознакомился";
    });
    syncPrintValue(textarea);
    growTextarea(textarea);
    syncCompletedMeasuresSummary();
  }

  function syncSafetyLanguageText() {
    screen.querySelectorAll("[data-safety-install-label]").forEach(label => {
      label.textContent = safetyInstallOptionText(Number(label.dataset.safetyInstallLabel));
    });

    screen.querySelectorAll("[data-instruction-title]").forEach(title => {
      const item = SAFETY_INSTRUCTIONS.find(entry => entry.id === title.dataset.instructionTitle);
      if (item) title.textContent = safetyInstructionTitle(item);
    });

    ["5.2", "5.5", "5.6", "5.7", "5.8"].forEach(measureId => {
      const textarea = safetyDetails(measureId)?.querySelector("textarea");
      if (!textarea || textarea.dataset.autofilled !== "true") return;
      textarea.value = safetyDefaultText(measureId);
      syncPrintValue(textarea);
      growTextarea(textarea);
    });

    syncSafetyInstallOptions();
    syncInstructionAcknowledgements(acknowledgedInstructionIds());
  }

  async function importInstructionWord(input) {
    const file = input.files?.[0];
    if (!file) return;
    const editor = input.closest("[data-instruction-editor]");
    const textarea = editor?.querySelector("[data-instruction-content]");
    const fileName = editor?.querySelector("[data-instruction-file-name]");
    if (!textarea || !window.mammoth?.extractRawText) {
      window.alert("Не удалось открыть Word-файл. Обновите страницу и попробуйте снова.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Word-файл должен быть не больше 5 МБ.");
      input.value = "";
      return;
    }
    try {
      const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      textarea.value = String(result.value || "").trim();
      editor.dataset.fileName = file.name;
      if (fileName) fileName.textContent = `Загружен: ${file.name}`;
      growTextarea(textarea);
    } catch (error) {
      console.error("Word instruction import failed", error);
      window.alert("Не удалось прочитать этот Word-файл.");
    }
  }

  async function saveInstructionEditor(button) {
    const id = button.dataset.saveInstruction;
    const instruction = SAFETY_INSTRUCTIONS.find(item => item.id === id);
    const editor = button.closest("[data-instruction-editor]");
    if (!instruction || !editor) return;
    const content = editor.querySelector("[data-instruction-content]")?.value?.trim() || "";
    if (!content) {
      window.alert("Введите текст инструкции или загрузите Word-файл.");
      return;
    }
    const editorIds = [...editor.querySelectorAll("[data-instruction-editor-id]:checked")]
      .map(control => control.value);
    const status = editor.querySelector("[data-instruction-save-status]");
    button.disabled = true;
    if (status) status.textContent = "Сохранение…";
    try {
      const response = await fetch(`/api/work-permit-instructions/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          title: instruction.title,
          content,
          fileName: editor.dataset.fileName || instructionRecords.get(id)?.fileName || "",
          editorIds
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      instructionRecords.set(id, { ...payload.record, canEdit: true });
      if (status) status.textContent = "✓ Сохранено";
      const card = editor.closest("[data-instruction-card]");
      const fullText = card?.querySelector(".work-permit-instruction-full-text, ul");
      if (fullText) {
        const replacement = document.createElement("div");
        replacement.className = "work-permit-instruction-full-text";
        replacement.textContent = content;
        fullText.replaceWith(replacement);
      }
    } catch (error) {
      console.error("Instruction save failed", error);
      if (status) status.textContent = "Ошибка сохранения";
      window.alert("Не удалось сохранить инструкцию.");
    } finally {
      button.disabled = false;
    }
  }

  function updateSafetyMeasuresUi() {
    SAFETY_MEASURES.forEach(
      measure => {
        updateSafetyMeasureUi(
          measure.id
        );
      }
    );

    refreshCompletedMeasureSelects();
    syncSafetyInstallOptions();
    syncInstructionAcknowledgements();
    syncCompletedMeasuresSummary();
  }

  function selectedSafetyMeasures() {
    return SAFETY_MEASURES
      .filter(measure => {
        return Boolean(
          safetyToggle(
            measure.id
          )?.checked
        );
      })
      .map(measure => {
        const details =
          safetyDetails(
            measure.id
          );

        const textarea =
          details?.querySelector(
            `textarea[name="${CSS.escape(
              measure.fieldName
            )}"]`
          );

        return {
          id: measure.id,
          key: measure.key,
          enabled: true,
          details:
            textarea?.value || ""
        };
      });
  }

  function syncCompletedMeasuresSummary() {
    const summary = screen.querySelector(
      '[name="completed_measures_summary"]'
    );

    if (!summary) return;

    summary.value = selectedSafetyMeasures()
      .map(item => {
        const measure = SAFETY_MEASURES.find(entry => entry.id === item.id);
        const title = measure ? text(measure.key) : item.id;
        return item.details ? `${title} — ${item.details}` : title;
      })
      .join("\n");

    syncPrintValue(summary);
    growTextarea(summary);

    syncCompletedMeasuresPrintRows();
  }

  function updateEmployeeEntryModes() {
    screen.querySelectorAll(
      "[data-employee-group]"
    ).forEach(group => {
      const select = group.querySelector(
        "[data-employee-select]"
      );
      group.classList.toggle(
        "is-manual",
        select?.value === "manual"
      );
    });
  }

  function useEmployeeList(button) {
    const group = button.closest(
      "[data-employee-group]"
    );
    const select = group?.querySelector(
      "[data-employee-select]"
    );
    if (!group || !select) return;

    select.value = "";
    group.classList.remove("is-manual");
    select.focus();
    syncPrintValue(select);
    saveDraft(false);
  }

  function updateLocationEntryModes() {
    screen.querySelectorAll("[data-location-entry]")
      .forEach(group => {
        const select = group.querySelector("select");
        group.classList.toggle(
          "is-manual",
          select?.value === "manual"
        );
      });
  }

  function useLocationList(button) {
    const group = button.closest("[data-location-entry]");
    const select = group?.querySelector("select");
    if (!group || !select) return;
    select.value = "";
    group.classList.remove("is-manual");
    select.focus();
    syncPrintValue(select);
    saveDraft(false);
  }

  function syncCompletedMeasuresPrintRows() {
    const body = screen.querySelector(
      "#workPermitCompletedMeasuresPrintRows"
    );
    if (!body) return;

    const name = screen.querySelector(
      '[name="completed_by_name"]'
    )?.value || "";
    const position = screen.querySelector(
      '[name="completed_by_position"]'
    )?.value || "";
    const signature = screen.querySelector(
      '[name="completed_by_signature"]'
    )?.value || "";
    const measures = selectedSafetyMeasures();
    const rows = measures.length ? measures : [{ id: "", details: "" }];

    body.innerHTML = rows.map(item => {
      const measure = SAFETY_MEASURES.find(entry => entry.id === item.id);
      const title = measure ? text(measure.key) : "";
      const description = item.details
        ? `${item.id} ${title} — ${item.details}`
        : `${item.id} ${title}`.trim();

      return `
        <tr>
          <td>${escapeHtml(description)}</td>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(position)}</td>
          <td>${escapeHtml(signature)}</td>
        </tr>
      `;
    }).join("");
  }

  function refreshCompletedMeasureSelects() {
    const selectedIds =
      selectedSafetyMeasures()
        .map(item => item.id);

    screen
      .querySelectorAll(
        "[data-completed-measure-select]"
      )
      .forEach(select => {
        const currentValue =
          select.value;

        const availableIds =
          selectedIds.length
            ? selectedIds
            : SAFETY_MEASURES.map(
                item => item.id
              );

        select.innerHTML = `
          <option value="">
            ${escapeHtml(
              text("blankOption")
            )}
          </option>

          ${availableIds
            .map(measureId => `
              <option
                value="${escapeHtml(measureId)}"
                ${measureId === currentValue
                  ? "selected"
                  : ""}>
                ${escapeHtml(measureId)}
              </option>
            `)
            .join("")}
        `;

        syncPrintValue(select);
      });
  }

  /*
   * ============================================================
   * 17. СБОР ЗНАЧЕНИЙ ФОРМЫ
   * ============================================================
   */

  function draftValues() {
    return controls().reduce(
      (result, control) => {
        result[control.name] =
          controlValue(control);

        return result;
      },
      {}
    );
  }

  function serializeDynamicRows() {
    return Object.fromEntries(
      Object.entries(
        dynamicRows
      ).map(
        ([collection, rows]) => [
          collection,
          rows.map(row => ({
            ...row
          }))
        ]
      )
    );
  }

  function restoreDynamicRows(
    storedRows
  ) {
    if (
      !storedRows ||
      typeof storedRows !== "object"
    ) {
      ensureInitialDynamicRows();
      return;
    }

    Object.keys(dynamicRows)
      .forEach(collection => {
        const rows =
          storedRows[collection];

        if (Array.isArray(rows)) {
          dynamicRows[collection] =
            rows
              .filter(
                row =>
                  row &&
                  typeof row === "object"
              )
              .map(row => ({
                ...row,
                id:
                  row.id ||
                  generateId(
                    collection
                  )
              }));
        }

        if (
          !dynamicRows[collection]
            .length
        ) {
          dynamicRows[collection].push(
            createEmptyDynamicRow(
              collection
            )
          );
        }
      });
  }

  function collectPermitState() {
    const permitNumber =
      screen.querySelector(
        '[name="permit_number"]'
      )?.value || "";

    const createdAt =
      screen.querySelector(
        '[name="created_at"]'
      )?.value || "";

    permitState.permitNumber =
      permitNumber;

    if (createdAt) {
      permitState.createdAt =
        new Date(
          createdAt
        ).toISOString();
    }

    return {
      ...permitState,

      producer:
        permitState.producer
          ? {
              ...permitState.producer
            }
          : null,

      admitter:
        permitState.admitter
          ? {
              ...permitState.admitter
            }
          : null,

      issuer:
        permitState.issuer
          ? {
              ...permitState.issuer
            }
          : null,

      acceptedBy:
        permitState.acceptedBy
          ? {
              ...permitState.acceptedBy
            }
          : null,

      selectedWorkshop:
        permitState.selectedWorkshop
          ? {
              ...permitState
                .selectedWorkshop
            }
          : null,

      selectedEquipment:
        permitState.selectedEquipment
          ? {
              ...permitState
                .selectedEquipment
            }
          : null
    };
  }

  /*
   * ============================================================
   * 18. СТАТУС СОХРАНЕНИЯ
   * ============================================================
   */

  function showSaveStatus(
    messageKey = "saved"
  ) {
    const status =
      screen.querySelector(
        "#workPermitSaveStatus"
      );

    if (!status) return;

    status.textContent =
      text(messageKey);

    status.classList.add(
      "visible"
    );

    window.setTimeout(() => {
      status.classList.remove(
        "visible"
      );
    }, 1500);
  }

  /*
   * ============================================================
   * 19. СОХРАНЕНИЕ ЧЕРНОВИКА
   * ============================================================
   */

  function saveDraft(
    showStatus = true
  ) {
    window.clearTimeout(
      saveTimer
    );

    const payload = {
      version: 4,

      language,

      permitState:
        collectPermitState(),

      activeOptionalSections: [
        ...activeOptionalSections
      ],

      collapsedOptionalSections: [
        ...collapsedOptionalSections
      ],

      dynamicRows:
        serializeDynamicRows(),

      safetyMeasures:
        selectedSafetyMeasures(),

      values:
        draftValues(),

      updatedAt:
        currentIsoDateTime()
    };

    try {
      localStorage.setItem(
        draftOwnerKey(),
        JSON.stringify(
          payload
        )
      );

      localStorage.setItem(
        LANGUAGE_KEY,
        language
      );
    } catch {}

    if (showStatus) {
      showSaveStatus(
        "saved"
      );
    }
  }

  function scheduleSave() {
    window.clearTimeout(
      saveTimer
    );

    saveTimer =
      window.setTimeout(() => {
        saveDraft(true);
      }, 300);
  }

  /*
   * ============================================================
   * 20. ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ НАРЯДА
   * ============================================================
   */

  function restorePermitState(
    storedState
  ) {
    if (
      !storedState ||
      typeof storedState !== "object"
    ) {
      return;
    }

    permitState.status =
      storedState.status ||
      "draft";

    permitState.permitNumber =
      storedState.permitNumber ||
      "";

    permitState.createdAt =
      storedState.createdAt ||
      permitState.createdAt;

    permitState.completedAt =
      storedState.completedAt ||
      "";

    permitState.createdBy =
      storedState.createdBy ||
      permitState.createdBy;

    permitState.producer =
      storedState.producer ||
      null;

    permitState.admitter =
      storedState.admitter ||
      null;

    permitState.issuer =
      storedState.issuer ||
      permitState.issuer;

    permitState.acceptedBy =
      storedState.acceptedBy ||
      null;

    permitState.selectedWorkshop =
      storedState.selectedWorkshop ||
      null;

    permitState.selectedEquipment =
      storedState.selectedEquipment ||
      null;
  }

  function restoreOptionalSections(
    draft
  ) {
    activeOptionalSections = new Set(OPTIONAL_SECTION_IDS);
    collapsedOptionalSections = new Set(
      Array.isArray(draft?.collapsedOptionalSections)
        ? draft.collapsedOptionalSections.filter(sectionId =>
            OPTIONAL_SECTION_IDS.includes(sectionId)
          )
        : []
    );
  }

  function restoreSafetyMeasures(
    storedMeasures
  ) {
    const measureMap =
      new Map(
        Array.isArray(
          storedMeasures
        )
          ? storedMeasures.map(
              measure => [
                measure.id,
                measure
              ]
            )
          : []
      );

    SAFETY_MEASURES.forEach(
      measure => {
        const stored =
          measureMap.get(
            measure.id
          );

        const checkbox =
          safetyToggle(
            measure.id
          );

        const textarea =
          screen.querySelector(
            `[name="${CSS.escape(
              measure.fieldName
            )}"]`
          );

        if (checkbox) {
          checkbox.checked =
            Boolean(
              stored?.enabled
            );
        }

        if (textarea) {
          textarea.value =
            stored?.details || "";
        }

        updateSafetyMeasureUi(
          measure.id
        );
      }
    );
  }

  function restoreFormValues(
    values
  ) {
    if (
      !values ||
      typeof values !== "object"
    ) {
      return;
    }

    controls().forEach(
      control => {
        if (
          Object.prototype
            .hasOwnProperty.call(
              values,
              control.name
            )
        ) {
          setStoredControlValue(
            control,
            values[
              control.name
            ]
          );
        }
      }
    );
  }

  function applyCurrentDateTimeDefaults() {
    const now = new Date();
    const defaults = {
      issuer_date: localDateValue(now),
      start_date: localDateValue(now),
      start_time: localTimeValue(now)
    };

    Object.entries(defaults).forEach(([name, value]) => {
      const control = screen.querySelector(
        `[name="${CSS.escape(name)}"]`
      );
      if (!control) return;

      if (name === "issuer_date" || !control.value) {
        control.value = value;
        syncPrintValue(control);
      }
    });
  }

  async function restoreDraft() {
    let draft = null;

    try {
      draft = JSON.parse(
        localStorage.getItem(
          draftOwnerKey()
        ) || "null"
      );
    } catch {}

    if (draft && Number(draft.version || 0) < 4) {
      if (Array.isArray(draft.dynamicRows?.breaks)) {
        draft.dynamicRows.breaks = draft.dynamicRows.breaks.map(row => ({
          ...row,
          start: "",
          resume: ""
        }));
      }
      if (Array.isArray(draft.dynamicRows?.changes)) {
        draft.dynamicRows.changes = draft.dynamicRows.changes.map(row => ({
          ...row,
          type: "",
          date: ""
        }));
      }
      if (draft.values && typeof draft.values === "object") {
        Object.keys(draft.values).forEach(name => {
          if (
            /^break_.*_(start|resume)$/.test(name) ||
            /^change_.*_(type|date)$/.test(name) ||
            name === "finish_date" ||
            name === "finish_time"
          ) {
            draft.values[name] = "";
          }
        });
      }
    }

    if (
      draft?.language === "ru" ||
      draft?.language === "kk"
    ) {
      language =
        draft.language;
    }

    restorePermitState(
      draft?.permitState
    );

    restoreOptionalSections(
      draft
    );

    restoreDynamicRows(
      draft?.dynamicRows
    );

    if (!permitState.createdAt) {
      permitState.createdAt =
        currentIsoDateTime();
    }

    buildScreen();

    restoreFormValues(
      draft?.values
    );

    applyCurrentDateTimeDefaults();

    restoreSafetyMeasures(
      draft?.safetyMeasures
    );

    updateOptionalSectionsUi();
    updateEmployeeEntryModes();
    updateLocationEntryModes();
    syncAllPrintValues();
    growAllTextareas();

    const permitNumberControl =
      screen.querySelector(
        '[name="permit_number"]'
      );

    if (
      permitNumberControl &&
      !permitNumberControl.value
    ) {
      permitNumberControl.value =
        permitState.permitNumber;

      syncPrintValue(
        permitNumberControl
      );
    }

    const createdAtControl =
      screen.querySelector(
        '[name="created_at"]'
      );

    if (
      createdAtControl &&
      !createdAtControl.value
    ) {
      createdAtControl.value =
        localDateTimeValue(
          new Date(
            permitState.createdAt
          )
        );

      syncPrintValue(
        createdAtControl
      );
    }

    updateRelatedProducerFields();
    updateRelatedAdmitterFields();
    updateRelatedIssuerFields();
  }
    /*
   * ============================================================
   * 21. ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА
   * ============================================================
   */

  function applyLanguage(
    nextLanguage = language
  ) {
    language =
      nextLanguage === "kk"
        ? "kk"
        : "ru";

    screen.lang =
      language === "kk"
        ? "kk"
        : "ru";

    screen.dataset.workPermitLanguage =
      language;

    screen
      .querySelectorAll(
        "[data-work-permit-i18n]"
      )
      .forEach(element => {
        const key =
          element.dataset.workPermitI18n;

        element.textContent =
          text(key);
      });

    screen
      .querySelectorAll(
        "[data-work-permit-aria]"
      )
      .forEach(element => {
        const key =
          element.dataset.workPermitAria;

        element.setAttribute(
          "aria-label",
          text(key)
        );
      });

    screen
      .querySelectorAll(
        "[data-work-permit-label]"
      )
      .forEach(element => {
        const key =
          element.dataset.workPermitLabel;

        element.dataset.mobileLabel =
          text(key);
      });

    const languageSelect =
      screen.querySelector(
        "#workPermitLanguageSelect"
      );

    if (languageSelect) {
      languageSelect.value =
        language;
    }

    screen
      .querySelectorAll(
        "[data-optional-section-title]"
      )
      .forEach(element => {
        const sectionId =
          element.dataset
            .optionalSectionTitle;

        element.textContent =
          optionalSectionTitle(
            sectionId
          );
      });

    updateOptionalSectionsUi();
    updateSafetyMeasuresUi();
    syncSafetyLanguageText();
    syncAllPrintValues();

    try {
      localStorage.setItem(
        LANGUAGE_KEY,
        language
      );
    } catch {}
  }

  /*
   * ============================================================
   * 22. СОХРАНЕНИЕ ЗНАЧЕНИЙ ДИНАМИЧЕСКИХ СТРОК
   * ============================================================
   */

  function handleDynamicControlInput(
    control
  ) {
    const context =
      findDynamicRowContext(
        control
      );

    if (!context) return;

    const key =
      dynamicFieldKey(
        control.name,
        context.collection,
        context.rowId
      );

    if (!key) return;

    updateDynamicRowValue(
      context.collection,
      context.rowId,
      key,
      controlValue(control)
    );
  }

  /*
   * ============================================================
   * 23. ЗАВЕРШЕНИЕ НАРЯДА
   * ============================================================
   */

  function completePermit() {
    if (
      permitState.status ===
      "completed"
    ) {
      showSaveStatus(
        "completed"
      );

      return;
    }

    const confirmed =
      window.confirm(
        text("finishConfirm")
      );

    if (!confirmed) return;

    permitState.status =
      "completed";

    permitState.completedAt =
      currentIsoDateTime();

    confirmUsedPermitNumber(
      permitState.permitNumber
    );

    saveDraft(false);
    showSaveStatus(
      "completed"
    );
  }

  /*
   * ============================================================
   * 24. ОЧИСТКА И НОВЫЙ НАРЯД
   * ============================================================
   */

  async function clearForm() {
    const confirmed =
      window.confirm(
        text("clearConfirm")
      );

    if (!confirmed) return;

    try {
      localStorage.removeItem(
        draftOwnerKey()
      );
    } catch {}

    activeOptionalSections = new Set(OPTIONAL_SECTION_IDS);
    collapsedOptionalSections.clear();

    Object.keys(
      dynamicRows
    ).forEach(collection => {
      dynamicRows[collection] = [];
    });

    permitState.status =
      "draft";

    permitState.permitNumber = "";

    permitState.createdAt =
      currentIsoDateTime();

    permitState.completedAt =
      "";

    permitState.createdBy =
      getCurrentUser();

    permitState.producer =
      null;

    permitState.admitter =
      null;

    permitState.issuer =
      getCurrentUser();

    permitState.acceptedBy =
      null;

    permitState.selectedWorkshop =
      null;

    permitState.selectedEquipment =
      null;

    ensureInitialDynamicRows();
    buildScreen();
    applyLanguage(language);
    bindEvents();
    saveDraft(true);
  }

  /*
   * ============================================================
   * 25. ПОДГОТОВКА ПЕЧАТИ
   * ============================================================
   */

  function removeEmptyDynamicRowsFromPrint() {
    screen
      .querySelectorAll(
        "[data-dynamic-row]"
      )
      .forEach(rowElement => {
        const controlsInRow = [
          ...rowElement.querySelectorAll(
            "input[name], textarea[name], select[name]"
          )
        ];

        const hasValue =
          controlsInRow.some(
            control => {
              if (
                control.type ===
                "checkbox"
              ) {
                return control.checked;
              }

              return String(
                control.value ?? ""
              ).trim() !== "";
            }
          );

        rowElement.classList.toggle(
          "work-permit-print-empty-row",
          !hasValue &&
            rowElement.parentElement?.firstElementChild !== rowElement
        );
      });
  }

  function prepareForPrint() {
    updateOptionalSectionsUi();
    updateSafetyMeasuresUi();
    growAllTextareas();
    syncAllPrintValues();
    syncCompletedMeasuresPrintRows();
    screen.querySelector(".work-permit-paper")
      ?.classList.add("is-print-layout");
    removeEmptyDynamicRowsFromPrint();

    OPTIONAL_SECTION_IDS
      .forEach(sectionId => {
        const section =
          sectionElement(
            sectionId
          );

        if (!section) return;

        section.hidden =
          !activeOptionalSections.has(sectionId) ||
          collapsedOptionalSections.has(sectionId);

        section.classList.remove(
          "is-collapsed"
        );
      });
  }

  function restoreAfterPrint() {
    screen.querySelector(".work-permit-paper")
      ?.classList.remove("is-print-layout");
    screen
      .querySelectorAll(
        ".work-permit-print-empty-row"
      )
      .forEach(row => {
        row.classList.remove(
          "work-permit-print-empty-row"
        );
      });

    updateOptionalSectionsUi();
  }

  async function sharePermitPdf() {
    const button = screen.querySelector("#workPermitSharePdfButton");
    const paper = screen.querySelector(".work-permit-paper");
    if (!paper || typeof window.html2pdf !== "function") {
      window.alert("Создание PDF пока недоступно. Обновите страницу и попробуйте снова.");
      return;
    }

    if (!window.confirm(text("printNumberConfirm"))) return;
    await claimPermitNumber();
    saveDraft(false);
    prepareForPrint();
    const originalText = button?.textContent || "PDF / WhatsApp";
    if (button) {
      button.disabled = true;
      button.textContent = "Создаём PDF…";
    }

    try {
      const number = screen.querySelector('[name="permit_number"]')?.value || "draft";
      const fileName = `naryad-dopusk-${number}.pdf`;
      const worker = window.html2pdf()
        .set({
          margin: [10, 10, 8, 22],
          filename: fileName,
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: { scale: 1.55, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: [".work-permit-section"] }
        })
        .from(paper)
        .toPdf();
      const pdf = await worker.get("pdf");
      const blob = pdf.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${text("permitTitle")} ${number}`,
          text: `${text("permitTitle")} № ${number}`,
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        window.alert("PDF скачан. Прикрепите его в WhatsApp как документ.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Permit PDF share failed", error);
        window.alert("Не удалось создать PDF. Используйте кнопку «Печать / PDF».");
      }
    } finally {
      restoreAfterPrint();
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  async function printPermit() {
    if (!window.confirm(text("printNumberConfirm"))) return;
    await claimPermitNumber();
    saveDraft(false);
    prepareForPrint();

    const oldTitle =
      document.title;

    const number =
      screen.querySelector(
        '[name="permit_number"]'
      )?.value || "";

    document.title =
      `${text("permitTitle")} ${number}`
        .trim();

    document.body.classList.add(
      "printing-work-permit"
    );

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "workPermitDynamicPrintStyle";

    style.textContent = `
      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      @media print {
        body.printing-work-permit
        .no-print {
          display: none !important;
        }

        body.printing-work-permit
        .work-permit-section-constructor {
          display: none !important;
        }

        body.printing-work-permit
        .work-permit-instruction-list,
        body.printing-work-permit
        .work-permit-safety-options,
        body.printing-work-permit
        .work-permit-safety-details > small,
        body.printing-work-permit
        .work-permit-reminder,
        body.printing-work-permit
        .work-permit-reminder-show,
        body.printing-work-permit
        .work-permit-field:has([name="created_at"]) {
          display: none !important;
        }

        body.printing-work-permit
        .work-permit-print-empty-row {
          display: none !important;
        }

        body.printing-work-permit
        .work-permit-optional-section[hidden] {
          display: none !important;
        }

        body.printing-work-permit
        .work-permit-optional-section {
          display: block;
        }

        body.printing-work-permit
        .work-permit-paper {
          border: none !important;
          box-shadow: none !important;
        }

        body.printing-work-permit
        .work-permit-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        body.printing-work-permit
        .work-permit-section-long {
          page-break-inside: auto;
          break-inside: auto;
        }

        body.printing-work-permit
        input,
        body.printing-work-permit
        textarea,
        body.printing-work-permit
        select {
          display: none !important;
        }

        body.printing-work-permit
        .work-permit-print-value {
          display: block !important;
          min-height: 18px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        body.printing-work-permit
        .work-permit-checkbox-mark {
          display: inline-block !important;
        }

        body.printing-work-permit
        table {
          width: 100%;
          border-collapse: collapse;
        }

        body.printing-work-permit
        th,
        body.printing-work-permit
        td {
          border: 1px solid #000 !important;
        }
      }
    `;

    document.head.append(
      style
    );

    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;

      cleaned = true;

      document.title =
        oldTitle;

      document.body.classList.remove(
        "printing-work-permit"
      );

      style.remove();

      restoreAfterPrint();

      window.removeEventListener(
        "afterprint",
        cleanup
      );
    };

    window.addEventListener(
      "afterprint",
      cleanup
    );

    window.requestAnimationFrame(
      () => {
        window.print();

        window.setTimeout(
          cleanup,
          5000
        );
      }
    );
  }

  /*
   * ============================================================
   * 26. СОБЫТИЯ ФОРМЫ
   * ============================================================
   */

  function bindEvents() {
    const form =
      screen.querySelector(
        "#workPermitForm"
      );

    form?.addEventListener(
      "input",
      event => {
        const control =
          event.target;

        if (!['permit_date', 'created_at'].includes(control.name)) {
          updatePermitPrintTimestamp();
        }

        if (
          control.tagName ===
          "TEXTAREA"
        ) {
          growTextarea(
            control
          );
        }

        handleDynamicControlInput(
          control
        );

        syncManualEmployeeInput(
          control
        );

        if (control.name === "equipment_manual" || control.name === "work_place") {
          refreshLinkedSafetyAutofill();
        }

        if (control.closest?.("[data-safety-details]") && !control.readOnly) {
          delete control.dataset.autofilled;
        }

        if (
          SAFETY_MEASURES.some(measure => measure.fieldName === control.name)
        ) {
          syncCompletedMeasuresSummary();
        }

        syncPrintValue(
          control
        );

        scheduleSave();
      }
    );

    form?.addEventListener(
      "change",
      event => {
        const control =
          event.target;

        handleDynamicControlInput(
          control
        );

        if (
          control.matches(
            "[data-employee-select]"
          )
        ) {
          handleEmployeeSelection(
            control
          );
        }

        if (
          control.matches(
            "[data-workshop-select]"
          )
        ) {
          handleWorkshopSelection(
            control
          );
        }

        if (
          control.matches(
            "[data-equipment-select]"
          )
        ) {
          handleEquipmentSelection(
            control
          );
        }

        if (
          control.matches(
            "[data-safety-toggle]"
          )
        ) {
          updateSafetyMeasureUi(
            control.dataset
              .safetyToggle
          );

          refreshCompletedMeasureSelects();
        }

        if (control.matches("[data-safety-install-option]")) {
          syncSafetyInstallOptions();
        }

        if (control.matches("[data-instruction-toggle]")) {
          const card = control.closest("[data-instruction-card]");
          if (control.checked) card?.querySelector("details")?.setAttribute("open", "");
          syncInstructionAcknowledgements();
        }

        if (control.matches("[data-instruction-word]")) {
          importInstructionWord(control);
        }

        syncPrintValue(
          control
        );

        scheduleSave();
      }
    );

    screen.addEventListener(
      "click",
      event => {
        const saveInstructionButton = event.target.closest("[data-save-instruction]");
        if (saveInstructionButton) {
          saveInstructionEditor(saveInstructionButton);
          return;
        }

        const instructionAckButton = event.target.closest("[data-instruction-ack]");
        if (instructionAckButton) {
          const id = instructionAckButton.dataset.instructionAck;
          const toggle = screen.querySelector(`[data-instruction-toggle="${CSS.escape(id)}"]`);
          if (!toggle?.checked) {
            window.alert("Сначала выберите эту инструкцию.");
            return;
          }
          const ids = acknowledgedInstructionIds();
          ids.add(id);
          syncInstructionAcknowledgements(ids);
          saveDraft(true);
          return;
        }

        const locationListButton = event.target.closest(
          "[data-location-use-list]"
        );
        if (locationListButton) {
          useLocationList(locationListButton);
          return;
        }

        const employeeListButton =
          event.target.closest(
            "[data-employee-use-list]"
          );

        if (employeeListButton) {
          useEmployeeList(employeeListButton);
          return;
        }

        const addRowButton =
          event.target.closest(
            "[data-add-dynamic-row]"
          );

        if (addRowButton) {
          addDynamicRow(
            addRowButton.dataset
              .addDynamicRow
          );

          return;
        }

        const deleteRowButton =
          event.target.closest(
            "[data-delete-dynamic-row]"
          );

        if (deleteRowButton) {
          removeDynamicRow(
            deleteRowButton.dataset
              .deleteDynamicRow,
            deleteRowButton.dataset
              .rowId
          );

          return;
        }

        const collapseButton =
          event.target.closest(
            "[data-collapse-section]"
          );

        if (collapseButton) {
          const sectionId =
            collapseButton.dataset
              .collapseSection;

          setSectionCollapsed(
            sectionId,
            !collapsedOptionalSections.has(
              sectionId
            )
          );

          return;
        }

        const removeSectionButton =
          event.target.closest(
            "[data-remove-section]"
          );

        if (removeSectionButton) {
          removeOptionalSection(
            removeSectionButton.dataset
              .removeSection
          );
        }
      }
    );

    screen
      .querySelector(
        "#workPermitOpenSectionSelector"
      )
      ?.addEventListener(
        "click",
        () => {
          setSectionSelectorVisible(
            !sectionSelectorVisible
          );
        }
      );

    screen
      .querySelector(
        "#workPermitCloseSectionSelector"
      )
      ?.addEventListener(
        "click",
        () => {
          setSectionSelectorVisible(
            false
          );
        }
      );

    screen
      .querySelector(
        "#workPermitAddSelectedSections"
      )
      ?.addEventListener(
        "click",
        addSelectedOptionalSections
      );

    screen
      .querySelector(
        "#workPermitLanguageSelect"
      )
      ?.addEventListener(
        "change",
        event => {
          applyLanguage(
            event.currentTarget.value
          );

          saveDraft(true);
        }
      );

    screen
      .querySelector(
        "#workPermitFinishButton"
      )
      ?.addEventListener(
        "click",
        completePermit
      );

    screen
      .querySelector(
        "#workPermitPrintButton"
      )
      ?.addEventListener(
        "click",
        printPermit
      );

    screen
      .querySelector(
        "#workPermitSharePdfButton"
      )
      ?.addEventListener(
        "click",
        sharePermitPdf
      );

    screen
      .querySelector(
        "#workPermitClearButton"
      )
      ?.addEventListener(
        "click",
        clearForm
      );

    window.addEventListener(
      "beforeprint",
      prepareForPrint
    );

    window.addEventListener(
      "afterprint",
      restoreAfterPrint
    );

    window.addEventListener(
      "beforeunload",
      () => {
        saveDraft(false);
      }
    );
  }

  /*
   * ============================================================
   * 27. СТИЛИ НОВОЙ ЛОГИКИ
   * ============================================================
   */

  function installStyles() {
    if (
      document.querySelector(
        "#workPermitV3Styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "workPermitV3Styles";

    style.textContent = `
      .work-permit-section-constructor {
        margin-bottom: 18px;
        padding: 14px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        background: #f8fafc;
      }

      .work-permit-constructor-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
      }

      .work-permit-constructor-heading h2,
      .work-permit-constructor-heading p {
        margin: 0;
      }

      .work-permit-section-selector {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid #cbd5e1;
      }

      .work-permit-section-options {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(250px, 1fr));
        gap: 10px;
      }

      .work-permit-section-options label {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 10px;
        border: 1px solid #dbe3ea;
        border-radius: 8px;
        background: #fff;
      }

      .work-permit-section-selector-actions,
      .work-permit-optional-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .work-permit-section-selector-actions {
        margin-top: 14px;
      }

      .work-permit-optional-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        padding: 8px 10px;
        border-radius: 7px;
        border: 1px solid #cfe0e6;
        background: #f4f9fb;
      }

      .work-permit-optional-label {
        color: #0b6684;
        font-size: 16px;
      }

      .work-permit-optional-actions button {
        min-height: 38px;
        padding: 7px 13px;
        border: 1px solid #9fc8d5;
        border-radius: 9px;
        background: #fff;
        color: #0b6684;
        font-weight: 700;
        cursor: pointer;
      }

      .work-permit-optional-section > h2 {
        display: none;
      }

      .work-permit-paper.is-print-layout
      .work-permit-optional-section > h2 {
        display: block;
      }

      .work-permit-optional-section[hidden] {
        display: none !important;
      }

      .work-permit-optional-section.is-collapsed
      > :not(.work-permit-optional-toolbar) {
        display: none;
      }

      .work-permit-employee-group {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(210px, 1fr));
        gap: 12px;
      }

      .work-permit-safety-list {
        display: grid;
        gap: 12px;
      }

      .work-permit-safety-item {
        padding: 12px;
        border: 1px solid #dbe3ea;
        border-radius: 12px;
        background: #fbfdfe;
      }

      .work-permit-safety-item.is-enabled {
        border-color: #16a34a;
        background: #f0fdf4;
      }

      .work-permit-safety-check {
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        min-height: 34px;
        cursor: pointer;
      }

      .work-permit-safety-check > input {
        width: 22px;
        height: 22px;
        margin: 0;
        accent-color: #0b7898;
      }

      .work-permit-safety-check > .work-permit-checkbox-mark {
        display: none;
      }

      .work-permit-safety-check strong {
        line-height: 1.35;
      }

      .work-permit-safety-details {
        margin-top: 9px;
        padding-top: 9px;
        border-top: 1px solid #dce9ed;
      }

      .work-permit-safety-details textarea {
        min-height: 46px;
        resize: vertical;
      }

      .work-permit-add-row,
      .work-permit-delete-row {
        margin-top: 10px;
        padding: 7px 12px;
        cursor: pointer;
      }

      .work-permit-row-actions {
        width: 1% !important;
        min-width: 0 !important;
        white-space: nowrap;
        padding: 4px !important;
      }

      .work-permit-table {
        table-layout: auto !important;
      }

      .work-permit-table th.no-print:last-child {
        width: 1% !important;
        padding: 0 !important;
      }

      .work-permit-completion-checks {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        margin: 12px 0;
      }

      .work-permit-checkbox {
        display: inline-flex;
        gap: 8px;
        align-items: center;
      }

      .work-permit-screen {
        background:
          radial-gradient(circle at 8% 0%, rgba(20, 184, 219, .16), transparent 32%),
          linear-gradient(180deg, #edf8fb 0, #f6f8fb 360px, #eef2f6 100%);
      }

      .work-permit-toolbar {
        border: 1px solid rgba(20, 126, 160, .18);
        border-radius: 18px;
        background: rgba(255, 255, 255, .94);
        box-shadow: 0 18px 48px rgba(22, 69, 91, .13);
        backdrop-filter: blur(16px);
      }

      .work-permit-toolbar-actions button,
      .work-permit-add-row,
      .work-permit-extra-details summary {
        min-height: 44px;
        border: 0;
        border-radius: 12px;
        background: #e9f6fa;
        color: #075d78;
        font-weight: 800;
      }

      .work-permit-share-button {
        color: #fff !important;
        background: linear-gradient(135deg, #12a864, #087a49) !important;
        box-shadow: 0 8px 20px rgba(8, 122, 73, .24);
      }

      .work-permit-paper {
        border: 1px solid rgba(24, 91, 113, .13);
        border-radius: 22px;
        box-shadow: 0 24px 70px rgba(24, 65, 84, .13);
      }

      .work-permit-flow {
        position: sticky;
        top: 8px;
        z-index: 8;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin: 0 0 18px;
        padding: 8px;
        border: 1px solid #d5e8ef;
        border-radius: 16px;
        background: rgba(246, 252, 254, .94);
        backdrop-filter: blur(12px);
      }

      .work-permit-flow span {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 38px;
        border-radius: 11px;
        color: #315e70;
        font-size: 12px;
        font-weight: 800;
      }

      .work-permit-flow b {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        color: #fff;
        background: #1286aa;
      }

      .work-permit-section {
        border: 1px solid #dce8ed;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 8px 24px rgba(35, 77, 95, .055);
      }

      .work-permit-section > h2 {
        color: #0b6684;
      }

      .work-permit-safety-item {
        transition: border-color .18s ease, background .18s ease, transform .18s ease;
      }

      .work-permit-safety-item.is-enabled {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(22, 163, 74, .09);
      }

      .work-permit-completed-summary {
        display: grid;
        gap: 14px;
      }

      .work-permit-safety-options,
      .work-permit-instruction-list {
        display: grid;
        gap: 8px;
      }

      .work-permit-safety-options {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .work-permit-safety-options label,
      .work-permit-instruction-select {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid #bdd7df;
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
      }

      .work-permit-safety-options label {
        min-height: 44px;
        padding: 8px 10px;
      }

      .work-permit-safety-options input,
      .work-permit-instruction-select input {
        width: 21px;
        height: 21px;
        flex: 0 0 auto;
        accent-color: #0b7898;
      }

      .work-permit-generated-safety-value {
        display: none;
      }

      .work-permit-instruction-card {
        overflow: hidden;
        border: 1px solid #bed5dd;
        border-radius: 12px;
        background: #f8fcfd;
      }

      .work-permit-instruction-card.is-acknowledged {
        border-color: #45a86d;
        background: #effaf3;
      }

      .work-permit-instruction-card details {
        padding: 0 12px 12px;
      }

      .work-permit-instruction-card summary {
        padding: 10px 0;
        cursor: pointer;
        color: #0b6684;
        font-weight: 700;
      }

      .work-permit-instruction-card li {
        margin: 5px 0;
      }

      .work-permit-instruction-card a {
        color: #075f81;
        font-weight: 700;
      }

      .work-permit-instruction-full-text {
        max-height: 420px;
        overflow: auto;
        padding: 12px;
        border: 1px solid #d4e3e8;
        border-radius: 10px;
        background: #fff;
        line-height: 1.55;
        white-space: pre-wrap;
      }

      .work-permit-instruction-editor {
        display: grid;
        gap: 10px;
        margin-top: 14px;
        padding: 14px;
        border: 2px solid #8fc4d5;
        border-radius: 12px;
        background: #eef8fb;
      }

      .work-permit-instruction-editor h4 {
        margin: 0;
        color: #075f81;
      }

      .work-permit-instruction-editor label {
        display: grid;
        gap: 6px;
        font-weight: 700;
      }

      .work-permit-instruction-editor textarea {
        width: 100%;
        min-height: 180px;
      }

      .work-permit-word-upload {
        padding: 10px;
        border: 1px dashed #6ca9bd;
        border-radius: 10px;
        background: #fff;
      }

      .work-permit-instruction-permissions > div {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        max-height: 260px;
        overflow: auto;
        padding: 10px 0;
      }

      .work-permit-instruction-permissions label {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px;
        border-radius: 7px;
        background: #fff;
      }

      .work-permit-employee-manual,
      .work-permit-employee-back,
      .work-permit-location-manual,
      .work-permit-location-back {
        display: none;
      }

      .work-permit-location-entry {
        display: grid;
        gap: 8px;
      }

      .work-permit-location-entry.is-manual .work-permit-location-choice {
        display: none;
      }

      .work-permit-location-entry.is-manual .work-permit-location-manual {
        display: flex;
      }

      .work-permit-location-entry.is-manual .work-permit-location-back {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
      }

      .work-permit-employee-group.is-manual .work-permit-employee-choice {
        display: none;
      }

      .work-permit-employee-group.is-manual .work-permit-employee-manual {
        display: flex;
      }

      .work-permit-employee-group.is-manual .work-permit-employee-back {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        align-self: end;
      }

      .work-permit-final-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
        padding-top: 16px;
        border-top: 2px solid #cce0e7;
      }

      .work-permit-print-only {
        display: none;
      }

      .work-permit-paper.is-print-layout .work-permit-print-only {
        display: block;
      }

      .work-permit-paper.is-print-layout .work-permit-screen-only {
        display: none;
      }

      .work-permit-paper.is-print-layout .work-permit-generated-safety-value {
        display: block;
      }

      /* Official A4 form based on the retained Word template. */
      .work-permit-paper.is-print-layout {
        width: 177mm !important;
        max-width: 177mm !important;
        margin: 0 !important;
        overflow: visible !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: #fff !important;
        color: #000 !important;
        box-shadow: none !important;
        font-family: Calibri, Arial, sans-serif !important;
        font-size: 9pt !important;
      }

      .work-permit-paper.is-print-layout .no-print,
      .work-permit-paper.is-print-layout .work-permit-flow,
      .work-permit-paper.is-print-layout .work-permit-instruction-list,
      .work-permit-paper.is-print-layout .work-permit-safety-options,
      .work-permit-paper.is-print-layout .work-permit-safety-details > small,
      .work-permit-paper.is-print-layout .work-permit-field-hint,
      .work-permit-paper.is-print-layout .work-permit-reminder,
      .work-permit-paper.is-print-layout .work-permit-reminder-show,
      .work-permit-paper.is-print-layout .work-permit-field:has([name="created_at"]) {
        display: none !important;
      }

      .work-permit-paper.is-print-layout input,
      .work-permit-paper.is-print-layout textarea,
      .work-permit-paper.is-print-layout select {
        display: none !important;
      }

      .work-permit-paper.is-print-layout .work-permit-print-value {
        display: block !important;
        min-height: 5mm;
        padding: .8mm .4mm;
        border: 0 !important;
        border-bottom: .7pt solid #000 !important;
        border-radius: 0 !important;
        background: #fff !important;
        color: #000 !important;
        font-family: Calibri, Arial, sans-serif !important;
        font-size: 8.5pt !important;
        font-weight: 400 !important;
        line-height: 1.2 !important;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .work-permit-paper.is-print-layout .work-permit-document-head {
        padding: 0 0 3mm !important;
        border: 0 !important;
        border-bottom: 1pt solid #000 !important;
        border-radius: 0 !important;
        background: #fff !important;
      }

      .work-permit-paper.is-print-layout .work-permit-company {
        padding-bottom: 1.5mm !important;
        border-color: #000 !important;
        color: #000 !important;
        font-size: 8.5pt !important;
      }

      .work-permit-paper.is-print-layout .work-permit-title-row {
        align-items: end !important;
        padding-top: 2mm !important;
      }

      .work-permit-paper.is-print-layout .work-permit-title-row h1 {
        color: #000 !important;
        font-size: 16pt !important;
        line-height: 1.05 !important;
      }

      .work-permit-paper.is-print-layout .work-permit-title-row p {
        color: #000 !important;
        font-size: 9pt !important;
      }

      .work-permit-paper.is-print-layout .work-permit-head-fields {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        width: 70mm !important;
        gap: 2mm !important;
      }

      .work-permit-paper.is-print-layout .work-permit-section {
        padding: 2.4mm 0 !important;
        border: 0 !important;
        border-bottom: .5pt solid #555 !important;
        border-radius: 0 !important;
        background: #fff !important;
        box-shadow: none !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .work-permit-paper.is-print-layout .work-permit-section-long,
      .work-permit-paper.is-print-layout .work-permit-safety-section {
        break-inside: auto;
        page-break-inside: auto;
      }

      .work-permit-paper.is-print-layout .work-permit-section > h2 {
        display: block !important;
        margin: 0 0 1.4mm !important;
        color: #000 !important;
        font-size: 10pt !important;
        line-height: 1.2 !important;
      }

      .work-permit-paper.is-print-layout .work-permit-grid {
        gap: 1.8mm !important;
      }

      .work-permit-paper.is-print-layout .work-permit-field {
        gap: .7mm !important;
        color: #000 !important;
        font-size: 7.5pt !important;
      }

      .work-permit-paper.is-print-layout .work-permit-table-wrap {
        overflow: visible !important;
        border: 0 !important;
        border-radius: 0 !important;
      }

      .work-permit-paper.is-print-layout .work-permit-table,
      .work-permit-paper.is-print-layout .work-permit-team-table,
      .work-permit-paper.is-print-layout .work-permit-break-table {
        display: table !important;
        width: 100% !important;
        min-width: 0 !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
      }

      .work-permit-paper.is-print-layout .work-permit-table th,
      .work-permit-paper.is-print-layout .work-permit-table td {
        display: table-cell !important;
        width: auto !important;
        padding: .8mm !important;
        border: .7pt solid #000 !important;
        border-radius: 0 !important;
        background: #fff !important;
        color: #000 !important;
        font-size: 6.8pt !important;
        line-height: 1.12 !important;
        vertical-align: middle !important;
        box-shadow: none !important;
      }

      .work-permit-paper.is-print-layout
      .work-permit-optional-section[hidden],
      .work-permit-paper.is-print-layout
      .work-permit-table th.no-print,
      .work-permit-paper.is-print-layout
      .work-permit-table td.no-print {
        display: none !important;
      }

      .work-permit-paper.is-print-layout .work-permit-table .work-permit-print-value {
        min-height: 4.5mm;
        padding: .4mm;
        border: 0 !important;
        font-size: 6.8pt !important;
      }

      .work-permit-paper.is-print-layout .work-permit-safety-list {
        gap: 0 !important;
      }

      .work-permit-paper.is-print-layout .work-permit-safety-item {
        padding: 1mm 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: #fff !important;
        box-shadow: none !important;
        transform: none !important;
      }

      .work-permit-paper.is-print-layout .work-permit-safety-check {
        grid-template-columns: 6mm minmax(0, 1fr);
        min-height: 0 !important;
        color: #000 !important;
        font-size: 8pt !important;
      }

      .work-permit-paper.is-print-layout .work-permit-safety-details {
        margin: .6mm 0 0 6mm !important;
        padding: 0 !important;
        border: 0 !important;
      }

      .work-permit-paper.is-print-layout .work-permit-completion-checks {
        color: #000 !important;
      }

      [data-optional-section="completedMeasures"] > .work-permit-table-wrap,
      [data-optional-section="completedMeasures"] > .work-permit-add-row {
        display: none !important;
      }

      [name="completed_measures_summary"] {
        min-height: 132px;
        border-color: #92d5b0 !important;
        background: #f0fbf5 !important;
        color: #145f3b;
        font-weight: 700;
      }

      .work-permit-extra-details {
        border: 1px dashed #a9cbd7;
        border-radius: 13px;
        padding: 8px;
        background: #f8fcfd;
      }

      .work-permit-extra-details summary {
        display: flex;
        align-items: center;
        width: max-content;
        padding: 0 14px;
        cursor: pointer;
        list-style: none;
      }

      .work-permit-extra-details[open] textarea {
        margin-top: 10px;
      }

      [name="start_producer"],
      [name="start_admitter"],
      [name="permit_returned"],
      [name="permit_accepted"] {
        border-color: #9ad1e1 !important;
        background: #f0f9fc !important;
      }

      @media print {
        .work-permit-optional-section > h2 {
          display: block !important;
        }

        .work-permit-generated-safety-value {
          display: block !important;
        }

        .work-permit-employee-choice,
        .work-permit-employee-back,
        .work-permit-location-back {
          display: none !important;
        }

        .work-permit-employee-manual {
          display: flex !important;
        }

        .work-permit-location-entry:not(.is-manual) .work-permit-location-manual,
        .work-permit-location-entry.is-manual .work-permit-location-choice {
          display: none !important;
        }

        .work-permit-location-entry.is-manual .work-permit-location-manual {
          display: flex !important;
        }
        .work-permit-print-only {
          display: block !important;
        }

        .work-permit-screen-only {
          display: none !important;
        }

        .work-permit-optional-section.is-collapsed
        > :not(.work-permit-optional-toolbar):not(h2) {
          display: block !important;
        }
      }

      @media (max-width: 700px) {
        .work-permit-screen {
          margin: 0 !important;
          padding: 6px 6px calc(104px + env(safe-area-inset-bottom));
        }

        .work-permit-final-actions {
          position: sticky;
          z-index: 12;
          bottom: calc(68px + env(safe-area-inset-bottom));
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 9px;
          border: 1px solid rgba(15, 112, 142, .2);
          border-radius: 16px;
          background: rgba(248, 253, 255, .96);
          box-shadow: 0 12px 32px rgba(8, 49, 67, .2);
          backdrop-filter: blur(14px);
        }

        .work-permit-final-actions #workPermitFinishButton {
          grid-column: 1 / -1;
        }

        .work-permit-final-actions button {
          min-width: 0;
          min-height: 48px;
          padding: 9px 7px;
          font-size: 13px;
        }

        .work-permit-instruction-permissions > div {
          grid-template-columns: 1fr;
        }

        .work-permit-paper {
          border: 0;
          border-radius: 18px;
          box-shadow: 0 12px 32px rgba(24, 65, 84, .1);
        }

        .work-permit-flow {
          position: sticky;
          z-index: 8;
          top: 61px;
          grid-template-columns: repeat(4, minmax(66px, 1fr));
          gap: 4px;
          overflow-x: auto;
          padding: 6px;
          border-radius: 13px;
          box-shadow: 0 8px 22px rgba(10, 65, 85, .13);
        }

        .work-permit-flow span {
          flex-direction: column;
          justify-content: center;
          gap: 1px;
          min-height: 46px;
          padding: 3px;
          font-size: 9px;
          text-align: center;
        }

        .work-permit-toolbar-actions {
          position: static;
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
          padding: 8px;
          border: 1px solid rgba(13, 100, 126, .2);
          border-radius: 17px;
          background: rgba(255, 255, 255, .96);
          box-shadow: 0 16px 44px rgba(10, 48, 65, .28);
          backdrop-filter: blur(18px);
        }

        .work-permit-toolbar-actions label {
          display: none;
        }

        .work-permit-toolbar-actions button {
          min-width: 0;
          min-height: 48px;
          padding: 6px;
          font-size: 10px;
          line-height: 1.15;
        }

        .work-permit-section {
          margin: 7px;
          padding: 14px 12px;
          border-radius: 15px;
        }

        .work-permit-grid,
        .work-permit-employee-group {
          grid-template-columns: 1fr !important;
        }

        .work-permit-safety-check {
          align-items: center;
          min-height: 58px;
          padding: 10px;
        }

        .work-permit-safety-check > input {
          width: 26px;
          height: 26px;
        }

        .work-permit-safety-check strong {
          font-size: 14px;
          line-height: 1.35;
        }

        .work-permit-safety-options {
          grid-template-columns: 1fr;
        }

        .work-permit-add-row {
          width: 100%;
          min-height: 48px;
        }

        .work-permit-responsive-table tbody tr {
          margin-bottom: 12px;
          border: 1px solid #d9e7ec;
          border-radius: 14px;
          background: #fbfdfe;
          box-shadow: 0 6px 18px rgba(27, 73, 91, .06);
        }

        .work-permit-responsive-table td,
        .work-permit-responsive-table th {
          padding: 9px !important;
        }

        .work-permit-constructor-heading {
          align-items: stretch;
          flex-direction: column;
        }

        .work-permit-section-options {
          grid-template-columns: 1fr;
        }

        .work-permit-optional-toolbar {
          align-items: center;
          flex-direction: row;
          gap: 8px;
        }

        .work-permit-optional-label {
          flex: 1 1 auto;
          font-size: 15px;
        }

        .work-permit-optional-actions button {
          min-height: 42px;
          padding: 8px 12px;
          white-space: nowrap;
        }

        .work-permit-row-actions.work-permit-empty-cell {
          display: none !important;
        }
      }
    `;

    document.head.append(
      style
    );
  }

  /*
   * ============================================================
   * 28. ЗАПУСК
   * ============================================================
   */

  async function activate() {
    const nextDraftOwnerKey = draftOwnerKey();
    if (activeDraftOwnerKey !== nextDraftOwnerKey) {
      resetRuntimeForDraftOwner();
      activeDraftOwnerKey = nextDraftOwnerKey;
    }
    await loadInstructionRecords();
    await restoreDraft();
    applyLanguage(language);
    updateOptionalSectionsUi();
    updateSafetyMeasuresUi();
    growAllTextareas();
    syncAllPrintValues();
    bindEvents();
    saveDraft(false);
  }

  async function initialize() {
    installStyles();

    permitState.createdBy =
      getCurrentUser();

    permitState.issuer =
      getCurrentUser();

    permitState.createdAt =
      currentIsoDateTime();

    ensureInitialDynamicRows();

    activeDraftOwnerKey = draftOwnerKey();

    await loadInstructionRecords();
    await restoreDraft();

    applyLanguage(language);
    bindEvents();
    saveDraft(false);
  }

  initialize();

  window.PprWorkPermit = {
    activate,
    print: printPermit,
    complete: completePermit,
    clear: clearForm,

    subtitle: () =>
      text("screenTitle"),

    language: () =>
      language,

    state: () => ({
      ...collectPermitState(),

      activeOptionalSections: [
        ...activeOptionalSections
      ],

      dynamicRows:
        serializeDynamicRows(),

      safetyMeasures:
        selectedSafetyMeasures()
    })
  };
})();
