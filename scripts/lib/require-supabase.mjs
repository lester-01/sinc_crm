#!/usr/bin/env node
/**
 * Exit 0 when Supabase credentials are available via env and/or .env.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasFrontendStackKeys,
  hasWorkerStackKeys,
  loadStackEnv,
} from "./load-stack-env.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ENV_PATH = join(ROOT, ".env");

function fail(message) {
  console.error(`ERROR: ${message}`);
}

const { merged } = loadStackEnv();
let ok = true;

if (!hasFrontendStackKeys(merged)) {
  if (!existsSync(ENV_PATH)) {
    fail(
      "Missing Supabase keys — copy .env.example → .env or export SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
    );
  } else {
    fail(
      "Incomplete .env — set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or export them).",
    );
  }
  ok = false;
}

if (!hasWorkerStackKeys(merged)) {
  if (!existsSync(ENV_PATH)) {
    fail(
      "Missing Supabase worker secrets — copy .env.example → .env or set SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.",
    );
  } else {
    fail(
      "Incomplete .env — set SUPABASE_URL and SUPABASE_SECRET_KEY (or export them).",
    );
  }
  ok = false;
}

if (!ok) {
  console.error("See docs/quick-start.md and docs/external-auth.md");
  process.exit(1);
}
