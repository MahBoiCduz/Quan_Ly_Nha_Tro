import { describe, it, expect } from "vitest";
import { billGenerateSchema } from "@/lib/bill-schema";

const base = {
  unitId: "u1", periodLabel: "Tháng 6/2026", dueDate: "2030-06-05",
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
  it("rejects an electricity reading that went down", () => {
    expect(billGenerateSchema.safeParse({ ...base, electricityOld: 100, electricityNew: 50 }).success).toBe(false);
  });
  it("rejects a water reading that went down", () => {
    expect(billGenerateSchema.safeParse({ ...base, waterOld: 60, waterNew: 58 }).success).toBe(false);
  });
  it("accepts equal readings (no usage)", () => {
    expect(billGenerateSchema.safeParse({ ...base, electricityOld: 100, electricityNew: 100 }).success).toBe(true);
  });
  it("rejects a due date in the past", () => {
    expect(billGenerateSchema.safeParse({ ...base, dueDate: "2020-01-01" }).success).toBe(false);
  });
});
