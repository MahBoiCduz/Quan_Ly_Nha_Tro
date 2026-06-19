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
): LineItem[] {
  const items: LineItem[] = services.map((s) => ({
    name: s.name,
    measureUnit: s.measureUnit,
    quantity: 1,
    unitPrice: s.defaultPrice,
    total: lineTotal(1, s.defaultPrice),
  }));
  items.push({
    name: "Tiền thuê phòng",
    measureUnit: "phòng",
    quantity: 1,
    unitPrice: agreedRent,
    total: agreedRent,
  });
  return items;
}

export function computeSubtotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.total, 0);
}

export function computeGrandTotal(subtotal: number, electricity: number, water: number): number {
  return subtotal + electricity + water;
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
