import { describe, it, expect } from "vitest";
import { formatVND } from "@/lib/format";

describe("formatVND", () => {
  it("formats a whole đồng amount with thousands separators", () => {
    expect(formatVND(4800000)).toBe("4.800.000 ₫");
  });

  it("formats zero", () => {
    expect(formatVND(0)).toBe("0 ₫");
  });

  it("formats a small amount", () => {
    expect(formatVND(100)).toBe("100 ₫");
  });
});
