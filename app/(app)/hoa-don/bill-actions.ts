"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveLease } from "@/lib/rooms";
import { normalizeLineItems, computeSubtotal, computeGrandTotal, computeMeterAmount } from "@/lib/billing";
import { billGenerateSchema, billUpdateSchema } from "@/lib/bill-schema";

export async function generateBill(formData: FormData) {
  const parsed = billGenerateSchema.safeParse({
    type: formData.get("type") ?? undefined,
    unitId: formData.get("unitId"),
    periodLabel: formData.get("periodLabel"),
    dueDate: formData.get("dueDate"),
    billingProfileId: formData.get("billingProfileId") ?? undefined,
    lineItems: formData.get("lineItems"),
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

  // Totals are recomputed from the submitted quantity × unitPrice, never trusted.
  // Gate computations on type: elec_water skips line items, room skips meters.
  const lineItems = d.type === "elec_water" ? [] : normalizeLineItems(d.lineItems);
  const subtotal = d.type === "elec_water" ? 0 : computeSubtotal(lineItems);
  const electricityAmount = d.type === "room" ? 0 : computeMeterAmount(d.electricityOld, d.electricityNew, d.electricityRate);
  const waterAmount = d.type === "room" ? 0 : computeMeterAmount(d.waterOld, d.waterNew, d.waterRate);
  const grandTotal = computeGrandTotal(subtotal, electricityAmount, waterAmount);

  const bill = await db.bill.create({
    data: {
      type: d.type,
      leaseId: lease.id,
      periodLabel: d.periodLabel,
      dueDate: new Date(d.dueDate),
      lineItems,
      electricityAmount,
      waterAmount,
      // Store null for inapplicable readings so they don't appear as 0s.
      electricityOld: d.type === "room" ? null : d.electricityOld,
      electricityNew: d.type === "room" ? null : d.electricityNew,
      electricityRate: d.type === "room" ? null : d.electricityRate,
      waterOld: d.type === "room" ? null : d.waterOld,
      waterNew: d.type === "room" ? null : d.waterNew,
      waterRate: d.type === "room" ? null : d.waterRate,
      subtotal,
      grandTotal,
      status: "unpaid",
      billingProfileId: d.billingProfileId || null,
    },
  });

  revalidatePath("/hoa-don");
  redirect(`/hoa-don/${bill.id}`);
}

export async function updateBill(billId: string, formData: FormData) {
  const parsed = billUpdateSchema.safeParse({
    type: formData.get("type") ?? undefined,
    unitId: formData.get("unitId"),
    periodLabel: formData.get("periodLabel"),
    dueDate: formData.get("dueDate"),
    billingProfileId: formData.get("billingProfileId") ?? undefined,
    lineItems: formData.get("lineItems"),
    electricityOld: Number(formData.get("electricityOld") ?? 0),
    electricityNew: Number(formData.get("electricityNew") ?? 0),
    electricityRate: Number(formData.get("electricityRate") ?? 0),
    waterOld: Number(formData.get("waterOld") ?? 0),
    waterNew: Number(formData.get("waterNew") ?? 0),
    waterRate: Number(formData.get("waterRate") ?? 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  const bill = await db.bill.findUnique({
    where: { id: billId },
    include: { payments: true, lease: { select: { unitId: true } } },
  });
  if (!bill) return { error: "Không tìm thấy hóa đơn" };

  // Once money is recorded or the bill is fully paid, lock it from editing.
  if (bill.status === "paid") return { error: "Hóa đơn đã thanh toán, không thể sửa" };
  if (bill.payments.length > 0) return { error: "Hóa đơn đã có thanh toán, không thể sửa" };

  // Totals are recomputed from the submitted data — never trusted.
  // Gate computations on type: elec_water skips line items, room skips meters.
  const lineItems = d.type === "elec_water" ? [] : normalizeLineItems(d.lineItems);
  const subtotal = d.type === "elec_water" ? 0 : computeSubtotal(lineItems);
  const electricityAmount = d.type === "room" ? 0 : computeMeterAmount(d.electricityOld, d.electricityNew, d.electricityRate);
  const waterAmount = d.type === "room" ? 0 : computeMeterAmount(d.waterOld, d.waterNew, d.waterRate);
  const grandTotal = computeGrandTotal(subtotal, electricityAmount, waterAmount);

  await db.bill.update({
    where: { id: billId },
    data: {
      type: d.type,
      periodLabel: d.periodLabel,
      dueDate: new Date(d.dueDate),
      lineItems,
      electricityAmount,
      waterAmount,
      // Store null for inapplicable readings so they don't appear as 0s.
      electricityOld: d.type === "room" ? null : d.electricityOld,
      electricityNew: d.type === "room" ? null : d.electricityNew,
      electricityRate: d.type === "room" ? null : d.electricityRate,
      waterOld: d.type === "room" ? null : d.waterOld,
      waterNew: d.type === "room" ? null : d.waterNew,
      waterRate: d.type === "room" ? null : d.waterRate,
      subtotal,
      grandTotal,
      status: "unpaid",
      billingProfileId: d.billingProfileId || null,
    },
  });

  revalidatePath("/hoa-don");
  revalidatePath(`/hoa-don/${billId}`);
  revalidatePath("/so-sach");
  revalidatePath(`/phong/${bill.lease.unitId}`);
  redirect(`/hoa-don/${billId}`);
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
