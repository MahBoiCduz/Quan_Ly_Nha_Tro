import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { groupUnitsByFloor, getActiveLease } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const units = await db.unit.findMany({
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    include: { leases: { orderBy: { startDate: "desc" }, include: { tenant: true } } },
  });
  const byFloor = groupUnitsByFloor(units);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Phòng</h1>
      {Array.from(byFloor.keys()).sort().map((floor) => (
        <section key={floor} className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-muted">Tầng {floor}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {byFloor.get(floor)!.map((u) => {
              const lease = getActiveLease(u.leases);
              const occupied = u.status === "occupied";
              return (
                <Link key={u.id} href={`/phong/${u.id}`}
                  className="card p-4 hover:border-brand/40 transition-colors">
                  <div className="font-medium text-base text-ink">{u.name}</div>
                  <div className="mt-1">
                    <span className={occupied ? "badge-ok" : "badge-muted"}>
                      {occupied ? "Đang thuê" : "Trống"}
                    </span>
                  </div>
                  {lease && <div className="mt-1 text-sm text-ink">{lease.tenant.fullName}</div>}
                  {lease && <div className="text-sm text-muted">{formatVND(lease.agreedRent)}</div>}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
