const { test, expect, login } = require("./fixtures");

test("equipment search keeps role access, matches nodes and offers a keyboard accessible shift action", async ({ page, app }, testInfo) => {
  await login(page, app);
  const own = page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`);
  const search = page.getByRole("searchbox", { name: "Найти оборудование" });
  await expect(search).toBeVisible();
  await search.fill("тЕсТоВыЙ  узел");
  await expect(own).toBeVisible();
  await expect(page.locator("[data-equipment-search-count]")).toHaveText("Показано 1 из 1");
  await search.fill("Чужой пресс");
  await expect(own).toBeHidden();
  await expect(page.locator(".equipment-search-empty")).toBeVisible();
  await expect(page.locator(`[data-aggregate-equipment="${app.otherEquipmentId}"]`)).toHaveCount(0);
  await page.getByRole("button", { name: "Очистить поиск", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(own).toBeVisible();
  await page.getByRole("button", { name: /Требуют внимания/ }).click();
  await expect(own).toBeVisible();
  await expect(page.getByRole("button", { name: /Требуют внимания/ })).toHaveAttribute("aria-pressed", "true");
  await search.fill("пресс");
  await search.press("Escape");
  await expect(search).toHaveValue("");
  const action = page.getByRole("button", { name: /Открыть обход: Тестовый пресс/ });
  await expect(action).toBeVisible();
  if (testInfo.project.use.isMobile) {
    for (const control of [search, action]) {
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
    }
  }
  await testInfo.attach("equipment-home-search", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await action.focus();
  await action.press("Enter");
  await expect(page.locator("#checklistScreen")).toBeVisible();
});
