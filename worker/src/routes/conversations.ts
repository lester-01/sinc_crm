import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { notImplemented } from "../lib/stub";
import type { AppVariables, Env } from "../types";

export const conversationsRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

conversationsRoutes.use("*", authMiddleware);
conversationsRoutes.get("/", (c) => notImplemented(c, "GET /conversations"));
conversationsRoutes.post("/", (c) => notImplemented(c, "POST /conversations"));
conversationsRoutes.get("/:threadId", (c) =>
  notImplemented(c, "GET /conversations/:threadId"),
);
conversationsRoutes.patch("/:threadId/status", (c) =>
  notImplemented(c, "PATCH /conversations/:threadId/status"),
);
conversationsRoutes.patch("/:threadId/assign", (c) =>
  notImplemented(c, "PATCH /conversations/:threadId/assign"),
);
