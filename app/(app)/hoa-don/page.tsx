import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = { unpaid: "Chưa thu", paid: "Đã thu", overdue: "Quá hạn" };

export default async function BillsPage() {
  const bills = await db.bill.findMany({
    orderBy: { createdAt: "desc" },
    include: { lease: { include: { unit: true, tenant: true } } },
  });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hóa đơn</h1>
        <Link href="/hoa-don/new" className="rounded bg-blue-600 px-3 py-2 text-white">+ Tạo hóa đơn</Link>
      </div>
      <ul className="rounded border bg-white">
        {bills.map((b) => (
          <li key={b.id} className="border-b last:border-0">
            <Link href={`/hoa-don/${b.id}`} className="flex justify-between px-3 py-2 hover:bg-gray-50">
              <span>{b.lease.unit.name} · {b.periodLabel} · {b.lease.tenant.fullName}</span>
              <span className="flex gap-3">
                <span>{formatVND(b.grandTotal)}</span>
                <span className={b.status === "overdue" ? "text-red-600" : b.status === "paid" ? "text-green-600" : "text-gray-500"}>
                  {STATUS_LABEL[b.status]}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {bills.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Chưa có hóa đơn.</li>}
      </ul>
    </div>
  );
}
