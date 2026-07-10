import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { LineItem } from "@/lib/billing";
import { BackLink } from "@/components/back-link";
import { GenerateForm } from "../../generate-form";

/** Format a Date to "YYYY-MM-DD" in Vietnam time (matches vnToday convention). */
function toDateInputValue(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

export default async function EditBillPage({ params }: { params: { id: string } }) {
  const bill = await db.bill.findUnique({
    where: { id: params.id },
    include: {
      payments: true,
      lease: { include: { unit: true } },
    },
  });
  if (!bill) notFound();

  // Only unpaid bills that have never received a payment can be edited.
  if (bill.status === "paid") redirect(`/hoa-don/${params.id}`);
  if (bill.payments.length > 0) redirect(`/hoa-don/${params.id}`);

  const profiles = await db.billingProfile.findMany({
    where: { isDefault: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const initialValues = {
    type: bill.type,
    unitId: bill.lease.unit.id,
    unitName: bill.lease.unit.name,
    periodLabel: bill.periodLabel,
    dueDate: toDateInputValue(bill.dueDate),
    billingProfileId: bill.billingProfileId,
    lineItems: bill.lineItems as unknown as LineItem[],
    electricityOld: bill.electricityOld ?? 0,
    electricityNew: bill.electricityNew ?? 0,
    electricityRate: bill.electricityRate ?? 0,
    waterOld: bill.waterOld ?? 0,
    waterNew: bill.waterNew ?? 0,
    waterRate: bill.waterRate ?? 0,
  };

  return (
    <div>
      <BackLink href={`/hoa-don/${params.id}`} label="Chi tiết hóa đơn" />
      <h1 className="mb-4">Sửa hóa đơn — {bill.lease.unit.name}</h1>
      <GenerateForm
        mode="edit"
        billId={params.id}
        profiles={profiles}
        initialValues={initialValues}
      />
    </div>
  );
}
