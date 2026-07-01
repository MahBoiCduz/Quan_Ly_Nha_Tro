"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tenantSchema } from "@/lib/tenant-schema";

type ActionResult = { ok?: true; error?: string };

function parse(formData: FormData) {
  return tenantSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    idCardNumber: formData.get("idCardNumber"),
    idCardFrontImageUrl: formData.get("idCardFrontImageUrl"),
    idCardBackImageUrl: formData.get("idCardBackImageUrl"),
    vehiclePlate: formData.get("vehiclePlate"),
    zaloId: formData.get("zaloId"),
    notes: formData.get("notes"),
  });
}

export async function updateTenant(id: string, unitId: string, formData: FormData): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.tenant.update({ where: { id }, data: parsed.data });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}

// Add an additional occupant (co-tenant) to a lease — a full Tenant row linked
// via coLeaseId. Not billed; the lease's primary tenant stays the representative.
export async function addCoTenant(leaseId: string, unitId: string, formData: FormData): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.tenant.create({ data: { ...parsed.data, coLeaseId: leaseId } });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}

export async function removeCoTenant(tenantId: string, unitId: string): Promise<ActionResult> {
  // Co-tenants have no bills of their own, so a plain delete is safe.
  await db.tenant.delete({ where: { id: tenantId } });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}
