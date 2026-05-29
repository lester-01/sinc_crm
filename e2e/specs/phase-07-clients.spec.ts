import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";
import { authHeaders, getAccessToken, getApiBase } from "../fixtures/api-auth";
import { testLog } from "../helpers/log";

const apiBase = () => getApiBase();

test.describe("@phase7 Clients", () => {
  test("CLI-01 manager client list", async ({ page }) => {
    await loginAs(page, "manager", "CLI-01");
    await page.goto("/clients");
    await expect(page.getByRole("heading", { level: 2, name: "Clients" })).toBeVisible();
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(5);
    await expect(page.getByRole("link", { name: "Aida Client" })).toBeVisible();
    testLog("CLI-01", `Manager sees seeded clients (${count} rows)`, "PASS");
  });

  test("CLI-02 sales creates client", async ({ page }) => {
    const email = `e2e-new-${Date.now()}@example.com`;
    const fullName = `E2E New Client ${Date.now()}`;
    await loginAs(page, "sales", "CLI-02");
    await page.goto("/clients");
    await page.getByRole("button", { name: "New Client" }).click();
    await page.getByLabel("Full name").fill(fullName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Target country").fill("Canada");
    await page.getByRole("button", { name: "Create client" }).click();
    await expect(page.getByRole("row").filter({ hasText: email })).toBeVisible({
      timeout: 15_000,
    });
    testLog("CLI-02", `Created client ${email}`, "PASS");
  });

  test("CLI-03 client own profile", async ({ page }) => {
    await loginAs(page, "client", "CLI-03");
    await page.goto("/clients");
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(1);
    await page.getByRole("link", { name: "Aida Client" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Aida Client" })).toBeVisible();
    await expect(page.getByText("client1@demo.local")).toBeVisible();
    testLog("CLI-03", "Client sees own profile only", "PASS");
  });

  test("CLI-04 client cannot open other client", async ({ page, request }) => {
    const managerHeaders = await authHeaders("manager");
    const listRes = await request.get(`${apiBase()}/api/clients`, { headers: managerHeaders });
    expect(listRes.status()).toBe(200);
    const clients = (await listRes.json()) as { id: string; email: string }[];
    const other = clients.find((c) => c.email === "client2@demo.local");
    expect(other).toBeTruthy();

    await loginAs(page, "client", "CLI-04");
    await page.goto(`/clients/${other!.id}`);
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    testLog("CLI-04", "Forbidden UI for other client", "PASS");
  });

  test("API-CLI-01 client GET /api/clients scoped", async ({ request }) => {
    const headers = await authHeaders("client");
    const res = await request.get(`${apiBase()}/api/clients`, { headers });
    testLog("API-CLI-01", `GET /api/clients as client → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].email).toBe("client1@demo.local");
    testLog("API-CLI-01", "Single own client returned", "PASS");
  });

  test("API-CLI-02 client GET other client forbidden", async ({ request }) => {
    const managerToken = await getAccessToken("manager");
    const listRes = await request.get(`${apiBase()}/api/clients`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const clients = (await listRes.json()) as { id: string; email: string }[];
    const other = clients.find((c) => c.email === "client2@demo.local");
    expect(other).toBeTruthy();

    const clientHeaders = await authHeaders("client");
    const res = await request.get(`${apiBase()}/api/clients/${other!.id}`, {
      headers: clientHeaders,
    });
    testLog("API-CLI-02", `GET other client as client1 → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(403);
    testLog("API-CLI-02", "403 Forbidden", "PASS");
  });

  test("API-CLI-03 sales POST /api/clients", async ({ request }) => {
    const headers = {
      ...(await authHeaders("sales")),
      "Content-Type": "application/json",
    };
    const email = `api-sales-${Date.now()}@example.com`;
    const res = await request.post(`${apiBase()}/api/clients`, {
      headers,
      data: {
        fullName: "API Sales Client",
        email,
        country: "Kazakhstan",
        targetCountry: "UK",
      },
    });
    testLog("API-CLI-03", `POST /api/clients → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.email).toBe(email);
    testLog("API-CLI-03", "201 created", "PASS");
  });

  test("API-CLI-04 client POST /api/clients forbidden", async ({ request }) => {
    const headers = {
      ...(await authHeaders("client")),
      "Content-Type": "application/json",
    };
    const res = await request.post(`${apiBase()}/api/clients`, {
      headers,
      data: {
        fullName: "Blocked",
        email: `blocked-${Date.now()}@example.com`,
      },
    });
    testLog("API-CLI-04", `POST as client → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(403);
    testLog("API-CLI-04", "403 Forbidden", "PASS");
  });
});
