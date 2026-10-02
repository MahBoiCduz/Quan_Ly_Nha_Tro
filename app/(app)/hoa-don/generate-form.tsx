"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { formatVND } from "@/lib/format";
import { computeMeterAmount, buildDefaultLineItems, lineAmount } from "@/lib/billing";
import type { LineItem } from "@/lib/billing";
import { generateBill, updateBill } from "./bill-actions";
import { loadTrackingContext } from "./tracking-actions";
import { BillPeriodPicker } from "@/components/bill-period-picker";
import { trackingInputSchema, trackingTitle } from "@/lib/tracking";
import type { TrackingContext } from "@/lib/tracking";

type Service = { name: string; measureUnit: string; defaultPrice: number; perPerson: boolean; defaultQuantity: number };
type Unit = { id: string; name: string; billingProfileId: string | null; agreedRent: number; occupancy: number; services: Service[] };
type Profile = { id: string; name: string };
type Row = {
  name: string;
  measureUnit: string;
  unitPrice: number;
  quantity: number;
  /** Months charged for this line — the second axis, next to quantity. */
  months?: number;
  /** Quantity comes from the room's occupancy (per-person service). */
  perPerson?: boolean;
  customMonths?: boolean;
};

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
  roomMonths?: string[];
  utilityMonths?: string[];
};

type Props =
  | {
      mode?: "create";
      billId?: never;
      initialValues?: never;
      units: Unit[];
      profiles: Profile[];
      defaultUnitId?: string;
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
  return buildDefaultLineItems(u.services, u.agreedRent, months, u.occupancy).map((li) => ({
    name: li.name,
    measureUnit: li.measureUnit,
    unitPrice: li.unitPrice,
    quantity: li.quantity,
    months: li.months,
    perPerson: li.perPerson,
  }));
}

