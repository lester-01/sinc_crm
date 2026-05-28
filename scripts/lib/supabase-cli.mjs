import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDbUrl } from "./pg-exec.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function getSupabaseCliBin(root = REPO_ROOT) {
  const local = join(root, "node_modules", ".bin", "supabase");
  return existsSync(local) ? local : "supabase";
}

/** Percent-encode for --db-url (Supabase CLI requirement). */
export function encodeDbUrl(url) {
  return encodeURIComponent(url);
}

export function requireDbUrl(merged, projectRef) {
  const dbUrl = buildDbUrl(merged, projectRef);
  if (!dbUrl) return null;
  return dbUrl;
}

/**
 * Run `supabase db query` against remote Postgres (no Cursor/MCP).
 * @returns {{ status: number, stdout: string, stderr: string }}
 */
export function supabaseDbQuery({
  dbUrl,
  sql,
  file,
  json = false,
  root = REPO_ROOT,
}) {
  const bin = getSupabaseCliBin(root);
  const args = [bin, "db", "query"];
  if (file) args.push("-f", file);
  else if (sql) args.push(sql);
  if (json) args.push("-o", "json");
  if (dbUrl) args.push("--db-url", encodeDbUrl(dbUrl));

  const r = spawnSync("npx", args, {
    encoding: "utf8",
    cwd: root,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
  });
  return {
    status: r.status ?? 1,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

/** Parse first scalar from CLI table or JSON output. */
export function parseScalarOutput(stdout) {
  if (!stdout) return null;
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed) && parsed[0]) {
      const row = parsed[0];
      return Object.values(row)[0];
    }
  } catch {
    /* table text */
  }
  const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const dataLine = lines[lines.length - 1];
    const parts = dataLine.split("|").map((p) => p.trim());
    if (parts.length) return parts[0];
    return dataLine;
  }
  return null;
}

export function queryScalar(dbUrl, sql, root) {
  const r = supabaseDbQuery({ dbUrl, sql, json: true, root });
  if (r.status !== 0) {
    throw new Error(
      `supabase db query failed: ${r.stderr || r.stdout || "unknown error"}`,
    );
  }
  return parseScalarOutput(r.stdout);
}
