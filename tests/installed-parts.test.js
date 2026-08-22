const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

test("confirmed resolutions create monthly installed-parts journal entries", () => {
  assert.match(app, /async function askInstalledPartDetails\(\)/);
  assert.match(app, /Установил запчасть/);
  assert.match(app, /Без запчасти/);
  assert.match(app, /data-installed-parts-equipment/);
  assert.match(app, /function installedPartJournalRows\(/);
  assert.match(app, /journalMonthMatches\(entry\.resolvedAt \|\| date, month\)/);
  assert.match(app, /function openInstalledPartJournal\(/);
  assert.match(styles, /\.installed-part-journal-list:has\(\.installed-part-entry\)/);
  assert.match(styles, /scroll-snap-stop:always/);
  assert.match(server, /remark\.resolutionPartInstalled = partInstalled/);
  assert.match(server, /remark\.partInstalled = remark\.resolutionPartInstalled === true/);
  assert.match(server, /if \(partInstalled && !partDescription\)/);
});
