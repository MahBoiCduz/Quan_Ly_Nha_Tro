import { z } from "zod";

export const billGenerateSchema = z.object({
  unitId: z.string().min(1),
  periodLabel: z.string().min(1),
  dueDate: z.string().min(1),
  // Meter readings + unit prices; the amount is derived (computeMeterAmount).
  electricityOld: z.number().min(0),
  electricityNew: z.number().min(0),
  electricityRate: z.number().int().min(0),
  waterOld: z.number().min(0),
  waterNew: z.number().min(0),
  waterRate: z.number().int().min(0),
});

export type BillGenerateInput = z.infer<typeof billGenerateSchema>;
