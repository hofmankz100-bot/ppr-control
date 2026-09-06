const { test, expect, login } = require("./fixtures");
const crypto = require("node:crypto");

test.beforeEach(async ({ page }) => { page.setDefaultTimeout(10000); });

const at = new Date().toISOString();
const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Qyzylorda" });
const longSeed = {
  catalog: { equipment: {
    "90": { id: 90, created: true, name: "Тестовый пресс", area: "Тестовый цех", nodes: ["Тестовый узел"], qrTokens: { "0": "e2e-node-token" }, updatedAt: at,
      journalSchema: { title: "Журнал тестового пресса", scope: "equipment", fieldsTiming: "immediate", resultMode: "both", frequency: "twoShifts", columns: [
        { id: "date", label: "Дата", type: "autoDate", required: true, nodeIndex: "all" },
        { id: "time", label: "Время", type: "autoTime", required: true, nodeIndex: "all" },
        { id: "employee", label: "Ф.И.О.", type: "autoEmployee", required: true, nodeIndex: "all" },
        { id: "node", label: "Узел", type: "autoNode", required: true, nodeIndex: "all" },
        { id: "result", label: "Результат", type: "result", required: true, nodeIndex: "all" }
      ] } },
    "91": { id: 91, created: true, name: "Чужой пресс", area: "Другой цех", nodes: ["Чужой узел"], qrTokens: { "0": "e2e-other-token" }, updatedAt: at }
  } },
  checks: { [`90:0:${date}`]: { createdAt: at, updatedAt: at, to: {
    tasks: Array(15).fill(false), walkGroups: {}, updatedAt: at,
    commentLog: Array.from({ length: 24 }, (_, index) => ({
      id: `dialog-remark-${index}`, at, text: `Замечание ${index + 1}: проверить крепление, защитное ограждение и работу узла после ремонта.`,
      name: "Оператор Тест", role: "operator", area: "Тестовый цех",
      ...(index < 12 ? {} : {
        resolved: true, resolvedAt: at, resolvedComment: "Крепление восстановлено, работа проверена",
        resolvedByName: "Механик Тест", resolvedByRole: "mechanic",
        confirmedAt: at, confirmedByName: "Инженер Тест", confirmedByRole: "engineer"
      })
    }))
  } } },
  adminConfig: { downtimeReasons: Array.from({ length: 18 }, (_, index) => `Причина ${index + 1}: проверка защитного механизма`) }
};
const activeStop = { id: "dialog-active-stop", equipmentId: 90, nodeIndex: 0,
  equipment: "Тестовый пресс", area: "Тестовый цех", node: "Тестовый узел",
  startedAt: at, updatedAt: at, type: "breakdown", comment: "Проверка ограждения тестового узла", authorName: "Оператор Тест" };

// Chromium uses actual input (touch on Android, wheel on desktop). Playwright
// mobile WebKit has no swipe/wheel API: that project checks native DOM scrolling,
// permitted overflow, viewport geometry and real controls, not physical touch.
async function checkDialog(page, panel, lastControl, { mustScroll = false } = {}) {
  await expect(panel).toBeVisible();
  const geometry = await panel.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      height: window.innerHeight, width: window.innerWidth,
      scrollable: element.scrollHeight > element.clientHeight + 2,
      overflow: getComputedStyle(element).overflowY };
  });
  expect(geometry.top, "Dialog starts inside the viewport").toBeGreaterThanOrEqual(0);
  expect(geometry.bottom, "Dialog ends inside the viewport").toBeLessThanOrEqual(geometry.height + 1);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width + 1);
  if (mustScroll) expect(geometry.scrollable, "The fixture exercises a genuinely long dialog").toBe(true);
  if (geometry.scrollable) {
    expect(geometry.overflow).toMatch(/^(auto|scroll)$/);
    await page.bringToFront();
    await panel.evaluate(async element => {
      element.scrollTop = 0;
      // Native input uses the rendered scroll tree. Commit the reset before
      // dispatching another gesture into a newly opened/replaced dialog.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const input = await panel.evaluate(element => {
      // A border box can include a classic scrollbar. Keep native input inside
      // the client area, using fresh geometry after resetting the scroll.
      const rect = element.getBoundingClientRect();
      const x = rect.left + element.clientLeft + element.clientWidth - 7;
      const top = rect.top + element.clientTop;
      const height = element.clientHeight;
      const hit = document.elementFromPoint(x, top + height / 2);
      return { x, top, height, inside: Boolean(hit && element.contains(hit)), hit: hit?.className };
    });
    const project = test.info().project;
    if (project.name.includes("webkit")) {
      await panel.evaluate(element => element.scrollBy({ top: 600, behavior: "instant" }));
    } else if (project.use.isMobile) {
      const cdp = await page.context().newCDPSession(page);
      try {
        const x = input.x;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: input.top + input.height * .8 }] });
        for (let step = 1; step <= 12; step += 1) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: input.top + input.height * (.8 - .6 * step / 12) }] });
          await page.evaluate(() => new Promise(requestAnimationFrame));
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } finally { await cdp.detach(); }
    } else {
      expect(input.inside, `Wheel hits the dialog client area: ${JSON.stringify(input)}`).toBe(true);
      await page.mouse.move(input.x, input.top + input.height / 2);
      await page.mouse.wheel(0, 600);
    }
    await expect.poll(() => panel.evaluate(element => element.scrollTop), { message: "The dialog scrolls vertically" }).toBeGreaterThan(0);
  }
  await lastControl.scrollIntoViewIfNeeded();
  await expect(lastControl).toBeInViewport();
}

