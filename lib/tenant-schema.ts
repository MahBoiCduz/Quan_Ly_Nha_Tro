import { z } from "zod";

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

export const tenantSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  idCardNumber: optionalStr,
  idCardFrontImageUrl: optionalStr,
  idCardBackImageUrl: optionalStr,
  vehiclePlate: optionalStr,
  zaloId: optionalStr,
  notes: optionalStr,
});

export type TenantInput = z.infer<typeof tenantSchema>;
