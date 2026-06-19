import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { loadLedgerInputs } from "@/lib/ledger-source";

describe("loadLedgerInputs", () => {
  it("maps payments and expenses into ledger inputs", async () => {
    const fakeDb = {
      payment: {
        findMany: vi.fn().mockResolvedValue([
          {
            amount: 1000,
            paidAt: new Date("2026-01-02"),
            bill: {
              subtotal: 800,
              electricityAmount: 150,
              waterAmount: 50,
              lease: { unit: { name: "P301" } },
              periodLabel: "T1",
            },
          },
        ]),
      },
      expense: {
        findMany: vi.fn().mockResolvedValue([
          { amount: 300, date: new Date("2026-01-01"), description: "Internet", category: "Internet" },
        ]),
      },
    };
    const { payments, expenses } = await loadLedgerInputs(fakeDb as unknown as PrismaClient);
    expect(payments[0]).toMatchObject({ amount: 1000, billSubtotal: 800, billUtilities: 200 });
    expect(payments[0].description).toContain("P301");
    expect(expenses[0].amount).toBe(300);
    expect(expenses[0].description).toContain("Internet");
  });
});
