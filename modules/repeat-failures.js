(function () {
  const root = window.PPRModules ||= {};
  const measureDrafts = new Map();
  const measureSaves = new Set();

  function attribution(label, name, at, escapeHtml) {
    const date = at ? new Date(at) : null;
    const time = date && Number.isFinite(date.getTime()) ? date.toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
    return `<small class="repeat-measures-attribution">${escapeHtml(label)}: ${escapeHtml(name || "не указан")}${time ? `<br>${escapeHtml(time)}` : ""}</small>`;
  }

  function measuresCell(group, saved, printable, canEdit, escapeHtml) {
    const text = String(saved?.text || "");
    const author = saved?.textUpdatedByName ?? (!saved?.completedAt ? saved?.updatedByName : "");
    const authorAt = saved?.textUpdatedAt || (!saved?.completedAt ? saved?.updatedAt : "");
    const signature = text || author ? attribution("Текст сохранил", author, authorAt, escapeHtml) : "";
    if (printable || !canEdit || saved?.completedAt) return `<span class="repeat-measures-text">${escapeHtml(text || "—").replace(/\n/g, "<br>")}</span>${signature}`;
    const draft = measureDrafts.get(group.groupKey);
    return `<div class="repeat-measures-editor" data-repeat-measures-key="${escapeHtml(group.groupKey)}" data-equipment-id="${group.equipmentId}" data-cycle-number="${draft?.cycleNumber ?? saved?.cycleNumber ?? 0}" data-repeat-code="${escapeHtml(group.manualCode)}" data-measures-updated-at="${escapeHtml(draft?.expectedUpdatedAt ?? saved?.updatedAt ?? "")}"><textarea rows="2" maxlength="2000" aria-label="Мероприятия" placeholder="Что нужно сделать" data-repeat-measures>${escapeHtml(draft?.text ?? text)}</textarea><button type="button" class="no-print" data-save-repeat-measures ${measureSaves.has(group.groupKey) ? "disabled" : ""}>Сохранить</button><button type="button" class="no-print" data-cancel-repeat-measures>Отменить правки</button>${signature}</div>`;
  }

  function completionCell(group, saved, printable, canEdit, escapeHtml) {
    if (saved?.completedAt) return `<span class="repeat-measures-completed">☑ Выполнено${attribution("Подтвердил", saved.completedByName, saved.completedAt, escapeHtml)}</span>`;
    if (printable || !canEdit) return "Не выполнено";
    return `<button type="button" role="checkbox" aria-checked="false" aria-label="Мероприятия выполнены" class="repeat-measures-complete no-print" data-complete-repeat-measures="${escapeHtml(group.groupKey)}" data-equipment-id="${group.equipmentId}" data-cycle-number="${saved?.cycleNumber || 0}" data-repeat-code="${escapeHtml(group.manualCode)}" data-measures-updated-at="${escapeHtml(saved?.updatedAt || "")}" data-saved-measures="${escapeHtml(saved?.text || "")}">☐ Выполнено</button>`;
  }

  function isClosed(item) {
    return Boolean(item.repeatFailureClosedAt || item.repeatFailureCycleId);
  }

  function groupMeasures(group, catalog) {
    const equipment = catalog?.equipment?.[String(group.equipmentId)];
    return (group.cycleId ? equipment?.repeatFailureArchives?.[group.cycleId] : equipment?.repeatFailureMeasures?.[group.manualCode]) || {};
  }

  function bindMeasures(container, helpers) {
    container.querySelectorAll("[data-complete-repeat-measures]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.completeRepeatMeasures;
      if (!(button.dataset.savedMeasures || "").trim() || (measureDrafts.has(key) && measureDrafts.get(key).text.trim() !== button.dataset.savedMeasures.trim())) {
        helpers.showAppToast("Сначала сохраните текст мероприятий.", "error");
        return;
      }
      if (!window.confirm("Подтвердить выполнение мероприятий?\n\nЭтот список будет закрыт: изменить мероприятия, снять галочку или перенести его записи будет нельзя. Новые записи с тем же номером попадут в отдельный список.")) return;
      return helpers.runButtonOperation(button, async () => {
        const result = await helpers.apiJson("/api/repeat-failure-group", { method: "POST", timeout: 20000,
          body: JSON.stringify({ action: "complete-measures", actionId: helpers.nextActionId(), clientId: helpers.clientId,
            equipmentId: Number(button.dataset.equipmentId), code: button.dataset.repeatCode, cycleNumber: Number(button.dataset.cycleNumber), expectedUpdatedAt: button.dataset.measuresUpdatedAt }) });
        if (result?.state) helpers.mergeRealtimePatch(result.state);
        if (result?.stateVersion) helpers.setRealtimeStateVersion(result.stateVersion);
        helpers.persist();
        measureDrafts.delete(key);
        helpers.showAppToast("Мероприятия выполнены. Записи закреплены за закрытой группой.", "ok");
        if (helpers.isCurrent()) {
          const left = window.scrollX, top = window.scrollY;
          helpers.render();
          window.scrollTo({ left, top, behavior: "instant" });
        }
      }, "Закрываем…");
    }));
    container.querySelectorAll("[data-repeat-measures-key]").forEach(editor => {
      const input = editor.querySelector("[data-repeat-measures]");
      const key = editor.dataset.repeatMeasuresKey;
      const captureDraft = () => {
        const previous = measureDrafts.get(key);
        const draft = { text: input.value, expectedUpdatedAt: previous?.expectedUpdatedAt ?? editor.dataset.measuresUpdatedAt ?? "", cycleNumber: previous?.cycleNumber ?? Number(editor.dataset.cycleNumber) };
        measureDrafts.set(key, draft);
        return draft;
      };
      input.addEventListener("input", captureDraft);
      editor.querySelector("[data-cancel-repeat-measures]")?.addEventListener("click", () => {
        if (measureSaves.has(key) || !window.confirm("Отменить несохранённые правки мероприятий и показать сохранённый текст?")) return;
        measureDrafts.delete(key);
        if (helpers.isCurrent()) {
          const left = window.scrollX, top = window.scrollY;
          helpers.render();
          window.scrollTo({ left, top, behavior: "instant" });
        }
      });
      editor.querySelector("[data-save-repeat-measures]").addEventListener("click", event => helpers.runButtonOperation(event.currentTarget, async () => {
        if (measureSaves.has(key)) return;
        const draft = captureDraft();
        measureSaves.add(key);
        try {
          const result = await helpers.apiJson("/api/repeat-failure-group", { method: "POST", timeout: 20000,
            body: JSON.stringify({ action: "save-measures", actionId: helpers.nextActionId(), clientId: helpers.clientId,
              equipmentId: Number(editor.dataset.equipmentId), code: editor.dataset.repeatCode, cycleNumber: draft.cycleNumber, expectedUpdatedAt: draft.expectedUpdatedAt, text: draft.text }) });
          if (result?.state) helpers.mergeRealtimePatch(result.state);
          if (result?.stateVersion) helpers.setRealtimeStateVersion(result.stateVersion);
          helpers.persist();
          const saved = result?.state?.catalog?.equipment?.[editor.dataset.equipmentId]?.repeatFailureMeasures?.[editor.dataset.repeatCode];
          if (measureDrafts.get(key) === draft) measureDrafts.delete(key);
          else if (saved) {
            const next = measureDrafts.get(key);
            if (next?.expectedUpdatedAt === draft.expectedUpdatedAt && next.cycleNumber === draft.cycleNumber) measureDrafts.set(key, { ...next, expectedUpdatedAt: saved.updatedAt || "" });
          }
          helpers.showAppToast("Мероприятия сохранены.", "ok");
        } catch (error) {
          if (error?.data?.error === "repeat_failure_measures_stale") {
            if (error.data.state) {
              helpers.mergeRealtimePatch(error.data.state);
              helpers.persist();
            }
            helpers.showAppToast("Мероприятия изменены другим сотрудником. Ваши правки оставлены на экране. Скопируйте их и нажмите «Отменить правки», чтобы проверить сохранённый текст.", "error");
          } else throw error;
        } finally {
          measureSaves.delete(key);
          if (helpers.isCurrent()) {
            const left = window.scrollX, top = window.scrollY;
            helpers.render();
            window.scrollTo({ left, top, behavior: "instant" });
          }
        }
      }, "Сохраняем…"));
    });
  }

  function metadata(entry) {
    return {
      repeatFailureCode: String(entry.repeatFailureCode || ""),
      repeatFailureName: String(entry.repeatFailureName || ""),
      repeatFailureClosedAt: String(entry.repeatFailureClosedAt || ""),
      repeatFailureCycleId: String(entry.repeatFailureCycleId || ""),
      repeatFailureMarkedAt: String(entry.repeatFailureMarkedAt || "")
    };
  }

  function buildAnalysis(events, annualStats, catalog = {}) {
    const repeatedMap = new Map();
    events
      .filter(event => ["remark", "breakdown"].includes(event.type))
      .forEach(event => {
        const created = new Date(event.createdAt || "");
        if (Number.isNaN(created.getTime())) return;
        const manualCode = String(event.repeatFailureCode || "").trim();
        if (!/^[1-9]\d{0,5}$/.test(manualCode)) return;
        const cycleId = String(event.repeatFailureCycleId || "");
        const cycleNumber = catalog.equipment?.[String(event.equipmentId)]?.repeatFailureMeasures?.[manualCode]?.cycleNumber || 0;
        const key = `manual|${Number(event.equipmentId) || 0}|${manualCode}${cycleId ? "|closed:" + cycleId : cycleNumber ? "|open:" + cycleNumber : ""}`;
        const item = repeatedMap.get(key) || {
          groupKey: key,
          cycleId,
          closedAt: String(event.repeatFailureClosedAt || ""),
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

  function employeeRepeatPenaltyCounts(events = [], workerKey, eligibleRole, inPeriod = () => true) {
    const groups = new Map();
    events.forEach(event => {
      const code = String(event?.repeatFailureCode || "").trim();
      if (!/^[1-9]\d{0,5}$/.test(code)) return;
      const cycle = String(event.repeatFailureCycleId || (event.repeatFailureClosedAt ? `legacy-closed:${event.repeatFailureClosedAt}` : "open"));
      const key = `${Number(event.equipmentId) || 0}|${code}|${cycle}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
    const counts = new Map();
    groups.forEach(group => {
      if (group.length < 2) return;
      group.forEach(event => {
        if (!event.resolvedAt || !inPeriod(event.resolvedAt)) return;
        const participants = String(event.resolvedByName || "").trim()
          ? [{ role: event.resolvedByRole, name: event.resolvedByName }]
          : (Array.isArray(event.ratingParticipants) ? event.ratingParticipants : []);
        const seen = new Set();
        participants.forEach(person => {
          if (!eligibleRole(person?.role) || !String(person?.name || "").trim()) return;
          const key = workerKey(person.role, person.name);
          if (!key || seen.has(key)) return;
          seen.add(key);
          counts.set(key, Number(counts.get(key) || 0) + 1);
        });
      });
    });
    return counts;
  }

  function kpdPercent(closed, overdue, repeatPenalties) {
    const completed = Math.max(0, Number(closed) || 0);
    const denominator = completed + Math.max(0, Number(overdue) || 0);
    if (!denominator) return null;
    const credited = Math.max(0, completed - Math.max(0, Number(repeatPenalties) || 0));
    return Math.round(credited / denominator * 100);
  }

  function journalTitle(group = {}) {
    if (group.manualCode) return `Повторные неисправности №${group.manualCode}${group.name ? " — " + group.name : ""}${group.closedAt ? " · Выполнено " + new Date(group.closedAt).toLocaleDateString("ru-RU") : ""}`;
    return `Повторные поломки: ${group.equipment || "Оборудование"} · ${group.node || "узел не указан"}`;
  }

  function journalHtml(group = {}, year, helpers) {
    const { escapeHtml, dateTimeHuman, durationText, requestRoleLabel } = helpers;
    const code = String(group.manualCode || "").trim();
    const events = (Array.isArray(group.events) ? group.events : []).filter(event =>
      /^[1-9]\d{0,5}$/.test(code) && String(event.repeatFailureCode || "").trim() === code
      && (group.equipmentId == null || Number(event.equipmentId) === group.equipmentId)
      && String(event.repeatFailureCycleId || "") === String(group.cycleId || "")
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

  function activeGroups(events = [], equipmentId = 0) {
    const groups = new Map();
    events.forEach(event => {
      const code = String(event?.repeatFailureCode || "").trim();
      if (Number(event?.equipmentId) !== Number(equipmentId) || !/^[1-9]\d{0,5}$/.test(code) || isClosed(event)) return;
      const saved = groups.get(code) || { code, name: "", namedAt: "", count: 0 };
      saved.count += 1;
      if (event.repeatFailureName && (!saved.name || String(event.repeatFailureMarkedAt || "") >= saved.namedAt)) {
        saved.name = String(event.repeatFailureName);
        saved.namedAt = String(event.repeatFailureMarkedAt || "");
      }
      groups.set(code, saved);
    });
    return [...groups.values()].sort((left, right) => Number(left.code) - Number(right.code));
  }

  function editorHtml(item, events, escapeHtml) {
    const currentCode = String(item?.repeatFailureCode || "").trim();
    const groups = activeGroups(events, item?.equipmentId);
    if (currentCode && !groups.some(group => group.code === currentCode)) {
      groups.push({ code: currentCode, name: String(item.repeatFailureName || ""), count: 1 });
    }
    return `<span class="repeat-failure-editor no-print">
      <select data-repeat-failure-choice aria-label="Выбор группы повторной поломки">
        <option value="">Выберите группу</option>
        ${groups.map(group => `<option value="${escapeHtml(group.code)}" data-group-name="${escapeHtml(group.name || "")}" ${group.code === currentCode ? "selected" : ""}>№${escapeHtml(group.code)}${group.name ? ` — ${escapeHtml(group.name)}` : ""} · ${group.count}</option>`).join("")}
        <option value="__new">＋ Новая группа</option>
      </select>
      <input type="number" inputmode="numeric" min="1" max="999999" step="1" aria-label="Номер новой группы" data-repeat-failure-code value="" placeholder="№" hidden>
      <input type="text" maxlength="120" aria-label="Название поломки" data-repeat-failure-name value="${escapeHtml(item?.repeatFailureName || "")}" placeholder="Название группы">
      <button type="button" class="mini-action" title="Сохранить группу" aria-label="Сохранить группу" data-save-repeat-failure="${escapeHtml(item?.id || "")}">✓</button>
      ${currentCode ? `<button type="button" class="secondary mini-action" title="Снять группу" aria-label="Снять группу" data-clear-repeat-failure="${escapeHtml(item?.id || "")}">×</button>` : ""}
    </span>`;
  }

  function bindAggregateEditors(container, items, helpers) {
    container.querySelectorAll("[data-repeat-failure-choice]").forEach(select => select.addEventListener("change", () => {
      const editor = select.closest(".repeat-failure-editor");
      const codeInput = editor?.querySelector("[data-repeat-failure-code]");
      const nameInput = editor?.querySelector("[data-repeat-failure-name]");
      if (!codeInput) return;
      codeInput.hidden = select.value !== "__new";
      codeInput.value = select.value === "__new" ? "" : select.value;
      if (nameInput) nameInput.value = select.value && select.value !== "__new" ? String(select.selectedOptions?.[0]?.dataset.groupName || "") : "";
      if (!codeInput.hidden) codeInput.focus();
    }));
    container.querySelectorAll("[data-save-repeat-failure]").forEach(button => button.addEventListener("click", event => helpers.runButtonOperation(event.currentTarget, async () => {
      const item = items.find(entry => String(entry.id) === String(event.currentTarget.dataset.saveRepeatFailure || ""));
      const editor = event.currentTarget.closest(".repeat-failure-editor");
      const choice = String(editor?.querySelector("[data-repeat-failure-choice]")?.value || "");
      const code = String(choice === "__new" ? editor?.querySelector("[data-repeat-failure-code]")?.value : choice).trim();
      const name = String(editor?.querySelector("[data-repeat-failure-name]")?.value || "").trim();
      if (!item) throw new Error("repeat_failure_not_found");
      if (!choice) return helpers.showAppToast("Выберите существующую группу или создайте новую.", "error");
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

  root.repeatFailures = { groupMeasures, completionCell, isClosed, measuresCell, bindMeasures, metadata, buildAnalysis, employeeRepeatPenaltyCounts, kpdPercent, journalHtml, openJournal, activeGroups, editorHtml, bindAggregateEditors };
})();
