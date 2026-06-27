import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveLease } from "@/lib/rooms";
import { formatVND, formatDate } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import { LeaseBillsList } from "../lease-bills-list";

export default async function RoomHistoryPage({ params }: { params: { id: string } }) {
  const unit = await db.unit.findUnique({
    where: { id: params.id },
    include: {
      leases: {
        include: {
          tenant: true,
          bills: {
            include: { payments: { select: { amount: true } } },
            orderBy: { dueDate: "desc" },
          },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!unit) notFound();

  const active = getActiveLease(unit.leases);

  return (
    <div className="space-y-6">
      <BackLink href={`/phong/${unit.id}`} label={`Phòng ${unit.name.replace(/^Phòng\s*/, "")}`} />
      <div>
        <h1 className="text-2xl font-bold text-ink">Lịch sử thuê — {unit.name}</h1>
        <p className="text-sm text-muted">{unit.leases.length} đời khách thuê</p>
      </div>

      {unit.leases.length === 0 && (
        <p className="text-muted">Phòng chưa có lịch sử thuê.</p>
      )}

      {unit.leases.map((lease) => {
        const isActive = lease.id === active?.id;
        return (
          <section key={lease.id} className="card space-y-3 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-ink">{lease.tenant.fullName}</h2>
                  {isActive && <span className="badge-ok">Đang thuê</span>}
                </div>
                <p className="text-sm text-muted">
                  {lease.tenant.phone} · {formatDate(lease.startDate)} –{" "}
                  {lease.endDate ? formatDate(lease.endDate) : "nay"}
                </p>
              </div>
              <div className="text-sm text-muted sm:text-right">
                Giá thuê: <span className="font-medium text-ink">{formatVND(lease.agreedRent)}</span>
              </div>
            </div>
            <LeaseBillsList bills={lease.bills} emptyLabel="Không có hóa đơn." />
          </section>
        );
      })}
    </div>
  );
}
