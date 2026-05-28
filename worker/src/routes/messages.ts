import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { postMessageSchema } from "../schemas/conversations";
import { postMessage } from "../services/conversationsService";
import { HttpError } from "../services/clientsService";
import type { AppVariables, Env } from "../types";

export const messagesRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

messagesRoutes.use("*", authMiddleware);

messagesRoutes.post("/:threadId/messages", zValidator("json", postMessageSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const message = await postMessage(
      c.get("supabase"),
      c.get("userId"),
      c.req.param("threadId"),
      body,
    );
    return c.json(message, 201);
  } catch (e) {
    if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
    throw e;
  }
});
