import { db } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { GenerateForm } from "../generate-form";

const DEFAULT_ELECTRICITY_RATE = 4000;
const DEFAULT_WATER_RATE = 35000;

export default async function NewBillPage({ searchParams }: { searchParams: { unitId?: string } }) {
  const units = await db.unit.findMany({
    where: { status: "occupied" },
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  const setting = await db.setting.findUnique({ where: { id: "singleton" } });

  // Latest meter readings per unit (from the most recent bill that recorded them)
  // so the form can pre-fill "số cũ".
  const lastBills = await db.bill.findMany({
    where: { electricityNew: { not: null }, lease: { unitId: { in: units.map((u) => u.id) } } },
    orderBy: { dueDate: "desc" },
    select: { electricityNew: true, waterNew: true, lease: { select: { unitId: true } } },
  });
  const lastReadings: Record<string, { elec: number; water: number }> = {};
  for (const b of lastBills) {
    const uid = b.lease.unitId;
    if (!lastReadings[uid]) lastReadings[uid] = { elec: b.electricityNew ?? 0, water: b.waterNew ?? 0 };
  }

  return (
    <div>
      <BackLink href="/hoa-don" label="Danh sách hóa đơn" />
      <h1 className="mb-4">Tạo hóa đơn</h1>
      <GenerateForm
        units={units}
        defaultUnitId={searchParams.unitId}
        lastReadings={lastReadings}
        defaultElectricityRate={setting?.defaultElectricityRate ?? DEFAULT_ELECTRICITY_RATE}
        defaultWaterRate={setting?.defaultWaterRate ?? DEFAULT_WATER_RATE}
      />
    </div>
  );
}
