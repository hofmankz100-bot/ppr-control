"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = name => fs.readFileSync(path.join(root, name), "utf8");
const lineCount = name => source(name).split(/\r?\n/).length;

test("large entry files cannot grow without another module extraction", () => {
  assert.ok(lineCount("app.js") <= 16450, "app.js exceeded its guarded size; extract a client domain module");
  assert.ok(lineCount("server.js") <= 7750, "server.js exceeded its guarded size; extract a server domain module");
  assert.ok(lineCount("styles.css") <= 13550, "styles.css exceeded its guarded size; extract a style layer");
});

test("static delivery and environment loading stay outside the server monolith", () => {
  const server = source("server.js");
  const staticFiles = source("server/static-files.js");
  assert.match(server, /require\("\.\/server\/static-files"\)/);
  assert.match(server, /require\("\.\/server\/env"\)/);
  assert.doesNotMatch(server, /function serveStatic\(/);
  assert.match(staticFiles, /function createStaticHandler\(/);
  assert.match(staticFiles, /Content-Encoding": "gzip"/);
  assert.match(staticFiles, /max-age=31536000, immutable/);
});

test("environment loader preserves existing values and parses quoted values", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-env-test-"));
  try {
    fs.writeFileSync(path.join(temporaryRoot, ".env"), "EXISTING=replaced\nPLAIN=value\nQUOTED=\"hello world\"\n# ignored\n", "utf8");
    const environment = { EXISTING: "kept" };
    const { loadEnvFile } = require("../server/env");
    loadEnvFile(temporaryRoot, environment);
    assert.deepEqual(environment, { EXISTING: "kept", PLAIN: "value", QUOTED: "hello world" });
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("new dialog styles are public without exposing arbitrary module files", () => {
  const { isPublicStaticPath } = require("../server/static-files");
  for (const file of ["modules/production-work-ui.css", "modules/mobile-dialogs.css"]) assert.equal(isPublicStaticPath(file), true);
  for (const file of ["modules/private.css", "modules/private.json", "modules/../data/db.json", "server/static-files.js", ".env"]) assert.equal(isPublicStaticPath(file), false);
});
