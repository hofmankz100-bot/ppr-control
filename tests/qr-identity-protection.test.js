"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const QRCode = require("qrcode");
const jsQR = require("jsqr");

const root = path.join(__dirname, "..");

function renderQrPixels(value, { margin = 4, scale = 5 } = {}) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const moduleCount = qr.modules.size;
  const width = (moduleCount + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(width * width * 4);
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const moduleX = Math.floor(x / scale) - margin;
      const moduleY = Math.floor(y / scale) - margin;
      const dark = moduleX >= 0 && moduleY >= 0 && moduleX < moduleCount && moduleY < moduleCount
        ? qr.modules.get(moduleX, moduleY)
        : false;
      const offset = (y * width + x) * 4;
      const color = dark ? 0 : 255;
      pixels[offset] = color;
      pixels[offset + 1] = color;
      pixels[offset + 2] = color;
      pixels[offset + 3] = 255;
    }
  }
  return { pixels, width };
}

test("the phone decoder reads a production node URL including its full token", () => {
  const value = "https://ppr-control-ramazan.onrender.com/?qr=PPRQR%7CNODE%7C1%7C1%7C4227dec700bdda18d88829ef";
  const { pixels, width } = renderQrPixels(value);
  const decoded = jsQR(pixels, width, width, { inversionAttempts: "attemptBoth" });
  assert.equal(decoded?.data, value);
  const payload = new URL(decoded.data).searchParams.get("qr");
  assert.equal(payload, "PPRQR|NODE|1|1|4227dec700bdda18d88829ef");
});

test("ordinary state synchronization cannot overwrite server QR identity", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const mergeStart = server.indexOf("const incomingCatalog = {};");
  const mergeEnd = server.indexOf("const mergedCatalog = mergeObjectRecords", mergeStart);
  assert.ok(mergeStart > 0 && mergeEnd > mergeStart);
  const catalogMerge = server.slice(mergeStart, mergeEnd);
  assert.doesNotMatch(catalogMerge, /rawItem\.(?:qrTokens|upperQrTokens|qrTokenAliases|qrUpdatedAt)/);
  assert.match(catalogMerge, /ensureCatalogNodeQrTokens\(item\)/);
});

test("every catalog node receives a token without replacing an existing token", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const helperStart = server.indexOf("function ensureCatalogNodeQrTokens");
  const helperEnd = server.indexOf("\n}\n", helperStart) + 3;
  const helper = server.slice(helperStart, helperEnd);
  assert.match(helper, /String\(item\.qrTokens\[index\] \|\| ""\)\.trim\(\)/);
  assert.match(helper, /item\.qrTokens\[index\] = crypto\.randomBytes\(12\)/);
  assert.match(server, /Object\.values\(db\.catalog\?\.equipment \|\| \{\}\)\.forEach\(ensureCatalogNodeQrTokens\)/);
});

test("QR rotation and node deletion preserve all earlier physical identities", () => {
  const rotateRoute = fs.readFileSync(path.join(root, "server", "admin-equipment-qr-route.js"), "utf8");
  const maintenanceRoute = fs.readFileSync(path.join(root, "server", "admin-equipment-maintenance-route.js"), "utf8");
  assert.match(rotateRoute, /previousTokens/);
  assert.match(rotateRoute, /qrTokenAliases\[nodeIndex\] = \[\.\.\.new Set/);
  assert.match(maintenanceRoute, /qrTokenAliases = shiftIndexedMap\(catalogItem\.qrTokenAliases\)/);
});

