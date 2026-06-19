"use client";

import { useState } from "react";

export function NotifyButton() {
  const [msg, setMsg] = useState("");
  async function onClick() {
    setMsg("Đang gửi...");
    const res = await fetch("/api/notify-now", { method: "POST" });
    setMsg(res.ok ? "Đã chạy thông báo." : "Không gửi được (kiểm tra cấu hình).");
  }
  return (
    <div>
      <button onClick={onClick} className="rounded bg-indigo-600 px-3 py-2 text-white">
        Gửi thông báo Zalo ngay
      </button>
      {msg && <span className="ml-2 text-sm text-gray-600">{msg}</span>}
    </div>
  );
}
