const { test, expect, login } = require("./fixtures");

test("a maintenance reminder opens its date and today's work is listed only once", async ({ page, app }, info) => {
  // Equipment 90 is due on Monday 7 September. Use fixed dates so this test
  // exercises both the upcoming reminder and the due-day view every day.
  await page.clock.setFixedTime(new Date("2026-09-06T05:00:00Z"));
  await login(page, app);
  await page.locator("#globalReminderButton").click();
  const overlay = page.locator("#globalReminderOverlay");
  await expect(overlay.locator("#globalReminderTitle")).toHaveText("График ППР");
  const upcoming = overlay.locator('.director-reminder-row[data-open-ppr-date="2026-09-07"]').filter({ hasText: "Тестовый пресс" });
  await expect(upcoming).toHaveCount(1);
  await upcoming.focus();
  await upcoming.press("Enter");
  await expect(overlay.locator('.ppr-calendar-day.selected')).toHaveAttribute("data-ppr-day-date", "2026-09-07");
  await expect(overlay.locator('[data-ppr-sheet-date="2026-09-07"]')).toContainText("Автоплан: Система");

  await page.clock.setFixedTime(new Date("2026-09-07T05:00:00Z"));
  await page.reload();
  await expect(page.locator("#loginOverlay")).toBeHidden();
  await page.locator("#globalReminderButton").click();
  const today = overlay.locator('.director-calendar-row').filter({ hasText: "Тестовый пресс" });
  await expect(today).toHaveCount(1);
  await expect(overlay.locator('.director-reminder-row').filter({ hasText: "Тестовый пресс" })).toHaveCount(0);
  await expect(page.locator("#globalReminderBadge")).toHaveText("1");
  await expect(overlay).not.toContainText("Всё выполнено");
  await expect(overlay.getByRole("heading", { name: "Работы сегодня", exact: true })).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("reminders-without-duplicates.png") });
  await today.focus();
  await today.press("Space");
  await expect(overlay.locator('.ppr-calendar-day.selected')).toHaveAttribute("data-ppr-day-date", "2026-09-07");
});
