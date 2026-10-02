"use client";
import { useState } from "react";
import Link from "next/link";
import { trackingState, vietnamMonth } from "@/lib/tracking";
import type { TrackingBill } from "@/lib/tracking";
import { formatVND, formatDate } from "@/lib/format";
type Bill = TrackingBill & { unitId: string; tenantName: string; leaseId: string };
export function TrackingMatrix({ units, bills }: { units: { id: string; name: string; floor: number }[]; bills: Bill[] }) {
  const [year, setYear] = useState(Number(vietnamMonth(new Date()).slice(0, 4)));
  const [floor, setFloor] = useState("");
  const [unit, setUnit] = useState("");
  const [selection, setSelection] = useState<{ unitId: string; month: string; category: string }>();
  const [showUnassigned, setShowUnassigned] = useState(false);
  const unassigned = bills.filter(b => !b.trackingPeriods.length);
  const visible = units.filter(u => (!floor || String(u.floor) === floor) && (!unit || u.id === unit));
  const related = (unitId: string, month: string, category: string) => bills.filter(b => b.unitId === unitId && b.trackingPeriods.some(p => p.month === month && p.category === category));
  const selected = selection ? related(selection.unitId, selection.month, selection.category) : [];
  return <div className="space-y-4">
    <h1>Tracking thanh toán</h1><p className="text-sm text-muted">Theo kỳ hóa đơn · tiền phòng/dịch vụ và điện/nước. Thanh toán một phần áp dụng cho toàn kỳ.</p>
    <div className="flex flex-wrap gap-3">
      <label className="text-sm text-muted">Năm<input aria-label="Năm tracking" type="number" min="1900" max="2199" className="input !w-28" value={year} onChange={e => setYear(Number(e.target.value))} /></label>
      <label className="text-sm text-muted">Tầng<select className="input !w-40" value={floor} onChange={e => setFloor(e.target.value)}><option value="">Tất cả tầng</option>{Array.from(new Set(units.map(u => u.floor))).map(f => <option key={f} value={f}>Tầng {f}</option>)}</select></label>
      <label className="text-sm text-muted">Phòng<select className="input !w-44" value={unit} onChange={e => setUnit(e.target.value)}><option value="">Tất cả phòng</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
    </div>
    {unassigned.length > 0 && <div className="rounded-xl bg-warn-tint p-3 text-warn-ink"><button type="button" className="min-h-11 text-left" onClick={() => setShowUnassigned(!showUnassigned)} aria-expanded={showUnassigned}>Có {unassigned.length} hóa đơn cần gán kỳ tracking. Dữ liệu bảng chưa đầy đủ. {showUnassigned ? "Thu gọn" : "Xem danh sách"}</button>{showUnassigned && <ul className="mt-2 space-y-2">{unassigned.map(b => <li key={b.id}><Link href={`/hoa-don/${b.id}`}>{units.find(u => u.id === b.unitId)?.name} · {b.tenantName} · {b.periodLabel}</Link></li>)}</ul>}</div>}
    <div className="card overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">Phòng theo tháng, mỗi ô có tiền phòng và điện nước</caption><thead><tr><th className="sticky left-0 z-10 bg-surface px-3 py-3 text-left">Phòng</th>{Array.from({ length: 12 }, (_, i) => <th key={i} className="min-w-36 bg-cream px-3 py-3 font-medium">Tháng {i + 1}</th>)}</tr></thead><tbody>{visible.map(u => <tr key={u.id} className="border-t border-line"><th className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-3 text-left font-medium">{u.name}</th>{Array.from({ length: 12 }, (_, i) => {
      const month = `${year}-${String(i + 1).padStart(2, "0")}`;
      return <td key={month} className="p-2">{["room", "elec_water"].map(category => {
        const items = related(u.id, month, category), state = trackingState(items);
        return <button type="button" key={category} aria-label={`${u.name}, ${month}, ${category === "room" ? "tiền phòng" : "điện nước"}: ${state.label}`} onClick={() => setSelection({ unitId: u.id, month, category })} className={`mb-1 block min-h-11 w-full rounded-xl px-2 py-1 text-left ${["paid", "free"].includes(state.state) ? "bg-ok-tint text-ok-ink" : state.overdue ? "bg-danger-tint text-danger-ink" : state.state === "empty" ? "bg-cream text-muted" : "bg-warn-tint text-warn-ink"}`}><span className="font-medium">{category === "room" ? "Phòng" : "Đ/N"}</span> · {state.label}{state.overdue ? " · Quá hạn" : ""}{items.length > 1 ? ` (${items.length} HĐ)` : ""}</button>;
      })}</td>;
    })}</tr>)}</tbody></table></div>
    {selection && <section className="card space-y-3 p-4" aria-live="polite"><div className="flex flex-wrap justify-between gap-2"><h2>{units.find(u => u.id === selection.unitId)?.name} · {selection.month} · {selection.category === "room" ? "Tiền phòng" : "Điện/nước"}</h2><button type="button" className="btn-secondary" onClick={() => setSelection(undefined)}>Đóng</button></div>{selected.length ? selected.map(b => {
      const paid = b.payments.reduce((s, p) => s + p.amount, 0);
      return <div key={b.id} className="border-t border-line pt-3"><Link className="text-brand-ink" href={`/hoa-don/${b.id}`}>{b.periodLabel} →</Link><p className="text-sm text-muted">{b.tenantName} · Hợp đồng {b.leaseId.slice(-6)} · Hạn {formatDate(new Date(b.dueDate))}</p><p className="text-sm">Tổng {formatVND(b.grandTotal)} · Đã thu {formatVND(paid)} · Còn {formatVND(Math.max(0, b.grandTotal - paid))}</p></div>;
    }) : <p className="text-muted">Chưa có hóa đơn được gán cho kỳ này. Không tự suy ra khoản nợ.</p>}</section>}
  </div>;
}
