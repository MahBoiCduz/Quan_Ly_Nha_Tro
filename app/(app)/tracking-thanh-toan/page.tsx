import { db } from "@/lib/db";
import { TrackingMatrix } from "./tracking-matrix";
export const dynamic = "force-dynamic";
export default async function TrackingPage() {
  const [units, bills] = await Promise.all([
    db.unit.findMany({ select: { id: true, name: true, floor: true }, orderBy: [{ floor: "asc" }, { name: "asc" }] }),
    db.bill.findMany({ include: { trackingPeriods: true, payments: { select: { amount: true } }, lease: { select: { unitId: true, tenant: { select: { fullName: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <TrackingMatrix units={units} bills={bills.map(b => ({ id: b.id, periodLabel: b.periodLabel, type: b.type, grandTotal: b.grandTotal, dueDate: b.dueDate.toISOString(), payments: b.payments, trackingPeriods: b.trackingPeriods.map(p => ({ month: p.month, category: p.category })), unitId: b.lease.unitId, tenantName: b.lease.tenant.fullName, leaseId: b.leaseId }))} />;
}
