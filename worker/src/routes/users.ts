import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { listTeamMembers } from "../services/conversationsService";
import { HttpError } from "../services/clientsService";
import type { AppVariables, Env } from "../types";

export const usersRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

usersRoutes.use("*", authMiddleware);

usersRoutes.get("/", async (c) => {
  try {
    const users = await listTeamMembers(c.get("supabase"), c.get("userId"));
    return c.json(users);
  } catch (e) {
    if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
    throw e;
  }
});
