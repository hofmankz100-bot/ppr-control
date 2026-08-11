const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("welding journal has a dedicated local screen and home entry", () => {
  assert.match(html, /id="weldingHomeButton"/);
  assert.match(html, /id="weldingScreen"/);
  assert.match(app, /function renderWeldingJournal\(\)/);
  assert.match(app, /function printWeldingJournal\(/);
});

test("welder access is detected by role or welding job title", () => {
  assert.match(app, /function isWelderUser\(user = profile \|\| authenticatedProfile/);
  assert.match(app, /user\?\.role, user\?\.jobRole, user\?\.editorPreviewRole/);
  assert.match(app, /WELDER_TITLE_PATTERN\.test/);
  assert.match(app, /Принять заявку может только сотрудник с ролью или должностью сварщика/);
});

test("welding requests record automatic actors and monthly printable work data", () => {
  assert.match(app, /createdByName: actor\.name/);
  assert.match(app, /acceptedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(app, /completedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(app, /type="month" data-welding-month/);
  assert.match(app, /ЖУРНАЛ СВАРОЧНЫХ РАБОТ/);
  assert.match(app, /status: "awaitingAcceptance"/);
  assert.match(app, /Принять работу/);
  assert.match(app, /Вернуть сварщику/);
  assert.match(app, /№ \/ Заявитель/);
  assert.match(app, /item\.createdByName/);
});

test("welding journal participates in localhost server synchronization", () => {
  assert.match(server, /weldingJournal: \{\}/);
  assert.match(server, /weldingJournal: db\.weldingJournal \|\| \{\}/);
  assert.match(server, /db\.weldingJournal = mergeObjectRecordsByFreshness/);
  assert.match(app, /"gpmJournal", "weldingJournal"/);
});
