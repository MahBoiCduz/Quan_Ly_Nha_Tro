import { describe, it, expect } from "vitest";
import { settingSchema } from "@/lib/setting-schema";

describe("settingSchema", () => {
  it("accepts all-empty input (everything optional)", () => {
    expect(settingSchema.safeParse({}).success).toBe(true);
  });
  it("keeps provided values", () => {
    const r = settingSchema.parse({ bankAccountNo: "88859988888", bankName: "TP Bank" });
    expect(r.bankAccountNo).toBe("88859988888");
  });
  it("coerces empty strings to undefined", () => {
    const r = settingSchema.parse({ bankName: "" });
    expect(r.bankName).toBeUndefined();
  });
});
