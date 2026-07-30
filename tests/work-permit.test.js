const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const permit = fs.readFileSync(path.join(root, "modules", "work-permit.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

test("work permit is available from the home screen and registered as an app view", () => {
  assert.match(html, /id="workPermitButton"[\s\S]*?>[\s\S]*?Наряд-допуск/);
  assert.match(html, /id="workPermitScreen" class="view work-permit-screen" data-no-translate/);
  assert.match(html, /modules\/work-permit\.js\?v=333-work-permit/);
  assert.match(app, /workPermitButton:\s*document\.querySelector\("#workPermitButton"\)/);
  assert.match(app, /ui\.workPermitButton\?\.addEventListener\("click",\s*\(\) => \{[\s\S]*?show\("workPermit"\)/);
  assert.match(app, /if \(view === "workPermit"\) return isProfileReady\(\)/);
  assert.match(app, /window\.PprWorkPermit\?\.activate\(\)/);
});

test("one permit switches completely between Russian and Kazakh without rebuilding its fields", () => {
  assert.match(permit, /const TEXT = \{[\s\S]*?ru:\s*\{[\s\S]*?kk:\s*\{/);
  assert.match(permit, /screenTitle:\s*"Наряд-допуск"/);
  assert.match(permit, /screenTitle:\s*"Жұмысқа рұқсат"/);
  assert.match(permit, /id="workPermitLanguageSelect"/);
  assert.match(permit, /function applyLanguage\(nextLanguage = language\)/);
  assert.match(permit, /querySelectorAll\("\[data-work-permit-i18n\]"\)[\s\S]*?element\.textContent = text\(key\)/);
  assert.doesNotMatch(permit.slice(permit.indexOf("function applyLanguage"), permit.indexOf("function clearForm")), /innerHTML\s*=/);
  assert.match(permit, /const TEAM_ROW_COUNT = 10/);
  assert.match(permit, /const BREAK_ROW_COUNT = 4/);
});

test("permit draft, reminder visibility, and print-safe values are preserved", () => {
  assert.match(permit, /ppr-work-permit-draft-v1/);
  assert.match(permit, /function saveDraft\(showStatus = true\)/);
  assert.match(permit, /function restoreDraft\(\)/);
  assert.match(permit, /id="workPermitReminderToggle"[\s\S]*?aria-expanded="true"/);
  assert.match(permit, /id="workPermitReminderShow"[\s\S]*?hidden/);
  assert.match(permit, /function setReminderVisible\(visible, persist = true\)/);
  assert.match(permit, /data-work-permit-print-for/);
  assert.match(permit, /function syncAllPrintValues\(\)/);
  assert.match(permit, /document\.body\.classList\.add\("printing-work-permit"\)/);
  assert.match(permit, /window\.addEventListener\("afterprint", cleanup\)/);
  assert.match(permit, /window\.print\(\)/);
});

test("phone layout is vertical and print layout is A4 portrait", () => {
  assert.match(styles, /@media screen and \(max-width: 680px\)[\s\S]*?\.work-permit-grid-four\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(styles, /\.work-permit-responsive-table thead\s*\{[\s\S]*?display:\s*none/);
  assert.match(styles, /content:\s*attr\(data-mobile-label\)/);
  assert.match(styles, /body\.printing-work-permit \*[\s\S]*?visibility:\s*hidden !important/);
  assert.match(styles, /body\.printing-work-permit #workPermitScreen[\s\S]*?display:\s*block !important/);
  assert.match(styles, /\.work-permit-table thead\s*\{[\s\S]*?display:\s*table-header-group !important/);
  assert.match(styles, /body\.printing-work-permit \.work-permit-reminder[\s\S]*?break-before:\s*page/);
  assert.match(permit, /@page \{ size: A4 portrait; margin: 10mm; \}/);
});

test("service worker includes the new permit module and cache version", () => {
  assert.match(serviceWorker, /ppr-v333-work-permit/);
  assert.match(serviceWorker, /modules\/work-permit\.js\?v=333-work-permit/);
  assert.match(serviceWorker, /styles\.css\?v=333-work-permit/);
  assert.match(serviceWorker, /app\.js\?v=333-work-permit/);
});
