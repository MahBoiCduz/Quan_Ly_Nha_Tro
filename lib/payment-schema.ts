import { z } from "zod";

// Cap how many receipt photos one payment can carry (UI uploads them one by one).
export const MAX_RECEIPT_IMAGES = 10;

export const paymentSchema = z.object({
  amount: z.number().int().positive(),
  paidAt: z.string().min(1),
  method: z.enum(["cash", "bank_transfer"]),
  confirmedBy: z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.string().optional(),
  ),
  notes: z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.string().optional(),
  ),
  // Sent by the form as a JSON string: an array of already-uploaded image URLs.
  receiptImages: z.preprocess(
    (v) => {
      if (v == null || v === "") return [];
      if (typeof v !== "string") return v;
      try { return JSON.parse(v); } catch { return undefined; }
    },
    z.array(z.string().trim().min(1)).max(MAX_RECEIPT_IMAGES),
  ),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
