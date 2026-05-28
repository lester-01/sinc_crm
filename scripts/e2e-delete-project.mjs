#!/usr/bin/env node
/**
 * Delete ephemeral Supabase project from .e2e-run.env (E2E_PROJECT_REF).
 */

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { loadStackEnv, parseEnvFile } from "./lib/load-stack-env.mjs";
import { deleteProject } from "./lib/supabase-management.mjs";

const ROOT = join(import.meta.dirname, "..");

export async function deleteE2eProject() {
  const envPath = join(ROOT, ".e2e-run.env");
  const { merged } = loadStackEnv();
  const token = merged.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    console.warn("[e2e] No SUPABASE_ACCESS_TOKEN — skip project delete");
    return;
  }

  const overlay = existsSync(envPath) ? parseEnvFile(envPath) : {};
  const ref = overlay.E2E_PROJECT_REF?.trim();
  if (!ref) {
    console.warn("[e2e] No E2E_PROJECT_REF in .e2e-run.env — skip delete");
    return;
  }

  try {
    console.log(`[e2e] Deleting project ${ref}…`);
    await deleteProject(token, ref);
    console.log(`[e2e] Deleted ${ref}`);
  } catch (e) {
    console.warn(`[e2e] Delete failed (manual cleanup if needed): ${e.message}`);
  }

  if (existsSync(envPath)) {
    unlinkSync(envPath);
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href;

if (isMain) {
  deleteE2eProject().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
