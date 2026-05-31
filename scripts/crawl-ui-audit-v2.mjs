#!/usr/bin/env node
/**
 * Full UI crawl v2: P01–P11, manager/sales/client, desktop + mobile screenshots.
 * Writes to docs/reports/ui-ux-audit-screenshots/ and crawl-metrics.json
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const OUT = join(process.cwd(), "docs/reports/ui-ux-audit-screenshots");
const CLIENT_ID = "c99ad53e-b218-48fc-b1c3-7449a2580666";
const DEAL_ID = "3fe6f24b-bce0-48f8-a686-f8ee0198e3fb";

const CREDENTIALS = {
  manager: { email: "manager1@demo.local", password: "demo1234" },
  sales: { email: "sales1@demo.local", password: "demo1234" },
  client: { email: "client1@demo.local", password: "demo1234" },
};

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
};

function homePathForRole(role) {
  if (role === "client") return "/conversations";
  if (role === "sales") return "/clients";
  return "/dashboard";
}

async function login(page, role) {
  const { email, password } = CREDENTIALS[role];
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.clear());
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const home = homePathForRole(role);
  await Promise.all([
    page.waitForURL((u) => u.pathname === home || u.pathname.startsWith(home + "/"), {
      timeout: 30_000,
    }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
}

async function metrics(page) {
  return page.evaluate(() => ({
    path: location.pathname + location.search,
    scrollH: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    overflow: document.documentElement.scrollHeight > window.innerHeight + 20,
    disabledSearch: !!document.querySelector('input[type="search"][disabled]'),
    nativeSelects: document.querySelectorAll("main select").length,
    threadButtons: document.querySelectorAll("main button").length,
  }));
}

async function shot(page, name) {
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function crawlPage(page, id, role, requestedPath, { wait = 1500 } = {}) {
  await page.goto(`${BASE}${requestedPath}`);
  await page.waitForTimeout(wait);
  const rows = [];
  for (const [vp, size] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(size);
    await page.waitForTimeout(400);
    const m = await metrics(page);
    const fname = `${id}-${role}-${vp}`;
    await shot(page, fname);
    rows.push({
      id,
      role,
      viewport: vp,
      requestedPath,
      screenshot: `${fname}.png`,
      ...m,
    });
  }
  return rows;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const all = [];

  const browser = await chromium.launch({ headless: true });

  // P01 unauth
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(800);
    for (const [vp, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      const m = await metrics(page);
      await shot(page, `P01-unauth-${vp}`);
      all.push({ id: "P01", role: "unauth", viewport: vp, path: "/login", screenshot: `P01-unauth-${vp}.png`, ...m });
    }
    await page.close();
    await ctx.close();
  }

  const rolePages = {
    manager: [
      ["P02", "/"],
      ["P03", "/dashboard"],
      ["P04", "/clients"],
      ["P05", `/clients/${CLIENT_ID}`],
      ["P06", "/conversations"],
      ["P07", "/conversations?thread=51880ffc-4449-4e3d-9cbe-6e4458dbb0ba"],
      ["P08", "/pipeline"],
      ["P09", `/deals/${DEAL_ID}`],
      ["P11", "/this-route-does-not-exist"],
    ],
    sales: [
      ["P02", "/"],
      ["P03", "/dashboard"],
      ["P04", "/clients"],
      ["P05", `/clients/${CLIENT_ID}`],
      ["P06", "/conversations"],
      ["P07", "/conversations?thread=51880ffc-4449-4e3d-9cbe-6e4458dbb0ba"],
      ["P08", "/pipeline"],
      ["P09", `/deals/${DEAL_ID}`],
      ["P11", "/this-route-does-not-exist"],
    ],
    client: [
      ["P02", "/"],
      ["P03", "/dashboard"],
      ["P04", "/clients"],
      ["P05", `/clients/${CLIENT_ID}`],
      ["P06", "/conversations"],
      ["P07", "/conversations?thread=51880ffc-4449-4e3d-9cbe-6e4458dbb0ba"],
      ["P08", "/pipeline"],
      ["P11", "/this-route-does-not-exist"],
    ],
  };

  for (const role of ["manager", "sales", "client"]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, role);
    for (const [id, path] of rolePages[role]) {
      all.push(...(await crawlPage(page, id, role, path)));
    }
    // P10 shell: profile menu open (desktop)
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${BASE}/conversations`);
    await page.waitForTimeout(1000);
    const userBtn = page.getByRole("button").filter({ hasText: /Manager|Sales|Client/ }).first();
    if (await userBtn.isVisible().catch(() => false)) {
      await userBtn.click();
      await page.waitForTimeout(300);
      await shot(page, `P10-shell-${role}-menu-desktop`);
      all.push({
        id: "P10",
        role,
        viewport: "desktop-menu",
        path: "/conversations",
        screenshot: `P10-shell-${role}-menu-desktop.png`,
        note: "profile dropdown open",
      });
    }
    if (role === "client") {
      await page.setViewportSize(VIEWPORTS.mobile);
      await userBtn.click().catch(() => {});
      await page.waitForTimeout(300);
      await shot(page, `I13-client-profile-menu-mobile`);
    }
    if (role === "manager") {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE}/conversations`);
      await page.waitForTimeout(800);
      await page.getByRole("button", { name: "Mine", exact: true }).click();
      await page.waitForTimeout(500);
      await shot(page, `P06-conversations-manager-mine-tab-desktop`);
      await page.getByRole("button", { name: "Unassigned", exact: true }).click();
      await page.waitForTimeout(500);
      await shot(page, `P06-conversations-manager-unassigned-tab-desktop`);
    }
    if (role === "manager" || role === "sales") {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE}/clients`);
      await page.waitForTimeout(800);
      await page.getByRole("button", { name: "New Client" }).click();
      await page.waitForTimeout(400);
      await shot(page, `P04-clients-${role}-new-client-dialog-desktop`);
      await page.keyboard.press("Escape");
    }
    await page.close();
    await ctx.close();
  }

  await browser.close();

  const outJson = join(process.cwd(), "docs/reports/crawl-metrics-2026-05-29.json");
  await writeFile(outJson, JSON.stringify(all, null, 2));
  console.log(`Wrote ${all.length} metric rows and screenshots to ${OUT}`);
  console.log(`Metrics: ${outJson}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
