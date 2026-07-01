"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveLease } from "@/lib/rooms";
import { buildDefaultLineItems, computeSubtotal, computeGrandTotal, computeMeterAmount } from "@/lib/billing";
import { billGenerateSchema } from "@/lib/bill-schema";

export async function generateBill(formData: FormData) {
  const parsed = billGenerateSchema.safeParse({
    unitId: formData.get("unitId"),
    periodLabel: formData.get("periodLabel"),
    dueDate: formData.get("dueDate"),
    billingProfileId: formData.get("billingProfileId") ?? undefined,
    electricityOld: Number(formData.get("electricityOld") ?? 0),
    electricityNew: Number(formData.get("electricityNew") ?? 0),
    electricityRate: Number(formData.get("electricityRate") ?? 0),
    waterOld: Number(formData.get("waterOld") ?? 0),
    waterNew: Number(formData.get("waterNew") ?? 0),
    waterRate: Number(formData.get("waterRate") ?? 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
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
  const electricityAmount = computeMeterAmount(d.electricityOld, d.electricityNew, d.electricityRate);
  const waterAmount = computeMeterAmount(d.waterOld, d.waterNew, d.waterRate);
  const grandTotal = computeGrandTotal(subtotal, electricityAmount, waterAmount);

  const bill = await db.bill.create({
    data: {
      leaseId: lease.id,
      periodLabel: d.periodLabel,
      dueDate: new Date(d.dueDate),
      lineItems,
      electricityAmount,
      waterAmount,
      electricityOld: d.electricityOld,
      electricityNew: d.electricityNew,
      electricityRate: d.electricityRate,
      waterOld: d.waterOld,
      waterNew: d.waterNew,
      waterRate: d.waterRate,
      subtotal,
      grandTotal,
      status: "unpaid",
      billingProfileId: d.billingProfileId || null,
    },
  });

  revalidatePath("/hoa-don");
  redirect(`/hoa-don/${bill.id}`);
}

export async function deleteBill(id: string) {
  const bill = await db.bill.findUnique({
    where: { id },
    include: { lease: { select: { unitId: true } } },
  });
  if (!bill) return { error: "Không tìm thấy hóa đơn" };
  // Delete the bill's payments first (no cascade on the relation), then the bill.
  await db.$transaction([
    db.payment.deleteMany({ where: { billId: id } }),
    db.bill.delete({ where: { id } }),
  ]);
  revalidatePath("/hoa-don");
  revalidatePath("/so-sach");
  revalidatePath(`/phong/${bill.lease.unitId}`);
  return { ok: true };
}
