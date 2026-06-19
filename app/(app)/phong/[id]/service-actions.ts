"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serviceItemSchema } from "@/lib/service-schema";

export async function addServiceItem(unitId: string, formData: FormData) {
  const parsed = serviceItemSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    measureUnit: String(formData.get("measureUnit") ?? ""),
    defaultPrice: Number(formData.get("defaultPrice") ?? 0),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.serviceItem.create({ data: { unitId, ...parsed.data } });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}

export async function deleteServiceItem(id: string, unitId: string) {
  await db.serviceItem.delete({ where: { id } });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}
