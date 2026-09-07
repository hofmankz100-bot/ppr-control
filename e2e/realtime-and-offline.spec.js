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

test("a QR mark queued during network loss is delivered once after reconnection", async ({ page, context, app }) => {
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
});

test("offline reopening preserves the cached shell and authenticated worker session", async ({ page, context, app, browserName }) => {
  test.skip(browserName === "webkit", "WebKit offline navigation reports an engine internal error on Windows and Linux CI; session outage/revalidation is covered separately on WebKit");
  await login(page, app);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    }
  });
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("./index.html")))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("ППР Контроль");
  await expect(page.locator("#connectionStatus")).toContainText("Нет связи");
  await expect(page.locator("#loginOverlay")).toBeHidden();
  await expect(page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ppr-pwa-profile-v1")).name)).toBe(app.users.operator.name);
  const revalidated = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/session" && response.status() === 200);
  await context.setOffline(false);
  await revalidated;
  await expect(page.locator("#connectionStatus")).toBeHidden();
});

test.describe("session authority during server failures", () => {
  // Route the actual session HTTP response; shell/SW navigation is exercised by
  // the separate real-offline scenario. This also runs on WebKit without its
  // offline-navigation engine limitation.
  test.use({ serviceWorkers: "block" });

  test("503 on reopen preserves the confirmed profile and reconnect revalidates it", async ({ page, context, app }) => {
    await login(page, app);
    await page.route("**/api/auth/session", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Temporary test outage" }) }));
    await page.reload();
    await expect(page.locator("#connectionStatus")).toBeHidden();
    await expect(page.locator("#loginOverlay")).toBeHidden();
    await expect(page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`)).toBeVisible();
    await expect(page.locator(`[data-aggregate-equipment="${app.otherEquipmentId}"]`)).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ppr-pwa-profile-v1")).name)).toBe(app.users.operator.name);
    await page.unroute("**/api/auth/session");
    await context.setOffline(true);
    const revalidated = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/session" && response.status() === 200);
    await context.setOffline(false);
    await revalidated;
    await expect(page.locator("#connectionStatus")).toBeHidden();
    await expect(page.locator("#loginOverlay")).toBeHidden();
  });

  test("a real 401 on reconnect ends the session without discarding or sending queued work", async ({ page, context, app }) => {
    await login(page, app);
    await openQr(page, app);
    await context.setOffline(true);
    await page.locator("[data-qr-good]").click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ppr-pwa-state-v3-qr-pending-marks-v1") || "[]").length)).toBe(1);
    await context.clearCookies();
    let markRequests = 0;
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/qr-walk/mark") markRequests += 1; });
    const rejected = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/session" && response.status() === 401);
    await context.setOffline(false);
    await rejected;
    await expect(page.locator("#loginOverlay")).toBeVisible();
    await expect(page.locator("#loginError")).toContainText("Сессия завершена");
    expect(await page.evaluate(() => localStorage.getItem("ppr-pwa-profile-v1"))).toBeNull();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ppr-pwa-state-v3-qr-pending-marks-v1") || "[]").length)).toBe(1);
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("ppr-pwa-state-v3") || "{}").checks || {}).length)).toBeGreaterThan(0);
    expect(markRequests).toBe(0);
    await login(page, app, app.users.engineer);
    await expect(page.locator("#connectionStatus")).toContainText("Отметки другого сотрудника");
    expect(await serverMarks(page, app)).toHaveLength(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ppr-pwa-state-v3-qr-pending-marks-v1") || "[]").length)).toBe(1);
    expect(markRequests).toBe(0);
  });

  test("an explicit 403 session response clears cached identity but keeps local records", async ({ page, app }) => {
    await login(page, app);
    await page.route("**/api/auth/session", route => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Session access revoked" }) }));
    await page.reload();
    await expect(page.locator("#loginOverlay")).toBeVisible();
    await expect(page.locator("#loginError")).toContainText("Сессия завершена");
    expect(await page.evaluate(() => localStorage.getItem("ppr-pwa-profile-v1"))).toBeNull();
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("ppr-pwa-state-v3") || "{}").checks || {}).length)).toBeGreaterThan(0);
  });

  test("pending remarks survive 401, reject another author and sync after the original employee signs in", async ({ page, context, app }) => {
    await login(page, app);
    await page.locator('tr').filter({ has: page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`) }).locator("td.today-cell").click();
    await page.locator('[data-open-node-detail="0"]').click();
    const text = `Неотправленное замечание — ${Date.now()}`;
    await context.setOffline(true);
    await page.locator('[data-node-comment="0"]').fill(text);
    await page.locator('[data-node-submit-comment="0"]').click();
    await page.locator('[data-send-without-stop]').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("ppr-pwa-state-v3-pending"))).toBe("1");
    const localRemark = () => page.evaluate(value => Object.values(JSON.parse(localStorage.getItem("ppr-pwa-state-v3") || "{}").checks || {}).flatMap(record => record.to?.commentLog || []).find(entry => entry.text === value), text);
    expect((await localRemark()).name).toBe(app.users.operator.name);
    await context.clearCookies();
    const rejected = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/session" && response.status() === 401);
    await context.setOffline(false);
    await rejected;
    await expect(page.locator("#loginOverlay")).toBeVisible();
    let writes = 0;
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/state" && request.method() === "PUT") writes += 1; });
    await page.locator("#loginEmployeeId").fill(app.users.engineer.employeeId);
    await page.locator("#loginPassword").fill(app.users.engineer.password);
    await page.locator("#authSubmitButton").click();
    await expect(page.locator("#loginError")).toContainText(`неотправленные изменения сотрудника ${app.users.operator.name}`);
    await expect(page.locator("#loginOverlay")).toBeVisible();
    expect(writes).toBe(0);
    expect((await localRemark()).name).toBe(app.users.operator.name);
    expect(await page.evaluate(() => localStorage.getItem("ppr-pwa-state-v3-pending"))).toBe("1");
    await page.locator("#loginEmployeeId").fill(app.users.operator.employeeId);
    await page.locator("#loginPassword").fill(app.users.operator.password);
    await page.locator("#authSubmitButton").click();
    await expect(page.locator("#loginOverlay")).toBeHidden();
    await expect.poll(async () => {
      const response = await page.request.get(`${app.baseURL}/api/state`, { headers: { "x-client-protocol": "1" } });
      expect(response.ok()).toBeTruthy();
      const state = await response.json();
      return Object.values(state.checks || {}).flatMap(record => record.to?.commentLog || []).filter(entry => entry.text === text);
    }).toMatchObject([{ name: app.users.operator.name, role: "operator" }]);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("ppr-pwa-state-v3-pending"))).toBeNull();
  });

  test("online reopening restores an owned PPR snapshot from IndexedDB before sending it", async ({ page, context, app }) => {
    await login(page, app, app.users.engineer);
    const response = await page.request.get(`${app.baseURL}/api/state`, { headers: { "x-client-protocol": "1" } });
    expect(response.ok()).toBeTruthy();
    const snapshot = await response.json();
    const date = "2026-09-08", text = "Проверка плана из сохранённой памяти телефона";
    const at = new Date().toISOString();
    snapshot.pprSheets = { ...snapshot.pprSheets, [date]: { id: `sheet:${date}`, date, updatedAt: at, plannedByName: app.users.engineer.name,
      rows: [{ id: "e2e-device-ppr-row", equipmentId: app.equipmentId, equipment: "Тестовый пресс", node: app.nodeName, area: "Тестовый цех", work: text, workUpdatedAt: at }] } };
    // Stop the previous app before seeding its storage: its deferred 180ms
    // IndexedDB write can otherwise overwrite the fixture between put and goto.
    // The static JSON document retains the app origin without running app.js.
    await page.goto(`${app.baseURL}/manifest.json`);
    await context.setOffline(true);
    // Model a durable unsent snapshot from the previous app run. Operational
    // PPR data intentionally exists only in IndexedDB, not the lightweight cache.
    const seeded = await page.evaluate(async ({ snapshot, user, date }) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("ppr-control-device-v3", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("state");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const transaction = db.transaction("state", "readwrite");
        transaction.objectStore("state").put(snapshot, "full-state");
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      const stored = await new Promise((resolve, reject) => {
        const request = db.transaction("state", "readonly").objectStore("state").get("full-state");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      localStorage.setItem("ppr-pwa-state-v3-pending", "1");
      localStorage.setItem("ppr-pwa-state-v3-pending-owner-v1", JSON.stringify({ ownerId: user.id, ownerEmployeeId: user.employeeId, ownerName: user.name }));
      if (JSON.parse(localStorage.getItem("ppr-pwa-state-v3") || "{}").pprSheets) throw new Error("PPR must be absent from the lightweight cache in this test");
      return stored?.pprSheets?.[date]?.rows?.find(row => row.id === "e2e-device-ppr-row")?.work;
    }, { snapshot, date, user: { id: app.users.engineer.id, employeeId: app.users.engineer.employeeId, name: app.users.engineer.name } });
    expect(seeded, "The durable PPR fixture must exist before restarting the app").toBe(text);
    await context.setOffline(false);
    await page.goto(app.baseURL);
    await expect(page.locator("#loginOverlay")).toBeHidden();
    await expect.poll(async () => {
      const response = await page.request.get(`${app.baseURL}/api/state`, { headers: { "x-client-protocol": "1" } });
      return (await response.json()).pprSheets?.[date]?.rows?.find(row => row.id === "e2e-device-ppr-row")?.work;
    }).toBe(text);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("ppr-pwa-state-v3-pending"))).toBeNull();
  });
});
