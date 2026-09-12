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
