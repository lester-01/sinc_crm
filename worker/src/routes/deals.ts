import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import {
  createDealBodySchema,
  patchOwnerBodySchema,
  patchStageBodySchema,
  postNoteBodySchema,
} from "../schemas/deals";
import {
  createDeal,
  getDealDetail,
  listDeals,
  patchDealOwner,
  patchDealStage,
  postDealNote,
} from "../services/dealsService";
import { HttpError } from "../services/clientsService";
import type { AppVariables, Env } from "../types";

export const dealsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

dealsRoutes.use("*", authMiddleware);

function handleError(c: import("hono").Context, e: unknown) {
  if (e instanceof HttpError) return c.json({ error: e.message }, e.status);
  throw e;
}

dealsRoutes.get("/", async (c) => {
  try {
    const deals = await listDeals(c.get("supabase"), c.get("userId"), {
      stage: c.req.query("stage"),
      ownerId: c.req.query("ownerId"),
      clientId: c.req.query("clientId"),
      q: c.req.query("q"),
    });
    return c.json(deals);
  } catch (e) {
    return handleError(c, e);
  }
});

dealsRoutes.post("/", zValidator("json", createDealBodySchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const deal = await createDeal(c.get("supabase"), c.get("userId"), body);
    return c.json(deal, 201);
  } catch (e) {
    return handleError(c, e);
  }
});

dealsRoutes.get("/:dealId", async (c) => {
  try {
    const detail = await getDealDetail(c.get("supabase"), c.get("userId"), c.req.param("dealId"));
    return c.json(detail);
  } catch (e) {
    return handleError(c, e);
  }
});

dealsRoutes.patch("/:dealId/stage", zValidator("json", patchStageBodySchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const result = await patchDealStage(
      c.get("supabase"),
      c.get("userId"),
      c.req.param("dealId"),
      body,
    );
    return c.json(result);
  } catch (e) {
    return handleError(c, e);
  }
});

dealsRoutes.patch("/:dealId/owner", zValidator("json", patchOwnerBodySchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const result = await patchDealOwner(
      c.get("supabase"),
      c.get("userId"),
      c.req.param("dealId"),
      body,
    );
    return c.json(result);
  } catch (e) {
    return handleError(c, e);
  }
});

dealsRoutes.post("/:dealId/notes", zValidator("json", postNoteBodySchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const note = await postDealNote(
      c.get("supabase"),
      c.get("userId"),
      c.req.param("dealId"),
      body,
    );
    return c.json(note, 201);
  } catch (e) {
    return handleError(c, e);
  }
});
