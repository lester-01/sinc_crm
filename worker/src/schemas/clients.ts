import { z } from "zod";

export const createClientBodySchema = z.object({
  fullName: z.string().min(1, "fullName is required"),
  email: z.string().email("valid email required"),
  phone: z.string().optional(),
  country: z.string().optional(),
  targetCountry: z.string().optional(),
});

export type CreateClientBody = z.infer<typeof createClientBodySchema>;
