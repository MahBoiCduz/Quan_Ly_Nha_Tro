"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { formatVND } from "@/lib/format";
import { computeMeterAmount, buildDefaultLineItems } from "@/lib/billing";
import type { LineItem } from "@/lib/billing";
import { generateBill, updateBill } from "./bill-actions";

type Service = { name: string; measureUnit: string; defaultPrice: number };
type Unit = { id: string; name: string; billingProfileId: string | null; agreedRent: number; services: Service[] };
type Profile = { id: string; name: string };
type Readings = Record<string, { elec: number; water: number }>;
type Row = { name: string; measureUnit: string; unitPrice: number; quantity: number };

// Pre-filled values for edit mode (line items come from the bill's frozen snapshot).
export type BillInitialValues = {
  type: string;
  unitId: string;
  unitName: string;
  periodLabel: string;
  dueDate: string; // "YYYY-MM-DD"
  billingProfileId: string | null;
  lineItems: LineItem[];
  electricityOld: number;
  electricityNew: number;
  electricityRate: number;
  waterOld: number;
  waterNew: number;
  waterRate: number;
};

type Props =
  | {
      mode?: "create";
      billId?: never;
      initialValues?: never;
      units: Unit[];
      profiles: Profile[];
      defaultUnitId?: string;
      lastReadings: Readings;
      defaultElectricityRate: number;
      defaultWaterRate: number;
    }
  | {
      mode: "edit";
      billId: string;
      initialValues: BillInitialValues;
      units?: never;
      profiles: Profile[];
      defaultUnitId?: never;
      lastReadings?: never;
      defaultElectricityRate?: never;
      defaultWaterRate?: never;
    };

type BillType = "room" | "elec_water" | "both";

const TYPE_OPTIONS: { key: BillType; label: string }[] = [
  { key: "both", label: "Cả hai" },
  { key: "room", label: "Tiền phòng" },
  { key: "elec_water", label: "Tiền điện nước" },
];

function rowsForUnit(u: Unit | undefined, months: number): Row[] {
  if (!u) return [];
  return buildDefaultLineItems(u.services, u.agreedRent, months).map((li) => ({
    name: li.name,
    measureUnit: li.measureUnit,
    unitPrice: li.unitPrice,
    quantity: li.quantity,
  }));
}

function rowsFromLineItems(items: LineItem[]): Row[] {
  return items.map((li) => ({
    name: li.name,
    measureUnit: li.measureUnit,
    unitPrice: li.unitPrice,
    quantity: li.quantity,
  }));
}

