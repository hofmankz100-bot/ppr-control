const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("operational pause is the shared switch for PPR, reports and factory counters", () => {
  assert.match(source, /function operationalControlEnabled[\s\S]*?!activeOperationalPause/);
  assert.match(source, /function operationalItemEnabled/);
  assert.match(source, /function annualPprRows[\s\S]*?operationalControlEnabled/);
  assert.match(source, /function pprCalendarMonthData[\s\S]*?operationalControlEnabled/);
  assert.match(source, /function directorTodayWalk[\s\S]*?operationalControlEnabled/);
  assert.match(source, /function annualRepairEvents[\s\S]*?operationalControlEnabled/);
  assert.match(source, /function engineerMonthlyStats[\s\S]*?operationalItemEnabled/);
});

test("QR plans count only active equipment nodes on the calculation date", () => {
  assert.match(source, /activeNodeIndexes[\s\S]*?operationalControlEnabled\(eq, nodeIndex, date\)[\s\S]*?qrPlan \+= activeNodeIndexes\.length/);
});

test("resume is automatic because all exclusions use dated pause history", () => {
  assert.match(source, /return targetDate >= startDate && \(!endDate \|\| targetDate <= endDate\)/);
  assert.match(source, /active\.endedAt = now/);
  assert.match(source, /return !activeOperationalPause/);
});

test("the removed request workflow leaves only the remark confirmation screen", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /<h1>Подтверждения<\/h1>/);
  assert.doesNotMatch(source, /Заявки — только документы/);
  assert.doesNotMatch(source, /Заявки не требуют подтверждения/);
  assert.match(source, /ui\.subtitle\.textContent = "Подтверждения"/);
});

test("background synchronization preserves the open journal scroll position", () => {
  assert.match(source, /function restoreBackgroundScroll\(view, scrollX, scrollY\)/);
  assert.match(source, /const scrollYBeforeRender = window\.scrollY;[\s\S]*?render\(\);[\s\S]*?restoreBackgroundScroll/);
  assert.match(source, /requestAnimationFrame\([\s\S]*?requestAnimationFrame\(restore\)/);
});

test("quick app resume checks only the version and restores stale realtime", () => {
  assert.match(source, /const RESUME_SYNC_AFTER_MS = 5000/);
  assert.match(source, /if \(document\.visibilityState === "hidden"\)[\s\S]*?appHiddenAt = Date\.now\(\)/);
  assert.match(source, /function resumeRealtimeQuietly\(awayMs = 0\)/);
  assert.match(source, /socketConnecting = Boolean\(realtimeSocket && realtimeSocket\.readyState === WebSocket\.CONNECTING\)/);
  assert.match(source, /socketStale = awayMs >= 5000 && \(socketConnecting \|\| \(socketOpen/);
  assert.match(source, /eventsConnecting = Boolean\(realtimeEventSource && realtimeEventSource\.readyState === EventSource\.CONNECTING\)/);
  assert.match(source, /eventsStale = awayMs >= 5000 && eventsConnecting/);
  assert.match(source, /resumeRealtimeQuietly\(awayMs\)/);
  assert.match(source, /pollRealtimeStateVersion\(true\)/);
  assert.match(source, /now - lastRealtimeVersionPollAt < 15000/);
  assert.match(source, /awayMs >= RESUME_SYNC_AFTER_MS && now - lastResumeProfileRefreshAt/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.doesNotMatch(source, /window\.addEventListener\("visibilitychange"/);
  assert.match(source, /function handleAppResume\(\)/);
  const resumeHandler = source.slice(source.indexOf("function handleAppResume()"), source.indexOf('document.addEventListener("visibilitychange"'));
  assert.doesNotMatch(resumeHandler, /syncRemoteChanges\(\)/);
  assert.doesNotMatch(resumeHandler, /window\.location\.reload\(\)/);
  assert.match(source, /now - lastResumeHandledAt < 500/);
  assert.match(source, /window\.addEventListener\("pagehide"/);
  assert.match(source, /window\.addEventListener\("pageshow", event => \{ if \(event\.persisted\) handleAppResume\(\); \}\)/);
  assert.doesNotMatch(source, /serviceWorkerUpdateReady/);
  assert.equal(source.match(/window\.addEventListener\("online"/g)?.length, 1);
});
