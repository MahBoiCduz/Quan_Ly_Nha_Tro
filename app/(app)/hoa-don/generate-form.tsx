"use client";

import { useState } from "react";
import { generateBill } from "./bill-actions";

type Unit = { id: string; name: string };

export function GenerateForm({ units }: { units: Unit[] }) {
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    const res = await generateBill(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="max-w-md space-y-3">
      <select name="unitId" required className="w-full rounded border px-3 py-2">
        <option value="">— Chọn phòng —</option>
        {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input name="periodLabel" placeholder="Kì thanh toán (vd: Tháng 6/2026)" required className="w-full rounded border px-3 py-2" />
      <label className="block text-sm">Hạn thanh toán
        <input name="dueDate" type="date" required className="w-full rounded border px-3 py-2" />
      </label>
      <input name="electricityAmount" type="number" min="0" placeholder="Tiền điện" defaultValue={0} className="w-full rounded border px-3 py-2" />
      <input name="waterAmount" type="number" min="0" placeholder="Tiền nước" defaultValue={0} className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Tạo hóa đơn</button>
    </form>
  );
}
