const { test, expect } = require("./fixtures");

const at = new Date(Date.now() - 60000).toISOString();
const request = (id, description) => ({ id, description, requestType: "order", status: "new", createdAt: at, updatedAt: at, createdById: "e2e-operator", createdByName: "Оператор Тест" });
const welding = request("stability-welding", "Проверка устойчивости сварочной заявки");
const turning = request("stability-turning", "Проверка устойчивости токарной заявки");
const team = { ...request("stability-team", "Совместная сварочная работа"), status: "accepted", acceptedAt: at, welderId: "lead-welder", welderName: "Ответственный сварщик", participants: [{ id: "lead-welder", name: "Ответственный сварщик", role: "welder", joinedAt: at }] };
test.use({ serviceWorkers: "block", appSeed: { weldingJournal: { [welding.id]: welding, [team.id]: team }, turningJournal: { [turning.id]: turning } } });

async function loginProduction(page, app, user) {
  await page.goto(app.baseURL);
  await page.locator("#loginEmployeeId").fill(user.employeeId);
  await page.locator("#loginPassword").fill(user.password);
  await page.locator("#authSubmitButton").click();
  await expect(page.locator("#loginOverlay")).toBeHidden();
  if (!await page.locator("#weldingScreen").evaluate(element => element.classList.contains("active"))) await page.locator("#weldingHomeButton").click();
}
async function serverJournal(page, app, trade) {
  const response = await page.request.get(`${app.baseURL}/api/state`, { headers: { "x-client-protocol": "1" } });
  expect(response.ok()).toBeTruthy();
  return (await response.json())[`${trade}Journal`] || {};
}
async function fillCompletion(card, trade) {
  await card.locator('[name="material"]').fill("Сталь для теста");
  if (trade === "welding") {
    await card.locator('[name="consumables"]').fill("Проволока для теста");
    await card.locator('[name="welderStamp"]').fill("ТЕСТ");
    await card.locator('[name="welderCertificate"]').fill("ТЕСТ-123");
  } else await card.locator('[name="operations"]').fill("Тестовая обработка");
}
async function failStateWrites(page) {
  const control = { blocked: true, failures: 0, forbidden: 0 };
  await page.route("**/api/state", async route => {
    if (route.request().method() === "PUT" && control.blocked) {
      control.failures += 1;
      await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Test outage"}' });
    } else await route.continue();
  });
  page.on("response", response => { if (response.request().method() === "PUT" && response.status() === 403) control.forbidden += 1; });
  return control;
}

for (const [trade, role, seeded] of [["welding", "welder", welding], ["turning", "turner", turning]]) {
  test(`${trade}: network failure cannot collapse acceptance and completion into one rejected snapshot`, async ({ page, app }) => {
    await loginProduction(page, app, app.users[role]);
    await page.locator(`[data-production-tab="${trade}"]`).click();
    const network = await failStateWrites(page);
    const card = page.locator(`[data-${trade}-id="${seeded.id}"]`);
    await card.locator(`[data-${trade}-accept]`).click();
    await expect(card).toHaveClass(/status-accepted/);
    expect(network.failures).toBeGreaterThan(0);
    await fillCompletion(card, trade);
    await card.locator('button[type="submit"]').click();
    await expect(page.locator(".app-toast").filter({ hasText: "Предыдущий шаг ещё не сохранён" })).toBeVisible();
    await expect(card.locator('button[type="submit"]')).toBeEnabled();
    await expect(card.locator('[name="material"]')).toHaveValue("Сталь для теста");
    expect((await serverJournal(page, app, trade))[seeded.id].status).toBe("new");
    network.blocked = false;
    await expect.poll(async () => (await serverJournal(page, app, trade))[seeded.id].status).toBe("accepted");
    await card.locator('button[type="submit"]').click();
    await expect.poll(async () => (await serverJournal(page, app, trade))[seeded.id].status).toBe("awaitingAcceptance");
    expect((await serverJournal(page, app, trade))[seeded.id].material).toBe("Сталь для теста");
    expect(network.forbidden).toBe(0);
  });
}

test("a never-saved self request stays new until reconnect, then reaches the server once", async ({ page, app }) => {
  await loginProduction(page, app, app.users.welder);
  const network = await failStateWrites(page);
  const details = page.locator(".production-request-details");
  if (await details.count()) await details.locator("summary").click();
  const form = page.locator("#weldingRequestForm");
  const description = "Собственная заявка во время сбоя";
  await form.locator('[name="description"]').fill(description);
  await form.locator('button[type="submit"]').click();
  const card = page.locator("[data-welding-id]").filter({ hasText: description });
  await expect(card).toBeVisible();
  await expect(page.locator(".app-toast").filter({ hasText: "Сохранено на этом устройстве" })).toBeVisible();
  await card.locator("[data-welding-accept]").click();
  await expect(page.locator(".app-toast").filter({ hasText: "Предыдущий шаг ещё не сохранён" })).toBeVisible();
  await expect(card).toHaveClass(/status-new/);
  network.blocked = false;
  await expect.poll(async () => Object.values(await serverJournal(page, app, "welding")).filter(item => item.description === description).length).toBe(1);
  await card.locator("[data-welding-accept]").click();
  await expect.poll(async () => Object.values(await serverJournal(page, app, "welding")).find(item => item.description === description)?.status).toBe("accepted");
  expect(network.forbidden).toBe(0);
});

test("a joined welder can complete work; rejected photo preserves inputs and repeated submit sends one result", async ({ page, app }) => {
  await loginProduction(page, app, app.users.welder);
  const card = page.locator(`[data-welding-id="${team.id}"]`);
  await card.locator("[data-welding-join]").click();
  await expect.poll(async () => (await serverJournal(page, app, "welding"))[team.id].participants.some(person => person.id === app.users.welder.id)).toBe(true);
  await fillCompletion(card, "welding");
  await card.locator('[name="resultPhoto"]').setInputFiles({ name: "unreadable.heic", mimeType: "image/heic", buffer: Buffer.from("Test unreadable image") });
  await card.locator('button[type="submit"]').click();
  await expect(page.locator(".app-toast").filter({ hasText: "Этот формат фото не удалось прочитать" })).toBeVisible();
  await expect(card.locator('button[type="submit"]')).toBeEnabled();
  await expect(card.locator('[name="material"]')).toHaveValue("Сталь для теста");
  await card.locator('[name="resultPhoto"]').setInputFiles([]);
  const writes = [];
  page.on("request", r => { if (new URL(r.url()).pathname === "/api/state" && r.method() === "PUT" && r.postDataJSON()?.weldingJournal?.[team.id]?.status === "awaitingAcceptance") writes.push(r); });
  await card.locator("form").evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect.poll(async () => (await serverJournal(page, app, "welding"))[team.id].status).toBe("awaitingAcceptance");
  expect(writes).toHaveLength(1);
});
