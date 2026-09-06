const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 10000 },
  outputDir: "test-results",
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/results.json" }], ["./tools/testing/browser-summary-reporter.js"]],
  use: {
    locale: "ru-RU",
    timezoneId: "Asia/Qyzylorda",
    ignoreHTTPSErrors: true,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 }, launchOptions: { args: ["--ignore-certificate-errors"] } } },
    { name: "android-chromium", use: { ...devices["Pixel 7"], launchOptions: { args: ["--ignore-certificate-errors"] } } },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"] } }
  ]
});
