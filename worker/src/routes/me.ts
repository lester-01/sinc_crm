import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import type { AppVariables, Env } from "../types";

export const meRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

meRoutes.use("*", authMiddleware);

meRoutes.get("/", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  if (!profile) {
    return c.json({
      id: userId,
      profile: null,
      message: "Authenticated; profiles row not found (apply schema + bootstrap)",
    });
  }

  return c.json({
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    createdAt: profile.created_at,
  });
});
