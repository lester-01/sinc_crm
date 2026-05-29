#!/usr/bin/env node
/**
 * Resolve Pages deploy target via Cloudflare API only.
 * Usage: node scripts/lib/pages-deploy-target.mjs project|origin
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadStackEnv } from "./load-stack-env.mjs";
import {
  fetchPagesProjectsViaApi,
  readWorkerNameFromToml,
  resolvePagesOriginViaApi,
  resolvePagesProjectName,
} from "./cloudflare-api.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const mode = process.argv[2];

async function main() {
  const { merged } = loadStackEnv();
  const accountId = merged.CLOUDFLARE_ACCOUNT_ID;
  const token = merged.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    console.error("ERROR: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required.");
    process.exit(1);
  }

  const workerName = readWorkerNameFromToml(join(ROOT, "worker/wrangler.toml"));
  let rows;
  try {
    rows = await fetchPagesProjectsViaApi(accountId, token);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const { name, source } = resolvePagesProjectName({ rows, workerName });

  if (mode === "project") {
    console.error(`Pages project: ${name} (from ${source})`);
    process.stdout.write(name);
    return;
  }

  if (mode === "origin") {
    const origin = await resolvePagesOriginViaApi({
      accountId,
      token,
      projectName: name,
      rows,
    });
    console.error(`Stable Pages URL (API): ${origin}`);
    process.stdout.write(origin);
    return;
  }

  console.error("Usage: pages-deploy-target.mjs project|origin");
  process.exit(1);
}

main();
