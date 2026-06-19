import { describe, it, expect } from "vitest";
import {
  overdueKey, maintenanceKey, buildOverdueMessage, buildMaintenanceMessage, pendingNotifications,
} from "@/lib/notifications";

describe("keys", () => {
  it("builds an overdue key", () => expect(overdueKey("b1")).toBe("bill-overdue:b1"));
  it("builds a date-stamped maintenance key", () =>
    expect(maintenanceKey("s1", "2026-06-15")).toBe("maint-due:s1:2026-06-15"));
});

describe("messages", () => {
  it("formats the overdue message", () => {
    const msg = buildOverdueMessage("Phòng 301", "Tháng 6/2026", new Date("2026-06-05"));
    expect(msg).toContain("Phòng 301");
    expect(msg).toContain("Tháng 6/2026");
  });
  it("formats the maintenance message", () => {
    expect(buildMaintenanceMessage("Vệ sinh bể nước")).toContain("Vệ sinh bể nước");
  });
});

describe("pendingNotifications", () => {
  const now = new Date("2026-06-10");
  it("plans overdue bills and due schedules, skipping already-sent keys", () => {
    const planned = pendingNotifications({
      overdueBills: [
        { id: "b1", unitName: "Phòng 301", periodLabel: "Tháng 6/2026", dueDate: new Date("2026-06-05") },
        { id: "b2", unitName: "Phòng 302", periodLabel: "Tháng 6/2026", dueDate: new Date("2026-06-05") },
      ],
      dueSchedules: [
        { id: "s1", name: "Vệ sinh bể nước", nextDueAt: new Date("2026-06-09") },
      ],
      sentKeys: new Set(["bill-overdue:b2"]),
    }, now);

    const keys = planned.map((p) => p.key);
    expect(keys).toContain("bill-overdue:b1");
    expect(keys).not.toContain("bill-overdue:b2"); // already sent
    expect(keys).toContain("maint-due:s1:2026-06-09");
  });

  it("skips schedules not yet due", () => {
    const planned = pendingNotifications({
      overdueBills: [],
      dueSchedules: [{ id: "s2", name: "x", nextDueAt: new Date("2026-06-20") }],
      sentKeys: new Set(),
    }, now);
    expect(planned).toHaveLength(0);
  });
});
