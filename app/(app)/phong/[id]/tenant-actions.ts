"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tenantSchema } from "@/lib/tenant-schema";

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

export async function updateTenant(id: string, unitId: string, formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.tenant.update({ where: { id }, data: parsed.data });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}
