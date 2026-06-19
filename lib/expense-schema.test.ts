import { describe, it, expect } from "vitest";
import { expenseSchema, EXPENSE_CATEGORIES } from "@/lib/expense-schema";

describe("expenseSchema", () => {
  it("exposes the fixed category list", () => {
    expect(EXPENSE_CATEGORIES).toContain("Sửa chữa");
  });
  it("accepts a valid expense", () => {
    expect(expenseSchema.safeParse({
      date: "2026-01-08", description: "Internet Viettel", category: "Internet", amount: 3228000,
    }).success).toBe(true);
  });
  it("rejects an unknown category", () => {
    expect(expenseSchema.safeParse({
      date: "2026-01-08", description: "x", category: "Du lịch", amount: 1,
    }).success).toBe(false);
  });
  it("rejects a non-positive amount", () => {
    expect(expenseSchema.safeParse({
      date: "2026-01-08", description: "x", category: "Khác", amount: 0,
    }).success).toBe(false);
  });
});
