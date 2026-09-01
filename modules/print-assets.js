(() => {
  "use strict";

  function createOptionalLibraryLoader(appVersion) {
    const optionalScriptPromises = new Map();

    function loadOptionalScript(pathname, ready) {
      if (ready()) return Promise.resolve(true);
      if (optionalScriptPromises.has(pathname)) return optionalScriptPromises.get(pathname);
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${pathname}?v=${appVersion}`;
        script.async = true;
        script.addEventListener("load", () => ready() ? resolve(true) : reject(new Error("optional_library_unavailable")), { once: true });
        script.addEventListener("error", () => reject(new Error("optional_library_load_failed")), { once: true });
        document.head.append(script);
      }).catch(error => {
        optionalScriptPromises.delete(pathname);
        throw error;
      });
      optionalScriptPromises.set(pathname, promise);
      return promise;
    }

    return async function ensurePprOptionalLibrary(name) {
      if (name === "work-permit") return loadOptionalScript("/modules/work-permit.js", () => Boolean(window.PprWorkPermit?.activate));
      if (name === "mammoth") return loadOptionalScript("/node_modules/mammoth/mammoth.browser.min.js", () => Boolean(window.mammoth?.extractRawText));
      if (name === "html2pdf") return loadOptionalScript("/node_modules/html2pdf.js/dist/html2pdf.bundle.min.js", () => typeof window.html2pdf === "function");
      if (name === "annual-pdf") {
        await loadOptionalScript("/node_modules/html2canvas/dist/html2canvas.min.js", () => typeof window.html2canvas === "function");
        await loadOptionalScript("/node_modules/jspdf/dist/jspdf.umd.min.js", () => typeof window.jspdf?.jsPDF === "function");
        return true;
      }
      throw new Error("unknown_optional_library");
    };
  }

  window.PprPrintAssets = Object.freeze({ createOptionalLibraryLoader });
})();
