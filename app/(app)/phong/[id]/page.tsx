import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveLease } from "@/lib/rooms";
import { ServiceEditor } from "./service-editor";
import { LeasePanel } from "./lease-panel";

export default async function RoomDetailPage({ params }: { params: { id: string } }) {
  const unit = await db.unit.findUnique({
    where: { id: params.id },
    include: {
      serviceItems: true,
      leases: { include: { tenant: true }, orderBy: { startDate: "desc" } },
    },
  });
  if (!unit) notFound();

  const lease = getActiveLease(unit.leases);
  const tenants = await db.tenant.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } });
  const activeLease = lease
    ? {
        id: lease.id, agreedRent: lease.agreedRent, depositAmount: lease.depositAmount,
        startDate: lease.startDate.toISOString(), tenant: { fullName: lease.tenant.fullName },
      }
    : null;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{unit.name}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Tầng {unit.floor} · {unit.type === "room" ? "Phòng ở" : "Mặt bằng"} ·{" "}
        {unit.status === "occupied" ? "Đang thuê" : "Trống"}
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Khách thuê hiện tại</h2>
        <LeasePanel unitId={unit.id} tenants={tenants} activeLease={activeLease} />
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Dịch vụ</h2>
        <ServiceEditor unitId={unit.id} items={unit.serviceItems} />
      </section>
    </div>
  );
}
