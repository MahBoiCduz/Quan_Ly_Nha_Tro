"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { formatVND } from "@/lib/format";
import { computeMeterAmount } from "@/lib/billing";
import { generateBill } from "./bill-actions";

type Unit = { id: string; name: string; billingProfileId: string | null };
type Profile = { id: string; name: string };
type Readings = Record<string, { elec: number; water: number }>;

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
  const [elecOld, setElecOld] = useState<string>(String(lastReadings[unitId]?.elec ?? ""));
  const [elecNew, setElecNew] = useState("");
  const [elecRate, setElecRate] = useState(String(defaultElectricityRate));
  const [waterOld, setWaterOld] = useState<string>(String(lastReadings[unitId]?.water ?? ""));
  const [waterNew, setWaterNew] = useState("");
  const [waterRate, setWaterRate] = useState(String(defaultWaterRate));

  function onUnitChange(id: string) {
    setUnitId(id);
    setElecOld(lastReadings[id]?.elec != null ? String(lastReadings[id].elec) : "");
    setWaterOld(lastReadings[id]?.water != null ? String(lastReadings[id].water) : "");
    setProfileId(profileForUnit(id));
  }

  const elecAmount = computeMeterAmount(Number(elecOld || 0), Number(elecNew || 0), Number(elecRate || 0));
  const waterAmount = computeMeterAmount(Number(waterOld || 0), Number(waterNew || 0), Number(waterRate || 0));

  // Local "today" as YYYY-MM-DD for the date input's min + the pre-submit check.
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());

  async function onSubmit(formData: FormData) {
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
    <form action={onSubmit} className="max-w-md space-y-4">
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
        <label className="label">Kì thanh toán</label>
        <input name="periodLabel" placeholder="vd: Tháng 6/2026" required className="input" />
      </div>
      <div>
        <label className="label">Hạn thanh toán</label>
        <input name="dueDate" type="date" min={today} required className="input" />
      </div>
      {profiles.length > 0 && (
        <div>
          <label className="label">Hồ sơ thu tiền (STK/QR)</label>
          <select
            name="billingProfileId"
            className="input"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
          >
            <option value="">Mặc định</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-muted">Tự chọn theo phòng, có thể đổi.</p>
        </div>
      )}

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
