"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
    >
      Đăng xuất
    </button>
  );
}
