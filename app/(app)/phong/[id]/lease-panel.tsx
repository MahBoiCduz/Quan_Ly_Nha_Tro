"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";
import { createLease, endLease } from "./lease-actions";

type Tenant = { id: string; fullName: string };
type ActiveLease = {
  id: string; agreedRent: number; depositAmount: number;
  startDate: string; tenant: { fullName: string };
} | null;

export function LeasePanel({
  unitId, tenants, activeLease,
}: { unitId: string; tenants: Tenant[]; activeLease: ActiveLease }) {
  const [error, setError] = useState("");

  if (activeLease) {
    return (
      <div className="rounded border bg-white p-3">
        <div>{activeLease.tenant.fullName}</div>
        <div className="text-sm text-gray-500">
          Giá thuê {formatVND(activeLease.agreedRent)} · Cọc {formatVND(activeLease.depositAmount)}
        </div>
        <form action={async (fd) => { await endLease(activeLease.id, unitId, String(fd.get("endDate"))); }}
          className="mt-2 flex items-center gap-2">
          <input name="endDate" type="date" required className="rounded border px-2 py-1" />
          <button className="rounded bg-red-600 px-3 py-1 text-white">Kết thúc hợp đồng</button>
        </form>
      </div>
    );
  }

  async function onCreate(formData: FormData) {
    setError("");
    const res = await createLease(unitId, formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onCreate} className="max-w-md space-y-2 rounded border bg-white p-3">
      <select name="tenantId" required className="w-full rounded border px-2 py-1">
        <option value="">— Chọn khách thuê —</option>
        {tenants.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
      </select>
      <label className="block text-sm">Ngày bắt đầu
        <input name="startDate" type="date" required className="w-full rounded border px-2 py-1" />
      </label>
      <input name="agreedRent" type="number" min="0" placeholder="Giá thuê / kỳ" required className="w-full rounded border px-2 py-1" />
      <select name="billingCycle" className="w-full rounded border px-2 py-1">
        <option value="monthly">Theo tháng</option>
        <option value="quarterly">Theo quý</option>
        <option value="custom">Tùy chỉnh</option>
      </select>
      <input name="depositAmount" type="number" min="0" placeholder="Tiền cọc" required className="w-full rounded border px-2 py-1" />
      <label className="block text-sm">Ngày nhận cọc
        <input name="depositCollectedAt" type="date" className="w-full rounded border px-2 py-1" />
      </label>
      <input name="depositCollectedBy" placeholder="Người nhận cọc" className="w-full rounded border px-2 py-1" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Tạo hợp đồng</button>
    </form>
  );
}
