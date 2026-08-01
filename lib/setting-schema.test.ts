import { describe, it, expect } from "vitest";
import { settingSchema } from "@/lib/setting-schema";

describe("settingSchema", () => {
  it("accepts all-empty input (everything optional)", () => {
    expect(settingSchema.safeParse({}).success).toBe(true);
  });
  it("keeps provided values and coerces rate strings to ints", () => {
    const r = settingSchema.parse({ defaultElectricityRate: "4000" });
    expect(r.defaultElectricityRate).toBe(4000);
  });
  it("coerces empty strings to undefined", () => {
    const r = settingSchema.parse({ defaultWaterRate: "" });
    expect(r.defaultWaterRate).toBeUndefined();
  });
});
