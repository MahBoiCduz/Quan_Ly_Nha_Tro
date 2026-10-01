import { describe, it, expect } from "vitest";
import { serviceItemSchema } from "@/lib/service-schema";

describe("serviceItemSchema", () => {
  it("accepts a valid item", () => {
    const r = serviceItemSchema.safeParse({ name: "Internet", measureUnit: "phòng", defaultPrice: 100000 });
    expect(r.success).toBe(true);
  });
  it("rejects an empty name", () => {
    expect(serviceItemSchema.safeParse({ name: "", measureUnit: "phòng", defaultPrice: 0 }).success).toBe(false);
  });
  it("rejects a negative price", () => {
    expect(serviceItemSchema.safeParse({ name: "X", measureUnit: "phòng", defaultPrice: -1 }).success).toBe(false);
  });
  it("mặc định perPerson = false và defaultQuantity = 1 cho dữ liệu cũ", () => {
    const r = serviceItemSchema.parse({ name: "Internet", measureUnit: "phòng", defaultPrice: 100000 });
    expect(r.perPerson).toBe(false);
    expect(r.defaultQuantity).toBe(1);
  });
  it("nhận cờ perPerson = true", () => {
    const r = serviceItemSchema.safeParse({
      name: "Dịch vụ chung",
      measureUnit: "người",
      defaultPrice: 150000,
      perPerson: true,
      defaultQuantity: 1,
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data.perPerson).toBe(true);
  });
  it("nhận defaultQuantity = 0 (không sinh dòng trên hoá đơn)", () => {
    const r = serviceItemSchema.safeParse({
      name: "Xe máy",
      measureUnit: "xe",
      defaultPrice: 60000,
      perPerson: false,
      defaultQuantity: 0,
    });
    expect(r.success).toBe(true);
  });
  it("chặn defaultQuantity âm hoặc không nguyên", () => {
    const base = { name: "Xe máy", measureUnit: "xe", defaultPrice: 60000, perPerson: false };
    expect(serviceItemSchema.safeParse({ ...base, defaultQuantity: -1 }).success).toBe(false);
    expect(serviceItemSchema.safeParse({ ...base, defaultQuantity: 1.5 }).success).toBe(false);
  });
  it("chặn perPerson không phải boolean", () => {
    expect(
      serviceItemSchema.safeParse({
        name: "Xe máy",
        measureUnit: "xe",
        defaultPrice: 60000,
        perPerson: "on",
        defaultQuantity: 1,
      }).success,
    ).toBe(false);
  });
});
