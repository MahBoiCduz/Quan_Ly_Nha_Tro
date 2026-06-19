"use client";

import { formatVND } from "@/lib/format";
import { createLease, endLease } from "./lease-actions";
import { useToast } from "@/components/toast";

type Tenant = { id: string; fullName: string };
type ActiveLease = {
  id: string; agreedRent: number; depositAmount: number;
  startDate: string; tenant: { fullName: string };
} | null;

export function LeasePanel({
  unitId, tenants, activeLease,
}: { unitId: string; tenants: Tenant[]; activeLease: ActiveLease }) {
  const toast = useToast();

  if (activeLease) {
    return (
      <div className="card p-3">
        <div className="font-medium text-ink">{activeLease.tenant.fullName}</div>
        <div className="text-sm text-muted">
          Giá thuê {formatVND(activeLease.agreedRent)} · Cọc {formatVND(activeLease.depositAmount)}
        </div>
        <form action={async (fd) => {
          await endLease(activeLease.id, unitId, String(fd.get("endDate")));
          toast.success("Đã kết thúc hợp đồng");
        }}
          className="mt-2 flex items-center gap-2">
          <input name="endDate" type="date" required className="input" />
          <button className="btn-danger">Kết thúc hợp đồng</button>
        </form>
      </div>
    );
  }

  async function onCreate(formData: FormData) {
    const res = await createLease(unitId, formData);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã tạo hợp đồng");
  }

  return (
    <form action={onCreate} className="card max-w-md space-y-2 p-3">
      <select name="tenantId" required className="input w-full">
        <option value="">— Chọn khách thuê —</option>
        {tenants.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
      </select>
      <label className="label block">Ngày bắt đầu
        <input name="startDate" type="date" required className="input w-full" />
      </label>
      <input name="agreedRent" type="number" min="0" placeholder="Giá thuê / kỳ" required className="input w-full" />
      <select name="billingCycle" className="input w-full">
        <option value="monthly">Theo tháng</option>
        <option value="quarterly">Theo quý</option>
        <option value="custom">Tùy chỉnh</option>
      </select>
      <input name="depositAmount" type="number" min="0" placeholder="Tiền cọc" required className="input w-full" />
      <label className="label block">Ngày nhận cọc
        <input name="depositCollectedAt" type="date" className="input w-full" />
      </label>
      <input name="depositCollectedBy" placeholder="Người nhận cọc" className="input w-full" />
      <button className="btn-primary">Tạo hợp đồng</button>
    </form>
  );
}
