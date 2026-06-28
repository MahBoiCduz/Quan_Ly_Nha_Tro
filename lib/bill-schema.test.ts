import { describe, it, expect } from "vitest";
import { billGenerateSchema } from "@/lib/bill-schema";

const base = {
  unitId: "u1", periodLabel: "Tháng 6/2026", dueDate: "2026-06-05",
  electricityOld: 1502, electricityNew: 1607, electricityRate: 4000,
  waterOld: 56, waterNew: 58.9, waterRate: 35000,
};

describe("billGenerateSchema", () => {
  it("accepts a valid generation request with meter readings", () => {
    expect(billGenerateSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty period label", () => {
    expect(billGenerateSchema.safeParse({ ...base, periodLabel: "" }).success).toBe(false);
  });
  it("rejects a negative reading", () => {
    expect(billGenerateSchema.safeParse({ ...base, electricityNew: -1 }).success).toBe(false);
  });
});
