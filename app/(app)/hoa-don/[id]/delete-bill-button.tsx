"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { deleteBill } from "../bill-actions";

/** Deletes a bill (and its payments) then returns to the bill list. */
export function DeleteBillButton({ billId }: { billId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!window.confirm("Xóa hóa đơn này? Mọi thanh toán kèm theo cũng bị xóa.")) return;
    setBusy(true);
    try {
      const res = await deleteBill(billId);
      if (res?.error) {
        toast.error(res.error);
        setBusy(false);
        return;
      }
      toast.success("Đã xóa hóa đơn");
      router.push("/hoa-don");
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={run} disabled={busy} className="btn-danger">
      <Trash2 size={18} /> Xóa
    </button>
  );
}
