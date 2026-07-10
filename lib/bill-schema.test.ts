import { describe, it, expect } from "vitest";
import { billGenerateSchema, billUpdateSchema } from "@/lib/bill-schema";

const base = {
  type: "both" as const,
  unitId: "u1", periodLabel: "Tháng 6/2026", dueDate: "2030-06-05",
  lineItems: JSON.stringify([{ name: "Tiền thuê phòng", measureUnit: "phòng", unitPrice: 4800000, quantity: 1 }]),
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
  it("rejects an electricity reading that went down (both type)", () => {
    expect(billGenerateSchema.safeParse({ ...base, electricityOld: 100, electricityNew: 50 }).success).toBe(false);
  });
  it("rejects a water reading that went down (both type)", () => {
    expect(billGenerateSchema.safeParse({ ...base, waterOld: 60, waterNew: 58 }).success).toBe(false);
  });
  it("accepts equal readings (no usage)", () => {
    expect(billGenerateSchema.safeParse({ ...base, electricityOld: 100, electricityNew: 100 }).success).toBe(true);
  });
  it("rejects a due date in the past", () => {
    expect(billGenerateSchema.safeParse({ ...base, dueDate: "2020-01-01" }).success).toBe(false);
  });
  it("parses lineItems from a JSON string", () => {
    const r = billGenerateSchema.safeParse(base);
    expect(r.success && r.data.lineItems[0]).toMatchObject({ name: "Tiền thuê phòng", unitPrice: 4800000, quantity: 1 });
  });
  it("rejects an empty lineItems array for both type", () => {
    expect(billGenerateSchema.safeParse({ ...base, lineItems: "[]" }).success).toBe(false);
  });
  it("rejects an empty lineItems array for room type", () => {
    expect(billGenerateSchema.safeParse({ ...base, type: "room", lineItems: "[]" }).success).toBe(false);
  });

  // Room type: line items required, meter readings optional
  it("accepts a room-only bill with line items and no meter readings", () => {
    expect(billGenerateSchema.safeParse({
      ...base, type: "room",
      electricityOld: undefined, electricityNew: undefined, electricityRate: undefined,
      waterOld: undefined, waterNew: undefined, waterRate: undefined,
    }).success).toBe(true);
  });
  it("skips meter-down check for room type", () => {
    expect(billGenerateSchema.safeParse({
      ...base, type: "room", electricityOld: 100, electricityNew: 50,
    }).success).toBe(true);
  });

  // Elec-water type: empty lineItems allowed, meter readings required
  it("accepts an elec-water bill with empty line items", () => {
    expect(billGenerateSchema.safeParse({ ...base, type: "elec_water", lineItems: "[]" }).success).toBe(true);
  });
  it("rejects an elec-water bill with meter reading that went down", () => {
    expect(billGenerateSchema.safeParse({ ...base, type: "elec_water", electricityOld: 100, electricityNew: 50 }).success).toBe(false);
  });
  it("requires meter readings for elec-water type", () => {
    expect(billGenerateSchema.safeParse({
      ...base, type: "elec_water", electricityOld: 100, electricityNew: 150,
    }).success).toBe(true);
  });
});

describe("billUpdateSchema", () => {
  it("accepts a valid update with meter readings", () => {
    expect(billUpdateSchema.safeParse(base).success).toBe(true);
  });
  it("accepts a due date in the past (unlike generate)", () => {
    expect(billUpdateSchema.safeParse({ ...base, dueDate: "2020-01-01" }).success).toBe(true);
  });
  it("rejects an electricity reading that went down (both type)", () => {
    expect(billUpdateSchema.safeParse({ ...base, electricityOld: 100, electricityNew: 50 }).success).toBe(false);
  });
  it("rejects a water reading that went down (both type)", () => {
    expect(billUpdateSchema.safeParse({ ...base, waterOld: 60, waterNew: 58 }).success).toBe(false);
  });
  it("rejects an empty period label", () => {
    expect(billUpdateSchema.safeParse({ ...base, periodLabel: "" }).success).toBe(false);
  });
  it("rejects empty lineItems for room type", () => {
    expect(billUpdateSchema.safeParse({ ...base, type: "room", lineItems: "[]" }).success).toBe(false);
  });
  it("accepts empty lineItems for elec_water type", () => {
    expect(billUpdateSchema.safeParse({ ...base, type: "elec_water", lineItems: "[]" }).success).toBe(true);
  });
  it("skips meter-down check for room type", () => {
    expect(billUpdateSchema.safeParse({
      ...base, type: "room", electricityOld: 100, electricityNew: 50,
    }).success).toBe(true);
  });
});
