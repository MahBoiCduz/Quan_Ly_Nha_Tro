import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { computeDashboardStats, monthlyRevenue } from "@/lib/dashboard";
import { NotifyButton } from "./notify-button";
import { Receipt, UserPlus, Wallet } from "lucide-react";

// Live figures (this-month revenue, overdue counts) must reflect the current
// request, not a build-time snapshot.
export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-semibold text-ink ${accent ?? ""}`}>{value}</div>
    </>
  );
  const className = "block rounded-2xl border border-line bg-surface p-5";
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:border-ink/30 hover:bg-cream`}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

function MonthlyRevenue({ months }: { months: { key: string; label: string; total: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.total));
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-base font-semibold text-ink">Tiền thu hàng tháng</h2>
      <div className="space-y-3">
        {months.map((m, i) => {
          const isCurrent = i === months.length - 1;
          return (
            <div key={m.key} className="flex items-center gap-3">
              <div className={`w-16 shrink-0 text-sm ${isCurrent ? "font-semibold text-ink" : "text-muted"}`}>
                {m.label}
              </div>
              <div className="h-5 flex-1 overflow-hidden rounded-full bg-cream">
                <div
                  className={`h-full rounded-full ${isCurrent ? "bg-brand" : "bg-brand/50"}`}
                  style={{ width: `${Math.round((m.total / max) * 100)}%` }}
                />
              </div>
              <div className={`w-28 shrink-0 text-right text-sm ${isCurrent ? "font-semibold text-ink" : "text-muted"}`}>
                {formatVND(m.total)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [units, bills, schedules, payments] = await Promise.all([
    db.unit.findMany({ select: { status: true } }),
    db.bill.findMany({
      where: { status: { not: "paid" } },
      select: { grandTotal: true, dueDate: true, payments: { select: { amount: true } } },
    }),
    db.maintenanceSchedule.findMany({ select: { nextDueAt: true } }),
    db.payment.findMany({ where: { paidAt: { gte: since } }, select: { amount: true, paidAt: true } }),
  ]);

  // DEBUG: log server-side để trace qua Vercel Logs
  const byMonth: Record<string, number> = {};
  for (const p of payments) {
    const d = new Date(p.paidAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[k] = (byMonth[k] ?? 0) + p.amount;
  }
  console.log("[DASHBOARD-DEBUG]", "DB_URL:", (process.env.DATABASE_URL ?? "").substring(0, 50));
  console.log("[DASHBOARD-DEBUG]", "now:", now.toISOString(), "getMonth:", now.getMonth());
  console.log("[DASHBOARD-DEBUG]", "since:", since.toISOString(), "getMonth:", since.getMonth());
  console.log("[DASHBOARD-DEBUG]", "payments count:", payments.length);
  console.log("[DASHBOARD-DEBUG]", "payments by month:", JSON.stringify(byMonth));
  // Log raw paidAt of first 3 and last 3 payments
  if (payments.length > 0) {
    const sample = payments.slice(0, 3).map(p => ({ amt: p.amount, raw: (p.paidAt as Date).toISOString(), month: (p.paidAt as Date).getMonth() }));
    const tail = payments.slice(-3).map(p => ({ amt: p.amount, raw: (p.paidAt as Date).toISOString(), month: (p.paidAt as Date).getMonth() }));
    console.log("[DASHBOARD-DEBUG]", "first 3:", JSON.stringify(sample));
    console.log("[DASHBOARD-DEBUG]", "last 3:", JSON.stringify(tail));
  }

  // DEBUG: raw SQL bypass Prisma để so sánh
  const rawCount = await db.$queryRawUnsafe<{cnt:bigint}[]>("SELECT COUNT(*) as cnt FROM Payment");
  console.log("[DASHBOARD-DEBUG]", "raw total payments:", Number(rawCount[0]?.cnt ?? 0));
  const rawJune = await db.$queryRawUnsafe<{cnt:bigint,total:number}[]>(
    "SELECT COUNT(*) as cnt, SUM(amount) as total FROM Payment WHERE paidAt >= '2026-06-01' AND paidAt < '2026-07-01'"
  );
  console.log("[DASHBOARD-DEBUG]", "raw june (SQL):", JSON.stringify({ cnt: Number(rawJune[0]?.cnt ?? 0), total: rawJune[0]?.total ?? 0 }));
  const rawPrismaJune = await db.payment.findMany({
    where: { paidAt: { gte: new Date("2026-06-01"), lt: new Date("2026-07-01") } },
    select: { id: true, amount: true, paidAt: true }
  });
  console.log("[DASHBOARD-DEBUG]", "prisma june count:", rawPrismaJune.length, "ids:", JSON.stringify(rawPrismaJune.map(p => p.id)));

  const stats = computeDashboardStats({ units, bills, schedules }, now);
  const months = monthlyRevenue(payments, now);
  console.log("[DASHBOARD-DEBUG]", "monthlyRevenue:", JSON.stringify(months.map(m => ({ key: m.key, total: m.total }))));
  const thisMonth = months[months.length - 1];

  return (
    <div className="space-y-6">
      <h1>Tổng quan</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Phòng đang thuê" value={`${stats.occupied}/${stats.occupied + stats.vacant}`} />
        <StatCard label="Còn phải thu" value={formatVND(stats.outstanding)} />
        <StatCard
          label="Hóa đơn quá hạn"
          value={String(stats.overdueCount)}
          accent={stats.overdueCount ? "text-danger" : ""}
          href="/hoa-don?status=overdue"
        />
        <StatCard label="Thu tháng này" value={formatVND(thisMonth.total)} />
        <StatCard
          label="Bảo trì sắp đến hạn"
          value={String(stats.maintenanceDueCount)}
          accent={stats.maintenanceDueCount ? "text-warn" : ""}
        />
      </div>

      <MonthlyRevenue months={months} />

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
