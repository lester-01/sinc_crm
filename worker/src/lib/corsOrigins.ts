import type { Env } from "../types";

const DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

/** Local dev origins plus optional comma-separated production URLs (e.g. Pages). */
export function corsOrigins(env: Env): string[] {
  const extra =
    env.CORS_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  return [...DEFAULT_ORIGINS, ...extra];
}
