"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveLease } from "@/lib/rooms";
import { buildDefaultLineItems, computeSubtotal, computeGrandTotal } from "@/lib/billing";
import { billGenerateSchema } from "@/lib/bill-schema";

export async function generateBill(formData: FormData) {
  const parsed = billGenerateSchema.safeParse({
    unitId: formData.get("unitId"),
    periodLabel: formData.get("periodLabel"),
    dueDate: formData.get("dueDate"),
    electricityAmount: Number(formData.get("electricityAmount") ?? 0),
    waterAmount: Number(formData.get("waterAmount") ?? 0),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  const unit = await db.unit.findUnique({
    where: { id: d.unitId },
    include: { serviceItems: true, leases: true },
  });
  if (!unit) return { error: "Không tìm thấy phòng" };

  const lease = getActiveLease(unit.leases);
  if (!lease) return { error: "Phòng chưa có hợp đồng đang hiệu lực" };

  const lineItems = buildDefaultLineItems(unit.serviceItems, lease.agreedRent);
  const subtotal = computeSubtotal(lineItems);
  const grandTotal = computeGrandTotal(subtotal, d.electricityAmount, d.waterAmount);

  const bill = await db.bill.create({
    data: {
      leaseId: lease.id,
      periodLabel: d.periodLabel,
      dueDate: new Date(d.dueDate),
      lineItems,
      electricityAmount: d.electricityAmount,
      waterAmount: d.waterAmount,
      subtotal,
      grandTotal,
      status: "unpaid",
    },
  });

  revalidatePath("/hoa-don");
  redirect(`/hoa-don/${bill.id}`);
}
