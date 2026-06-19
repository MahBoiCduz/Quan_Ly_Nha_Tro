"use client";

import { useState } from "react";

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
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    formData.set("idCardFrontImageUrl", front);
    formData.set("idCardBackImageUrl", back);
    const res = await action(formData);
    if (res?.error) setError(res.error);
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-3">
      <input name="fullName" defaultValue={tenant?.fullName ?? ""} placeholder="Họ tên" required className="w-full rounded border px-3 py-2" />
      <input name="phone" defaultValue={tenant?.phone ?? ""} placeholder="Số điện thoại" required className="w-full rounded border px-3 py-2" />
      <input name="idCardNumber" defaultValue={tenant?.idCardNumber ?? ""} placeholder="Số CCCD/CMND" className="w-full rounded border px-3 py-2" />
      <input name="vehiclePlate" defaultValue={tenant?.vehiclePlate ?? ""} placeholder="Biển số xe" className="w-full rounded border px-3 py-2" />
      <input name="zaloId" defaultValue={tenant?.zaloId ?? ""} placeholder="Zalo ID" className="w-full rounded border px-3 py-2" />
      <textarea name="notes" defaultValue={tenant?.notes ?? ""} placeholder="Ghi chú" className="w-full rounded border px-3 py-2" />

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Ảnh CCCD mặt trước
          <input type="file" accept="image/*" className="mt-1 block"
            onChange={async (e) => e.target.files?.[0] && setFront(await uploadImage(e.target.files[0]))} />
          {front && <img src={front} alt="mặt trước" className="mt-1 h-24 rounded border object-cover" />}
        </label>
        <label className="text-sm">
          Ảnh CCCD mặt sau
          <input type="file" accept="image/*" className="mt-1 block"
            onChange={async (e) => e.target.files?.[0] && setBack(await uploadImage(e.target.files[0]))} />
          {back && <img src={back} alt="mặt sau" className="mt-1 h-24 rounded border object-cover" />}
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Lưu</button>
    </form>
  );
}
