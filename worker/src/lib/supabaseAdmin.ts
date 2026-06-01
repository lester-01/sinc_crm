import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types";

export function getSupabaseAdmin(env: Env): SupabaseClient {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url || !key || url.includes("your-project") || key.includes("your-")) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
