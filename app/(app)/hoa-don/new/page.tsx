import { db } from "@/lib/db";
import { GenerateForm } from "../generate-form";

export default async function NewBillPage() {
  const units = await db.unit.findMany({
    where: { status: "occupied" },
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Tạo hóa đơn</h1>
      <GenerateForm units={units} />
    </div>
  );
}
