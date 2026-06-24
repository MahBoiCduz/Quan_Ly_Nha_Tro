import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { computeDashboardStats } from "@/lib/dashboard";
import { NotifyButton } from "./notify-button";
import { Receipt, UserPlus, Wallet } from "lucide-react";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-semibold text-ink ${accent ?? ""}`}>{value}</div>
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
      <h1>Tổng quan</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Phòng đang thuê" value={`${stats.occupied}/${stats.occupied + stats.vacant}`} />
        <StatCard label="Còn phải thu" value={formatVND(stats.outstanding)} />
        <StatCard
          label="Hóa đơn quá hạn"
          value={String(stats.overdueCount)}
          accent={stats.overdueCount ? "text-danger" : ""}
        />
        <StatCard
          label="Bảo trì sắp đến hạn"
          value={String(stats.maintenanceDueCount)}
          accent={stats.maintenanceDueCount ? "text-warn" : ""}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/hoa-don/new" className="btn-primary">
          <Receipt size={18} />
          Tạo hóa đơn
        </Link>
        <Link href="/phong" className="btn-primary">
          <UserPlus size={18} />
          Thêm khách thuê
        </Link>
        <Link href="/chi-tieu" className="btn-primary">
          <Wallet size={18} />
          Thêm chi tiêu
        </Link>
      </div>

      <NotifyButton />
    </div>
  );
}
