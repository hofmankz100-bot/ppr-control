const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const permissions = fs.readFileSync(path.join(root, "server", "permissions.js"), "utf8");

test("general director has the production director capability base", () => {
  assert.match(app, /generalDirector:\s*\{\s*label:\s*"Генеральный директор",\s*requestRoles:\s*\[\],\s*equipment:\s*"all",\s*checklist:\s*true\s*\}/);
  assert.match(app, /generalDirector:\s*"productionDirector"/);
  assert.match(permissions, /generalDirector:\s*"productionDirector"/);
  assert.match(server, /"productionDirector",\s*"generalDirector"/);
});
