"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { leaseSchema } from "@/lib/lease-schema";

export async function createLease(unitId: string, formData: FormData) {
  const parsed = leaseSchema.safeParse({
    tenantId: formData.get("tenantId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    agreedRent: Number(formData.get("agreedRent") ?? 0),
    billingCycle: formData.get("billingCycle"),
    depositAmount: Number(formData.get("depositAmount") ?? 0),
    depositCollectedAt: formData.get("depositCollectedAt"),
    depositCollectedBy: formData.get("depositCollectedBy"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  await db.$transaction([
    db.lease.create({
      data: {
        unitId,
        tenantId: d.tenantId,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        agreedRent: d.agreedRent,
        billingCycle: d.billingCycle,
        depositAmount: d.depositAmount,
        depositCollectedAt: d.depositCollectedAt ? new Date(d.depositCollectedAt) : null,
        depositCollectedBy: d.depositCollectedBy ?? null,
      },
    }),
    db.unit.update({ where: { id: unitId }, data: { status: "occupied" } }),
  ]);

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
