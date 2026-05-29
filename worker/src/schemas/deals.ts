import { z } from "zod";

export const DEAL_STAGES = [
  "new_lead",
  "contacted",
  "consultation_booked",
  "documents_requested",
  "application_started",
  "submitted",
  "won",
  "lost",
] as const;

const dealStageSchema = z.enum(DEAL_STAGES);

export const createDealBodySchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  ownerId: z.string().uuid().optional(),
  expectedIntake: z.string().optional(),
  valueAmount: z.number().nonnegative().optional(),
  valueCurrency: z.string().optional(),
});

export const patchStageBodySchema = z
  .object({
    stage: dealStageSchema,
    lostReason: z.string().optional(),
  })
  .refine((data) => data.stage !== "lost" || !!data.lostReason?.trim(), {
    message: "lostReason is required when stage is lost",
    path: ["lostReason"],
  });

export const patchOwnerBodySchema = z.object({
  ownerId: z.string().uuid(),
});

export const postNoteBodySchema = z.object({
  body: z.string().min(1),
});

export type CreateDealBody = z.infer<typeof createDealBodySchema>;
export type PatchStageBody = z.infer<typeof patchStageBodySchema>;
export type PatchOwnerBody = z.infer<typeof patchOwnerBodySchema>;
export type PostNoteBody = z.infer<typeof postNoteBodySchema>;
