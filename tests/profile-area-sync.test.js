const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

test("employee access follows current equipment areas and refreshes without logout", () => {
  assert.match(app, /function assignableEquipmentAreas\(\)[\s\S]*?availableEquipmentAreas\(\)[\s\S]*?!== "резерв"/);
  assert.match(app, /const areaOptions = selected =>[\s\S]*?assignableEquipmentAreas\(\)/);
  assert.match(app, /<select data-access-area>\$\{accessAreaOptions\(user\.area \|\| ""\)\}<\/select>/);
  assert.match(app, /role,[\s\S]*?area,[\s\S]*?actionId: nextActionId\(\)/);
  assert.match(app, /async function refreshAuthenticatedProfile\(\)[\s\S]*?\/api\/auth\/session[\s\S]*?previousAccess !== nextAccess[\s\S]*?resetCurrentForProfile\(\)/);

  const roleEndpoint = server.slice(server.indexOf('pathname === "/api/users/role"'), server.indexOf('pathname === "/api/users/password"'));
  assert.doesNotMatch(roleEndpoint, /db\.authSessions\s*=\s*\(db\.authSessions/);
});
