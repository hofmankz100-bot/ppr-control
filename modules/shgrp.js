(function () {
  const root = window.PPRModules ||= {};
  root.shgrp = {
    rowAComplete(row) {
      return ["inletMpa", "outletMpa", "tempInC", "tempOutC", "pressureDeltaMpa", "equipmentStatus", "pskTrigger", "maintenance", "remarks", "checkedBy"]
        .every(field => String(row?.[field] || "").trim());
    },
    rowBComplete(row) {
      return ["wells", "gasSmell", "protectionZone", "remarks", "actions", "checkedBy"]
        .every(field => String(row?.[field] || "").trim());
    }
  };
})();
