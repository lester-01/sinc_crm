import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { notImplemented } from "../lib/stub";
import type { AppVariables, Env } from "../types";

/** Reserved for team user listing helpers; no routes in api.md yet. */
export const usersRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

usersRoutes.use("*", authMiddleware);
usersRoutes.get("/", (c) => notImplemented(c, "GET /users"));
