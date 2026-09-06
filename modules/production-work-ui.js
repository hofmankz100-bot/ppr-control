(() => {
  "use strict";

  function create(panel) {
    const drafts = new Map();
    const views = new Map();
    const formOwners = new WeakMap();
    const submissions = new WeakMap();
    const revisions = new WeakMap();
    let owner = "";
    let renderedTrade = "";
    let disposeCarousel = () => {};
    const leftInList = (card, list) => card.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft;
    const formKey = form => form?.id || form?.closest("[data-welding-id], [data-turning-id]")?.getAttribute("data-welding-id") || form?.closest("[data-turning-id]")?.getAttribute("data-turning-id");
    const fields = form => [...form.querySelectorAll("input[name], select[name], textarea[name]")];
    const snapshot = form => ({ revision: revisions.get(form) || 0, fields: fields(form).map(field => ({
      name: field.name, value: field.value, checked: field.checked,
      files: field.type === "file" ? [...field.files] : [],
      fileInput: field.type === "file" && field.files.length ? field : null,
      focused: field === document.activeElement,
      start: field.selectionStart, end: field.selectionEnd
    })) });
    const sameValues = (first, second) => first && second && first.revision === second.revision && first.fields.length === second.fields.length && first.fields.every((field, index) => {
      const other = second.fields[index];
      return field.name === other.name && field.value === other.value && field.checked === other.checked
        && field.files.length === other.files.length && field.files.every((file, fileIndex) => file === other.files[fileIndex]);
    });

    function beforeRender(nextOwner) {
      disposeCarousel();
      if (owner !== nextOwner) {
        drafts.clear();
        views.clear();
        owner = nextOwner;
        renderedTrade = "";
        return;
      }
      panel.querySelectorAll("form").forEach(form => {
        const key = formKey(form);
        if (!key) return;
        drafts.set(key, snapshot(form));
      });
      if (renderedTrade) {
        const list = panel.querySelector(".welding-list");
        const cards = [...(list?.querySelectorAll(":scope > article") || [])];
        const selected = cards.reduce((best, card) => !best || Math.abs(leftInList(card, list) - list.scrollLeft) < Math.abs(leftInList(best, list) - list.scrollLeft) ? card : best, null);
        views.set(renderedTrade, {
          requestOpen: panel.querySelector(".production-request-details")?.open,
          cardId: selected?.dataset.weldingId || selected?.dataset.turningId,
          scroll: new Map(cards.map(card => [card.dataset.weldingId || card.dataset.turningId, card.scrollTop]))
        });
      }
    }

    function beginSubmission(form) {
      submissions.set(form, { owner: formOwners.get(form), fields: snapshot(form) });
    }

    function isSubmissionCurrent(form, currentOwner = owner) {
      const submitted = submissions.get(form);
      return Boolean(submitted && submitted.owner === owner && submitted.owner === currentOwner);
    }

    function resetForm(form) {
      if (!isSubmissionCurrent(form)) return;
      const key = formKey(form);
      const current = [...panel.querySelectorAll("form")].find(candidate => formKey(candidate) === key);
      if (!sameValues(current ? snapshot(current) : drafts.get(key), submissions.get(form).fields)) return;
      drafts.delete(key);
      current?.reset();
      if (current) revisions.set(current, 0);
      if (current?.id) {
        const details = current.closest("details");
        if (details) details.open = false;
      }
    }

    function afterRender(trade) {
      renderedTrade = trade;
      const tabs = [...panel.querySelectorAll("[data-production-tab]")];
      tabs.forEach((tab, index) => {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(tab.dataset.productionTab === trade));
        tab.tabIndex = tab.dataset.productionTab === trade ? 0 : -1;
        tab.addEventListener("keydown", event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
          const nextTrade = tabs[next].dataset.productionTab;
          tabs[next].click();
          panel.querySelector(`[data-production-tab="${nextTrade}"]`)?.focus();
        });
      });
      const view = views.get(trade);
      const list = panel.querySelector(".welding-list");
      const cards = [...(list?.querySelectorAll(":scope > article") || [])];
      const request = panel.querySelector(".welding-request-form");
      if (request) {
        const details = document.createElement("details");
        details.className = "production-request-details";
        details.open = view?.requestOpen ?? !cards.length;
        const summary = document.createElement("summary");
        summary.textContent = request.querySelector("h2")?.textContent || "Новая заявка";
        request.querySelector("h2")?.remove();
        request.before(details);
        details.append(summary, request);
      }
      panel.querySelectorAll("form").forEach(form => {
        formOwners.set(form, owner);
        revisions.set(form, drafts.get(formKey(form))?.revision || 0);
        const changed = () => revisions.set(form, (revisions.get(form) || 0) + 1);
        form.addEventListener("input", changed);
        form.addEventListener("change", changed);
        for (const saved of drafts.get(formKey(form))?.fields || []) {
          let field = fields(form).find(candidate => candidate.name === saved.name);
          if (!field) continue;
          if (field.type === "file") {
            if (saved.fileInput) { field.replaceWith(saved.fileInput); field = saved.fileInput; }
          } else {
            field.value = saved.value;
            if (field.type === "checkbox" || field.type === "radio") field.checked = saved.checked;
          }
          if (saved.focused) {
            field.focus({ preventScroll: true });
            if (saved.start !== null && saved.start !== undefined) field.setSelectionRange?.(saved.start, saved.end);
          }
        }
      });
      if (!cards.length) return;
      const nav = document.createElement("div");
      nav.className = "production-card-navigation";
      nav.innerHTML = '<button type="button" data-production-prev aria-label="Предыдущая заявка">‹</button><span role="status" aria-live="polite"></span><button type="button" data-production-next aria-label="Следующая заявка">›</button>';
      list.before(nav);
      list.id = "productionRequestCards";
      list.setAttribute("role", "region");
      list.setAttribute("aria-label", trade === "welding" ? "Заявки на сварочные работы" : "Заявки на токарные работы");
      list.tabIndex = 0;
      nav.querySelectorAll("button").forEach(button => button.setAttribute("aria-controls", list.id));
      cards.forEach((card, index) => {
        card.setAttribute("aria-label", `Заявка ${index + 1} из ${cards.length}`);
        card.tabIndex = 0;
        card.scrollTop = view?.scroll.get(card.dataset.weldingId || card.dataset.turningId) || 0;
      });
      const indexAtScroll = () => cards.reduce((best, card, index) => Math.abs(leftInList(card, list) - list.scrollLeft) < Math.abs(leftInList(cards[best], list) - list.scrollLeft) ? index : best, 0);
      const update = () => {
        const index = indexAtScroll();
        nav.querySelector("span").textContent = `Заявка ${index + 1} из ${cards.length}`;
        nav.querySelector("[data-production-prev]").disabled = index === 0;
        nav.querySelector("[data-production-next]").disabled = index === cards.length - 1;
      };
      const move = direction => {
        const card = cards[Math.max(0, Math.min(cards.length - 1, indexAtScroll() + direction))];
        list.scrollTo({ left: leftInList(card, list), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      };
      nav.querySelector("[data-production-prev]").addEventListener("click", () => move(-1));
      nav.querySelector("[data-production-next]").addEventListener("click", () => move(1));
      list.addEventListener("keydown", event => {
        if (event.target !== list || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        move(event.key === "ArrowRight" ? 1 : -1);
      });
      list.addEventListener("scroll", update, { passive: true });
      const resize = new ResizeObserver(update);
      resize.observe(list);
      disposeCarousel = () => resize.disconnect();
      const selected = cards.find(card => (card.dataset.weldingId || card.dataset.turningId) === view?.cardId);
      if (selected) list.scrollLeft = leftInList(selected, list);
      update();
    }

    return { beforeRender, afterRender, beginSubmission, isSubmissionCurrent, resetForm };
  }
  window.PprProductionWorkUi = { create };
})();
