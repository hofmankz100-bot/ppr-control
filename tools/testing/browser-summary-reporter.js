const fs = require("node:fs");
const path = require("node:path");

// Playwright's default totals count expected failures as passed. Keep a separate
// explicit summary so a known application defect cannot look like working UI.
class BrowserSummaryReporter {
  constructor(options = {}) { this.outputFile = options.outputFile || "test-results/browser-summary.json"; }
  onBegin(config, suite) { this.suite = suite; }

  async onEnd(result) {
    const summary = { status: result.status, passed: 0, knownFailures: 0, skipped: 0, unexpected: 0, cases: [] };
    for (const test of this.suite.allTests()) {
      const last = test.results.at(-1);
      const status = last?.status || "not-run";
      const knownFailure = status === "failed" && test.expectedStatus === "failed"
        && last.errors?.length === 1 && /BROWSER-00[12]:/.test(String(last.errors[0].message || ""));
      if (knownFailure) summary.knownFailures += 1;
      else if (status === "passed" && test.expectedStatus === "passed") summary.passed += 1;
      else if (status === "skipped") summary.skipped += 1;
      else summary.unexpected += 1;
      summary.cases.push({ title: test.titlePath().filter(Boolean).join(" / "), status, expectedStatus: test.expectedStatus, knownFailure });
    }
    if (summary.unexpected) summary.status = "failed";
    fs.mkdirSync(path.dirname(path.resolve(this.outputFile)), { recursive: true });
    fs.writeFileSync(path.resolve(this.outputFile), JSON.stringify(summary, null, 2) + "\n");
    process.stdout.write(`\nBrowser behavior: ${summary.passed} passed; ${summary.knownFailures} reproduced known defects; ${summary.skipped} skipped; ${summary.unexpected} unexpected results.\n`);
    return { status: summary.status };
  }
}

module.exports = BrowserSummaryReporter;
