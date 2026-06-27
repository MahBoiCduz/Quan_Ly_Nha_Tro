import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveLease, getPastLeases } from "@/lib/rooms";
import { BackLink } from "@/components/back-link";
import { ServiceEditor } from "./service-editor";
import { LeasePanel } from "./lease-panel";
import { NewLeaseForm } from "./new-lease-form";
import { TenantInfoSection } from "./tenant-info-section";
import { LeaseBillsList } from "./lease-bills-list";
import { History, Plus } from "lucide-react";

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
  const pastLeases = getPastLeases(unit.leases);

  return (
    <div className="space-y-6">
      <BackLink href="/phong" label="Danh sách phòng" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{unit.name}</h1>
          <p className="text-sm text-muted">
            Tầng {unit.floor} · {unit.type === "room" ? "Phòng ở" : "Mặt bằng"} ·{" "}
            {unit.status === "occupied" ? "Đang thuê" : "Trống"}
          </p>
        </div>
        {pastLeases.length > 0 && (
          <Link
            href={`/phong/${unit.id}/lich-su`}
            className="btn-secondary shrink-0 self-start text-sm"
          >
            <History size={16} /> Xem lịch sử thuê ({pastLeases.length})
          </Link>
        )}
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
            <LeaseBillsList bills={lease.bills} />
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
