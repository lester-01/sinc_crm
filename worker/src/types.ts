import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "client" | "sales" | "manager";

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
};

export type AppVariables = {
  userId: string;
  accessToken: string;
  supabase: SupabaseClient;
  role?: AppRole;
};
