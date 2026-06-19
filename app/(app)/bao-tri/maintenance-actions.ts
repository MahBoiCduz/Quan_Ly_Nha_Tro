"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { maintenanceSchema } from "@/lib/maintenance-schema";
import { computeNextDue } from "@/lib/maintenance";

export async function createSchedule(formData: FormData) {
  const parsed = maintenanceSchema.safeParse({
    name: formData.get("name"),
    scope: formData.get("scope"),
    unitId: formData.get("unitId"),
    intervalDays: Number(formData.get("intervalDays") ?? 0),
    startDate: formData.get("startDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;
  const start = new Date(d.startDate);

  await db.maintenanceSchedule.create({
    data: {
      name: d.name,
      scope: d.scope,
      unitId: d.scope === "unit" ? d.unitId! : null,
      intervalDays: d.intervalDays,
      lastDoneAt: null,
      nextDueAt: computeNextDue(start, d.intervalDays),
      notes: d.notes ?? null,
    },
  });
  revalidatePath("/bao-tri");
  return { ok: true };
}

export async function markDone(scheduleId: string, doneAt: string) {
  const done = new Date(doneAt);
  const schedule = await db.maintenanceSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) return { error: "Không tìm thấy" };

  await db.$transaction([
    db.maintenanceLog.create({ data: { scheduleId, doneAt: done } }),
    db.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: { lastDoneAt: done, nextDueAt: computeNextDue(done, schedule.intervalDays) },
    }),
  ]);
  revalidatePath("/bao-tri");
  return { ok: true };
}

export async function deleteSchedule(id: string) {
  await db.maintenanceSchedule.delete({ where: { id } });
  revalidatePath("/bao-tri");
  return { ok: true };
}
