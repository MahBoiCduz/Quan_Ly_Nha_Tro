"use client";

import { EXPENSE_CATEGORIES } from "@/lib/expense-schema";
import { createExpense } from "./expense-actions";
import { useToast } from "@/components/toast";
import { Plus } from "lucide-react";

export function ExpenseForm() {
  const toast = useToast();
  async function onSubmit(formData: FormData) {
    const res = await createExpense(formData);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã thêm chi tiêu");
  }
  return (
    <form action={onSubmit} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
      <div className="flex flex-col gap-1">
        <label className="label">Ngày</label>
        <input name="date" type="date" required className="input" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label">Nội dung</label>
        <input name="description" placeholder="Nội dung" required className="input" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label">Phân loại</label>
        <select name="category" required className="input">
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="label">Số tiền</label>
        <input name="amount" type="number" min="1" placeholder="Số tiền" required className="input w-32" />
      </div>
      <button className="btn-primary flex items-center gap-1 self-end">
        <Plus size={18} />Thêm chi tiêu
      </button>
    </form>
  );
}
