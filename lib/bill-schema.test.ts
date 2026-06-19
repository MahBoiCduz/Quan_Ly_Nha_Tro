import { describe, it, expect } from "vitest";
import { billGenerateSchema } from "@/lib/bill-schema";

describe("billGenerateSchema", () => {
  it("accepts a valid generation request", () => {
    const r = billGenerateSchema.safeParse({
      unitId: "u1", periodLabel: "Tháng 6/2026", dueDate: "2026-06-05",
      electricityAmount: 559000, waterAmount: 250000,
    });
    expect(r.success).toBe(true);
  });
  it("rejects an empty period label", () => {
    expect(billGenerateSchema.safeParse({
      unitId: "u1", periodLabel: "", dueDate: "2026-06-05",
      electricityAmount: 0, waterAmount: 0,
    }).success).toBe(false);
  });
  it("rejects a negative electricity amount", () => {
    expect(billGenerateSchema.safeParse({
      unitId: "u1", periodLabel: "X", dueDate: "2026-06-05",
      electricityAmount: -1, waterAmount: 0,
    }).success).toBe(false);
  });
});
