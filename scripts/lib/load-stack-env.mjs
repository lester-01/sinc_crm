import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Keys tooling scripts may read from process.env (env wins over dotenv files). */
export const STACK_ENV_KEYS = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_API_BASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_ORG_SLUG",
  "GITHUB_TOKEN",
  "GH_TOKEN",
];

export function isCiEnvironment() {
  return process.env.CI === "true";
}

export function isPlaceholder(val) {
  return (
    !val ||
    val.length < 10 ||
    val.includes("your-") ||
    val === "..." ||
    /^=+$/.test(val)
  );
}

function pickProcessEnvOverrides() {
  const overrides = {};
  for (const key of STACK_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined && String(value).trim() !== "") {
      overrides[key] = value;
    }
  }
  return overrides;
}

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

/**
 * @param {{ overlayPath?: string }} [options]
 */
export function loadStackEnv(options = {}) {
  const rootEnv = parseEnvFile(join(ROOT, ".env"));
  const workerVars = parseEnvFile(join(ROOT, "worker", ".dev.vars"));
  const cloudflareEnv = parseEnvFile(join(ROOT, "worker", ".cloudflare.env"));
  const overlay = options.overlayPath
    ? parseEnvFile(options.overlayPath)
    : process.env.E2E_ENV_FILE
      ? parseEnvFile(process.env.E2E_ENV_FILE)
      : {};
  const fromFiles = {
    ...rootEnv,
    ...workerVars,
    ...cloudflareEnv,
    ...overlay,
  };
  const merged = { ...fromFiles, ...pickProcessEnvOverrides() };
  return {
    rootEnv,
    workerVars,
    cloudflareEnv,
    overlay,
    merged,
    root: ROOT,
  };
}

export function hasFrontendStackKeys(merged) {
  const url = merged.VITE_SUPABASE_URL;
  const publicKey =
    merged.VITE_SUPABASE_PUBLISHABLE_KEY || merged.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && !isPlaceholder(url) && publicKey && !isPlaceholder(publicKey));
}

export function hasWorkerStackKeys(merged) {
  const url = merged.SUPABASE_URL || merged.VITE_SUPABASE_URL;
  const secret = merged.SUPABASE_SECRET_KEY;
  return Boolean(url && !isPlaceholder(url) && secret && !isPlaceholder(secret));
}

export function hasCloudflareStackKeys(merged) {
  return Boolean(
    merged.CLOUDFLARE_API_TOKEN && !isPlaceholder(merged.CLOUDFLARE_API_TOKEN),
  );
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
