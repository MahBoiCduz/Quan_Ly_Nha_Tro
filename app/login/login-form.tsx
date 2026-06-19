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
      <input name="email" type="email" placeholder="Email" required className="input" />
      <input name="password" type="password" placeholder="Mật khẩu" required className="input" />
      {error && (
        <p className="rounded-xl bg-danger-tint px-3 py-2 text-sm font-medium text-danger-ink">{error}</p>
      )}
      <button type="submit" className="btn-primary w-full">
        Đăng nhập
      </button>
    </form>
  );
}
