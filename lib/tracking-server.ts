import type { Prisma } from "@prisma/client";
import { trackingInputSchema, trackingPeriods, withinLease } from "./tracking";

export function parseTracking(formData: FormData, type: string) {
  const json = (name: string): unknown => {
    try { return JSON.parse(String(formData.get(name) ?? "[]")); } catch { return null; }
  };
  return trackingInputSchema.safeParse({ type, roomMonths: json("roomMonths"), utilityMonths: json("utilityMonths") });
}
export async function replaceTracking(tx: Prisma.TransactionClient, billId: string, input: { type: "room" | "elec_water" | "both"; roomMonths: string[]; utilityMonths: string[] }) {
  const bill = await tx.bill.findUniqueOrThrow({ where: { id: billId }, include: { lease: true } });
  if (bill.type !== input.type) throw new Error("Kỳ chưa được lưu vì loại hóa đơn đã thay đổi. Vui lòng tải lại.");
  const periods = trackingPeriods(input);
  if (!withinLease(periods, bill.lease.startDate, bill.lease.endDate)) throw new Error("Kỳ ghi nhận phải nằm trong thời gian hợp đồng.");
  const conflict = await tx.billTrackingPeriod.findFirst({ where: { leaseId: bill.leaseId, billId: { not: billId }, OR: periods.map(p => ({ month: p.month, category: p.category })) } });
  if (conflict) throw new Error("Kỳ này đã có hóa đơn. Vui lòng kiểm tra hóa đơn cũ.");
  await tx.billTrackingPeriod.deleteMany({ where: { billId } });
  await tx.billTrackingPeriod.createMany({ data: periods.map(p => ({ ...p, billId, leaseId: bill.leaseId })) });
}
export function trackingError(error: unknown): string {
  if (error instanceof Error && (error.message.includes("Kỳ") || error.message.includes("hợp đồng"))) return error.message;
  return "Không thể lưu kỳ ghi nhận. Kỳ có thể vừa được ghi nhận trên hóa đơn khác; vui lòng tải lại và kiểm tra.";
}
