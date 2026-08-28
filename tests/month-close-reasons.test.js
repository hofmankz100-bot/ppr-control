const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("legacy procurement warehouse and month-close subsystems are absent", () => {
  for (const source of [client, server, styles]) {
    assert.doesNotMatch(source, /price-lookup|month-close|normalizeRequest|requestItems|upsertNodeWalkRequest|serviceCosts|stockOut|transferredToWarehouse|accountingWrittenOff/);
  }
  assert.doesNotMatch(server, /\/api\/engineer-request\/action|\/api\/month-close|\/api\/price-lookup/);
  assert.doesNotMatch(client, /state\.(?:requests|inventory|serviceCosts)|monthlyClosures/);
  assert.doesNotMatch(styles, /\.tmc-request-|\.engineer-incoming-|\.stock-row-actions|\.month-close-/);
});

test("an individually authorized employee can record a non-resolution reason", () => {
  assert.match(server, /"close-with-score", "defer"/);
  assert.match(server, /activeUserPermission\(registeredActor, "remarkDefer"\)/);
  assert.match(server, /remark_defer_forbidden/);
  assert.match(server, /remark\.deferReason = reason/);
  assert.match(server, /remark\.deferredAt = now/);
  assert.match(client, /Указывать причину неустранения/);
  assert.match(client, /Причина неустранения/);
  assert.match(client, /publishRemarkCollaborationAction\([^\n]+"defer"/);
});

test("reasoned remarks stay in warnings but leave KPI and main counters", () => {
  assert.match(client, /function countedOpenRemarkEntries[\s\S]*?!remarkDeferred\(entry\)/);
  assert.match(client, /data-defer-open-remark/);
  assert.doesNotMatch(client, /data-resume-open-remark|resume-deferred|Вернуть в учёт/);
  assert.match(client, /Причина записана/);
  assert.match(client, /if \(remarkDeferred\(entry\)\) return;/);
});

test("warning reason remains readable in dark theme", () => {
  assert.match(styles, /\.open-remark-item\.deferred-remark/);
  assert.match(styles, /\.open-remark-defer-summary/);
  assert.match(styles, /html\[data-theme="dark"\][\s\S]*?\.open-remark-defer-summary/);
});

test("smart month closing is no longer rendered in the engineer report", () => {
  const renderer = client.slice(client.indexOf("function renderEngineerReport"), client.indexOf("function openEngineerReport"));
  assert.doesNotMatch(renderer, /monthClosePanelHtml|loadMonthClosePanel|Умное закрытие месяца/);
  assert.match(renderer, /engineerMonthlyReportHtml/);
});
