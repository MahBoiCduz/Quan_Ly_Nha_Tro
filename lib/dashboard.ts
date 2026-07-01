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

// Total collected per month for the last `count` months (oldest → newest, current
// month last). Used by the dashboard "tiền thu hàng tháng" panel.
export function monthlyRevenue(
  payments: { amount: number; paidAt: Date }[],
  now: Date = new Date(),
  count = 6,
): { key: string; label: string; total: number }[] {
  const months = Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `Th${d.getMonth() + 1}/${d.getFullYear()}`,
      total: 0,
    };
  });
  const idx = new Map(months.map((m, i) => [m.key, i]));
  for (const p of payments) {
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
    const i = idx.get(key);
    if (i != null) months[i].total += p.amount;
  }
  return months;
}
