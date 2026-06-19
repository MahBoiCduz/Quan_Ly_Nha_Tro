"use client";

import { useState } from "react";
import { saveSettings } from "./setting-actions";

type Setting = {
  bankAccountName?: string | null;
  bankAccountNo?: string | null;
  bankName?: string | null;
  qrImageUrl?: string | null;
  invoiceNotes?: string | null;
  adminZaloUserId?: string | null;
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
  const [msg, setMsg] = useState("");

  async function onSubmit(formData: FormData) {
    setMsg("");
    formData.set("qrImageUrl", qr);
    const res = await saveSettings(formData);
    setMsg(res?.error ?? "Đã lưu.");
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-3">
      <input name="bankAccountName" defaultValue={setting?.bankAccountName ?? ""} placeholder="Tên tài khoản" className="w-full rounded border px-3 py-2" />
      <input name="bankAccountNo" defaultValue={setting?.bankAccountNo ?? ""} placeholder="Số tài khoản" className="w-full rounded border px-3 py-2" />
      <input name="bankName" defaultValue={setting?.bankName ?? ""} placeholder="Ngân hàng" className="w-full rounded border px-3 py-2" />
      <textarea name="invoiceNotes" defaultValue={setting?.invoiceNotes ?? ""} placeholder="Ghi chú trên hóa đơn" className="w-full rounded border px-3 py-2" />
      <input name="adminZaloUserId" defaultValue={setting?.adminZaloUserId ?? ""} placeholder="Zalo user id của admin" className="w-full rounded border px-3 py-2" />
      <label className="block text-sm">Ảnh QR chuyển khoản
        <input type="file" accept="image/*" className="mt-1 block"
          onChange={async (e) => { if (e.target.files?.[0]) setQr(await uploadImage(e.target.files[0])); }} />
        {qr && <img src={qr} alt="QR" className="mt-1 h-32 w-32 rounded border object-contain" />}
      </label>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <button className="rounded bg-blue-600 px-4 py-2 text-white">Lưu cài đặt</button>
    </form>
  );
}
