"use client";

import { useRef } from "react";
import { createUser } from "./user-actions";
import { useToast } from "@/components/toast";
import { UserPlus } from "lucide-react";

export function UserForm() {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(formData: FormData) {
    const res = await createUser(formData);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Đã tạo người dùng");
      formRef.current?.reset();
    }
  }

  return (
    <form ref={formRef} action={onSubmit} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
      <div className="flex flex-col gap-1">
        <label className="label">Email</label>
        <input name="email" type="email" placeholder="Email" required className="input" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label">Mật khẩu</label>
        <input
          name="password"
          type="password"
          placeholder="Ít nhất 6 ký tự"
          minLength={6}
          required
          className="input"
        />
      </div>
      <button className="btn-primary flex items-center gap-1 self-end">
        <UserPlus size={18} />Tạo người dùng
      </button>
    </form>
  );
}
