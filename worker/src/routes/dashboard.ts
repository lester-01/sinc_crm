import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { notImplemented } from "../lib/stub";
import type { AppVariables, Env } from "../types";

export const dashboardRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

dashboardRoutes.use("*", authMiddleware);
dashboardRoutes.use("*", requireRole("manager"));
dashboardRoutes.get("/", (c) => notImplemented(c, "GET /dashboard"));
