const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

test("GPM journal has assignments, inspections, PTO workflow and responsible approval", () => {
  assert.match(app, /function gpmEquipmentForm\(item = \{\}\)/);
  assert.match(app, /Ответственный за эксплуатацию/);
  assert.match(app, /Ответственный за исправное состояние/);
  assert.match(app, /function gpmInspectionForm\(item\)/);
  assert.match(app, /function gpmEventForm\(item\)/);
  assert.match(app, /data-gpm-approve/);
});

test("the common phone scanner opens shift and monthly crane inspections for an authorized user", () => {
  assert.match(app, /function parseGpmQrScanValue\(value = ""\)/);
  assert.match(app, /new URL\(raw, location\.origin\)\.searchParams\.get\("gpmQr"\)/);
  assert.match(app, /const gpmParsed = parseGpmQrScanValue\(value\)/);
  assert.match(app, /if \(!gpmCanInspect\(item\)\)/);
  assert.match(app, /if \(parsed\.kind === "gpm"\)/);
  assert.match(app, /current\.gpmScanMode = parsed\.mode/);
});

test("printed crane QR codes use a short redirect and a camera-friendly matrix", () => {
  assert.match(app, /new URL\("\/api\/gpm-qr", location\.origin\)/);
  assert.match(app, /size=640&ecc=M&margin=4/);
  assert.match(server, /pathname === "\/api\/gpm-qr" && req\.method === "GET"/);
  assert.match(server, /PPRGPM\|\$\{mode\}\|\$\{id\}/);
  assert.match(server, /const errorCorrectionLevel = \["L", "M", "Q", "H"\]/);
});

test("the equipment card and crane journal print the exact same two QR payloads", () => {
  assert.match(app, /data-print-all-gpm-qr/);
  assert.match(app, /allCraneQrCount = modernCraneEquipment \? gpmEquipmentList\("gpm"\)\.length \* 2 : 0/);
  assert.match(app, /По 2 на каждый кран/);
  assert.match(app, /function gpmQrImageUrl\(item, mode = "shift"\)/);
  assert.match(app, /function printGpmQrPair\(item\)/);
  assert.match(app, /function printAllGpmQrCodes\(items = gpmEquipmentList\("gpm"\)\)/);
  assert.match(app, /gpmQrImageUrl\(card\.item, card\.mode\)/);
  assert.match(app, /printAllGpmQrCodes\(\)/);
});

