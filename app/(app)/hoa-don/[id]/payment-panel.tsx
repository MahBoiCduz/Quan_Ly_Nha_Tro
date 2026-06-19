"use client";

import { useState } from "react";

type RecordPaymentFn = (billId: string, formData: FormData) => Promise<{ ok?: boolean; error?: string } | undefined>;

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

export function PaymentPanel({ billId, action }: { billId: string; action: RecordPaymentFn }) {
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    formData.set("receiptImageUrl", receipt);
    const res = await action(billId, formData);
    if (res?.error) setError(res.error);
    else setReceipt("");
  }

  return (
    <form action={onSubmit} className="max-w-md space-y-2 rounded border bg-white p-3">
      <h3 className="font-semibold">Ghi nhận thanh toán</h3>
      <input name="amount" type="number" min="1" placeholder="Số tiền" required className="w-full rounded border px-2 py-1" />
      <label className="block text-sm">Ngày thanh toán
        <input name="paidAt" type="date" required className="w-full rounded border px-2 py-1" />
      </label>
      <select name="method" required className="w-full rounded border px-2 py-1">
        <option value="bank_transfer">Chuyển khoản</option>
        <option value="cash">Tiền mặt</option>
      </select>
      <input name="confirmedBy" placeholder="Người xác nhận" className="w-full rounded border px-2 py-1" />
      <input name="notes" placeholder="Ghi chú" className="w-full rounded border px-2 py-1" />
      <label className="block text-sm">Ảnh chuyển khoản (từ Zalo)
        <input type="file" accept="image/*" className="mt-1 block"
          onChange={async (e) => e.target.files?.[0] && setReceipt(await uploadImage(e.target.files[0]))} />
      </label>
      {receipt && <img src={receipt} alt="biên lai" className="h-24 rounded border object-cover" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="rounded bg-green-600 px-4 py-2 text-white">Lưu thanh toán</button>
    </form>
  );
}
