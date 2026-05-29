import { describe, expect, it } from "vitest";
import { corsOrigins } from "./corsOrigins";

describe("corsOrigins", () => {
  it("includes local dev origins by default", () => {
    const origins = corsOrigins({
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
    });
    expect(origins).toContain("http://localhost:5173");
    expect(origins).toContain("http://127.0.0.1:5173");
  });

  it("appends comma-separated production origins", () => {
    const origins = corsOrigins({
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
      CORS_ORIGINS: "https://app.example.com, https://pages.dev ",
    });
    expect(origins).toContain("https://app.example.com");
    expect(origins).toContain("https://pages.dev");
  });
});
