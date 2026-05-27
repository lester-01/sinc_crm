import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { notImplemented } from "../lib/stub";
import type { AppVariables, Env } from "../types";

export const dealsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

dealsRoutes.use("*", authMiddleware);
dealsRoutes.get("/", (c) => notImplemented(c, "GET /deals"));
dealsRoutes.post("/", (c) => notImplemented(c, "POST /deals"));
dealsRoutes.get("/:dealId", (c) => notImplemented(c, "GET /deals/:dealId"));
dealsRoutes.patch("/:dealId/stage", (c) =>
  notImplemented(c, "PATCH /deals/:dealId/stage"),
);
dealsRoutes.patch("/:dealId/owner", (c) =>
  notImplemented(c, "PATCH /deals/:dealId/owner"),
);
dealsRoutes.post("/:dealId/notes", (c) =>
  notImplemented(c, "POST /deals/:dealId/notes"),
);
