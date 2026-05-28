#!/usr/bin/env node
/**
 * Apply supabase/schema/*.sql via Supabase CLI (empty database only).
 * No Cursor/MCP required — needs Supabase CLI + database credentials in env.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  checkSchemaExists,
  getDbContext,
} from "./lib/supabase-db-check.mjs";
import {
  getProjectRef,
  getSupabaseSecretKey,
  getSupabaseUrl,
  loadStackEnv,
} from "./lib/load-stack-env.mjs";
import { requireDbUrl } from "./lib/supabase-cli.mjs";
import { supabaseDbQuery } from "./lib/supabase-cli.mjs";

function fail(msg) {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
}

async function main() {
  const { merged, root } = loadStackEnv();
  const url = getSupabaseUrl(merged);
  const secret = getSupabaseSecretKey(merged);
  const ref = getProjectRef(merged);

  if (!url || !secret) {
    fail(
      "Missing Supabase API keys.\n" +
        "  .env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY\n" +
        "  worker/.dev.vars: SUPABASE_URL, SUPABASE_SECRET_KEY\n" +
        "See docs/database-setup.md — Credentials",
    );
  }

  const dbUrl = requireDbUrl(merged, ref);
  if (!dbUrl) {
    fail(
      "Database connection required (Supabase CLI uses direct Postgres).\n" +
        "Add to worker/.dev.vars:\n" +
        "  SUPABASE_DB_PASSWORD=...  (Dashboard → Project Settings → Database)\n" +
        "Or: SUPABASE_DB_URL=postgresql://... (full connection string)\n" +
        "See docs/database-setup.md — How to get each credential",
    );
  }

  const ctx = await getDbContext(merged, ref, root);

  if (await checkSchemaExists(ctx, root)) {
    fail(
      "Schema already exists (public.profiles table found).\n\n" +
        "To re-apply schema:\n" +
        "  1. Supabase Dashboard → SQL Editor: drop public tables/types/functions\n" +
        "     (or use a new empty Supabase project)\n" +
        "  2. Run: npm run db:schema\n\n" +
        "Scripts never auto-drop schema.",
    );
  }

  const schemaDir = join(root, "supabase", "schema");
  const files = readdirSync(schemaDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(
    `Applying ${files.length} schema file(s) via Supabase CLI (db query)...\n`,
  );

  for (const file of files) {
    const path = join(schemaDir, file);
    const r = supabaseDbQuery({ dbUrl, file: path, root });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      fail(`Failed applying ${file}`);
    }
    console.log(`Applied: ${file}`);
  }

  if (!(await checkSchemaExists(ctx, root))) {
    fail("Schema apply finished but profiles table is still missing.");
  }

  console.log("\nSchema apply complete (Supabase CLI only).");
  console.log("Next:");
  console.log("  1. Disable email confirmation — docs/database-setup.md");
  console.log("  2. npm run db:seed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
