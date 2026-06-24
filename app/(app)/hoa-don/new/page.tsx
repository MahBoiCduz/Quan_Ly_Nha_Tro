import { db } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { GenerateForm } from "../generate-form";

export default async function NewBillPage({ searchParams }: { searchParams: { unitId?: string } }) {
  const units = await db.unit.findMany({
    where: { status: "occupied" },
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return (
    <div>
      <BackLink href="/hoa-don" label="Danh sách hóa đơn" />
      <h1 className="mb-4">Tạo hóa đơn</h1>
      <GenerateForm units={units} defaultUnitId={searchParams.unitId} />
    </div>
  );
}
