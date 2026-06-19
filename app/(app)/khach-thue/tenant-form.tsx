"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";

type Tenant = {
  id?: string;
  fullName?: string; phone?: string; idCardNumber?: string | null;
  idCardFrontImageUrl?: string | null; idCardBackImageUrl?: string | null;
  vehiclePlate?: string | null; zaloId?: string | null; notes?: string | null;
};

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

export function TenantForm({
  tenant, action,
}: { tenant?: Tenant; action: (fd: FormData) => Promise<{ error?: string } | void> }) {
  const [front, setFront] = useState(tenant?.idCardFrontImageUrl ?? "");
  const [back, setBack] = useState(tenant?.idCardBackImageUrl ?? "");
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    formData.set("idCardFrontImageUrl", front);
    formData.set("idCardBackImageUrl", back);
    const res = await action(formData);
    if (res?.error) toast.error(res.error);
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">
            Ảnh CCCD mặt trước
          </label>
          <input type="file" accept="image/*" className="mt-1 block text-sm text-muted"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                try {
                  const url = await uploadImage(e.target.files[0]);
                  setFront(url);
                  toast.success("Đã tải ảnh lên");
                } catch {
                  toast.error("Tải ảnh thất bại");
                }
              }
            }} />
          {front && <img src={front} alt="mặt trước" className="mt-1 h-24 rounded border object-cover" />}
        </div>
        <div>
          <label className="label">
            Ảnh CCCD mặt sau
          </label>
          <input type="file" accept="image/*" className="mt-1 block text-sm text-muted"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                try {
                  const url = await uploadImage(e.target.files[0]);
                  setBack(url);
                  toast.success("Đã tải ảnh lên");
                } catch {
                  toast.error("Tải ảnh thất bại");
                }
              }
            }} />
          {back && <img src={back} alt="mặt sau" className="mt-1 h-24 rounded border object-cover" />}
        </div>
      </div>

      <button className="btn-primary">Lưu</button>
    </form>
  );
}
