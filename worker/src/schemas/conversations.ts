import { z } from "zod";

export const createConversationSchema = z.object({
  clientId: z.string().uuid(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

export const assignConversationSchema = z.object({
  assignedTo: z.string().uuid(),
});

export const patchStatusSchema = z.object({
  status: z.enum(["open", "pending", "closed"]),
});

export const postMessageSchema = z.object({
  body: z.string().min(1),
});

export type CreateConversationBody = z.infer<typeof createConversationSchema>;
export type AssignConversationBody = z.infer<typeof assignConversationSchema>;
export type PatchStatusBody = z.infer<typeof patchStatusSchema>;
export type PostMessageBody = z.infer<typeof postMessageSchema>;
