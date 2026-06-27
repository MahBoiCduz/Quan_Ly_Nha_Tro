"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { IdCardUploader } from "@/components/id-card-uploader";
import { startLease } from "./lease-actions";

export function NewLeaseForm({ unitId }: { unitId: string }) {
  const toast = useToast();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  async function onSubmit(formData: FormData) {
    formData.set("idCardFrontImageUrl", front);
    formData.set("idCardBackImageUrl", back);
    const res = await startLease(unitId, formData);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã tạo khách thuê và hợp đồng");
  }

  return (
    <form action={onSubmit} className="card max-w-lg space-y-4 p-4">
      <div className="space-y-3">
        <h3 className="font-medium text-ink">Thông tin khách thuê</h3>
        <div>
          <label className="label">Họ tên</label>
          <input name="fullName" placeholder="Họ tên" required className="input" />
        </div>
        <div>
          <label className="label">Số điện thoại</label>
          <input name="phone" placeholder="Số điện thoại" required className="input" />
        </div>
        <div>
          <label className="label">Số CCCD/CMND</label>
          <input name="idCardNumber" placeholder="Số CCCD/CMND" className="input" />
        </div>
        <div>
          <label className="label">Biển số xe</label>
          <input name="vehiclePlate" placeholder="Biển số xe" className="input" />
        </div>
        <div>
          <label className="label">Zalo ID</label>
          <input name="zaloId" placeholder="Zalo ID" className="input" />
        </div>
        <div>
          <label className="label">Ghi chú</label>
          <textarea name="notes" placeholder="Ghi chú" className="input" />
        </div>
        <IdCardUploader front={front} back={back} onFront={setFront} onBack={setBack} />
      </div>

      <div className="space-y-3 border-t border-line pt-4">
        <h3 className="font-medium text-ink">Hợp đồng</h3>
        <label className="label block">Ngày bắt đầu
          <input name="startDate" type="date" required className="input w-full" />
        </label>
        <div>
          <label className="label">Giá thuê / kỳ</label>
          <input name="agreedRent" type="number" min="0" placeholder="Giá thuê / kỳ" required className="input" />
        </div>
        <div>
          <label className="label">Chu kỳ</label>
          <select name="billingCycle" className="input">
            <option value="monthly">Theo tháng</option>
            <option value="quarterly">Theo quý</option>
            <option value="custom">Tùy chỉnh</option>
          </select>
        </div>
        <div>
          <label className="label">Tiền cọc</label>
          <input name="depositAmount" type="number" min="0" placeholder="Tiền cọc" required className="input" />
        </div>
        <label className="label block">Ngày nhận cọc
          <input name="depositCollectedAt" type="date" className="input w-full" />
        </label>
        <div>
          <label className="label">Người nhận cọc</label>
          <input name="depositCollectedBy" placeholder="Người nhận cọc" className="input" />
        </div>
      </div>

      <button className="btn-primary">Tạo hợp đồng</button>
    </form>
  );
}
