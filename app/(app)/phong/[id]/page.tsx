import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { getActiveLease } from "@/lib/rooms";
import { ServiceEditor } from "./service-editor";

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

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{unit.name}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Tầng {unit.floor} · {unit.type === "room" ? "Phòng ở" : "Mặt bằng"} ·{" "}
        {unit.status === "occupied" ? "Đang thuê" : "Trống"}
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Khách thuê hiện tại</h2>
        {lease ? (
          <div className="rounded border bg-white p-3">
            <div>{lease.tenant.fullName} · {lease.tenant.phone}</div>
            <div className="text-sm text-gray-500">Giá thuê: {formatVND(lease.agreedRent)}</div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Chưa có khách thuê.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Dịch vụ</h2>
        <ServiceEditor unitId={unit.id} items={unit.serviceItems} />
      </section>
    </div>
  );
}
