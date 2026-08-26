const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

test("employee access follows current equipment areas and refreshes without logout", () => {
  assert.match(app, /function assignableEquipmentAreas\(\)[\s\S]*?allEquipment\(\)[\s\S]*?area\.toLocaleLowerCase\("ru-RU"\) === "резерв"[\s\S]*?values\.push\(name\)/);
  assert.match(app, /const areaOptions = selected =>[\s\S]*?assignableEquipmentAreas\(\)/);
  assert.match(app, /<select data-access-area>\$\{accessAreaOptions\(user\.area \|\| ""\)\}<\/select>/);
  assert.match(app, /role,[\s\S]*?area,[\s\S]*?actionId: nextActionId\(\)/);
  assert.match(app, /function equipmentEmployeeArea\(eq = \{\}\)[\s\S]*?return name/);
  assert.match(app, /equipment\.filter\(eq => areaAllowed\(equipmentEmployeeArea\(eq\)\)\)/);
  assert.match(app, /function userAreas\(user = \{\}\)/);
  assert.match(app, /function userHasArea\(user = \{\}, area = ""\)/);
  assert.match(app, /data-user-extra-area/);
  assert.match(app, /data-access-extra-area/);
  assert.match(server, /function normalizedUserAreasServer\(user = \{\}\)/);
  assert.match(server, /function userHasAreaServer\(user = \{\}, area = ""\)/);
  assert.match(server, /target\.areas = areas/);
  assert.match(server, /userHasAreaServer\(req\.authUser, equipmentArea\)/);
  assert.match(app, /async function refreshAuthenticatedProfile\(\)[\s\S]*?\/api\/auth\/session[\s\S]*?previousAccess !== nextAccess[\s\S]*?resetCurrentForProfile\(\)/);

  const roleEndpoint = server.slice(server.indexOf('pathname === "/api/users/role"'), server.indexOf('pathname === "/api/users/password"'));
  assert.doesNotMatch(roleEndpoint, /db\.authSessions\s*=\s*\(db\.authSessions/);
});

test("one responsible employee can safely work in multiple workshops", () => {
  assert.match(app, /const selectedAreas = new Set\(Array\.isArray\(draft\.areas\) \? draft\.areas : userAreas\(user\)\)/);
  assert.match(app, /areas: \[\.\.\.new Set\(\[area, \.\.\.areas\]\.filter\(Boolean\)\)\]/);
  assert.match(app, /if \(\["shop", "operator"\]\.includes\(profile\?\.role\)\) return userHasArea/);
  assert.match(server, /const shopUsers = area \? users\.filter\([\s\S]*?userHasAreaServer\(user, area\)/);
  assert.match(server, /if \(role === "shop"\) return userHasAreaServer\(profile, item\.area\)/);
  assert.match(server, /if \(catalogRole === "shop"[\s\S]*?!userHasAreaServer\(req\.authUser, equipmentArea\)/);
  assert.match(server, /nextUser\.areas = normalizedUserAreasServer\(nextUser\)/);
});
