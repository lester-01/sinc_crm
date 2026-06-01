#!/usr/bin/env node
/**
 * Exit 0 when Cloudflare credentials are available via env and/or .env.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasCloudflareStackKeys, loadStackEnv } from "./load-stack-env.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ENV_PATH = join(ROOT, ".env");

function fail(message) {
  console.error(`ERROR: ${message}`);
}

const { merged } = loadStackEnv();

if (!hasCloudflareStackKeys(merged)) {
  if (!existsSync(ENV_PATH)) {
    fail(
      "Missing Cloudflare token — copy .env.example → .env or set CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) in the environment.",
    );
  } else {
    fail(
      "Incomplete .env — set CLOUDFLARE_API_TOKEN (or export it).",
    );
  }
  console.error("See docs/deploy-guide.md and docs/external-auth.md");
  process.exit(1);
}
