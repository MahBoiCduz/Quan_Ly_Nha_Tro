import { z } from "zod";

export const leaseSchema = z.object({
  tenantId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  agreedRent: z.number().int().min(0),
  billingCycle: z.enum(["monthly", "quarterly", "custom"]),
  depositAmount: z.number().int().min(0),
  depositCollectedAt: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  depositCollectedBy: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
});

export type LeaseInput = z.infer<typeof leaseSchema>;
