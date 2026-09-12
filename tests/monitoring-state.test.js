"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getLatestMonitoringSnapshot, monitoringAlertsNeedWrite, setLatestMonitoringSnapshot } = require("../server/monitoring-state");
const fs = require("node:fs");
const path = require("node:path");

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

test("periodic monitoring reads the immutable committed state without cloning the full database", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const refresh = source.match(/async function refreshSystemMonitoring\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  const noWritePath = refresh.split("await enqueueStateWrite")[0];
  assert.match(refresh, /stateTransactions\.baseline\(\)/);
  assert.match(refresh, /systemMonitoringSnapshot\(adminConfig\)/);
  assert.doesNotMatch(noWritePath, /readDb\(\)/);
});
