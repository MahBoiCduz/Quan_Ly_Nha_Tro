"use client";

import { useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/expense-schema";
import { createExpense } from "./expense-actions";

export function ExpenseForm() {
  const [error, setError] = useState("");
  async function onSubmit(formData: FormData) {
    setError("");
    const res = await createExpense(formData);
    if (res?.error) setError(res.error);
  }
  return (
    <form action={onSubmit} className="mb-4 flex flex-wrap items-end gap-2">
      <input name="date" type="date" required className="rounded border px-2 py-1" />
      <input name="description" placeholder="Nội dung" required className="rounded border px-2 py-1" />
      <select name="category" required className="rounded border px-2 py-1">
        {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input name="amount" type="number" min="1" placeholder="Số tiền" required className="w-32 rounded border px-2 py-1" />
      <button className="rounded bg-blue-600 px-3 py-1 text-white">Thêm chi tiêu</button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
