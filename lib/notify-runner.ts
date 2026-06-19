import type { PrismaClient } from "@prisma/client";
import { billStatusFor } from "@/lib/billing";
import { pendingNotifications } from "@/lib/notifications";

type SendFn = (userId: string, text: string) => Promise<{ ok: boolean; error?: string }>;

export async function runNotifications(deps: {
  db: PrismaClient;
  send: SendFn;
  now?: Date;
}): Promise<{ sent: number; failed: number; skipped: string }> {
  const { db, send } = deps;
  const now = deps.now ?? new Date();

  const setting = await db.setting.findUnique({ where: { id: "singleton" } });
  const adminZalo = setting?.adminZaloUserId;
  if (!adminZalo) return { sent: 0, failed: 0, skipped: "Chưa cấu hình Zalo admin" };

  // Overdue bills: not fully paid and past due date.
  const billRows = await db.bill.findMany({
    where: { status: { not: "paid" } },
    include: { payments: true, lease: { include: { unit: true } } },
  });
  const overdueBills = billRows
    .filter((b) => {
      const paid = b.payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
      return billStatusFor(b.grandTotal, paid, b.dueDate, now) === "overdue";
    })
    .map((b) => ({ id: b.id, unitName: b.lease.unit.name, periodLabel: b.periodLabel, dueDate: b.dueDate }));

  const dueSchedules = (await db.maintenanceSchedule.findMany()).map((s) => ({
    id: s.id, name: s.name, nextDueAt: s.nextDueAt,
  }));

  const sentRows = await db.notificationLog.findMany();
  const sentKeys = new Set(sentRows.map((r: { key: string }) => r.key));

  const planned = pendingNotifications({ overdueBills, dueSchedules, sentKeys }, now);

  let sent = 0;
  let failed = 0;
  for (const n of planned) {
    const res = await send(adminZalo, n.text);
    if (res.ok) {
      await db.notificationLog.create({ data: { key: n.key } });
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, skipped: "" };
}
