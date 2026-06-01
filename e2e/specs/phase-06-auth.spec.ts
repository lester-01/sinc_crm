import { test, expect } from "@playwright/test";
import { loginAs, loginExpectFailure } from "../fixtures/auth";
import { getApiBase } from "../fixtures/api-auth";
import { testLog } from "../helpers/log";

test.describe("@phase6 Auth & navigation", () => {
  test("AUTH-01 manager login", async ({ page }) => {
    await loginAs(page, "manager", "AUTH-01");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });

  test("AUTH-02 sales login hides dashboard nav", async ({ page }) => {
    await loginAs(page, "sales", "AUTH-02");
    await expect(page).toHaveURL(/\/clients/);
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Clients" })).toBeVisible();
  });

  test("AUTH-03 client login reduced nav", async ({ page }) => {
    await loginAs(page, "client", "AUTH-03");
    await expect(page).toHaveURL(/\/conversations/);
    await expect(page.getByRole("link", { name: "Pipeline" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Conversations" })).toBeVisible();
  });

  test("AUTH-04 invalid credentials", async ({ page }) => {
    await loginExpectFailure(page, "AUTH-04");
  });

  test("AUTH-05 logout", async ({ page }) => {
    await loginAs(page, "manager", "AUTH-05");
    await page.getByRole("button", { name: /Morgan|Manager|Sales|Client|Account/i }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    testLog("AUTH-05", "Session cleared", "PASS");
  });

  test("AUTH-06 API no token returns 401", async ({ request }) => {
    const apiBase = getApiBase();
    const res = await request.get(`${apiBase}/api/clients`);
    testLog("AUTH-06", `GET /api/clients without token → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(401);
  });

  test("AUTH-07 API me no token returns 401", async ({ request }) => {
    const apiBase = getApiBase();
    const res = await request.get(`${apiBase}/api/me`);
    testLog("AUTH-07", `GET /api/me without token → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(401);
  });

  test("NAV-01 manager nav links", async ({ page }) => {
    await loginAs(page, "manager", "NAV-01");
    for (const label of ["Dashboard", "Clients", "Conversations", "Pipeline"]) {
      await page.getByRole("link", { name: label }).click();
      await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
    }
    testLog("NAV-01", "All manager nav links work", "PASS");
  });

  test("NAV-02 client nav scope", async ({ page }) => {
    await loginAs(page, "client", "NAV-02");
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pipeline" })).toHaveCount(0);
    testLog("NAV-02", "Client nav restricted", "PASS");
  });

  test("NAV-03 unauthenticated redirect", async ({ page }) => {
    testLog("NAV-03", "Visit /clients without session", "START");
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/login/);
    testLog("NAV-03", "Redirected to login", "PASS");
  });
});
