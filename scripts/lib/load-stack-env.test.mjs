import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  hasCloudflareStackKeys,
  hasFrontendStackKeys,
  hasWorkerStackKeys,
  isCiEnvironment,
  isPlaceholder,
  loadStackEnv,
  parseEnvFile,
} from "./load-stack-env.mjs";

const FAKE_URL = "https://abcdefgh.supabase.co";
const FAKE_PUB = "eyJhbGciOiJIUzI1NiJ9.abcdefgh";
const FAKE_SECRET = "eyJhbGciOiJIUzI1NiJ9.secretkey12";
const FAKE_CF = "cf-token-abcdefghijklmnopqrst";

/** @type {Record<string, string | undefined>} */
let savedEnv = {};

function stashEnv(keys) {
  savedEnv = {};
  for (const key of keys) {
    savedEnv[key] = process.env[key];
  }
}

function restoreEnv(keys) {
  for (const key of keys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}

describe("load-stack-env (tooling auth ladder)", () => {
  describe("isCiEnvironment", () => {
    beforeEach(() => stashEnv(["CI"]));
    afterEach(() => restoreEnv(["CI"]));

    it("AUTH-LADDER-01: true only when CI=true", () => {
      delete process.env.CI;
      assert.equal(isCiEnvironment(), false);
      process.env.CI = "1";
      assert.equal(isCiEnvironment(), false);
      process.env.CI = "true";
      assert.equal(isCiEnvironment(), true);
    });
  });

  describe("isPlaceholder", () => {
    it("AUTH-LADDER-02: rejects empty, short, and your-* values", () => {
      assert.equal(isPlaceholder(""), true);
      assert.equal(isPlaceholder("short"), true);
      assert.equal(isPlaceholder("your-token-here"), true);
      assert.equal(isPlaceholder(FAKE_CF), false);
    });
  });

  describe("parseEnvFile", () => {
    it("AUTH-LADDER-03: parses quoted and unquoted values", () => {
      const dir = mkdtempSync(join(tmpdir(), "stack-env-"));
      const path = join(dir, ".env");
      writeFileSync(
        path,
        'FOO=bar\n# comment\nBAR="quoted"\nBAZ=\'single\'\n',
        "utf8",
      );
      assert.deepEqual(parseEnvFile(path), {
        FOO: "bar",
        BAR: "quoted",
        BAZ: "single",
      });
      rmSync(dir, { recursive: true });
    });
  });

  describe("has*StackKeys", () => {
    it("AUTH-LADDER-04: hasCloudflareStackKeys requires non-placeholder token", () => {
      assert.equal(hasCloudflareStackKeys({}), false);
      assert.equal(
        hasCloudflareStackKeys({ CLOUDFLARE_API_TOKEN: "your-token" }),
        false,
      );
      assert.equal(
        hasCloudflareStackKeys({ CLOUDFLARE_API_TOKEN: FAKE_CF }),
        true,
      );
    });

    it("AUTH-LADDER-05: hasFrontendStackKeys and hasWorkerStackKeys", () => {
      assert.equal(hasFrontendStackKeys({ VITE_SUPABASE_URL: FAKE_URL }), false);
      assert.equal(
        hasFrontendStackKeys({
          VITE_SUPABASE_URL: FAKE_URL,
          VITE_SUPABASE_PUBLISHABLE_KEY: FAKE_PUB,
        }),
        true,
      );
      assert.equal(
        hasWorkerStackKeys({
          SUPABASE_URL: FAKE_URL,
          SUPABASE_SECRET_KEY: FAKE_SECRET,
        }),
        true,
      );
    });
  });

  describe("loadStackEnv env overrides files", () => {
    const keys = ["CLOUDFLARE_API_TOKEN", "VITE_SUPABASE_URL"];

    beforeEach(() => stashEnv(keys));
    afterEach(() => restoreEnv(keys));

    it("AUTH-LADDER-06: process.env wins over dotenv file values", () => {
      const dir = mkdtempSync(join(tmpdir(), "stack-env-"));
      const overlay = join(dir, "overlay.env");
      writeFileSync(
        overlay,
        `CLOUDFLARE_API_TOKEN=file-token-xxxxxxxx\nVITE_SUPABASE_URL=https://fileonly.supabase.co\n`,
        "utf8",
      );
      process.env.CLOUDFLARE_API_TOKEN = FAKE_CF;
      process.env.VITE_SUPABASE_URL = FAKE_URL;

      const { merged } = loadStackEnv({ overlayPath: overlay });
      assert.equal(merged.CLOUDFLARE_API_TOKEN, FAKE_CF);
      assert.equal(merged.VITE_SUPABASE_URL, FAKE_URL);
      rmSync(dir, { recursive: true });
    });
  });
});
