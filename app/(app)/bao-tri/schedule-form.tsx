"use client";

import { useState } from "react";
import { createSchedule } from "./maintenance-actions";

type Unit = { id: string; name: string };

export function ScheduleForm({ units }: { units: Unit[] }) {
  const [scope, setScope] = useState("building");
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    const res = await createSchedule(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="mb-4 flex flex-wrap items-end gap-2">
      <input name="name" placeholder="Tên công việc" required className="rounded border px-2 py-1" />
      <select name="scope" value={scope} onChange={(e) => setScope(e.target.value)} className="rounded border px-2 py-1">
        <option value="building">Toàn nhà</option>
        <option value="unit">Theo phòng</option>
      </select>
      {scope === "unit" && (
        <select name="unitId" required className="rounded border px-2 py-1">
          <option value="">— Chọn phòng —</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
      <input name="intervalDays" type="number" min="1" placeholder="Chu kỳ (ngày)" required className="w-32 rounded border px-2 py-1" />
      <label className="text-sm">Bắt đầu
        <input name="startDate" type="date" required className="ml-1 rounded border px-2 py-1" />
      </label>
      <input name="notes" placeholder="Ghi chú" className="rounded border px-2 py-1" />
      <button className="rounded bg-blue-600 px-3 py-1 text-white">Thêm lịch</button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
