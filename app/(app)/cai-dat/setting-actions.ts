"use server";

import { readFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settingSchema } from "@/lib/setting-schema";
import { sanitizeFilename, uploadDir } from "@/lib/upload";

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
