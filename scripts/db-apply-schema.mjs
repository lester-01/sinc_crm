#!/usr/bin/env node
/**
 * Apply supabase/schema/*.sql via Supabase CLI (empty database only).
 * No Cursor/MCP required — needs Supabase CLI + database credentials in env.
 */

import { readFileSync, readdirSync } from "node:fs";
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
import { resolveDbUrlOrExplain } from "./lib/resolve-db-url.mjs";
import { executeProjectSql } from "./lib/supabase-management.mjs";
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
        "  .env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY\n" +
        "See docs/database-setup.md — Credentials",
    );
  }

  const { url: dbUrl, error: dbUrlError } = resolveDbUrlOrExplain(merged);
  if (dbUrlError || !dbUrl) {
    fail(dbUrlError || "Missing SUPABASE_DB_URL");
  }

  const ctx = await getDbContext(merged, ref, root);
  if (!ctx.dbUrl) {
    fail(
      "SUPABASE_DB_URL is required for CLI checks.\n" +
        "Copy Transaction pooler URI from Dashboard → Connect (port 6543).\n" +
        "See docs/database-setup.md",
    );
  }

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

  const accessToken = merged.SUPABASE_ACCESS_TOKEN?.trim();
  const useManagementApi = Boolean(accessToken && ref);

  console.log(
    useManagementApi
      ? `Applying ${files.length} schema file(s) via Supabase Management API...\n`
      : `Applying ${files.length} schema file(s) via Supabase CLI (db query)...\n`,
  );

  for (const file of files) {
    const path = join(schemaDir, file);
    if (useManagementApi) {
      const sql = readFileSync(path, "utf8");
      try {
        await executeProjectSql(accessToken, ref, sql);
      } catch (e) {
        console.error(e.message);
        fail(`Failed applying ${file}`);
      }
    } else {
      const r = supabaseDbQuery({ dbUrl, file: path, root });
      if (r.status !== 0) {
        console.error(r.stderr || r.stdout);
        fail(`Failed applying ${file}`);
      }
    }
    console.log(`Applied: ${file}`);
  }

  if (!(await checkSchemaExists(ctx, root))) {
    fail("Schema apply finished but profiles table is still missing.");
  }

  console.log(
    `\nSchema apply complete (${useManagementApi ? "Management API" : "Supabase CLI"}).`,
  );
  console.log("Next:");
  console.log("  1. Disable email confirmation — docs/database-setup.md");
  console.log("  2. npm run db:seed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
