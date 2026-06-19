"use client";

import { useState } from "react";
import { createSchedule } from "./maintenance-actions";
import { useToast } from "@/components/toast";
import { Plus } from "lucide-react";

type Unit = { id: string; name: string };

export function ScheduleForm({ units }: { units: Unit[] }) {
  const [scope, setScope] = useState("building");
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    const res = await createSchedule(formData);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã thêm lịch bảo trì");
  }

  return (
    <form action={onSubmit} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
      <div className="flex flex-col gap-1">
        <label className="label">Tên công việc</label>
        <input name="name" placeholder="Tên công việc" required className="input" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label">Phạm vi</label>
        <select name="scope" value={scope} onChange={(e) => setScope(e.target.value)} className="input">
          <option value="building">Toàn nhà</option>
          <option value="unit">Theo phòng</option>
        </select>
      </div>
      {scope === "unit" && (
        <div className="flex flex-col gap-1">
          <label className="label">Phòng</label>
          <select name="unitId" required className="input">
            <option value="">— Chọn phòng —</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="label">Chu kỳ (ngày)</label>
        <input name="intervalDays" type="number" min="1" placeholder="Chu kỳ (ngày)" required className="input w-32" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label">Bắt đầu</label>
        <input name="startDate" type="date" required className="input" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label">Ghi chú</label>
        <input name="notes" placeholder="Ghi chú" className="input" />
      </div>
      <button className="btn-primary flex items-center gap-1 self-end">
        <Plus size={18} />Thêm lịch
      </button>
    </form>
  );
}
