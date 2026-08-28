const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const site = String(process.env.PPR_SITE_URL || '').replace(/\/$/, '');
const identifier = process.env.PPR_IDENTIFIER || '';
const password = process.env.PPR_PASSWORD || '';
const month = process.env.PPR_ARCHIVE_MONTH || '';
const output = process.env.PPR_PDF_OUTPUT || '';
const executablePath = process.env.PPR_BROWSER_EXE || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!site || !identifier || !password || !/^\d{4}-\d{2}$/.test(month) || !output) throw new Error('Missing PDF export settings');
fs.mkdirSync(output, { recursive: true });

const safe = value => String(value || 'journal').replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_').slice(0, 90);
const html = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-gpu', '--no-first-run'] });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const health = await page.evaluate(async () => (await fetch('/api/health', { cache: 'no-store' })).json());
  const login = await page.evaluate(async ({ identifier, password, version }) => {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Version': version || '' }, body: JSON.stringify({ identifier, password }) });
    return { status: response.status, data: await response.json() };
  }, { identifier, password, version: health.version });
  if (!login.data?.ok) throw new Error(`Login failed (${login.status})`);
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { try { await eval('loadRemoteState()'); } catch {} });
  await page.waitForTimeout(1500);
  await page.evaluate(m => { eval(`current.journalMonth=${JSON.stringify(m)}; current.weldingMonth=${JSON.stringify(m)}; current.turningMonth=${JSON.stringify(m)};`); }, month);
  const archiveState = await page.evaluate(async () => (await fetch('/api/export/all', { cache: 'no-store' })).json());

  async function printPopup(expression, filename) {
    if (fs.existsSync(path.join(output, filename))) return true;
    try {
      const popupPromise = context.waitForEvent('page', { timeout: 6000 });
      await page.evaluate(code => eval(code), expression);
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await popup.waitForTimeout(1200);
      await popup.emulateMedia({ media: 'print' });
      await popup.pdf({ path: path.join(output, filename), printBackground: true, preferCSSPageSize: true, format: 'A4', margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      await popup.close();
      return true;
    } catch (error) {
      process.stderr.write(`SKIP ${filename}: ${error.message}\n`);
      return false;
    }
  }

  const aggregateEquipment = JSON.parse(await page.evaluate(() => eval('JSON.stringify(allEquipment().filter(item => item && aggregateJournalItems(item.area, item.id).length).map(item => ({id:item.id,name:item.name,area:item.area})))')));
  process.stderr.write(`Aggregate journals for print: ${aggregateEquipment.length}\n`);
  for (const item of aggregateEquipment) {
    await page.evaluate(id => { eval(`current.selectedAggregateEquipmentId=${JSON.stringify(id)}; current.equipmentId=${JSON.stringify(id)}; renderAggregateJournal()`); }, item.id);
    await page.waitForTimeout(150);
    await printPopup(`printAggregateJournal(${JSON.stringify(item.name)})`, `Агрегатный журнал - ${safe(item.name)} - ${month}.pdf`);
  }
  await printPopup(`printWeldingJournal(${JSON.stringify(month)})`, `Журнал сварочных работ - ${month}.pdf`);
  await printPopup(`printTurningJournal(${JSON.stringify(month)})`, `Журнал токарных работ - ${month}.pdf`);
  await printPopup('printGasJournalSections(["A","B"])', `Журнал ШГРП - ${month}.pdf`);
  await printPopup('printCompressorJournalFilledDays()', `Компрессорный журнал - ${month}.pdf`);
  const downtimeRows = Object.values(archiveState.downtimes || {}).filter(Boolean);
  const downtimeAreas = [...new Set(downtimeRows.filter(x => String(x.startedAt || x.date || '').slice(0, 7) === month).map(x => x.area).filter(Boolean))].sort();
  const [downtimeYear, downtimeMonth] = month.split('-').map(Number);
  await page.evaluate(({ year, monthIndex }) => { eval(`current.downtimeYear=${year}; current.downtimeMonth=${monthIndex}`); }, { year: downtimeYear, monthIndex: downtimeMonth - 1 });
  for (const area of downtimeAreas) await printPopup(`printDowntimeJournal(${JSON.stringify(area)})`, `Журнал простоев - ${safe(area)} - ${month}.pdf`);
  await printPopup(`printOrderJournal(Object.values(state.orders||{}).filter(x=>String(x.createdAt||'').slice(0,7)===${JSON.stringify(month)}))`, `Журнал распоряжений - ${month}.pdf`);
  const pprSheets = archiveState.pprSheets || {};
  const pprDates = [...new Set(Object.entries(pprSheets).map(([key, value]) => String(value?.date || key).slice(0, 10)).filter(x => x.startsWith(month)))].sort();
  for (const date of pprDates) {
    const filename = `Лист ППР - ${date}.pdf`;
    if (fs.existsSync(path.join(output, filename))) continue;
    const sheetHtml = await page.evaluate(day => eval(`renderPprMaintenanceSheet(${JSON.stringify(day)},[])`), date);
    const pprPage = await context.newPage();
    await pprPage.setContent(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Лист ППР ${html(date)}</title><link rel="stylesheet" href="${html(site)}/styles.css"><style>@page{size:A4 landscape;margin:8mm}body{font-family:Arial;background:#fff}.no-print,button{display:none!important}</style></head><body class="printing-ppr-sheet">${sheetHtml}</body></html>`, { waitUntil: 'networkidle', timeout: 30000 });
    await pprPage.waitForTimeout(500);
    await pprPage.emulateMedia({ media: 'print' });
    await pprPage.pdf({ path: path.join(output, filename), printBackground: true, preferCSSPageSize: true, format: 'A4', landscape: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    await pprPage.close();
  }
  const qrSource = Array.isArray(archiveState.qrWalkJournal) ? archiveState.qrWalkJournal : Object.values(archiveState.qrWalkJournal || {});
  const qrRows = qrSource.filter(x => String(x?.date || x?.at || '').slice(0, 7) === month).sort((a,b) => String(a.date||a.at).localeCompare(String(b.date||b.at)));
  const qrDays = [...new Set(qrRows.map(x => String(x.date || x.at || '').slice(0,10)))].sort();
  for (const date of qrDays) {
    const dayRows = qrRows.filter(x => String(x.date || x.at || '').slice(0,10) === date);
    const filename = `Журнал QR-обходов - ${date}.pdf`;
    if (fs.existsSync(path.join(output, filename))) continue;
    const qrPage = await context.newPage();
    const rows = dayRows.map((x,i) => `<tr><td>${i+1}</td><td>${html(x.shift)}</td><td>${html(x.group)}</td><td>${html(x.area)}</td><td>${html(x.equipment)}</td><td>${html(x.node)}</td><td>${html(x.byName)}</td><td>${html(x.byRole)}</td></tr>`).join('');
    await qrPage.setContent(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial;color:#000}h1{text-align:center;font-size:16pt;margin:0 0 3mm}.meta{display:flex;justify-content:space-between;font-size:9pt;margin-bottom:3mm}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #000;padding:1.1mm;font-size:6.5pt;overflow-wrap:anywhere}th{background:#eee}</style></head><body><h1>ЖУРНАЛ QR-ОБХОДОВ</h1><div class="meta"><b>ППР Контроль</b><span>Дата: ${html(date)}</span><span>Записей: ${dayRows.length}</span></div><table><thead><tr><th>№</th><th>Смена</th><th>Вид обхода</th><th>Участок</th><th>Оборудование</th><th>Узел</th><th>Работник</th><th>Должность</th></tr></thead><tbody>${rows}</tbody></table></body></html>`, { waitUntil: 'load' });
    await qrPage.pdf({ path: path.join(output, filename), printBackground: true, preferCSSPageSize: true });
    await qrPage.close();
  }
  await printPopup(`current.engineerReportMonth=${JSON.stringify(month)}; printEngineerMonthlyReport(${JSON.stringify(month)})`, `Месячный отчет состояния завода - ${month}.pdf`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
