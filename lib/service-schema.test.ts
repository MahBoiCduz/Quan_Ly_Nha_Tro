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
});
