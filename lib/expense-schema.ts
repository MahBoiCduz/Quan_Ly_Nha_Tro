import { z } from "zod";

export const EXPENSE_CATEGORIES = ["Điện", "Nước", "Internet", "Sửa chữa", "Mua sắm", "Khác"] as const;

export const expenseSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().int().positive(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
