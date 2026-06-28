export function groupUnitsByFloor<T extends { floor: number }>(units: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const u of units) {
    const list = map.get(u.floor) ?? [];
    list.push(u);
    map.set(u.floor, list);
  }
  return map;
}

export function getActiveLease<T extends { startDate: Date; endDate: Date | null }>(
  leases: T[],
  on: Date = new Date(),
): T | null {
  return (
    leases.find((l) => l.startDate <= on && (l.endDate === null || l.endDate >= on)) ?? null
  );
}

/**
 * All leases of a unit other than the one active `on` the given date — i.e. the
 * tenancy history — sorted most-recent first. Used by the room history page.
 */
export function getPastLeases<T extends { startDate: Date; endDate: Date | null }>(
  leases: T[],
  on: Date = new Date(),
): T[] {
  const active = getActiveLease(leases, on);
  return leases
    .filter((l) => l !== active)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}
