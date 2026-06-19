"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";

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
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    formData.set("receiptImageUrl", receipt);
    const res = await action(billId, formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Đã ghi nhận thanh toán");
      setReceipt("");
    }
  }

  return (
    <form action={onSubmit} className="card max-w-md space-y-3 p-4">
      <h3>Ghi nhận thanh toán</h3>
      <div>
        <label className="label">Số tiền</label>
        <input name="amount" type="number" min="1" placeholder="Số tiền" required className="input" />
      </div>
      <div>
        <label className="label">Ngày thanh toán</label>
        <input name="paidAt" type="date" required className="input" />
      </div>
      <div>
        <label className="label">Phương thức</label>
        <select name="method" required className="input">
          <option value="bank_transfer">Chuyển khoản</option>
          <option value="cash">Tiền mặt</option>
        </select>
      </div>
      <div>
        <label className="label">Người xác nhận</label>
        <input name="confirmedBy" placeholder="Người xác nhận" className="input" />
      </div>
      <div>
        <label className="label">Ghi chú</label>
        <input name="notes" placeholder="Ghi chú" className="input" />
      </div>
      <div>
        <label className="label">Ảnh chuyển khoản (từ Zalo)</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block text-sm text-muted"
          onChange={async (e) => {
            if (e.target.files?.[0]) {
              try {
                const url = await uploadImage(e.target.files[0]);
                setReceipt(url);
                toast.success("Đã tải ảnh lên");
              } catch {
                toast.error("Tải ảnh thất bại");
              }
            }
          }}
        />
      </div>
      {receipt && <img src={receipt} alt="biên lai" className="h-24 rounded border object-cover" />}
      <button className="btn-primary">Lưu thanh toán</button>
    </form>
  );
}
