import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { getDashboard } from "../services/dashboardService";
import { HttpError } from "../services/clientsService";
import type { AppVariables, Env } from "../types";

export const dashboardRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

dashboardRoutes.use("*", authMiddleware);
dashboardRoutes.use("*", requireRole("manager"));

dashboardRoutes.get("/", async (c) => {
  try {
    const data = await getDashboard(c.get("supabase"));
    return c.json(data);
  } catch (e) {
    if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
    throw e;
  }
});
