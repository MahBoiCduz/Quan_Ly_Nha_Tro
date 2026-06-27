"use client";

import { useToast } from "@/components/toast";
import { generateBill } from "./bill-actions";

type Unit = { id: string; name: string };

export function GenerateForm({ units, defaultUnitId }: { units: Unit[]; defaultUnitId?: string }) {
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    const res = await generateBill(formData);
    if (res?.error) toast.error(res.error);
  }

  return (
    <form action={onSubmit} className="max-w-md space-y-3">
      <div>
        <label className="label">Phòng</label>
        <select name="unitId" required className="input">
          <option value="">— Chọn phòng —</option>
          {units.map((u) => (
            <option key={u.id} value={u.id} selected={u.id === defaultUnitId}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Kì thanh toán</label>
        <input name="periodLabel" placeholder="Kì thanh toán (vd: Tháng 6/2026)" required className="input" />
      </div>
      <div>
        <label className="label">Hạn thanh toán</label>
        <input name="dueDate" type="date" required className="input" />
      </div>
      <div>
        <label className="label">Tiền điện</label>
        <input name="electricityAmount" type="number" min="0" placeholder="Tiền điện" defaultValue={0} className="input" />
      </div>
      <div>
        <label className="label">Tiền nước</label>
        <input name="waterAmount" type="number" min="0" placeholder="Tiền nước" defaultValue={0} className="input" />
      </div>
      <button className="btn-primary">Tạo hóa đơn</button>
    </form>
  );
}
