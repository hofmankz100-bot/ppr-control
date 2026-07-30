const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const preferredPort = Number(process.env.HYDRAULIC_PORT || 4185);
const files = new Map([
  ["/", { file: "hydraulic-pk1540.html", type: "text/html; charset=utf-8" }],
  ["/hydraulic-pk1540.html", { file: "hydraulic-pk1540.html", type: "text/html; charset=utf-8" }],
  ["/hydraulic-pk1540.css", { file: "hydraulic-pk1540.css", type: "text/css; charset=utf-8" }],
  ["/hydraulic-pk1540.js", { file: "hydraulic-pk1540.js", type: "text/javascript; charset=utf-8" }],
  ["/assets/pk1540-hydraulic.webp", { file: "assets/pk1540-hydraulic.webp", type: "image/webp" }]
]);

function openBrowser(url) {
  if (process.platform === "win32") {
    execFile("explorer.exe", [url], { windowsHide: true });
    return;
  }
  execFile(process.platform === "darwin" ? "open" : "xdg-open", [url]);
}

function createServer(port) {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url || "/", `http://${host}:${port}`).pathname;
    const entry = files.get(pathname);
    if (!entry) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Страница не найдена");
      return;
    }
    fs.readFile(path.join(root, entry.file), (error, data) => {
      if (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
        res.end("Не удалось загрузить файл приложения");
        return;
      }
      res.writeHead(200, {
        "Content-Type": entry.type,
        "Content-Length": data.length,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY"
      });
      res.end(data);
    });
  });
  server.on("error", error => {
    if (error.code === "EADDRINUSE") {
      createServer(port + 1);
      return;
    }
    console.error(error);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    console.log("");
    console.log("Интерактивная гидросхема ПК-1540 запущена локально.");
    console.log(`Адрес: ${url}`);
    console.log("Это окно должно оставаться открытым. Для остановки нажмите Ctrl+C.");
    console.log("");
    if (process.env.HYDRAULIC_NO_OPEN !== "1") {
      openBrowser(url);
    }
  });
}

createServer(preferredPort);
