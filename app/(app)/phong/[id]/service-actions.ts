"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { serviceItemSchema } from "@/lib/service-schema";

// Ô "Số lượng" bị vô hiệu hoá khi tick "Tính theo số người", trình duyệt không gửi field
// disabled ⇒ form luôn kèm 1 hidden input cùng tên. Ô trống/không gửi thì lấy `fallback`
// (khi sửa: số lượng đang lưu) chứ không phải 0.
function quantityFromForm(formData: FormData, fallback: number) {
  const raw = formData.get("defaultQuantity");
  if (raw === null || String(raw).trim() === "") return fallback;
  return Number(raw);
}

function parseServiceForm(formData: FormData, fallbackQuantity: number) {
  return serviceItemSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    measureUnit: String(formData.get("measureUnit") ?? ""),
    defaultPrice: Number(formData.get("defaultPrice") ?? 0),
    perPerson: formData.get("perPerson") === "on",
    defaultQuantity: quantityFromForm(formData, fallbackQuantity),
  });
}

export async function addServiceItem(unitId: string, formData: FormData) {
  const parsed = parseServiceForm(formData, 1);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.serviceItem.create({ data: { unitId, ...parsed.data } });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}

export async function updateServiceItem(id: string, unitId: string, formData: FormData) {
  const item = await db.serviceItem.findUnique({
    where: { id },
    select: { unitId: true, defaultQuantity: true },
  });
  if (!item) return { error: "Không tìm thấy dịch vụ" };
  if (item.unitId !== unitId) return { error: "Dịch vụ không thuộc phòng này" };
  const parsed = parseServiceForm(formData, item.defaultQuantity);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  await db.serviceItem.update({ where: { id }, data: parsed.data });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}

export async function deleteServiceItem(id: string, unitId: string) {
  const item = await db.serviceItem.findUnique({ where: { id }, select: { unitId: true } });
  if (!item) return { error: "Không tìm thấy dịch vụ" };
  if (item.unitId !== unitId) return { error: "Dịch vụ không thuộc phòng này" };
  await db.serviceItem.delete({ where: { id } });
  revalidatePath(`/phong/${unitId}`);
  return { ok: true };
}
