"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { IdCardUploader } from "@/components/id-card-uploader";

type Tenant = {
  id?: string;
  fullName?: string; phone?: string; idCardNumber?: string | null;
  idCardFrontImageUrl?: string | null; idCardBackImageUrl?: string | null;
  vehiclePlate?: string | null; zaloId?: string | null; notes?: string | null;
};

export function TenantForm({
  tenant, action, onSuccess, submitLabel = "Lưu",
}: {
  tenant?: Tenant;
  action: (fd: FormData) => Promise<{ error?: string } | void>;
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const [front, setFront] = useState(tenant?.idCardFrontImageUrl ?? "");
  const [back, setBack] = useState(tenant?.idCardBackImageUrl ?? "");
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    formData.set("idCardFrontImageUrl", front);
    formData.set("idCardBackImageUrl", back);
    const res = await action(formData);
    if (res?.error) toast.error(res.error);
    else onSuccess?.();
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-3">
      <div>
        <label className="label">Họ tên</label>
        <input name="fullName" defaultValue={tenant?.fullName ?? ""} placeholder="Họ tên" required className="input" />
      </div>
      <div>
        <label className="label">Số điện thoại</label>
        <input name="phone" defaultValue={tenant?.phone ?? ""} placeholder="Số điện thoại" required className="input" />
      </div>
      <div>
        <label className="label">Số CCCD/CMND</label>
        <input name="idCardNumber" defaultValue={tenant?.idCardNumber ?? ""} placeholder="Số CCCD/CMND" className="input" />
      </div>
      <div>
        <label className="label">Biển số xe</label>
        <input name="vehiclePlate" defaultValue={tenant?.vehiclePlate ?? ""} placeholder="Biển số xe" className="input" />
      </div>
      <div>
        <label className="label">Zalo ID</label>
        <input name="zaloId" defaultValue={tenant?.zaloId ?? ""} placeholder="Zalo ID" className="input" />
      </div>
      <div>
        <label className="label">Ghi chú</label>
        <textarea name="notes" defaultValue={tenant?.notes ?? ""} placeholder="Ghi chú" className="input" />
      </div>

      <IdCardUploader front={front} back={back} onFront={setFront} onBack={setBack} />

      <button className="btn-primary">{submitLabel}</button>
    </form>
  );
}
