const { test, expect, login } = require("./fixtures");

const photo = { name: "draft.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM1sAAAAASUVORK5CYII=", "base64") };
const records = trade => Object.fromEntries(Array.from({ length: 4 }, (_, index) => {
  const id = `ui-${trade}-${index}`;
  return [id, { id, status: "new", createdAt: `2026-09-06T0${8 - index}:00:00Z`, updatedAt: "2026-09-06T08:00:00Z", createdById: "e2e-operator", createdByName: "Оператор Тест", createdByRole: "operator", description: `Заявка ${index + 1}. ${"Подробное описание изделия и требуемой обработки. ".repeat(75)}` }];
}));
test.use({ appSeed: { weldingJournal: records("welding"), turningJournal: records("turning") } });

async function openRequests(page, app) {
  await login(page, app);
  await page.locator("#weldingHomeButton").click();
  await expect(page.locator("#weldingScreen")).toBeVisible();
}

test("production requests fit the phone, swipe between cards and retain position on refresh", async ({ page, app }, testInfo) => {
  await openRequests(page, app);
  for (const trade of ["welding", "turning"]) {
    await page.locator(`[data-production-tab="${trade}"]`).click();
    const list = page.locator(".welding-list");
    await expect(list.locator(":scope > article")).toHaveCount(4);
    await expect(page.locator(".production-request-details")).not.toHaveAttribute("open");
    if (testInfo.project.use.isMobile) {
      const first = list.locator("article").first();
      // The counter changes at the midpoint of a smooth scroll. Wait for the
      // card to reach its snap position before starting the next input method.
      const settledAt = index => expect.poll(() => list.evaluate((element, index) =>
        Math.abs(element.children[index].getBoundingClientRect().left - element.getBoundingClientRect().left), index)).toBeLessThan(2);
      await first.scrollIntoViewIfNeeded();
      const geometry = await first.evaluate(card => ({ height: card.clientHeight, content: card.scrollHeight, pageWidth: document.documentElement.scrollWidth, screenWidth: innerWidth, screenHeight: innerHeight }));
      expect(geometry.height).toBeLessThanOrEqual(geometry.screenHeight * 0.73);
      expect(geometry.content).toBeGreaterThan(geometry.height);
      expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.screenWidth + 1);
      // Native touch input on Chromium. Mobile WebKit automation has no swipe
      // or wheel input; its scrolling, snapping and controls are checked below.
      const box = await first.boundingBox();
      if (testInfo.project.name.includes("chromium")) {
        const cdp = await page.context().newCDPSession(page);
        try {
          const y = Math.max(100, box.y + 80);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width * .85, y }] });
          for (let step = 1; step <= 12; step += 1) {
            await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + box.width * (.85 - .7 * step / 12), y }] });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        }
        finally { await cdp.detach(); }
      } else {
        await list.evaluate(element => element.scrollBy({ left: element.clientWidth, behavior: "smooth" }));
      }
      await expect(page.locator(".production-card-navigation span")).toHaveText("Заявка 2 из 4");
      await settledAt(1);
      await page.getByRole("button", { name: "Следующая заявка", exact: true }).click();
      await expect(page.locator(".production-card-navigation span")).toHaveText("Заявка 3 из 4");
      await settledAt(2);
      await list.focus();
      await list.press("ArrowLeft");
      await expect(page.locator(".production-card-navigation span")).toHaveText("Заявка 2 из 4");
      await settledAt(1);
      await list.locator("article").nth(1).evaluate(card => { card.scrollTop = card.scrollHeight; });
      await expect.poll(() => list.locator("article").nth(1).evaluate(card => card.scrollTop)).toBeGreaterThan(0);
      await page.locator(`[data-${trade}-month]`).fill("2026-08");
      await expect(page.locator(".production-card-navigation span")).toHaveText("Заявка 2 из 4");
      await settledAt(1);
      await expect.poll(() => list.locator("article").nth(1).evaluate(card => card.scrollTop)).toBeGreaterThan(0);
    } else {
      await expect(page.locator(".production-card-navigation")).toBeHidden();
    }
  }
  await testInfo.attach("production-cards", { body: await page.screenshot({ fullPage: true, path: testInfo.outputPath("production-cards.png") }), contentType: "image/png" });
});

test("production form drafts and selected photos survive trade and month changes", async ({ page, app }, testInfo) => {
  await openRequests(page, app);
  await page.locator(".production-request-details > summary").click();
  await page.locator('#weldingRequestForm [name="description"]').fill("Черновик сварки без потери текста");
  await page.locator('#weldingRequestForm [name="requestPhoto"]').setInputFiles(photo);
  await page.locator('[data-production-tab="turning"]').click();
  await page.locator(".production-request-details > summary").click();
  await page.locator('#turningRequestForm [name="description"]').fill("Черновик токаря без потери текста");
  await page.locator('#turningRequestForm [name="quantity"]').fill("12");
  await page.locator('#turningRequestForm [name="requestPhoto"]').setInputFiles(photo);
  await page.locator('[data-turning-month]').fill("2026-08");
  await expect(page.locator('#turningRequestForm [name="description"]')).toHaveValue("Черновик токаря без потери текста");
  await page.locator('[data-production-tab="welding"]').click();
  await expect(page.locator('#weldingRequestForm [name="description"]')).toHaveValue("Черновик сварки без потери текста");
  expect(await page.locator('#weldingRequestForm [name="requestPhoto"]').evaluate(input => input.files[0]?.name)).toBe("draft.png");
  await page.locator('[data-production-tab="turning"]').click();
  await expect(page.locator('#turningRequestForm [name="quantity"]')).toHaveValue("12");
  expect(await page.locator('#turningRequestForm [name="requestPhoto"]').evaluate(input => input.files[0]?.name)).toBe("draft.png");
  if (testInfo.project.use.isMobile) await page.setViewportSize({ width: page.viewportSize().width, height: 320 });
  const submit = page.locator('#turningRequestForm button[type="submit"]');
  await submit.scrollIntoViewIfNeeded();
  const box = await submit.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  await submit.click({ trial: true });
  await testInfo.attach("production-form-bottom", { body: await page.screenshot({ path: testInfo.outputPath("production-form-bottom.png") }), contentType: "image/png" });
});
