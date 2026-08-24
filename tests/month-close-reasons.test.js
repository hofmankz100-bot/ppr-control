const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const client = fs.readFileSync(path.join(root, "app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("unfinished PPR entries expose equipment nodes works and date", () => {
  assert.match(server, /const equipment = \[\.\.\.new Set\(works\.map/);
  assert.match(server, /const nodes = \[\.\.\.new Set\(works\.map/);
  assert.match(server, /label: `\$\{subject\} · \$\{sheet\.date \|\| key\}/);
  assert.match(client, /entry\.label \|\| `ППР на/);
});

test("engineer can defer an open critical remark with a required reason", () => {
  assert.match(server, /"defer-remark", "resume-remark"/);
  assert.match(server, /deferReason: reason, deferredAt: now/);
  assert.match(client, /Почему замечание сейчас не выполняется\?/);
  assert.match(client, /action: "defer-remark"/);
});

test("deferred remarks stay visible but are excluded from critical counters", () => {
  assert.match(server, /summary\.deferReason \? deferredRemarks : openRemarks/);
  assert.match(server, /groups: \{ openRemarks, deferredRemarks, activeBreakdowns, incompletePpr \}/);
  assert.match(client, /обоснованно отложено и не считается/);
  assert.match(client, /Вернуть в критический счётчик/);
});

test("defer reason editor remains readable on phones and in dark theme", () => {
  assert.match(styles, /\.month-critical-row textarea/);
  assert.match(styles, /html\[data-theme="dark"\] \.month-critical-row textarea/);
  assert.match(styles, /\.month-critical-row>div button\{width:100%/);
});
