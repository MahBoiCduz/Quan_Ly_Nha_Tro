import { describe, it, expect } from "vitest";
import { totalPaid } from "./payment-actions";

describe("totalPaid", () => {
  it("sums payment amounts", () => {
    expect(totalPaid([{ amount: 2000000 }, { amount: 3000000 }])).toBe(5000000);
  });
  it("is zero for no payments", () => {
    expect(totalPaid([])).toBe(0);
  });
});
