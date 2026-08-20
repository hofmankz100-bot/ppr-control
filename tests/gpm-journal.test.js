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
  assert.match(app, /const url = new URL\(raw, location\.origin\)/);
  assert.match(app, /parseGpmQrValue\(url\.searchParams\.get\("gpmQr"\) \|\| ""\)/);
  assert.match(app, /const gpmParsed = parseGpmQrScanValue\(value\)/);
  assert.match(app, /if \(!gpmCanInspect\(item, gpmParsed\.mode\)\)/);
  assert.match(app, /if \(parsed\.kind === "gpm"\)/);
  assert.match(app, /current\.gpmScanMode = parsed\.mode/);
});

test("iPhone QR camera waits for a real video frame instead of showing a blank panel", () => {
  assert.match(app, /video\.setAttribute\("webkit-playsinline", ""\)/);
  assert.match(app, /camera-metadata-timeout/);
  assert.match(app, /await video\.play\(\);\s+video\.hidden = false/);
  assert.match(app, /video\.hidden = true;\s+video\.srcObject = null/);
  assert.match(styles, /\.qr-scan-panel video\[hidden\]\{display:none!important\}/);
});

test("mobile QR camera retries without strict rear-camera constraints and uses platform-neutral help", () => {
  assert.match(app, /catch \(primaryCameraError\)/);
  assert.match(app, /getUserMedia\(\{ video: true, audio: false \}\)/);
  assert.match(app, /Разрешите камеру для ППР Контроль в настройках браузера или приложения/);
  assert.doesNotMatch(app, /Разрешите доступ к камере в настройках iPhone/);
});

test("mobile QR scanner requests the camera before awaiting the decoder", () => {
  const scanner = app.slice(app.indexOf("const scanWithLiveCamera"), app.indexOf("const detectQrWithNativeDetector"));
  assert.ok(scanner.indexOf("getUserMedia") < scanner.indexOf("await ensureJsQr()"));
  assert.match(scanner, /if \(!hasQrReader\) throw new Error\("qr-decoder-unavailable"\)/);
});

