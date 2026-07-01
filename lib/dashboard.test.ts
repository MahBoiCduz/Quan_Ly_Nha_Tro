import { describe, it, expect } from "vitest";
import { computeDashboardStats, monthlyRevenue } from "@/lib/dashboard";

describe("computeDashboardStats", () => {
  const now = new Date("2026-06-10");
  it("counts occupancy, outstanding, overdue, and due maintenance", () => {
    const stats = computeDashboardStats({
      units: [{ status: "occupied" }, { status: "occupied" }, { status: "vacant" }],
      bills: [
        // overdue, partially paid: outstanding 3,000,000
        { grandTotal: 5000000, dueDate: new Date("2026-06-05"), payments: [{ amount: 2000000 }] },
        // paid in full: no outstanding, not overdue
        { grandTotal: 1000000, dueDate: new Date("2026-06-05"), payments: [{ amount: 1000000 }] },
      ],
      schedules: [
        { nextDueAt: new Date("2026-06-09") }, // overdue → counts
        { nextDueAt: new Date("2026-06-12") }, // due_soon → counts
        { nextDueAt: new Date("2026-08-01") }, // ok → no
      ],
    }, now);

    expect(stats).toEqual({
      occupied: 2, vacant: 1, outstanding: 3000000, overdueCount: 1, maintenanceDueCount: 2,
    });
  });
});

describe("monthlyRevenue", () => {
  const now = new Date("2026-06-10");
  it("sums payments into the last N months, current month last", () => {
    const months = monthlyRevenue(
      [
        { amount: 1000000, paidAt: new Date("2026-06-03") }, // this month
        { amount: 500000, paidAt: new Date("2026-06-28") },  // this month
        { amount: 700000, paidAt: new Date("2026-05-15") },  // last month
        { amount: 999000, paidAt: new Date("2025-01-01") },  // out of range → ignored
      ],
      now,
      6,
    );
    expect(months).toHaveLength(6);
    expect(months[months.length - 1]).toEqual({ key: "2026-06", label: "Th6/2026", total: 1500000 });
    expect(months[months.length - 2].total).toBe(700000);
    expect(months[0].key).toBe("2026-01");
  });
});
