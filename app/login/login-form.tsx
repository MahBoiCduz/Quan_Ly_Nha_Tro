"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    if (res?.error) setError("Email hoặc mật khẩu không đúng.");
    else router.push("/");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input name="email" type="email" placeholder="Email" required
        className="w-full rounded border px-3 py-2" />
      <input name="password" type="password" placeholder="Mật khẩu" required
        className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit"
        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700">
        Đăng nhập
      </button>
    </form>
  );
}
