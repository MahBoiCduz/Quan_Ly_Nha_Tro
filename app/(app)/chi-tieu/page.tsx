import { db } from "@/lib/db";
import { formatVND, formatDate } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { deleteExpense } from "./expense-actions";
import { ActionButton } from "@/components/action-button";
import { Trash2 } from "lucide-react";

export default async function ExpensesPage() {
  const expenses = await db.expense.findMany({ orderBy: { date: "desc" } });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Chi tiêu</h1>
      <ExpenseForm />
      <div className="card overflow-hidden">
        <table className="w-full text-[15px]">
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
            {expenses.map((e) => (
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
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-muted">Chưa có chi tiêu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
