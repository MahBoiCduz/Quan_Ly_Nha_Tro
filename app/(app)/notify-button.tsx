"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useToast } from "@/components/toast";

export function NotifyButton() {
  const [sending, setSending] = useState(false);
  const toast = useToast();

  async function onClick() {
    setSending(true);
    try {
      const res = await fetch("/api/notify-now", { method: "POST" });
      if (res.ok) {
        toast.success("Đã gửi thông báo Zalo");
      } else {
        toast.error("Không gửi được — kiểm tra cấu hình Zalo");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <button onClick={onClick} disabled={sending} className="btn-primary">
        <Bell size={18} />
        {sending ? "Đang gửi..." : "Gửi thông báo Zalo ngay"}
      </button>
    </div>
  );
}
