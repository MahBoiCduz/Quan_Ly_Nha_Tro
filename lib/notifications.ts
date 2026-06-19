import { isDue } from "@/lib/maintenance";

export function overdueKey(billId: string): string {
  return `bill-overdue:${billId}`;
}

export function maintenanceKey(scheduleId: string, dueIso: string): string {
  return `maint-due:${scheduleId}:${dueIso}`;
}

export function buildOverdueMessage(unitName: string, periodLabel: string, dueDate: Date): string {
  return `${unitName} chưa thanh toán hóa đơn ${periodLabel}. Hạn: ${dueDate.toLocaleDateString("vi-VN")}.`;
}

export function buildMaintenanceMessage(name: string): string {
  return `${name} đến hạn thực hiện hôm nay.`;
}

export type PlannedNotification = { key: string; text: string };

type OverdueBill = { id: string; unitName: string; periodLabel: string; dueDate: Date };
type DueSchedule = { id: string; name: string; nextDueAt: Date };

export function pendingNotifications(
  input: { overdueBills: OverdueBill[]; dueSchedules: DueSchedule[]; sentKeys: Set<string> },
  now: Date = new Date(),
): PlannedNotification[] {
  const out: PlannedNotification[] = [];

  for (const b of input.overdueBills) {
    const key = overdueKey(b.id);
    if (!input.sentKeys.has(key)) {
      out.push({ key, text: buildOverdueMessage(b.unitName, b.periodLabel, b.dueDate) });
    }
  }

  for (const s of input.dueSchedules) {
    if (!isDue(s.nextDueAt, now)) continue;
    const dueIso = s.nextDueAt.toISOString().slice(0, 10);
    const key = maintenanceKey(s.id, dueIso);
    if (!input.sentKeys.has(key)) {
      out.push({ key, text: buildMaintenanceMessage(s.name) });
    }
  }

  return out;
}
