import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { notImplemented } from "../lib/stub";
import type { AppVariables, Env } from "../types";

export const messagesRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

messagesRoutes.use("*", authMiddleware);
messagesRoutes.post("/:threadId/messages", (c) =>
  notImplemented(c, "POST /conversations/:threadId/messages"),
);
