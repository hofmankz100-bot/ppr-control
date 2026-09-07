"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getLatestMonitoringSnapshot, monitoringAlertsNeedWrite, setLatestMonitoringSnapshot } = require("../server/monitoring-state");

test("live monitoring snapshots do not require durable state writes", () => {
  const snapshot = { checkedAt: "now", node: { memoryMb: 240 } };
  setLatestMonitoringSnapshot(snapshot);
  assert.equal(getLatestMonitoringSnapshot(), snapshot);
  assert.equal(monitoringAlertsNeedWrite({ adminAlerts: [] }, []), false);
});

test("monitoring persists real alert transitions but not unchanged samples", () => {
  const alert = { type: "memory_high", status: "active", severity: "warning", title: "Memory", message: "High", clearedAt: "" };
  const spec = { type: "memory_high", severity: "warning", title: "Memory", message: "High" };
  assert.equal(monitoringAlertsNeedWrite({ adminAlerts: [alert] }, [spec]), false);
  assert.equal(monitoringAlertsNeedWrite({ adminAlerts: [alert] }, []), true);
  assert.equal(monitoringAlertsNeedWrite({ adminAlerts: [] }, [spec]), true);
  assert.equal(monitoringAlertsNeedWrite({ adminAlerts: [alert] }, [{ ...spec, message: "Higher" }]), true);
});
