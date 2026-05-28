#!/usr/bin/env node
/**
 * Apply supabase/schema/*.sql (empty database only).
 * Aborts if profiles table already exists.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient, schemaExists } from "./lib/supabase-db-check.mjs";
import {
  getProjectRef,
  getSupabaseSecretKey,
  getSupabaseUrl,
  loadStackEnv,
} from "./lib/load-stack-env.mjs";
import { buildDbUrl, executeSqlFile } from "./lib/pg-exec.mjs";

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
    fail("Missing SUPABASE_URL and SUPABASE_SECRET_KEY in .env / worker/.dev.vars");
  }

  const admin = createAdminClient(url, secret);

  if (await schemaExists(admin)) {
    fail(
      "Schema already exists (profiles table found).\n\n" +
        "To re-apply schema:\n" +
        "  1. Open Supabase Dashboard → SQL Editor\n" +
        "  2. Drop public schema objects (tables, types, functions) or use a new empty project\n" +
        "  3. Run: npm run db:schema\n\n" +
        "Scripts never auto-drop schema — this protects databases already in use.",
    );
  }

  const dbUrl = buildDbUrl(merged, ref);
  if (!dbUrl) {
    fail(
      "Database connection required to apply SQL.\n" +
        "Add to worker/.dev.vars (from Dashboard → Project Settings → Database):\n" +
        "  SUPABASE_DB_PASSWORD=your-database-password\n" +
        "Optional: SUPABASE_DB_URL=postgresql://... (full connection string instead)",
    );
  }

  const schemaDir = join(root, "supabase", "schema");
  const files = readdirSync(schemaDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Applying ${files.length} schema file(s) to project ${ref || url}...\n`);

  for (const file of files) {
    const path = join(schemaDir, file);
    const sql = readFileSync(path, "utf8");
    await executeSqlFile(dbUrl, path, sql);
    console.log(`Applied: ${file}`);
  }

  if (!(await schemaExists(admin))) {
    fail("Schema apply finished but profiles table is still missing. Check SQL errors above.");
  }

  console.log("\nSchema apply complete.");
  console.log("Next steps:");
  console.log("  1. Disable email confirmation in Supabase Dashboard (see docs/database-setup.md)");
  console.log("  2. npm run db:seed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
