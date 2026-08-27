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
  assert.match(app, /"gasJournal", "weldingJournal"/);
});

test("welding forms are optimized for phone filling", () => {
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(app, /welding-mobile-submit/);
  assert.match(app, /Заполните обязательные поля по порядку/);
  assert.match(app, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(styles, /min-height:52px/);
  assert.match(styles, /font-size:16px/);
  assert.match(styles, /position:sticky;bottom:76px/);
});

test("welding and turning work support teams and request/result photos", () => {
  assert.match(app, /function joinProductionWork\(item, trade\)/);
  assert.match(app, /data-welding-join>Присоединиться к работе/);
  assert.match(app, /data-turning-join>Присоединиться к работе/);
  assert.match(app, /name="requestPhoto" type="file" accept="image\/\*"/);
  assert.match(app, /name="resultPhoto" type="file" accept="image\/\*"/);
  assert.match(app, /productionParticipantNames\(item, "welding"\)/);
  assert.match(app, /productionParticipantNames\(x,"turning"\)/);
  assert.match(app, /name="welderStamp" required/);
  assert.match(app, /name="welderCertificate" required/);
  assert.match(app, /person\.id === actor\.id[\s\S]*?stamp: welderStamp, certificate: welderCertificate/);
});

test("welding and turning request forms ignore repeated submissions", () => {
  assert.match(app, /function lockProductionRequestForm\(form\)/);
  assert.match(app, /form\.dataset\.submitting === "1"/);
  assert.match(app, /form\.dataset\.submitting = "1"/);
  assert.match(app, /async function createWeldingRequest[\s\S]*?const unlock = lockProductionRequestForm\(form\)/);
  assert.match(app, /async function createTurningRequest[\s\S]*?const unlock = lockProductionRequestForm\(form\)/);
});

test("login footer shows the deployed application version", () => {
  assert.match(html, /id="loginVersion"/);
  assert.doesNotMatch(html, />v188</);
  assert.match(app, /document\.querySelector\("#loginVersion"\)\?\.replaceChildren\(APP_VERSION\)/);
});

test("startup hides only exact production request duplicates created within two minutes", () => {
  assert.match(server, /function removeDuplicateProductionRequests\(db\)/);
  assert.match(server, /productionRequestDedup20260820/);
  assert.match(server, /itemMs - previousMs > 120000/);
  assert.match(server, /item\.duplicateOf = keeper\.id/);
  assert.match(server, /Системная проверка: повторная отправка одной заявки/);
  assert.match(server, /removeDuplicateProductionRequests\(postgresState\)/);
});
