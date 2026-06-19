export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function computeNextDue(anchor: Date, intervalDays: number): Date {
  return addDays(anchor, intervalDays);
}

export function isDue(nextDueAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= nextDueAt.getTime();
}

export function dueStatus(
  nextDueAt: Date,
  now: Date = new Date(),
): "overdue" | "due_soon" | "ok" {
  const ms = nextDueAt.getTime() - now.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ms < 0) return "overdue";
  if (ms <= 7 * day) return "due_soon";
  return "ok";
}
