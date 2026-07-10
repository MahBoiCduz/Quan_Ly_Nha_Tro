import { z } from "zod";

// Today's date as "YYYY-MM-DD" in Vietnam time, so the due-date check matches the
// user's local day regardless of where the server runs. "YYYY-MM-DD" strings sort
// lexicographically, so a plain >= comparison is correct.
export function vnToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

const lineItemSchema = z.object({
  name: z.string().trim().min(1),
  measureUnit: z.string().optional().default(""),
  unitPrice: z.number().min(0),
  quantity: z.number().min(0),
});

// Shared base shape: fields that both generate and update accept.
const billFieldsSchema = z.object({
  unitId: z.string().min(1),
  periodLabel: z.string().min(1),
  dueDate: z.string().min(1),
  // "" = use the room's default / the global Setting profile.
  billingProfileId: z.string().optional(),
  // Editable rent + service rows from the form, sent as a JSON string.
  lineItems: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      try { return JSON.parse(v); } catch { return undefined; }
    },
    z.array(lineItemSchema).min(1),
  ),
  // Meter readings + unit prices; the amount is derived (computeMeterAmount).
  electricityOld: z.number().min(0),
  electricityNew: z.number().min(0),
  electricityRate: z.number().int().min(0),
  waterOld: z.number().min(0),
  waterNew: z.number().min(0),
  waterRate: z.number().int().min(0),
});

// Minimal type for the meter-reading fields that the refine callbacks access.
type MeterReadings = {
  electricityOld: number;
  electricityNew: number;
  waterOld: number;
  waterNew: number;
};

// Shared meter-reading refinements used by both generate and update.
function addMeterRefinements<T extends z.ZodTypeAny>(schema: T) {
  return schema
    // A meter only counts up: the new reading can't be below the old one
    // (equal = no usage, which is allowed).
    .refine((d: MeterReadings) => d.electricityNew >= d.electricityOld, {
      message: "Số điện mới phải lớn hơn hoặc bằng số cũ",
      path: ["electricityNew"],
    })
    .refine((d: MeterReadings) => d.waterNew >= d.waterOld, {
      message: "Số nước mới phải lớn hơn hoặc bằng số cũ",
      path: ["waterNew"],
    });
}

// For creating a new bill: the due date can't be in the past.
export const billGenerateSchema = addMeterRefinements(billFieldsSchema).refine(
  (d) => d.dueDate >= vnToday(),
  {
    message: "Hạn thanh toán phải từ hôm nay trở đi",
    path: ["dueDate"],
  },
);

// For editing an existing bill: the due date may already be in the past,
// so only the meter-reading checks apply.
export const billUpdateSchema = addMeterRefinements(billFieldsSchema);

export type BillGenerateInput = z.infer<typeof billGenerateSchema>;
export type BillUpdateInput = z.infer<typeof billUpdateSchema>;
