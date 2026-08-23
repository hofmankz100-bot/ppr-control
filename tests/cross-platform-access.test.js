"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("mobile shells support iPhone safe areas and standalone mode", () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-mobile-web-app-status-bar-style/);
  assert.match(styles, /env\(safe-area-inset-top\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
});

test("touch devices receive guarded pull to refresh", () => {
  assert.match(app, /function setupPullToRefresh\(\)/);
  assert.match(app, /window\.scrollY > 0/);
  assert.match(app, /blockedTarget\(event\.target\)/);
  assert.match(app, /touchmove[\s\S]*?passive: false/);
  assert.match(app, /Promise\.allSettled\(\[loadRemoteState\(\), refreshAuthenticatedProfile\(\), loadRemoteUsers\(\)\]\)/);
  assert.match(styles, /\.pull-refresh-indicator/);
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)/);
});

test("equipment pause permission is identical in client and server", () => {
  assert.match(app, /function setOperationalPause[\s\S]*?canEditEquipmentCatalog\(equipmentId\)/);
  assert.match(server, /individualEquipmentEdit = activeUserPermission\(req\.authUser, "equipmentEdit"\)/);
  assert.match(server, /\["editor", "engineer", "shop"\][\s\S]*?individualEquipmentEdit/);
  assert.doesNotMatch(server, /catalogRole === "editor" && Array\.isArray\(rawItem\.operationalPauses\)/);
});

test("QR journal and downtime actions remain server protected", () => {
  assert.match(app, /canViewQrWalkJournal[\s\S]*?qrJournalView/);
  assert.match(server, /qrWalkJournalAccess !== true && !activeUserPermission\(req\.authUser, "qrJournalView"\)/);
  assert.match(server, /pathname === "\/api\/downtime-close"[\s\S]*?sessionActorKey/);
  assert.match(server, /downtime_actor_invalid/);
});
