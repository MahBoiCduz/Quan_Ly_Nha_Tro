import { describe, it, expect } from "vitest";
import { groupUnitsByFloor, getActiveLease } from "@/lib/rooms";

describe("groupUnitsByFloor", () => {
  it("buckets units by their floor", () => {
    const g = groupUnitsByFloor([
      { floor: 1 }, { floor: 2 }, { floor: 1 },
    ]);
    expect(g.get(1)).toHaveLength(2);
    expect(g.get(2)).toHaveLength(1);
  });
});

describe("getActiveLease", () => {
  const on = new Date("2026-06-15");
  it("returns an open-ended lease that has started", () => {
    const lease = { startDate: new Date("2026-01-01"), endDate: null };
    expect(getActiveLease([lease], on)).toBe(lease);
  });
  it("ignores a lease that has ended", () => {
    const lease = { startDate: new Date("2026-01-01"), endDate: new Date("2026-05-01") };
    expect(getActiveLease([lease], on)).toBeNull();
  });
  it("ignores a future lease", () => {
    const lease = { startDate: new Date("2026-07-01"), endDate: null };
    expect(getActiveLease([lease], on)).toBeNull();
  });
});
