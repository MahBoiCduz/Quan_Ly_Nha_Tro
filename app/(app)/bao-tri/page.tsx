import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { dueStatus } from "@/lib/maintenance";
import { ScheduleForm } from "./schedule-form";
import { deleteSchedule } from "./maintenance-actions";
import { MarkDoneForm } from "./mark-done-form";
import { ActionButton } from "@/components/action-button";
import { Trash2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { overdue: "Quá hạn", due_soon: "Sắp đến hạn", ok: "Bình thường" };
const STATUS_BADGE: Record<string, string> = { overdue: "badge-danger", due_soon: "badge-warn", ok: "badge-muted" };

export default async function MaintenancePage() {
  const [schedules, units] = await Promise.all([
    db.maintenanceSchedule.findMany({ include: { unit: true }, orderBy: { nextDueAt: "asc" } }),
    db.unit.findMany({ orderBy: [{ floor: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Bảo trì</h1>
      <ScheduleForm units={units} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-[15px]">
          <thead>
            <tr className="bg-cream text-muted text-sm">
              <th className="px-4 py-3 text-left font-medium">Công việc</th>
              <th className="px-4 py-3 text-center font-medium">Phạm vi</th>
              <th className="px-4 py-3 text-center font-medium">Chu kỳ</th>
              <th className="px-4 py-3 text-center font-medium">Lần tới</th>
              <th className="px-4 py-3 text-center font-medium">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => {
              const st = dueStatus(s.nextDueAt);
              return (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-center text-muted">{s.scope === "unit" ? s.unit?.name : "Toàn nhà"}</td>
                  <td className="px-4 py-3 text-center text-muted">{s.intervalDays} ngày</td>
                  <td className="px-4 py-3 text-center text-muted">{formatDate(s.nextDueAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={STATUS_BADGE[st]}>{STATUS_LABEL[st]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <MarkDoneForm scheduleId={s.id} />
                      <ActionButton
                        action={async () => { await deleteSchedule(s.id); }}
                        success="Đã xóa lịch"
                        confirm="Xóa lịch bảo trì này?"
                        className="btn-link-danger inline-flex items-center gap-1 text-sm"
                      >
                        <Trash2 size={16} />Xóa
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-muted">Chưa có lịch bảo trì.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
