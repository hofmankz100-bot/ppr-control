const { test, expect, login } = require("./fixtures");

test("opening a calendar day creates a server plan for an operator and only a planner can replace it", async ({ page, browser, app }) => {
  const generationRequests = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/ppr-sheet/generate" && request.method() === "POST") generationRequests.push(request.postDataJSON());
  });
  await login(page, app);
  const readState = async target => {
    const response = await target.request.get(`${app.baseURL}/api/state`, { headers: { "x-client-protocol": "1" } });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  await page.locator("#globalReminderButton").click();
  const overlay = page.locator("#globalReminderOverlay");
  await expect(overlay).toBeVisible();
  const scheduledDay = overlay.locator(".ppr-calendar-day.warning, .ppr-calendar-day.missed, .ppr-calendar-day.history").first();
  await expect(scheduledDay).toBeVisible();
  const date = await scheduledDay.getAttribute("data-ppr-day-date");
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await scheduledDay.click();
  const sheet = overlay.locator(`[data-ppr-sheet-date="${date}"]`);
  await expect(sheet).toContainText("Автоплан: Система");
  const workInputs = sheet.locator("[data-ppr-work-input]");
  await expect(workInputs.first()).not.toHaveValue("");
  await expect(workInputs.first()).toHaveAttribute("readonly", "");
  await expect(sheet.locator("[data-autofill-ppr-sheet]")).toHaveCount(0);
  expect(generationRequests.some(request => request.date === date && !request.force)).toBe(true);
  const saved = (await readState(page)).pprSheets[date];
  expect((await page.request.get(`${app.baseURL}/api/ppr-sheet/plan?date=${date}`, { headers: { "x-client-protocol": "1" } })).status()).toBe(403);
  expect((await page.request.post(`${app.baseURL}/api/ppr-sheet/plan`, { headers: { "x-client-protocol": "1" }, data: { date, rows: [] } })).status()).toBe(403);
  expect(saved.plannedByName).toBe("Система");
  expect(saved.plannedByRole).toBe("system");
  expect(saved.rows.some(row => row.work && row.autoFilled)).toBe(true);
  const rowIds = saved.rows.map(row => row.id);

  await overlay.locator("#globalReminderClose").click();
  await page.locator("#globalReminderButton").click();
  await overlay.locator(`[data-ppr-day-date="${date}"]`).click();
  await expect(sheet).toContainText("Автоплан: Система");
  expect((await readState(page)).pprSheets[date].rows.map(row => row.id)).toEqual(rowIds);

  const engineerContext = await browser.newContext({ ignoreHTTPSErrors: true, locale: "ru-RU", timezoneId: "Asia/Qyzylorda" });
  const engineer = await engineerContext.newPage();
  const engineerErrors = [];
  engineer.on("pageerror", error => engineerErrors.push(error.message));
  try {
    await login(engineer, app, app.users.engineer);
    await engineer.locator("#globalReminderButton").click();
    const engineerOverlay = engineer.locator("#globalReminderOverlay");
    await engineerOverlay.locator(`[data-ppr-day-date="${date}"]`).click();
    const engineerSheet = engineerOverlay.locator(`[data-ppr-sheet-date="${date}"]`);
    const firstWork = engineerSheet.locator("[data-ppr-work-input]").first();
    await expect(firstWork).toHaveAttribute("readonly", "");
    await engineerSheet.locator("[data-ppr-plan-edit]").click();
    await expect(firstWork).toBeEditable();
    await firstWork.fill("Ручной перечень инженера для проверки восстановления шаблона");
    await firstWork.blur();
    expect((await readState(engineer)).pprSheets[date].rows[0].work).toBe(saved.rows[0].work);
    engineer.once("dialog", async dialog => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain("Заменить незавершённые работы");
      await dialog.accept();
    });
    await engineerSheet.locator("[data-autofill-ppr-sheet]").click();
    const save = engineer.waitForResponse(response => new URL(response.url()).pathname === "/api/ppr-sheet/plan" && response.request().method() === "POST");
    await engineerSheet.locator("[data-ppr-plan-save]").click();
    const response = await save;
    expect(response.status()).toBe(200);
    const restored = (await response.json()).state.pprSheets[date];
    expect(restored.plannedByName).toBe(app.users.engineer.name);
    expect(restored.rows.map(row => row.work)).toEqual(saved.rows.filter(row => row.work).map(row => row.work));
    await expect(firstWork).toHaveValue(saved.rows[0].work);
    expect(engineerErrors).toEqual([]);
  } finally {
    await engineerContext.close();
  }
});
