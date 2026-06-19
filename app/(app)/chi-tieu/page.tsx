import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { deleteExpense } from "./expense-actions";

export default async function ExpensesPage() {
  const expenses = await db.expense.findMany({ orderBy: { date: "desc" } });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Chi tiêu</h1>
      <ExpenseForm />
      <table className="w-full border bg-white text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Ngày</th>
            <th className="border px-2 py-1 text-left">Nội dung</th>
            <th className="border px-2 py-1">Phân loại</th>
            <th className="border px-2 py-1 text-right">Số tiền</th>
            <th className="border px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id}>
              <td className="border px-2 py-1">{e.date.toLocaleDateString("vi-VN")}</td>
              <td className="border px-2 py-1">{e.description}</td>
              <td className="border px-2 py-1 text-center">{e.category}</td>
              <td className="border px-2 py-1 text-right">{formatVND(e.amount)}</td>
              <td className="border px-2 py-1 text-center">
                <form action={deleteExpense.bind(null, e.id)}>
                  <button className="text-red-600 hover:underline">Xóa</button>
                </form>
              </td>
            </tr>
          ))}
          {expenses.length === 0 && <tr><td colSpan={5} className="px-2 py-2 text-center text-gray-400">Chưa có chi tiêu.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
