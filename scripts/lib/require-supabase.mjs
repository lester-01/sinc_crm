#!/usr/bin/env node
/**
 * Exit 0 when Supabase credentials are available via env and/or dotenv files.
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

function fail(message) {
  console.error(`ERROR: ${message}`);
}

const { merged } = loadStackEnv();
let ok = true;

if (!hasFrontendStackKeys(merged)) {
  if (!existsSync(join(ROOT, ".env"))) {
    fail(
      "Missing frontend Supabase keys — copy .env.example → .env or set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the environment.",
    );
    ok = false;
  } else {
    fail(
      "Incomplete .env — set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or export them).",
    );
    ok = false;
  }
}

if (!hasWorkerStackKeys(merged)) {
  if (!existsSync(join(ROOT, "worker", ".dev.vars"))) {
    fail(
      "Missing worker Supabase secrets — copy worker/.dev.vars.example or set SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.",
    );
    ok = false;
  } else {
    fail(
      "Incomplete worker/.dev.vars — set SUPABASE_URL and SUPABASE_SECRET_KEY (or export them).",
    );
    ok = false;
  }
}

if (!ok) {
  console.error("See docs/quick-start.md and docs/external-auth.md");
  process.exit(1);
}
