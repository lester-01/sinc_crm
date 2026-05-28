import { test as base, expect } from "@playwright/test";
import { testLog } from "../helpers/log";
import type { Page } from "@playwright/test";

export type DemoRole = "manager" | "sales" | "client";

const CREDENTIALS: Record<DemoRole, { email: string; password: string }> = {
  manager: { email: "manager1@demo.local", password: "demo1234" },
  sales: { email: "sales1@demo.local", password: "demo1234" },
  client: { email: "client1@demo.local", password: "demo1234" },
};

export const test = base;

export async function loginAs(page: Page, role: DemoRole, testId: string) {
  const { email, password } = CREDENTIALS[role];
  testLog(testId, `Login as ${role} (${email})`, "START");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/me") && r.request().method() === "GET",
      { timeout: 20_000 },
    ),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  testLog(testId, `GET /api/me → ${res.status()}`, "ASSERT");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.role).toBe(role);
  testLog(testId, `role is ${role}`, "PASS");
}

export async function loginExpectFailure(page: Page, testId: string) {
  testLog(testId, "Invalid login attempt", "START");
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@demo.local");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  testLog(testId, "Error shown, stayed on login", "PASS");
}

export { expect };
