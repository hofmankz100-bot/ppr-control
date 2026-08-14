const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("self-requested welding and turning work is approved by an engineer", () => {
  assert.match(app, /function isProductionEngineer\(/);
  assert.match(app, /function productionWorkWasSelfRequested\(/);
  assert.match(app, /function canDecideProductionWork\([\s\S]*?isProductionEngineer\(\)/);
  assert.match(app, /Самостоятельно выполненную заявку подтверждает инженер/);
  assert.match(app, /acceptedByEngineerAt/);
  assert.match(app, /Инженерное подтверждение: сварщик сам создал и выполнил заявку/);
  assert.match(app, /Инженерное подтверждение: токарь сам создал и выполнил заявку/);
});
