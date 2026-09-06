const { test, expect, login } = require("./fixtures");

test("wrong password can be corrected and the authenticated session survives reload", async ({ page, app }) => {
  await page.goto(app.baseURL);
  await page.locator("#loginEmployeeId").fill(app.users.operator.employeeId);
  await page.locator("#loginPassword").fill("incorrect-password");

  const rejectedLogin = page.waitForResponse(response =>
    new URL(response.url()).pathname === "/api/auth/login"
      && response.request().method() === "POST"
  );
  await page.locator("#authSubmitButton").click();
  expect((await rejectedLogin).status()).toBe(401);
  await expect(page.locator("#loginOverlay")).toBeVisible();
  await expect(page.locator("#loginError")).toContainText("Неверный табельный номер, телефон или пароль");
  await expect(page.locator("#authSubmitButton")).toBeEnabled();

  // Correct the same form, so a failed login must not leave it disabled or stale.
  await page.locator("#loginPassword").fill(app.users.operator.password);
  await page.locator("#authSubmitButton").click();
  await expect(page.locator("#loginOverlay")).toBeHidden();
  await expect(page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`)).toBeVisible();
  await expect(page.locator("#profileBar")).toContainText(app.users.operator.name);

  const restoredSession = page.waitForResponse(response =>
    new URL(response.url()).pathname === "/api/auth/session"
      && response.request().method() === "GET"
  );
  await page.reload();
  expect((await restoredSession).ok()).toBeTruthy();
  await expect(page.locator("#loginOverlay")).toBeHidden();
  await expect(page.locator("#profileBar")).toContainText(app.users.operator.name);
  await expect(page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`)).toContainText("Тестовый пресс");
  await expect(page.locator(`[data-aggregate-equipment="${app.otherEquipmentId}"]`)).toHaveCount(0);
});

test("operator sees the assigned workshop and can use home controls on a phone", async ({ page, app }, testInfo) => {
  await login(page, app);
  const ownEquipment = page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`);
  await expect(ownEquipment).toContainText("Тестовый пресс");
  await expect(ownEquipment).toContainText("Тестовый цех");
  await expect(page.locator(`[data-aggregate-equipment="${app.otherEquipmentId}"]`)).toHaveCount(0);
  await expect(page.locator("#equipmentList")).not.toContainText("Чужой пресс");
  await expect(page.locator("#directorOpenButton")).toBeHidden();

  const homeControls = ["#globalReminderButton", "#alertCounter", "#downtimeOpenButton", "#workPermitButton"];
  if (testInfo.project.use.isMobile) homeControls.push("#qrWalkButton");
  else await expect(page.locator("#qrWalkButton")).toBeHidden(); // Desktop CSS deliberately hides the camera shortcut.
  for (const selector of homeControls) {
    const button = page.locator(selector);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    if (testInfo.project.use.isMobile) {
      await button.scrollIntoViewIfNeeded();
      const bounds = await button.boundingBox();
      expect(bounds, `${selector} must have a rendered touch target`).not.toBeNull();
      expect(bounds.x, `${selector} must fit the viewport's left edge`).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width, `${selector} must fit the viewport's right edge`).toBeLessThanOrEqual(page.viewportSize().width + 1);
    }
  }

  await page.locator("#globalReminderButton").click();
  await expect(page.locator("#globalReminderOverlay")).toBeVisible();
  await expect(page.locator("#globalReminderTitle")).toHaveText("График ППР");
  await page.locator("#globalReminderClose").click();
  await expect(page.locator("#globalReminderOverlay")).toBeHidden();

  await page.locator("#downtimeOpenButton").click();
  await expect(page.locator("#downtimeScreen")).toBeVisible();
  if (testInfo.project.use.isMobile) {
    const home = page.locator('.mobile-nav [data-mobile-view="home"]');
    const profile = page.locator('.mobile-nav [data-mobile-view="profile"]');
    await expect(home).toBeInViewport();
    await expect(profile).toBeInViewport();
    await home.click();
    await expect(ownEquipment).toBeVisible();
    await profile.click();
    await expect(page.locator("#profileBar")).toBeVisible();
    await expect(page.locator("#profileBar")).toContainText(app.users.operator.name);
    await expect(page.locator("#changeUserButton")).toBeVisible();
    await home.click();
  } else {
    await page.locator("#backButton").click();
  }
  await expect(ownEquipment).toBeVisible();
  await expect(page.locator(`[data-aggregate-equipment="${app.otherEquipmentId}"]`)).toHaveCount(0);
});

test("aggregate journal print preview contains the selected equipment and completed repair", async ({ page, app }, testInfo) => {
  await login(page, app);
  await page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`).click();
  await expect(page.locator("#aggregateJournalScreen")).toBeVisible();
  await expect(page.locator("#aggregateJournalList")).toContainText("Проверка крепления тестового пресса");

  const openedPreview = page.waitForEvent("popup");
  await page.locator("[data-print-aggregate-journal]").click();
  const preview = await openedPreview;
  await expect(preview).toHaveTitle("Агрегатный журнал — Тестовый пресс");
  await expect(preview.locator(".print-sheet")).toHaveCount(1);
  await expect(preview.locator(".aggregate-sheet-head")).toContainText("Агрегатный журнал: Тестовый пресс");
  await expect(preview.locator(".aggregate-journal-table")).toHaveCount(1);
  await expect(preview.getByRole("columnheader", { name: "Краткая характеристика дефекта", exact: true })).toBeVisible();

  const repair = preview.locator("tbody tr").filter({ hasText: "Проверка крепления тестового пресса" });
  await expect(repair).toHaveCount(1);
  await expect(repair).toContainText(app.nodeName);
  await expect(repair).toContainText("Крепление восстановлено");
  await expect(repair).toContainText(app.users.operator.name);
  await expect(repair).toContainText(app.users.engineer.name);
  await expect(preview.locator("body")).not.toContainText("Чужой пресс");
  await expect(preview.locator(".aggregate-sheet-print, .aggregate-correction")).toHaveCount(0);

  if (testInfo.project.use.isMobile) {
    await expect(preview.locator("[data-mobile-journal-share]")).toBeVisible();
    await expect(preview.locator("[data-mobile-journal-back]")).toBeVisible();
  }
  await testInfo.attach("aggregate-journal-print-preview", {
    body: await preview.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
  await preview.close();
  await expect(page.locator("#aggregateJournalScreen")).toBeVisible();
});
