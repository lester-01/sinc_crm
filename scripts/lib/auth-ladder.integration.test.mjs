import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ENSURE_CF = join(ROOT, "scripts/ensure-cloudflare-auth.sh");
const REQUIRE_SUPABASE = join(ROOT, "scripts/lib/require-supabase.mjs");
const REQUIRE_CLOUDFLARE = join(ROOT, "scripts/lib/require-cloudflare.mjs");
const VERIFY_GH = join(ROOT, "scripts/verify-github-actions.mjs");

function runNode(script, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  for (const key of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]) {
    if (key in extraEnv && extraEnv[key] === "") delete env[key];
  }
  return spawnSync(process.execPath, [script], {
    cwd: ROOT,
    env,
    encoding: "utf8",
  });
}

function runBash(script, extraEnv = {}) {
  return spawnSync("bash", [script], {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
}

/** Isolated empty env file — never rename the developer's root .env. */
function withEmptyStackEnvFile(run) {
  const dir = mkdtempSync(join(tmpdir(), "auth-ladder-env-"));
  const envFile = join(dir, ".env");
  writeFileSync(envFile, "# empty fixture\n", "utf8");
  try {
    run(envFile);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Isolated directory with no .env for bash scripts using CLOUDFLARE_ENV_ROOT. */
function withEmptyCloudflareRoot(run) {
  const dir = mkdtempSync(join(tmpdir(), "auth-ladder-cf-"));
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("auth ladder integration", () => {
  describe("ensure-cloudflare-auth.sh", () => {
    it("AUTH-LADDER-07: CI=true fails fast before OAuth when no token", () => {
      withEmptyCloudflareRoot((cfRoot) => {
        const r = runBash(ENSURE_CF, {
          CI: "true",
          CLOUDFLARE_API_TOKEN: "",
          CLOUDFLARE_ACCOUNT_ID: "",
          CLOUDFLARE_ENV_ROOT: cfRoot,
        });
        assert.notEqual(r.status, 0);
        const out = `${r.stdout}${r.stderr}`;
        assert.match(out, /CI=true/);
        assert.match(out, /headless/i);
        assert.doesNotMatch(out, /wrangler login/i);
      });
    });
  });

  describe("require-supabase.mjs", () => {
    const FAKE_URL = "https://abcdefgh.supabase.co";
    const FAKE_PUB = "eyJhbGciOiJIUzI1NiJ9.abcdefgh";
    const FAKE_SECRET = "eyJhbGciOiJIUzI1NiJ9.secretkey12";

    it("AUTH-LADDER-08: succeeds when Supabase keys are only in environment", () => {
      withEmptyStackEnvFile((envFile) => {
        const r = runNode(REQUIRE_SUPABASE, {
          STACK_ENV_FILE: envFile,
          SUPABASE_URL: FAKE_URL,
          SUPABASE_PUBLISHABLE_KEY: FAKE_PUB,
          SUPABASE_SECRET_KEY: FAKE_SECRET,
        });
        assert.equal(
          r.status,
          0,
          r.stderr || r.stdout || "require-supabase failed",
        );
      });
    });
  });

  describe("require-cloudflare.mjs", () => {
    const FAKE_CF = "cf-token-abcdefghijklmnopqrst";

    it("AUTH-LADDER-09: fails when Cloudflare token missing from env and files", () => {
      withEmptyStackEnvFile((envFile) => {
        const env = { ...process.env, STACK_ENV_FILE: envFile };
        delete env.CLOUDFLARE_API_TOKEN;
        delete env.CLOUDFLARE_ACCOUNT_ID;
        const r = spawnSync(process.execPath, [REQUIRE_CLOUDFLARE], {
          cwd: ROOT,
          env,
          encoding: "utf8",
        });
        assert.notEqual(r.status, 0);
        assert.match(`${r.stdout}${r.stderr}`, /Cloudflare/i);
      });
    });

    it("AUTH-LADDER-09b: succeeds when Cloudflare token is in environment", () => {
      const r = runNode(REQUIRE_CLOUDFLARE, {
        CLOUDFLARE_API_TOKEN: FAKE_CF,
      });
      assert.equal(r.status, 0, r.stderr || r.stdout || "require-cloudflare failed");
    });
  });

  describe("verify-github-actions.mjs", () => {
    it("AUTH-LADDER-10: CI=true reports OAuth unavailable without env token", () => {
      const r = runNode(VERIFY_GH, {
        CI: "true",
        GITHUB_TOKEN: "",
        GH_TOKEN: "",
      });
      const out = `${r.stdout}${r.stderr}`;
      assert.match(out, /CI=true/);
      assert.match(out, /OAuth is not available in CI/i);
    });
  });
});
