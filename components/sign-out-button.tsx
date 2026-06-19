"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-danger transition-colors hover:bg-danger-tint"
    >
      <LogOut size={20} aria-hidden />
      Đăng xuất
    </button>
  );
}
