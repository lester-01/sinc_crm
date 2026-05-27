import type { Context } from "hono";
import type { AppVariables, Env } from "../types";

export function notImplemented(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  feature: string,
) {
  return c.json(
    { error: "Not implemented", feature, message: "Route stub — implement in a later phase" },
    501,
  );
}