async function home(page, app) {
  // Exercise the application's return control. Reloading here cancels unrelated
  // polling requests and makes WebKit report navigation diagnostics as pageerrors.
  await page.locator('#backButton:visible, [data-mobile-view="home"]:visible').first().click();
  await expect(page.locator("#loginOverlay")).toBeHidden();
  await expect(page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`)).toBeVisible();
}

async function denyCamera(context) {
  await context.addInitScript(() => {
    const media = navigator.mediaDevices || {};
    if (!navigator.mediaDevices) Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: media });
    Object.defineProperty(media, "getUserMedia", { configurable: true, value: async () => {
      throw new DOMException("Camera permission denied for this test", "NotAllowedError");
    } });
  });
}

for (const viewport of [
  { name: "portrait", width: 390, height: 640 },
  { name: "short landscape", width: 740, height: 320 }
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, appSeed: longSeed });

    test("equipment, custom journal, attendance and calendar dialogs keep both ends reachable", async ({ page, app }) => {
      test.setTimeout(90000);
      await login(page, app, app.users.editor);
      await page.locator("[data-create-equipment]").click();
      const create = page.locator(".equipment-create-panel");
      await checkDialog(page, create, create.locator('button[type="submit"]'));
      await create.locator("[data-equipment-create-close]").click();
      await expect(create).toHaveCount(0);

      await page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`).click();
      await page.locator("[data-edit-current-journal]").click();
      const journal = page.locator(".custom-journal-panel");
      await checkDialog(page, journal, journal.locator("[data-journal-save]"), { mustScroll: true });
      await journal.locator("[data-journal-save]").click({ trial: true });
      await journal.locator(".custom-journal-footer [data-journal-close]").click();
      await expect(journal).toHaveCount(0);
      await home(page, app);

      await page.locator("#attendanceHomeButton").click();
      const attendance = page.locator(".attendance-panel");
      await checkDialog(page, attendance, attendance.locator(".attendance-people-group").last());
      await attendance.locator("[data-attendance-close]").click();
      await expect(attendance).toHaveCount(0);
      await expect(page.locator("#equipmentScreen")).toBeVisible();
      await page.locator("#attendanceHomeButton").click();
      await expect(attendance).toBeVisible();
      await attendance.locator("[data-attendance-close]").click();
      await expect(page.locator("#equipmentScreen")).toBeVisible();

      await page.locator("#globalReminderButton").click();
      const calendar = page.locator(".global-reminder-panel");
      await checkDialog(page, calendar, calendar.locator("#globalReminderContent").locator("button").last());
      await page.locator("#globalReminderClose").click();
      await expect(page.locator("#globalReminderOverlay")).toBeHidden();

      await page.locator(`[data-installed-parts-equipment="${app.equipmentId}"]`).click();
      const parts = page.locator(".installed-part-journal-dialog");
      await expect(parts).toBeVisible();
      await parts.locator("[data-close-parts]").click();
      await expect(parts).toHaveCount(0);
    });

    test("long warnings, nested confirmation, rating and diagnostics remain usable", async ({ page, app }) => {
      test.setTimeout(90000);
      await login(page, app, app.users.editor);
      await page.locator("#alertCounter").click();
      const warnings = page.locator(".open-remarks-dialog");
      const list = warnings.locator(".open-remarks-list");
      await checkDialog(page, warnings, warnings.locator("[data-close-open-remarks]"));
      await checkDialog(page, list, list.locator("[data-open-remark-card]").last(), { mustScroll: true });
      await list.locator("[data-close-remark-with-score]").last().click();
      const confirmation = page.locator(".send-kind-dialog");
      await checkDialog(page, confirmation, confirmation.locator("[data-admin-close-cancel]"));
      await confirmation.locator("[data-admin-close-cancel]").click();
      await warnings.locator("[data-close-open-remarks]").click();

      await page.locator("#workerRatingButton").click();
      await page.locator("[data-worker-rating-details]").first().click();
      const ledger = page.locator(".worker-rating-ledger-modal > section");
      await checkDialog(page, ledger, ledger.locator("footer"), { mustScroll: true });
      await ledger.locator("[data-close-rating-ledger]").click();
      await expect(ledger).toHaveCount(0);

      await home(page, app);
      await page.locator("#directorOpenButton").click();
      await page.locator("[data-open-admin-maintenance]").click();
      await page.locator(".admin-technical-tools > summary").click();
      await page.locator("[data-open-storage-diagnostics]").click();
      const diagnostics = page.locator(".storage-diagnostics-modal > section");
      await expect(diagnostics).not.toContainText("Проверяем без удаления");
      await checkDialog(page, diagnostics, diagnostics.locator("button").last());
      await diagnostics.locator("[data-close-storage-diagnostics]").click();
      await expect(diagnostics).toHaveCount(0);
    });

    test("scanner, expanded QR repair and spare part forms can be scrolled and cancelled", async ({ page, context, app }) => {
      // Three navigations, camera fallback and two real forms need more than
      // the short default budget on mobile WebKit. Individual actions stay bounded.
      test.setTimeout(90000);
      await denyCamera(context);
      await login(page, app);
      await page.locator("#qrWalkButton").click();
      const scanner = page.locator(".qr-scan-panel");
      await expect(scanner.locator("[data-qr-retry]")).toBeVisible();
      await checkDialog(page, scanner, scanner.locator("[data-qr-cancel]"));
      await scanner.locator("[data-qr-cancel]").click();

      await page.goto(`${app.baseURL}/?qr=${encodeURIComponent(app.qrPayload)}`);
      const result = page.getByRole("dialog", { name: "Результат обхода QR", exact: true });
      await result.locator("[data-qr-remark]").click();
      await result.locator("[data-qr-comment]").fill("Проверено ограждение тестового узла");
      await result.locator("[data-qr-resolved-now]").check();
      await result.locator("[data-qr-resolution]").fill("Крепление ограждения восстановлено");
      await checkDialog(page, result, result.locator("[data-qr-save-remark]"), { mustScroll: true });
      await result.locator("[data-qr-save-remark]").click();
      const part = page.getByRole("dialog", { name: "Использование запчасти", exact: true });
      await part.locator('[data-part-choice="yes"]').click();
      await checkDialog(page, part, part.locator("[data-part-cancel]"));
      await part.locator("[data-part-cancel]").click();
      await expect(part).toHaveCount(0);
      await result.locator("[data-qr-resolved-now]").uncheck();
      await result.locator("[data-qr-save-remark]").click();
      await expect(result).toHaveCount(0);

      await page.goto(`${app.baseURL}/?qr=${encodeURIComponent(app.qrPayload)}`);
      const repeat = page.getByRole("dialog", { name: "Действие по QR", exact: true });
      await repeat.locator("[data-qr-repeat-open]").click();
      await repeat.locator("[data-qr-action-downtime]").click();
      const downtime = page.locator(".downtime-type-dialog");
      await checkDialog(page, downtime, downtime.locator('[data-downtime-type=""]'), { mustScroll: viewport.height < 400 });
      await downtime.locator('[data-downtime-type=""]').click();
      await expect(downtime).toHaveCount(0);
      await repeat.locator("[data-qr-action-close]").last().click();
      await expect(repeat).toHaveCount(0);
    });

    test.describe("existing downtime and shift QR", () => {
      test.use({ appSeed: { ...longSeed, downtimes: [activeStop], attendanceSessions: [],
        attendanceConfig: { qrEnabled: true, qrSecret: "e2e-mobile-dialogs-key", qrCreatedAt: at } } });

      test("downtime print and closing validation keep cancellation reachable", async ({ page, app }) => {
        await page.emulateMedia({ colorScheme: "dark" });
        await login(page, app, app.users.engineer);
        await page.locator('#downtimeOpenButton:visible, [data-mobile-view="downtime"]:visible').first().click();
        await page.locator(`[data-finish-active-downtime="${activeStop.id}"]`).click();
        const close = page.locator(".downtime-close-dialog");
        await close.locator("[data-downtime-close-confirm]").click();
        await expect(close.locator("[data-downtime-close-error]")).toHaveText("Напишите, что было выполнено.");
        await checkDialog(page, close, close.locator("[data-downtime-close-cancel]"), { mustScroll: viewport.height < 400 });
        await test.info().attach("downtime-dark-theme", { body: await page.screenshot({ path: test.info().outputPath("downtime-dark-theme.png") }), contentType: "image/png" });
        await close.locator("[data-downtime-close-cancel]").click();
        await expect(close).toHaveCount(0);
        await page.locator('button[data-downtime-area="Тестовый цех"]').click();
        await page.locator("[data-open-downtime-print]:visible").first().click();
        const print = page.locator(".downtime-print-dialog");
        await print.locator("[data-print-downtime-selected]").click();
        await expect(print.locator("[data-downtime-print-error]")).toContainText("Укажите листы");
        await checkDialog(page, print, print.locator("[data-print-downtime-cancel]"), { mustScroll: viewport.height < 400 });
        await print.locator("[data-print-downtime-cancel]").click();
        await expect(print).toHaveCount(0);
        await expect(page.locator(`[data-finish-active-downtime="${activeStop.id}"]`)).toBeVisible();
      });

      test("public attendance and successful shift confirmation fit the screen", async ({ page, app }) => {
        const token = `permanent.${crypto.createHmac("sha256", "e2e-mobile-dialogs-key").update("attendance:permanent").digest("base64url")}`;
        const scanURL = `${app.baseURL}/?attendance=${encodeURIComponent(token)}`;
        await page.goto(scanURL);
        const publicCard = page.locator(".public-attendance-card");
        await publicCard.locator('[name="identifier"]').fill("+77001234567");
        await publicCard.locator("[data-public-lookup] button").click();
        await expect(publicCard.locator("[data-public-contractor]")).toBeVisible();
        await checkDialog(page, publicCard, publicCard.locator("[data-public-back]"), { mustScroll: viewport.height < 400 });
        await publicCard.locator("[data-public-back]").click();
        await expect(publicCard.locator("[data-public-lookup]")).toBeVisible();

        await page.goto(app.baseURL);
        await page.locator("#loginEmployeeId").fill(app.users.welder.employeeId);
        await page.locator("#loginPassword").fill(app.users.welder.password);
        // Finish initial hydration before deliberately replacing the document.
        // WebKit emits a caught, navigation-cancelled fetch as a pageerror
        // through its Console protocol; no runtime error is filtered here.
        const hydrated = ["/api/state", "/api/attendance/status"].map(path => page.waitForResponse(response =>
          new URL(response.url()).pathname === path && response.request().method() === "GET" && response.status() === 200));
        await page.locator("#authSubmitButton").click();
        await expect(page.locator("#loginOverlay")).toBeHidden();
        await Promise.all(hydrated.map(async response => { await (await response).finished(); }));

        await page.goto(scanURL);
        const confirmation = page.locator(".attendance-scan-card");
        await checkDialog(page, confirmation, confirmation.getByRole("button", { name: "Продолжить работу" }), { mustScroll: viewport.height < 400 });
        await confirmation.getByRole("button", { name: "Продолжить работу" }).click();
        await expect(confirmation).toHaveCount(0);
      });
    });
  });
}

