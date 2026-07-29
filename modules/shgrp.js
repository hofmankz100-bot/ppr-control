(function () {
  const root = window.PPRModules ||= {};
  const rowHasRequiredValues = (row, fields) =>
    fields.every(field => String(row?.[field] || "").trim());
  const entryIsFixed = row => row?.entryStatus !== "draft";
  const rowAFieldsComplete = row =>
    rowHasRequiredValues(row, ["inletMpa", "outletMpa", "tempInC", "tempOutC", "pressureDeltaMpa", "equipmentStatus", "pskTrigger", "maintenance", "remarks"]);
  const rowBFieldsComplete = row =>
    rowHasRequiredValues(row, ["wells", "gasSmell", "protectionZone", "remarks", "actions"]);

  root.shgrp = {
    rowAFieldsComplete,
    rowBFieldsComplete,
    rowAComplete(row) {
      return rowAFieldsComplete(row) && Boolean(String(row?.checkedBy || "").trim()) && entryIsFixed(row);
    },
    rowBComplete(row) {
      return rowBFieldsComplete(row) && Boolean(String(row?.checkedBy || "").trim()) && entryIsFixed(row);
    }
  };
})();
