"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("crane-beam feature is removed from client and API", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.doesNotMatch(client, /\/api\/crane-beams|handleIncomingCraneQrFromUrl|craneBeamState|nestedCraneEquipmentCard/);
  assert.doesNotMatch(server, /createCraneBeamsRoute|handleCraneBeamsRoute|\/api\/crane-beams/);
  assert.equal(fs.existsSync(path.join(root, "server", "crane-beams-route.js")), false);
});

test("startup cleanup permanently removes crane collections and stale node mappings", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(server, /remove-crane-beams-completely-v2/);
  assert.match(server, /delete db\.craneBeams/);
  assert.match(server, /delete db\.retiredCraneBeamArchive/);
  assert.match(server, /archiveAndRemoveCraneBeamData\(postgresState\)/);
});

test("online startup never renders the stale device snapshot", () => {
  const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.match(client, /const remoteLoaded = await loadRemoteState\(\)/);
  assert.match(client, /if \(!remoteLoaded && deviceState/);
  assert.match(client, /const DEVICE_DB_NAME = "ppr-control-device-v2"/);
  assert.match(client, /checks: Object\.fromEntries\(checks\.slice\(-500\)\)/);
});

test("ordinary nodes removed by the broad cleanup are recovered with history", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(server, /restore-ordinary-nodes-after-crane-removal-v2/);
  assert.match(server, /Перед восстановлением ошибочно скрытых узлов/);
  assert.match(server, /const missingNodes = sourceNodes\.filter/);
  assert.match(server, /if \(!nextChecks\[nextKey\]\) \{ nextChecks\[nextKey\] = record/);
  assert.match(server, /ordinary_nodes_restored_after_crane_removal/);
  assert.match(server, /nodes: \[\], deleted: true/);
  assert.match(server, /const mergedNodes = placeholderCard \? \[\.\.\.sourceNodes\]/);
  assert.match(server, /await restoreOrdinaryNodesAfterCraneRemoval\(\)/);
});
