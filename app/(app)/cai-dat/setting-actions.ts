"use server";

import { readFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settingSchema } from "@/lib/setting-schema";
import { sanitizeFilename, uploadDir } from "@/lib/upload";

const optional = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional(),
);
const profileSchema = z.object({
  name: z.string().trim().min(1),
  bankAccountName: optional,
  bankAccountNo: optional,
  bankName: optional,
  qrImageUrl: optional,
  invoiceNotes: optional,
});

function parseProfile(formData: FormData) {
  return profileSchema.safeParse({
    name: formData.get("name"),
    bankAccountName: formData.get("bankAccountName"),
    bankAccountNo: formData.get("bankAccountNo"),
    bankName: formData.get("bankName"),
    qrImageUrl: formData.get("qrImageUrl"),
    invoiceNotes: formData.get("invoiceNotes"),
  });
}

type ActionResult = { ok?: true; error?: string };

export async function createBillingProfile(formData: FormData): Promise<ActionResult> {
  const parsed = parseProfile(formData);
  if (!parsed.success) return { error: "Vui lòng nhập tên hồ sơ" };
  await db.billingProfile.create({ data: parsed.data });
  revalidatePath("/cai-dat");
  return { ok: true };
}

export async function updateBillingProfile(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = parseProfile(formData);
  if (!parsed.success) return { error: "Vui lòng nhập tên hồ sơ" };
  await db.billingProfile.update({ where: { id }, data: parsed.data });
  revalidatePath("/cai-dat");
  return { ok: true };
}

export async function deleteBillingProfile(id: string): Promise<ActionResult> {
  // Detach rooms/bills that pointed at this profile so they fall back to default.
  await db.$transaction([
    db.unit.updateMany({ where: { billingProfileId: id }, data: { billingProfileId: null } }),
    db.bill.updateMany({ where: { billingProfileId: id }, data: { billingProfileId: null } }),
    db.billingProfile.delete({ where: { id } }),
  ]);
  revalidatePath("/cai-dat");
  return { ok: true };
}

export async function saveRoomAssignments(
  assignments: { unitId: string; profileId: string | null }[],
): Promise<ActionResult> {
  await db.$transaction(
    assignments.map((a) =>
      db.unit.update({ where: { id: a.unitId }, data: { billingProfileId: a.profileId } }),
    ),
  );
  revalidatePath("/cai-dat");
  return { ok: true };
}

export async function saveSettings(formData: FormData) {
  const parsed = settingSchema.safeParse({
    bankAccountName: formData.get("bankAccountName"),
    bankAccountNo: formData.get("bankAccountNo"),
    bankName: formData.get("bankName"),
    qrImageUrl: formData.get("qrImageUrl"),
    invoiceNotes: formData.get("invoiceNotes"),
    adminZaloUserId: formData.get("adminZaloUserId"),
    defaultElectricityRate: formData.get("defaultElectricityRate"),
    defaultWaterRate: formData.get("defaultWaterRate"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;

  await db.setting.upsert({
    where: { id: "singleton" },
    update: d,
    create: { id: "singleton", ...d },
  });
  revalidatePath("/cai-dat");
  return { ok: true };
}

export async function qrDataUrl(qrImageUrl: string | null): Promise<string | null> {
  if (!qrImageUrl) return null;
  const name = sanitizeFilename(qrImageUrl.replace(/^\/api\/files\//, ""));
  try {
    const data = await readFile(path.join(uploadDir(), name));
    const ext = path.extname(name).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}
