#!/usr/bin/env node
/**
 * Exit 0 when Cloudflare credentials are available via env and/or dotenv files.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasCloudflareStackKeys, loadStackEnv } from "./load-stack-env.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  console.error(`ERROR: ${message}`);
}

const { merged } = loadStackEnv();

if (!hasCloudflareStackKeys(merged)) {
  if (!existsSync(join(ROOT, "worker", ".cloudflare.env"))) {
    fail(
      "Missing Cloudflare token — copy worker/.cloudflare.env.example or set CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) in the environment.",
    );
  } else {
    fail(
      "Incomplete worker/.cloudflare.env — set CLOUDFLARE_API_TOKEN (or export it).",
    );
  }
  console.error("See docs/deploy-guide.md and docs/external-auth.md");
  process.exit(1);
}
