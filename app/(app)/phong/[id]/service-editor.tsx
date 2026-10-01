"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatVND } from "@/lib/format";
import { addServiceItem, deleteServiceItem, updateServiceItem } from "./service-actions";
import { useToast } from "@/components/toast";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

type Item = {
  id: string;
  name: string;
  measureUnit: string;
  defaultPrice: number;
  perPerson: boolean;
  defaultQuantity: number;
};

type Draft = {
  name: string;
  measureUnit: string;
  defaultPrice: string;
  defaultQuantity: string;
  perPerson: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  measureUnit: "",
  defaultPrice: "",
  defaultQuantity: "1",
  perPerson: false,
};

function draftFrom(item: Item): Draft {
  return {
    name: item.name,
    measureUnit: item.measureUnit,
    defaultPrice: String(item.defaultPrice),
    defaultQuantity: String(item.defaultQuantity),
    perPerson: item.perPerson,
  };
}

/** Nhãn cách tính số lượng: theo số người ở, hoặc SL mặc định khác 1 (ví dụ "2 xe"). */
function quantityLabel(item: Item) {
  if (item.perPerson) return "× số người ở";
  if (item.defaultQuantity !== 1) return `${item.defaultQuantity} ${item.measureUnit}`;
  return null;
}

function ServiceFields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <>
      <input
        name="name"
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder="Tên dịch vụ"
        required
        className="input"
      />
      <input
        name="measureUnit"
        value={draft.measureUnit}
        onChange={(e) => onChange({ ...draft, measureUnit: e.target.value })}
        placeholder="Đơn vị (phòng/người/xe)"
        required
        className="input"
      />
      <input
        name="defaultPrice"
        type="number"
        min="0"
        value={draft.defaultPrice}
        onChange={(e) => onChange({ ...draft, defaultPrice: e.target.value })}
        placeholder="Đơn giá"
        required
        className="input w-32"
      />
      <input
        name="defaultQuantity"
        type="number"
        min="0"
        value={draft.defaultQuantity}
        onChange={(e) => onChange({ ...draft, defaultQuantity: e.target.value })}
        placeholder="Số lượng"
        disabled={draft.perPerson}
        title={draft.perPerson ? "Lấy theo số người ở" : "Số lượng mặc định theo đơn vị (số xe, số phòng…)"}
        className="input w-28 disabled:opacity-50"
      />
      {draft.perPerson && <input type="hidden" name="defaultQuantity" value={draft.defaultQuantity} />}
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="perPerson"
          checked={draft.perPerson}
          onChange={(e) => onChange({ ...draft, perPerson: e.target.checked })}
          className="h-4 w-4 accent-brand"
        />
        Tính theo số người
      </label>
      {draft.perPerson && <span className="text-xs text-muted">Số lượng lấy theo số người ở</span>}
    </>
  );
}

export function ServiceEditor({ unitId, items }: { unitId: string; items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);

  async function onAdd(formData: FormData) {
    const res = await addServiceItem(unitId, formData);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Đã thêm dịch vụ");
      setNewDraft(EMPTY_DRAFT);
      // Same form-action refresh issue as NewLeaseForm — force a reload so the
      // service list re-renders with the new item.
      setTimeout(() => window.location.reload(), 600);
    }
  }

  async function onSave(formData: FormData) {
    if (!editingId) return;
    const res = await updateServiceItem(editingId, unitId, formData);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Đã lưu dịch vụ");
      setEditingId(null);
      router.refresh();
    }
  }

  async function onDelete(id: string) {
    await deleteServiceItem(id, unitId);
    router.refresh();
    toast.success("Đã xóa dịch vụ");
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditDraft(draftFrom(item));
  }

  return (
    <div>
      <ul className="card mb-3">
        {items.map((s) => {
          const label = quantityLabel(s);
          if (editingId === s.id) {
            return (
              <li key={s.id} className="border-b border-line px-3 py-3 last:border-0">
                <form action={onSave} className="flex flex-wrap items-center gap-2">
                  <ServiceFields draft={editDraft} onChange={setEditDraft} />
                  <button className="btn-primary flex items-center gap-1">
                    <Check size={18} />
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1 text-sm text-muted hover:text-ink"
                  >
                    <X size={16} />
                    Hủy
                  </button>
                </form>
              </li>
            );
          }
          return (
            <li key={s.id} className="flex items-center justify-between border-b border-line px-3 py-2 last:border-0">
              <span className="text-ink">
                {s.name} ({s.measureUnit}) — {formatVND(s.defaultPrice)}
                {label && <span className="ml-2 text-xs text-muted">· {label}</span>}
              </span>
              <span className="flex items-center gap-3">
                <button
                  onClick={() => startEdit(s)}
                  className="flex items-center gap-1 text-sm text-muted hover:text-ink"
                >
                  <Pencil size={16} />
                  Sửa
                </button>
                <button onClick={() => onDelete(s.id)} className="btn-link-danger flex items-center gap-1">
                  <Trash2 size={16} />
                  Xóa
                </button>
              </span>
            </li>
          );
        })}
        {items.length === 0 && <li className="px-3 py-2 text-sm text-muted">Chưa có dịch vụ.</li>}
      </ul>
      <form action={onAdd} className="flex flex-wrap items-center gap-2">
        <ServiceFields draft={newDraft} onChange={setNewDraft} />
        <button className="btn-primary flex items-center gap-1">
          <Plus size={18} />
          Thêm
        </button>
      </form>
    </div>
  );
}
