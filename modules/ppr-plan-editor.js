(function (root) {
  "use strict";
  const drafts = new Map();
  const approvalRequests = new Set();
  const keyFor = row => JSON.stringify([String(row.equipmentId || ""), String(row.node || "")]);
  const started = row => Boolean(row.mark || row.markedAt || String(row.resolutionComment || "").trim());
  function groupByTarget(items = [], fallback = null) {
    const groups = new Map();
    items.forEach((item, index) => {
      const hasTarget = ["area", "equipment", "node"].some(field => String(item?.[field] || "").trim());
      const target = hasTarget ? item : (fallback || item || {});
      const group = { area: String(target.area || "").trim(), equipmentId: target.equipmentId || "", equipment: String(target.equipment || "").trim(), node: String(target.node || "").trim() };
      const key = JSON.stringify([group.area, String(group.equipmentId), group.equipment, group.node]);
      if (!groups.has(key)) groups.set(key, { ...group, rows: [] });
      groups.get(key).rows.push({ row: item, index });
    });
    const compare = (left, right) => String(left || "").localeCompare(String(right || ""), "ru");
    return [...groups.values()].sort((left, right) =>
      Number(!left.area && !left.equipment && !left.node) - Number(!right.area && !right.equipment && !right.node)
      || compare(left.area, right.area) || compare(left.equipment, right.equipment) || compare(left.node, right.node));
  }
  const messages = {
    ppr_plan_conflict: "Перечень уже изменён другим сотрудником. Ваш текст оставлен на экране. Скопируйте нужные правки, отмените редактирование и откройте его заново.",
    ppr_template_conflict: "Шаблон уже изменён в другом листе. Ваши правки оставлены на экране. Откройте редактирование заново после проверки.",
    ppr_row_started: "По одной из изменённых строк уже записан результат. Изменять или убирать её нельзя.",
    ppr_target_required: "Выберите оборудование и узел для каждой заполненной строки.",
    ppr_template_empty: "Добавьте хотя бы одну работу.",
    ppr_template_empty_target: "Нельзя сохранить пустой перечень для одного из узлов. Оставьте хотя бы одну работу для каждого узла.",
    ppr_sheet_locked: "Лист уже принят инженером. Изменять его нельзя."
  };
  function controls(date, allowed) {
    if (!allowed) return "";
    return drafts.has(date)
      ? `<div class="ppr-plan-controls no-print"><button type="button" class="secondary" data-autofill-ppr-sheet="${date}">Автозаполнить перечень работ</button><button type="button" class="secondary" data-ppr-plan-add>+ Строка</button><button type="button" class="primary" data-ppr-plan-save>Сохранить</button><button type="button" class="secondary" data-ppr-plan-cancel>Отмена</button><small>Перечень сохранится для следующих ППР. Результаты работ не переносятся.</small><span role="status" data-ppr-plan-message></span></div>`
      : `<button type="button" class="secondary no-print" data-ppr-plan-edit>Редактировать</button>`;
  }
  function rowControls(date, row, escape) {
    const draft = drafts.get(date);
    if (!draft) return "";
    if (started(row)) return `<small class="no-print">Есть результат — строка защищена</small>`;
    const targetSelect = draft.targets.length > 1
      ? `<select class="no-print" data-ppr-plan-target="${escape(row.id)}" aria-label="Оборудование и узел"><option value="">Выберите оборудование и узел</option>${draft.targets.map((target, index) => `<option value="${index}" ${keyFor(target) === keyFor(row) ? "selected" : ""}>${escape(target.equipment)} · ${escape(target.node)}</option>`).join("")}</select>` : "";
    return `${targetSelect}<button type="button" class="secondary no-print ppr-plan-remove" data-ppr-plan-remove="${escape(row.id)}">Убрать</button>`;
  }
  function serverApprovalFields(sheet = {}) {
    return {
      approvedAt: sheet.approvedAt || "",
      approvedByName: sheet.approvedByName || "",
      approvedByRole: sheet.approvedByRole || "",
      lockedAt: sheet.lockedAt || sheet.approvedAt || ""
    };
  }
  async function approve(date, button, deps) {
    const { api, rerender, toast, approval } = deps;
    const { canApprove, getSheet, completion, publish, persist, setBusy } = approval;
    if (!canApprove() || approvalRequests.has(date)) return;
    if (getSheet(date).approvedAt || !completion(date).workersComplete) return;
    approvalRequests.add(date);
    setBusy(button, true, "Принимаем…");
    const acceptServerApproval = sheet => {
      if (!sheet?.approvedAt || !sheet?.approvedByName) throw new Error("ppr_approval_not_confirmed");
      // Only the server supplies the signature. Keep local work/drafts even if
      // their device timestamps are newer than the confirmed server snapshot.
      Object.assign(getSheet(date, true), serverApprovalFields(sheet));
      persist();
    };
    try {
      const result = await publish(date, "approve");
      acceptServerApproval(result?.state?.pprSheets?.[date]);
    } catch (error) {
      let confirmed = false;
      if (Number(error?.status) === 409 && error?.data?.error === "ppr_sheet_locked") {
        try {
          const snapshot = await api(`/api/ppr-sheet/plan?date=${encodeURIComponent(date)}`);
          acceptServerApproval(snapshot?.sheet);
          confirmed = true;
        } catch {}
      }
      if (!confirmed) toast("Приёмка не подтверждена сервером. Проверьте связь и повторите. Записи сохранены.", "error");
    } finally {
      approvalRequests.delete(date);
      if (button?.isConnected) setBusy(button, false);
      rerender();
    }
  }
  function bind(container, deps) {
    const { api, publish, rerender, toast, canPlan } = deps;
    if (deps.approval) container?.querySelectorAll("[data-approve-ppr-sheet]").forEach(button => {
      button.addEventListener("click", () => approve(button.dataset.approvePprSheet, button, deps));
    });
    container?.querySelectorAll("[data-ppr-sheet-date]").forEach(element => {
      const date = element.dataset.pprSheetDate;
      element.querySelectorAll("textarea").forEach(input => {
        const fit = () => { input.style.height = "auto"; input.style.height = `${input.scrollHeight + 2}px`; };
        fit(); input.addEventListener("input", fit);
      });
      if (!canPlan()) return;
      const message = text => {
        const status = element.querySelector("[data-ppr-plan-message]");
        if (status) status.textContent = text;
        else toast(text, "error");
      };
      const perform = async (button, operation) => {
        if (button.disabled) return;
        button.disabled = true;
        try { await operation(); }
        catch (error) { message(messages[error?.message] || "Не удалось сохранить. Ваши правки оставлены на экране. Проверьте связь и попробуйте снова."); }
        finally { button.disabled = false; }
      };
      const edit = element.querySelector("[data-ppr-plan-edit]");
      edit?.addEventListener("click", () => perform(edit, async () => {
        const snapshot = await api(`/api/ppr-sheet/plan?date=${encodeURIComponent(date)}`);
        if (snapshot.sheet.approvedAt) throw new Error("ppr_sheet_locked");
        const draft = { ...snapshot, rows: structuredClone(snapshot.sheet.rows) };
        if (draft.targets.length === 1) draft.rows.forEach(row => { if (!row.equipmentId) Object.assign(row, draft.targets[0]); });
        drafts.set(date, draft);
        rerender();
      }));
      const draft = drafts.get(date);
      if (!draft) return;
      element.querySelector("[data-autofill-ppr-sheet]")?.addEventListener("click", () => {
        if (!draft.suggestedRows.length) { message("Для этого листа нет шаблона автозаполнения."); return; }
        if (draft.rows.some(row => row.work.trim() && !started(row)) && !root.confirm("Заменить незавершённые работы сохранённым перечнем? Если перечня ещё нет, будут подставлены стандартные работы. Строки с результатами сохранятся.")) return;
        const protectedRows = draft.rows.filter(started);
        draft.rows = [...protectedRows, ...draft.suggestedRows.filter(row => !protectedRows.some(saved => keyFor(row) === keyFor(saved) && row.work === saved.work)).map(row => ({ ...row, id: `${date}-work-${root.crypto.randomUUID()}` }))];
        rerender();
      });
      element.querySelectorAll("[data-ppr-work-input]").forEach(input => input.addEventListener("input", () => {
        const row = draft.rows.find(item => item.id === input.dataset.pprWorkInput);
        if (!row || started(row)) return;
        row.work = input.value;
        const tr = input.closest("tr");
        tr.classList.toggle("ppr-empty-row", !input.value.trim());
        tr.querySelector("[data-ppr-print-work]").textContent = input.value;
      }));
      element.querySelectorAll("[data-ppr-plan-target]").forEach(select => select.addEventListener("change", () => {
        const row = draft.rows.find(item => item.id === select.dataset.pprPlanTarget);
        if (row && !started(row)) Object.assign(row, select.value === "" ? { equipmentId: "", equipment: "", node: "", area: "" } : draft.targets[Number(select.value)]);
      }));
      element.querySelectorAll("[data-ppr-plan-remove]").forEach(button => button.addEventListener("click", () => {
        const row = draft.rows.find(item => item.id === button.dataset.pprPlanRemove);
        if (!row || started(row)) return;
        if (row.work.trim() && !root.confirm("Убрать эту работу из перечня? Изменение применится после сохранения.")) return;
        draft.rows = draft.rows.filter(item => item !== row);
        rerender();
      }));
      element.querySelector("[data-ppr-plan-add]")?.addEventListener("click", () => {
        draft.rows.push({ id: `${date}-work-${root.crypto.randomUUID()}`, work: "", mark: "", ...(draft.targets.length === 1 ? draft.targets[0] : {}) });
        rerender();
      });
      element.querySelector("[data-ppr-plan-cancel]")?.addEventListener("click", () => {
        if (!root.confirm("Отменить несохранённые изменения перечня?")) return;
        drafts.delete(date); rerender();
      });
      const save = element.querySelector("[data-ppr-plan-save]");
      save?.addEventListener("click", () => perform(save, async () => {
        // Freeze controls while sending: edits made during the request must not be lost.
        const controls = [...element.querySelectorAll("button, textarea, select")];
        const disabled = controls.map(control => control.disabled);
        controls.forEach(control => { control.disabled = true; });
        message("Сохраняется…");
        try {
          await publish(date, { revision: draft.revision, templateVersions: draft.templateVersions,
            rows: draft.rows.map(({ id, work, equipmentId, node }) => ({ id, work, equipmentId, node })) });
          drafts.delete(date); rerender(); toast("Перечень сохранён для этого и следующих ППР");
        } finally { controls.forEach((control, index) => { control.disabled = disabled[index]; }); }
      }));
    });
  }
  root.PprPlanEditor = { get: date => drafts.get(date), approvalPending: date => approvalRequests.has(date), groupByTarget, serverApprovalFields, started, controls, rowControls, bind };
})(window);
