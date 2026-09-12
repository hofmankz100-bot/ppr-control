(function () {
  const root = window.PPRModules ||= {};
  // Keep historical fixed rows valid; new QR/manual entries validate the added fields before fixation.
  const requiredFields = ["airPressure", "airTemp", "oilPressureTemp", "leakGrounding"];
  const rowFieldsComplete = row =>
    requiredFields.every(field => String(row?.[field] || "").trim());

  root.compressor = {
    rowComplete(row) {
      return rowFieldsComplete(row)
        && ["shiftTime", "blowTime", "checkedBy"].every(field => String(row?.[field] || "").trim())
        && row?.entryStatus !== "draft";
    }
  };
})();
