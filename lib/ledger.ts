export type LedgerRow = {
  date: Date;
  description: string;
  incomeRoom: number;
  incomeUtilities: number;
  expense: number;
  balance: number;
};

export type LedgerPayment = {
  date: Date;
  description: string;
  amount: number;
  billSubtotal: number;
  billUtilities: number;
};

export type LedgerExpense = { date: Date; description: string; amount: number };

export function allocatePaymentIncome(
  amount: number,
  billSubtotal: number,
  billUtilities: number,
): { room: number; utilities: number } {
  const grand = billSubtotal + billUtilities;
  if (grand <= 0) return { room: amount, utilities: 0 };
  const utilities = Math.floor((amount * billUtilities) / grand);
  return { room: amount - utilities, utilities };
}

export function buildLedger(
  payments: LedgerPayment[],
  expenses: LedgerExpense[],
  opening: number = 0,
): LedgerRow[] {
  type Pre = Omit<LedgerRow, "balance">;
  const pre: Pre[] = [];

  for (const p of payments) {
    const { room, utilities } = allocatePaymentIncome(p.amount, p.billSubtotal, p.billUtilities);
    pre.push({ date: p.date, description: p.description, incomeRoom: room, incomeUtilities: utilities, expense: 0 });
  }
  for (const e of expenses) {
    pre.push({ date: e.date, description: e.description, incomeRoom: 0, incomeUtilities: 0, expense: e.amount });
  }

  pre.sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = opening;
  return pre.map((r) => {
    balance += r.incomeRoom + r.incomeUtilities - r.expense;
    return { ...r, balance };
  });
}

export function monthlySummary(
  rows: LedgerRow[],
): { month: string; incomeRoom: number; incomeUtilities: number; expense: number }[] {
  const map = new Map<string, { incomeRoom: number; incomeUtilities: number; expense: number }>();
  for (const r of rows) {
    const month = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
    const acc = map.get(month) ?? { incomeRoom: 0, incomeUtilities: 0, expense: 0 };
    acc.incomeRoom += r.incomeRoom;
    acc.incomeUtilities += r.incomeUtilities;
    acc.expense += r.expense;
    map.set(month, acc);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));
}
