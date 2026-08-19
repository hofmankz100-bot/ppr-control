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
