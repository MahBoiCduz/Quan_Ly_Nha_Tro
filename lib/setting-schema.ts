import { z } from "zod";

const optionalInt = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : Number(v)),
  z.number().int().min(0).optional(),
);

// Operational config only. The payment fields (bank account / QR / notes) now
// live on the default BillingProfile and are validated by profileSchema.
export const settingSchema = z.object({
  defaultElectricityRate: optionalInt,
  defaultWaterRate: optionalInt,
});

export type SettingInput = z.infer<typeof settingSchema>;