test("a decoded crane QR is matched safely and an invalid result does not stop the camera", () => {
  assert.match(app, /String\(entry\.id\) === String\(gpmParsed\.gpmId\)/);
  assert.match(app, /const applied = applyValue\(value\)/);
  assert.match(app, /if \(applied\) \{[\s\S]{0,180}return finish\(applied\)/);
  assert.doesNotMatch(app, /return finish\(applyValue\(value\)\)/);
});

test("engineers can scan both crane QR modes while electromechanics can scan monthly", () => {
  assert.match(app, /function gpmCanInspect\(item, mode = ""\)/);
  assert.match(app, /gpmIsAdmin\(\) \|\| gpmIsEngineer\(item\) \|\| gpmIsResponsible\(item\)/);
  assert.match(app, /mode === "monthly" && isElectromechanicRole\(profile\?\.role\)/);
  assert.match(app, /gpmCanInspect\(item, gpmParsed\.mode\)/);
});

test("crane QR defects can be resolved during inspection but still require engineer confirmation", () => {
  assert.match(app, /name="resolvedDuringInspection"/);
  assert.match(app, /name="resolutionComment"/);
  assert.match(app, /status: resolvedNow \? "awaitingEngineer" : "open"/);
  assert.match(app, /resolvedDuringInspection: Boolean\(resolvedNow\)/);
  assert.match(app, /Устранение отправлено инженеру на обязательное подтверждение/);
});

test("ordinary QR remarks support immediate resolution through the existing confirmation workflow", () => {
  assert.match(app, /data-qr-resolved-now/);
  assert.match(app, /data-qr-resolution/);
  assert.match(app, /publishRemarkCollaborationAction\(parsed\.equipmentId, parsed\.nodeIndex, shift\.date, "resolve"/);
  assert.match(app, /Устранение отправлено инженеру на подтверждение/);
});

test("crane QR uses the same live scanner as all other equipment nodes", () => {
  assert.doesNotMatch(app, /iosNativeCamera/);
  assert.match(app, /const ok = await scanWithLiveCamera\(video, messageEl, applyScannedValue/);
  assert.match(app, /const gpmParsed = parseGpmQrScanValue\(value\)/);
  assert.match(app, /if \(!value\) \{\s+video\.hidden = true/);
});

test("QR dialog stays a live scanner and never switches itself to photo capture", () => {
  assert.match(app, /data-qr-retry hidden>Перезапустить сканер/);
  assert.doesNotMatch(app, /data-qr-photo(?:>|\])/);
  assert.doesNotMatch(app, /Date\.now\(\) - started > 45000/);
  assert.doesNotMatch(app, /ok = await scanFromPhoto\(messageEl\)/);
  assert.match(app, /const ok = await scanWithLiveCamera\(video, messageEl, applyScannedValue/);
});

test("printed crane QR codes use a short redirect and a camera-friendly matrix", () => {
  assert.match(app, /new URL\("\/api\/gpm-qr", location\.origin\)/);
  assert.match(app, /size=720&data=/);
  assert.match(server, /pathname === "\/api\/gpm-qr" && req\.method === "GET"/);
  assert.match(server, /PPRGPM\|\$\{mode\}\|\$\{id\}/);
  assert.match(server, /const errorCorrectionLevel = \["L", "M", "Q", "H"\]/);
});

test("live scanner recognizes the short URL actually encoded in crane QR images", () => {
  assert.match(app, /if \(url\.pathname === "\/api\/gpm-qr"\)/);
  assert.match(app, /url\.searchParams\.get\("id"\)/);
  assert.match(app, /url\.searchParams\.get\("mode"\)/);
  assert.match(app, /if \(gpmId && \["shift", "monthly"\]\.includes\(mode\)\) return \{ mode, gpmId \}/);
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
  assert.match(app, /QR-обходы кран-балок: ежесменные/);
  assert.match(app, /2 QR · вахтенный журнал/);
  assert.match(styles, /\.modern-crane-workflow-cell/);
  assert.match(app, /const equipmentOperationalPause = modernCraneEquipment \? null : activeOperationalPause/);
  assert.match(app, /catalogEditorRole\(\) === "editor" && !modernCraneEquipment/);
});

test("crane QR opens a quick result screen and expands details only for a remark", () => {
  assert.match(app, /data-gpm-all-good/);
  assert.match(app, /data-gpm-open-remark/);
  assert.match(app, /current\.gpmInspectionStep === "remark" \? gpmInspectionForm\(item\)/);
  assert.match(app, /function saveGpmInspectionResult\(item, inspectionType, checked, defects = "", immediateResolution = \{\}\)/);
  assert.match(app, /GPM_INSPECTION_POINTS\.map\(\(\) => true\)/);
  assert.match(app, /Вахтенный журнал заполнен автоматически/);
  assert.match(styles, /\.gpm-quick-result/);
});

test("disabled crane calendar cells preserve the normal day-column width", () => {
  assert.match(app, /days\.forEach\(day => \{/);
  assert.doesNotMatch(app, /td\.colSpan = days\.length/);
  assert.doesNotMatch(styles, /modern-crane-workflow-cell\{min-width:420px/);
});

test("crane calendar cell shows separate shift and monthly QR inspection counters", () => {
  assert.match(app, /function gpmQrInspectionCounters\(date, items = gpmEquipmentList\("gpm"\)\)/);
  assert.match(app, /shiftTotal: items\.length \* 2/);
  assert.match(app, /monthlyTotal: items\.length/);
  assert.match(app, /Ежесменные <b>\$\{counters\.shiftDone\}\/\$\{counters\.shiftTotal\}<\/b>/);
  assert.match(app, /Ежемесячные <b>\$\{counters\.monthlyDone\}\/\$\{counters\.monthlyTotal\}<\/b>/);
});

test("both crane QR inspections print in the monthly shift journal without a separate PTO journal", () => {
  assert.match(app, /journalMonthMatches\(entry\.shiftDate \|\| entry\.createdAt, month\)/);
  assert.match(app, /function gpmResponsiblePrintSheetHtml\(item, month = selectedJournalMonth\(\)\)/);
  assert.match(styles, /printing-gpm-responsibles \.gpm-responsible-print-sheet/);
  assert.match(app, /if \(hasDefect\) \{/);
  assert.doesNotMatch(app, /if \(inspectionType === "monthly" \|\| hasDefect\)/);
  assert.doesNotMatch(app, /Ежемесячный журнал · верхний QR, ПТО и ремонты/);
});

test("crane journal is compact and responsible persons print separately", () => {
  assert.match(app, /data-gpm-print-responsibles/);
  assert.match(app, /function printGpmResponsibles\(\)/);
  assert.match(app, /printing-gpm-responsibles/);
  assert.match(styles, /printing-gpm-journal \.gpm-responsible-print-sheet \{ display:none !important; \}/);
  assert.match(styles, /printing-gpm-journal \.gpm-official-checks td \{ padding:1\.4mm/);
  assert.match(styles, /printing-gpm-responsibles \.gpm-responsible-print-sheet \{ display:block/);
});

test("print keeps crane metadata and signatures in desktop columns on one sheet", () => {
  assert.match(styles, /@media screen and \(max-width:760px\)/);
  assert.match(styles, /printing-gpm-journal \.gpm-official-meta \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\) !important; \}/);
  assert.match(styles, /printing-gpm-journal \.gpm-official-signatures \{ grid-template-columns:1fr 1fr !important;break-inside:avoid;page-break-inside:avoid; \}/);
  assert.doesNotMatch(styles, /@media\(max-width:760px\)\{\.gpm-official-sheet/);
});

test("crane journal print never adds a trailing empty page", () => {
  assert.match(styles, /gpm-official-sheet:not\(:last-child\) \{ break-after:page;page-break-after:always; \}/);
  assert.match(styles, /gpm-official-sheet \{ break-after:auto;page-break-after:auto/);
  assert.doesNotMatch(styles, /gpm-official-sheet \{ break-after:page;page-break-after:always/);
  assert.match(styles, /#gpmPanel > :not\(\.gpm-layout\)/);
  assert.match(styles, /\.gpm-equipment-list \{ display:none !important; \}/);
});

test("crane journal prints from an isolated document without application layout", () => {
  assert.match(app, /const popup = window\.open\("", "_blank", "width=1200,height=900"\)/);
  assert.match(app, /<body class="printing-gpm-journal"><main data-gpm-print-root>/);
  assert.match(app, /gpmOfficialShiftJournalHtml\(item, inspections\)/);
  assert.match(app, /position:static!important;inset:auto!important/);
  assert.doesNotMatch(app, /function printGpmJournal\(\) \{[\s\S]*?document\.body\.classList\.add\("printing-gpm-journal"\)/);
});

test("monthly upper-QR entry is unmistakably marked as an electromechanic inspection", () => {
  assert.match(app, /const monthlyInspection = entry\?\.inspectionType === "monthly"/);
  assert.match(app, /ЕЖЕМЕСЯЧНЫЙ ОСМОТР ЭЛЕКТРОМЕХАНИКОМ · ВЕРХНИЙ QR/);
  assert.match(app, /gpm-official-monthly/);
  assert.match(styles, /\.gpm-monthly-inspection-banner/);
  assert.match(styles, /printing-gpm-journal \.gpm-monthly-inspection-banner/);
});

test("the official crane shift journal prints the resolution comment and its audit details", () => {
  assert.match(app, /<h4>ВАХТЕННЫЙ ЖУРНАЛ<\/h4>/);
  assert.doesNotMatch(app, /<h4>ФОРМА ВАХТЕННОГО ЖУРНАЛА<\/h4>/);
  assert.match(app, /const resolutionComment = relatedEvent\?\.resolutionComment \|\| ""/);
  assert.match(app, /Комментарий об устранении неисправности/);
  assert.match(app, /resolutionDate = relatedEvent\?\.resolvedAt \? dateTimeHuman/);
  assert.match(app, /Исполнитель не указан/);
  assert.match(styles, /gpm-official-resolution\{grid-column:1\/-1/);
});

test("crane journal does not repeat the resolution comment inside every defect row", () => {
  assert.doesNotMatch(app, /<span>Устранено: \$\{escapeHtml\(resolutionComment\)\}<\/span>/);
  assert.match(app, /class="gpm-official-resolution"/);
  assert.match(app, /Комментарий об устранении неисправности/);
});

test("assigned crane operators are printed directly in the shift journal", () => {
  assert.match(app, /Назначенные операторы кран-балки:/);
  assert.match(app, /gpmInspectorDisplayNames\(item\)/);
  assert.match(app, /gpm-official-assigned-operators/);
  assert.match(styles, /gpm-official-assigned-operators\{grid-column:1\/-1/);
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
  assert.match(app, /ВАХТЕННЫЙ ЖУРНАЛ/);
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

test("crane QR inspections feed PPR deadlines, factory reporting and only monthly electromechanic points", () => {
  assert.match(app, /type: "monthlyQr", label: "Плановое ТО"/);
  assert.match(app, /item\.nextMonthlyInspectionDate = gpmDatePlusMonth\(shift\.date\)/);
  assert.match(app, /craneShiftQrDone/);
  assert.match(app, /craneMonthlyQrDone/);
  assert.match(app, /!linkedCraneJournalForEquipment\(eq\)/);
  assert.match(app, /inspection\?\.inspectionType !== "monthly"/);
  assert.match(app, /!isElectromechanicRole\(inspection\.authorRole\)/);
  assert.doesNotMatch(app, /inspection\?\.inspectionType === "shift"[\s\S]{0,500}WORK_RATING_POINTS/);
});

test("monthly upper QR replaces rather than duplicates planned maintenance for cranes", () => {
  assert.match(app, /gpmItemKind\(item\) === "gpm"[\s\S]{0,180}\? \[\{ item, type: "monthlyQr"/);
  assert.match(app, /: \[\{ item, type: "maintenance", label: "Плановое техническое обслуживание"/);
  assert.match(app, /journalKind === "gpm"[\s\S]{0,220}Следующее Плановое ТО[\s\S]{0,220}: `<label><span>Следующее плановое ТО/);
});

test("existing crane planned maintenance is staggered one crane per day", () => {
  assert.match(app, /GPM_MONTHLY_SCHEDULE_VERSION = "one-crane-per-day-v2"/);
  assert.match(app, /function distributeGpmMonthlySchedule\(targetState\)/);
  assert.match(app, /scheduled\.setDate\(scheduled\.getDate\(\) \+ index\)/);
  assert.match(app, /item\.nextMonthlyInspectionDate = scheduled\.toISOString\(\)\.slice\(0, 10\)/);
  assert.match(app, /if \(!cranes\.length\) return \{ changed: false \}/);
  assert.match(app, /const gpmScheduleMigration = distributeGpmMonthlySchedule\(state\)/);
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
