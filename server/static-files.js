"use strict";

const fs = require("fs");
const path = require("path");

const publicRootFiles = new Set([
  "index.html",
  "styles.css",
  "styles.min.css",
  "app.js",
  "app.min.js",
  "sw.js",
  "manifest.json",
  "icon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "hoffmann-logo.png",
  "phone-fix.html",
  "cache-clear.html",
  "update.html",
  "ppr-ios-profile.mobileconfig"
]);

function isPublicStaticPath(relativePath = "") {
  const normalized = String(relativePath).split(path.sep).join("/");
  if (publicRootFiles.has(normalized)) return true;
  if (/^modules\/[A-Za-z0-9._-]+\.js$/.test(normalized)) return true;
  return normalized === "node_modules/jsqr/dist/jsQR.js"
    || normalized === "node_modules/html2canvas/dist/html2canvas.min.js"
    || normalized === "node_modules/jspdf/dist/jspdf.umd.min.js"
    || normalized === "node_modules/html2pdf.js/dist/html2pdf.bundle.min.js"
    || normalized === "node_modules/mammoth/mammoth.browser.min.js";
}

function createStaticHandler({ root, contentTypes, securityHeaders, zlib }) {
  if (!root || !contentTypes || typeof securityHeaders !== "function" || !zlib) {
    throw new Error("static_handler_dependencies_required");
  }

  return function serveStatic(req, res, pathname) {
    const requestUrl = new URL(req.url || "/", "http://localhost");
    const legacyRefreshRequest = pathname === "/" && requestUrl.searchParams.has("refresh");
    const cleanPath = legacyRefreshRequest ? "update.html" : pathname === "/" ? "index.html" : pathname.slice(1);
    const file = path.resolve(root, cleanPath);
    const relative = path.relative(root, file);
    const isInsideRoot = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
    const isDataFile = relative.split(path.sep).includes("data");
    if (!isInsideRoot || isDataFile || !isPublicStaticPath(relative)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const extension = path.extname(file).toLowerCase();
      const contentType = contentTypes[extension] || "application/octet-stream";
      const versioned = Boolean(requestUrl.searchParams.get("v"));
      const cacheControl = pathname === "/" || extension === ".html"
        ? cleanPath === "update.html" ? "no-store" : "no-cache"
        : versioned
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600";
      const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(String(req.headers["accept-encoding"] || ""));
      const compressible = [".html", ".js", ".css", ".json", ".svg", ".webmanifest"].includes(extension);
      if (acceptsGzip && compressible && data.length >= 1024) {
        const compressed = zlib.gzipSync(data, { level: zlib.constants.Z_BEST_SPEED });
        res.writeHead(200, {
          ...securityHeaders(req),
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
          "Content-Encoding": "gzip",
          "Content-Length": compressed.length,
          "Vary": "Accept-Encoding"
        });
        res.end(compressed);
        return;
      }
      res.writeHead(200, {
        ...securityHeaders(req),
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "Content-Length": data.length,
        "Vary": "Accept-Encoding"
      });
      res.end(data);
    });
  };
}

module.exports = { createStaticHandler, isPublicStaticPath };
