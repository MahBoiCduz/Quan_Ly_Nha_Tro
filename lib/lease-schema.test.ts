import { describe, it, expect } from "vitest";
import { leaseSchema } from "@/lib/lease-schema";

describe("leaseSchema", () => {
  it("accepts a minimal valid lease", () => {
    const r = leaseSchema.safeParse({
      tenantId: "t1", startDate: "2026-06-01", agreedRent: 4800000,
      billingCycle: "monthly", depositAmount: 4800000,
    });
    expect(r.success).toBe(true);
  });
  it("rejects a missing tenant", () => {
    expect(leaseSchema.safeParse({
      tenantId: "", startDate: "2026-06-01", agreedRent: 0, billingCycle: "monthly", depositAmount: 0,
    }).success).toBe(false);
  });
  it("rejects an invalid billing cycle", () => {
    expect(leaseSchema.safeParse({
      tenantId: "t1", startDate: "2026-06-01", agreedRent: 0, billingCycle: "weekly", depositAmount: 0,
    }).success).toBe(false);
  });
});
