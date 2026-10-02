"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BillPeriodPicker } from "@/components/bill-period-picker";
import type { TrackingContext, TrackingPeriod } from "@/lib/tracking";
import { suggestLegacyMonths } from "@/lib/tracking";
import { assignTracking, loadTrackingContext } from "../tracking-actions";

export function TrackingAssignment({ billId, unitId, type, periodLabel, periods }: { billId: string; unitId: string; type: string; periodLabel: string; periods: TrackingPeriod[] }) {
  const router = useRouter();
  const suggestion = type === "both" ? [] : suggestLegacyMonths(periodLabel);
  const [room, setRoom] = useState(periods.filter(p => p.category === "room").map(p => p.month).concat(!periods.length && type === "room" ? suggestion : []));
  const [utility, setUtility] = useState(periods.filter(p => p.category === "elec_water").map(p => p.month).concat(!periods.length && type === "elec_water" ? suggestion : []));
  const [context, setContext] = useState<TrackingContext>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  async function load() {
    setOpen(true); setBusy(true); setError("");
    try { const result = await loadTrackingContext(unitId, billId); setContext(result.context); setError(result.error ?? ""); }
    catch { setError("Không tải được dữ liệu. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  async function submit(fd: FormData) {
    setBusy(true); setError("");
    fd.set("roomMonths", JSON.stringify(room)); fd.set("utilityMonths", JSON.stringify(utility));
    try { const result = await assignTracking(billId, fd); if (result.error) setError(result.error); else { setOpen(false); router.refresh(); } }
    catch { setError("Không thể lưu kỳ. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center gap-3"><span className={periods.length ? "text-sm text-muted" : "badge-warn"}>{periods.length ? "Kỳ tracking đã được gán" : "Cần gán kỳ tracking"}</span><button type="button" className="btn-secondary" onClick={load} disabled={busy}>Gán / sửa kỳ tracking</button></div>
    {open && <form action={submit} className="space-y-3">
      <p className="text-sm text-muted">Chỉ cập nhật kỳ; không thay đổi tiền hoặc các lần thanh toán. Kỳ giữa tháng cần đối chiếu trước khi xác nhận nghĩa vụ theo tháng.</p>
      {context && <BillPeriodPicker context={context} billId={billId} type={type} roomMonths={room} utilityMonths={utility} onChange={(category, months) => category === "room" ? setRoom(months) : setUtility(months)} />}
      {error && <p className="text-danger" role="alert">{error}</p>}
      {busy && <p role="status" className="text-muted">Đang xử lý…</p>}
      <div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={busy || !context}>Xác nhận kỳ tracking</button><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Đóng</button></div>
    </form>}
  </section>;
}
