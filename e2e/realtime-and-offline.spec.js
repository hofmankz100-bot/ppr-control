const { test, expect, login } = require("./fixtures");

async function openQr(page, app) {
  await page.goto(`${app.baseURL}/?qr=${encodeURIComponent(app.qrPayload)}`);
  await expect(page.getByRole("dialog", { name: "Результат обхода QR" })).toBeVisible();
}

async function serverMarks(page, app) {
  const response = await page.request.get(`${app.baseURL}/api/state`, { headers: { "x-client-protocol": "1" } });
  expect(response.ok()).toBeTruthy();
  const state = await response.json();
  return Object.entries(state.checks || {}).filter(([key]) => key.startsWith(`${app.equipmentId}:0:`))
    .flatMap(([, record]) => Object.values(record.to?.walkGroups?.operational || {})).filter(mark => mark.done);
}

test("a remark created on one device appears on another without reloading", async ({ page, browser, app }) => {
  await login(page, app);
  const observer = await browser.newContext({ locale: "ru-RU", timezoneId: "Asia/Qyzylorda", ignoreHTTPSErrors: true });
  try {
    const engineer = await observer.newPage();
    const errors = [];
    engineer.on("pageerror", error => errors.push(error.message));
    await login(engineer, app, app.users.engineer);
    await engineer.locator('tr').filter({ has: engineer.locator(`[data-aggregate-equipment="${app.equipmentId}"]`) }).locator("td.today-cell").click();
    await engineer.locator('[data-open-node-detail="0"]').click();
    const text = `Проверить крепление — ${Date.now()}`;
    await expect(engineer.locator(".remark-card").filter({ hasText: text })).toHaveCount(0);
    let navigations = 0;
    engineer.on("framenavigated", frame => { if (frame === engineer.mainFrame()) navigations += 1; });
    await openQr(page, app);
    await page.locator("[data-qr-remark]").click();
    await page.locator("[data-qr-comment]").fill(text);
    await page.locator("[data-qr-save-remark]").click();
    await expect(page.getByRole("dialog", { name: "Результат обхода QR" })).toBeHidden();
    await expect(engineer.locator(".remark-card").filter({ hasText: text })).toBeVisible({ timeout: 15000 });
    expect(navigations).toBe(0);
    expect(errors).toEqual([]);
    await engineer.reload();
    await expect(engineer.locator("#alertCounter strong")).toHaveText("1");
  } finally {
    await observer.close();
  }
});

test("a QR mark queued during network loss is delivered once after reconnection", async ({ page, context, app, browserName, runtimeErrors }) => {
  await login(page, app);
  await openQr(page, app);
  expect(await serverMarks(page, app)).toHaveLength(0);
  await context.setOffline(true);
  await page.locator("[data-qr-good]").click();
  await expect(page.getByRole("dialog", { name: "Результат обхода QR" })).toBeHidden();
  // Inspect the durable browser queue, without calling application internals.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ppr-pwa-state-v3-qr-pending-marks-v1") || "[]").length)).toBe(1);
  expect(await serverMarks(page, app)).toHaveLength(0);
  await context.setOffline(false);
  await expect.poll(() => serverMarks(page, app), { timeout: 15000 }).toHaveLength(1);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ppr-pwa-state-v3-qr-pending-marks-v1") || "[]").length)).toBe(0);
  // Reopening the physical QR must not offer a second completion for this shift.
  await page.goto(`${app.baseURL}/?qr=${encodeURIComponent(app.qrPayload)}`);
  await expect(page.locator("#loginOverlay")).toBeHidden();
  await expect(page.locator("[data-qr-good]")).toHaveCount(0);
  expect(await serverMarks(page, app)).toHaveLength(1);
  const accessError = `/localhost:${new URL(app.baseURL).port}/api/state due to access control checks.`;
  if (process.platform === "win32" && browserName === "webkit" && runtimeErrors.length === 1 && runtimeErrors[0] === accessError) {
    // The data assertions above succeeded, but this exact runtime error was
    // observed on Windows WebKit. Report it as an unresolved defect, never as
    // a passing scenario; any other/additional error remains a hard failure.
    const observed = runtimeErrors.shift();
    test.fail(true, "BROWSER-002: Windows WebKit reports an access-control error during network recovery");
    expect(observed, "BROWSER-002: reconnect must not produce an unhandled fetch error").toBeUndefined();
  }
});

test("offline reopening preserves an authenticated worker session @known-issue", async ({ page, context, app, browserName }) => {
  test.skip(process.platform === "win32" && browserName === "webkit", "Windows WebKit offline reload fails even in the standalone SW repro; run on Linux or a physical iPhone");
  await login(page, app);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    }
  });
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("./index.html")))).toBe(true);
  await context.setOffline(true);
  const failedSession = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/session" && response.status() === 503);
  await Promise.all([page.reload({ waitUntil: "domcontentloaded" }), failedSession]);
  await expect(page).toHaveTitle("ППР Контроль");
  // Wait for the actual session response to be processed, rather than asserting
  // against the transient authenticated screen shown before startup finishes.
  await expect(page.locator("#loginError")).toContainText("Сессия завершена");
  // Keep the actual desired behavior executable. An unexpected pass forces this
  // annotation to be removed when session restoration is fixed (BROWSER-001).
  test.fail(true, "BROWSER-001: a network error in restoreServerSession clears the saved profile");
  await expect(page.locator("#loginOverlay"), "BROWSER-001: cached login must survive an offline reopen").toBeHidden({ timeout: 3000 });
});
