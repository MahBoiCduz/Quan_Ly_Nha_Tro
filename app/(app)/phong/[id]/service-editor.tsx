"use client";

import { formatVND } from "@/lib/format";
import { addServiceItem, deleteServiceItem } from "./service-actions";
import { useToast } from "@/components/toast";
import { Plus, Trash2 } from "lucide-react";

type Item = { id: string; name: string; measureUnit: string; defaultPrice: number };

export function ServiceEditor({ unitId, items }: { unitId: string; items: Item[] }) {
  const toast = useToast();

  async function onAdd(formData: FormData) {
    const res = await addServiceItem(unitId, formData);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã thêm dịch vụ");
  }

  async function onDelete(id: string) {
    await deleteServiceItem(id, unitId);
    toast.success("Đã xóa dịch vụ");
  }

  return (
    <div>
      <ul className="card mb-3">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between border-b border-line px-3 py-2 last:border-0">
            <span className="text-ink">{s.name} ({s.measureUnit}) — {formatVND(s.defaultPrice)}</span>
            <button onClick={() => onDelete(s.id)}
              className="btn-link-danger flex items-center gap-1">
              <Trash2 size={16} />
              Xóa
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-2 text-sm text-muted">Chưa có dịch vụ.</li>}
      </ul>
      <form action={onAdd} className="flex flex-wrap gap-2">
        <input name="name" placeholder="Tên dịch vụ" required className="input" />
        <input name="measureUnit" placeholder="Đơn vị (phòng/người/xe)" required className="input" />
        <input name="defaultPrice" type="number" min="0" placeholder="Đơn giá" required className="input w-32" />
        <button className="btn-primary flex items-center gap-1">
          <Plus size={18} />
          Thêm
        </button>
      </form>
    </div>
  );
}
