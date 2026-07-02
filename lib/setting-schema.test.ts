import { describe, it, expect } from "vitest";
import { settingSchema } from "@/lib/setting-schema";

describe("settingSchema", () => {
  it("accepts all-empty input (everything optional)", () => {
    expect(settingSchema.safeParse({}).success).toBe(true);
  });
  it("keeps provided values and coerces rate strings to ints", () => {
    const r = settingSchema.parse({ adminZaloUserId: "zalo-1", defaultElectricityRate: "4000" });
    expect(r.adminZaloUserId).toBe("zalo-1");
    expect(r.defaultElectricityRate).toBe(4000);
  });
  it("coerces empty strings to undefined", () => {
    const r = settingSchema.parse({ adminZaloUserId: "", defaultWaterRate: "" });
    expect(r.adminZaloUserId).toBeUndefined();
    expect(r.defaultWaterRate).toBeUndefined();
  });
});
