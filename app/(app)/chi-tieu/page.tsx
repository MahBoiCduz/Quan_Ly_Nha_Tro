import { db } from "@/lib/db";
import { ExpenseForm } from "./expense-form";
import { ExpensesTable } from "./expenses-table";

export default async function ExpensesPage() {
  const expenses = await db.expense.findMany({ orderBy: { date: "desc" } });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Chi tiêu</h1>
      <ExpenseForm />
      <ExpensesTable expenses={expenses} />
    </div>
  );
}
