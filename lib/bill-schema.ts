import { z } from "zod";

export const billGenerateSchema = z.object({
  unitId: z.string().min(1),
  periodLabel: z.string().min(1),
  dueDate: z.string().min(1),
  electricityAmount: z.number().int().min(0),
  waterAmount: z.number().int().min(0),
});

export type BillGenerateInput = z.infer<typeof billGenerateSchema>;
