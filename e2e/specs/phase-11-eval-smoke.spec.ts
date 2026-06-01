import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";
import { authHeaders, getAccessToken, getApiBase } from "../fixtures/api-auth";
import { ensureCanadaDealForSales1 } from "../helpers/deals-setup";
import { ensureUnassignedThread } from "../helpers/conversations-setup";
import { testLog } from "../helpers/log";
import {
  openClientFromList,
  selectConversationReassign,
  selectDealStage,
} from "../helpers/ui";

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

test.describe("@phase11 @smoke Core user paths", () => {
  test("EVAL-01 client creates and uses chat", async ({ page }) => {
    const subject = `Eval chat ${Date.now()}`;
    await loginAs(page, "client", "EVAL-01");
    await page.goto("/conversations");
    await expect(page.getByText("Your conversations")).toBeVisible();
    await page.getByRole("button", { name: "New conversation" }).click();
    await page.getByLabel("Subject").fill(subject);
    await page.getByLabel("Message").fill("Smoke path first message.");
    await page.getByRole("button", { name: "Start conversation" }).click();
    await expect(page.getByRole("button", { name: subject })).toBeVisible({ timeout: 15_000 });

    const followUp = `Eval follow-up ${Date.now()}`;
    await page.getByLabel("Reply").fill(followUp);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(followUp)).toBeVisible({ timeout: 10_000 });
    testLog("EVAL-01", "Client chat create + message (CHAT-01/02 path)", "PASS");
  });

  test("EVAL-02 sales assigns unassigned and replies", async ({ page, request }) => {
    const thread = await ensureUnassignedThread(request);
    const reply = `Eval sales reply ${Date.now()}`;

    await loginAs(page, "sales", "EVAL-02");
    await page.goto("/conversations");
    await page.getByRole("button", { name: "Unassigned queue" }).click();
    await page.getByRole("button", { name: thread.subject }).click();
    await page.getByRole("button", { name: "Assign to me" }).click();
    await expect(page.getByText(/Owner:.*Sales/i)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Reply").fill(reply);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(reply)).toBeVisible();
    testLog("EVAL-02", "Sales assign + reply (CHAT-03–05 path)", "PASS");
  });

  test("EVAL-03 manager reassigns conversation", async ({ page }) => {
    await loginAs(page, "manager", "EVAL-03");
    await page.goto("/conversations");
    await page.getByRole("button", { name: "All queue" }).click();
    await page.getByRole("button", { name: "UK foundation year" }).click();

    const sales1Token = await getAccessToken("sales");
    const meRes = await page.request.get(`${apiBase()}/api/me`, {
      headers: { Authorization: `Bearer ${sales1Token}` },
    });
    const sales1 = await meRes.json();

    await selectConversationReassign(page, sales1.fullName);
    await page.getByRole("button", { name: "Reassign" }).click();
    await expect(page.getByText(`open · Owner: ${sales1.fullName}`)).toBeVisible({
      timeout: 10_000,
    });
    testLog("EVAL-03", "Manager reassign (CHAT-06 path)", "PASS");
  });

  test("EVAL-04 sales creates deal and moves stage", async ({ page, request }) => {
    const deal = await ensureCanadaDealForSales1(request, "new_lead");
    const title = `Eval deal ${Date.now()}`;

    await loginAs(page, "sales", "EVAL-04");
    await page.goto("/clients");
    await openClientFromList(page, "Aida Client");
    await page.getByRole("button", { name: "New Deal" }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create deal" }).click();
    await expect(page).toHaveURL(/\/deals\//);
    await expect(page.getByText("Aida Client")).toBeVisible();

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
    testLog("EVAL-04", "Deal create + stage move (DEAL-01/02 path)", "PASS");
  });

  test("EVAL-05 manager dashboard reflects live data", async ({ page, request }) => {
    const headers = await authHeaders("manager");

    await loginAs(page, "manager", "EVAL-05");
    await page.goto("/dashboard");
    await expect(page.getByText("Open Chats", { exact: true })).toBeVisible();
    await expect(page.getByText("Deals by Stage", { exact: true })).toBeVisible();

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
    const deals = (await dealsRes.json()) as { stage: string }[];

    expect(dash.openChats).toBe(conversations.filter((c) => c.status === "open").length);
    expect(dash.activeDeals).toBe(
      deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length,
    );
    for (const stage of DEAL_STAGES) {
      expect(typeof dash.dealsByStage[stage]).toBe("number");
    }
    testLog("EVAL-05", "Dashboard UI + API aggregates (DASH-01/05 path)", "PASS");
  });
});
