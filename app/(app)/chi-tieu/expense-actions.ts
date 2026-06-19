"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/expense-schema";

export async function createExpense(formData: FormData) {
  const parsed = expenseSchema.safeParse({
    date: formData.get("date"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: Number(formData.get("amount") ?? 0),
  });
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  const d = parsed.data;
  await db.expense.create({
    data: { date: new Date(d.date), description: d.description, category: d.category, amount: d.amount },
  });
  revalidatePath("/chi-tieu");
  revalidatePath("/so-sach");
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expense.delete({ where: { id } });
  revalidatePath("/chi-tieu");
  revalidatePath("/so-sach");
}
