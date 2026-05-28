import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth";
import { authHeaders, getAccessToken, getApiBase } from "../fixtures/api-auth";
import { testLog } from "../helpers/log";

const apiBase = () => getApiBase();

/** Ensures an unassigned thread exists (client4) for assign/queue tests. */
async function ensureUnassignedThread(request: import("@playwright/test").APIRequestContext) {
  const salesToken = await getAccessToken("sales");
  const listRes = await request.get(`${apiBase()}/api/conversations?queue=unassigned`, {
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  const existing = (await listRes.json()) as { id: string; subject: string }[];
  if (existing.length > 0) return existing[0];

  const clientToken = await tokenForEmail("client4@demo.local");
  const clientsRes = await request.get(`${apiBase()}/api/clients`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const clients = (await clientsRes.json()) as { id: string }[];
  const clientId = clients[0]?.id;
  if (!clientId) throw new Error("client4 has no CRM row");

  const subject = `Unassigned E2E ${Date.now()}`;
  const createRes = await request.post(`${apiBase()}/api/conversations`, {
    headers: {
      Authorization: `Bearer ${clientToken}`,
      "Content-Type": "application/json",
    },
    data: {
      clientId,
      subject,
      message: "Need help with admission.",
    },
  });
  expect(createRes.status()).toBe(201);
  const thread = await createRes.json();
  return { id: thread.id as string, subject: thread.subject as string };
}

async function tokenForEmail(email: string, password = "demo1234") {
  const { createClient } = await import("@supabase/supabase-js");
  const { readFileSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const envPath = join(process.cwd(), ".env");
  const env: Record<string, string> = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  const supabase = createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_PUBLISHABLE_KEY!);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(error?.message ?? "no session");
  return data.session.access_token;
}

test.describe("@phase8 Conversations & chat", () => {
  test("CHAT-01 client starts conversation", async ({ page }) => {
    const subject = `E2E new chat ${Date.now()}`;
    await loginAs(page, "client", "CHAT-01");
    await page.goto("/conversations");
    await page.getByRole("button", { name: "New conversation" }).click();
    await page.getByLabel("Subject").fill(subject);
    await page.getByLabel("Message").fill("I need help with my application.");
    await page.getByRole("button", { name: "Start conversation" }).click();
    await expect(page.getByRole("button", { name: subject })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("I need help with my application.")).toBeVisible();
    testLog("CHAT-01", "Client started conversation with first message", "PASS");
  });

  test("CHAT-02 client sends message", async ({ page }) => {
    await loginAs(page, "client", "CHAT-02");
    await page.goto("/conversations");
    await page.getByRole("button", { name: /Canada business|Admission|General/ }).first().click();
    const reply = `Follow-up ${Date.now()}`;
    await page.getByLabel("Reply").fill(reply);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(reply)).toBeVisible({ timeout: 10_000 });
    testLog("CHAT-02", "Client message visible in thread", "PASS");
  });

  test("CHAT-03 sales sees unassigned queue", async ({ page, request }) => {
    const thread = await ensureUnassignedThread(request);
    await loginAs(page, "sales", "CHAT-03");
    await page.goto("/conversations");
    await page.getByRole("button", { name: "Unassigned" }).click();
    await expect(page.getByRole("button", { name: thread.subject })).toBeVisible();
    testLog("CHAT-03", "Unassigned thread visible for sales", "PASS");
  });

  test("CHAT-04 sales assigns to self", async ({ page, request }) => {
    const thread = await ensureUnassignedThread(request);
    await loginAs(page, "sales", "CHAT-04");
    await page.goto("/conversations");
    await page.getByRole("button", { name: "Unassigned" }).click();
    await page.getByRole("button", { name: thread.subject }).click();
    await page.getByRole("button", { name: "Assign to me" }).click();
    await expect(page.getByText(/Owner:.*Sales/i)).toBeVisible({ timeout: 10_000 });
    testLog("CHAT-04", "Sales assigned unassigned thread", "PASS");
  });

  test("CHAT-05 sales reply visible to client", async ({ page, request }) => {
    const unique = `Sales reply ${Date.now()}`;
    await loginAs(page, "sales", "CHAT-05");
    await page.goto("/conversations");
    await page.getByRole("button", { name: "Mine" }).click();
    await page.getByRole("button", { name: "Canada business program" }).click();
    await page.getByLabel("Reply").fill(unique);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(unique)).toBeVisible();

    const clientHeaders = await authHeaders("client");
    const listRes = await request.get(`${apiBase()}/api/conversations`, { headers: clientHeaders });
    const threads = (await listRes.json()) as { id: string; subject: string }[];
    const thread = threads.find((t) => t.subject === "Canada business program");
    expect(thread).toBeTruthy();
    const detailRes = await request.get(`${apiBase()}/api/conversations/${thread!.id}`, {
      headers: clientHeaders,
    });
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();
    expect(detail.messages.some((m: { body: string }) => m.body === unique)).toBe(true);
    testLog("CHAT-05", "Client API sees sales reply", "PASS");
  });

  test("API-CONV-02 sales cannot assign others thread", async ({ request }) => {
    const sales1 = await getAccessToken("sales");
    const sales2 = await tokenForEmail("sales2@demo.local");
    const sales2Me = await request.get(`${apiBase()}/api/me`, {
      headers: { Authorization: `Bearer ${sales2}` },
    });
    const sales2Profile = await sales2Me.json();

    const managerHeaders = await authHeaders("manager");
    const listRes = await request.get(`${apiBase()}/api/conversations`, {
      headers: managerHeaders,
    });
    const threads = (await listRes.json()) as {
      id: string;
      subject: string;
      assignedTo: string | null;
    }[];
    let owned = threads.find((t) => t.assignedTo === sales2Profile.id);
    if (!owned) {
      const uk = threads.find((t) => t.subject === "UK foundation year");
      expect(uk).toBeTruthy();
      const assignRes = await request.patch(`${apiBase()}/api/conversations/${uk!.id}/assign`, {
        headers: { ...managerHeaders, "Content-Type": "application/json" },
        data: { assignedTo: sales2Profile.id },
      });
      expect(assignRes.status()).toBe(200);
      owned = uk!;
    }

    const meRes = await request.get(`${apiBase()}/api/me`, {
      headers: { Authorization: `Bearer ${sales1}` },
    });
    const me = await meRes.json();

    const res = await request.patch(`${apiBase()}/api/conversations/${owned!.id}/assign`, {
      headers: {
        Authorization: `Bearer ${sales1}`,
        "Content-Type": "application/json",
      },
      data: { assignedTo: me.id },
    });
    testLog("API-CONV-02", `sales1 assign sales2 thread → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(403);
    testLog("API-CONV-02", "Forbidden", "PASS");
  });

  test("CHAT-06 manager reassign", async ({ page }) => {
    await loginAs(page, "manager", "CHAT-06");
    await page.goto("/conversations");
    await page.getByRole("button", { name: "All" }).click();
    await page.getByRole("button", { name: "UK foundation year" }).click();
    const sales1Token = await getAccessToken("sales");
    const meRes = await page.request.get(`${apiBase()}/api/me`, {
      headers: { Authorization: `Bearer ${sales1Token}` },
    });
    const sales1 = await meRes.json();

    await page.getByLabel("Reassign to").selectOption(sales1.id);
    await page.getByRole("button", { name: "Reassign" }).click();
    await expect(page.getByText(`open · Owner: ${sales1.fullName}`)).toBeVisible({
      timeout: 10_000,
    });
    testLog("CHAT-06", "Manager reassigned thread to sales1", "PASS");
  });

  test("CHAT-07 privacy client1 vs client2 list", async ({ page }) => {
    await loginAs(page, "client", "CHAT-07");
    await page.goto("/conversations");
    await expect(page.getByRole("button", { name: "Canada business program" })).toBeVisible();
    await expect(page.getByRole("button", { name: "UK foundation year" })).toHaveCount(0);
    testLog("CHAT-07", "client2 threads hidden from client1", "PASS");
  });

  test("CHAT-08 API client cannot read other thread", async ({ request }) => {
    const managerHeaders = await authHeaders("manager");
    const listRes = await request.get(`${apiBase()}/api/conversations`, {
      headers: managerHeaders,
    });
    const threads = (await listRes.json()) as { id: string; subject: string }[];
    const other = threads.find((t) => t.subject === "UK foundation year");
    expect(other).toBeTruthy();

    const clientHeaders = await authHeaders("client");
    const res = await request.get(`${apiBase()}/api/conversations/${other!.id}`, {
      headers: clientHeaders,
    });
    testLog("CHAT-08", `client1 GET other thread → ${res.status()}`, "ASSERT");
    expect([403, 404]).toContain(res.status());
    testLog("CHAT-08", "Privacy enforced", "PASS");
  });

  test("CHAT-09 API client reads own messages", async ({ request }) => {
    const headers = await authHeaders("client");
    const listRes = await request.get(`${apiBase()}/api/conversations`, { headers });
    const threads = (await listRes.json()) as { id: string }[];
    expect(threads.length).toBeGreaterThan(0);
    const res = await request.get(`${apiBase()}/api/conversations/${threads[0].id}`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.messages?.length).toBeGreaterThan(0);
    testLog("CHAT-09", "Own thread messages returned", "PASS");
  });

  test("API-CONV-01 sales assign unassigned", async ({ request }) => {
    const unassigned = await ensureUnassignedThread(request);
    const salesToken = await getAccessToken("sales");
    const meRes = await request.get(`${apiBase()}/api/me`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const me = await meRes.json();

    const res = await request.patch(`${apiBase()}/api/conversations/${unassigned.id}/assign`, {
      headers: {
        Authorization: `Bearer ${salesToken}`,
        "Content-Type": "application/json",
      },
      data: { assignedTo: me.id },
    });
    testLog("API-CONV-01", `PATCH assign → ${res.status()}`, "ASSERT");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.assignedTo).toBe(me.id);
    testLog("API-CONV-01", "Owner set", "PASS");
  });
});
