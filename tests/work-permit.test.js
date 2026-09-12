"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("removed work permit has no client, server, permission or asset entry points", () => {
  assert.equal(fs.existsSync(path.join(root, "modules", "work-permit.js")), false);
  const source = [
    read("index.html"),
    read("app.js"),
    read("server.js"),
    read("styles.css"),
    read("modules/print-assets.js"),
    read("server/permissions.js"),
    read("server/admin-dashboard-route.js"),
    read("server/admin-config-package-route.js"),
    read("server/admin-integrity-route.js"),
    read("sw.js")
  ].join("\n").replaceAll("v830-remove-work-permit", "");
  assert.doesNotMatch(source, /work[-_ ]?permit|workPermit|Наряд-допуск|Наряды-допуски|instructionEdit|instructionLog/i);
});

test("unrelated optional document libraries remain available", () => {
  const assets = read("modules/print-assets.js");
  assert.match(assets, /name === "mammoth"/);
  assert.match(assets, /name === "html2pdf"/);
  assert.match(assets, /name === "annual-pdf"/);
});
