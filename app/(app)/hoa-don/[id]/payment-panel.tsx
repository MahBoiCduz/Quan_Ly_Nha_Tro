"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "@/components/toast";
import { formatVND } from "@/lib/format";
import { MAX_RECEIPT_IMAGES } from "@/lib/payment-schema";

type RecordPaymentFn = (billId: string, formData: FormData) => Promise<{ ok?: boolean; error?: string } | undefined>;

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

export function PaymentPanel({
  billId,
  remaining,
  action,
}: {
  billId: string;
  // Amount still owed on the bill (grandTotal − paid so far), for the quick-fill
  // button when the tenant pays in several transfers (e.g. rent vs. utilities).
  remaining: number;
  action: RecordPaymentFn;
}) {
  const [amount, setAmount] = useState("");
  const [receipts, setReceipts] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    formData.set("receiptImages", JSON.stringify(receipts));
    const res = await action(billId, formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Đã ghi nhận thanh toán");
      setReceipts([]);
      setAmount("");
    }
  }

  async function onFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_RECEIPT_IMAGES - receipts.length;
    if (room <= 0) {
      toast.error(`Tối đa ${MAX_RECEIPT_IMAGES} ảnh cho một lần thanh toán`);
      return;
    }
    const picked = Array.from(files);
    if (picked.length > room) toast.error(`Chỉ thêm được ${room} ảnh nữa, ảnh dư sẽ bị bỏ qua`);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of picked.slice(0, room)) {
        uploaded.push(await uploadImage(file));
      }
      setReceipts((rs) => [...rs, ...uploaded]);
      toast.success(uploaded.length > 1 ? `Đã tải ${uploaded.length} ảnh lên` : "Đã tải ảnh lên");
    } catch {
      toast.error("Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={onSubmit} className="card max-w-md space-y-3 p-4">
      <h3>Ghi nhận thanh toán</h3>
      <div>
        <label className="label">Số tiền</label>
        <input
          name="amount"
          type="number"
          min="1"
          placeholder="Số tiền"
          required
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {remaining > 0 && (
          <button
            type="button"
            className="mt-1 text-sm text-muted underline"
            onClick={() => setAmount(String(remaining))}
          >
            Điền số còn thiếu: {formatVND(remaining)}
          </button>
        )}
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
        <label className="label">Ảnh chuyển khoản (từ Zalo) — chọn được nhiều ảnh</label>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          className="mt-1 block text-sm text-muted"
          onChange={async (e) => {
            await onFilesPicked(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {receipts.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {receipts.map((url, i) => (
            <li key={url} className="relative">
              <img src={url} alt={`biên lai ${i + 1}`} className="h-24 w-24 rounded border object-cover" />
              <button
                type="button"
                aria-label="Xóa ảnh"
                className="absolute -right-2 -top-2 rounded-full border bg-white p-0.5 text-danger shadow"
                onClick={() => setReceipts((rs) => rs.filter((u) => u !== url))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn-primary" disabled={uploading}>
        {uploading ? "Đang tải ảnh…" : "Lưu thanh toán"}
      </button>
    </form>
  );
}
