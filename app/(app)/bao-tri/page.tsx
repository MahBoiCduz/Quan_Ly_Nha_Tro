import { db } from "@/lib/db";
import { dueStatus } from "@/lib/maintenance";
import { ScheduleForm } from "./schedule-form";
import { markDone, deleteSchedule } from "./maintenance-actions";

const STATUS_LABEL: Record<string, string> = { overdue: "Quá hạn", due_soon: "Sắp đến hạn", ok: "Bình thường" };
const STATUS_COLOR: Record<string, string> = { overdue: "text-red-600", due_soon: "text-amber-600", ok: "text-gray-500" };

export default async function MaintenancePage() {
  const [schedules, units] = await Promise.all([
    db.maintenanceSchedule.findMany({ include: { unit: true }, orderBy: { nextDueAt: "asc" } }),
    db.unit.findMany({ orderBy: [{ floor: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Bảo trì</h1>
      <ScheduleForm units={units} />
      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Công việc</th>
            <th className="border px-2 py-1">Phạm vi</th>
            <th className="border px-2 py-1">Chu kỳ</th>
            <th className="border px-2 py-1">Lần tới</th>
            <th className="border px-2 py-1">Trạng thái</th>
            <th className="border px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => {
            const st = dueStatus(s.nextDueAt);
            return (
              <tr key={s.id}>
                <td className="border px-2 py-1">{s.name}</td>
                <td className="border px-2 py-1 text-center">{s.scope === "unit" ? s.unit?.name : "Toàn nhà"}</td>
                <td className="border px-2 py-1 text-center">{s.intervalDays} ngày</td>
                <td className="border px-2 py-1 text-center">{s.nextDueAt.toLocaleDateString("vi-VN")}</td>
                <td className={`border px-2 py-1 text-center ${STATUS_COLOR[st]}`}>{STATUS_LABEL[st]}</td>
                <td className="border px-2 py-1 text-center">
                  <form action={async (fd: FormData) => { "use server"; await markDone(s.id, String(fd.get("doneAt"))); }}
                    className="flex items-center gap-1">
                    <input name="doneAt" type="date" required className="rounded border px-1 py-0.5 text-xs" />
                    <button className="rounded bg-green-600 px-2 py-0.5 text-xs text-white">Đã làm</button>
                  </form>
                  <form action={async () => { "use server"; await deleteSchedule(s.id); }} className="mt-1">
                    <button className="text-xs text-red-600 hover:underline">Xóa</button>
                  </form>
                </td>
              </tr>
            );
          })}
          {schedules.length === 0 && <tr><td colSpan={6} className="px-2 py-2 text-center text-gray-400">Chưa có lịch bảo trì.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
