import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";
import { authHeaders, getAccessToken, getApiBase, tokenForEmail } from "../fixtures/api-auth";
import { ensureCanadaDealForSales1 } from "../helpers/deals-setup";
import { testLog } from "../helpers/log";
import {
  openClientFromList,
  selectDealOwnerReassign,
  selectDealStage,
  selectPipelineDealStage,
} from "../helpers/ui";

const apiBase = () => getApiBase();

const STAGE_LABELS = [
  "new lead",
  "contacted",
  "consultation booked",
  "documents requested",
  "application started",
  "submitted",
  "won",
  "lost",
];

test.describe("@phase9 Deals & pipeline", () => {
  test("DEAL-01 sales creates deal for client", async ({ page }) => {
    const title = `E2E Deal ${Date.now()}`;
    await loginAs(page, "sales", "DEAL-01");
    await page.goto("/clients");
    await openClientFromList(page, "Aida Client");
    await page.getByRole("button", { name: "New Deal" }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create deal" }).click();
    await expect(page).toHaveURL(/\/deals\//);
    await page.goto("/pipeline");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
    testLog("DEAL-01", "Deal on pipeline after create", "PASS");
  });

  test("DEAL-02 sales moves own deal stage", async ({ page, request }) => {
    const deal = await ensureCanadaDealForSales1(request, "new_lead");

    await loginAs(page, "sales", "DEAL-02");
    await page.goto(`/deals/${deal.id}`);
    const [patchRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/deals/${deal.id}/stage`) && r.request().method() === "PATCH",
        { timeout: 15_000 },
      ),
      selectDealStage(page, "contacted"),
    ]);
    expect(patchRes.status()).toBe(200);
    await expect(page.getByText(/new lead → contacted/i).first()).toBeVisible({ timeout: 10_000 });
    testLog("DEAL-02", "Stage history shows transition", "PASS");
  });

  test("DEAL-03 sales blocked on other deal", async ({ page }) => {
    await loginAs(page, "sales", "DEAL-03");
    await page.goto("/pipeline");
    const ukCard = page
      .locator("div.rounded-md")
      .filter({ has: page.getByRole("link", { name: "UK application" }) });
    await expect(
      ukCard.getByRole("combobox", { name: /Move UK application to stage/i }),
    ).toHaveCount(0);
    testLog("DEAL-03", "No stage select on another rep's deal", "PASS");
  });

  test("DEAL-04 manager reassigns deal owner", async ({ page, request }) => {
    await loginAs(page, "manager", "DEAL-04");
    const managerHeaders = await authHeaders("manager");
    const listRes = await request.get(`${apiBase()}/api/deals`, { headers: managerHeaders });
    const deals = (await listRes.json()) as { id: string; title: string }[];
    const deal = deals.find((d) => d.title === "Germany application");
    expect(deal).toBeTruthy();

    await page.goto(`/deals/${deal!.id}`);
    const sales2Token = await tokenForEmail("sales2@demo.local");
    const meRes = await request.get(`${apiBase()}/api/me`, {
      headers: { Authorization: `Bearer ${sales2Token}` },
    });
    const sales2 = await meRes.json();

    await selectDealOwnerReassign(page, sales2.fullName);
    await page.getByRole("button", { name: "Reassign owner" }).click();
    await expect(page.getByText(`Owner: ${sales2.fullName}`)).toBeVisible();
    testLog("DEAL-04", "Owner updated on deal detail", "PASS");
  });

  test("PIPE-02 stage via select moves card", async ({ page, request }) => {
    const deal = await ensureCanadaDealForSales1(request, "contacted");

    await loginAs(page, "sales", "PIPE-02");
    await page.goto("/pipeline");
    const [patchRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/deals/${deal.id}/stage`) && r.request().method() === "PATCH",
        { timeout: 15_000 },
      ),
      selectPipelineDealStage(page, "Canada application", "consultation booked"),
    ]);
    expect(patchRes.status()).toBe(200);
    const patched = (await patchRes.json()) as { stage: string };
    expect(patched.stage).toBe("consultation_booked");
    testLog("PIPE-02", "Stage updated via pipeline select", "PASS");
  });

  test("DEAL-05 add deal note", async ({ page, request }) => {
    const noteText = `Note ${Date.now()}`;
    const deal = await ensureCanadaDealForSales1(request, "new_lead");

    await loginAs(page, "sales", "DEAL-05");
    await page.goto(`/deals/${deal.id}`);
    await page.getByLabel("Add note").fill(noteText);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(noteText)).toBeVisible();
    testLog("DEAL-05", "Note visible on deal detail", "PASS");
  });

  test("DEAL-06 stage change creates history", async ({ request }) => {
    const token = await getAccessToken("manager");
    const listRes = await request.get(`${apiBase()}/api/deals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const deals = (await listRes.json()) as { id: string; title: string }[];
    const deal = deals.find((d) => d.title === "Germany application");
    expect(deal).toBeTruthy();

    await request.patch(`${apiBase()}/api/deals/${deal!.id}/stage`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { stage: "documents_requested" },
    });

    const detailRes = await request.get(`${apiBase()}/api/deals/${deal!.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = await detailRes.json();
    const hasEntry = detail.stageHistory?.some(
      (h: { toStage: string }) => h.toStage === "documents_requested",
    );
    expect(hasEntry).toBe(true);
    testLog("DEAL-06", "History includes new stage", "PASS");
  });

  test("DEAL-07 lost without reason returns 400", async ({ request }) => {
    const token = await getAccessToken("manager");
    const listRes = await request.get(`${apiBase()}/api/deals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const deals = (await listRes.json()) as { id: string }[];
    const res = await request.patch(`${apiBase()}/api/deals/${deals[0].id}/stage`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { stage: "lost" },
    });
    testLog("DEAL-07", `PATCH lost without reason → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(400);
    testLog("DEAL-07", "Validation error", "PASS");
  });

  test("PIPE-01 pipeline shows stages", async ({ page }) => {
    await loginAs(page, "manager", "PIPE-01");
    await page.goto("/pipeline");
    const columnHeaders = page.locator("div.border-t-4 > div.shrink-0.border-b");
    await expect(columnHeaders).toHaveCount(STAGE_LABELS.length, { timeout: 15_000 });
    for (let i = 0; i < STAGE_LABELS.length; i++) {
      await expect(columnHeaders.nth(i)).toContainText(STAGE_LABELS[i]!);
    }
    testLog("PIPE-01", "All 8 stage columns visible", "PASS");
  });

  test("API-DEAL-01 client cannot POST deals", async ({ request }) => {
    const headers = {
      ...(await authHeaders("client")),
      "Content-Type": "application/json",
    };
    const clientsRes = await request.get(`${apiBase()}/api/clients`, { headers });
    const clients = (await clientsRes.json()) as { id: string }[];
    const res = await request.post(`${apiBase()}/api/deals`, {
      headers,
      data: { clientId: clients[0].id, title: "Blocked" },
    });
    testLog("API-DEAL-01", `POST as client → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(403);
    testLog("API-DEAL-01", "Forbidden", "PASS");
  });

  test("API-DEAL-02 manager PATCH any deal stage", async ({ request }) => {
    const token = await getAccessToken("manager");
    const listRes = await request.get(`${apiBase()}/api/deals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const deals = (await listRes.json()) as { id: string; stage: string }[];
    const deal = deals.find((d) => d.stage === "submitted") ?? deals[0];
    const res = await request.patch(`${apiBase()}/api/deals/${deal.id}/stage`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { stage: "won" },
    });
    testLog("API-DEAL-02", `Manager PATCH stage → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(200);
    testLog("API-DEAL-02", "OK", "PASS");
  });

  test("API-DEAL-03 manager POST /api/deals forbidden", async ({ request }) => {
    const managerHeaders = {
      ...(await authHeaders("manager")),
      "Content-Type": "application/json",
    };
    const clientsRes = await request.get(`${apiBase()}/api/clients`, { headers: managerHeaders });
    const clients = (await clientsRes.json()) as { id: string }[];
    const res = await request.post(`${apiBase()}/api/deals`, {
      headers: managerHeaders,
      data: { clientId: clients[0].id, title: "Blocked manager deal" },
    });
    testLog("API-DEAL-03", `POST as manager → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(403);
    testLog("API-DEAL-03", "Forbidden", "PASS");
  });

  test("API-DEAL-04 manager POST deal note forbidden", async ({ request }) => {
    const managerHeaders = {
      ...(await authHeaders("manager")),
      "Content-Type": "application/json",
    };
    const listRes = await request.get(`${apiBase()}/api/deals`, { headers: managerHeaders });
    const deals = (await listRes.json()) as { id: string }[];
    const res = await request.post(`${apiBase()}/api/deals/${deals[0].id}/notes`, {
      headers: managerHeaders,
      data: { body: "Manager note blocked" },
    });
    testLog("API-DEAL-04", `POST note as manager → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(403);
    testLog("API-DEAL-04", "Forbidden", "PASS");
  });

  test("API-DEAL-05 manager PATCH owner to self forbidden", async ({ request }) => {
    const managerHeaders = {
      ...(await authHeaders("manager")),
      "Content-Type": "application/json",
    };
    const meRes = await request.get(`${apiBase()}/api/me`, { headers: managerHeaders });
    const manager = (await meRes.json()) as { id: string };
    const listRes = await request.get(`${apiBase()}/api/deals`, { headers: managerHeaders });
    const deals = (await listRes.json()) as { id: string }[];
    const res = await request.patch(`${apiBase()}/api/deals/${deals[0].id}/owner`, {
      headers: managerHeaders,
      data: { ownerId: manager.id },
    });
    testLog("API-DEAL-05", `PATCH owner to manager → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(403);
    testLog("API-DEAL-05", "Forbidden", "PASS");
  });
});
