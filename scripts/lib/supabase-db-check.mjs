import { createClient } from "@supabase/supabase-js";
import { queryScalar, requireDbUrl } from "./supabase-cli.mjs";

export function createAdminClient(url, secretKey) {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isTruthyScalar(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).toLowerCase();
  return s === "t" || s === "true" || s === "1" || Number(s) > 0;
}

/** CLI: profiles table exists in public schema. */
export function schemaExistsCli(dbUrl, root) {
  const sql = `select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) as exists;`;
  const value = queryScalar(dbUrl, sql, root);
  return isTruthyScalar(value);
}

/** CLI: any auth users or app rows (not empty). */
export function databaseHasDataCli(dbUrl, root) {
  try {
    const authCount = queryScalar(
      dbUrl,
      "select count(*)::int as c from auth.users;",
      root,
    );
    if (Number(authCount) > 0) return true;
  } catch {
    /* auth schema may be inaccessible on some roles — fall through */
  }

  for (const table of ["profiles", "clients"]) {
    try {
      const count = queryScalar(
        dbUrl,
        `select count(*)::int as c from public.${table};`,
        root,
      );
      if (Number(count) > 0) return true;
    } catch (e) {
      const msg = `${e.message ?? ""}`.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("42p01")) continue;
      throw e;
    }
  }
  return false;
}

/** REST fallback when DB URL is missing (seed-only path). */
export async function schemaExistsRest(admin) {
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

export async function databaseHasDataRest(admin) {
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
      if (msg.includes("does not exist") || error.code === "PGRST205") continue;
      throw new Error(`Could not check ${table}: ${error.message}`);
    }
    if ((count ?? 0) > 0) return true;
  }
  return false;
}

export async function getDbContext(merged, _projectRef, root) {
  let dbUrl = null;
  try {
    dbUrl = requireDbUrl(merged);
  } catch {
    dbUrl = null;
  }
  const url = (merged.SUPABASE_URL || "").replace(/\/$/, "");
  const secret = merged.SUPABASE_SECRET_KEY || "";
  const admin =
    url && secret ? createAdminClient(url, secret) : null;
  return { dbUrl, admin, url, secret };
}

export async function checkSchemaExists(ctx, root) {
  if (ctx.admin) {
    try {
      return await schemaExistsRest(ctx.admin);
    } catch {
      /* fall through to CLI when REST is unavailable */
    }
  }
  if (ctx.dbUrl) return schemaExistsCli(ctx.dbUrl, root);
  return false;
}

export async function checkDatabaseHasData(ctx, root) {
  if (ctx.admin) {
    try {
      return await databaseHasDataRest(ctx.admin);
    } catch {
      /* fall through */
    }
  }
  if (ctx.dbUrl) return databaseHasDataCli(ctx.dbUrl, root);
  return false;
}
