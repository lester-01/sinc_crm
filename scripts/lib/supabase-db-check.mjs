import { createClient } from "@supabase/supabase-js";

export function createAdminClient(url, secretKey) {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True if public schema (profiles table) already exists. */
export async function schemaExists(admin) {
  const { error } = await admin.from("profiles").select("id").limit(1);
  if (!error) return true;
  const msg = `${error.message ?? ""} ${error.code ?? ""}`.toLowerCase();
  if (
    msg.includes("pgrst205") ||
    msg.includes("does not exist") ||
    msg.includes("42p01") ||
    error.code === "PGRST205"
  ) {
    return false;
  }
  throw new Error(`Could not check schema: ${error.message}`);
}

/** True if any seeded/app data is present (auth users or public rows). */
export async function databaseHasData(admin) {
  const { data: users, error: usersError } =
    await admin.auth.admin.listUsers({ perPage: 1, page: 1 });
  if (usersError) {
    throw new Error(`Could not list auth users: ${usersError.message}`);
  }
  if ((users?.users?.length ?? 0) > 0) return true;

  for (const table of ["profiles", "clients"]) {
    const { count, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) {
      const msg = `${error.message ?? ""}`.toLowerCase();
      if (msg.includes("does not exist") || error.code === "PGRST205") {
        continue;
      }
      throw new Error(`Could not check ${table}: ${error.message}`);
    }
    if ((count ?? 0) > 0) return true;
  }

  return false;
}
