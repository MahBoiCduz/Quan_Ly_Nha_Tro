export type LineItem = {
  name: string;
  measureUnit: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export function lineTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export function buildDefaultLineItems(
  services: { name: string; measureUnit: string; defaultPrice: number }[],
  agreedRent: number,
  months = 1,
): LineItem[] {
  const items: LineItem[] = services.map((s) => ({
    name: s.name,
    measureUnit: s.measureUnit,
    quantity: months,
    unitPrice: s.defaultPrice,
    total: lineTotal(months, s.defaultPrice),
  }));
  items.push({
    name: "Tiền thuê phòng",
    measureUnit: "phòng",
    quantity: months,
    unitPrice: agreedRent,
    total: lineTotal(months, agreedRent),
  });
  return items;
}

// Recompute each line's total from quantity × unitPrice — the server's source of
// truth for the editable bill table (client-sent totals are never trusted).
export function normalizeLineItems(
  items: { name: string; measureUnit?: string; unitPrice: number; quantity: number }[],
): LineItem[] {
  return items.map((i) => ({
    name: i.name,
    measureUnit: i.measureUnit ?? "",
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    total: lineTotal(i.quantity, i.unitPrice),
  }));
}

export function computeSubtotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.total, 0);
}

export function computeGrandTotal(subtotal: number, electricity: number, water: number): number {
  return subtotal + electricity + water;
}

/** Money for a metered utility: (newReading − oldReading) × unit price, never negative. */
export function computeMeterAmount(oldReading: number, newReading: number, rate: number): number {
  return Math.max(0, Math.round((newReading - oldReading) * rate));
}

export function billStatusFor(
  grandTotal: number,
  totalPaid: number,
  dueDate: Date,
  now: Date = new Date(),
): "paid" | "overdue" | "unpaid" {
  if (totalPaid >= grandTotal) return "paid";
  if (now > dueDate) return "overdue";
  return "unpaid";
}
