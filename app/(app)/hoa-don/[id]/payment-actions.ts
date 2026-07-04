import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { billStatusFor } from "@/lib/billing";
import { paymentSchema } from "@/lib/payment-schema";

export function totalPaid(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export async function recordPayment(billId: string, formData: FormData) {
  "use server";
  const parsed = paymentSchema.safeParse({
    amount: Number(formData.get("amount") ?? 0),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    confirmedBy: formData.get("confirmedBy"),
    notes: formData.get("notes"),
    receiptImages: formData.get("receiptImages"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  // Create the payment and recompute the bill's cached status in one transaction
  // so two concurrent payments can't race and leave the status stale.
  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        billId,
        amount: d.amount,
        paidAt: new Date(d.paidAt),
        method: d.method,
        confirmedBy: d.confirmedBy ?? null,
        notes: d.notes ?? null,
        receiptImages: d.receiptImages,
      },
    });

    const bill = await tx.bill.findUnique({ where: { id: billId }, include: { payments: true } });
    if (bill) {
      const status = billStatusFor(bill.grandTotal, totalPaid(bill.payments), bill.dueDate);
      await tx.bill.update({ where: { id: billId }, data: { status } });
    }
  });

  revalidatePath(`/hoa-don/${billId}`);
  revalidatePath("/hoa-don");
  return { ok: true };
}
