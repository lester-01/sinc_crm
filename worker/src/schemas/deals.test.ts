import { describe, expect, it } from "vitest";
import {
  createDealBodySchema,
  patchOwnerBodySchema,
  patchStageBodySchema,
  postNoteBodySchema,
} from "./deals";

describe("deals schemas", () => {
  it("accepts valid create deal body", () => {
    const result = createDealBodySchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Canada application",
    });
    expect(result.success).toBe(true);
  });

  it("rejects create deal without title", () => {
    const result = createDealBodySchema.safeParse({
      clientId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("requires lostReason when stage is lost", () => {
    const result = patchStageBodySchema.safeParse({ stage: "lost" });
    expect(result.success).toBe(false);
  });

  it("accepts lost stage with lostReason", () => {
    const result = patchStageBodySchema.safeParse({
      stage: "lost",
      lostReason: "Chose another agency",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid owner patch", () => {
    const result = patchOwnerBodySchema.safeParse({
      ownerId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty note body", () => {
    const result = postNoteBodySchema.safeParse({ body: "" });
    expect(result.success).toBe(false);
  });
});
