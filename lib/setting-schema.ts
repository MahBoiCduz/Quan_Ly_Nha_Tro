import { z } from "zod";

const optionalStr = z.preprocess(
  // formData.get() returns null for absent fields — treat null like "" → undefined.
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional(),
);

export const settingSchema = z.object({
  bankAccountName: optionalStr,
  bankAccountNo: optionalStr,
  bankName: optionalStr,
  qrImageUrl: optionalStr,
  invoiceNotes: optionalStr,
  adminZaloUserId: optionalStr,
});

export type SettingInput = z.infer<typeof settingSchema>;
