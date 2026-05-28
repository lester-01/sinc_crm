import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
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

export function loadStackEnv() {
  const rootEnv = parseEnvFile(join(ROOT, ".env"));
  const workerVars = parseEnvFile(join(ROOT, "worker", ".dev.vars"));
  return { rootEnv, workerVars, merged: { ...rootEnv, ...workerVars }, root: ROOT };
}

export function getSupabaseUrl(merged) {
  return (merged.VITE_SUPABASE_URL || merged.SUPABASE_URL || "").replace(/\/$/, "");
}

export function getSupabaseSecretKey(merged) {
  return merged.SUPABASE_SECRET_KEY || "";
}

export function getProjectRef(merged) {
  const url = getSupabaseUrl(merged);
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? "";
}
