import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { DemoRole } from "./auth";

const CREDENTIALS: Record<DemoRole, { email: string; password: string }> = {
  manager: { email: "manager1@demo.local", password: "demo1234" },
  sales: { email: "sales1@demo.local", password: "demo1234" },
  client: { email: "client1@demo.local", password: "demo1234" },
};

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadMergedEnv(): Record<string, string> {
  const root = process.cwd();
  const merged = { ...parseEnvFile(join(root, ".env")) };
  const overlayPath = process.env.E2E_ENV_FILE;
  if (overlayPath) {
    Object.assign(merged, parseEnvFile(overlayPath));
  }
  return merged;
}

function getSupabaseAnonConfig(): { url: string; key: string } {
  const env = loadMergedEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in .env");
  }
  return { url, key };
}

export function getApiBase(): string {
  const env = loadMergedEnv();
  return (env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
}

export { getSupabaseAnonConfig, loadMergedEnv };

export async function getAccessToken(role: DemoRole): Promise<string> {
  const { url, key } = getSupabaseAnonConfig();
  const supabase = createClient(url, key);
  const { email, password } = CREDENTIALS[role];
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Sign-in failed for ${role}: ${error?.message ?? "no session"}`);
  }
  return data.session.access_token;
}

export async function authHeaders(role: DemoRole): Promise<Record<string, string>> {
  const token = await getAccessToken(role);
  return { Authorization: `Bearer ${token}` };
}

export async function tokenForEmail(email: string, password = "demo1234"): Promise<string> {
  const { url, key } = getSupabaseAnonConfig();
  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "no session");
  }
  return data.session.access_token;
}
