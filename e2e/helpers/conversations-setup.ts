import { expect } from "@playwright/test";
import { getAccessToken, getApiBase } from "../fixtures/api-auth";

const apiBase = () => getApiBase();

export async function tokenForEmail(email: string, password = "demo1234") {
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
  const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(error?.message ?? "no session");
  return data.session.access_token;
}

/** Ensures an unassigned thread exists for sales queue tests. */
export async function ensureUnassignedThread(request: import("@playwright/test").APIRequestContext) {
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
