import { z } from "zod";

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
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
