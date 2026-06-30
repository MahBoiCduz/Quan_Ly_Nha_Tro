"use client";

import { useMemo, useState } from "react";
import { formatVND, formatDate } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import { SearchBox } from "@/components/search-box";
import { ActionButton } from "@/components/action-button";
import { deleteExpense } from "./expense-actions";
import { Trash2 } from "lucide-react";

type ExpenseRow = {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
};

export function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => expenses.filter((e) => matchesQuery(`${formatDate(e.date)} ${e.description} ${e.category}`, q)),
    [expenses, q],
  );

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Tìm theo ngày, nội dung hoặc phân loại…" />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[520px] text-[15px]">
          <thead>
            <tr className="bg-cream text-muted text-sm">
              <th className="px-4 py-3 text-left font-medium">Ngày</th>
              <th className="px-4 py-3 text-left font-medium">Nội dung</th>
              <th className="px-4 py-3 text-center font-medium">Phân loại</th>
              <th className="px-4 py-3 text-right font-medium">Số tiền</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink">{formatDate(e.date)}</td>
                <td className="px-4 py-3 text-ink">{e.description}</td>
                <td className="px-4 py-3 text-center text-muted">{e.category}</td>
                <td className="px-4 py-3 text-right font-medium text-ink">{formatVND(e.amount)}</td>
                <td className="px-4 py-3 text-center">
                  <ActionButton
                    action={deleteExpense.bind(null, e.id)}
                    success="Đã xóa chi tiêu"
                    confirm="Xóa chi tiêu này?"
                    className="btn-link-danger inline-flex items-center gap-1"
                  >
                    <Trash2 size={16} />Xóa
                  </ActionButton>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-muted">
                  {expenses.length === 0 ? "Chưa có chi tiêu." : "Không tìm thấy chi tiêu phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
