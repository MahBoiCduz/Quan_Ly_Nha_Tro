"use server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentOrUpcomingLease } from "@/lib/rooms";
import type { TrackingContext } from "@/lib/tracking";
import { parseTracking, replaceTracking, trackingError } from "@/lib/tracking-server";
import { revalidatePath } from "next/cache";

export async function loadTrackingContext(unitId: string, billId?: string): Promise<{ context?: TrackingContext; error?: string }> {
  if (!(await auth())?.user) return { error: "Vui lòng đăng nhập lại." };
  const bill = billId ? await db.bill.findUnique({ where: { id: billId }, include: { lease: true } }) : null;
  const leases = bill ? [] : await db.lease.findMany({ where: { unitId } });
  const lease = bill?.lease ?? getCurrentOrUpcomingLease(leases);
  if (!lease || lease.unitId !== unitId) return { error: "Không tìm thấy hợp đồng của phòng." };
  const [tenant, bills] = await Promise.all([
    db.tenant.findUniqueOrThrow({ where: { id: lease.tenantId } }),
    db.bill.findMany({ where: { leaseId: lease.id }, include: { trackingPeriods: true, payments: { select: { amount: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return { context: { leaseId: lease.id, tenantName: tenant.fullName, startDate: lease.startDate.toISOString(), endDate: lease.endDate?.toISOString() ?? null, bills: bills.map(b => ({ id: b.id, periodLabel: b.periodLabel, type: b.type, grandTotal: b.grandTotal, dueDate: b.dueDate.toISOString(), payments: b.payments, trackingPeriods: b.trackingPeriods.map(p => ({ month: p.month, category: p.category })), electricityNew: b.electricityNew, waterNew: b.waterNew })) } };
}
export async function assignTracking(billId: string, formData: FormData) {
  if (!(await auth())?.user) return { error: "Vui lòng đăng nhập lại." };
  const bill = await db.bill.findUnique({ where: { id: billId } });
  if (!bill) return { error: "Không tìm thấy hóa đơn." };
  const parsed = parseTracking(formData, bill.type);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kỳ không hợp lệ." };
  try { await db.$transaction(tx => replaceTracking(tx, billId, parsed.data)); } catch (error) { return { error: trackingError(error) }; }
  revalidatePath("/tracking-thanh-toan");
  revalidatePath(`/hoa-don/${billId}`);
  revalidatePath("/hoa-don");
  return { ok: true };
}
