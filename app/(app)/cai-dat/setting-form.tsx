"use client";

import { useState } from "react";
import { saveSettings } from "./setting-actions";
import { useToast } from "@/components/toast";

type Setting = {
  bankAccountName?: string | null;
  bankAccountNo?: string | null;
  bankName?: string | null;
  qrImageUrl?: string | null;
  invoiceNotes?: string | null;
  adminZaloUserId?: string | null;
  defaultElectricityRate?: number | null;
  defaultWaterRate?: number | null;
};

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

export function SettingForm({ setting }: { setting: Setting | null }) {
  const [qr, setQr] = useState(setting?.qrImageUrl ?? "");
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    formData.set("qrImageUrl", qr);
    const res = await saveSettings(formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Đã lưu cài đặt");
    }
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="label">Tên tài khoản</label>
        <input name="bankAccountName" defaultValue={setting?.bankAccountName ?? ""} placeholder="Tên tài khoản" className="input" />
      </div>
      <div>
        <label className="label">Số tài khoản</label>
        <input name="bankAccountNo" defaultValue={setting?.bankAccountNo ?? ""} placeholder="Số tài khoản" className="input" />
      </div>
      <div>
        <label className="label">Ngân hàng</label>
        <input name="bankName" defaultValue={setting?.bankName ?? ""} placeholder="Ngân hàng" className="input" />
      </div>
      <div>
        <label className="label">Ghi chú trên hóa đơn</label>
        <textarea name="invoiceNotes" defaultValue={setting?.invoiceNotes ?? ""} placeholder="Ghi chú trên hóa đơn" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Đơn giá điện (đ/kWh)</label>
          <input name="defaultElectricityRate" type="number" min="0" defaultValue={setting?.defaultElectricityRate ?? 4000} placeholder="4000" className="input" />
        </div>
        <div>
          <label className="label">Đơn giá nước (đ/m³)</label>
          <input name="defaultWaterRate" type="number" min="0" defaultValue={setting?.defaultWaterRate ?? 35000} placeholder="35000" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Zalo user id của admin</label>
        <input name="adminZaloUserId" defaultValue={setting?.adminZaloUserId ?? ""} placeholder="Zalo user id của admin" className="input" />
      </div>
      <div>
        <label className="label">Ảnh QR chuyển khoản</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block text-sm text-muted"
          onChange={async (e) => {
            if (e.target.files?.[0]) {
              try {
                const url = await uploadImage(e.target.files[0]);
                setQr(url);
                toast.success("Đã tải ảnh QR");
              } catch {
                toast.error("Tải ảnh thất bại");
              }
            }
          }}
        />
        {qr && <img src={qr} alt="QR" className="mt-2 h-32 w-32 rounded border border-line object-contain" />}
      </div>
      <button className="btn-primary">Lưu cài đặt</button>
    </form>
  );
}
