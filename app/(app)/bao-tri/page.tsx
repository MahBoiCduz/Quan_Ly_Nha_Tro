import { db } from "@/lib/db";
import { ScheduleForm } from "./schedule-form";
import { MaintenanceTable } from "./maintenance-table";

export default async function MaintenancePage() {
  const [schedules, units] = await Promise.all([
    db.maintenanceSchedule.findMany({ include: { unit: true }, orderBy: { nextDueAt: "asc" } }),
    db.unit.findMany({ orderBy: [{ floor: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  const rows = schedules.map((s) => ({
    id: s.id,
    name: s.name,
    scope: s.scope,
    unitName: s.unit?.name ?? null,
    intervalDays: s.intervalDays,
    nextDueAt: s.nextDueAt,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Bảo trì</h1>
      <ScheduleForm units={units} />
      <MaintenanceTable schedules={rows} />
    </div>
  );
}