test("linked crane beams no longer expose or accept the legacy node workflow", () => {
  assert.match(app, /function linkedCraneJournalForEquipment\(equipmentOrId\)/);
  assert.match(app, /if \(linkedCraneJournalForEquipment\(eq\)\)/);
  assert.match(app, /Старый QR узла этой кран-балки отключён/);
  assert.match(app, /if \(modernCraneEquipment\) \{/);
  assert.match(app, /Обход кран-балки выполняется только по двум QR/);
  assert.match(app, /2 QR · вахтенный журнал/);
  assert.match(styles, /\.modern-crane-workflow-cell/);
  assert.match(app, /const equipmentOperationalPause = modernCraneEquipment \? null : activeOperationalPause/);
  assert.match(app, /catalogEditorRole\(\) === "editor" && !modernCraneEquipment/);
});

test("crane QR opens a quick result screen and expands details only for a remark", () => {
  assert.match(app, /data-gpm-all-good/);
  assert.match(app, /data-gpm-open-remark/);
  assert.match(app, /current\.gpmInspectionStep === "remark" \? gpmInspectionForm\(item\)/);
  assert.match(app, /function saveGpmInspectionResult\(item, inspectionType, checked, defects = ""\)/);
  assert.match(app, /GPM_INSPECTION_POINTS\.map\(\(\) => true\)/);
  assert.match(app, /Вахтенный журнал заполнен автоматически/);
  assert.match(styles, /\.gpm-quick-result/);
});

test("disabled crane calendar cells preserve the normal day-column width", () => {
  assert.match(app, /days\.forEach\(\(\) => \{/);
  assert.doesNotMatch(app, /td\.colSpan = days\.length/);
  assert.doesNotMatch(styles, /modern-crane-workflow-cell\{min-width:420px/);
});

test("both crane QR inspections print in the monthly shift journal without a separate PTO journal", () => {
  assert.match(app, /journalMonthMatches\(entry\.shiftDate \|\| entry\.createdAt, month\)/);
  assert.match(app, /function gpmResponsiblePrintSheetHtml\(item, month = selectedJournalMonth\(\)\)/);
  assert.match(styles, /gpm-responsible-print-sheet.*break-before:page/);
  assert.match(app, /if \(hasDefect\) \{/);
  assert.doesNotMatch(app, /if \(inspectionType === "monthly" \|\| hasDefect\)/);
  assert.doesNotMatch(app, /Ежемесячный журнал · верхний QR, ПТО и ремонты/);
});

test("the official crane shift journal prints the resolution comment and its audit details", () => {
  assert.match(app, /const resolutionComment = relatedEvent\?\.resolutionComment \|\| ""/);
  assert.match(app, /Комментарий об устранении неисправности/);
  assert.match(app, /resolutionDate = relatedEvent\?\.resolvedAt \? dateTimeHuman/);
  assert.match(app, /Исполнитель не указан/);
  assert.match(styles, /gpm-official-resolution\{grid-column:1\/-1/);
});

test("the crane journal uses one electromechanic inspection field", () => {
  assert.match(app, /Результаты осмотра крана электромехаником/);
  assert.match(app, /gpm-official-electromechanic/);
  assert.doesNotMatch(app, /Результаты осмотра крана слесарем/);
  assert.doesNotMatch(app, /Результаты осмотра крана электромонтёром/);
  assert.match(styles, /gpm-official-electromechanic\{grid-column:1\/-1/);
});

test("GPM configuration rights are assigned separately from job role and approval rights", () => {
  assert.match(app, /function gpmCanManage\(\)/);
  assert.match(app, /gpmManagerKeys\(\)\.has\(gpmUserKey\(\)\)/);
  assert.doesNotMatch(app, /gpmIsAdmin\(\) \|\| profile\?\.role === "mechanicalEngineer"/);
  assert.match(app, /ui\.gpmAddButton\.hidden = qrInspectionOpen \|\| !gpmCanManage\(\)/);
  assert.match(app, /qrInspectionOpen && selected \? gpmQrInspectionScreenHtml\(selected\)/);
  assert.match(app, /assignedKeys\.includes\(key\)/);
  assert.match(app, /authorEmployeeId: profile\?\.employeeId/);
  assert.match(app, /function gpmOfficialShiftJournalHtml/);
  assert.match(app, /ФОРМА ВАХТЕННОГО ЖУРНАЛА/);
  assert.match(app, /Приложение 14 к Правилам обеспечения промышленной безопасности/);
  assert.match(app, /Смену принял \(Ф\.И\.О\., электронная подпись\)/);
  assert.match(styles, /\.gpm-official-meta/);
  assert.match(app, /profile\?\.craneOnly === true/);
  assert.match(app, /return "craneOperator"/);
  assert.match(app, /Только QR-обход назначенных кран-балок/);
  assert.match(server, /target\.craneOnly = craneOnly/);
  assert.match(app, /function gpmIsResponsible\(item\)/);
});

test("admin can grant and revoke GPM editor access by unique employee account", () => {
  assert.match(app, /function gpmManagerForm\(\)/);
  assert.match(app, /function saveGpmManagerForm\(form\)/);
  assert.match(app, /gpmManagerKeys\(\)\.has\(gpmUserKey\(\)\)/);
  assert.doesNotMatch(app, /GPM_PERSONAL_MANAGERS/);
  assert.match(server, /managerMigrationVersion !== "initial-maksut-v1"/);
});

test("GPM deadlines enter the common PPR reminders and open the separate journal", () => {
  assert.match(app, /gpmDueEntries\(\)\.forEach/);
  assert.match(app, /data-open-gpm-reminder/);
  assert.match(app, /show\("gpm"\)/);
});

test("GPM journal prints in landscape and supports image or PDF documents", () => {
  assert.match(styles, /body\.printing-gpm-journal/);
  assert.match(styles, /@page \{ size:A4 landscape/);
  assert.match(app, /accept="image\/\*,application\/pdf"/);
  assert.match(server, /application\\\/pdf/);
  assert.match(server, /jpg\|jpeg\|png\|webp\|pdf/);
});

test("only GPM equipment replaces its aggregate journal and no separate home button remains", () => {
  assert.match(app, /function isGpmEquipment\(eq\)/);
  assert.match(app, /text\.includes\("гпм"\)/);
  assert.doesNotMatch(app, /\/\\bгпм\\b\//);
  assert.match(app, /gpmEquipment \? `data-gpm-equipment=/);
  assert.match(app, /: `data-aggregate-equipment=/);
  assert.match(app, /document\.querySelector\("#gpmOpenButton"\)\?\.remove\(\)/);
  assert.doesNotMatch(app, /button\.id = "gpmOpenButton"/);
  assert.match(app, /const sourceEquipmentId = Number/);
});

test("forklifts use a separate clean journal and legacy GPM records are removed", () => {
  assert.match(app, /function isForkliftEquipment\(eq\)/);
  assert.match(app, /"Журнал погрузчика"/);
  assert.match(app, /function purgeLegacyForkliftGpmJournal\(\)/);
  assert.match(app, /delete store\.inspections\[id\]/);
  assert.match(app, /delete store\.events\[id\]/);
  assert.match(app, /equipmentKind: current\.gpmJournalKind === "forklift"/);
});
