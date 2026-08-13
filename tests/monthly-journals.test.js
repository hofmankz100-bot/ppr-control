const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("existing journals share one month selector and filter records before printing", () => {
  assert.match(app, /function selectedJournalMonth\(\)/);
  assert.match(app, /function journalMonthMatches\(/);
  assert.match(app, /function journalMonthControlHtml\(\)/);
  assert.match(app, /aggregateJournalItems[\s\S]*?!journalMonthMatches\(date\)/);
  assert.match(app, /compressorJournalFilledRows[\s\S]*?journalMonthMatches\(row\?\.date\)/);
  assert.match(app, /gasJournalPrintableSection[\s\S]*?journalMonthMatches\(row\?\.date\)/);
  assert.match(app, /gpmInspectionRows\(item\)\.filter\(entry => journalMonthMatches/);
  assert.match(app, /bindJournalMonthControl\(ui\.aggregateJournalList, renderAggregateJournal\)/);
  assert.match(app, /bindJournalMonthControl\(ui\.gpmPanel, renderGpmJournal\)/);
});
