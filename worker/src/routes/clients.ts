import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { notImplemented } from "../lib/stub";
import type { AppVariables, Env } from "../types";

export const clientsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

clientsRoutes.use("*", authMiddleware);
clientsRoutes.get("/", (c) => notImplemented(c, "GET /clients"));
clientsRoutes.post("/", (c) => notImplemented(c, "POST /clients"));
clientsRoutes.get("/:clientId", (c) => notImplemented(c, "GET /clients/:clientId"));
