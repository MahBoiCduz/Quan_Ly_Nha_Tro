"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { formatVND } from "@/lib/format";
import { computeMeterAmount, buildDefaultLineItems } from "@/lib/billing";
import { generateBill } from "./bill-actions";

type Service = { name: string; measureUnit: string; defaultPrice: number };
type Unit = { id: string; name: string; billingProfileId: string | null; agreedRent: number; services: Service[] };
type Profile = { id: string; name: string };
type Readings = Record<string, { elec: number; water: number }>;
type Row = { name: string; measureUnit: string; unitPrice: number; quantity: number };

function rowsForUnit(u: Unit | undefined, months: number): Row[] {
  if (!u) return [];
  return buildDefaultLineItems(u.services, u.agreedRent, months).map((li) => ({
    name: li.name,
    measureUnit: li.measureUnit,
    unitPrice: li.unitPrice,
    quantity: li.quantity,
  }));
}

export function GenerateForm({
  units,
  profiles,
  defaultUnitId,
  lastReadings,
  defaultElectricityRate,
  defaultWaterRate,
}: {
  units: Unit[];
  profiles: Profile[];
  defaultUnitId?: string;
  lastReadings: Readings;
  defaultElectricityRate: number;
  defaultWaterRate: number;
}) {
  const toast = useToast();
  const profileForUnit = (id?: string) => units.find((u) => u.id === id)?.billingProfileId ?? "";
  const [unitId, setUnitId] = useState(defaultUnitId ?? "");
  const [profileId, setProfileId] = useState(profileForUnit(defaultUnitId));
  const [months, setMonths] = useState("1");
  const [rows, setRows] = useState<Row[]>(() => rowsForUnit(units.find((u) => u.id === defaultUnitId), 1));
  const [elecOld, setElecOld] = useState<string>(String(lastReadings[unitId]?.elec ?? ""));
  const [elecNew, setElecNew] = useState("");
  const [elecRate, setElecRate] = useState(String(defaultElectricityRate));
  const [waterOld, setWaterOld] = useState<string>(String(lastReadings[unitId]?.water ?? ""));
  const [waterNew, setWaterNew] = useState("");
  const [waterRate, setWaterRate] = useState(String(defaultWaterRate));

  const monthsNum = Math.max(1, Number(months) || 1);

  function onUnitChange(id: string) {
    setUnitId(id);
    setElecOld(lastReadings[id]?.elec != null ? String(lastReadings[id].elec) : "");
    setWaterOld(lastReadings[id]?.water != null ? String(lastReadings[id].water) : "");
    setProfileId(profileForUnit(id));
    setRows(rowsForUnit(units.find((u) => u.id === id), monthsNum));
  }

  function onMonthsChange(v: string) {
    setMonths(v);
    const m = Math.max(1, Number(v) || 1);
    setRows((rs) => rs.map((r) => ({ ...r, quantity: m })));
  }

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { name: "", measureUnit: "", unitPrice: 0, quantity: monthsNum }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const validRows = rows.filter((r) => r.name.trim() !== "");
  const subtotal = validRows.reduce((s, r) => s + r.unitPrice * r.quantity, 0);
  const elecAmount = computeMeterAmount(Number(elecOld || 0), Number(elecNew || 0), Number(elecRate || 0));
  const waterAmount = computeMeterAmount(Number(waterOld || 0), Number(waterNew || 0), Number(waterRate || 0));

  // Local "today" as YYYY-MM-DD for the date input's min + the pre-submit check.
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());

  async function onSubmit(formData: FormData) {
    if (validRows.length === 0) {
      toast.error("Cần ít nhất 1 dòng tiền phòng/dịch vụ");
      return;
    }
    if (Number(elecNew || 0) < Number(elecOld || 0)) {
      toast.error("Số điện mới phải lớn hơn hoặc bằng số cũ");
      return;
    }
    if (Number(waterNew || 0) < Number(waterOld || 0)) {
      toast.error("Số nước mới phải lớn hơn hoặc bằng số cũ");
      return;
    }
    if (String(formData.get("dueDate") ?? "") < today) {
      toast.error("Hạn thanh toán phải từ hôm nay trở đi");
      return;
    }
    const res = await generateBill(formData);
    if (res?.error) toast.error(res.error);
  }

  return (
    <form action={onSubmit} className="max-w-2xl space-y-4">
      {/* lineItems rides along as a native hidden input (reliable in prod build) */}
      <input type="hidden" name="lineItems" value={JSON.stringify(validRows)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Phòng</label>
          <select name="unitId" required className="input" value={unitId} onChange={(e) => onUnitChange(e.target.value)}>
            <option value="">— Chọn phòng —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Số tháng tính tiền</label>
          <input type="number" min="1" className="input" value={months} onChange={(e) => onMonthsChange(e.target.value)} />
        </div>
        <div>
          <label className="label">Kì thanh toán</label>
          <input name="periodLabel" placeholder="vd: Tháng 6/2026" required className="input" />
        </div>
        <div>
          <label className="label">Hạn thanh toán</label>
          <input name="dueDate" type="date" min={today} required className="input" />
        </div>
      </div>

      {profiles.length > 0 && (
        <div>
          <label className="label">Hồ sơ thu tiền (STK/QR)</label>
          <select name="billingProfileId" className="input" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            <option value="">Mặc định</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-muted">Tự chọn theo phòng, có thể đổi.</p>
        </div>
      )}

      <fieldset className="card space-y-2 p-4">
        <legend className="px-1 text-sm font-medium text-muted">Tiền phòng & dịch vụ</legend>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="py-1 text-left font-medium">Tên dịch vụ</th>
                <th className="w-28 py-1 text-right font-medium">Đơn giá</th>
                <th className="w-16 py-1 text-center font-medium">Số lượng</th>
                <th className="w-28 py-1 text-right font-medium">Thành tiền</th>
                <th className="w-8 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input className="input" placeholder="Tên dịch vụ" value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" min="0" className="input text-right" value={r.unitPrice} onChange={(e) => updateRow(i, { unitPrice: Number(e.target.value) || 0 })} />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" min="0" step="any" className="input text-center" value={r.quantity} onChange={(e) => updateRow(i, { quantity: Number(e.target.value) || 0 })} />
                  </td>
                  <td className="py-1 pr-2 text-right text-ink">{formatVND(r.unitPrice * r.quantity)}</td>
                  <td className="py-1 text-center">
                    <button type="button" onClick={() => removeRow(i)} className="text-danger" aria-label="Xóa dòng">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2 text-center text-muted">Chọn phòng để tự điền tiền phòng + dịch vụ.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={addRow} className="btn-secondary inline-flex items-center gap-1 text-sm">
            <Plus size={16} /> Thêm dòng
          </button>
          <span className="text-sm text-muted">Tạm tính: <span className="font-medium text-ink">{formatVND(subtotal)}</span></span>
        </div>
      </fieldset>

      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 text-sm font-medium text-muted">Điện</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Số cũ</label>
            <input name="electricityOld" type="number" min="0" className="input" value={elecOld} onChange={(e) => setElecOld(e.target.value)} />
          </div>
          <div>
            <label className="label">Số mới</label>
            <input name="electricityNew" type="number" min="0" className="input" value={elecNew} onChange={(e) => setElecNew(e.target.value)} />
          </div>
          <div>
            <label className="label">Đơn giá</label>
            <input name="electricityRate" type="number" min="0" className="input" value={elecRate} onChange={(e) => setElecRate(e.target.value)} />
          </div>
        </div>
        <p className="text-sm text-muted">Tiền điện: <span className="font-medium text-ink">{formatVND(elecAmount)}</span></p>
      </fieldset>

      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 text-sm font-medium text-muted">Nước</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Số cũ</label>
            <input name="waterOld" type="number" min="0" step="any" className="input" value={waterOld} onChange={(e) => setWaterOld(e.target.value)} />
          </div>
          <div>
            <label className="label">Số mới</label>
            <input name="waterNew" type="number" min="0" step="any" className="input" value={waterNew} onChange={(e) => setWaterNew(e.target.value)} />
          </div>
          <div>
            <label className="label">Đơn giá</label>
            <input name="waterRate" type="number" min="0" className="input" value={waterRate} onChange={(e) => setWaterRate(e.target.value)} />
          </div>
        </div>
        <p className="text-sm text-muted">Tiền nước: <span className="font-medium text-ink">{formatVND(waterAmount)}</span></p>
      </fieldset>

      <button className="btn-primary">Tạo hóa đơn</button>
    </form>
  );
}
