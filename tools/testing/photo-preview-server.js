"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "../..");
const files = {
  "/": "tools/testing/photo-compression-preview.html",
  "/modules/photo-compression.js": "modules/photo-compression.js"
};
http.createServer((req, res) => {
  const file = files[req.url];
  if (!file) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8");
  res.end(fs.readFileSync(path.join(root, file)));
}).listen(8099, "127.0.0.1", () => console.log("Photo compression check: http://127.0.0.1:8099"));