function rowsFromLineItems(items: LineItem[]): Row[] {
  return items.map((li) => ({
    name: li.name,
    measureUnit: li.measureUnit,
    unitPrice: li.unitPrice,
    quantity: li.quantity,
    months: li.months,
    perPerson: li.perPerson,
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
  const [roomMonths, setRoomMonths] = useState<string[]>(isEdit ? props.initialValues.roomMonths ?? [] : []);
  const [utilityMonths, setUtilityMonths] = useState<string[]>(isEdit ? props.initialValues.utilityMonths ?? [] : []);
  const [context, setContext] = useState<TrackingContext>();
  const [contextError, setContextError] = useState("");
  const [loadingContext, setLoadingContext] = useState(false);
  const [reload, setReload] = useState(0);
  const [titleEdited, setTitleEdited] = useState(isEdit);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setContext(undefined); setContextError("");
    if (!unitId) return;
    setLoadingContext(true);
    loadTrackingContext(unitId, isEdit ? props.billId : undefined).then(result => {
      if (cancelled) return;
      setContext(result.context); setContextError(result.error ?? "");
    }).catch(() => { if (!cancelled) setContextError("Không tải được tình trạng thanh toán. Vui lòng thử lại."); }).finally(() => { if (!cancelled) setLoadingContext(false); });
    return () => { cancelled = true; };
  }, [unitId, isEdit, props.billId, reload]);
  const [rows, setRows] = useState<Row[]>(() => {
    if (isEdit) return rowsFromLineItems(props.initialValues.lineItems);
    return rowsForUnit(props.units.find((u) => u.id === props.defaultUnitId), 1);
  });
  const [periodLabel, setPeriodLabel] = useState(isEdit ? props.initialValues.periodLabel : "");
  const [dueDate, setDueDate] = useState(isEdit ? props.initialValues.dueDate : "");

  // Meter readings
  const [elecOld, setElecOld] = useState<string>(() => {
    if (isEdit) return String(props.initialValues.electricityOld);
    return "";
  });
  const [elecNew, setElecNew] = useState(isEdit ? String(props.initialValues.electricityNew) : "");
  const [elecRate, setElecRate] = useState(
    isEdit ? String(props.initialValues.electricityRate) : String(props.defaultElectricityRate ?? 4000),
  );
  const [waterOld, setWaterOld] = useState<string>(() => {
    if (isEdit) return String(props.initialValues.waterOld);
    return "";
  });
  const [waterNew, setWaterNew] = useState(isEdit ? String(props.initialValues.waterNew) : "");
  const [waterRate, setWaterRate] = useState(
    isEdit ? String(props.initialValues.waterRate) : String(props.defaultWaterRate ?? 35000),
  );

  const monthsNum = Math.max(1, roomMonths.length);
  const titleSuggestion = trackingTitle(roomMonths, utilityMonths, billType);
  useEffect(() => { if (!titleEdited) setPeriodLabel(titleSuggestion); }, [titleSuggestion, titleEdited]);

  function onPeriodChange(category: "room" | "elec_water", selected: string[]) {
    if (category === "room") {
      setRoomMonths(selected);
      if (!isEdit) setRows(rs => rs.map(r => r.customMonths ? r : { ...r, months: Math.max(1, selected.length) }));
    } else {
      setUtilityMonths(selected);
      if (!isEdit && context) {
        const earliest = [...selected].sort()[0];
        const previous = context.bills.filter(b => b.trackingPeriods.some(p => p.category === "elec_water") && b.trackingPeriods.filter(p => p.category === "elec_water").every(p => p.month < earliest)).sort((a, b) => {
          const last = (bill: typeof a) => bill.trackingPeriods.filter(p => p.category === "elec_water").map(p => p.month).sort().pop() ?? "";
          return last(b).localeCompare(last(a));
        })[0];
        setElecOld(previous?.electricityNew != null ? String(previous.electricityNew) : "");
        setWaterOld(previous?.waterNew != null ? String(previous.waterNew) : "");
      }
    }
  }

  // ── Handlers ───────────────────────────────────────────────────
  function onUnitChange(id: string) {
    if (isEdit) return;
    setUnitId(id);
    setRoomMonths([]); setUtilityMonths([]); setTitleEdited(false);
    setElecOld(""); setWaterOld(""); setElecNew(""); setWaterNew("");
    setProfileId(profileForUnit(id));
    setRows(rowsForUnit(props.units?.find((u) => u.id === id), 1));
  }

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { name: "", measureUnit: "", unitPrice: 0, quantity: 1, months: isEdit ? 1 : monthsNum }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const validRows = rows.filter((r) => r.name.trim() !== "");
  const subtotal = validRows.reduce((s, r) => s + lineAmount(r.quantity, r.unitPrice, r.months), 0);
  const elecAmount = computeMeterAmount(Number(elecOld || 0), Number(elecNew || 0), Number(elecRate || 0));
  const waterAmount = computeMeterAmount(Number(waterOld || 0), Number(waterNew || 0), Number(waterRate || 0));

  // Local "today" as YYYY-MM-DD for create-mode due-date check.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

  // ── Submit ─────────────────────────────────────────────────────
  async function onSubmit(formData: FormData) {
    if (!context || loadingContext || pending) { toast.error("Vui lòng tải tình trạng thanh toán trước khi lưu."); return; }
    const periods = trackingInputSchema.safeParse({ type: billType, roomMonths, utilityMonths });
    if (!periods.success) { toast.error(periods.error.issues[0]?.message ?? "Kỳ không hợp lệ."); return; }
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

    setPending(true);
    try { if (isEdit) {
      const res = await updateBill(props.billId, formData);
      if (res?.error) toast.error(res.error);
      // On success, updateBill redirects back to the bill detail page.
    } else {
      const res = await generateBill(formData);
      if (res?.error) toast.error(res.error);
    } } finally { setPending(false); }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <form action={onSubmit} className="space-y-4">
      {/* Type + lineItems ride along as hidden inputs */}
      <input type="hidden" name="type" value={billType} />
      <input type="hidden" name="lineItems" value={JSON.stringify(validRows)} />
      <input type="hidden" name="roomMonths" value={JSON.stringify(billType === "elec_water" ? [] : roomMonths)} />
      <input type="hidden" name="utilityMonths" value={JSON.stringify(billType === "room" ? [] : utilityMonths)} />
      <input type="hidden" name="trackingLeaseId" value={context?.leaseId ?? ""} />

      {/* Bill type selector */}
      <div className="flex gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            aria-pressed={billType === opt.key}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <div>
          <label className="label">Kì thanh toán</label>
          <input name="periodLabel" placeholder="vd: Tháng 6/2026" required className="input" value={periodLabel} onChange={(e) => { setTitleEdited(true); setPeriodLabel(e.target.value); }} />
          {titleEdited && titleSuggestion && titleSuggestion !== periodLabel && <button type="button" className="mt-1 text-xs text-brand-ink" onClick={() => { setPeriodLabel(titleSuggestion); setTitleEdited(false); }}>Áp dụng kỳ gợi ý: {titleSuggestion}</button>}
        </div>
        <div>
          <label className="label">Hạn thanh toán</label>
          <input name="dueDate" type="date" min={isEdit ? undefined : today} required className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      {loadingContext && <p className="card p-4 text-sm text-muted" role="status">Đang tải tình trạng thanh toán…</p>}
      {contextError && <div className="card p-4" role="alert"><p className="text-danger">{contextError}</p><button type="button" className="btn-secondary mt-2" onClick={() => setReload(n => n + 1)}>Thử lại</button></div>}
      {context && <BillPeriodPicker type={billType} roomMonths={roomMonths} utilityMonths={utilityMonths} onChange={onPeriodChange} context={context} billId={isEdit ? props.billId : undefined} />}
      {!isEdit && billType !== "room" && utilityMonths.length > 0 && (elecOld === "" || waterOld === "") && <p className="rounded-xl bg-warn-tint p-3 text-sm text-warn-ink">Chưa xác định đủ chỉ số cuối kỳ trước. Đối chiếu và nhập số cũ trước khi tạo hóa đơn.</p>}

      {props.profiles.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted">Hồ sơ thu tiền · {props.profiles.find(p => p.id === profileId)?.name ?? "Mặc định"}</summary>
          <label className="label">Hồ sơ thu tiền (STK/QR)</label>
          <select name="billingProfileId" className="input" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            <option value="">Mặc định</option>
            {props.profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-muted">Tự chọn theo phòng, có thể đổi.</p>
        </details>
      )}

      <div className={billType === "both" ? "grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]" : "space-y-4"}>
      {/* Line items section — hidden for elec_water */}
      {billType !== "elec_water" && (
        <fieldset className="card min-w-0 space-y-2 p-4">
          <legend className="px-1 text-sm font-medium text-muted">Tiền phòng & dịch vụ · {isEdit ? "giữ số tháng từng dòng" : `${roomMonths.length} tháng`}</legend>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="py-1 text-left font-medium">Tên dịch vụ</th>
                  <th className="w-28 py-1 text-right font-medium">Đơn giá</th>
                  <th className="w-16 py-1 text-center font-medium">SL</th>
                  <th className="w-28 py-1 text-right font-medium">Thành tiền</th>
                  <th className="w-8 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <div className="min-w-36 space-y-1">
                        <input className="input" placeholder="Tên dịch vụ" value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
                        {r.perPerson && (
                          <span className="block text-xs text-muted">Theo số người</span>
                        )}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" className="input text-right" value={r.unitPrice} onChange={(e) => updateRow(i, { unitPrice: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min="0" step="any" className="input text-center" value={r.quantity} onChange={(e) => updateRow(i, { quantity: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="py-1 pr-2 text-right text-ink">{formatVND(lineAmount(r.quantity, r.unitPrice, r.months))}</td>
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
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Tùy chỉnh đơn vị và số tháng từng dòng</summary>
            <div className="mt-3 space-y-3">{rows.map((r, i) => <div key={i} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
              <span className="text-sm">{r.name || `Dòng ${i + 1}`}</span>
              <label className="text-xs text-muted">Đơn vị<input className="input" value={r.measureUnit} onChange={e => updateRow(i, { measureUnit: e.target.value })} /></label>
              <label className="text-xs text-muted">Số tháng<input type="number" min="1" required className="input" value={r.months ?? 1} onChange={e => updateRow(i, { months: Number(e.target.value), customMonths: true })} /></label>
            </div>)}</div>
          </details>
          <p className="text-xs text-muted">
            Thành tiền = SL × đơn giá × số tháng. Điện nước không dùng cột này (tính theo chỉ số).
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={addRow} className="btn-secondary inline-flex items-center gap-1 text-sm">
              <Plus size={16} /> Thêm dòng
            </button>
            <span className="text-sm text-muted">Tạm tính: <span className="font-medium text-ink">{formatVND(subtotal)}</span></span>
          </div>
        </fieldset>
      )}

      <div className="space-y-4">
      {/* Electricity section — hidden for room */}
      {billType !== "room" && (
        <fieldset className="card min-w-0 space-y-3 p-4">
          <legend className="px-1 text-sm font-medium text-muted">Điện</legend>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-2">
            <div>
              <label className="label">Số cũ</label>
              <input name="electricityOld" type="number" min="0" required className="input" value={elecOld} onChange={(e) => setElecOld(e.target.value)} />
            </div>
            <div>
              <label className="label">Số mới</label>
              <input name="electricityNew" type="number" min="0" required className="input" value={elecNew} onChange={(e) => setElecNew(e.target.value)} />
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
        <fieldset className="card min-w-0 space-y-3 p-4">
          <legend className="px-1 text-sm font-medium text-muted">Nước</legend>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-2">
            <div>
              <label className="label">Số cũ</label>
              <input name="waterOld" type="number" min="0" step="any" required className="input" value={waterOld} onChange={(e) => setWaterOld(e.target.value)} />
            </div>
            <div>
              <label className="label">Số mới</label>
              <input name="waterNew" type="number" min="0" step="any" required className="input" value={waterNew} onChange={(e) => setWaterNew(e.target.value)} />
            </div>
            <div>
              <label className="label">Đơn giá</label>
              <input name="waterRate" type="number" min="0" className="input" value={waterRate} onChange={(e) => setWaterRate(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-muted">Tiền nước: <span className="font-medium text-ink">{formatVND(waterAmount)}</span></p>
        </fieldset>
      )}

      </div></div>
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-sm text-muted">Tổng thanh toán</p><p data-testid="bill-total" className="text-xl font-semibold">{formatVND((billType === "elec_water" ? 0 : subtotal) + (billType === "room" ? 0 : elecAmount + waterAmount))}</p></div>
        <button className="btn-primary" disabled={pending || !context || loadingContext}>{pending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo hóa đơn"}</button>
      </div>
    </form>
  );
}
