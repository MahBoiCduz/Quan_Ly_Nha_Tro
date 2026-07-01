import { z } from "zod";

// Today's date as "YYYY-MM-DD" in Vietnam time, so the due-date check matches the
// user's local day regardless of where the server runs. "YYYY-MM-DD" strings sort
// lexicographically, so a plain >= comparison is correct.
export function vnToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export const billGenerateSchema = z
  .object({
    unitId: z.string().min(1),
    periodLabel: z.string().min(1),
    dueDate: z.string().min(1),
    // "" = use the room's default / the global Setting profile.
    billingProfileId: z.string().optional(),
    // Meter readings + unit prices; the amount is derived (computeMeterAmount).
    electricityOld: z.number().min(0),
    electricityNew: z.number().min(0),
    electricityRate: z.number().int().min(0),
    waterOld: z.number().min(0),
    waterNew: z.number().min(0),
    waterRate: z.number().int().min(0),
  })
  // A meter only counts up: the new reading can't be below the old one
  // (equal = no usage, which is allowed).
  .refine((d) => d.electricityNew >= d.electricityOld, {
    message: "Số điện mới phải lớn hơn hoặc bằng số cũ",
    path: ["electricityNew"],
  })
  .refine((d) => d.waterNew >= d.waterOld, {
    message: "Số nước mới phải lớn hơn hoặc bằng số cũ",
    path: ["waterNew"],
  })
  // The due date can't be in the past.
  .refine((d) => d.dueDate >= vnToday(), {
    message: "Hạn thanh toán phải từ hôm nay trở đi",
    path: ["dueDate"],
  });

export type BillGenerateInput = z.infer<typeof billGenerateSchema>;
