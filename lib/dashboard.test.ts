import { describe, it, expect } from "vitest";
import { computeDashboardStats } from "@/lib/dashboard";

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
