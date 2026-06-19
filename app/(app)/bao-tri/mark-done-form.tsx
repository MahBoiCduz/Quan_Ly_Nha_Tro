"use client";

import { useToast } from "@/components/toast";
import { markDone } from "./maintenance-actions";

export function MarkDoneForm({ scheduleId }: { scheduleId: string }) {
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    const doneAt = String(formData.get("doneAt"));
    const res = await markDone(scheduleId, doneAt);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã ghi nhận hoàn thành");
  }

  return (
    <form action={onSubmit} className="flex items-center gap-1">
      <input name="doneAt" type="date" required className="input w-36 text-sm" />
      <button type="submit" className="btn-secondary text-sm px-2 py-1">Đã làm</button>
    </form>
  );
}
