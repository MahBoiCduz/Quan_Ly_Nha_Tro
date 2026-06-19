import { describe, it, expect } from "vitest";
import { addDays, computeNextDue, isDue, dueStatus } from "@/lib/maintenance";

describe("addDays", () => {
  it("adds whole days", () => {
    expect(addDays(new Date("2026-01-01"), 90).toISOString().slice(0, 10)).toBe("2026-04-01");
  });
});

describe("computeNextDue", () => {
  it("is the anchor plus the interval", () => {
    expect(computeNextDue(new Date("2026-01-01"), 30).toISOString().slice(0, 10)).toBe("2026-01-31");
  });
});

describe("isDue", () => {
  it("is true once now reaches the due date", () => {
    expect(isDue(new Date("2026-06-01"), new Date("2026-06-02"))).toBe(true);
  });
  it("is false before the due date", () => {
    expect(isDue(new Date("2026-06-10"), new Date("2026-06-02"))).toBe(false);
  });
});

describe("dueStatus", () => {
  const now = new Date("2026-06-10");
  it("overdue when past", () => expect(dueStatus(new Date("2026-06-01"), now)).toBe("overdue"));
  it("due_soon within 7 days", () => expect(dueStatus(new Date("2026-06-15"), now)).toBe("due_soon"));
  it("ok when far out", () => expect(dueStatus(new Date("2026-07-30"), now)).toBe("ok"));
});
