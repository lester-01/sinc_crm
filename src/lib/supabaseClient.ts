import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase env missing: set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseKey ?? "");
