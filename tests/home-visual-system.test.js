"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("home actions share design tokens and calm alert states", () => {
  assert.match(styles, /--ui-brand: #123b53/);
  assert.match(styles, /--ui-radius: 14px/);
  assert.match(styles, /\.quick-nav button\.request-alert,[\s\S]*?animation: none !important/);
  assert.match(styles, /background: linear-gradient\(180deg, #fff, var\(--ui-danger-soft\)\)/);
});

test("home actions expose consistent keyboard focus and reduced motion", () => {
  assert.match(styles, /\.quick-nav button:focus-visible/);
  assert.match(styles, /outline: 3px solid rgba\(8, 121, 135, \.22\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("wide maintenance monitors use the available workspace", () => {
  assert.match(styles, /@media screen and \(min-width: 1280px\)/);
  assert.match(styles, /width: min\(1480px, 100%\)/);
  assert.match(styles, /#equipmentScreen > \.quick-nav \{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
});

test("narrow phones keep a readable product header", () => {
  assert.match(styles, /@media screen and \(max-width: 430px\)/);
  assert.match(styles, /html\[data-theme="dark"\] \.admin-guide-grid article/);
  assert.match(styles, /html\[data-theme="dark"\] \.admin-instruction-log article/);
  assert.match(styles, /html\[data-theme="dark"\] \.admin-access-list article/);
  assert.match(styles, /html\[data-theme="dark"\] \.director-user-row/);
  assert.match(styles, /html\[data-theme="dark"\] \.annual-ppr-act-dialog/);
  assert.match(styles, /html\[data-theme="dark"\] \.annual-ppr-work-dialog/);
  assert.match(styles, /html\[data-theme="dark"\] \.work-permit-paper/);
  assert.match(styles, /html\[data-theme="dark"\] \.global-reminder-panel/);
  assert.match(styles, /html\[data-theme="dark"\] \.director-reminder-row\.yellow/);
  assert.match(styles, /html\[data-theme="dark"\] \.system-load-card/);
  assert.match(styles, /html\[data-theme="dark"\] \.director-users/);
  assert.match(styles, /html\[data-theme="dark"\] \.order-create-form/);
  assert.match(styles, /html\[data-theme="dark"\] \.work-permit-safety-item/);
  assert.match(styles, /html\[data-theme="dark"\] \.worker-rating-details-button/);
  assert.match(styles, /html\[data-theme="dark"\] \.factory-graph-help/);
  assert.match(styles, /html\[data-theme="dark"\] \.ppr-maintenance-sheet/);
  assert.match(styles, /html\[data-theme="dark"\] \.node-open-button/);
  assert.match(styles, /html\[data-theme="dark"\] \.work-permit-optional-toolbar/);
  assert.match(styles, /html\[data-theme="dark"\] \.node-document-memo/);
  assert.match(styles, /html\[data-theme="dark"\] \.role-personal-inbox/);
  assert.match(styles, /html\[data-theme="dark"\] \.user-login-status/);
  assert.match(styles, /html\[data-theme="dark"\] \.work-permit-instruction-full-text/);
  assert.match(styles, /html\[data-theme="dark"\] \.gpm-equipment-list > button/);
  assert.match(styles, /html\[data-theme="dark"\] \.gpm-detail/);
  assert.match(styles, /html\[data-theme="dark"\] \.gpm-admin-form input/);
  assert.match(styles, /html\[data-theme="dark"\] \.send-kind-dialog/);
  assert.match(styles, /html\[data-theme="dark"\] \.admin-close-performers label/);
  assert.match(styles, /html\[data-theme="dark"\] \.node-catalog-admin input/);
  assert.match(styles, /html\[data-theme="dark"\] \.node-detail-toolbar button/);
  assert.match(styles, /html\[data-theme="dark"\] \.notification-support-status/);
  assert.doesNotMatch(app, /Пароли не отображаются\. Директор может выдать сотруднику новый временный пароль/);
  assert.match(styles, /Keep the company mark visible on phones/);
  assert.match(styles, /\.topbar-brand-logo \{[\s\S]*?display: block;[\s\S]*?flex: 0 0 58px/);
  assert.match(styles, /\.topbar-actions \{[\s\S]*?max-width: 146px/);
  assert.match(styles, /\.app-title \{[\s\S]*?font-size: 15px/);
});

test("phone equipment cards use calm surfaces with area accents", () => {
  assert.match(styles, /Phone equipment rows: keep the area color as an accent/);
  assert.match(styles, /border-left: 6px solid var\(--downtime-area-color, var\(--ui-brand\)\)/);
  assert.match(styles, /\.equipment-journal-button > strong \{[\s\S]*?font-size: 17px/);
  assert.match(styles, /\.equipment-journal-button > small \{[\s\S]*?border-radius: 999px/);
});

test("phone equipment actions keep readable contrast", () => {
  assert.match(styles, /\.equipment-installed-parts-button \{[\s\S]*?color: #27475b !important/);
  assert.match(styles, /\.equipment-installed-parts-button span,[\s\S]*?color: #27475b !important/);
  assert.match(styles, /\.equipment-qr-print-button \{[\s\S]*?background: #0f766e !important/);
  assert.match(styles, /\.equipment-qr-print-button small \{[\s\S]*?color: rgba\(255, 255, 255, \.88\) !important/);
});

test("theme selection offers only clear light and dark modes", () => {
  assert.match(app, /const THEME_MODES = new Set\(\["light", "dark"\]\)/);
  assert.doesNotMatch(app, /Как на телефоне/);
  assert.match(app, /data-theme-mode/);
  assert.match(html, /ppr-theme-mode-v2/);
  assert.match(app, /localStorage\.getItem\(THEME_KEY\) \|\| "dark"/);
});

test("dark theme uses a WhatsApp-inspired palette", () => {
  assert.match(styles, /--paper:#0b141a/);
  assert.match(styles, /--panel:#111b21/);
  assert.match(styles, /--nav:#202c33/);
  assert.match(styles, /--ui-accent:#00a884/);
  assert.match(styles, /Stage 1 dark theme: home, navigation and equipment overview/);
  assert.match(styles, /html\[data-theme="dark"\] \.equipment-schedule-table/);
  assert.match(styles, /html\[data-theme="dark"\] \.equipment-month-bar/);
  assert.match(styles, /html\[data-theme="dark"\] \.mobile-nav/);
  assert.match(styles, /html\[data-theme="dark"\] \.mobile-nav \.iphone-home-button/);
  assert.match(styles, /inset 0 0 0 3px #111b21/);
  assert.match(styles, /html\[data-theme="dark"\] \.downtime-legend-item/);
  assert.match(styles, /html\[data-theme="dark"\] \.downtime-journal-sheet/);
  assert.match(styles, /html\[data-theme="dark"\] \.downtime-journal-table th/);
  assert.match(styles, /html\[data-theme="dark"\] \.downtime-journal-table td/);
  assert.match(styles, /html\[data-theme="dark"\] #aggregateJournalScreen \.aggregate-mobile-record-card/);
  assert.match(styles, /html\[data-theme="dark"\] #aggregateJournalScreen \.aggregate-journal-table th/);
  assert.match(styles, /html\[data-theme="dark"\] #aggregateJournalScreen \.aggregate-journal-table td/);
  assert.match(styles, /html\[data-theme="dark"\] \.equipment-schedule-table \.area-color-cell \.equipment-installed-parts-button/);
  assert.match(styles, /html\[data-theme="dark"\] \.equipment-schedule-table \.area-color-cell \.equipment-qr-print-button/);
  assert.match(styles, /html\[data-theme="dark"\] \.equipment-schedule-table td\.downtime-cell/);
  assert.match(styles, /html\[data-theme="dark"\] \.equipment-schedule-table td\.operational-paused-day/);
  assert.match(styles, /html\[data-theme="dark"\] \.welding-home-button/);
  assert.match(styles, /html\[data-theme="dark"\] \.welding-request-form/);
  assert.match(styles, /html\[data-theme="dark"\] \.welding-card/);
  assert.match(styles, /html\[data-theme="dark"\] \.production-work-tabs/);
  assert.match(styles, /html\[data-theme="dark"\] \.qr-journal-area-card/);
  assert.match(styles, /html\[data-theme="dark"\] \.attendance-panel/);
  assert.match(styles, /html\[data-theme="dark"\] \.equipment-create-panel/);
  assert.match(styles, /html\[data-theme="dark"\] \.admin-maintenance-sheet/);
  assert.match(styles, /html\[data-theme="dark"\] \.factory-analytics-card/);
  assert.match(styles, /html\[data-theme="dark"\] \.worker-rating-row/);
  assert.match(styles, /html\[data-theme="dark"\] \.engineer-report/);
  assert.match(styles, /html\[data-theme="dark"\] \.qr-walk-journal-sheet/);
  assert.match(styles, /html\[data-theme="dark"\] \.qr-walk-journal-controls \.segmented/);
  assert.match(styles, /html\[data-theme="dark"\] \.qr-walk-journal-sheet \.aggregate-journal-table \{/);
  assert.match(styles, /@media \(max-width: 680px\) \{[\s\S]*?html\[data-theme="dark"\] \.qr-walk-journal-sheet \.aggregate-journal-table[\s\S]*?min-width: 0/);
  assert.match(styles, /html\[data-theme="dark"\] \.node-document-legal a/);
  assert.match(styles, /html\[data-theme="dark"\] \.node-reminder/);
  assert.match(styles, /html\[data-theme="dark"\] \.gpm-official-sheet/);
  assert.match(styles, /html\[data-theme="dark"\] \.worker-rating-ledger-summary/);
  assert.match(styles, /html\[data-theme="dark"\] \.worker-graph-bar-wrap/);
  assert.match(styles, /html\[data-theme="dark"\] \.month-close-panel/);
  assert.match(styles, /html\[data-theme="dark"\] \.attendance-person-actions \.button-link/);
  assert.match(styles, /html\[data-theme="dark"\] \.downtime-active-summary-card/);
  assert.match(styles, /html\[data-theme="dark"\] \.open-remark-item/);
  assert.match(styles, /html\[data-theme="dark"\] \.qr-scan-panel/);
  assert.match(styles, /html\[data-theme="dark"\] \.installed-part-journal-dialog/);
  assert.match(styles, /html\[data-theme="dark"\] \.operational-pause-control/);
  assert.match(styles, /@media print \{[\s\S]*?color-scheme: light/);
});