test("annual PPR schedule and embedded sheets stay reachable on a short wide screen", async ({ page, app }) => {
  // The annual overview is intentionally desktop-only; a wide, short viewport
  // exercises its real entry point without overriding the application's access.
  await page.setViewportSize({ width: 1100, height: 360 });
  await login(page, app, app.users.editor);
  await page.locator("[data-open-annual-ppr]").click();
  const annual = page.locator(".annual-ppr-dialog");
  await checkDialog(page, annual, annual.locator(".annual-ppr-signatures input").last(), { mustScroll: true });
  await annual.locator('[data-annual-ppr-equipment="90"] [data-open-ppr-month]').first().click();
  const progress = page.locator(".annual-ppr-node-progress-dialog");
  await checkDialog(page, progress, progress.locator("[data-open-annual-sheet]").last());
  await progress.locator("[data-open-annual-sheet]").last().click();
  const sheet = page.locator(".annual-ppr-sheet-dialog");
  await checkDialog(page, sheet, sheet.locator(".annual-ppr-sheet-dialog-body").locator("button").last(), { mustScroll: true });
  await sheet.locator("[data-sheet-list-back]").click();
  await progress.locator("[data-progress-back]").click();
  await annual.locator("[data-close-annual-ppr]").click();
  await expect(annual).toHaveCount(0);
});

test.describe("required update on a short viewport", () => {
  test.use({ serviceWorkers: "block", viewport: { width: 740, height: 320 } });
  test("the update action remains reachable after the server requires a newer client", async ({ page, app }) => {
    await page.route("**/api/health", async route => {
      const response = await route.fetch();
      const health = await response.json();
      await route.fulfill({ response, json: { ...health, version: "e2e-required-new-version" } });
    });
    await page.goto(app.baseURL);
    const update = page.getByRole("alertdialog");
    await checkDialog(page, update, update.locator("[data-required-update]"), { mustScroll: true });
    await update.locator("[data-required-update]").click();
    await expect(page).toHaveURL(/\/update\.html\?target=e2e-required-new-version/);
  });
});
