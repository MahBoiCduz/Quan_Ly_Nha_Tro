import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveLease } from "@/lib/rooms";
import { BackLink } from "@/components/back-link";
import { ServiceEditor } from "./service-editor";
import { LeasePanel } from "./lease-panel";
import { NewLeaseForm } from "./new-lease-form";
import { TenantInfoSection } from "./tenant-info-section";
import { billStatusFor } from "@/lib/billing";
import { FileDown, Plus } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { unpaid: "Chưa thu", paid: "Đã thu", overdue: "Quá hạn" };

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  const unit = await db.unit.findUnique({
    where: { id: params.id },
    include: {
      serviceItems: true,
      leases: {
        include: {
          tenant: true,
          bills: {
            include: { payments: { select: { amount: true } } },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!unit) notFound();

  const lease = getActiveLease(unit.leases);

  return (
    <div className="space-y-6">
      <BackLink href="/phong" label="Danh sách phòng" />
      <div>
        <h1 className="text-2xl font-bold text-ink">{unit.name}</h1>
        <p className="text-sm text-muted">
          Tầng {unit.floor} · {unit.type === "room" ? "Phòng ở" : "Mặt bằng"} ·{" "}
          {unit.status === "occupied" ? "Đang thuê" : "Trống"}
        </p>
      </div>

      {lease ? (
        <>
          <TenantInfoSection tenant={lease.tenant} unitId={unit.id} />

          <section>
            <h2 className="mb-2 font-semibold text-ink">Hợp đồng</h2>
            <LeasePanel
              unitId={unit.id}
              activeLease={{
                id: lease.id,
                agreedRent: lease.agreedRent,
                depositAmount: lease.depositAmount,
                startDate: lease.startDate.toISOString(),
                billingCycle: lease.billingCycle,
              }}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-ink">Hóa đơn</h2>
              <Link href={`/hoa-don/new?unitId=${unit.id}`} className="btn-primary text-sm">
                <Plus size={14} /> Tạo hóa đơn
              </Link>
            </div>
            <ul className="card overflow-hidden text-sm">
              {lease.bills.map((b) => {
                const totalPaid = b.payments.reduce((s, p) => s + p.amount, 0);
                const display = billStatusFor(b.grandTotal, totalPaid, b.dueDate);
                const badgeClass =
                  display === "overdue" ? "badge-danger" :
                  display === "paid" ? "badge-ok" :
                  "badge-warn";
                return (
                  <li key={b.id} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-0">
                    <Link href={`/hoa-don/${b.id}`} className="text-ink hover:underline">
                      {b.periodLabel}
                    </Link>
                    <span className="flex items-center gap-3">
                      <span className={badgeClass}>{STATUS_LABEL[display]}</span>
                      <a href={`/hoa-don/${b.id}/pdf`} target="_blank" className="btn-secondary py-1 text-xs">
                        <FileDown size={14} /> PDF
                      </a>
                    </span>
                  </li>
                );
              })}
              {lease.bills.length === 0 && (
                <li className="px-4 py-3 text-muted">Chưa có hóa đơn nào.</li>
              )}
            </ul>
          </section>
        </>
      ) : (
        <section>
          <h2 className="mb-2 font-semibold text-ink">Khách thuê mới</h2>
          <NewLeaseForm unitId={unit.id} />
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold text-ink">Dịch vụ</h2>
        <ServiceEditor unitId={unit.id} items={unit.serviceItems} />
      </section>
    </div>
  );
}
