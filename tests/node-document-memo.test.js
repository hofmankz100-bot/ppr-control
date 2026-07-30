const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("node document memo is restricted to the requested roles", () => {
  assert.match(app, /NODE_DOCUMENT_MEMO_ROLES = new Set\(\["editor", "energyEngineer", "designEngineer", "mechanicalEngineer"\]\)/);
  assert.match(app, /function canViewNodeDocumentMemo/);
  assert.doesNotMatch(app, /NODE_DOCUMENT_MEMO_ROLES[^;]+safetyEngineer/);
});

test("document list is rendered under concrete nodes in both node views", () => {
  assert.match(app, /<summary>Список документов<\/summary>/);
  assert.ok((app.match(/nodeDocumentMemoHtml\(eq, node/g) || []).length >= 2);
  assert.match(styles, /\.node-document-memo/);
});

test("memo includes equipment-specific records and official Kazakhstan sources", () => {
  assert.match(app, /Журнал ежесменного осмотра ГПМ/);
  assert.match(app, /Журнал предсменного осмотра вилочного погрузчика/);
  assert.match(app, /Протоколы измерения сопротивления изоляции/);
  assert.match(app, /adilet\.zan\.kz\/rus\/docs\/V1500010949/);
  assert.match(app, /adilet\.zan\.kz\/rus\/docs\/Z070000305_/);
});
