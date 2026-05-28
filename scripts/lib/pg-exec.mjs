/** Build Postgres connection URL for Supabase CLI `--db-url` (no direct pg driver). */
export function buildDbUrl(merged, projectRef) {
  if (merged.SUPABASE_DB_URL) return merged.SUPABASE_DB_URL;

  const password = merged.SUPABASE_DB_PASSWORD;
  if (!password || !projectRef) return null;

  const region = merged.SUPABASE_DB_REGION || "eu-central-1";
  const host =
    merged.SUPABASE_DB_HOST ||
    `aws-1-${region}.pooler.supabase.com`;
  const port = merged.SUPABASE_DB_PORT || "5432";
  const user = merged.SUPABASE_DB_USER || `postgres.${projectRef}`;
  const database = merged.SUPABASE_DB_NAME || "postgres";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}
