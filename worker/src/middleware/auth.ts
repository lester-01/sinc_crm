import { createMiddleware } from "hono/factory";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import type { AppVariables, Env } from "../types";

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const accessToken = header.slice("Bearer ".length).trim();
  if (!accessToken) {
    return c.json({ error: "Missing access token" }, 401);
  }

  try {
    const supabase = getSupabaseAdmin(c.env);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    c.set("userId", user.id);
    c.set("accessToken", accessToken);
    c.set("supabase", supabase);
    await next();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Auth configuration error";
    return c.json({ error: message }, 503);
  }
});
