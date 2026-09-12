const { test, expect, login } = require("./fixtures");
const { scheduledItemsForDate } = require("../server/ppr-autofill");

test("edit/save/remove/autofill and print work on phone and desktop without changing old results", async ({ page, app }, testInfo) => {
  await login(page, app, app.users.engineer);
  const headers = { "x-client-protocol": "1" };
  const read = async () => (await page.request.get(`${app.baseURL}/api/state`, { headers })).json();
  await page.locator("#globalReminderButton").click();
  const overlay = page.locator("#globalReminderOverlay");
  await overlay.locator(".ppr-calendar-day.warning, .ppr-calendar-day.missed, .ppr-calendar-day.history").first().click();
  const sheet = overlay.locator("[data-ppr-sheet-date]");
  await expect(sheet.locator("[data-ppr-work-input]").first()).not.toHaveValue("");
  const date = await sheet.getAttribute("data-ppr-sheet-date");
  const original = (await read()).pprSheets[date];
  await sheet.locator("[data-ppr-plan-edit]").click();
  const first = sheet.locator("[data-ppr-work-input]").first();
  await expect(first).toBeEditable();
  const text = "Сохранённый перечень: проверить крепления — қазақша мәтін";
  await first.fill(text);
  expect((await read()).pprSheets[date]).toEqual(original);
  await expect.poll(() => first.evaluate(input => input.scrollHeight - input.clientHeight)).toBeLessThanOrEqual(2);
  page.once("dialog", dialog => dialog.accept());
  await sheet.locator("[data-ppr-sheet-row]").nth(1).locator("[data-ppr-plan-remove]").click();
  await sheet.locator("[data-ppr-plan-add]").click();
  const reserve = sheet.locator("[data-ppr-sheet-row]").last();
  await expect(reserve.locator("[data-ppr-work-input]")).toHaveValue("");
  await reserve.locator("[data-ppr-plan-remove]").click();
  await sheet.locator("[data-ppr-plan-add]").click();
  const saveResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/ppr-sheet/plan" && response.request().method() === "POST");
  await sheet.locator("[data-ppr-plan-save]").click();
  expect((await saveResponse).status()).toBe(200);
  await expect(first).toHaveAttribute("readonly", "");
  await expect(first).toHaveValue(text);
  const saved = (await read()).pprSheets[date];
  const target = saved.rows[0];
  await sheet.locator("[data-ppr-plan-edit]").click();
  await expect(first).toBeEditable();
  await first.fill("Несохранённая правка");
  page.once("dialog", dialog => dialog.accept());
  await sheet.locator("[data-autofill-ppr-sheet]").click();
  await expect(first).toHaveValue(text);
  page.once("dialog", dialog => dialog.accept());
  await sheet.locator("[data-ppr-plan-cancel]").click();
  expect((await read()).pprSheets[date]).toEqual(saved);

  await page.evaluate(() => { window.print = () => {}; });
  await sheet.locator("[data-print-ppr-sheet]").click();
  await page.emulateMedia({ media: "print" });
  await expect(sheet.locator(".ppr-empty-row").last()).toBeHidden();
  await expect(sheet.locator("[data-ppr-plan-edit]")).toBeHidden();
  await expect(sheet.locator("[data-ppr-print-work]").first()).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await sheet.screenshot({ path: testInfo.outputPath("ppr-sheet.png") });

  // Generate the next scheduled occurrence for this exact equipment and node.
  const state = await read();
  let nextDate;
  for (let offset = 1; offset <= 800; offset++) {
    const day = new Date(`${date}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + offset);
    const candidate = day.toISOString().slice(0, 10);
    if (scheduledItemsForDate(state.catalog, candidate).some(item => String(item.equipmentId) === String(target.equipmentId) && item.node === target.node)) { nextDate = candidate; break; }
  }
  expect(nextDate).toBeTruthy();
  const generation = await page.request.post(`${app.baseURL}/api/ppr-sheet/generate`, { headers, data: { date: nextDate } });
  expect(generation.ok()).toBe(true);
  const nextSheet = (await generation.json()).sheet;
  expect(nextSheet.rows.filter(row => String(row.equipmentId) === String(target.equipmentId) && row.node === target.node).map(row => row.work))
    .toEqual(saved.rows.filter(row => String(row.equipmentId) === String(target.equipmentId) && row.node === target.node && row.work.trim()).map(row => row.work));
  expect(nextSheet.rows.every(row => !row.mark && !row.markedByName && !row.resolutionComment)).toBe(true);
  expect((await read()).pprSheets[date]).toEqual(saved);
});
