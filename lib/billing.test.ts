import { describe, it, expect } from "vitest";
import {
  lineTotal, lineAmount, monthsOrOne, buildDefaultLineItems, normalizeLineItems, computeSubtotal, computeGrandTotal, computeMeterAmount, billStatusFor, billTypeLabel,
} from "@/lib/billing";

describe("lineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineTotal(2, 150000)).toBe(300000);
  });
});

describe("monthsOrOne", () => {
  it("defaults a missing, zero, negative or invalid month count to 1", () => {
    expect(monthsOrOne()).toBe(1);
    expect(monthsOrOne(0)).toBe(1);
    expect(monthsOrOne(-3)).toBe(1);
    expect(monthsOrOne(Number.NaN)).toBe(1);
  });
  it("truncates a fraction", () => {
    expect(monthsOrOne(2.9)).toBe(2);
  });
});

describe("lineAmount", () => {
  it("multiplies quantity, unit price and months", () => {
    expect(lineAmount(4, 50000, 3)).toBe(600000);
  });
  it("treats a missing month count as one month", () => {
    expect(lineAmount(3, 5000000)).toBe(15000000);
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
  it("keeps quantity in the line's own unit and months in their own axis", () => {
    const items = buildDefaultLineItems(
      [{ name: "Internet", measureUnit: "phòng", defaultPrice: 100000 }],
      4800000,
      3,
    );
    expect(items[0]).toMatchObject({ quantity: 1, months: 3, unitPrice: 100000, total: 300000 });
    expect(items[1]).toMatchObject({ name: "Tiền thuê phòng", quantity: 1, months: 3, total: 14400000 });
  });
  it("bills a per-person service for every occupant", () => {
    const items = buildDefaultLineItems(
      [{ name: "Dịch vụ chung", measureUnit: "người", defaultPrice: 50000, perPerson: true }],
      3000000,
      1,
      4,
    );
    expect(items[0]).toMatchObject({ quantity: 4, months: 1, perPerson: true, total: 200000 });
  });
  it("bills another service by the room's default quantity, not the occupancy", () => {
    const items = buildDefaultLineItems(
      [{ name: "Xe máy", measureUnit: "xe", defaultPrice: 60000, defaultQuantity: 2 }],
      3000000,
      1,
      4,
    );
    expect(items[0]).toMatchObject({ name: "Xe máy", quantity: 2, total: 120000 });
    expect(items[0].perPerson).toBeUndefined();
  });
  it("drops a service whose quantity works out to 0", () => {
    const items = buildDefaultLineItems(
      [{ name: "Xe máy", measureUnit: "xe", defaultPrice: 60000, defaultQuantity: 0 }],
      3000000,
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Tiền thuê phòng");
  });
  it("multiplies both axes for a per-person service over several months", () => {
    const items = buildDefaultLineItems(
      [{ name: "Dịch vụ chung", measureUnit: "người", defaultPrice: 50000, perPerson: true }],
      3000000,
      3,
      4,
    );
    expect(items[0]).toMatchObject({ quantity: 4, months: 3, total: 600000 });
    expect(items[1]).toMatchObject({ quantity: 1, months: 3, total: 9000000 });
  });
});

describe("normalizeLineItems", () => {
  it("recomputes total from quantity × unitPrice (ignores any sent total)", () => {
    const items = normalizeLineItems([
      { name: "Phòng", measureUnit: "phòng", unitPrice: 5000000, quantity: 2 },
      { name: "Wifi", unitPrice: 100000, quantity: 1 },
    ]);
    expect(items[0]).toEqual({ name: "Phòng", measureUnit: "phòng", unitPrice: 5000000, quantity: 2, months: 1, perPerson: undefined, total: 10000000 });
    expect(items[1].measureUnit).toBe("");
    expect(items[1].total).toBe(100000);
  });
  it("carries months and perPerson through and multiplies them into the total", () => {
    const items = normalizeLineItems([
      { name: "Dịch vụ chung", measureUnit: "người", unitPrice: 50000, quantity: 4, months: 3, perPerson: true },
    ]);
    expect(items[0]).toEqual({
      name: "Dịch vụ chung", measureUnit: "người", unitPrice: 50000, quantity: 4, months: 3, perPerson: true, total: 600000,
    });
  });
  it("keeps a legacy row without months at its old amount", () => {
    const items = normalizeLineItems([{ name: "Phòng", measureUnit: "phòng", unitPrice: 5000000, quantity: 3 }]);
    expect(items[0]).toMatchObject({ quantity: 3, months: 1, total: 15000000 });
  });
  it("clamps an out-of-range month count to 1", () => {
    const items = normalizeLineItems([
      { name: "Phòng", unitPrice: 5000000, quantity: 1, months: 0 },
      { name: "Phòng", unitPrice: 5000000, quantity: 1, months: -2 },
      { name: "Phòng", unitPrice: 5000000, quantity: 1, months: Number.NaN },
    ]);
    expect(items.map((i) => i.months)).toEqual([1, 1, 1]);
    expect(items.map((i) => i.total)).toEqual([5000000, 5000000, 5000000]);
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

describe("billTypeLabel", () => {
  it("labels the three bill types", () => {
    expect(billTypeLabel("room")).toBe("Tiền phòng");
    expect(billTypeLabel("elec_water")).toBe("Điện nước");
    expect(billTypeLabel("both")).toBe("Phòng + Điện nước");
  });
  it("falls back for an unknown type", () => {
    expect(billTypeLabel("whatever")).toBe("Hóa đơn");
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
