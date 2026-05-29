import assert from "node:assert/strict";
import test from "node:test";
import { mergeUriAllowList } from "./supabase-auth-config.mjs";

test("mergeUriAllowList preserves existing and adds origins", () => {
  const merged = mergeUriAllowList("https://old.example.com\nhttps://a.pages.dev", [
    "https://sinc-crm-esg.pages.dev",
    "http://localhost:5173",
  ]);
  assert.ok(merged.includes("https://old.example.com"));
  assert.ok(merged.includes("https://sinc-crm-esg.pages.dev"));
  assert.ok(merged.includes("http://localhost:5173"));
});
