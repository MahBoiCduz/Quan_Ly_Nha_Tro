"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";
import { addServiceItem, deleteServiceItem } from "./service-actions";

type Item = { id: string; name: string; measureUnit: string; defaultPrice: number };

export function ServiceEditor({ unitId, items }: { unitId: string; items: Item[] }) {
  const [error, setError] = useState("");

  async function onAdd(formData: FormData) {
    setError("");
    const res = await addServiceItem(unitId, formData);
    if (res?.error) setError(res.error);
  }

  return (
    <div>
      <ul className="mb-3 rounded border bg-white">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between border-b px-3 py-2 last:border-0">
            <span>{s.name} ({s.measureUnit}) — {formatVND(s.defaultPrice)}</span>
            <button onClick={() => deleteServiceItem(s.id, unitId)}
              className="text-sm text-red-600 hover:underline">Xóa</button>
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Chưa có dịch vụ.</li>}
      </ul>
      <form action={onAdd} className="flex flex-wrap gap-2">
        <input name="name" placeholder="Tên dịch vụ" required className="rounded border px-2 py-1" />
        <input name="measureUnit" placeholder="Đơn vị (phòng/người/xe)" required className="rounded border px-2 py-1" />
        <input name="defaultPrice" type="number" min="0" placeholder="Đơn giá" required className="w-32 rounded border px-2 py-1" />
        <button className="rounded bg-blue-600 px-3 py-1 text-white">Thêm</button>
      </form>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
