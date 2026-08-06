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
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

test("work permit is available and loads its mobile PDF dependency", () => {
  assert.match(html, /id="workPermitButton"/);
  assert.match(html, /id="workPermitScreen" class="view work-permit-screen" data-no-translate/);
  assert.match(html, /html2pdf\.bundle\.min\.js\?v=420-annual-ppr-pdf-assets/);
  assert.match(html, /mammoth\.browser\.min\.js\?v=420-annual-ppr-pdf-assets/);
  assert.match(html, /modules\/work-permit\.js\?v=420-annual-ppr-pdf-assets/);
  assert.match(app, /workPermitButton:\s*document\.querySelector\("#workPermitButton"\)/);
  assert.match(app, /window\.PprWorkPermit\?\.activate\(\)/);
});

test("all permit sections stay visible while optional rows remain dynamic", () => {
  assert.match(permit, /let activeOptionalSections = new Set\(defaultOptionalSectionIds\(\)\)/);
  assert.match(permit, /function sectionSelectorHtml\(\)[\s\S]*?return ""/);
  assert.match(permit, /section\.hidden = false/);
  assert.match(permit, /data-collapse-section=/);
  assert.match(permit, /collapsedOptionalSections\.has\(sectionId\)/);
  assert.match(permit, /text\("openSection"\)/);
  assert.match(permit, /text\("closeSection"\)/);
  assert.match(permit, /data-add-dynamic-row/);
  assert.match(permit, /data-delete-dynamic-row/);
  assert.match(permit, /if \(index === 0\) return ""/);
  assert.match(permit, /dynamicRows\[collection\]\[0\]\?\.id === rowId/);
  assert.match(permit, /section\.hidden\s*=\s*!activeOptionalSections\.has\(sectionId\)\s*\|\|\s*collapsedOptionalSections\.has\(sectionId\)/);
  assert.match(permit, /work-permit-table td\.no-print[\s\S]*?display:\s*none !important/);
});

