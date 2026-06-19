import { describe, it, expect } from "vitest";
import { maintenanceSchema } from "@/lib/maintenance-schema";

describe("maintenanceSchema", () => {
  it("accepts a building-scoped schedule", () => {
    expect(maintenanceSchema.safeParse({
      name: "Vệ sinh bể nước", scope: "building", intervalDays: 90, startDate: "2026-06-01",
    }).success).toBe(true);
  });
  it("requires unitId when scope is unit", () => {
    expect(maintenanceSchema.safeParse({
      name: "Bảo dưỡng máy lạnh", scope: "unit", intervalDays: 180, startDate: "2026-06-01",
    }).success).toBe(false);
  });
  it("accepts a unit-scoped schedule with unitId", () => {
    expect(maintenanceSchema.safeParse({
      name: "Bảo dưỡng máy lạnh", scope: "unit", unitId: "u1", intervalDays: 180, startDate: "2026-06-01",
    }).success).toBe(true);
  });
  it("rejects a non-positive interval", () => {
    expect(maintenanceSchema.safeParse({
      name: "x", scope: "building", intervalDays: 0, startDate: "2026-06-01",
    }).success).toBe(false);
  });
});
