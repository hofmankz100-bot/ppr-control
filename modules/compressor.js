(function () {
  const root = window.PPRModules ||= {};
  root.compressor = {
    rowComplete(row) {
      return ["airPressure", "airTemp", "oilPressureTemp", "leakGrounding"]
        .every(field => String(row?.[field] || "").trim());
    },
    rowsComplete(rows) {
      return Array.isArray(rows) && rows.length > 0 && rows.every(root.compressor.rowComplete);
    }
  };
})();
