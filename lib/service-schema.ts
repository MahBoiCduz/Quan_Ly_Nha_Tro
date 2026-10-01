import { z } from "zod";

export const serviceItemSchema = z.object({
  name: z.string().min(1),
  measureUnit: z.string().min(1),
  defaultPrice: z.number().int().min(0),
  /** true = số lượng lấy theo số người ở của phòng, bỏ qua `defaultQuantity`. */
  perPerson: z.boolean().default(false),
  /** Số lượng mặc định theo đơn vị (số xe, số phòng…) khi KHÔNG tính theo số người. 0 = không sinh dòng trên hoá đơn. */
  defaultQuantity: z.number().int().min(0).default(1),
});

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
