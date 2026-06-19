import { describe, it, expect } from "vitest";
import { allocatePaymentIncome, buildLedger, monthlySummary } from "@/lib/ledger";

describe("allocatePaymentIncome", () => {
  it("splits proportionally by subtotal vs utilities", () => {
    // grandTotal 1000 = subtotal 800 + utilities 200; pay 1000
    expect(allocatePaymentIncome(1000, 800, 200)).toEqual({ room: 800, utilities: 200 });
  });
  it("puts the rounding remainder in the room column", () => {
    // subtotal 1, utilities 1 (grand 2); pay 1 → utilities floor(0.5)=0, room gets the rest
    expect(allocatePaymentIncome(1, 1, 1)).toEqual({ room: 1, utilities: 0 });
  });
  it("treats a zero-total bill as all room income", () => {
    expect(allocatePaymentIncome(500, 0, 0)).toEqual({ room: 500, utilities: 0 });
  });
});

describe("buildLedger", () => {
  it("merges, sorts by date, and runs a balance", () => {
    const rows = buildLedger(
      [{ date: new Date("2026-01-02"), description: "P301", amount: 1000, billSubtotal: 800, billUtilities: 200 }],
      [{ date: new Date("2026-01-01"), description: "Internet", amount: 300 }],
      100,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ description: "Internet", expense: 300, balance: -200 });
    expect(rows[1]).toMatchObject({ description: "P301", incomeRoom: 800, incomeUtilities: 200, balance: 800 });
  });
});

describe("monthlySummary", () => {
  it("aggregates rows by year-month", () => {
    const rows = buildLedger(
      [
        { date: new Date("2026-01-10"), description: "a", amount: 1000, billSubtotal: 600, billUtilities: 400 },
        { date: new Date("2026-02-10"), description: "b", amount: 500, billSubtotal: 500, billUtilities: 0 },
      ],
      [],
    );
    const sums = monthlySummary(rows);
    expect(sums).toContainEqual({ month: "2026-01", incomeRoom: 600, incomeUtilities: 400, expense: 0 });
    expect(sums).toContainEqual({ month: "2026-02", incomeRoom: 500, incomeUtilities: 0, expense: 0 });
  });
});
