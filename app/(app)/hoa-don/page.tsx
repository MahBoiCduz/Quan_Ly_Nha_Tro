import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { billStatusFor } from "@/lib/billing";
import { Plus } from "lucide-react";

export default async function BillsPage() {
  const bills = await db.bill.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lease: { include: { unit: true, tenant: true } },
      payments: { select: { amount: true } },
    },
  });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1>Hóa đơn</h1>
        <Link href="/hoa-don/new" className="btn-primary">
          <Plus size={18} /> Tạo hóa đơn
        </Link>
      </div>
      <ul className="card overflow-hidden">
        {bills.map((b) => {
          const totalPaid = b.payments.reduce((s, p) => s + p.amount, 0);
          const display = billStatusFor(b.grandTotal, totalPaid, b.dueDate);
          const badgeClass =
            display === "overdue" ? "badge-danger" :
            display === "paid" ? "badge-ok" :
            "badge-warn";
          return (
            <li key={b.id} className="border-b border-line last:border-0">
              <Link
                href={`/hoa-don/${b.id}`}
                className="flex flex-col gap-1.5 px-4 py-3 text-[15px] hover:bg-cream sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 text-ink">
                  {b.lease.unit.name} · {b.periodLabel} · {b.lease.tenant.fullName}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-ink">{formatVND(b.grandTotal)}</span>
                  <span className={badgeClass}>
                    {display === "overdue" ? "Quá hạn" : display === "paid" ? "Đã thu" : "Chưa thu"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {bills.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Chưa có hóa đơn.</li>
        )}
      </ul>
    </div>
  );
}
