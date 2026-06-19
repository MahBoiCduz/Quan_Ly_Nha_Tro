import type { PrismaClient } from "@prisma/client";
import type { LedgerPayment, LedgerExpense } from "@/lib/ledger";

export async function loadLedgerInputs(
  db: PrismaClient,
): Promise<{ payments: LedgerPayment[]; expenses: LedgerExpense[] }> {
  const paymentRows = await db.payment.findMany({
    include: { bill: { include: { lease: { include: { unit: true } } } } },
    orderBy: { paidAt: "asc" },
  });
  const expenseRows = await db.expense.findMany({ orderBy: { date: "asc" } });

  const payments: LedgerPayment[] = paymentRows.map((p) => ({
    date: p.paidAt,
    description: `${p.bill.lease.unit.name} - ${p.bill.periodLabel}`,
    amount: p.amount,
    billSubtotal: p.bill.subtotal,
    billUtilities: p.bill.electricityAmount + p.bill.waterAmount,
  }));

  const expenses: LedgerExpense[] = expenseRows.map((e) => ({
    date: e.date,
    description: `${e.description} (${e.category})`,
    amount: e.amount,
  }));

  return { payments, expenses };
}
