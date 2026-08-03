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

test("work permit is available and loads its mobile PDF dependency", () => {
  assert.match(html, /id="workPermitButton"/);
  assert.match(html, /id="workPermitScreen" class="view work-permit-screen" data-no-translate/);
  assert.match(html, /html2pdf\.bundle\.min\.js\?v=335-work-permit-manual/);
  assert.match(html, /modules\/work-permit\.js\?v=335-work-permit-manual/);
  assert.match(app, /workPermitButton:\s*document\.querySelector\("#workPermitButton"\)/);
  assert.match(app, /window\.PprWorkPermit\?\.activate\(\)/);
});

test("all permit sections stay visible while optional rows remain dynamic", () => {
  assert.match(permit, /let activeOptionalSections = new Set\(OPTIONAL_SECTION_IDS\)/);
  assert.match(permit, /function sectionSelectorHtml\(\)[\s\S]*?return ""/);
  assert.match(permit, /section\.hidden = false/);
  assert.match(permit, /data-add-dynamic-row/);
  assert.match(permit, /data-delete-dynamic-row/);
});

test("people are selected once and reused in related fields", () => {
  assert.match(permit, /localStorage\.getItem\("ppr-pwa-users-v1"\)/);
  assert.match(permit, /source\.employeeId/);
  assert.match(permit, /employeeId === "manual"[\s\S]*?manualInput\?\.focus\(\)/);
  assert.match(permit, /function updateRelatedProducerFields\(\)/);
  assert.match(permit, /function updateRelatedAdmitterFields\(\)/);
  assert.match(permit, /function updateRelatedIssuerFields\(\)/);
  assert.match(permit, /employeeEntryMode: "Выберите сотрудника или ручной ввод"/);
  assert.match(permit, /function syncManualEmployeeInput\(control\)/);
  assert.match(permit, /permitState\[prefix\] = employee/);
  assert.match(permit, /start_producer/);
  assert.match(permit, /start_admitter/);
  assert.match(permit, /permit_returned/);
  assert.match(permit, /permit_accepted/);
});

test("selected safety measures are combined into one section seven field", () => {
  assert.match(permit, /name="completed_measures_summary"/);
  assert.match(permit, /function syncCompletedMeasuresSummary\(\)/);
  assert.match(permit, /selectedSafetyMeasures\(\)[\s\S]*?\.join\("\\n"\)/);
  assert.match(permit, /completed_by_employee_id/);
  assert.match(permit, /completed_measures_extra/);
});

test("permit draft and print-safe values are preserved", () => {
  assert.match(permit, /ppr-work-permit-draft-v3/);
  assert.match(permit, /function saveDraft\([\s\S]*?showStatus = true/);
  assert.match(permit, /function restoreDraft\(\)/);
  assert.match(permit, /data-work-permit-print-for/);
  assert.match(permit, /function syncAllPrintValues\(\)/);
  assert.match(permit, /@page\s*\{[\s\S]*?size:\s*A4 portrait;[\s\S]*?margin:\s*10mm/);
});

test("phone layout is card based with a fixed action bar and PDF sharing", () => {
  assert.match(permit, /@media \(max-width: 700px\)[\s\S]*?\.work-permit-toolbar-actions[\s\S]*?position:\s*fixed/);
  assert.match(permit, /\.work-permit-grid,[\s\S]*?grid-template-columns:\s*1fr !important/);
  assert.match(styles, /\.work-permit-responsive-table thead\s*\{[\s\S]*?display:\s*none/);
  assert.match(styles, /content:\s*attr\(data-mobile-label\)/);
  assert.match(permit, /function sharePermitPdf\(\)/);
  assert.match(permit, /navigator\.share/);
  assert.match(permit, /navigator\.canShare/);
});

test("service worker caches the current permit assets", () => {
  assert.match(serviceWorker, /ppr-v335-work-permit-manual/);
  assert.match(serviceWorker, /html2pdf\.bundle\.min\.js\?v=335-work-permit-manual/);
  assert.match(serviceWorker, /modules\/work-permit\.js\?v=335-work-permit-manual/);
  assert.match(serviceWorker, /styles\.css\?v=335-work-permit-manual/);
  assert.match(serviceWorker, /app\.js\?v=335-work-permit-manual/);
});