test("admin form versions configure defaults only for new permit drafts", () => {
  assert.match(server, /formPolicies: \{ workPermit:/);
  assert.match(server, /settings: \{ companyName:.*formPolicies:/);
  assert.match(permit, /configuredOptionalSectionIds/);
  assert.match(permit, /new Set\(defaultOptionalSectionIds\(\)\)/);
  assert.match(app, /data-admin-form-builder/);
  assert.match(app, /Создать новую версию формы/);
});

test("instruction acknowledgements are stored on the server and visible to admin", () => {
  assert.match(server, /workPermitInstructionAcknowledgements/);
  assert.match(server, /work-permit-instructions\/acknowledge/);
  assert.match(permit, /acknowledgement_not_saved/);
  assert.match(permit, /X-Client-Protocol/);
  assert.match(permit, /payload\?\.ok !== true/);
  assert.match(permit, /serverAcknowledgedInstructionIds/);
  assert.match(permit, /completed_measures_extra/);
  assert.match(app, /data-admin-maintenance-tab="instructionLog"/);
  assert.match(app, /Журнал ознакомления с инструкциями/);
});

test("admin correction and storage centers preserve history without direct SQL", () => {
  assert.match(app, /data-admin-maintenance-tab="corrections"/);
  assert.match(app, /Безопасное исправление данных/);
  assert.match(app, /data-admin-maintenance-tab="storage"/);
  assert.match(app, /Хранилище и безопасная очистка/);
  assert.match(app, /Без прямого SQL/);
});

test("backup policy exposes daily weekly and monthly retention tiers", () => {
  assert.match(server, /function backupRetentionTier/);
  assert.match(server, /ageDays <= 14/);
  assert.match(server, /ageDays <= 56/);
  assert.match(server, /ageDays <= 366/);
  assert.match(server, /retentionTier/);
});

test("dangerous admin requests use idempotency receipts and friendly bad request text", () => {
  assert.match(server, /adminActionReceipts/);
  assert.match(server, /x-idempotency-key/);
  assert.match(app, /X-Idempotency-Key/);
  assert.match(app, /Сервер не принял данные/);
});

test("admin receives a final stages 18 to 25 completion notice", () => {
  assert.match(server, /admin-stages-18-25-complete-v1/);
  assert.match(server, /Административные этапы 18–25 завершены/);
  assert.match(server, /roles: \["editor"\]/);
});

test("people are selected once and reused in related fields", () => {
  assert.match(permit, /localStorage\.getItem\("ppr-pwa-users-v1"\)/);
  assert.match(permit, /source\.employeeId/);
  assert.match(permit, /employeeId === "manual"[\s\S]*?manualInput\?\.focus\(\)/);
  assert.match(permit, /function updateRelatedProducerFields\(\)/);
  assert.match(permit, /"completed_by_name",[\s\S]*?"completed_by_position"/);
  assert.match(permit, /primaryBrigadeMember\.name = name/);
  assert.match(permit, /primaryBrigadeMember\.profession = position/);
  assert.match(permit, /function updateRelatedAdmitterFields\(\)/);
  assert.match(permit, /function updateRelatedIssuerFields\(\)/);
  assert.match(permit, /employeeEntryMode: "Выберите сотрудника или ручной ввод"/);
  assert.match(permit, /function syncManualEmployeeInput\(control\)/);
  assert.match(permit, /permitState\[prefix\] = employee/);
  assert.match(permit, /start_producer/);
  assert.match(permit, /start_admitter/);
  assert.match(permit, /permit_returned/);
  assert.match(permit, /permit_accepted/);
  assert.match(app, /window\.currentUser = \{[\s\S]*?position:[\s\S]*?isPrimaryAdminEngineer\(\)/);
  assert.match(permit, /brigade_\$\{row\.id\}_instructor/);
  assert.match(permit, /row\.instructor = name/);
  assert.doesNotMatch(permit, /data-add-dynamic-row="completedMeasures"/);
  assert.match(permit, /field\("workshop_manual", "workshop"/);
  assert.match(permit, /field\("equipment_manual", "equipment"/);
  assert.doesNotMatch(permit, /\$\{workshopSelect\(/);
  assert.doesNotMatch(permit, /\$\{equipmentSelect\(/);
  assert.doesNotMatch(permit, /"work_equipment"/);
});

test("selected safety measures are combined into one section seven field", () => {
  assert.match(permit, /name="completed_measures_summary"/);
  assert.match(permit, /function syncCompletedMeasuresSummary\(\)/);
  assert.match(permit, /selectedSafetyMeasures\(\)[\s\S]*?\.join\("\\n"\)/);
  assert.match(permit, /completed_by_employee_id/);
  assert.match(permit, /completed_measures_extra/);
  assert.match(permit, /id="workPermitCompletedMeasuresPrintRows"/);
  assert.match(permit, /function syncCompletedMeasuresPrintRows\(\)/);
  assert.match(permit, /work-permit-paper\.is-print-layout \.work-permit-print-only/);
  assert.match(permit, /\.work-permit-screen-only[\s\S]*?display:\s*none !important/);
  assert.match(permit, /const SAFETY_DEFAULTS/);
  assert.match(permit, /const SAFETY_INSTALL_OPTIONS/);
  assert.match(permit, /const SAFETY_INSTRUCTIONS/);
  assert.match(permit, /function applySafetyAutofill/);
  assert.match(permit, /function syncSafetyInstallOptions/);
  assert.match(permit, /function syncInstructionAcknowledgements/);
  assert.match(permit, /data-instruction-ack/);
  assert.match(permit, /data-instruction-editor-id/);
  assert.match(permit, /data-instruction-word/);
  assert.match(permit, /mammoth\.extractRawText/);
  assert.match(permit, /function saveInstructionEditor/);
  assert.match(server, /\/api\/work-permit-instructions/);
  assert.match(server, /work_permit_instruction_saved/);
});

test("permit draft and print-safe values are preserved", () => {
  assert.match(permit, /ppr-work-permit-draft-v4/);
  assert.match(permit, /function draftOwnerKey\(\)/);
  assert.match(permit, /activeDraftOwnerKey !== nextDraftOwnerKey/);
  assert.match(permit, /function resetRuntimeForDraftOwner\(\)/);
  assert.match(permit, /version: 4/);
  assert.match(permit, /start: ""/);
  assert.match(permit, /date: ""/);
  assert.doesNotMatch(permit, /function brigadeChangeTypeOptions\(/);
  assert.match(permit, /function applyCurrentDateTimeDefaults\(\)/);
  assert.match(permit, /issuer_date: localDateValue\(now\)/);
  assert.match(permit, /start_date: localDateValue\(now\)/);
  assert.match(permit, /start_time: localTimeValue\(now\)/);
  assert.match(permit, /function saveDraft\([\s\S]*?showStatus = true/);
  assert.match(permit, /function restoreDraft\(\)/);
  assert.match(permit, /data-work-permit-print-for/);
  assert.match(permit, /function syncAllPrintValues\(\)/);
  assert.match(permit, /@page\s*\{[\s\S]*?size:\s*A4 portrait;[\s\S]*?margin:\s*10mm/);
});

test("official print uses only the selected language and omits instruction bodies", () => {
  assert.match(permit, /permitCode:\s*"НД"/);
  assert.match(permit, /permitCode:\s*"ЖР"/);
  assert.doesNotMatch(permit, />\s*НД\s*\/\s*ЖР\s*</);
  assert.match(permit, /data-work-permit-i18n="permitCode"/);
  assert.match(permit, /const SAFETY_DEFAULTS_KK/);
  assert.match(permit, /const SAFETY_INSTALL_OPTIONS_KK/);
  assert.match(permit, /const SAFETY_INSTRUCTION_TITLES_KK/);
  assert.match(permit, /function syncSafetyLanguageText\(\)/);
  assert.match(permit, /syncSafetyLanguageText\(\);/);
  assert.match(permit, /work-permit-paper\.is-print-layout \.work-permit-instruction-list/);
  assert.match(permit, /work-permit-paper\.is-print-layout \.work-permit-reminder/);
  assert.match(permit, /margin:\s*\[10, 10, 8, 22\]/);
  assert.match(permit, /font-family:\s*Calibri, Arial, sans-serif/);
});

test("phone layout is card based with final actions and PDF sharing", () => {
  assert.match(permit, /work-permit-final-actions[\s\S]*?workPermitPrintButton[\s\S]*?workPermitSharePdfButton/);
  assert.match(permit, /@media \(max-width: 700px\)[\s\S]*?\.work-permit-final-actions[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(permit, /\.work-permit-grid,[\s\S]*?grid-template-columns:\s*1fr !important/);
  assert.match(styles, /\.work-permit-responsive-table thead\s*\{[\s\S]*?display:\s*none/);
  assert.match(styles, /content:\s*attr\(data-mobile-label\)/);
  assert.match(permit, /function sharePermitPdf\(\)/);
  assert.match(permit, /navigator\.share/);
  assert.match(permit, /navigator\.canShare/);
  assert.match(permit, /manualInput[\s\S]*?\$\{options\}/);
  assert.match(permit, /function dynamicEmployeeEntry/);
  assert.match(permit, /position:\s*sticky;[\s\S]*?work-permit-final-actions/);
  assert.match(permit, /#workPermitFinishButton[\s\S]*?display:\s*none !important/);
  assert.match(permit, /#workPermitPrintButton[\s\S]*?display:\s*none !important/);
  assert.match(permit, /html2canvas:[\s\S]*?windowWidth:\s*1200[\s\S]*?windowHeight:\s*1600/);
  assert.match(permit, /form\.dataset\.eventsBound === "true"/);
  assert.match(permit, /form\.addEventListener\(\s*"click"/);
  assert.match(permit, /openSection:\s*"Показать поля"/);
  assert.match(permit, /closeSection:\s*"Скрыть поля"/);
  assert.match(permit, /work-permit-row-actions\.work-permit-empty-cell/);
});

test("printing claims the next shared permit number and refreshes its timestamp", () => {
  assert.match(permit, /async function claimPermitNumber\(\)/);
  assert.match(permit, /\/api\/work-permits\/claim-number/);
  assert.match(permit, /function updatePermitPrintTimestamp\(\)/);
  assert.match(permit, /window\.confirm\(text\("printNumberConfirm"\)\)/);
  assert.match(permit, /async function printPermit\(\)[\s\S]*?await claimPermitNumber\(\)/);
  assert.match(permit, /async function sharePermitPdf\(\)[\s\S]*?await claimPermitNumber\(\)/);
  assert.match(server, /workPermitLastNumber/);
  assert.match(server, /workPermitNumberClaims/);
  assert.match(server, /const previous = Number\(db\.workPermitNumberClaims\[requestId\]/);
  assert.match(permit, /pendingOutputRequestId/);
  assert.match(permit, /requestId: permitState\.pendingOutputRequestId/);
  assert.match(permit, /function completeOutputNumberClaim\(\)/);
  assert.match(server, /work_permit_number_claimed/);
  assert.match(server, /String\(result\)\.padStart\(4, "0"\)/);
  assert.match(permit, /start_date:\s*localDateValue\(now\)/);
  assert.match(permit, /start_time:\s*localTimeValue\(now\)/);
  assert.match(permit, /dynamicRows\.brigade\.forEach\(row =>/);
  assert.match(permit, /row\.briefing = localDateTimeValue\(now\)/);
  assert.match(permit, /value:\s*permitState\[prefix\]\?\.organization \|\| DEFAULT_COMPANY_NAME/);
  assert.match(permit, /readonly:\s*false,[\s\S]*?organization \|\| DEFAULT_COMPANY_NAME/);
});

test("section six reuses the manually entered admitter from section three", () => {
  assert.match(permit, /function updateRelatedAdmitterFields\(\)[\s\S]*?permitState\.issuer = \{[\s\S]*?setControlValue\("issuer_name", name\)[\s\S]*?setControlValue\("issuer_position", position\)/);
  assert.match(permit, /"issuer_name"[\s\S]*?readonly: true/);
  assert.match(permit, /"issuer_position"[\s\S]*?readonly: true/);
  assert.match(permit, /issuer:\s*null/);
});

test("permit output requires manual fields and acknowledged instructions", () => {
  assert.match(permit, /if \(measureId === "5\.9"\)[\s\S]*?checkbox\.checked = true;[\s\S]*?checkbox\.disabled = true/);
  assert.match(permit, /function isManualRequiredControl\(control\)/);
  assert.match(permit, /if \(\/signature\/i\.test\(control\.name\)\) return false/);
  assert.match(permit, /control\.dataset\.autofilled === "true"/);
  assert.match(permit, /function validatePermitForOutput\(\)/);
  assert.match(permit, /selectedInstructions\.length \|\| missingAcknowledgement/);
  assert.match(permit, /if \(!validatePermitForOutput\(\)\) return;[\s\S]*?claimPermitNumber/);
  assert.match(permit, /work-permit-validation-error/);
});

test("service worker caches the current permit assets", () => {
  assert.match(serviceWorker, /ppr-v420-annual-ppr-pdf-assets/);
  assert.match(serviceWorker, /html2pdf\.bundle\.min\.js\?v=420-annual-ppr-pdf-assets/);
  assert.match(serviceWorker, /mammoth\.browser\.min\.js\?v=420-annual-ppr-pdf-assets/);
  assert.match(serviceWorker, /modules\/work-permit\.js\?v=420-annual-ppr-pdf-assets/);
  assert.match(serviceWorker, /styles\.css\?v=420-annual-ppr-pdf-assets/);
  assert.match(serviceWorker, /app\.js\?v=420-annual-ppr-pdf-assets/);
});
