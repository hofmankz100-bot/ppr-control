"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const zlib = require("node:zlib");
const { create } = require("../modules/app-updater");
const { createStaticHandler } = require("../server/static-files");

function updateHarness(initialSafe = true) {
  let safe = initialSafe;
  let visibleOverlay = null;
  const timers = [];
  const navigations = [];
  const nodes = {
    version: { textContent: "" },
    button: { disabled: false, textContent: "", addEventListener() {} },
    status: { textContent: "" }
  };
  const document = {
    body: { appendChild(element) { visibleOverlay = element; } },
    querySelector(selector) { return selector === ".required-update-overlay" ? visibleOverlay : null; },
    createElement() {
      return {
        className: "",
        innerHTML: "",
        querySelector(selector) {
          if (selector === "[data-required-update-version]") return nodes.version;
          if (selector === "[data-required-update]") return nodes.button;
          if (selector === "[data-required-update-status]") return nodes.status;
          return null;
        }
      };
    }
  };
  const window = {
    document,
    navigator: {},
    location: { replace(url) { navigations.push(url); } },
    clearTimeout() {},
    setTimeout(callback) { timers.push(callback); return timers.length; },
    setInterval() { return 1; },
    addEventListener() {}
  };
  const updater = create({
    currentVersion: "v1",
    idleDelayMs: 0,
    reloadDelayMs: 0,
    retryDelayMs: 0,
    isSafeToInstall: () => safe,
    window,
    document,
    navigator: window.navigator,
    location: window.location
  });
  return { updater, timers, navigations, nodes, overlay: () => visibleOverlay, setSafe(value) { safe = value; } };
}

test("a newer client installs automatically once the page is safe", () => {
  const h = updateHarness(true);
  assert.equal(h.updater.request("v2"), true);
  assert.ok(h.overlay());
  assert.equal(h.nodes.version.textContent, "Новая версия: v2");
  h.timers.shift()();
  assert.match(h.navigations[0], /^\/update\.html\?target=v2&refresh=\d+$/);
});

test("automatic client update waits while a form or save is active", () => {
  const h = updateHarness(false);
  h.updater.request("v2");
  assert.equal(h.overlay(), null);
  assert.equal(h.navigations.length, 0);
  h.setSafe(true);
  h.timers.shift()();
  assert.ok(h.overlay());
  h.timers.shift()();
  assert.equal(h.navigations.length, 1);
});

test("the current client version never reloads itself", () => {
  const h = updateHarness(true);
  assert.equal(h.updater.request("v1"), false);
  assert.equal(h.timers.length, 0);
  assert.equal(h.navigations.length, 0);
});

test("service worker is served without an hour-long browser cache", async () => {
  const serveStatic = createStaticHandler({
    root: path.join(__dirname, ".."),
    contentTypes: { ".js": "application/javascript; charset=utf-8" },
    securityHeaders: () => ({}),
    zlib
  });
  const result = await new Promise(resolve => {
    serveStatic({ url: "/sw.js", headers: {} }, {
      writeHead(status, headers) { this.status = status; this.headers = headers; },
      end() { resolve({ status: this.status, headers: this.headers }); }
    }, "/sw.js");
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers["Cache-Control"], "no-store, no-cache, must-revalidate");
});
