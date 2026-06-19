import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { groupUnitsByFloor, getActiveLease } from "@/lib/rooms";

export default async function RoomsPage() {
  const units = await db.unit.findMany({
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    include: { leases: { include: { tenant: true } } },
  });
  const byFloor = groupUnitsByFloor(units);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Phòng</h1>
      {Array.from(byFloor.keys()).sort().map((floor) => (
        <section key={floor} className="mb-6">
          <h2 className="mb-2 font-semibold">Tầng {floor}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {byFloor.get(floor)!.map((u) => {
              const lease = getActiveLease(u.leases);
              const occupied = u.status === "occupied";
              return (
                <Link key={u.id} href={`/phong/${u.id}`}
                  className="rounded-lg border bg-white p-3 hover:shadow">
                  <div className="font-medium">{u.name}</div>
                  <div className={`text-xs ${occupied ? "text-green-600" : "text-gray-400"}`}>
                    {occupied ? "Đang thuê" : "Trống"}
                  </div>
                  {lease && <div className="mt-1 text-sm">{lease.tenant.fullName}</div>}
                  {lease && <div className="text-xs text-gray-500">{formatVND(lease.agreedRent)}</div>}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
