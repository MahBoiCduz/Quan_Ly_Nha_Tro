import { describe, it, expect } from "vitest";
import {
  lineTotal, buildDefaultLineItems, computeSubtotal, computeGrandTotal, computeMeterAmount, billStatusFor,
} from "@/lib/billing";

describe("lineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotal(2, 150000)).toBe(300000);
  });
});

describe("buildDefaultLineItems", () => {
  it("adds a line per service plus a rent line", () => {
    const items = buildDefaultLineItems(
      [{ name: "Internet", measureUnit: "phòng", defaultPrice: 100000 }],
      4800000,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: "Internet", quantity: 1, unitPrice: 100000, total: 100000 });
    expect(items[1]).toMatchObject({ name: "Tiền thuê phòng", unitPrice: 4800000, total: 4800000 });
  });
});

describe("computeSubtotal", () => {
  it("sums the line totals", () => {
    expect(computeSubtotal([
      { name: "a", measureUnit: "x", quantity: 1, unitPrice: 100, total: 100 },
      { name: "b", measureUnit: "x", quantity: 2, unitPrice: 50, total: 100 },
    ])).toBe(200);
  });
});

describe("computeGrandTotal", () => {
  it("adds electricity and water to the subtotal", () => {
    expect(computeGrandTotal(5100000, 559000, 250000)).toBe(5909000);
  });
});

describe("computeMeterAmount", () => {
  it("multiplies the usage delta by the rate", () => {
    expect(computeMeterAmount(1502, 1607, 4000)).toBe(420000);
  });
  it("rounds decimal water usage", () => {
    expect(computeMeterAmount(56, 58.9, 35000)).toBe(101500);
  });
  it("never goes negative on a meter reset", () => {
    expect(computeMeterAmount(1588, 0, 4000)).toBe(0);
  });
});

describe("billStatusFor", () => {
  const due = new Date("2026-06-05");
  it("is paid when fully covered", () => {
    expect(billStatusFor(5000000, 5000000, due, new Date("2026-06-10"))).toBe("paid");
  });
  it("is overdue when unpaid past the due date", () => {
    expect(billStatusFor(5000000, 0, due, new Date("2026-06-10"))).toBe("overdue");
  });
  it("is unpaid when before the due date", () => {
    expect(billStatusFor(5000000, 0, due, new Date("2026-06-01"))).toBe("unpaid");
  });
});
