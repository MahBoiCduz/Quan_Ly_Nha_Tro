import { z } from "zod";

const optionalStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

export const maintenanceSchema = z
  .object({
    name: z.string().min(1),
    scope: z.enum(["building", "unit"]),
    unitId: optionalStr,
    intervalDays: z.number().int().positive(),
    startDate: z.string().min(1),
    notes: optionalStr,
  })
  .refine((d) => d.scope !== "unit" || !!d.unitId, {
    message: "Cần chọn phòng khi phạm vi là phòng",
    path: ["unitId"],
  });

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
