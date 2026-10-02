import { db } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { getCurrentOrUpcomingLease } from "@/lib/rooms";
import { GenerateForm } from "../generate-form";

export const dynamic = "force-dynamic";

const DEFAULT_ELECTRICITY_RATE = 4000;
const DEFAULT_WATER_RATE = 35000;

export default async function NewBillPage({ searchParams }: { searchParams: { unitId?: string } }) {
  // "Đang thuê" = có hợp đồng chưa kết thúc (xem hasCurrentOrUpcomingLease).
  // Lọc theo quan hệ lease thay vì cột denormalized Unit.status — cột này dễ
  // lệch với bảng Lease (vd import hàng loạt tạo Lease nhưng không set status).
  const now = new Date();
  const [rawUnits, profiles] = await Promise.all([
    db.unit.findMany({
      where: {
        leases: { some: { OR: [{ endDate: null }, { endDate: { gte: now } }] } },
      },
      orderBy: [{ floor: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        billingProfileId: true,
        serviceItems: { select: { name: true, measureUnit: true, defaultPrice: true, perPerson: true, defaultQuantity: true } },
        // coTenants = the extra people sharing the lease; a per-person service
        // bills 1 (the main tenant) + their count.
        leases: { select: { agreedRent: true, startDate: true, endDate: true, coTenants: { select: { id: true } } } },
      },
    }),
    db.billingProfile.findMany({ where: { isDefault: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  // Flatten each unit to its billing basics: agreed rent (from the active lease) +
  // fixed services, so the form can prefill the editable line-items table.
  const units = rawUnits.map((u) => {
    const lease = getCurrentOrUpcomingLease(u.leases, now);
    return {
      id: u.id,
      name: u.name,
      billingProfileId: u.billingProfileId,
      agreedRent: lease?.agreedRent ?? 0,
      occupancy: lease ? 1 + lease.coTenants.length : 1,
      services: u.serviceItems,
    };
  });
  const setting = await db.setting.findUnique({ where: { id: "singleton" } });

  return (
    <div>
      <BackLink href="/hoa-don" label="Danh sách hóa đơn" />
      <h1 className="mb-4">Tạo hóa đơn</h1>
      <GenerateForm
        units={units}
        profiles={profiles}
        defaultUnitId={searchParams.unitId}
        defaultElectricityRate={setting?.defaultElectricityRate ?? DEFAULT_ELECTRICITY_RATE}
        defaultWaterRate={setting?.defaultWaterRate ?? DEFAULT_WATER_RATE}
      />
    </div>
  );
}
