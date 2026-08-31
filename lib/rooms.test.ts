import { describe, it, expect } from "vitest";
import { groupUnitsByFloor, getActiveLease, getCurrentOrUpcomingLease, getPastLeases, hasCurrentOrUpcomingLease } from "@/lib/rooms";

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

describe("getCurrentOrUpcomingLease", () => {
  const on = new Date("2026-06-15");
  it("returns an upcoming (future-dated) lease that hasn't started", () => {
    const lease = { startDate: new Date("2026-07-01"), endDate: null };
    expect(getCurrentOrUpcomingLease([lease], on)).toBe(lease);
  });
  it("returns the active lease when present", () => {
    const lease = { startDate: new Date("2026-01-01"), endDate: null };
    expect(getCurrentOrUpcomingLease([lease], on)).toBe(lease);
  });
  it("ignores a lease that has ended", () => {
    const lease = { startDate: new Date("2026-01-01"), endDate: new Date("2026-05-01") };
    expect(getCurrentOrUpcomingLease([lease], on)).toBeNull();
  });
});

describe("hasCurrentOrUpcomingLease", () => {
  const on = new Date("2026-06-15");
  it("is true when a lease is open-ended", () => {
    expect(hasCurrentOrUpcomingLease([{ endDate: null }], on)).toBe(true);
  });
  it("is true when a lease ends in the future", () => {
    expect(hasCurrentOrUpcomingLease([{ endDate: new Date("2026-08-01") }], on)).toBe(true);
  });
  it("is true when any lease is still valid among ended ones", () => {
    expect(hasCurrentOrUpcomingLease([
      { endDate: new Date("2026-05-01") },
      { endDate: new Date("2026-08-01") },
    ], on)).toBe(true);
  });
  it("is false when all leases have ended", () => {
    expect(hasCurrentOrUpcomingLease([{ endDate: new Date("2026-05-01") }], on)).toBe(false);
  });
  it("is false for no leases", () => {
    expect(hasCurrentOrUpcomingLease([], on)).toBe(false);
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
