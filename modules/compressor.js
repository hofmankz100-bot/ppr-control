(function () {
  const root = window.PPRModules ||= {};
  // Keep historical fixed rows valid; new QR/manual entries validate the added fields before fixation.
  const requiredFields = ["airPressure", "airTemp", "oilPressureTemp", "leakGrounding"];
  const rowFieldsComplete = row =>
    requiredFields.every(field => String(row?.[field] || "").trim());

  root.compressor = {
    rowFieldsComplete,
    rowComplete(row) {
      return rowFieldsComplete(row)
        && ["shiftTime", "blowTime", "checkedBy"].every(field => String(row?.[field] || "").trim())
        && row?.entryStatus !== "draft";
    },
    rowsComplete(rows) {
      return Array.isArray(rows) && rows.length > 0 && rows.every(root.compressor.rowComplete);
    }
  };
})();
