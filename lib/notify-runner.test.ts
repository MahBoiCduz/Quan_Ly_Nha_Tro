import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { runNotifications } from "@/lib/notify-runner";

function makeDb() {
  return {
    setting: { findUnique: vi.fn().mockResolvedValue({ adminZaloUserId: "admin-zalo" }) },
    bill: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "b1", periodLabel: "Tháng 6/2026", dueDate: new Date("2026-06-05"), grandTotal: 5000000,
          payments: [], lease: { unit: { name: "Phòng 301" } },
        },
      ]),
    },
    maintenanceSchedule: {
      findMany: vi.fn().mockResolvedValue([
        { id: "s1", name: "Vệ sinh bể nước", nextDueAt: new Date("2026-06-01") },
      ]),
    },
    notificationLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("runNotifications", () => {
  it("sends planned notifications and logs their keys", async () => {
    const db = makeDb();
    const send = vi.fn().mockResolvedValue({ ok: true });
    const res = await runNotifications({ db: db as unknown as PrismaClient, send, now: new Date("2026-06-10") });

    expect(send).toHaveBeenCalledTimes(2); // 1 overdue bill + 1 due schedule
    expect(db.notificationLog.create).toHaveBeenCalledTimes(2);
    expect(res.sent).toBe(2);
  });

  it("skips when no admin Zalo id is configured", async () => {
    const db = makeDb();
    db.setting.findUnique = vi.fn().mockResolvedValue({ adminZaloUserId: null });
    const send = vi.fn();
    const res = await runNotifications({ db: db as unknown as PrismaClient, send, now: new Date("2026-06-10") });
    expect(send).not.toHaveBeenCalled();
    expect(res.skipped).toContain("Zalo");
  });
});
