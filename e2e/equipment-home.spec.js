const { test, expect, login } = require("./fixtures");

test("equipment home keeps role access and offers a direct keyboard accessible shift action", async ({ page, app }, testInfo) => {
  await login(page, app);
  const own = page.locator(`[data-aggregate-equipment="${app.equipmentId}"]`);
  await expect(page.getByRole("searchbox", { name: "Найти оборудование" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Требуют внимания/ })).toHaveCount(0);
  await expect(page.locator(`[data-aggregate-equipment="${app.otherEquipmentId}"]`)).toHaveCount(0);
  await expect(own).toBeVisible();
  const action = page.getByRole("button", { name: /Открыть обход: Тестовый пресс/ });
  await expect(action).toBeVisible();
  if (testInfo.project.use.isMobile) {
    for (const control of [own, action]) {
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
    }
  }
  await testInfo.attach("equipment-home", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await action.focus();
  await action.press("Enter");
  await expect(page.locator("#checklistScreen")).toBeVisible();
});
