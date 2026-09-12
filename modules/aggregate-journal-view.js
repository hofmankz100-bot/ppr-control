(function () {
  const root = window.PPRModules ||= {};
  const contexts = new WeakMap();
  const scrollSelector = ".aggregate-journal-table-wrap, .aggregate-mobile-record-carousel";
  const rows = element => [...element.querySelectorAll("[data-journal-row]")];

  function capturePosition(list, context) {
    const sameJournal = contexts.get(list) === context;
    contexts.set(list, context);
    if (!sameJournal || !list.getClientRects().length) return () => {};
    const x = window.scrollX, y = window.scrollY;
    const saved = [...list.querySelectorAll(scrollSelector)].map(element => {
      const rect = element.getBoundingClientRect();
      const anchor = rows(element).find(row => {
        const box = row.getBoundingClientRect();
        return box.height && box.width && box.bottom > rect.top && box.top < rect.bottom
          && box.right > rect.left && box.left < rect.right;
      });
      const box = anchor?.getBoundingClientRect();
      return { top: element.scrollTop, left: element.scrollLeft,
        id: anchor?.dataset.journalRow, dy: box ? box.top - rect.top : 0,
        dx: box ? box.left - rect.left : 0 };
    });
    // Ancestors survive innerHTML replacement, but can also be clamped during it.
    const parents = [];
    for (let element = list; element && element !== document.body && element !== document.documentElement; element = element.parentElement) {
      parents.push({ element, top: element.scrollTop, left: element.scrollLeft });
    }
    return () => {
      if (contexts.get(list) !== context || !list.isConnected || !list.getClientRects().length) return;
      [...list.querySelectorAll(scrollSelector)].forEach((element, index) => {
        const position = saved[index];
        if (!position) return;
        element.scrollTop = position.top;
        element.scrollLeft = position.left;
        const anchor = position.id && rows(element).find(row => row.dataset.journalRow === position.id);
        if (anchor) {
          const rect = element.getBoundingClientRect(), box = anchor.getBoundingClientRect();
          if (position.top) element.scrollTop += box.top - rect.top - position.dy;
          if (position.left) element.scrollLeft += box.left - rect.left - position.dx;
        }
      });
      parents.forEach(({ element, top, left }) => { element.scrollTop = top; element.scrollLeft = left; });
      // Restore synchronously: a delayed callback must not pull the user back after another swipe.
      window.scrollTo({ left: x, top: y, behavior: "instant" });
    };
  }

  function buildMobileCards(list) {
    list.classList.remove("mobile-record-carousel-active");
    if (!window.matchMedia?.("(max-width: 680px)")?.matches) return;
    const sourceRows = [...list.querySelectorAll(".standard-aggregate-journal-sheet tbody tr")];
    if (!sourceRows.length) return;
    const mobileSection = document.createElement("section");
    mobileSection.className = "aggregate-mobile-record-view no-print";
    mobileSection.innerHTML = '<div class="mobile-journal-swipe-title"><strong>Записи журнала</strong><span>Свайп влево или вправо</span></div><div class="aggregate-mobile-record-carousel"></div>';
    const carousel = mobileSection.querySelector(".aggregate-mobile-record-carousel");
    sourceRows.forEach(row => {
      const card = document.createElement("article");
      card.className = `aggregate-mobile-record-card ${row.classList.contains("open") ? "open" : ""}`;
      if (row.dataset.journalRow) card.dataset.journalRow = row.dataset.journalRow;
      [...row.children].forEach(cell => card.append(cell.cloneNode(true)));
      card.querySelectorAll(".no-print:not(.repeat-failure-editor), .aggregate-correction").forEach(node => node.remove());
      carousel.append(card);
    });
    list.querySelector(".aggregate-journal-sheet")?.before(mobileSection);
    list.classList.add("mobile-record-carousel-active");
  }

  root.aggregateJournalView = { capturePosition, buildMobileCards };
})();
