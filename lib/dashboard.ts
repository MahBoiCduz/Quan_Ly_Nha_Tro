import { billStatusFor } from "@/lib/billing";
import { dueStatus } from "@/lib/maintenance";

export function computeDashboardStats(
  input: {
    units: { status: string }[];
    bills: { grandTotal: number; dueDate: Date; payments: { amount: number }[] }[];
    schedules: { nextDueAt: Date }[];
  },
  now: Date = new Date(),
): { occupied: number; vacant: number; outstanding: number; overdueCount: number; maintenanceDueCount: number } {
  const occupied = input.units.filter((u) => u.status === "occupied").length;
  const vacant = input.units.length - occupied;

  let outstanding = 0;
  let overdueCount = 0;
  for (const b of input.bills) {
    const paid = b.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = b.grandTotal - paid;
    if (remaining > 0) outstanding += remaining;
    if (billStatusFor(b.grandTotal, paid, b.dueDate, now) === "overdue") overdueCount++;
  }

  const maintenanceDueCount = input.schedules.filter((s) => dueStatus(s.nextDueAt, now) !== "ok").length;

  return { occupied, vacant, outstanding, overdueCount, maintenanceDueCount };
}
