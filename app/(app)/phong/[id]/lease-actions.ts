"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { leaseDetailsSchema } from "@/lib/lease-schema";
import { tenantSchema } from "@/lib/tenant-schema";

export async function startLease(unitId: string, formData: FormData) {
  const tenantParsed = tenantSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    idCardNumber: formData.get("idCardNumber"),
    idCardFrontImageUrl: formData.get("idCardFrontImageUrl"),
    idCardBackImageUrl: formData.get("idCardBackImageUrl"),
    vehiclePlate: formData.get("vehiclePlate"),
    zaloId: formData.get("zaloId"),
    notes: formData.get("notes"),
  });
  const leaseParsed = leaseDetailsSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    agreedRent: Number(formData.get("agreedRent") ?? 0),
    billingCycle: formData.get("billingCycle"),
    depositAmount: Number(formData.get("depositAmount") ?? 0),
    depositCollectedAt: formData.get("depositCollectedAt"),
    depositCollectedBy: formData.get("depositCollectedBy"),
  });
  if (!tenantParsed.success || !leaseParsed.success) return { error: "Dữ liệu không hợp lệ" };
  const t = tenantParsed.data;
  const d = leaseParsed.data;

  // Interactive transaction: the lease needs the id of the tenant we create here.
  await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: t });
    await tx.lease.create({
      data: {
        unitId,
        tenantId: tenant.id,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        agreedRent: d.agreedRent,
        billingCycle: d.billingCycle,
        depositAmount: d.depositAmount,
        depositCollectedAt: d.depositCollectedAt ? new Date(d.depositCollectedAt) : null,
        depositCollectedBy: d.depositCollectedBy ?? null,
      },
    });
    await tx.unit.update({ where: { id: unitId }, data: { status: "occupied" } });
  });

  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}

export async function endLease(leaseId: string, unitId: string, endDate: string) {
  await db.$transaction([
    db.lease.update({ where: { id: leaseId }, data: { endDate: new Date(endDate) } }),
    db.unit.update({ where: { id: unitId }, data: { status: "vacant" } }),
  ]);
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}
