import { z } from "zod";

export const serviceItemSchema = z.object({
  name: z.string().min(1),
  measureUnit: z.string().min(1),
  defaultPrice: z.number().int().min(0),
});

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
