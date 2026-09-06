(() => {
  "use strict";

  // The caller supplies only equipment already allowed for the active profile.
  function createEquipmentSearch(container) {
    const input = container.querySelector("input");
    const clear = container.querySelector("[data-equipment-search-clear]");
    const filters = [...container.querySelectorAll("[data-equipment-filter]")];
    const count = container.querySelector("[data-equipment-search-count]");
    let items = [];
    let attentionOnly = false;
    let emptyMessage = null;
    const normalize = value => String(value || "").normalize("NFKC").toLocaleLowerCase("ru-RU").replace(/ё/g, "е");

    function apply() {
      const terms = normalize(input.value).trim().split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const item of items) {
        const matches = (!attentionOnly || item.attention) && terms.every(term => item.text.includes(term));
        item.row.classList.toggle("equipment-search-hidden", !matches);
        item.row.hidden = !matches;
        if (matches) visible += 1;
      }
      clear.hidden = !input.value;
      count.textContent = `Показано ${visible} из ${items.length}`;
      if (emptyMessage) emptyMessage.hidden = visible > 0;
      filters.forEach(button => button.setAttribute("aria-pressed", String((button.dataset.equipmentFilter === "attention") === attentionOnly)));
    }

    input.addEventListener("input", apply);
    input.addEventListener("keydown", event => {
      if (event.key === "Escape" && input.value) {
        event.preventDefault();
        input.value = "";
        apply();
      }
    });
    clear.addEventListener("click", () => { input.value = ""; apply(); input.focus(); });
    filters.forEach(button => button.addEventListener("click", () => {
      attentionOnly = button.dataset.equipmentFilter === "attention";
      apply();
    }));

    return {
      update(nextItems, nextEmptyMessage) {
        items = nextItems.map(item => ({ ...item, text: normalize(item.text) }));
        emptyMessage = nextEmptyMessage;
        container.querySelector("[data-equipment-attention-count]").textContent = String(items.filter(item => item.attention).length);
        apply();
      },
      reset() { input.value = ""; attentionOnly = false; apply(); }
    };
  }

  window.PPRModules = window.PPRModules || {};
  window.PPRModules.createEquipmentSearch = createEquipmentSearch;
})();
