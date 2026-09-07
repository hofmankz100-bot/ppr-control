(function () {
  const root = window.PPRModules ||= {};

  function buildAnnualAnalysis(events, year, annualStats) {
    const repeatedMap = new Map();
    events
      .filter(event => ["remark", "breakdown"].includes(event.type))
      .forEach(event => {
        const created = new Date(event.createdAt || "");
        if (Number.isNaN(created.getTime()) || created.getFullYear() !== year) return;
        const manualCode = String(event.repeatFailureCode || "").trim();
        const key = manualCode
          ? `manual|${Number(event.equipmentId) || 0}|${manualCode}`
          : `automatic|${event.area || ""}|${event.equipment || ""}|${event.node || ""}`;
        const item = repeatedMap.get(key) || {
          groupKey: key,
          manualCode,
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
      .sort((a, b) => b.count - a.count || b.downtimeMs - a.downtimeMs || a.equipment.localeCompare(b.equipment, "ru"))
      .slice(0, 10);
    const employeeRating = annualStats.workers
      .filter(worker => worker.closed || worker.installs || worker.downtimeClosed)
      .sort((a, b) => b.closed - a.closed || b.installs - a.installs || (b.kpd ?? 0) - (a.kpd ?? 0) || a.name.localeCompare(b.name, "ru"))
      .slice(0, 12);
    return { year, repeatedBreakdowns, employeeRating };
  }

  function journalTitle(group = {}) {
    if (group.manualCode) return `Группа повторных поломок №${group.manualCode}`;
    return `Повторные поломки: ${group.equipment || "Оборудование"} · ${group.node || "узел не указан"}`;
  }

  function journalHtml(group = {}, year, helpers) {
    const { escapeHtml, dateTimeHuman, durationText, requestRoleLabel } = helpers;
    const events = Array.isArray(group.events) ? group.events : [];
    return `<article class="repeat-failure-journal-print"><header><div><span>Детализация за ${escapeHtml(String(year))} год</span><h2>${escapeHtml(journalTitle(group))}</h2><p>${escapeHtml(group.area || "-")} · ${escapeHtml(group.equipment || "-")} · записей: ${events.length} · общий простой: ${escapeHtml(durationText(group.downtimeMs || 0))}</p></div></header><table><thead><tr><th>№</th><th>Дата</th><th>Узел</th><th>Неисправность</th><th>Простой</th><th>Выполненная работа</th><th>Кто обнаружил</th><th>Кто устранил</th><th>Статус</th></tr></thead><tbody>${events.length ? events.map((event, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(dateTimeHuman(event.createdAt))}</td><td>${escapeHtml(event.node || "-")}</td><td>${escapeHtml(event.text || "Причина не указана")}</td><td>${event.type === "breakdown" ? escapeHtml(durationText(event.durationMs || 0)) : "-"}</td><td>${escapeHtml(event.resolvedComment || (event.resolvedAt ? "Устранено" : "-"))}</td><td>${escapeHtml(event.authorName || requestRoleLabel(event.authorRole) || "-")}</td><td>${escapeHtml(event.resolvedByName || requestRoleLabel(event.resolvedByRole) || "-")}</td><td>${event.open ? "Открыта" : "Закрыта"}</td></tr>`).join("") : `<tr><td colspan="9" class="engineer-report-empty">Записей в группе нет</td></tr>`}</tbody></table></article>`;
  }

  function printJournal(group, year, helpers) {
    const popup = window.open("", "_blank", "width=1400,height=900");
    if (!popup) return window.alert("Разрешите всплывающие окна для печати журнала.");
    popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${helpers.escapeHtml(journalTitle(group))}</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#111827}header{display:flex;justify-content:space-between;border-bottom:2px solid #111827;margin-bottom:10px;padding-bottom:8px}header span{font-size:11px;text-transform:uppercase}h2{margin:3px 0 5px;font-size:20px}p{margin:0;font-size:11px;color:#475569}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #64748b;padding:5px;font-size:9px;vertical-align:top;overflow-wrap:anywhere}th{background:#e2e8f0;text-align:left}tr{break-inside:avoid}</style></head><body>${journalHtml(group, year, helpers)}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
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

  async function saveCode(item, code, helpers) {
    const result = await helpers.apiJson("/api/repeat-failure-group", { method: "POST", timeout: 20000, body: JSON.stringify({ actionId: helpers.nextActionId(), clientId: helpers.clientId, sourceType: item.sourceType, downtimeId: item.downtimeId || "", recordKey: item.recordKey || "", remarkId: item.remarkId || "", code: String(code || "").trim() }) });
    if (result?.state) helpers.mergeRealtimePatch(result.state);
    if (result?.stateVersion) helpers.setRealtimeStateVersion(result.stateVersion);
    helpers.persist();
    return result;
  }

  function bindAggregateEditors(container, items, helpers) {
    container.querySelectorAll("[data-save-repeat-failure]").forEach(button => button.addEventListener("click", event => helpers.runButtonOperation(event.currentTarget, async () => {
      const item = items.find(entry => String(entry.id) === String(event.currentTarget.dataset.saveRepeatFailure || ""));
      const code = String(event.currentTarget.closest(".repeat-failure-editor")?.querySelector("[data-repeat-failure-code]")?.value || "").trim();
      if (!item) throw new Error("repeat_failure_not_found");
      if (code && !/^[1-9]\d{0,5}$/.test(code)) return helpers.showAppToast("Введите номер группы от 1 до 999999.", "error");
      await saveCode(item, code, helpers);
      helpers.showAppToast(code ? `Поломка добавлена в группу №${code}.` : "Поломка исключена из группы.", "ok");
      helpers.render();
    }, "Сохраняем...")));
    container.querySelectorAll("[data-clear-repeat-failure]").forEach(button => button.addEventListener("click", event => helpers.runButtonOperation(event.currentTarget, async () => {
      const item = items.find(entry => String(entry.id) === String(event.currentTarget.dataset.clearRepeatFailure || ""));
      if (!item) throw new Error("repeat_failure_not_found");
      await saveCode(item, "", helpers);
      helpers.showAppToast("Поломка исключена из группы.", "ok");
      helpers.render();
    }, "Снимаем...")));
  }

  root.repeatFailures = { buildAnnualAnalysis, journalTitle, journalHtml, printJournal, openJournal, saveCode, bindAggregateEditors };
})();
