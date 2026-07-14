import Link from "next/link";
import { db } from "@/lib/db";
import { BillsList } from "./bills-list";
import { Plus } from "lucide-react";

export default async function BillsPage({ searchParams }: { searchParams: { status?: string } }) {
  const bills = await db.bill.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lease: { include: { unit: true, tenant: true } },
      payments: { select: { amount: true } },
    },
  });
  const rows = bills.map((b) => ({
    id: b.id,
    unitName: b.lease.unit.name,
    periodLabel: b.periodLabel,
    tenantName: b.lease.tenant.fullName,
    grandTotal: b.grandTotal,
    dueDate: b.dueDate,
    totalPaid: b.payments.reduce((s, p) => s + p.amount, 0),
  }));
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1>Hóa đơn</h1>
        <Link href="/hoa-don/new" className="btn-primary">
          <Plus size={18} /> Tạo hóa đơn
        </Link>
      </div>
      <BillsList bills={rows} initialStatus={searchParams.status} />
    </div>
  );
}
