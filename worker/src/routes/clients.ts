import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { createClientBodySchema } from "../schemas/clients";
import {
  createClient,
  getClientDetail,
  HttpError,
  listClients,
} from "../services/clientsService";
import type { AppVariables, Env } from "../types";

export const clientsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

clientsRoutes.use("*", authMiddleware);

clientsRoutes.get("/", async (c) => {
  try {
    const q = c.req.query("q");
    const ownerId = c.req.query("ownerId");
    const clients = await listClients(c.get("supabase"), c.get("userId"), { q, ownerId });
    return c.json(clients);
  } catch (e) {
    if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
    throw e;
  }
});

clientsRoutes.post("/", zValidator("json", createClientBodySchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const client = await createClient(c.get("supabase"), c.get("userId"), body);
    return c.json(client, 201);
  } catch (e) {
    if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
    throw e;
  }
});

clientsRoutes.get("/:clientId", async (c) => {
  try {
    const detail = await getClientDetail(
      c.get("supabase"),
      c.get("userId"),
      c.req.param("clientId"),
    );
    return c.json(detail);
  } catch (e) {
    if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
    throw e;
  }
});
