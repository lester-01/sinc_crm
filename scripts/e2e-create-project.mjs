#!/usr/bin/env node
/**
 * Create ephemeral Supabase project: sinc-ci-e2e-<timestamp>
 * Writes .e2e-run.env with keys for db:schema / db:seed / Playwright.
 */

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadStackEnv } from "./lib/load-stack-env.mjs";
import { resolveSupabaseOrgSlug } from "./lib/resolve-supabase-org-slug.mjs";
import {
  createProject,
  extractApiKeys,
  listProjectApiKeys,
  waitForProjectActive,
  buildE2eEnvFile,
} from "./lib/supabase-management.mjs";

const ROOT = join(import.meta.dirname, "..");

function fail(msg) {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
}

function randomDbPassword() {
  return randomBytes(16).toString("base64url").slice(0, 20);
}

export async function createE2eProject() {
  const { merged } = loadStackEnv();
  const token = merged.SUPABASE_ACCESS_TOKEN?.trim();
  const orgSlug = resolveSupabaseOrgSlug(merged);
  if (!token) {
    fail("SUPABASE_ACCESS_TOKEN required in root .env for isolated E2E");
  }
  if (!orgSlug) {
    fail("SUPABASE_ORG_SLUG required in root .env (dashboard URL …/org/<slug>/…)");
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = `sinc-ci-e2e-${stamp}`;
  const dbPass = randomDbPassword();

  console.log(`[e2e] Creating project ${name} in org ${orgSlug}…`);
  const created = await createProject(token, {
    name,
    organizationSlug: orgSlug,
    dbPass,
  });

  const ref = created.ref;
  if (!ref) fail("Create project response missing ref");

  console.log(`[e2e] Waiting for project ${ref} to become active…`);
  const project = await waitForProjectActive(token, ref);

  console.log(`[e2e] Fetching API keys for ${ref}…`);
  const keysPayload = await listProjectApiKeys(token, ref);
  const { publishable, secret } = extractApiKeys(keysPayload);
  if (!publishable || !secret) {
    fail("Could not resolve publishable/secret keys from Management API");
  }

  const envContent = buildE2eEnvFile({
    project: { ...project, name },
    dbPass,
    publishableKey: publishable,
    secretKey: secret,
  });

  const envPath = join(ROOT, ".e2e-run.env");
  writeFileSync(envPath, envContent, "utf8");
  console.log(`[e2e] Wrote ${envPath}`);

  return { ref, name, envPath };
}

const isMain =
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href;

if (isMain) {
  createE2eProject().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
