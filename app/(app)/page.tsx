import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { computeDashboardStats } from "@/lib/dashboard";
import { NotifyButton } from "./notify-button";

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [units, bills, schedules] = await Promise.all([
    db.unit.findMany({ select: { status: true } }),
    db.bill.findMany({
      where: { status: { not: "paid" } },
      select: { grandTotal: true, dueDate: true, payments: { select: { amount: true } } },
    }),
    db.maintenanceSchedule.findMany({ select: { nextDueAt: true } }),
  ]);
  const stats = computeDashboardStats({ units, bills, schedules });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Phòng đang thuê" value={`${stats.occupied}/${stats.occupied + stats.vacant}`} />
        <Card label="Còn phải thu" value={formatVND(stats.outstanding)} />
        <Card
          label="Hóa đơn quá hạn"
          value={String(stats.overdueCount)}
          accent={stats.overdueCount ? "text-red-600" : ""}
        />
        <Card
          label="Bảo trì sắp đến hạn"
          value={String(stats.maintenanceDueCount)}
          accent={stats.maintenanceDueCount ? "text-amber-600" : ""}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/hoa-don/new" className="rounded bg-blue-600 px-3 py-2 text-white">
          Tạo hóa đơn
        </Link>
        <Link href="/khach-thue/new" className="rounded bg-blue-600 px-3 py-2 text-white">
          Thêm khách thuê
        </Link>
        <Link href="/chi-tieu" className="rounded bg-blue-600 px-3 py-2 text-white">
          Thêm chi tiêu
        </Link>
      </div>

      <NotifyButton />
    </div>
  );
}
