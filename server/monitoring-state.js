"use strict";

let latestSnapshot = null;

function setLatestMonitoringSnapshot(snapshot) {
  latestSnapshot = snapshot;
}

function getLatestMonitoringSnapshot() {
  return latestSnapshot;
}

function monitoringAlertsNeedWrite(db, specs) {
  const activeTypes = new Set(specs.map(item => item.type));
  for (const alert of db.adminAlerts || []) {
    if (alert.status === "active" && !activeTypes.has(alert.type)) return true;
    if (!activeTypes.has(alert.type) && !alert.clearedAt) return true;
  }
  for (const spec of specs) {
    const existing = (db.adminAlerts || []).find(item => item.type === spec.type && item.status === "active");
    if (existing) {
      if (["severity", "title", "message"].some(key => String(existing[key] || "") !== String(spec[key] || ""))) return true;
      continue;
    }
    const acknowledged = (db.adminAlerts || []).find(item => item.type === spec.type && item.status === "resolved" && !item.clearedAt);
    if (!acknowledged) return true;
  }
  return false;
}

module.exports = { getLatestMonitoringSnapshot, monitoringAlertsNeedWrite, setLatestMonitoringSnapshot };
