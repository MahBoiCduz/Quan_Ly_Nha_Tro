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
  type: z.enum(["room", "elec_water", "both"]),
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
    z.array(lineItemSchema).min(0),
  ),
  // Meter readings + unit prices; the amount is derived (computeMeterAmount).
  // Optional with 0 default — hidden sections won't send these fields.
  electricityOld: z.number().min(0).optional().default(0),
  electricityNew: z.number().min(0).optional().default(0),
  electricityRate: z.number().int().min(0).optional().default(0),
  waterOld: z.number().min(0).optional().default(0),
  waterNew: z.number().min(0).optional().default(0),
  waterRate: z.number().int().min(0).optional().default(0),
});

// For creating a new bill: the due date can't be in the past. Meter readings
// must count up (only enforced for elec_water and both types). Line items
// are required for room and both types.
export const billGenerateSchema = billFieldsSchema
  // Room or both: must have at least 1 line item
  .refine((d) => d.type === "elec_water" || d.lineItems.length >= 1, {
    message: "Cần ít nhất 1 dòng tiền phòng/dịch vụ",
    path: ["lineItems"],
  })
  // Elec-water or both: meter readings must count up
  .refine((d) => d.type === "room" || d.electricityNew >= d.electricityOld, {
    message: "Số điện mới phải lớn hơn hoặc bằng số cũ",
    path: ["electricityNew"],
  })
  .refine((d) => d.type === "room" || d.waterNew >= d.waterOld, {
    message: "Số nước mới phải lớn hơn hoặc bằng số cũ",
    path: ["waterNew"],
  })
  // Due date must be today or later (all types)
  .refine((d) => d.dueDate >= vnToday(), {
    message: "Hạn thanh toán phải từ hôm nay trở đi",
    path: ["dueDate"],
  });

// For editing an existing bill: the due date may already be in the past,
// so only the type-conditional meter-reading and line-item checks apply.
export const billUpdateSchema = billFieldsSchema
  .refine((d) => d.type === "elec_water" || d.lineItems.length >= 1, {
    message: "Cần ít nhất 1 dòng tiền phòng/dịch vụ",
    path: ["lineItems"],
  })
  .refine((d) => d.type === "room" || d.electricityNew >= d.electricityOld, {
    message: "Số điện mới phải lớn hơn hoặc bằng số cũ",
    path: ["electricityNew"],
  })
  .refine((d) => d.type === "room" || d.waterNew >= d.waterOld, {
    message: "Số nước mới phải lớn hơn hoặc bằng số cũ",
    path: ["waterNew"],
  });

export type BillGenerateInput = z.infer<typeof billGenerateSchema>;
export type BillUpdateInput = z.infer<typeof billUpdateSchema>;
