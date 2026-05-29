import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";
import { authHeaders, getApiBase } from "../fixtures/api-auth";
import { testLog } from "../helpers/log";

const apiBase = () => getApiBase();

const DEAL_STAGES = [
  "new_lead",
  "contacted",
  "consultation_booked",
  "documents_requested",
  "application_started",
  "submitted",
  "won",
  "lost",
] as const;

function countDealsByStage(deals: { stage: string }[]) {
  const map: Record<string, number> = {};
  for (const s of DEAL_STAGES) map[s] = 0;
  for (const d of deals) map[d.stage] = (map[d.stage] ?? 0) + 1;
  return map;
}

function countDealsByOwner(deals: { ownerId: string | null; ownerName: string | null }[]) {
  const map = new Map<string, { ownerId: string | null; ownerName: string; count: number }>();
  for (const d of deals) {
    const key = d.ownerId ?? "unassigned";
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else
      map.set(key, {
        ownerId: d.ownerId,
        ownerName: d.ownerName ?? "Unassigned",
        count: 1,
      });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

test.describe("@phase10 Dashboard", () => {
  test("DASH-01 manager dashboard loads", async ({ page }) => {
    await loginAs(page, "manager", "DASH-01");
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 2 })).toBeVisible();
    await expect(page.getByText("Open Chats", { exact: true })).toBeVisible();
    await expect(page.getByText("Unassigned", { exact: true })).toBeVisible();
    await expect(page.getByText("Active Deals", { exact: true })).toBeVisible();
    await expect(page.getByText("Won Deals", { exact: true })).toBeVisible();
    await expect(page.getByText("Deals by Stage", { exact: true })).toBeVisible();
    await expect(page.getByText("Deals by Owner", { exact: true })).toBeVisible();
    testLog("DASH-01", "Metric cards and breakdown sections visible", "PASS");
  });

  test("DASH-02 sales no dashboard", async ({ page }) => {
    await loginAs(page, "sales", "DASH-02");
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/clients/);
    testLog("DASH-02", "Sales redirected away from dashboard", "PASS");
  });

  test("DASH-03 manager GET dashboard returns aggregates", async ({ request }) => {
    const headers = await authHeaders("manager");
    const res = await request.get(`${apiBase()}/api/dashboard`, { headers });
    testLog("DASH-03", `GET /api/dashboard → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.openChats).toBe("number");
    expect(typeof body.unassignedConversations).toBe("number");
    expect(typeof body.activeDeals).toBe("number");
    expect(typeof body.wonDeals).toBe("number");
    expect(body.dealsByStage).toBeTruthy();
    expect(Array.isArray(body.dealsByOwner)).toBe(true);
    testLog("DASH-03", "Numeric aggregate fields present", "PASS");
  });

  test("DASH-04 sales GET dashboard forbidden", async ({ request }) => {
    const headers = await authHeaders("sales");
    const res = await request.get(`${apiBase()}/api/dashboard`, { headers });
    testLog("DASH-04", `GET /api/dashboard as sales → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(403);
    testLog("DASH-04", "Forbidden", "PASS");
  });

  test("DASH-05 dashboard counts match list APIs", async ({ request }) => {
    const headers = await authHeaders("manager");

    const [dashRes, convRes, dealsRes] = await Promise.all([
      request.get(`${apiBase()}/api/dashboard`, { headers }),
      request.get(`${apiBase()}/api/conversations`, { headers }),
      request.get(`${apiBase()}/api/deals`, { headers }),
    ]);
    expect(dashRes.status()).toBe(200);
    const dash = await dashRes.json();
    const conversations = (await convRes.json()) as {
      status: string;
      assignedTo: string | null;
    }[];
    const deals = (await dealsRes.json()) as {
      stage: string;
      ownerId: string | null;
      ownerName: string | null;
    }[];

    const openChats = conversations.filter((c) => c.status === "open").length;
    const unassigned = conversations.filter((c) => c.assignedTo === null).length;
    const activeDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length;
    const wonDeals = deals.filter((d) => d.stage === "won").length;

    expect(dash.openChats).toBe(openChats);
    expect(dash.unassignedConversations).toBe(unassigned);
    expect(dash.activeDeals).toBe(activeDeals);
    expect(dash.wonDeals).toBe(wonDeals);

    const byStage = countDealsByStage(deals);
    for (const stage of DEAL_STAGES) {
      expect(dash.dealsByStage[stage]).toBe(byStage[stage]);
    }

    const byOwner = countDealsByOwner(deals);
    expect(dash.dealsByOwner).toHaveLength(byOwner.length);
    for (let i = 0; i < byOwner.length; i++) {
      expect(dash.dealsByOwner[i].count).toBe(byOwner[i].count);
      expect(dash.dealsByOwner[i].ownerName).toBe(byOwner[i].ownerName);
    }

    testLog("DASH-05", "Dashboard aggregates match conversation/deal lists", "PASS");
  });
});
