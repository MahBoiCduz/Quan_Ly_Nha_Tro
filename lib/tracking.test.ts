import { describe, it, expect } from "vitest";
import { consecutive, formatMonths, suggestLegacyMonths, trackingInputSchema, trackingPeriods, trackingState, withinLease } from "./tracking";
describe("tracking periods", () => {
  it("handles years, sorts, and rejects gaps only for utilities", () => {
    expect(consecutive(["2027-01", "2026-11", "2026-12"])).toBe(true);
    expect(formatMonths(["2027-01", "2026-12", "2026-11"])).toBe("11+12/2026 và 1/2027");
    expect(trackingInputSchema.safeParse({ type: "room", roomMonths: ["2026-10", "2026-12"], utilityMonths: [] }).success).toBe(true);
    expect(trackingInputSchema.safeParse({ type: "elec_water", roomMonths: [], utilityMonths: ["2026-10", "2026-12"] }).success).toBe(false);
  });
  it("requires applicable months, rejects duplicates and malformed values", () => {
    for (const months of [[], ["2026-13"], ["2026-11", "2026-11"]]) expect(trackingInputSchema.safeParse({ type: "room", roomMonths: months, utilityMonths: [] }).success).toBe(false);
    expect(trackingPeriods({ type: "room", roomMonths: ["2026-10"], utilityMonths: ["2026-11"] })).toEqual([{ category: "room", month: "2026-10" }]);
  });
  it("limits periods to the lease, allowing partial months and future leases", () => {
    const p = [{ month: "2026-10", category: "room" }];
    expect(withinLease(p, new Date("2026-10-15"), new Date("2026-10-20"))).toBe(true);
    expect(withinLease(p, new Date("2026-11-01"), null)).toBe(false);
  });
  it("only suggests unambiguous legacy labels", () => {
    expect(suggestLegacyMonths("Tháng 9+10+11/ 2026")).toEqual(["2026-09", "2026-10", "2026-11"]);
    for (const label of ["Tháng 9/2026 (giữa tháng)", "15/6 đến hết tháng 8/2026", "Tháng 13/2026"]) expect(suggestLegacyMonths(label)).toEqual([]);
  });
});
describe("tracking payment state", () => {
  const b = (amount: number, total = 100) => ({ grandTotal: total, payments: [{ amount }], dueDate: "2026-01-01" });
  it("calculates partial, full, overpayment, free, multiple bills and missing", () => {
    expect(trackingState([]).state).toBe("empty");
    expect(trackingState([b(0)]).state).toBe("unpaid");
    expect(trackingState([b(50)]).state).toBe("partial");
    expect(trackingState([b(100), b(0)]).state).toBe("partial");
    expect(trackingState([b(120)]).state).toBe("paid");
    expect(trackingState([b(0, 0)]).state).toBe("free");
    expect(trackingState([b(50)], new Date("2026-02-01")).overdue).toBe(true);
  });
});
