const path = require("node:path");
const { test, expect, login } = require("./fixtures");

test.use({ serviceWorkers: "block" });
const nextPhoto = { name: "next-request.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM1sAAAAASUVORK5CYII=", "base64") };

test("a delayed real save cannot erase a newer draft after the form is rerendered", async ({ page, app }) => {
  await login(page, app);
  await page.locator("#weldingHomeButton").click();
  const form = page.locator("#weldingRequestForm");
  const description = "Заявка, отправленная перед новым черновиком";
  const newerDraft = "Новый черновик во время ожидания ответа";
  await form.locator('[name="description"]').fill(description);
  await form.locator('[name="requestPhoto"]').setInputFiles(nextPhoto);
  const submittedForm = await form.elementHandle();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let delayed = 0;
  await page.route("**/api/state", async route => {
    const request = route.request();
    if (request.method() === "PUT" && !delayed && Object.values(request.postDataJSON()?.weldingJournal || {}).some(item => item.description === description)) {
      delayed += 1;
      await gate;
    }
    await route.continue();
  });
  try {
    await form.locator('button[type="submit"]').click();
    await expect.poll(() => delayed).toBe(1);
    const month = page.locator("[data-welding-month]");
    await month.fill(await month.inputValue() === "2026-01" ? "2026-02" : "2026-01");
    await expect.poll(() => submittedForm.evaluate(element => element.isConnected)).toBe(false);
    await form.locator('[name="description"]').fill(newerDraft);
    release();
    await expect(page.locator(".app-toast").filter({ hasText: "Заявка на сварочные работы отправлена." })).toBeVisible();
    await expect(form.locator('[name="description"]')).toHaveValue(newerDraft);
    expect(await form.locator('[name="requestPhoto"]').evaluate(input => input.files[0]?.name)).toBe(nextPhoto.name);
    const response = await page.request.get(`${app.baseURL}/api/state`, { headers: { "x-client-protocol": "1" } });
    expect(response.ok()).toBeTruthy();
    const records = Object.values((await response.json()).weldingJournal || {});
    expect(records.filter(item => item.description === description)).toHaveLength(1);
    expect(records.filter(item => item.description === newerDraft)).toHaveLength(0);
  } finally { release(); }
});

test("UI module: a previous owner's delayed reset cannot clear the next owner's draft", async ({ page }) => {
  // This is an isolated browser test of the real controller, not an end-to-end
  // authentication test. No application server or account is simulated here.
  await page.setContent('<div id="production-panel"></div>');
  await page.addScriptTag({ path: path.resolve(__dirname, "../modules/production-work-ui.js") });
  const result = await page.evaluate(() => {
    const panel = document.getElementById("production-panel");
    const controller = window.PprProductionWorkUi.create(panel);
    const render = owner => {
      controller.beforeRender(owner);
      panel.innerHTML = '<form id="weldingRequestForm" class="welding-request-form"><h2>Новая заявка</h2><textarea name="description"></textarea><input type="file" name="requestPhoto"></form><div class="welding-list"></div>';
      controller.afterRender("welding");
    };
    render("first-owner:operator");
    const previousForm = panel.querySelector("form");
    previousForm.elements.description.value = "Заявка первого пользователя";
    controller.beginSubmission(previousForm);
    render("next-owner:operator");
    const nextForm = panel.querySelector("form");
    const startsEmpty = nextForm.elements.description.value === "";
    nextForm.elements.description.value = "Черновик следующего пользователя";
    const transfer = new DataTransfer();
    transfer.items.add(new File(["new-owner-photo"], "next-owner.png", { type: "image/png" }));
    nextForm.elements.requestPhoto.files = transfer.files;
    const oldSubmissionCurrent = controller.isSubmissionCurrent(previousForm, "next-owner:operator");
    controller.resetForm(previousForm);
    return { startsEmpty, oldSubmissionCurrent, text: nextForm.elements.description.value, photo: nextForm.elements.requestPhoto.files[0]?.name };
  });
  expect(result).toEqual({ startsEmpty: true, oldSubmissionCurrent: false, text: "Черновик следующего пользователя", photo: "next-owner.png" });
});

test("UI module: newer file and input revisions survive a delayed reset even when their names or text match", async ({ page }) => {
  await page.setContent('<div id="production-panel"></div>');
  await page.addScriptTag({ path: path.resolve(__dirname, "../modules/production-work-ui.js") });
  const harness = await page.evaluateHandle(() => {
    const panel = document.getElementById("production-panel");
    const controller = window.PprProductionWorkUi.create(panel);
    controller.beforeRender("same-owner:operator");
    panel.innerHTML = '<form id="turningRequestForm" class="welding-request-form"><h2>Новая заявка</h2><textarea name="description"></textarea><input type="file" name="requestPhoto"></form><div class="welding-list"></div>';
    controller.afterRender("turning");
    const form = panel.querySelector("form");
    form.elements.description.value = "Текст заявки";
    const putPhoto = contents => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([contents], "photo.png", { type: "image/png", lastModified: 1 }));
      form.elements.requestPhoto.files = transfer.files;
    };
    putPhoto("original-image");
    controller.beginSubmission(form);
    putPhoto("replacement-image");
    const replacement = form.elements.requestPhoto.files[0];
    controller.resetForm(form);
    const preserved = { text: form.elements.description.value, sameFile: form.elements.requestPhoto.files[0] === replacement };
    controller.beginSubmission(form);
    controller.resetForm(form);
    return { controller, form, result: { ...preserved, unchangedResetText: form.elements.description.value, unchangedResetFiles: form.elements.requestPhoto.files.length } };
  });
  try {
    expect(await harness.evaluate(value => value.result)).toEqual({ text: "Текст заявки", sameFile: true, unchangedResetText: "", unchangedResetFiles: 0 });
    await page.locator(".production-request-details > summary").click();
    const description = page.locator('[name="description"]');
    await description.fill("Повторно введённый текст");
    await harness.evaluate(({ controller, form }) => controller.beginSubmission(form));
    await description.fill("Другой текст");
    await description.fill("Повторно введённый текст");
    await harness.evaluate(({ controller, form }) => {
      const panel = document.getElementById("production-panel");
      controller.beforeRender("same-owner:operator");
      panel.innerHTML = '<form id="turningRequestForm" class="welding-request-form"><h2>Новая заявка</h2><textarea name="description"></textarea><input type="file" name="requestPhoto"></form><div class="welding-list"></div>';
      controller.afterRender("turning");
      controller.resetForm(form);
    });
    await expect(description).toHaveValue("Повторно введённый текст");
  } finally { await harness.dispose(); }
});
