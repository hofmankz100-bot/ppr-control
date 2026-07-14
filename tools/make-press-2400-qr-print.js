const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const db = JSON.parse(fs.readFileSync(path.resolve("data", "db.json"), "utf8"));
const eqId = 1;
const eq = db.catalog.equipment[String(eqId)];
const nodes = eq.nodes || [];
const equipmentName = eq.name || "пресс 2400 EGE";
const area = eq.area || "Прессовый участок";
const baseUrl = process.env.QR_BASE_URL || "http://10.0.0.125:8080/";

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
})[char]);

(async () => {
  const cards = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const payload = `PPRQR|NODE|${eqId}|${index}`;
    const qrLink = `${baseUrl}?qr=${encodeURIComponent(payload)}`;
    const displayCode = `QR-${eqId}-${index}`;
    const qr = await QRCode.toDataURL(qrLink, { errorCorrectionLevel: "H", margin: 2, width: 720 });
    cards.push(`<section class="card">
      <div class="title">${esc(equipmentName)}</div>
      <div class="area">${esc(area)}</div>
      <div class="node">${index + 1}. ${esc(nodes[index])}</div>
      <img src="${qr}" alt="QR ${index + 1}">
      <div class="code">${esc(displayCode)}</div>
      <div class="link">${esc(qrLink)}</div>
      <div class="hint">Сканируйте обычной камерой телефона — ППР откроется и отметит узел</div>
    </section>`);
  }

  const pages = Array.from({ length: Math.ceil(cards.length / 4) }, (_, pageIndex) =>
    `<main class="page">${cards.slice(pageIndex * 4, pageIndex * 4 + 4).join("\n")}</main>`
  ).join("\n");

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>QR ${esc(equipmentName)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
    .page { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 7mm; height: 281mm; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .card { border: 2px solid #111827; border-radius: 8px; padding: 5mm; display: grid; grid-template-rows: auto auto auto 1fr auto auto auto; align-items: center; text-align: center; overflow: hidden; }
    .title { font-size: 15pt; font-weight: 900; text-transform: uppercase; }
    .area { font-size: 9pt; font-weight: 800; color: #4b5563; }
    .node { min-height: 18mm; display: grid; place-items: center; font-size: 13pt; font-weight: 800; line-height: 1.15; }
    img { width: 80mm; height: 80mm; margin: 0 auto; image-rendering: pixelated; }
    .code { font-size: 16pt; font-weight: 900; color: #111827; overflow-wrap: anywhere; }
    .link { font-size: 6.5pt; font-weight: 700; color: #6b7280; overflow-wrap: anywhere; }
    .hint { font-size: 8pt; color: #4b5563; font-weight: 700; }
    @media screen { body { background: #e5e7eb; padding: 12px; } .page { background: white; width: 210mm; margin: 0 auto 12px; padding: 0; } }
  </style>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 600));</script>
</head>
<body>
${pages}
</body>
</html>`;

  const out = path.resolve("data", "qr-press-2400-print.html");
  fs.writeFileSync(out, html, "utf8");
  console.log(JSON.stringify({ out, equipmentName, area, nodes: nodes.length }, null, 2));
})();
