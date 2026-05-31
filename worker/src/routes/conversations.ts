import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import {
  assignConversationSchema,
  createConversationSchema,
  patchStatusSchema,
} from "../schemas/conversations";
import {
  assignConversation,
  createConversation,
  getConversation,
  listConversations,
  markConversationRead,
  patchConversationStatus,
} from "../services/conversationsService";
import { HttpError } from "../services/clientsService";
import type { AppVariables, Env } from "../types";

export const conversationsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

conversationsRoutes.use("*", authMiddleware);

function handleError(c: import("hono").Context, e: unknown) {
  if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
  throw e;
}

conversationsRoutes.get("/", async (c) => {
  try {
    const queue = c.req.query("queue");
    const threads = await listConversations(c.get("supabase"), c.get("userId"), queue);
    return c.json(threads);
  } catch (e) {
    return handleError(c, e);
  }
});

conversationsRoutes.post("/", zValidator("json", createConversationSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const thread = await createConversation(c.get("supabase"), c.get("userId"), body);
    return c.json(thread, 201);
  } catch (e) {
    return handleError(c, e);
  }
});

conversationsRoutes.get("/:threadId", async (c) => {
  try {
    const detail = await getConversation(
      c.get("supabase"),
      c.get("userId"),
      c.req.param("threadId"),
    );
    return c.json(detail);
  } catch (e) {
    return handleError(c, e);
  }
});

conversationsRoutes.patch("/:threadId/read", async (c) => {
  try {
    const result = await markConversationRead(
      c.get("supabase"),
      c.get("userId"),
      c.req.param("threadId"),
    );
    return c.json(result);
  } catch (e) {
    return handleError(c, e);
  }
});

conversationsRoutes.patch("/:threadId/status", zValidator("json", patchStatusSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const result = await patchConversationStatus(
      c.get("supabase"),
      c.get("userId"),
      c.req.param("threadId"),
      body,
    );
    return c.json(result);
  } catch (e) {
    return handleError(c, e);
  }
});

conversationsRoutes.patch(
  "/:threadId/assign",
  zValidator("json", assignConversationSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");
      const result = await assignConversation(
        c.get("supabase"),
        c.get("userId"),
        c.req.param("threadId"),
        body,
      );
      return c.json(result);
    } catch (e) {
      return handleError(c, e);
    }
  },
);
