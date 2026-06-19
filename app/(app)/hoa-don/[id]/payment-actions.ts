import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { billStatusFor } from "@/lib/billing";
import { z } from "zod";

export function totalPaid(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

const paymentSchema = z.object({
  amount: z.number().int().positive(),
  paidAt: z.string().min(1),
  method: z.enum(["cash", "bank_transfer"]),
  confirmedBy: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
  receiptImageUrl: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
});

export async function recordPayment(billId: string, formData: FormData) {
  "use server";
  const parsed = paymentSchema.safeParse({
    amount: Number(formData.get("amount") ?? 0),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    confirmedBy: formData.get("confirmedBy"),
    notes: formData.get("notes"),
    receiptImageUrl: formData.get("receiptImageUrl"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  await db.payment.create({
    data: {
      billId,
      amount: d.amount,
      paidAt: new Date(d.paidAt),
      method: d.method,
      confirmedBy: d.confirmedBy ?? null,
      notes: d.notes ?? null,
      receiptImageUrl: d.receiptImageUrl ?? null,
    },
  });

  const bill = await db.bill.findUnique({ where: { id: billId }, include: { payments: true } });
  if (bill) {
    const status = billStatusFor(bill.grandTotal, totalPaid(bill.payments), bill.dueDate);
    await db.bill.update({ where: { id: billId }, data: { status } });
  }

  revalidatePath(`/hoa-don/${billId}`);
  revalidatePath("/hoa-don");
  return { ok: true };
}
