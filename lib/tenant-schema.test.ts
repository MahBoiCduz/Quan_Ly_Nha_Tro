import { describe, it, expect } from "vitest";
import { tenantSchema } from "@/lib/tenant-schema";

describe("tenantSchema", () => {
  it("accepts name + phone only", () => {
    expect(tenantSchema.safeParse({ fullName: "Nguyễn Văn A", phone: "0900000000" }).success).toBe(true);
  });
  it("rejects a missing name", () => {
    expect(tenantSchema.safeParse({ fullName: "", phone: "0900000000" }).success).toBe(false);
  });
  it("coerces empty optional strings to undefined", () => {
    const r = tenantSchema.parse({ fullName: "A", phone: "1", vehiclePlate: "" });
    expect(r.vehiclePlate).toBeUndefined();
  });
});