export function GenerateForm(props: Props) {
  const toast = useToast();
  const isEdit = props.mode === "edit";

  // ── State ──────────────────────────────────────────────────────
  const profileForUnit = (id?: string) =>
    !isEdit && props.units ? (props.units.find((u) => u.id === id)?.billingProfileId ?? "") : "";

  const [billType, setBillType] = useState<BillType>(() => {
    if (isEdit) {
      const t = props.initialValues.type as BillType;
      if (t === "room" || t === "elec_water" || t === "both") return t;
      return "both";
    }
    return "both";
  });

  const [unitId, setUnitId] = useState(
    isEdit ? props.initialValues.unitId : (props.defaultUnitId ?? ""),
  );
  const [profileId, setProfileId] = useState(
    isEdit ? (props.initialValues.billingProfileId ?? "") : profileForUnit(props.defaultUnitId),
  );
  const [months, setMonths] = useState("1");
  const [rows, setRows] = useState<Row[]>(() => {
    if (isEdit) return rowsFromLineItems(props.initialValues.lineItems);
    return rowsForUnit(props.units.find((u) => u.id === props.defaultUnitId), 1);
  });
  const [periodLabel, setPeriodLabel] = useState(isEdit ? props.initialValues.periodLabel : "");
  const [dueDate, setDueDate] = useState(isEdit ? props.initialValues.dueDate : "");

  // Meter readings
  const [elecOld, setElecOld] = useState<string>(() => {
    if (isEdit) return String(props.initialValues.electricityOld);
    return String(props.lastReadings?.[props.defaultUnitId ?? ""]?.elec ?? "");
  });
  const [elecNew, setElecNew] = useState(isEdit ? String(props.initialValues.electricityNew) : "");
  const [elecRate, setElecRate] = useState(
    isEdit ? String(props.initialValues.electricityRate) : String(props.defaultElectricityRate ?? 4000),
  );
  const [waterOld, setWaterOld] = useState<string>(() => {
    if (isEdit) return String(props.initialValues.waterOld);
    return String(props.lastReadings?.[props.defaultUnitId ?? ""]?.water ?? "");
  });
  const [waterNew, setWaterNew] = useState(isEdit ? String(props.initialValues.waterNew) : "");
  const [waterRate, setWaterRate] = useState(
    isEdit ? String(props.initialValues.waterRate) : String(props.defaultWaterRate ?? 35000),
  );

  const monthsNum = Math.max(1, Number(months) || 1);

  // ── Handlers ───────────────────────────────────────────────────
  function onUnitChange(id: string) {
    if (isEdit) return;
    setUnitId(id);
    setElecOld(props.lastReadings?.[id]?.elec != null ? String(props.lastReadings[id].elec) : "");
    setWaterOld(props.lastReadings?.[id]?.water != null ? String(props.lastReadings[id].water) : "");
    setProfileId(profileForUnit(id));
    setRows(rowsForUnit(props.units?.find((u) => u.id === id), monthsNum));
  }

  function onMonthsChange(v: string) {
    setMonths(v);
    const m = Math.max(1, Number(v) || 1);
    setRows((rs) => rs.map((r) => ({ ...r, quantity: m })));
  }

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { name: "", measureUnit: "", unitPrice: 0, quantity: isEdit ? 1 : monthsNum }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const validRows = rows.filter((r) => r.name.trim() !== "");
  const subtotal = validRows.reduce((s, r) => s + r.unitPrice * r.quantity, 0);
  const elecAmount = computeMeterAmount(Number(elecOld || 0), Number(elecNew || 0), Number(elecRate || 0));
  const waterAmount = computeMeterAmount(Number(waterOld || 0), Number(waterNew || 0), Number(waterRate || 0));

  // Local "today" as YYYY-MM-DD for create-mode due-date check.
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());

  // ── Submit ─────────────────────────────────────────────────────
  async function onSubmit(formData: FormData) {
    if (billType !== "elec_water" && validRows.length === 0) {
      toast.error("Cần ít nhất 1 dòng tiền phòng/dịch vụ");
      return;
    }
    if (billType !== "room" && Number(elecNew || 0) < Number(elecOld || 0)) {
      toast.error("Số điện mới phải lớn hơn hoặc bằng số cũ");
      return;
    }
    if (billType !== "room" && Number(waterNew || 0) < Number(waterOld || 0)) {
      toast.error("Số nước mới phải lớn hơn hoặc bằng số cũ");
      return;
    }
    // Only enforce future due-date on create; edits may legitimately have a past date.
    if (!isEdit && String(formData.get("dueDate") ?? "") < today) {
      toast.error("Hạn thanh toán phải từ hôm nay trở đi");
      return;
    }

    if (isEdit) {
      const res = await updateBill(props.billId, formData);
      if (res?.error) toast.error(res.error);
      // On success, updateBill redirects back to the bill detail page.
    } else {
      const res = await generateBill(formData);
      if (res?.error) toast.error(res.error);
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <form action={onSubmit} className="max-w-2xl space-y-4">
      {/* Type + lineItems ride along as hidden inputs */}
      <input type="hidden" name="type" value={billType} />
      <input type="hidden" name="lineItems" value={JSON.stringify(validRows)} />

      {/* Bill type selector */}
      <div className="flex gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setBillType(opt.key)}
            className={
              billType === opt.key
                ? "rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-surface"
                : "rounded-full border border-line px-4 py-1.5 text-sm text-muted hover:bg-cream"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Unit selector — dropdown in create mode, read-only display in edit mode */}
        {isEdit ? (
          <div>
            <label className="label">Phòng</label>
            <input type="hidden" name="unitId" value={props.initialValues.unitId} />
            <p className="input bg-cream text-ink">{props.initialValues.unitName}</p>
          </div>
        ) : (
          <div>
            <label className="label">Phòng</label>
            <select name="unitId" required className="input" value={unitId} onChange={(e) => onUnitChange(e.target.value)}>
              <option value="">— Chọn phòng —</option>
              {props.units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Months selector — only in create mode; edit mode preserves stored quantities */}
        {!isEdit && (
          <div>
            <label className="label">Số tháng tính tiền</label>
            <input type="number" min="1" className="input" value={months} onChange={(e) => onMonthsChange(e.target.value)} />
          </div>
        )}

        <div>
          <label className="label">Kì thanh toán</label>
          <input name="periodLabel" placeholder="vd: Tháng 6/2026" required className="input" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
        </div>
        <div>
          <label className="label">Hạn thanh toán</label>
          <input name="dueDate" type="date" min={isEdit ? undefined : today} required className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      {props.profiles.length > 0 && (
        <div>
          <label className="label">Hồ sơ thu tiền (STK/QR)</label>
          <select name="billingProfileId" className="input" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            <option value="">Mặc định</option>
            {props.profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-muted">Tự chọn theo phòng, có thể đổi.</p>
        </div>
      )}

      {/* Line items section — hidden for elec_water */}
      {billType !== "elec_water" && (
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
                    <td colSpan={5} className="py-2 text-center text-muted">
                      {isEdit ? "Chưa có dòng nào." : "Chọn phòng để tự điền tiền phòng + dịch vụ."}
                    </td>
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
      )}

      {/* Electricity section — hidden for room */}
      {billType !== "room" && (
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
      )}

      {/* Water section — hidden for room */}
      {billType !== "room" && (
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
      )}

      <button className="btn-primary">{isEdit ? "Lưu thay đổi" : "Tạo hóa đơn"}</button>
    </form>
  );
}
