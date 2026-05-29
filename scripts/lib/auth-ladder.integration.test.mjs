import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ENSURE_CF = join(ROOT, "scripts/ensure-cloudflare-auth.sh");
const REQUIRE_CREDS = join(ROOT, "scripts/lib/require-stack-credentials.mjs");
const VERIFY_GH = join(ROOT, "scripts/verify-github-actions.mjs");
const CF_ENV = join(ROOT, "worker", ".cloudflare.env");

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

describe("auth ladder integration", () => {
  describe("ensure-cloudflare-auth.sh", () => {
    /** @type {string | null} */
    let cfBackup = null;

    before(() => {
      if (existsSync(CF_ENV)) {
        cfBackup = `${CF_ENV}.auth-ladder-test-bak`;
        renameSync(CF_ENV, cfBackup);
      }
    });

    after(() => {
      if (cfBackup && existsSync(cfBackup)) {
        renameSync(cfBackup, CF_ENV);
      }
    });

    it("AUTH-LADDER-07: CI=true fails fast before OAuth when no token", () => {
      const r = runBash(ENSURE_CF, {
        CI: "true",
        CLOUDFLARE_API_TOKEN: "",
        CLOUDFLARE_ACCOUNT_ID: "",
      });
      assert.notEqual(r.status, 0);
      const out = `${r.stdout}${r.stderr}`;
      assert.match(out, /CI=true/);
      assert.match(out, /headless/i);
      assert.doesNotMatch(out, /wrangler login/i);
    });
  });

  describe("require-stack-credentials.mjs", () => {
    const FAKE_URL = "https://abcdefgh.supabase.co";
    const FAKE_PUB = "eyJhbGciOiJIUzI1NiJ9.abcdefgh";
    const FAKE_SECRET = "eyJhbGciOiJIUzI1NiJ9.secretkey12";
    const FAKE_CF = "cf-token-abcdefghijklmnopqrst";
    const FAKE_ACCOUNT = "account-id-1234567890";

    it("AUTH-LADDER-08: succeeds when required keys are only in environment", () => {
      const r = runNode(REQUIRE_CREDS, {
        VITE_SUPABASE_URL: FAKE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: FAKE_PUB,
        SUPABASE_URL: FAKE_URL,
        SUPABASE_SECRET_KEY: FAKE_SECRET,
        CLOUDFLARE_API_TOKEN: FAKE_CF,
        CLOUDFLARE_ACCOUNT_ID: FAKE_ACCOUNT,
      });
      assert.equal(
        r.status,
        0,
        r.stderr || r.stdout || "require-stack-credentials failed",
      );
    });

    it("AUTH-LADDER-09: fails when Cloudflare token missing from env and files", () => {
      let hideCf = null;
      if (existsSync(CF_ENV)) {
        hideCf = `${CF_ENV}.req-creds-test-bak`;
        renameSync(CF_ENV, hideCf);
      }
      try {
        const env = {
          ...process.env,
          VITE_SUPABASE_URL: FAKE_URL,
          VITE_SUPABASE_PUBLISHABLE_KEY: FAKE_PUB,
          SUPABASE_URL: FAKE_URL,
          SUPABASE_SECRET_KEY: FAKE_SECRET,
        };
        delete env.CLOUDFLARE_API_TOKEN;
        delete env.CLOUDFLARE_ACCOUNT_ID;
        const r = spawnSync(process.execPath, [REQUIRE_CREDS], {
          cwd: ROOT,
          env,
          encoding: "utf8",
        });
        assert.notEqual(r.status, 0);
        assert.match(`${r.stdout}${r.stderr}`, /Cloudflare/i);
      } finally {
        if (hideCf && existsSync(hideCf)) renameSync(hideCf, CF_ENV);
      }
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
