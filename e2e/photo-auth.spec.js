const { test, expect } = require("./fixtures");

test("photo disk cache still requires a current server session after logout", async ({ page, context, app }) => {
  const headers = { "x-client-protocol": "1" };
  const login = await page.request.post(`${app.baseURL}/api/auth/login`, {
    headers,
    data: { identifier: app.users.editor.employeeId, password: app.users.editor.password }
  });
  expect(login.status()).toBe(200);
  const session = (await context.cookies(app.baseURL)).find(cookie => cookie.name === "ppr_session");
  expect(session).toBeTruthy();
  const originalCookie = `${session.name}=${session.value}`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=", "base64");
  const upload = await page.request.post(`${app.baseURL}/api/photos`, {
    headers,
    data: { data: `data:image/png;base64,${png.toString("base64")}` }
  });
  expect(upload.status()).toBe(200);
  const photoUrl = (await upload.json()).url;
  expect(photoUrl).toMatch(/^\/api\/photos\/[a-f0-9]{40}\.png$/);

  // APIRequestContext performs real HTTP reads, without the browser image cache.
  const responses = await Promise.all(Array.from({ length: 23 }, () => page.request.get(`${app.baseURL}${photoUrl}`)));
  for (const response of responses) {
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect(await response.body()).toEqual(png);
  }
  const logout = await page.request.post(`${app.baseURL}/api/auth/logout`, { headers, data: {} });
  expect(logout.status()).toBe(200);
  // Present the revoked token explicitly: denial must come from the fresh
  // server-side session state, not just the cleared browser cookie.
  const revoked = await page.request.get(`${app.baseURL}${photoUrl}`, { headers: { cookie: originalCookie } });
  expect(revoked.status()).toBe(401);
  expect((await revoked.json()).error).toBe("authentication_required");
});
