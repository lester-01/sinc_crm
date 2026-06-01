import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";
import { testLog } from "../helpers/log";

const pagesUrl = (process.env.DEPLOY_PAGES_URL || process.env.PLAYWRIGHT_BASE_URL || "")
  .replace(/\/$/, "");
const apiUrl = (process.env.DEPLOY_API_URL || process.env.VITE_API_BASE_URL || "")
  .replace(/\/$/, "");

const isDeployTarget =
  pagesUrl.length > 0 &&
  !pagesUrl.includes("127.0.0.1") &&
  !pagesUrl.includes("localhost");

test.describe("@deploy Production smoke", () => {
  test.skip(
    !isDeployTarget,
    "Set DEPLOY_PAGES_URL (and DEPLOY_API_URL) to production URLs — see docs/deploy-guide.md",
  );

  test("DEPLOY-01 production API health", async ({ request }) => {
    test.skip(!apiUrl, "Set DEPLOY_API_URL to your Worker URL");
    const res = await request.get(`${apiUrl}/api/health`);
    testLog("DEPLOY-01", `GET /api/health → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true });
    testLog("DEPLOY-01", "API health OK", "PASS");
  });

  test.describe("browser on production Pages", () => {
    test.use({ baseURL: pagesUrl });

    test("DEPLOY-02 production manager login", async ({ page }) => {
      await loginAs(page, "manager", "DEPLOY-02");
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Dashboard", level: 2 })).toBeVisible({
        timeout: 20_000,
      });
      testLog("DEPLOY-02", "Manager dashboard visible on production", "PASS");
    });
  });
});
