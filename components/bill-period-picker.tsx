"use client";
import { useState } from "react";
import Link from "next/link";
import { formatMonths, trackingState, vietnamMonth } from "@/lib/tracking";
import type { TrackingContext } from "@/lib/tracking";

export function BillPeriodPicker({ type, roomMonths, utilityMonths, onChange, context, billId }: {
  type: string; roomMonths: string[]; utilityMonths: string[];
  onChange: (category: "room" | "elec_water", months: string[]) => void;
  context: TrackingContext; billId?: string;
}) {
  const [year, setYear] = useState(() => Number((roomMonths[0] ?? utilityMonths[0] ?? vietnamMonth(new Date())).slice(0, 4)));
  const bills = context.bills.filter(b => b.id !== billId);
  const start = vietnamMonth(new Date(context.startDate));
  const end = context.endDate ? vietnamMonth(new Date(context.endDate)) : null;
  const unassigned = bills.filter(b => !b.trackingPeriods.length);
  return <section className="card space-y-3 p-4" aria-label="Kỳ ghi nhận">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2>Kỳ ghi nhận</h2><p className="text-xs text-muted">{context.tenantName} · Hợp đồng từ {start}</p></div>
      <label className="flex items-center gap-2 text-sm text-muted">Năm
        <input aria-label="Năm ghi nhận" type="number" min="1900" max="2199" className="input !w-24" value={year} onChange={e => { const n = Number(e.target.value); if (n >= 1900 && n <= 2199) setYear(n); }} />
      </label>
    </div>
    {(["room", "elec_water"] as const).filter(c => c === "room" ? type !== "elec_water" : type !== "room").map(category => {
      const selected = category === "room" ? roomMonths : utilityMonths;
      const paid = bills.flatMap(b => trackingState([b]).state === "paid" || trackingState([b]).state === "free" ? b.trackingPeriods.filter(p => p.category === category).map(p => p.month) : []);
      const pending = bills.filter(b => b.trackingPeriods.some(p => p.category === category) && !["paid", "free"].includes(trackingState([b]).state));
      const title = category === "room" ? "Tiền phòng" : "Điện/nước";
      return <div key={category} className="space-y-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{title}</span><span className="text-xs text-ok-ink">{paid.length ? `Đã đóng: ${formatMonths(paid)}` : "Chưa ghi nhận kỳ đã đóng"}</span></div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`).filter(month => month >= start && (!end || month <= end) && !paid.includes(month)).map(month => {
            const existing = bills.find(b => b.trackingPeriods.some(p => p.category === category && p.month === month));
            return existing ? <Link key={month} href={`/hoa-don/${existing.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-warn-tint px-3 text-xs text-warn-ink" aria-label={`${title} ${month}: ${trackingState([existing]).label}, xem hóa đơn`}>T{Number(month.slice(5))} · {trackingState([existing]).label}</Link> :
              <button key={month} type="button" aria-pressed={selected.includes(month)} aria-label={`${title} tháng ${Number(month.slice(5))}/${year}`} onClick={() => onChange(category, selected.includes(month) ? selected.filter(m => m !== month) : [...selected, month].sort())} className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm ${selected.includes(month) ? "border-brand bg-brand-tint text-brand-ink" : "border-line hover:bg-cream"}`}>T{Number(month.slice(5))}</button>;
          })}
        </div>
        <div className="flex flex-wrap gap-1.5" aria-live="polite">{selected.length ? selected.map(month => <button type="button" key={month} className="min-h-11 rounded-xl bg-brand-tint px-3 text-xs text-brand-ink" aria-label={`Bỏ ${title} ${month}`} onClick={() => onChange(category, selected.filter(m => m !== month))}>{Number(month.slice(5))}/{month.slice(0, 4)} ×</button>) : <p className="text-xs text-muted">Chưa chọn kỳ {title.toLowerCase()}.</p>}</div>
        {pending.length > 0 && <p className="text-xs text-warn-ink">Các kỳ đã có hóa đơn cần thu tiếp trên hóa đơn cũ.</p>}
      </div>;
    })}
    {(bills.length > 0) && <details className="text-sm"><summary className="cursor-pointer text-muted">Lịch sử hóa đơn ({bills.length})</summary><ul className="mt-2 space-y-2">{bills.map(b => <li key={b.id}><Link href={`/hoa-don/${b.id}`} className="text-brand-ink">{b.periodLabel}</Link> · {b.trackingPeriods.length ? trackingState([b]).label : "Cần gán kỳ tracking"}</li>)}</ul></details>}
    {unassigned.length > 0 && <p className="rounded-xl bg-warn-tint p-3 text-sm text-warn-ink">Có {unassigned.length} hóa đơn chưa xác định kỳ. Kiểm tra lịch sử trước khi lập để tránh trùng.</p>}
  </section>;
}
