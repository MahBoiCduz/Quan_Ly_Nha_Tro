import { describe, it, expect } from "vitest";
import { groupUnitsByFloor, getActiveLease, getPastLeases } from "@/lib/rooms";

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

describe("getPastLeases", () => {
  const on = new Date("2026-06-27");
  const leases = [
    { id: "old1", startDate: new Date("2024-01-01"), endDate: new Date("2024-12-31") },
    { id: "old2", startDate: new Date("2025-01-01"), endDate: new Date("2025-06-30") },
    { id: "current", startDate: new Date("2025-07-01"), endDate: null },
  ];

  it("returns every non-active lease, most recent first", () => {
    expect(getPastLeases(leases, on).map((l) => l.id)).toEqual(["old2", "old1"]);
  });

  it("returns all leases when none are active", () => {
    expect(getPastLeases([leases[0], leases[1]], on).map((l) => l.id)).toEqual(["old2", "old1"]);
  });

  it("returns empty when the only lease is the active one", () => {
    expect(getPastLeases([leases[2]], on)).toEqual([]);
  });
});
