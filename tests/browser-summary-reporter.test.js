"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const BrowserSummaryReporter = require("../tools/testing/browser-summary-reporter");

function browserCase(title, status, expectedStatus = "passed", errors = []) {
  return {
    titlePath: () => ["", "desktop-chromium", "browser.spec.js", title],
    results: [{ status, errors }],
    expectedStatus
  };
}

async function report(t, cases, runnerStatus = "passed") {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ppr-browser-summary-test-"));
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const outputFile = path.join(temporaryRoot, "reports", "browser-summary.json");
  const reporter = new BrowserSummaryReporter({ outputFile });
  reporter.onBegin({}, { allTests: () => cases });
  const outcome = await reporter.onEnd({ status: runnerStatus });
  const summary = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  return { outcome, summary };
}

const knownError = { message: "BROWSER-001: offline reopening shows the login overlay" };

test("browser summary persists successful and skipped scenarios separately", async t => {
  const { outcome, summary } = await report(t, [
    browserCase("login", "passed"),
    browserCase("optional browser", "skipped", "skipped")
  ]);

  assert.deepEqual(outcome, { status: "passed" });
  assert.equal(summary.status, "passed");
  assert.equal(summary.passed, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.knownFailures, 0);
  assert.equal(summary.unexpected, 0);
  assert.equal(summary.cases[0].title, "desktop-chromium / browser.spec.js / login");
  assert.equal(summary.cases[0].knownFailure, false);
});

test("a reproduced BROWSER-001 is recorded separately from working browser behavior", async t => {
  const { outcome, summary } = await report(t, [
    browserCase("login", "passed"),
    browserCase("offline reopening", "failed", "failed", [knownError])
  ]);

  assert.deepEqual(outcome, { status: "passed" });
  assert.equal(summary.status, "passed");
  assert.equal(summary.passed, 1);
  assert.equal(summary.knownFailures, 1);
  assert.equal(summary.unexpected, 0);
  assert.deepEqual(summary.cases[1], {
    title: "desktop-chromium / browser.spec.js / offline reopening",
    status: "failed",
    expectedStatus: "failed",
    knownFailure: true
  });
});

test("a known failure accompanied by a cleanup error overrides a masked successful run", async t => {
  const { outcome, summary } = await report(t, [
    browserCase("offline reopening", "failed", "failed", [
      knownError,
      { message: "PostgreSQL sandbox cleanup failed" }
    ])
  ]);

  assert.deepEqual(outcome, { status: "failed" });
  assert.equal(summary.status, "failed");
  assert.equal(summary.passed, 0);
  assert.equal(summary.knownFailures, 0);
  assert.equal(summary.unexpected, 1);
  assert.equal(summary.cases[0].knownFailure, false);
});

test("an unrelated error in an expected-failure scenario is an unexpected failure", async t => {
  const { outcome, summary } = await report(t, [
    browserCase("offline reopening", "failed", "failed", [
      { message: "No unhandled JavaScript errors: TypeError in application startup" }
    ])
  ]);

  assert.deepEqual(outcome, { status: "failed" });
  assert.equal(summary.status, "failed");
  assert.equal(summary.knownFailures, 0);
  assert.equal(summary.unexpected, 1);
  assert.equal(summary.cases[0].knownFailure, false);
});

test("an unexpected pass requires the known-failure annotation to be removed", async t => {
  const { outcome, summary } = await report(t, [
    browserCase("offline reopening", "passed", "failed")
  ]);

  assert.deepEqual(outcome, { status: "failed" });
  assert.equal(summary.status, "failed");
  assert.equal(summary.passed, 0);
  assert.equal(summary.knownFailures, 0);
  assert.equal(summary.unexpected, 1);
  assert.equal(summary.cases[0].status, "passed");
  assert.equal(summary.cases[0].knownFailure, false);
});

test("successful scenarios cannot erase a global runner failure", async t => {
  const { outcome, summary } = await report(t, [
    browserCase("login", "passed")
  ], "failed");

  assert.deepEqual(outcome, { status: "failed" });
  assert.equal(summary.status, "failed");
  assert.equal(summary.passed, 1);
  assert.equal(summary.knownFailures, 0);
  assert.equal(summary.unexpected, 0);
});
