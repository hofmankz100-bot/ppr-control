const QRCode = require("qrcode");
const { test, expect, login } = require("./fixtures");

test("camera denial still allows a real QR photo to record an operator walk", async ({ page, context, app }) => {
  // The camera shortcut is intentionally absent on wide screens with a mouse.
  // Also exercise the actual compact scanner in the desktop browser engine.
  if (page.viewportSize().width > 760) await page.setViewportSize({ width: 720, height: 1000 });
  // Emulate the browser permission result; the scanner, image upload, decoder,
  // result dialog and persistence all remain the production implementation.
  await context.addInitScript(() => {
    // WebKit may run initialization in a document without mediaDevices yet.
    // Supply only the camera permission API when the browser omits the object.
    const mediaDevices = navigator.mediaDevices || {};
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: mediaDevices });
    }
    Object.defineProperty(mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("Camera permission denied for this test", "NotAllowedError");
      }
    });
  });
  await login(page, app);
  await page.locator("#qrWalkButton").click();

  const scanner = page.locator(".qr-scan-overlay");
  const retry = scanner.locator("[data-qr-retry]");
  const photo = scanner.locator("[data-qr-photo]");
  await expect(scanner).toBeVisible();
  await expect(retry).toBeVisible();
  await expect(scanner.locator(".qr-scan-message")).toContainText("Проверьте разрешение камеры");
  await expect(photo).toBeEnabled();

  await retry.click();
  await expect(retry).toBeEnabled();
  await expect(scanner.locator(".qr-scan-message")).toContainText("Разрешите камеру");
  await expect(photo).toBeVisible();

  const qrImage = await QRCode.toBuffer(app.qrPayload, {
    type: "png",
    width: 600,
    margin: 4,
    errorCorrectionLevel: "M"
  });
  const choosingPhoto = page.waitForEvent("filechooser");
  await photo.click();
  const chooser = await choosingPhoto;
  await chooser.setFiles({ name: "test-node-qr.png", mimeType: "image/png", buffer: qrImage });

  const resultDialog = page.getByRole("dialog", { name: "Результат обхода QR", exact: true });
  await expect(scanner).toHaveCount(0);
  await expect(resultDialog).toBeVisible();
  await expect(resultDialog.getByRole("heading", { name: "Тестовый пресс", exact: true })).toBeVisible();
  await expect(resultDialog.locator(".qr-result-node")).toHaveText(app.nodeName);
  await expect(resultDialog).not.toContainText("Чужой узел");

  const savingMark = page.waitForResponse(response =>
    new URL(response.url()).pathname === "/api/qr-walk/mark"
      && response.request().method() === "POST"
  );
  await resultDialog.locator("[data-qr-good]").click();
  const markResponse = await savingMark;
  expect(markResponse.ok()).toBeTruthy();
  const saved = await markResponse.json();
  expect(saved).toMatchObject({ ok: true, alreadyDone: false });
  expect(saved.recordKey).toMatch(new RegExp(`^${app.equipmentId}:0:\\d{4}-\\d{2}-\\d{2}$`));
  await expect(resultDialog).toHaveCount(0);

  // Successful scans return to the scanner for the next node. Finish using its
  // visible cancel control, so no camera loop is left running during assertions.
  await expect(scanner).toBeVisible();
  await scanner.locator("[data-qr-cancel]").click();
  await expect(scanner).toHaveCount(0);
  await expect(page.locator("#qrWalkButton")).toBeEnabled();

  const persistedResponse = await page.request.get(`${app.baseURL}/api/state`, {
    headers: { "x-client-protocol": "1" }
  });
  expect(persistedResponse.ok()).toBeTruthy();
  const persisted = await persistedResponse.json();
  const marks = persisted.checks[saved.recordKey].to.walkGroups;
  expect(Object.values(marks.operational)).toHaveLength(1);
  expect(Object.values(marks.operational)[0]).toMatchObject({
    done: true,
    byRole: "operator",
    byName: app.users.operator.name,
    group: "operational",
    qrKind: "lower"
  });
  expect(Object.values(marks.technical || {})).toHaveLength(0);
});
