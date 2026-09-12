"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = name => fs.readFileSync(path.join(root, name), "utf8");

test("retired client and server implementations stay removed", () => {
  const runtime = `${source("app.js")}\n${source("server.js")}`;
  assert.doesNotMatch(runtime, /\b(?:openAnnualPprActs|annualPprActsDocumentHtml|annualPprActSectionHtml|annualPprFacts|directorTraffic|requireAuthenticated|TRANSLATE_LANGS)\b/);
});

test("orphaned legacy style families stay removed", () => {
  const styles = source("styles.css");
  assert.doesNotMatch(styles, /\.(?:annual-ppr-act-overlay|annual-ppr-work-list|director-messages|director-send|director-memo-form|director-reply|forklift-driver-home|admin-form-builder|admin-role-label-editor|director-dashboard-grid|director-control-grid|engineer-service-form|excel-table)\b/);
});

test("active PPR and compatibility paths remain intact", () => {
  const app = source("app.js");
  const server = source("server.js");
  const styles = source("styles.css");
  assert.match(app, /function legacyNodeChecked\(/);
  assert.match(server, /const SUPPORTED_CLIENT_VERSIONS = new Set\(/);
  assert.match(styles, /\.annual-ppr-work-dialog\b/);
  assert.match(styles, /\.annual-ppr-node-progress-list\b/);
  assert.match(styles, /body\.forklift-driver-profile\b/);
});

test("unused receiver shell and stale client hooks stay removed", () => {
  const app = source("app.js");
  const assets = `${source("index.html")}\n${source("sw.js")}`;
  const styles = source("styles.css");
  assert.equal(fs.existsSync(path.join(root, "modules", "receiver.js")), false);
  assert.doesNotMatch(assets, /modules\/receiver\.js/);
  for (const binding of ["authTitle", "authSubmitButton", "authHint", "loginNameRow", "loginPhoneRow", "loginIdentifierLabel", "equipmentTitle", "equipmentMeta", "nodeTitle", "nodeMeta", "monthLabel", "prevMonth", "nextMonth", "commentLabel", "openRequestsButton", "directorMeta"]) {
    assert.match(app, new RegExp(`${binding}: document\\.querySelector`));
    assert.match(app, new RegExp(`ui\\.${binding}\\b`));
  }
  assert.doesNotMatch(app, /data-theme-toggle|data-mobile-view="requests"|data-mobile-remark-count|data-remark-confirm|data-remark-return|data-admin-close-legacy-remark|data-compressor-shift|data-node-fixed|data-node-comment-preview|data-open-remark-id/);
  assert.doesNotMatch(styles, /\.theme-toggle\b|\[data-node-fixed\]/);
});
