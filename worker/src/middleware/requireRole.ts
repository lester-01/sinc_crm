import { createMiddleware } from "hono/factory";
import type { AppRole, AppVariables, Env } from "../types";

export function requireRole(...allowed: AppRole[]) {
  return createMiddleware<{
    Bindings: Env;
    Variables: AppVariables;
  }>(async (c, next) => {
    const supabase = c.get("supabase");
    const userId = c.get("userId");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    if (!profile) {
      return c.json({ error: "Profile not found for user" }, 403);
    }

    const role = profile.role as AppRole;
    if (!allowed.includes(role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    c.set("role", role);
    await next();
  });
}
