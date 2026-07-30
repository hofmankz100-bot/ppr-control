(() => {
  "use strict";

  const modes = [
    {
      id: "shear-down",
      code: "LE2 / Q10.2",
      name: "Опускание ножниц",
      group: "Клапанная панель ножниц",
      purpose: "Направляет масло в полость опускания гидроцилиндра ножниц.",
      pressure: "До 25 МПа по настройке контура",
      x: 9.8, y: 27.2,
      pressurePaths: ["M740 1460 L740 705 L355 705 L355 555 L255 555 L255 455", "M255 455 L255 330 L265 330"],
      returnPaths: ["M320 455 L320 620 L150 620 L150 705"]
    },
    {
      id: "shear-up",
      code: "LE3 / Q10.3",
      name: "Подъём ножниц",
      group: "Клапанная панель ножниц",
      purpose: "Переключает поток на обратный ход цилиндра и поднимает ножницы.",
      pressure: "До 25 МПа по настройке контура",
      x: 12.4, y: 27.2,
      pressurePaths: ["M740 1460 L740 705 L355 705 L355 555 L320 555 L320 455", "M320 455 L320 330 L265 330"],
      returnPaths: ["M255 455 L255 620 L150 620 L150 705"]
    },
    {
      id: "container-open",
      code: "LE2 / Q9.4",
      name: "Открытие контейнера",
      group: "Клапанная панель контейнера",
      purpose: "Подаёт масло на открытие замка и движение контейнера в положение «Открыто».",
      pressure: "Контур контейнера",
      x: 39.4, y: 27.2,
      pressurePaths: ["M1410 1470 L1410 850 L1160 850 L1160 700 L1025 700 L1025 475", "M1025 475 L1025 330 L1210 330"],
      returnPaths: ["M1100 475 L1100 650 L940 650 L940 705"]
    },
    {
      id: "container-close",
      code: "LE7 / Q9.2",
      name: "Закрытие контейнера",
      group: "Клапанная панель контейнера",
      purpose: "Направляет поток на закрытие контейнера и его фиксацию.",
      pressure: "Контур контейнера",
      x: 57.1, y: 27.2,
      pressurePaths: ["M1410 1470 L1410 850 L1460 850 L1460 700 L1485 700 L1485 475", "M1485 475 L1485 330 L1350 330"],
      returnPaths: ["M1410 475 L1410 650 L1530 650 L1530 705"]
    },
    {
      id: "ram-forward",
      code: "LE2 / Q8.2",
      name: "Главный цилиндр вперёд",
      group: "Главная клапанная панель",
      purpose: "Подаёт масло в рабочую полость главного цилиндра для движения прессующей плиты вперёд.",
      pressure: "Основной контур высокого давления",
      x: 73.4, y: 27.3,
      pressurePaths: ["M1410 1470 L1410 850 L1710 850 L1710 705 L1900 705 L1900 480", "M1900 480 L1900 330 L1860 330 L1860 175"],
      returnPaths: ["M2070 480 L2070 620 L1710 620 L1710 705"]
    },
    {
      id: "ram-backward",
      code: "LE3 / Q8.0",
      name: "Главный цилиндр назад",
      group: "Главная клапанная панель",
      purpose: "Переключает поток на обратный ход главного цилиндра.",
      pressure: "Основной контур высокого давления",
      x: 80.2, y: 27.3,
      pressurePaths: ["M1410 1470 L1410 850 L1710 850 L1710 705 L2070 705 L2070 480", "M2070 480 L2070 330 L2010 330 L2010 175"],
      returnPaths: ["M1900 480 L1900 620 L1710 620 L1710 705"]
    },
    {
      id: "ram-release",
      code: "LE6 / Q8.5",
      name: "Сброс давления главного цилиндра",
      group: "Главная клапанная панель",
      purpose: "Соединяет рабочую линию со сливом и безопасно снижает давление.",
      pressure: "Разгрузка в бак",
      x: 89.7, y: 27.3,
      pressurePaths: ["M2250 480 L2250 560"],
      returnPaths: ["M2250 560 L2250 705 L2320 705"]
    },
    {
      id: "main-pump",
      code: "P1",
      name: "Главный насос",
      group: "Насосная станция",
      purpose: "Создаёт основной поток масла для главного цилиндра и клапанных панелей.",
      pressure: "Номинальная линия высокого давления",
      x: 54.3, y: 80.2,
      pressurePaths: ["M1410 1470 L1410 850 L1710 850 L1710 705"],
      returnPaths: ["M1510 1470 L1510 1585"]
    },
    {
      id: "aux-pump",
      code: "P2",
      name: "Вспомогательный насос",
      group: "Насосная станция",
      purpose: "Питает вспомогательные контуры ножниц и контейнера.",
      pressure: "Вспомогательная линия",
      x: 28.4, y: 80.3,
      pressurePaths: ["M740 1470 L740 850 L1160 850"],
      returnPaths: ["M830 1470 L830 1600"]
    }
  ];

  const viewport = document.querySelector("#diagramViewport");
  const stage = document.querySelector("#diagramStage");
  const hotspotLayer = document.querySelector("#hotspotLayer");
  const pressureGroup = document.querySelector("#pressurePaths");
  const returnGroup = document.querySelector("#returnPaths");
  const modeList = document.querySelector("#modeList");
  const detailCard = document.querySelector("#detailCard");
  const zoomValue = document.querySelector("#zoomValue");
  const pointers = new Map();
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let dragStart = null;
  let pinchStart = null;

  function pathMarkup(paths) {
    return paths.map(d => `<path d="${d}"></path>`).join("");
  }

  function renderModes() {
    modeList.innerHTML = modes.map(mode => `
      <button type="button" class="mode-button" data-mode="${mode.id}">
        <strong>${mode.name}</strong>
        <small>${mode.code} · ${mode.group}</small>
      </button>
    `).join("");
    hotspotLayer.innerHTML = modes.map(mode => `
      <button type="button" class="valve-hotspot" style="left:${mode.x}%;top:${mode.y}%" data-mode="${mode.id}" data-code="${mode.code}" aria-label="${mode.name}"></button>
    `).join("");
    document.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        activateMode(button.dataset.mode);
      });
    });
  }

  function activateMode(id) {
    const mode = modes.find(item => item.id === id);
    if (!mode) return;
    pressureGroup.innerHTML = pathMarkup(mode.pressurePaths);
    returnGroup.innerHTML = pathMarkup(mode.returnPaths);
    document.querySelectorAll("[data-mode]").forEach(element => {
      element.classList.toggle("active", element.dataset.mode === id);
    });
    detailCard.classList.add("active");
    detailCard.innerHTML = `
      <span class="detail-code">${mode.code}</span>
      <h2>${mode.name}</h2>
      <p>${mode.purpose}</p>
      <dl>
        <div><dt>Узел</dt><dd>${mode.group}</dd></div>
        <div><dt>Давление</dt><dd>${mode.pressure}</dd></div>
        <div><dt>Красная линия</dt><dd>Подача масла</dd></div>
        <div><dt>Синяя линия</dt><dd>Слив в бак</dd></div>
      </dl>
    `;
  }

  function resetFlow() {
    pressureGroup.innerHTML = "";
    returnGroup.innerHTML = "";
    document.querySelectorAll("[data-mode]").forEach(element => element.classList.remove("active"));
    detailCard.classList.remove("active");
    detailCard.innerHTML = `
      <span class="detail-code">Выбор элемента</span>
      <h2>Нажмите клапан</h2>
      <p>Приложение покажет назначение и учебный маршрут движения масла.</p>
    `;
  }

  function applyTransform() {
    stage.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
    zoomValue.textContent = `${Math.round(scale * 100)}%`;
  }

  function fitView() {
    const rect = viewport.getBoundingClientRect();
    scale = Math.min(rect.width / 2600, rect.height / 1836) * .96;
    offsetX = (rect.width - 2600 * scale) / 2;
    offsetY = (rect.height - 1836 * scale) / 2;
    applyTransform();
  }

  function zoomAt(nextScale, clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const clamped = Math.min(2.8, Math.max(.22, nextScale));
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const worldX = (x - offsetX) / scale;
    const worldY = (y - offsetY) / scale;
    scale = clamped;
    offsetX = x - worldX * scale;
    offsetY = y - worldY * scale;
    applyTransform();
  }

  viewport.addEventListener("wheel", event => {
    event.preventDefault();
    zoomAt(scale * (event.deltaY < 0 ? 1.12 : .89), event.clientX, event.clientY);
  }, { passive: false });

  viewport.addEventListener("pointerdown", event => {
    pointers.set(event.pointerId, event);
    viewport.setPointerCapture(event.pointerId);
    if (pointers.size === 1) {
      dragging = true;
      dragStart = { x: event.clientX, y: event.clientY, offsetX, offsetY };
      viewport.classList.add("dragging");
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        scale,
        centerX: (a.clientX + b.clientX) / 2,
        centerY: (a.clientY + b.clientY) / 2
      };
    }
  });

  viewport.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, event);
    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      zoomAt(pinchStart.scale * distance / Math.max(pinchStart.distance, 1), pinchStart.centerX, pinchStart.centerY);
      return;
    }
    if (!dragging || !dragStart || pointers.size !== 1) return;
    offsetX = dragStart.offsetX + event.clientX - dragStart.x;
    offsetY = dragStart.offsetY + event.clientY - dragStart.y;
    applyTransform();
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (!pointers.size) {
      dragging = false;
      dragStart = null;
      viewport.classList.remove("dragging");
    }
  }

  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);
  document.querySelector("#zoomIn").addEventListener("click", () => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(scale * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  document.querySelector("#zoomOut").addEventListener("click", () => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(scale / 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  document.querySelector("#fitView").addEventListener("click", fitView);
  document.querySelector("#resetFlow").addEventListener("click", resetFlow);
  window.addEventListener("resize", fitView);

  renderModes();
  requestAnimationFrame(fitView);
})();
