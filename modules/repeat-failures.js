(function () {
  const root = window.PPRModules ||= {};

  function metadata(entry) {
    return {
      repeatFailureCode: String(entry.repeatFailureCode || ""),
      repeatFailureName: String(entry.repeatFailureName || ""),
      repeatFailureMarkedAt: String(entry.repeatFailureMarkedAt || "")
    };
  }

  function buildAnalysis(events, annualStats) {
    const repeatedMap = new Map();
    events
      .filter(event => ["remark", "breakdown"].includes(event.type))
      .forEach(event => {
        const created = new Date(event.createdAt || "");
        if (Number.isNaN(created.getTime())) return;
        const manualCode = String(event.repeatFailureCode || "").trim();
        if (!/^[1-9]\d{0,5}$/.test(manualCode)) return;
        const key = `manual|${Number(event.equipmentId) || 0}|${manualCode}`;
        const item = repeatedMap.get(key) || {
          groupKey: key,
          manualCode,
          equipmentId: Number(event.equipmentId) || 0,
          name: "",
          namedAt: "",
          area: event.area || "",
          equipment: event.equipment || "",
          node: event.node || "",
          count: 0,
          breakdowns: 0,
          remarks: 0,
          downtimeMs: 0,
          lastAt: "",
          texts: [],
          events: []
        };
        item.count += 1;
        if (event.repeatFailureName && (!item.name || String(event.repeatFailureMarkedAt || "") > item.namedAt)) {
          item.name = String(event.repeatFailureName);
          item.namedAt = String(event.repeatFailureMarkedAt || "");
        }
        if (event.type === "breakdown") {
          item.breakdowns += 1;
          item.downtimeMs += Number(event.durationMs || 0);
        } else {
          item.remarks += 1;
        }
        if (String(event.createdAt || "") > String(item.lastAt || "")) item.lastAt = event.createdAt || "";
        if (event.text && !item.texts.includes(event.text) && item.texts.length < 3) item.texts.push(event.text);
        item.events.push(event);
        if (item.node !== (event.node || "")) item.node = "Несколько узлов";
        repeatedMap.set(key, item);
      });
    const repeatedBreakdowns = [...repeatedMap.values()]
      .filter(item => item.count >= 2)
      .map(item => ({ ...item, events: item.events.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))) }))
      .sort((a, b) => b.count - a.count || b.downtimeMs - a.downtimeMs || a.equipment.localeCompare(b.equipment, "ru"));
    const employeeRating = annualStats.workers
      .filter(worker => worker.closed || worker.installs || worker.downtimeClosed)
      .sort((a, b) => b.closed - a.closed || b.installs - a.installs || (b.kpd ?? 0) - (a.kpd ?? 0) || a.name.localeCompare(b.name, "ru"))
      .slice(0, 12);
    return { repeatedBreakdowns, employeeRating };
  }

  function journalTitle(group = {}) {
    if (group.manualCode) return `Повторные неисправности №${group.manualCode}${group.name ? " — " + group.name : ""}`;
    return `Повторные поломки: ${group.equipment || "Оборудование"} · ${group.node || "узел не указан"}`;
  }

  function journalHtml(group = {}, year, helpers) {
    const { escapeHtml, dateTimeHuman, durationText, requestRoleLabel } = helpers;
    const code = String(group.manualCode || "").trim();
    const events = (Array.isArray(group.events) ? group.events : []).filter(event =>
      /^[1-9]\d{0,5}$/.test(code) && String(event.repeatFailureCode || "").trim() === code
      && (group.equipmentId == null || Number(event.equipmentId) === group.equipmentId)
      && ["remark", "breakdown"].includes(event.type));
    const person = (name, role) => [name, role ? requestRoleLabel(role) : ""].filter(Boolean).join(" · ");
    const sheets = [];
    for (let offset = 0; offset < events.length; offset += 10) sheets.push(events.slice(offset, offset + 10));
    if (!sheets.length) sheets.push([]);
    const header = '<thead><tr><th rowspan="2">№ п/п</th><th rowspan="2">Наименование узла, в котором обнаружен дефект</th><th rowspan="2">Дата осмотра или ревизии</th><th rowspan="2">Краткая характеристика дефекта</th><th rowspan="2">Подпись лица, производившего осмотр</th><th rowspan="2">Дата ремонта</th><th rowspan="2">Перечень работ, выполненных для устранения дефектов</th><th colspan="2">Результат устранения</th></tr><tr><th>Время устранения замечания</th><th>Кто устранил / кто подтвердил</th></tr></thead>';
    return `<article class="repeat-failure-journal-print"><header><h2>${escapeHtml(journalTitle(group))}</h2><p>${year == null ? "За весь период" : escapeHtml(String(year)) + " год"} · ${events.length} записей · Простой: ${escapeHtml(durationText(events.filter(event => event.type === "breakdown").reduce((sum, event) => sum + Number(event.durationMs || 0), 0)))}</p></header>${sheets.map((sheet, sheetIndex) => `<section class="repeat-journal-sheet"><div class="aggregate-sheet-head"><strong>Агрегатный журнал: ${escapeHtml(group.equipment || "Оборудование")}</strong><span>Лист № ${sheetIndex + 1}</span></div><div class="repeat-journal-table-wrap"><table class="aggregate-journal-table repeat-journal-table"><colgroup>${[4, 14, 9, 17, 10, 9, 16, 9, 12].map(width => `<col style="width:${width}%">`).join("")}</colgroup>${header}<tbody>${sheet.length ? sheet.map((event, index) => {
      const participants = (event.ratingParticipants || []).map(entry => person(entry.name, entry.role)).filter(Boolean);
      const resolver = [...new Set(participants)].join(", ") || person(event.resolvedByName, event.resolvedByRole);
      const confirmer = person(event.confirmedByName, event.confirmedByRole);
      const resolution = [resolver ? `Устранили: ${resolver}` : "", confirmer ? `Подтвердил: ${confirmer}${event.confirmedAt ? " · " + dateTimeHuman(event.confirmedAt) : ""}` : ""].filter(Boolean).join("\n");
      return `<tr><td>${sheetIndex * 10 + index + 1}</td><td>${escapeHtml(event.equipment || group.equipment || "-")}<br>${escapeHtml(event.node || "-")}</td><td>${escapeHtml(dateTimeHuman(event.createdAt))}</td><td>${escapeHtml((event.type === "breakdown" ? "Поломка: " : "Замечание: ") + (event.text || "Без комментария"))}${event.correctedDefectText ? `<br><b>Исправленный комментарий:</b> ${escapeHtml(event.correctedDefectText)}` : ""}</td><td>${escapeHtml(person(event.authorName, event.authorRole))}</td><td>${event.resolvedAt ? escapeHtml(dateTimeHuman(event.resolvedAt)) : ""}</td><td>${escapeHtml(event.resolvedComment || (event.resolvedAt ? "Устранено" : ""))}${event.correctedResolvedComment ? `<br><b>Исправленная запись:</b> ${escapeHtml(event.correctedResolvedComment)}` : ""}</td><td>${event.durationMs ? escapeHtml(durationText(event.durationMs)) : ""}</td><td>${escapeHtml(resolution)}</td></tr>`;
    }).join("") : '<tr><td colspan="9">Нет отмеченных записей</td></tr>'}</tbody></table></div></section>`).join("")}</article>`;
  }

  function printJournal(group, year, helpers) {
    const popup = window.open("", "_blank", "width=1400,height=900");
    if (!popup) return window.alert("Разрешите всплывающие окна для печати журнала.");
    popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${helpers.escapeHtml(journalTitle(group))}</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#111827}header{display:flex;justify-content:space-between;border-bottom:2px solid #111827;margin-bottom:10px;padding-bottom:8px}header span{font-size:11px;text-transform:uppercase}h2{margin:3px 0 5px;font-size:20px}p{margin:0;font-size:11px;color:#475569}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #64748b;padding:5px;font-size:9px;vertical-align:top;overflow-wrap:anywhere}th{background:#e2e8f0;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}.aggregate-sheet-head{display:flex;justify-content:space-between;margin:8px 0;font-size:11px}.repeat-journal-sheet{break-after:page}.repeat-journal-sheet:last-child{break-after:auto}.repeat-journal-table-wrap{overflow:visible}td{white-space:pre-line}</style></head><body>${journalHtml(group, year, helpers)}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    helpers.finalizeJournalPopup(popup);
  }

  function openJournal(group, year, helpers) {
    document.querySelector("#repeatFailureJournalModal")?.remove();
    const modal = document.createElement("div");
    modal.id = "repeatFailureJournalModal";
    modal.className = "repeat-failure-journal-modal";
    modal.innerHTML = `<div class="repeat-failure-journal-backdrop" data-close-repeat-journal></div><section role="dialog" aria-modal="true" aria-label="Журнал повторных поломок"><div class="repeat-failure-journal-actions"><button type="button" data-print-repeat-journal>Печать / PDF</button><button type="button" class="secondary" data-close-repeat-journal>Закрыть</button></div>${journalHtml(group, year, helpers)}</section>`;
    document.body.append(modal);
    modal.querySelectorAll("[data-close-repeat-journal]").forEach(button => button.addEventListener("click", () => modal.remove()));
    modal.querySelector("[data-print-repeat-journal]")?.addEventListener("click", () => printJournal(group, year, helpers));
  }

  async function saveCode(item, code, helpers, name = "") {
    const result = await helpers.apiJson("/api/repeat-failure-group", { method: "POST", timeout: 20000, body: JSON.stringify({ name, actionId: helpers.nextActionId(), clientId: helpers.clientId, sourceType: item.sourceType, downtimeId: item.downtimeId || "", recordKey: item.recordKey || "", remarkId: item.remarkId || "", code: String(code || "").trim() }) });
    if (result?.state) helpers.mergeRealtimePatch(result.state);
    if (result?.stateVersion) helpers.setRealtimeStateVersion(result.stateVersion);
    helpers.persist();
    return result;
  }

  function bindAggregateEditors(container, items, helpers) {
    container.querySelectorAll("[data-save-repeat-failure]").forEach(button => button.addEventListener("click", event => helpers.runButtonOperation(event.currentTarget, async () => {
      const item = items.find(entry => String(entry.id) === String(event.currentTarget.dataset.saveRepeatFailure || ""));
      const code = String(event.currentTarget.closest(".repeat-failure-editor")?.querySelector("[data-repeat-failure-code]")?.value || "").trim();
      const name = String(event.currentTarget.closest(".repeat-failure-editor")?.querySelector("[data-repeat-failure-name]")?.value || "").trim();
      if (!item) throw new Error("repeat_failure_not_found");
      if (code && !/^[1-9]\d{0,5}$/.test(code)) return helpers.showAppToast("Введите номер группы от 1 до 999999.", "error");
      if (name && !code) return helpers.showAppToast("Укажите номер для названия поломки.", "error");
      await saveCode(item, code, helpers, name);
      helpers.showAppToast(code ? `Запись добавлена в группу №${code}.` : "Запись исключена из группы.", "ok");
      helpers.render();
    }, "Сохраняем...")));
    container.querySelectorAll("[data-clear-repeat-failure]").forEach(button => button.addEventListener("click", event => helpers.runButtonOperation(event.currentTarget, async () => {
      const item = items.find(entry => String(entry.id) === String(event.currentTarget.dataset.clearRepeatFailure || ""));
      if (!item) throw new Error("repeat_failure_not_found");
      await saveCode(item, "", helpers);
      helpers.showAppToast("Запись исключена из группы.", "ok");
      helpers.render();
    }, "Снимаем...")));
  }

  root.repeatFailures = { metadata, buildAnalysis, journalTitle, journalHtml, printJournal, openJournal, saveCode, bindAggregateEditors };
})();
