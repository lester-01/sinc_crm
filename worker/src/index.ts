import { Hono } from "hono";
import { cors } from "hono/cors";
import { clientsRoutes } from "./routes/clients";
import { conversationsRoutes } from "./routes/conversations";
import { dashboardRoutes } from "./routes/dashboard";
import { dealsRoutes } from "./routes/deals";
import { meRoutes } from "./routes/me";
import { messagesRoutes } from "./routes/messages";
import { usersRoutes } from "./routes/users";
import { corsOrigins } from "./lib/corsOrigins";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const origins = corsOrigins(c.env);
  return cors({
    origin: origins,
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  })(c, next);
});

const api = new Hono<{ Bindings: Env }>();

api.get("/health", (c) =>
  c.json({ ok: true, service: "sinc-crm-api", version: "scaffold" }),
);

api.route("/me", meRoutes);
api.route("/clients", clientsRoutes);
api.route("/conversations", conversationsRoutes);
api.route("/conversations", messagesRoutes);
api.route("/deals", dealsRoutes);
api.route("/dashboard", dashboardRoutes);
api.route("/users", usersRoutes);

app.route("/api", api);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
